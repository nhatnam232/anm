-- ============================================================
-- v8.2 — system_secrets table for self-bootstrapping CRON_SECRET
--
-- Goal: user shouldn't have to manually generate / paste a CRON_SECRET.
-- The /api/admin/rotate-password endpoint, on first call from Vercel cron,
-- generates one itself, stores it here, and posts to the Discord webhook.
-- Subsequent calls simply read & verify.
--
-- Plus: get_or_create_cron_secret() RPC so the service role can fetch the
-- current value without exposing it to client code.
-- ============================================================

create table if not exists public.system_secrets (
  key          text primary key,
  value        text not null,
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists system_secrets_touch on public.system_secrets;
create trigger system_secrets_touch
  before update on public.system_secrets
  for each row execute procedure public.touch_updated_at();

alter table public.system_secrets enable row level security;
-- Lock everyone out of direct SELECT — only service role can read via RPC.
drop policy if exists "system_secrets_no_direct" on public.system_secrets;
create policy "system_secrets_no_direct" on public.system_secrets
  for select using (false);

create or replace function public.get_or_create_cron_secret()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_secret text;
  new_secret     text;
  alphabet       text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  i              integer;
begin
  select value into current_secret
  from public.system_secrets
  where key = 'cron_secret'
  limit 1;

  if current_secret is not null and length(current_secret) >= 32 then
    return current_secret;
  end if;

  -- Generate a 48-char URL-safe random secret
  new_secret := '';
  for i in 1..48 loop
    new_secret := new_secret || substr(alphabet, 1 + (random() * (length(alphabet) - 1))::int, 1);
  end loop;

  insert into public.system_secrets (key, value, description)
    values ('cron_secret', new_secret, 'Auto-generated shared secret used to authenticate cron-fired requests')
  on conflict (key) do update
    set value = excluded.value, updated_at = now();

  return new_secret;
end;
$$;

revoke all on function public.get_or_create_cron_secret() from anon, authenticated;
grant execute on function public.get_or_create_cron_secret() to service_role;
