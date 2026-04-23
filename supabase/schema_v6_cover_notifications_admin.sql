-- ============================================================
-- Anime Wiki — Schema v6
--   • profiles.cover_url           (banner ảnh bìa cho trang Profile)
--   • storage bucket: covers       (public, tách khỏi avatars)
--   • notifications table          (thông báo tập mới của anime trong library)
--   • Admin/owner moderation RLS   (mod/admin/owner xóa được comment người khác)
--
-- Idempotent — chạy lại an toàn.
-- ============================================================

-- ─── 1. Profile cover image ─────────────────────────────────────────────────

alter table public.profiles
  add column if not exists cover_url text;

-- Storage bucket riêng cho ảnh bìa (avatars hiện chứa avatar vuông).
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

drop policy if exists "covers_public_read" on storage.objects;
drop policy if exists "covers_insert_own"  on storage.objects;
drop policy if exists "covers_update_own"  on storage.objects;
drop policy if exists "covers_delete_own"  on storage.objects;
create policy "covers_public_read" on storage.objects for select
  using (bucket_id = 'covers');
create policy "covers_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "covers_update_own" on storage.objects for update to authenticated
  using      (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "covers_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─── 2. Notifications ───────────────────────────────────────────────────────
-- Per-user notification feed. Records when an anime in the user's library has
-- a new episode. The cron job / serverless function inserts rows; the client
-- polls or subscribes via realtime.

do $$ begin
  if not exists (select 1 from pg_type where typname = 'notification_kind') then
    create type notification_kind as enum ('new_episode', 'system', 'reply');
  end if;
end $$;

create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          notification_kind not null default 'new_episode',
  anime_id      integer,
  anime_title   text,
  anime_cover   text,
  episode       integer,
  body          text,
  link          text,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists notifications_user_idx
  on public.notifications(user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications(user_id, read_at)
  where read_at is null;

alter table public.notifications enable row level security;
drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_delete_own" on public.notifications
  for delete using (auth.uid() = user_id);
-- INSERTs come from the server / cron (service role bypass) so no insert policy.

-- ─── 3. Moderation RLS ──────────────────────────────────────────────────────
-- Allow mods/admins/owners to delete ANY comment, not just their own.

create or replace function public.is_mod_or_above(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = uid
      and badges && array['mod','admin','owner']::text[]
  );
$$;

drop policy if exists "comments_delete_mod" on public.comments;
create policy "comments_delete_mod" on public.comments
  for delete
  using (public.is_mod_or_above(auth.uid()));

-- Mods can also soft-delete (UPDATE is_deleted=true) on any comment.
drop policy if exists "comments_update_mod" on public.comments;
create policy "comments_update_mod" on public.comments
  for update
  using (public.is_mod_or_above(auth.uid()))
  with check (public.is_mod_or_above(auth.uid()));

-- ─── 4. Helper: bootstrap the very first owner ──────────────────────────────
-- Manual SQL helper — call once with your email after deploying:
--   select public.bootstrap_owner('your-email@example.com');
-- It will grant the 'owner' badge to that user.

create or replace function public.bootstrap_owner(target_email text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid;
begin
  select id into uid from auth.users where email = target_email limit 1;
  if uid is null then
    raise exception 'User with email % not found', target_email;
  end if;
  update public.profiles
  set badges = (select array(select distinct unnest(coalesce(badges, '{}') || array['owner'])))
  where id = uid;
end;
$$;

-- ============================================================
-- ✅ v6 done.
--
-- Next steps:
--   1. Open Supabase SQL editor, paste & run this file.
--   2. Run `select public.bootstrap_owner('your-email@example.com');`
--      to grant yourself the 'owner' badge.
--   3. Use grant_badge / revoke_badge from earlier migrations to manage
--      mod/admin roles on other users.
-- ============================================================
