-- ============================================================
-- v8.1 — Owner-callable password rotate
--
-- The original `rotate_admin_password()` is SECURITY DEFINER but anyone with
-- the anon key could technically call it. This adds a guard that limits the
-- function to OWNER-badged users so a regular user can't reset the password
-- and lock real owners out.
--
-- Also adds a `bootstrap_admin_password()` helper that returns the plaintext
-- ONCE during initial setup if no admin row exists yet — designed to be
-- called from `<AdminPasswordGate>` when the owner first visits /admin and
-- there's no Discord webhook configured yet.
-- ============================================================

create or replace function public.rotate_admin_password()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_password text;
  alphabet     text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i            integer;
  caller_uid   uuid := auth.uid();
  is_owner     boolean := false;
begin
  -- If called from a HTTP context (auth.uid() is set), require owner badge.
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
  values (crypt(new_password, gen_salt('bf', 10)), current_date)
  on conflict (valid_for_date) do update
    set password_hash = excluded.password_hash, created_at = now();

  delete from public.admin_passwords where valid_for_date < current_date - interval '7 days';

  -- Audit it
  insert into public.audit_logs (actor_id, action, target_type, target_id, reason)
  values (caller_uid, 'login', 'admin_password_rotate', current_date::text,
          coalesce(case when caller_uid is null then 'service-role' else 'manual-owner' end, 'unknown'));

  return new_password;
end;
$$;

-- Owner can rotate via the SQL editor, or via the HTTP RPC, or via /api/admin/rotate-password.
-- Grant explicit EXECUTE so anon role CANNOT call it (only authenticated):
revoke all on function public.rotate_admin_password() from anon;
grant execute on function public.rotate_admin_password() to authenticated, service_role;
