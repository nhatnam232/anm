-- ============================================================
-- ANM WIKI - Schema v2 (6 Core Features Extension)
-- Run this AFTER the base schema.sql in the Supabase SQL editor.
-- Idempotent: safe to re-run; uses IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================

-- ============================================================
-- FEATURE 1: Seasonal Anime Chart
-- Stores season/year metadata for anime (cached from Jikan API)
-- ============================================================
create table if not exists public.anime_seasons (
  id            serial primary key,
  anime_id      integer not null unique,
  title         text not null,
  cover_image   text,
  score         numeric(4,2),
  episodes      integer,
  status        text,
  season        text,          -- e.g. 'Spring'
  year          integer,       -- e.g. 2026
  season_key    text generated always as (lower(season) || '_' || year::text) stored,
  genres        text[],        -- e.g. ARRAY['Action','Fantasy']
  studio_name   text,
  type          text,          -- TV, Movie, OVA, etc.
  synopsis      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists anime_seasons_season_year_idx
  on public.anime_seasons(season, year);
create index if not exists anime_seasons_year_idx
  on public.anime_seasons(year desc);
create index if not exists anime_seasons_score_idx
  on public.anime_seasons(score desc nulls last);

drop trigger if exists anime_seasons_touch_updated_at on public.anime_seasons;
create trigger anime_seasons_touch_updated_at
  before update on public.anime_seasons
  for each row execute procedure public.touch_updated_at();

-- RLS
alter table public.anime_seasons enable row level security;
drop policy if exists "anime_seasons_read_all" on public.anime_seasons;
create policy "anime_seasons_read_all"
  on public.anime_seasons for select
  using (true);

-- ============================================================
-- FEATURE 2: Smart Recommendations
-- Stores recommendation relationships between anime
-- ============================================================
create table if not exists public.anime_recommendations (
  id              uuid primary key default gen_random_uuid(),
  source_anime_id integer not null,   -- the anime being viewed
  target_anime_id integer not null,   -- the recommended anime
  target_title    text,
  target_cover    text,
  target_score    numeric(4,2),
  weight          integer default 1,  -- higher = more recommended
  created_at      timestamptz not null default now(),
  unique (source_anime_id, target_anime_id)
);

create index if not exists anime_recs_source_idx
  on public.anime_recommendations(source_anime_id, weight desc);

alter table public.anime_recommendations enable row level security;
drop policy if exists "anime_recs_read_all" on public.anime_recommendations;
create policy "anime_recs_read_all"
  on public.anime_recommendations for select
  using (true);

-- ============================================================
-- FEATURE 3: Personal Library & Progress Tracking
-- One row per (user, anime) - tracks watch status + progress
-- ============================================================
-- Postgres does NOT support "create type if not exists"; guard with DO block.
do $$ begin
  if not exists (select 1 from pg_type where typname = 'watch_status') then
    create type watch_status as enum (
      'watching',
      'completed',
      'plan_to_watch',
      'dropped',
      'on_hold'
    );
  end if;
end $$;

create table if not exists public.user_library (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  anime_id          integer not null,
  anime_title       text not null,
  anime_cover       text,
  anime_episodes    integer,           -- total episodes
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

create index if not exists user_library_user_idx
  on public.user_library(user_id, status, updated_at desc);
create index if not exists user_library_anime_idx
  on public.user_library(anime_id);

drop trigger if exists user_library_touch_updated_at on public.user_library;
create trigger user_library_touch_updated_at
  before update on public.user_library
  for each row execute procedure public.touch_updated_at();

-- RLS: users can only see/manage their own library
alter table public.user_library enable row level security;

drop policy if exists "library_select_own"  on public.user_library;
drop policy if exists "library_insert_own"  on public.user_library;
drop policy if exists "library_update_own"  on public.user_library;
drop policy if exists "library_delete_own"  on public.user_library;

create policy "library_select_own"
  on public.user_library for select
  using (auth.uid() = user_id);
create policy "library_insert_own"
  on public.user_library for insert
  with check (auth.uid() = user_id);
create policy "library_update_own"
  on public.user_library for update
  using (auth.uid() = user_id);
create policy "library_delete_own"
  on public.user_library for delete
  using (auth.uid() = user_id);

-- ============================================================
-- FEATURE 4: Anime Calendar (Broadcast Schedule)
-- Stores weekly broadcast schedule for airing anime
-- ============================================================
create table if not exists public.anime_schedule (
  id              serial primary key,
  anime_id        integer not null unique,
  title           text not null,
  cover_image     text,
  broadcast_day   text not null,      -- 'Monday','Tuesday',...,'Sunday'
  broadcast_time  time,               -- local JST time e.g. 23:00
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

create index if not exists anime_schedule_day_idx
  on public.anime_schedule(broadcast_day, broadcast_time);
create index if not exists anime_schedule_status_idx
  on public.anime_schedule(status);

drop trigger if exists anime_schedule_touch_updated_at on public.anime_schedule;
create trigger anime_schedule_touch_updated_at
  before update on public.anime_schedule
  for each row execute procedure public.touch_updated_at();

alter table public.anime_schedule enable row level security;
drop policy if exists "schedule_read_all" on public.anime_schedule;
create policy "schedule_read_all"
  on public.anime_schedule for select
  using (true);

-- ============================================================
-- FEATURE 5: Quick Review & Reaction
-- Stores emoji reactions + short text reviews per anime per user
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'reaction_type') then
    create type reaction_type as enum ('heart', 'laugh', 'cry');
  end if;
end $$;

create table if not exists public.anime_reactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  anime_id    integer not null,
  reaction    reaction_type not null,
  created_at  timestamptz not null default now(),
  unique (user_id, anime_id)   -- one reaction per user per anime
);

create index if not exists reactions_anime_idx
  on public.anime_reactions(anime_id, reaction);
create index if not exists reactions_user_idx
  on public.anime_reactions(user_id);

-- Aggregated reaction counts view
create or replace view public.anime_reaction_counts as
  select
    anime_id,
    count(*) filter (where reaction = 'heart')  as heart_count,
    count(*) filter (where reaction = 'laugh')  as laugh_count,
    count(*) filter (where reaction = 'cry')    as cry_count,
    count(*)                                     as total_count
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
  unique (user_id, anime_id)   -- one review per user per anime
);

