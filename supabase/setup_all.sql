-- ============================================================
-- Anime Wiki — ONE-SHOT setup script
--
-- HOW TO USE
--   1. Mở Supabase Dashboard → SQL Editor → New query.
--   2. Paste TOÀN BỘ file này, bấm "Run".
--   3. Idempotent: chạy lại nhiều lần cũng an toàn.
--
-- File này gộp:
--   • schema.sql                       (base: profiles, favorites, comments, avatars bucket)
--   • schema_v2.sql                    (anime_seasons, user_library, recommendations,
--                                        anime_schedule, reactions, reviews, mal_sync,
--                                        user_library_stats view)
--   • schema_translation_cache.sql     (translation_cache table)
--   • schema_v3_user_extensions.sql    (profile gender/birthday/bio/spotify,
--                                        comment image_url, comment-images bucket,
--                                        re-create user_library RLS — fixes Add-To-Library)
--   • schema_v4_comment_votes.sql      (comment_votes table + comment_vote_counts view)
-- ============================================================

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ============================================================
-- 1. Base — profiles, favorites, comments, avatars storage
-- (from supabase/schema.sql)
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

create or replace view public.anime_like_counts as
  select anime_id, count(*)::int as like_count
  from public.favorites
  group by anime_id;

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
create index if not exists comments_entity_idx on public.comments(entity_type, entity_id, created_at desc);
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

-- RLS — base tables
alter table public.profiles  enable row level security;
alter table public.favorites enable row level security;
alter table public.comments  enable row level security;

drop policy if exists "profiles_read_all"   on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_read_all"   on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

drop policy if exists "favorites_read_all"   on public.favorites;
drop policy if exists "favorites_insert_own" on public.favorites;
drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_read_all"   on public.favorites for select using (true);
create policy "favorites_insert_own" on public.favorites for insert with check (auth.uid() = user_id);
create policy "favorites_delete_own" on public.favorites for delete using (auth.uid() = user_id);

drop policy if exists "comments_read_all"   on public.comments;
drop policy if exists "comments_insert_own" on public.comments;
drop policy if exists "comments_update_own" on public.comments;
drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_read_all"   on public.comments for select using (true);
create policy "comments_insert_own" on public.comments for insert with check (auth.uid() = user_id);
create policy "comments_update_own" on public.comments for update using (auth.uid() = user_id);
create policy "comments_delete_own" on public.comments for delete using (auth.uid() = user_id);

