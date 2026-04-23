-- ============================================================
-- Anime Wiki — Schema v7
--   • collections                    Public anime lists ("Top isekai", etc.)
--   • collection_items               Many-to-many anime ↔ collection
--   • collection_likes               Like counter for ranking collections
--   • anime_edit_suggestions         Pending / approved / rejected edits
--   • audit_logs                     Generic action log (who did what)
--   • compare_history (optional)     Save user's recent comparisons
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ─── 1. Collections ─────────────────────────────────────────────────────────
-- A user-curated public list of anime, e.g. "Top 10 Isekai with Overpowered MC".
-- Lists are public-readable when is_public=true; the owner can always read/edit.

create table if not exists public.collections (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null check (char_length(title) between 3 and 100),
  description     text check (description is null or char_length(description) <= 500),
  cover_image     text,                              -- optional banner (anime cover or upload)
  is_public       boolean not null default true,
  slug            text unique,                       -- pretty URL: /collections/<slug>
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

-- Counter triggers
create or replace function public.bump_collection_items()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.collections set item_count = item_count + 1
      where id = new.collection_id;
  elsif tg_op = 'DELETE' then
    update public.collections set item_count = greatest(0, item_count - 1)
      where id = old.collection_id;
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
    update public.collections set like_count = like_count + 1
      where id = new.collection_id;
  elsif tg_op = 'DELETE' then
    update public.collections set like_count = greatest(0, like_count - 1)
      where id = old.collection_id;
  end if;
  return null;
end;
$$;
drop trigger if exists collection_likes_count_trg on public.collection_likes;
create trigger collection_likes_count_trg
  after insert or delete on public.collection_likes
  for each row execute procedure public.bump_collection_likes();

-- RLS
alter table public.collections      enable row level security;
alter table public.collection_items enable row level security;
alter table public.collection_likes enable row level security;

drop policy if exists "collections_read"        on public.collections;
drop policy if exists "collections_insert_own"  on public.collections;
drop policy if exists "collections_update_own"  on public.collections;
drop policy if exists "collections_delete_own"  on public.collections;
create policy "collections_read"        on public.collections
  for select using (is_public = true or auth.uid() = user_id);
create policy "collections_insert_own"  on public.collections
  for insert with check (auth.uid() = user_id);
create policy "collections_update_own"  on public.collections
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "collections_delete_own"  on public.collections
  for delete using (auth.uid() = user_id);
-- Mods/Admins can also delete any collection (anti-spam)
drop policy if exists "collections_delete_mod" on public.collections;
create policy "collections_delete_mod" on public.collections
  for delete using (public.is_mod_or_above(auth.uid()));

drop policy if exists "collection_items_read" on public.collection_items;
drop policy if exists "collection_items_write_owner" on public.collection_items;
create policy "collection_items_read" on public.collection_items
  for select using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and (c.is_public = true or c.user_id = auth.uid())
    )
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

-- ─── 2. Audit logs ──────────────────────────────────────────────────────────
-- Generic table for tracking who did what. Used by Edit Suggestions workflow,
-- mod actions, badge grants etc. Service role bypasses RLS for inserts.

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
  target_type   text,                   -- 'anime' | 'comment' | 'profile' | …
  target_id     text,                   -- string for flexibility (uuid or int)
  diff          jsonb,                  -- {before: ..., after: ...}
  reason        text,
  ip            inet,
  user_agent    text,
  created_at    timestamptz not null default now()
);
create index if not exists audit_logs_actor_idx
  on public.audit_logs(actor_id, created_at desc);
create index if not exists audit_logs_target_idx
  on public.audit_logs(target_type, target_id, created_at desc);
create index if not exists audit_logs_action_idx
  on public.audit_logs(action, created_at desc);

alter table public.audit_logs enable row level security;
drop policy if exists "audit_select_self"   on public.audit_logs;
drop policy if exists "audit_select_mod"    on public.audit_logs;
create policy "audit_select_self" on public.audit_logs
  for select using (actor_id = auth.uid());
create policy "audit_select_mod" on public.audit_logs
  for select using (public.is_mod_or_above(auth.uid()));
-- Inserts come from server using service role key (bypasses RLS).

-- ─── 3. Edit suggestions ────────────────────────────────────────────────────
-- Workflow:
--   • Newcomer/member  → only allowed to insert with status='pending' (no direct DB write)
--   • active+ users    → trigger auto-approves their edit (status='approved' on insert)
--   • mod/admin/owner  → can call public.approve_edit(id) / public.reject_edit(id, reason)
--                         which patches the canonical record (or audit-only) + writes to audit_logs.

