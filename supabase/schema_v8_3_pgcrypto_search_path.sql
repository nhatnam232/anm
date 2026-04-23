-- ============================================================
-- v8.3 — Fix `gen_salt` / `crypt` not found in admin password functions
--
-- Symptom in production:
--   "function gen_salt(unknown, integer) does not exist"
--
-- Root cause:
--   Supabase installs pgcrypto into the `extensions` schema, but our two
--   admin functions had `set search_path = public`, so the bcrypt helpers
--   `gen_salt` / `crypt` were unreachable. We add `extensions` to the
--   search_path AND keep `pg_temp` last to defeat hijacking.
--
-- Run this once in the Supabase SQL editor and the "Generate today's
-- password" button will start working immediately.
-- ============================================================

-- Make sure pgcrypto is actually installed (idempotent — Supabase has it
-- pre-installed, but being explicit doesn't hurt).
create extension if not exists "pgcrypto" with schema extensions;

-- ─── rotate_admin_password() ────────────────────────────────────────────────
create or replace function public.rotate_admin_password()
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  new_password text;
  alphabet     text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i            integer;
  caller_uid   uuid := auth.uid();
  is_owner     boolean := false;
begin
  -- If called from a HTTP context (auth.uid() is set), require owner/admin badge.
  -- If called from a service-role key (auth.uid() is null), allow.
  if caller_uid is not null then
    select exists (
      select 1 from public.profiles
      where id = caller_uid
        and badges && array['owner', 'admin']::text[]
    ) into is_owner;
    if not is_owner then
      raise exception 'Only owner/admin can rotate the admin password';
    end if;
  end if;

  new_password := '';
  for i in 1..16 loop
    new_password := new_password || substr(alphabet, 1 + (random() * (length(alphabet) - 1))::int, 1);
  end loop;

  insert into public.admin_passwords (password_hash, valid_for_date)
  values (extensions.crypt(new_password, extensions.gen_salt('bf', 10)), current_date)
  on conflict (valid_for_date) do update
    set password_hash = excluded.password_hash, created_at = now();

  delete from public.admin_passwords where valid_for_date < current_date - interval '7 days';

  -- Audit it (best-effort — wrap so a logging failure doesn't break the rotate)
  begin
    insert into public.audit_logs (actor_id, action, target_type, target_id, reason)
    values (caller_uid, 'login', 'admin_password_rotate', current_date::text,
            coalesce(case when caller_uid is null then 'service-role' else 'manual-owner' end, 'unknown'));
  exception when others then
    -- swallow; the password was successfully rotated.
    null;
  end;

  return new_password;
end;
$$;

revoke all on function public.rotate_admin_password() from anon;
grant execute on function public.rotate_admin_password() to authenticated, service_role;

-- ─── verify_admin_password() ────────────────────────────────────────────────
create or replace function public.verify_admin_password(candidate text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  stored_hash text;
  ok          boolean := false;
begin
  -- Only mod/admin/owner allowed to even attempt.
  if not public.is_mod_or_above(auth.uid()) then return false; end if;

  select password_hash into stored_hash
  from public.admin_passwords
  where valid_for_date = current_date
  limit 1;

  if stored_hash is null then return false; end if;
  ok := (stored_hash = extensions.crypt(candidate, stored_hash));

  -- Audit the attempt (success / failure)
  begin
    insert into public.audit_logs (actor_id, action, target_type, target_id, reason)
    values (auth.uid(), 'login', 'admin_password_verify', current_date::text,
            case when ok then 'ok' else 'wrong_password' end);
  exception when others then
    null;
  end;

  return ok;
end;
$$;

revoke all on function public.verify_admin_password(text) from anon;
grant execute on function public.verify_admin_password(text) to authenticated, service_role;