-- Storage: avatars bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_insert_own"  on storage.objects;
drop policy if exists "avatars_update_own"  on storage.objects;
drop policy if exists "avatars_delete_own"  on storage.objects;
create policy "avatars_public_read" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatars_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_update_own" on storage.objects for update to authenticated
  using      (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 2. v2 — Library, schedule, reactions, reviews, MAL sync
-- (from supabase/schema_v2.sql)
-- ============================================================

create table if not exists public.anime_seasons (
  id            serial primary key,
  anime_id      integer not null unique,
  title         text not null,
  cover_image   text,
  score         numeric(4,2),
  episodes      integer,
  status        text,
  season        text,
  year          integer,
  season_key    text generated always as (lower(season) || '_' || year::text) stored,
  genres        text[],
  studio_name   text,
  type          text,
  synopsis      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists anime_seasons_season_year_idx on public.anime_seasons(season, year);
create index if not exists anime_seasons_year_idx on public.anime_seasons(year desc);
create index if not exists anime_seasons_score_idx on public.anime_seasons(score desc nulls last);

drop trigger if exists anime_seasons_touch_updated_at on public.anime_seasons;
create trigger anime_seasons_touch_updated_at
  before update on public.anime_seasons
  for each row execute procedure public.touch_updated_at();

alter table public.anime_seasons enable row level security;
drop policy if exists "anime_seasons_read_all" on public.anime_seasons;
create policy "anime_seasons_read_all" on public.anime_seasons for select using (true);

create table if not exists public.anime_recommendations (
  id              uuid primary key default gen_random_uuid(),
  source_anime_id integer not null,
  target_anime_id integer not null,
  target_title    text,
  target_cover    text,
  target_score    numeric(4,2),
  weight          integer default 1,
  created_at      timestamptz not null default now(),
  unique (source_anime_id, target_anime_id)
);
create index if not exists anime_recs_source_idx on public.anime_recommendations(source_anime_id, weight desc);

alter table public.anime_recommendations enable row level security;
drop policy if exists "anime_recs_read_all" on public.anime_recommendations;
create policy "anime_recs_read_all" on public.anime_recommendations for select using (true);

do $$ begin
  if not exists (select 1 from pg_type where typname = 'watch_status') then
    create type watch_status as enum ('watching','completed','plan_to_watch','dropped','on_hold');
  end if;
end $$;

create table if not exists public.user_library (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  anime_id          integer not null,
  anime_title       text not null,
  anime_cover       text,
  anime_episodes    integer,
  status            watch_status not null default 'plan_to_watch',
  current_episode   integer not null default 0,
  score             smallint check (score is null or (score >= 1 and score <= 10)),
  notes             text,
  started_at        date,
  completed_at      date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, anime_id)
);
create index if not exists user_library_user_idx  on public.user_library(user_id, status, updated_at desc);
create index if not exists user_library_anime_idx on public.user_library(anime_id);

drop trigger if exists user_library_touch_updated_at on public.user_library;
create trigger user_library_touch_updated_at
  before update on public.user_library
  for each row execute procedure public.touch_updated_at();

alter table public.user_library enable row level security;
drop policy if exists "library_select_own"  on public.user_library;
drop policy if exists "library_insert_own"  on public.user_library;
drop policy if exists "library_update_own"  on public.user_library;
drop policy if exists "library_delete_own"  on public.user_library;
create policy "library_select_own"  on public.user_library for select using (auth.uid() = user_id);
create policy "library_insert_own"  on public.user_library for insert with check (auth.uid() = user_id);
create policy "library_update_own"  on public.user_library for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "library_delete_own"  on public.user_library for delete using (auth.uid() = user_id);

create table if not exists public.anime_schedule (
  id              serial primary key,
  anime_id        integer not null unique,
  title           text not null,
  cover_image     text,
  broadcast_day   text not null,
  broadcast_time  time,
  broadcast_tz    text default 'Asia/Tokyo',
  season          text,
  year            integer,
  episodes        integer,
  status          text,
  studio_name     text,
  score           numeric(4,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists anime_schedule_day_idx on public.anime_schedule(broadcast_day, broadcast_time);
create index if not exists anime_schedule_status_idx on public.anime_schedule(status);

drop trigger if exists anime_schedule_touch_updated_at on public.anime_schedule;
create trigger anime_schedule_touch_updated_at
  before update on public.anime_schedule
  for each row execute procedure public.touch_updated_at();

alter table public.anime_schedule enable row level security;
drop policy if exists "schedule_read_all" on public.anime_schedule;
create policy "schedule_read_all" on public.anime_schedule for select using (true);

do $$ begin
  if not exists (select 1 from pg_type where typname = 'reaction_type') then
    create type reaction_type as enum ('heart','laugh','cry');
  end if;
end $$;

create table if not exists public.anime_reactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  anime_id    integer not null,
  reaction    reaction_type not null,
  created_at  timestamptz not null default now(),
  unique (user_id, anime_id)
);
create index if not exists reactions_anime_idx on public.anime_reactions(anime_id, reaction);
create index if not exists reactions_user_idx  on public.anime_reactions(user_id);

create or replace view public.anime_reaction_counts as
  select anime_id,
    count(*) filter (where reaction = 'heart') as heart_count,
    count(*) filter (where reaction = 'laugh') as laugh_count,
    count(*) filter (where reaction = 'cry')   as cry_count,
    count(*) as total_count
  from public.anime_reactions
  group by anime_id;

create table if not exists public.anime_reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  anime_id    integer not null,
  body        text not null check (char_length(body) between 1 and 200),
  is_deleted  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, anime_id)
);
create index if not exists reviews_anime_idx on public.anime_reviews(anime_id, created_at desc);
create index if not exists reviews_user_idx  on public.anime_reviews(user_id);

