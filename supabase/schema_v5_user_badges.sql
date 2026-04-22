-- ============================================================
-- Anime Wiki — Schema v5: user badges (manual + computed counters)
-- Idempotent. Safe to run multiple times.
-- ============================================================

alter table public.profiles
  add column if not exists badges          text[] not null default '{}',
  add column if not exists comments_count  integer not null default 0,
  add column if not exists library_count   integer not null default 0,
  add column if not exists reviews_count   integer not null default 0;

-- ─────────────────────────────────────────────────────────────
-- Backfill counters from existing rows
-- ─────────────────────────────────────────────────────────────
update public.profiles p
set comments_count = coalesce((
  select count(*)::int from public.comments c
  where c.user_id = p.id and c.is_deleted = false
), 0);

update public.profiles p
set library_count = coalesce((
  select count(*)::int from public.user_library l where l.user_id = p.id
), 0);

update public.profiles p
set reviews_count = coalesce((
  select count(*)::int from public.anime_reviews r
  where r.user_id = p.id and r.is_deleted = false
), 0);

-- ─────────────────────────────────────────────────────────────
-- Triggers to keep counters in sync (cheap O(1) increments)
-- ─────────────────────────────────────────────────────────────

create or replace function public.profiles_bump_comments()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT' and (new.is_deleted is not true)) then
    update public.profiles set comments_count = comments_count + 1 where id = new.user_id;
  elsif (tg_op = 'DELETE' and (old.is_deleted is not true)) then
    update public.profiles set comments_count = greatest(0, comments_count - 1) where id = old.user_id;
  elsif (tg_op = 'UPDATE') then
    -- transitions for soft delete
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

-- ─────────────────────────────────────────────────────────────
-- Optional: convenience function for admins to grant badges
-- ─────────────────────────────────────────────────────────────
-- usage:  select grant_badge('user-uuid'::uuid, 'mod');
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
