-- ============================================================
-- Anime Wiki — Schema v4: comment votes (Reddit-style)
-- ============================================================

create table if not exists public.comment_votes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists comment_votes_comment_idx on public.comment_votes(comment_id);

-- Aggregated counts view
create or replace view public.comment_vote_counts as
  select
    comment_id,
    coalesce(sum(case when value = 1 then 1 else 0 end), 0)::int as upvotes,
    coalesce(sum(case when value = -1 then 1 else 0 end), 0)::int as downvotes,
    coalesce(sum(value), 0)::int as score
  from public.comment_votes
  group by comment_id;

alter table public.comment_votes enable row level security;

drop policy if exists "comment_votes_read_all"   on public.comment_votes;
drop policy if exists "comment_votes_insert_own" on public.comment_votes;
drop policy if exists "comment_votes_update_own" on public.comment_votes;
drop policy if exists "comment_votes_delete_own" on public.comment_votes;

create policy "comment_votes_read_all"
  on public.comment_votes for select using (true);

create policy "comment_votes_insert_own"
  on public.comment_votes for insert
  with check (auth.uid() = user_id);

create policy "comment_votes_update_own"
  on public.comment_votes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "comment_votes_delete_own"
  on public.comment_votes for delete
  using (auth.uid() = user_id);
