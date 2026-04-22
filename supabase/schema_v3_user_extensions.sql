-- ============================================================
-- Anime Wiki — Schema v3: profile extensions + comment image upload
--
-- Adds:
--   • profiles.gender, profiles.birthday, profiles.spotify_url, profiles.bio
--   • comments.image_url
--   • storage bucket `comment-images` (public read, owner write)
--   • Refreshed RLS policies for `user_library` so Add-To-Library actually
--     works (the previous v2 file may not have been applied — this is
--     idempotent and safe to re-run).
--
-- Run AFTER schema.sql + schema_v2.sql.
-- ============================================================

-- ---------- 1. profile extensions ----------------------------
alter table public.profiles
  add column if not exists gender       text check (gender in ('male','female','other','prefer_not_to_say')),
  add column if not exists birthday     date,
  add column if not exists spotify_url  text,
  add column if not exists bio          text check (bio is null or char_length(bio) <= 500);

-- ---------- 2. comments image_url ----------------------------
alter table public.comments
  add column if not exists image_url    text;

-- ---------- 3. storage bucket --------------------------------
insert into storage.buckets (id, name, public)
values ('comment-images', 'comment-images', true)
on conflict (id) do nothing;

drop policy if exists "comment_images_public_read" on storage.objects;
drop policy if exists "comment_images_insert_own"  on storage.objects;
drop policy if exists "comment_images_delete_own"  on storage.objects;

create policy "comment_images_public_read"
  on storage.objects for select
  using (bucket_id = 'comment-images');

create policy "comment_images_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'comment-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "comment_images_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'comment-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- 4. ensure user_library RLS is correct ------------
-- (This is the fix for "Add to Library" silently failing.)
do $$ begin
  if to_regclass('public.user_library') is null then
    raise notice 'user_library does not exist yet — run schema_v2.sql first.';
  end if;
end $$;

alter table if exists public.user_library enable row level security;

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
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "library_delete_own"
  on public.user_library for delete
  using (auth.uid() = user_id);