drop trigger if exists reviews_touch_updated_at on public.anime_reviews;
create trigger reviews_touch_updated_at
  before update on public.anime_reviews
  for each row execute procedure public.touch_updated_at();

alter table public.anime_reactions enable row level security;
drop policy if exists "reactions_read_all"   on public.anime_reactions;
drop policy if exists "reactions_insert_own" on public.anime_reactions;
drop policy if exists "reactions_update_own" on public.anime_reactions;
drop policy if exists "reactions_delete_own" on public.anime_reactions;
create policy "reactions_read_all"   on public.anime_reactions for select using (true);
create policy "reactions_insert_own" on public.anime_reactions for insert with check (auth.uid() = user_id);
create policy "reactions_update_own" on public.anime_reactions for update using (auth.uid() = user_id);
create policy "reactions_delete_own" on public.anime_reactions for delete using (auth.uid() = user_id);

alter table public.anime_reviews enable row level security;
drop policy if exists "reviews_read_all"   on public.anime_reviews;
drop policy if exists "reviews_insert_own" on public.anime_reviews;
drop policy if exists "reviews_update_own" on public.anime_reviews;
drop policy if exists "reviews_delete_own" on public.anime_reviews;
create policy "reviews_read_all"   on public.anime_reviews for select using (true);
create policy "reviews_insert_own" on public.anime_reviews for insert with check (auth.uid() = user_id);
create policy "reviews_update_own" on public.anime_reviews for update using (auth.uid() = user_id);
create policy "reviews_delete_own" on public.anime_reviews for delete using (auth.uid() = user_id);

do $$ begin
  if not exists (select 1 from pg_type where typname = 'mal_sync_status') then
    create type mal_sync_status as enum ('pending','processing','completed','failed');
  end if;
end $$;

create table if not exists public.mal_sync_jobs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  mal_username    text not null,
  status          mal_sync_status not null default 'pending',
  total_imported  integer default 0,
  total_skipped   integer default 0,
  error_message   text,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists mal_sync_user_idx on public.mal_sync_jobs(user_id, created_at desc);

alter table public.mal_sync_jobs enable row level security;
drop policy if exists "mal_sync_select_own" on public.mal_sync_jobs;
drop policy if exists "mal_sync_insert_own" on public.mal_sync_jobs;
create policy "mal_sync_select_own" on public.mal_sync_jobs for select using (auth.uid() = user_id);
create policy "mal_sync_insert_own" on public.mal_sync_jobs for insert with check (auth.uid() = user_id);

create or replace view public.user_library_stats as
  select user_id,
    count(*) as total_anime,
    count(*) filter (where status = 'watching')      as watching_count,
    count(*) filter (where status = 'completed')     as completed_count,
    count(*) filter (where status = 'plan_to_watch') as plan_to_watch_count,
    count(*) filter (where status = 'dropped')       as dropped_count,
    count(*) filter (where status = 'on_hold')       as on_hold_count,
    round(avg(score) filter (where score is not null), 2) as avg_score,
    sum(current_episode) as total_episodes_watched
  from public.user_library
  group by user_id;

-- ============================================================
-- 3. translation_cache (for DeepL/MyMemory caching)
-- (from supabase/schema_translation_cache.sql)
-- ============================================================

create table if not exists public.translation_cache (
  text_hash       text not null,
  target_lang     text not null,
  source_text     text not null,
  translated_text text not null,
  provider        text,
  updated_at      timestamptz not null default now(),
  primary key (text_hash, target_lang)
);
create index if not exists translation_cache_updated_idx on public.translation_cache(updated_at desc);

alter table public.translation_cache enable row level security;
drop policy if exists "translation_cache_read_all" on public.translation_cache;
create policy "translation_cache_read_all" on public.translation_cache for select using (true);
-- NOTE: writes happen from the server-side service role key, which bypasses RLS.

-- ============================================================
-- 4. v3 — Profile extensions + comment image_url + comment-images bucket
-- (from supabase/schema_v3_user_extensions.sql)
-- ============================================================

