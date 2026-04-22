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
-- ✅ Done. Summary:
--   • Tables: profiles, favorites, comments, anime_seasons, user_library,
--     anime_recommendations, anime_schedule, anime_reactions, anime_reviews,
--     mal_sync_jobs, translation_cache, comment_votes
--   • Views:  anime_like_counts, anime_reaction_counts, user_library_stats,
--             comment_vote_counts
--   • Buckets: avatars, comment-images
--   • Triggers: handle_new_user (profile auto-create), touch_updated_at
-- ============================================================