do $$ begin
  if not exists (select 1 from pg_type where typname = 'edit_status') then
    create type edit_status as enum ('pending', 'approved', 'rejected', 'auto_approved');
  end if;
end $$;

create table if not exists public.anime_edit_suggestions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  anime_id        integer not null,
  field           text not null,                -- e.g. 'trailer_url', 'synopsis', 'studio_name'
  content_before  text,
  content_after   text not null,
  reason          text check (reason is null or char_length(reason) <= 500),
  status          edit_status not null default 'pending',
  reviewed_by     uuid references auth.users(id) on delete set null,
  reviewed_at     timestamptz,
  review_note     text,
  created_at      timestamptz not null default now()
);
create index if not exists edit_suggestions_status_idx
  on public.anime_edit_suggestions(status, created_at desc);
create index if not exists edit_suggestions_user_idx
  on public.anime_edit_suggestions(user_id, created_at desc);
create index if not exists edit_suggestions_anime_idx
  on public.anime_edit_suggestions(anime_id, created_at desc);

alter table public.anime_edit_suggestions enable row level security;
drop policy if exists "edit_suggestions_read_self" on public.anime_edit_suggestions;
drop policy if exists "edit_suggestions_read_mod"  on public.anime_edit_suggestions;
drop policy if exists "edit_suggestions_insert"    on public.anime_edit_suggestions;
drop policy if exists "edit_suggestions_update_mod" on public.anime_edit_suggestions;
create policy "edit_suggestions_read_self" on public.anime_edit_suggestions
  for select using (user_id = auth.uid());
create policy "edit_suggestions_read_mod" on public.anime_edit_suggestions
  for select using (public.is_mod_or_above(auth.uid()));
-- Anyone authenticated can submit a suggestion
create policy "edit_suggestions_insert" on public.anime_edit_suggestions
  for insert with check (auth.uid() = user_id);
-- Only mods/admins can update (review) suggestions
create policy "edit_suggestions_update_mod" on public.anime_edit_suggestions
  for update using (public.is_mod_or_above(auth.uid()))
  with check (public.is_mod_or_above(auth.uid()));

-- Pre-insert trigger: auto-approve for trusted users (active / top_fan / mod / admin / owner)
create or replace function public.auto_approve_trusted_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

-- Helper: mod approves a pending edit. Currently just flips status + writes audit log.
-- Real-world UI may want to apply the change to a canonical anime_overrides table.
create or replace function public.approve_edit(suggestion_id uuid, note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sug public.anime_edit_suggestions%rowtype;
begin
  if not public.is_mod_or_above(auth.uid()) then
    raise exception 'Only moderators can approve edits';
  end if;
  select * into sug from public.anime_edit_suggestions where id = suggestion_id;
  if not found then
    raise exception 'Suggestion not found';
  end if;
  update public.anime_edit_suggestions
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = note
  where id = suggestion_id;
  insert into public.audit_logs (actor_id, action, target_type, target_id, diff, reason)
  values (
    auth.uid(),
    'approve_edit',
    'anime',
    sug.anime_id::text,
    jsonb_build_object('field', sug.field, 'before', sug.content_before, 'after', sug.content_after),
    note
  );
end;
$$;

create or replace function public.reject_edit(suggestion_id uuid, note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sug public.anime_edit_suggestions%rowtype;
begin
  if not public.is_mod_or_above(auth.uid()) then
    raise exception 'Only moderators can reject edits';
  end if;
  select * into sug from public.anime_edit_suggestions where id = suggestion_id;
  if not found then
    raise exception 'Suggestion not found';
  end if;
  update public.anime_edit_suggestions
  set status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = note
  where id = suggestion_id;
  insert into public.audit_logs (actor_id, action, target_type, target_id, diff, reason)
  values (
    auth.uid(),
    'reject_edit',
    'anime',
    sug.anime_id::text,
    jsonb_build_object('field', sug.field, 'before', sug.content_before, 'after', sug.content_after),
    note
  );
end;
$$;

-- ─── 4. Compare history (optional, for "recent comparisons" UX) ─────────────
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
-- ✅ v7 done.
--
-- Migration rollback hint: drop the following objects in reverse order if needed:
--   compare_history, anime_edit_suggestions, audit_logs,
--   collection_likes, collection_items, collections,
--   types: edit_status, audit_action,
--   functions: approve_edit, reject_edit, auto_approve_trusted_edit,
--              bump_collection_items, bump_collection_likes
-- ============================================================
