-- ============================================================
-- ANM WIKI — Character snapshot cache
--
-- Purpose: MAL/Jikan occasionally remove characters from upstream which makes
-- the original /api/character/:id call 404 forever. Whenever a user opens an
-- anime detail page, the server seeds this table with whatever character info
-- it already has (id, name, image, role, the anime they appear in). When a
-- direct lookup later 404s we read from this snapshot so the user still gets
-- a usable page.
--
-- Run in the Supabase SQL editor. Idempotent.
-- ============================================================

create table if not exists public.character_cache (
  id            integer primary key,            -- MAL character id
  name          text not null,
  name_kanji    text,
  image         text,
  favorites     integer default 0,
  description   text,                            -- biography snapshot
  appears_in    jsonb not null default '[]'::jsonb,
  source        text default 'anime_detail',     -- where the snapshot came from
  updated_at    timestamptz not null default now()
);

-- Allow public read (RLS) — characters are public data
alter table public.character_cache enable row level security;

-- Anyone can read
drop policy if exists "character_cache read" on public.character_cache;
create policy "character_cache read"
  on public.character_cache
  for select
  using (true);

-- Only the service role (server) can write — no client-side writes
drop policy if exists "character_cache server-only write" on public.character_cache;
create policy "character_cache server-only write"
  on public.character_cache
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Lookup by name for fuzzy fallback
create index if not exists character_cache_name_trgm on public.character_cache using gin (lower(name) gin_trgm_ops);
-- Need pg_trgm extension for the index above
create extension if not exists pg_trgm;

-- Keep updated_at fresh
create or replace function public.set_character_cache_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_character_cache_updated_at on public.character_cache;
create trigger trg_character_cache_updated_at
  before update on public.character_cache
  for each row execute function public.set_character_cache_updated_at();