alter table public.profiles
  add column if not exists gender       text check (gender in ('male','female','other','prefer_not_to_say')),
  add column if not exists birthday     date,
  add column if not exists spotify_url  text,
  add column if not exists bio          text check (bio is null or char_length(bio) <= 500);

alter table public.comments
  add column if not exists image_url    text;

insert into storage.buckets (id, name, public)
values ('comment-images', 'comment-images', true)
on conflict (id) do nothing;

drop policy if exists "comment_images_public_read" on storage.objects;
drop policy if exists "comment_images_insert_own"  on storage.objects;
drop policy if exists "comment_images_delete_own"  on storage.objects;

create policy "comment_images_public_read" on storage.objects for select
  using (bucket_id = 'comment-images');
create policy "comment_images_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'comment-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "comment_images_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'comment-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 5. v4 — Reddit-style comment votes
-- (from supabase/schema_v4_comment_votes.sql)
-- ============================================================

create table if not exists public.comment_votes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  value      smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index if not exists comment_votes_comment_idx on public.comment_votes(comment_id);

create or replace view public.comment_vote_counts as
  select comment_id,
    coalesce(sum(case when value = 1  then 1 else 0 end), 0)::int as upvotes,
    coalesce(sum(case when value = -1 then 1 else 0 end), 0)::int as downvotes,
    coalesce(sum(value), 0)::int as score
  from public.comment_votes
  group by comment_id;

alter table public.comment_votes enable row level security;
drop policy if exists "comment_votes_read_all"   on public.comment_votes;
drop policy if exists "comment_votes_insert_own" on public.comment_votes;
drop policy if exists "comment_votes_update_own" on public.comment_votes;
drop policy if exists "comment_votes_delete_own" on public.comment_votes;
create policy "comment_votes_read_all"   on public.comment_votes for select using (true);
create policy "comment_votes_insert_own" on public.comment_votes for insert with check (auth.uid() = user_id);
create policy "comment_votes_update_own" on public.comment_votes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "comment_votes_delete_own" on public.comment_votes for delete using (auth.uid() = user_id);

-- ============================================================
-- 6. v5 — Profile badges + counter triggers
-- (from supabase/schema_v5_user_badges.sql)
-- ============================================================

alter table public.profiles
  add column if not exists badges          text[] not null default '{}',
  add column if not exists comments_count  integer not null default 0,
  add column if not exists library_count   integer not null default 0,
  add column if not exists reviews_count   integer not null default 0;

update public.profiles p set comments_count = coalesce((
  select count(*)::int from public.comments c
  where c.user_id = p.id and c.is_deleted = false), 0);
update public.profiles p set library_count = coalesce((
  select count(*)::int from public.user_library l where l.user_id = p.id), 0);
update public.profiles p set reviews_count = coalesce((
  select count(*)::int from public.anime_reviews r
  where r.user_id = p.id and r.is_deleted = false), 0);

create or replace function public.profiles_bump_comments()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT' and (new.is_deleted is not true)) then
    update public.profiles set comments_count = comments_count + 1 where id = new.user_id;
  elsif (tg_op = 'DELETE' and (old.is_deleted is not true)) then
    update public.profiles set comments_count = greatest(0, comments_count - 1) where id = old.user_id;
  elsif (tg_op = 'UPDATE') then
    if old.is_deleted is not true and new.is_deleted is true then
      update public.profiles set comments_count = greatest(0, comments_count - 1) where id = new.user_id;
    elsif old.is_deleted is true and new.is_deleted is not true then
      update public.profiles set comments_count = comments_count + 1 where id = new.user_id;
    end if;
  end if;
  return null;
end;
$$;
drop trigger if exists comments_count_trg on public.comments;
create trigger comments_count_trg
  after insert or update or delete on public.comments
  for each row execute procedure public.profiles_bump_comments();

create or replace function public.profiles_bump_library()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set library_count = library_count + 1 where id = new.user_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set library_count = greatest(0, library_count - 1) where id = old.user_id;
  end if;
  return null;
end;
$$;
drop trigger if exists library_count_trg on public.user_library;
create trigger library_count_trg
  after insert or delete on public.user_library
  for each row execute procedure public.profiles_bump_library();

