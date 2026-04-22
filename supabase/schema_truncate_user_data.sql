-- ============================================================
-- ANM WIKI — User-data wipe for AniList migration
--
-- After moving the data source from Jikan/MAL to AniList, all stored anime /
-- character / studio IDs reference the OLD schema (MAL ids). To avoid orphan
-- references and confusing UX, this script wipes user-generated content tied
-- to those IDs.
--
-- Run ONCE in the Supabase SQL editor right before deploying the AniList
-- backend. Idempotent (TRUNCATE is no-op on empty tables).
-- ============================================================

-- Clear character snapshot cache (will be re-seeded by anime detail visits)
do $$ begin
  if to_regclass('public.character_cache') is not null then
    execute 'truncate table public.character_cache';
  end if;
end $$;

-- Clear comments (entity_type/entity_id pointed at MAL ids)
do $$ begin
  if to_regclass('public.comments') is not null then
    execute 'truncate table public.comments';
  end if;
end $$;

-- Clear likes / favorites (anime_id pointed at MAL ids)
do $$ begin
  if to_regclass('public.likes') is not null then
    execute 'truncate table public.likes';
  end if;
end $$;

-- Clear personal library entries (anime_id pointed at MAL ids)
do $$ begin
  if to_regclass('public.user_library') is not null then
    execute 'truncate table public.user_library';
  end if;
end $$;

-- Clear translation cache (cheap to rebuild)
do $$ begin
  if to_regclass('public.translation_cache') is not null then
    execute 'truncate table public.translation_cache';
  end if;
end $$;