create index if not exists reviews_anime_idx
  on public.anime_reviews(anime_id, created_at desc);
create index if not exists reviews_user_idx
  on public.anime_reviews(user_id);

drop trigger if exists reviews_touch_updated_at on public.anime_reviews;
create trigger reviews_touch_updated_at
  before update on public.anime_reviews
  for each row execute procedure public.touch_updated_at();

-- RLS for reactions
alter table public.anime_reactions enable row level security;
drop policy if exists "reactions_read_all"   on public.anime_reactions;
drop policy if exists "reactions_insert_own" on public.anime_reactions;
drop policy if exists "reactions_update_own" on public.anime_reactions;
drop policy if exists "reactions_delete_own" on public.anime_reactions;
create policy "reactions_read_all"
  on public.anime_reactions for select using (true);
create policy "reactions_insert_own"
  on public.anime_reactions for insert
  with check (auth.uid() = user_id);
create policy "reactions_update_own"
  on public.anime_reactions for update
  using (auth.uid() = user_id);
create policy "reactions_delete_own"
  on public.anime_reactions for delete
  using (auth.uid() = user_id);

-- RLS for reviews
alter table public.anime_reviews enable row level security;
drop policy if exists "reviews_read_all"   on public.anime_reviews;
drop policy if exists "reviews_insert_own" on public.anime_reviews;
drop policy if exists "reviews_update_own" on public.anime_reviews;
drop policy if exists "reviews_delete_own" on public.anime_reviews;
create policy "reviews_read_all"
  on public.anime_reviews for select using (true);
create policy "reviews_insert_own"
  on public.anime_reviews for insert
  with check (auth.uid() = user_id);
create policy "reviews_update_own"
  on public.anime_reviews for update
  using (auth.uid() = user_id);
create policy "reviews_delete_own"
  on public.anime_reviews for delete
  using (auth.uid() = user_id);

-- ============================================================
-- FEATURE 6: MAL Import/Export
-- Tracks MAL sync jobs and imported anime list per user
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'mal_sync_status') then
    create type mal_sync_status as enum (
      'pending',
      'processing',
      'completed',
      'failed'
    );
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

create index if not exists mal_sync_user_idx
  on public.mal_sync_jobs(user_id, created_at desc);

alter table public.mal_sync_jobs enable row level security;
drop policy if exists "mal_sync_select_own" on public.mal_sync_jobs;
drop policy if exists "mal_sync_insert_own" on public.mal_sync_jobs;
create policy "mal_sync_select_own"
  on public.mal_sync_jobs for select
  using (auth.uid() = user_id);
create policy "mal_sync_insert_own"
  on public.mal_sync_jobs for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- HELPER: Extended profile stats view
-- Aggregates library stats per user for profile display
-- ============================================================
create or replace view public.user_library_stats as
  select
    user_id,
    count(*)                                                    as total_anime,
    count(*) filter (where status = 'watching')                 as watching_count,
    count(*) filter (where status = 'completed')                as completed_count,
    count(*) filter (where status = 'plan_to_watch')            as plan_to_watch_count,
    count(*) filter (where status = 'dropped')                  as dropped_count,
    count(*) filter (where status = 'on_hold')                  as on_hold_count,
    round(avg(score) filter (where score is not null), 2)       as avg_score,
    sum(current_episode)                                        as total_episodes_watched
  from public.user_library
  group by user_id;

-- ============================================================
-- Done.
-- Summary of tables added:
--   public.anime_seasons          → Feature 1: Seasonal Chart
--   public.anime_recommendations  → Feature 2: Smart Recommendations
--   public.user_library           → Feature 3: Personal Library
--   public.anime_schedule         → Feature 4: Anime Calendar
--   public.anime_reactions        → Feature 5: Reactions
--   public.anime_reviews          → Feature 5: Quick Reviews
--   public.mal_sync_jobs          → Feature 6: MAL Import/Export
-- Views:
--   public.anime_reaction_counts  → Aggregated reaction counts
--   public.user_library_stats     → User library statistics
-- ============================================================