create or replace function public.profiles_bump_reviews()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT' and new.is_deleted is not true) then
    update public.profiles set reviews_count = reviews_count + 1 where id = new.user_id;
  elsif (tg_op = 'DELETE' and old.is_deleted is not true) then
    update public.profiles set reviews_count = greatest(0, reviews_count - 1) where id = old.user_id;
  elsif tg_op = 'UPDATE' then
    if old.is_deleted is not true and new.is_deleted is true then
      update public.profiles set reviews_count = greatest(0, reviews_count - 1) where id = new.user_id;
    elsif old.is_deleted is true and new.is_deleted is not true then
      update public.profiles set reviews_count = reviews_count + 1 where id = new.user_id;
    end if;
  end if;
  return null;
end;
$$;
drop trigger if exists reviews_count_trg on public.anime_reviews;
create trigger reviews_count_trg
  after insert or update or delete on public.anime_reviews
  for each row execute procedure public.profiles_bump_reviews();

create or replace function public.grant_badge(target uuid, badge text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set badges = (select array(select distinct unnest(badges || array[badge])))
  where id = target;
end;
$$;

create or replace function public.revoke_badge(target uuid, badge text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set badges = array_remove(badges, badge)
  where id = target;
end;
$$;

-- ============================================================
-- 7. v6 — Profile cover image, notifications, admin moderation RLS
-- (from supabase/schema_v6_cover_notifications_admin.sql)
-- ============================================================

alter table public.profiles
  add column if not exists cover_url text;

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
  for delete using (public.is_mod_or_above(auth.uid()));

drop policy if exists "comments_update_mod" on public.comments;
create policy "comments_update_mod" on public.comments
  for update
  using (public.is_mod_or_above(auth.uid()))
  with check (public.is_mod_or_above(auth.uid()));

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
-- 8. v7 — Collections, Audit logs, Edit suggestions, Compare history
-- (from supabase/schema_v7_collections_audit_edits.sql)
-- ============================================================

create table if not exists public.collections (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null check (char_length(title) between 3 and 100),
  description     text check (description is null or char_length(description) <= 500),
  cover_image     text,
  is_public       boolean not null default true,
  slug            text unique,
  view_count      integer not null default 0,
  like_count      integer not null default 0,
  item_count      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists collections_user_idx
  on public.collections(user_id, updated_at desc);
create index if not exists collections_public_idx
  on public.collections(is_public, like_count desc, updated_at desc);

drop trigger if exists collections_touch_updated_at on public.collections;
create trigger collections_touch_updated_at
  before update on public.collections
  for each row execute procedure public.touch_updated_at();

create table if not exists public.collection_items (
  id              uuid primary key default gen_random_uuid(),
  collection_id   uuid not null references public.collections(id) on delete cascade,
  anime_id        integer not null,
  anime_title     text,
  anime_cover     text,
  position        integer not null default 0,
  note            text check (note is null or char_length(note) <= 280),
  added_at        timestamptz not null default now(),
  unique (collection_id, anime_id)
);
create index if not exists collection_items_collection_idx
  on public.collection_items(collection_id, position);

create table if not exists public.collection_likes (
  collection_id   uuid not null references public.collections(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (collection_id, user_id)
);
create index if not exists collection_likes_user_idx
  on public.collection_likes(user_id);

create or replace function public.bump_collection_items()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.collections set item_count = item_count + 1 where id = new.collection_id;
  elsif tg_op = 'DELETE' then
    update public.collections set item_count = greatest(0, item_count - 1) where id = old.collection_id;
  end if;
  return null;
end;
$$;
drop trigger if exists collection_items_count_trg on public.collection_items;
create trigger collection_items_count_trg
  after insert or delete on public.collection_items
  for each row execute procedure public.bump_collection_items();

create or replace function public.bump_collection_likes()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.collections set like_count = like_count + 1 where id = new.collection_id;
  elsif tg_op = 'DELETE' then
    update public.collections set like_count = greatest(0, like_count - 1) where id = old.collection_id;
  end if;
  return null;
end;
$$;
drop trigger if exists collection_likes_count_trg on public.collection_likes;
create trigger collection_likes_count_trg
  after insert or delete on public.collection_likes
  for each row execute procedure public.bump_collection_likes();

alter table public.collections      enable row level security;
alter table public.collection_items enable row level security;
alter table public.collection_likes enable row level security;

drop policy if exists "collections_read"        on public.collections;
drop policy if exists "collections_insert_own"  on public.collections;
drop policy if exists "collections_update_own"  on public.collections;
drop policy if exists "collections_delete_own"  on public.collections;
drop policy if exists "collections_delete_mod"  on public.collections;
create policy "collections_read"        on public.collections
  for select using (is_public = true or auth.uid() = user_id);
create policy "collections_insert_own"  on public.collections for insert with check (auth.uid() = user_id);
create policy "collections_update_own"  on public.collections for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "collections_delete_own"  on public.collections for delete using (auth.uid() = user_id);
create policy "collections_delete_mod"  on public.collections for delete
  using (public.is_mod_or_above(auth.uid()));

drop policy if exists "collection_items_read"        on public.collection_items;
drop policy if exists "collection_items_write_owner" on public.collection_items;
create policy "collection_items_read" on public.collection_items
  for select using (
    exists (select 1 from public.collections c
            where c.id = collection_id and (c.is_public = true or c.user_id = auth.uid()))
  );
create policy "collection_items_write_owner" on public.collection_items
  for all using (
    exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid())
  );

drop policy if exists "collection_likes_read"   on public.collection_likes;
drop policy if exists "collection_likes_insert" on public.collection_likes;
drop policy if exists "collection_likes_delete" on public.collection_likes;
create policy "collection_likes_read"   on public.collection_likes for select using (true);
create policy "collection_likes_insert" on public.collection_likes
  for insert with check (auth.uid() = user_id);
create policy "collection_likes_delete" on public.collection_likes
  for delete using (auth.uid() = user_id);

do $$ begin
  if not exists (select 1 from pg_type where typname = 'audit_action') then
    create type audit_action as enum (
      'edit_anime', 'approve_edit', 'reject_edit',
      'delete_comment_mod', 'grant_badge', 'revoke_badge',
      'create_collection', 'delete_collection', 'login', 'other'
    );
  end if;
end $$;

create table if not exists public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references auth.users(id) on delete set null,
  action        audit_action not null,
  target_type   text,
  target_id     text,
  diff          jsonb,
  reason        text,
  ip            inet,
  user_agent    text,
  created_at    timestamptz not null default now()
);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);
create index if not exists audit_logs_target_idx on public.audit_logs(target_type, target_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs(action, created_at desc);

alter table public.audit_logs enable row level security;
drop policy if exists "audit_select_self" on public.audit_logs;
drop policy if exists "audit_select_mod"  on public.audit_logs;
create policy "audit_select_self" on public.audit_logs
  for select using (actor_id = auth.uid());
create policy "audit_select_mod" on public.audit_logs
  for select using (public.is_mod_or_above(auth.uid()));

do $$ begin
  if not exists (select 1 from pg_type where typname = 'edit_status') then
    create type edit_status as enum ('pending', 'approved', 'rejected', 'auto_approved');
  end if;
end $$;

create table if not exists public.anime_edit_suggestions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  anime_id        integer not null,
  field           text not null,
  content_before  text,
  content_after   text not null,
  reason          text check (reason is null or char_length(reason) <= 500),
  status          edit_status not null default 'pending',
  reviewed_by     uuid references auth.users(id) on delete set null,
  reviewed_at     timestamptz,
  review_note     text,
  created_at      timestamptz not null default now()
);
create index if not exists edit_suggestions_status_idx on public.anime_edit_suggestions(status, created_at desc);
create index if not exists edit_suggestions_user_idx on public.anime_edit_suggestions(user_id, created_at desc);
create index if not exists edit_suggestions_anime_idx on public.anime_edit_suggestions(anime_id, created_at desc);

alter table public.anime_edit_suggestions enable row level security;
drop policy if exists "edit_suggestions_read_self" on public.anime_edit_suggestions;
drop policy if exists "edit_suggestions_read_mod"  on public.anime_edit_suggestions;
drop policy if exists "edit_suggestions_insert"    on public.anime_edit_suggestions;
drop policy if exists "edit_suggestions_update_mod" on public.anime_edit_suggestions;
create policy "edit_suggestions_read_self" on public.anime_edit_suggestions
  for select using (user_id = auth.uid());
create policy "edit_suggestions_read_mod" on public.anime_edit_suggestions
  for select using (public.is_mod_or_above(auth.uid()));
create policy "edit_suggestions_insert" on public.anime_edit_suggestions
  for insert with check (auth.uid() = user_id);
create policy "edit_suggestions_update_mod" on public.anime_edit_suggestions
  for update using (public.is_mod_or_above(auth.uid()))
  with check (public.is_mod_or_above(auth.uid()));

create or replace function public.auto_approve_trusted_edit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_trusted boolean := false;
begin
  select exists (
    select 1 from public.profiles
    where id = new.user_id
      and badges && array['active','top_fan','mod','admin','owner']::text[]
  ) into is_trusted;
  if is_trusted then
    new.status := 'auto_approved';
    new.reviewed_by := new.user_id;
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists edit_suggestions_auto_approve on public.anime_edit_suggestions;
create trigger edit_suggestions_auto_approve
  before insert on public.anime_edit_suggestions
  for each row execute procedure public.auto_approve_trusted_edit();

create or replace function public.approve_edit(suggestion_id uuid, note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare sug public.anime_edit_suggestions%rowtype;
begin
  if not public.is_mod_or_above(auth.uid()) then
    raise exception 'Only moderators can approve edits';
  end if;
  select * into sug from public.anime_edit_suggestions where id = suggestion_id;
  if not found then raise exception 'Suggestion not found'; end if;
  update public.anime_edit_suggestions
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), review_note = note
  where id = suggestion_id;
  insert into public.audit_logs (actor_id, action, target_type, target_id, diff, reason)
  values (auth.uid(), 'approve_edit', 'anime', sug.anime_id::text,
          jsonb_build_object('field', sug.field, 'before', sug.content_before, 'after', sug.content_after),
          note);
end;
$$;

create or replace function public.reject_edit(suggestion_id uuid, note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare sug public.anime_edit_suggestions%rowtype;
begin
  if not public.is_mod_or_above(auth.uid()) then
    raise exception 'Only moderators can reject edits';
  end if;
  select * into sug from public.anime_edit_suggestions where id = suggestion_id;
  if not found then raise exception 'Suggestion not found'; end if;
  update public.anime_edit_suggestions
  set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = note
  where id = suggestion_id;
  insert into public.audit_logs (actor_id, action, target_type, target_id, diff, reason)
  values (auth.uid(), 'reject_edit', 'anime', sug.anime_id::text,
          jsonb_build_object('field', sug.field, 'before', sug.content_before, 'after', sug.content_after),
          note);
end;
$$;

create table if not exists public.compare_history (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  anime_ids       integer[] not null,
  created_at      timestamptz not null default now()
);
create index if not exists compare_history_user_idx
  on public.compare_history(user_id, created_at desc);
alter table public.compare_history enable row level security;
drop policy if exists "compare_history_self" on public.compare_history;
create policy "compare_history_self" on public.compare_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- ✅ Done. Summary:
--   • Tables: profiles (+badges/counters/cover_url), favorites, comments, anime_seasons,
--     user_library, anime_recommendations, anime_schedule, anime_reactions,
--     anime_reviews, mal_sync_jobs, translation_cache, comment_votes, notifications,
--     collections, collection_items, collection_likes,
--     anime_edit_suggestions, audit_logs, compare_history
--   • Views:  anime_like_counts, anime_reaction_counts, user_library_stats,
--             comment_vote_counts
--   • Buckets: avatars, comment-images, covers
--   • Triggers: handle_new_user, touch_updated_at, comments/library/reviews counters,
--               collection counters, edit-suggestion auto-approve
--   • Helpers: grant_badge, revoke_badge, bootstrap_owner, is_mod_or_above,
--              approve_edit, reject_edit
-- ============================================================


