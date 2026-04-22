-- ============================================================
-- ANM WIKI - Supabase schema
-- Run this ONCE in the Supabase SQL editor.
-- Idempotent: safe to re-run; it uses IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================

-- Extensions ---------------------------------------------------
create extension if not exists "pgcrypto";

-- ============================================================
-- profiles: one row per auth.users, auto-created on signup
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    split_part(new.email, '@', 1)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- favorites  (also used as "likes" counter)
-- One row per (user, anime) - unique constraint
-- ============================================================
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  anime_id integer not null,
  anime_title text,
  anime_cover text,
  created_at timestamptz not null default now(),
  unique (user_id, anime_id)
);

create index if not exists favorites_anime_idx on public.favorites(anime_id);
create index if not exists favorites_user_idx  on public.favorites(user_id);

-- Public counter view
create or replace view public.anime_like_counts as
  select anime_id, count(*)::int as like_count
  from public.favorites
  group by anime_id;

-- ============================================================
-- comments  (polymorphic: anime | character, nested)
-- ============================================================
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('anime','character')),
  entity_id integer not null,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comments_entity_idx
  on public.comments(entity_type, entity_id, created_at desc);
create index if not exists comments_parent_idx on public.comments(parent_id);
create index if not exists comments_user_idx on public.comments(user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute procedure public.touch_updated_at();

drop trigger if exists comments_touch_updated_at on public.comments;
create trigger comments_touch_updated_at
  before update on public.comments
  for each row execute procedure public.touch_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles  enable row level security;
alter table public.favorites enable row level security;
alter table public.comments  enable row level security;

-- profiles: public read, owner insert/update
drop policy if exists "profiles_read_all"   on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_read_all"
  on public.profiles for select
  using (true);
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- favorites: public read (for like counts), user manages own rows
drop policy if exists "favorites_read_all"    on public.favorites;
drop policy if exists "favorites_insert_own"  on public.favorites;
drop policy if exists "favorites_delete_own"  on public.favorites;
create policy "favorites_read_all"
  on public.favorites for select
  using (true);
create policy "favorites_insert_own"
  on public.favorites for insert
  with check (auth.uid() = user_id);
create policy "favorites_delete_own"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- comments: public read, logged-in user can insert/update/delete own
drop policy if exists "comments_read_all"   on public.comments;
drop policy if exists "comments_insert_own" on public.comments;
drop policy if exists "comments_update_own" on public.comments;
drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_read_all"
  on public.comments for select
  using (true);
create policy "comments_insert_own"
  on public.comments for insert
  with check (auth.uid() = user_id);
create policy "comments_update_own"
  on public.comments for update
  using (auth.uid() = user_id);
create policy "comments_delete_own"
  on public.comments for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Storage: public avatar bucket, user-owned uploads
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_insert_own"  on storage.objects;
drop policy if exists "avatars_update_own"  on storage.objects;
drop policy if exists "avatars_delete_own"  on storage.objects;

create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Scope update/delete to the user's own folder (first path segment = uid).
-- Using folder check instead of owner/owner_id because that column name
-- differs across Supabase Storage versions.
create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Done.
-- Next: in Supabase dashboard -> Authentication -> Providers,
--   * enable "Email" (default)
--   * enable "Google" and paste the Client ID + Client Secret
-- Redirect URL for Google: https://<project>.supabase.co/auth/v1/callback
-- Site URL: https://animewiki.vercel.app   (add localhost:5173 for dev)
-- ============================================================
