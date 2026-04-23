-- ============================================================
-- v8 — Quests / Achievements progress, Activity Feed, Admin Daily Password
--
-- Mục tiêu:
--   1. Quests: bảng task & user_quest_progress (gamification)
--   2. Activity feed công khai cho cảm giác "web đang sống"
--   3. admin_passwords: mật khẩu mã hóa đổi mỗi ngày, gửi qua webhook
-- ============================================================

-- ─── 1. QUESTS / ACHIEVEMENTS ────────────────────────────────────────────────

create table if not exists public.quests (
  id              text primary key,                    -- e.g. 'spring_2026', 'reviewer_5_edits'
  title           text not null,
  description     text not null,
  badge_reward    text,                                 -- which badge to grant on completion
  target_value    integer not null default 1,           -- e.g. 10 anime, 5 edits
  metric          text not null,                        -- 'completed_in_season:spring_2026', 'edits_approved', 'comments_posted', 'library_count'
  category        text not null default 'general',      -- 'seasonal', 'social', 'curator', 'general'
  starts_at       timestamptz,
  ends_at         timestamptz,                          -- null = always available
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists quests_active_idx on public.quests(is_active, ends_at);

alter table public.quests enable row level security;
drop policy if exists "quests_read_all" on public.quests;
create policy "quests_read_all" on public.quests for select using (true);

create table if not exists public.user_quest_progress (
  user_id         uuid not null references auth.users(id) on delete cascade,
  quest_id        text not null references public.quests(id) on delete cascade,
  progress        integer not null default 0,
  completed_at    timestamptz,
  claimed_at      timestamptz,
  updated_at      timestamptz not null default now(),
  primary key (user_id, quest_id)
);
create index if not exists user_quest_progress_user_idx
  on public.user_quest_progress(user_id, completed_at);

drop trigger if exists user_quest_progress_touch on public.user_quest_progress;
create trigger user_quest_progress_touch
  before update on public.user_quest_progress
  for each row execute procedure public.touch_updated_at();

alter table public.user_quest_progress enable row level security;
drop policy if exists "user_quest_progress_self" on public.user_quest_progress;
create policy "user_quest_progress_self" on public.user_quest_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed các quest mặc định (idempotent, ON CONFLICT DO NOTHING)
insert into public.quests (id, title, description, badge_reward, target_value, metric, category) values
  ('library_starter',  'Khởi đầu hành trình', 'Thêm 5 anime đầu tiên vào thư viện', 'collector', 5, 'library_count', 'general'),
  ('library_pro',      'Nhà sưu tầm thực thụ', 'Thêm 50 anime vào thư viện', 'top_fan', 50, 'library_count', 'general'),
  ('comment_starter',  'Người mở lời', 'Để lại 10 bình luận', 'active', 10, 'comments_posted', 'social'),
  ('comment_pro',      'Bậc thầy thảo luận', 'Để lại 100 bình luận', 'top_fan', 100, 'comments_posted', 'social'),
  ('reviewer_5_edits', 'Curator tập sự', 'Đóng góp 5 edit suggestion được duyệt', 'reviewer', 5, 'edits_approved', 'curator'),
  ('completionist',    'Cày phim chuyên nghiệp', 'Hoàn thành 25 anime', 'completionist', 25, 'completed_count', 'general')
on conflict (id) do nothing;

-- Helper: auto-bump quest progress dựa trên metric
create or replace function public.bump_quest_progress(uid uuid, metric_name text, delta integer default 1)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  q record;
  current_progress integer;
  was_completed boolean;
begin
  for q in (select id, target_value, badge_reward from public.quests
            where is_active = true and metric = metric_name
              and (starts_at is null or now() >= starts_at)
              and (ends_at   is null or now() <= ends_at)) loop
    insert into public.user_quest_progress (user_id, quest_id, progress)
      values (uid, q.id, delta)
    on conflict (user_id, quest_id) do update
      set progress = user_quest_progress.progress + delta,
          updated_at = now();

    select progress, completed_at is not null
      into current_progress, was_completed
      from public.user_quest_progress
      where user_id = uid and quest_id = q.id;

    if current_progress >= q.target_value and not was_completed then
      update public.user_quest_progress
        set completed_at = now()
        where user_id = uid and quest_id = q.id;
      if q.badge_reward is not null then
        perform public.grant_badge(uid, q.badge_reward);
      end if;
    end if;
  end loop;
end;
$$;

-- Trigger hooks: bump quest progress on key events
create or replace function public.quests_after_library_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.bump_quest_progress(new.user_id, 'library_count', 1);
  elsif tg_op = 'UPDATE' and new.status = 'completed' and old.status is distinct from 'completed' then
    perform public.bump_quest_progress(new.user_id, 'completed_count', 1);
  end if;
  return null;
end;
$$;
drop trigger if exists quests_library_trg on public.user_library;
create trigger quests_library_trg
  after insert or update on public.user_library
  for each row execute procedure public.quests_after_library_change();

create or replace function public.quests_after_comment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.is_deleted is not true then
    perform public.bump_quest_progress(new.user_id, 'comments_posted', 1);
  end if;
  return null;
end;
$$;
drop trigger if exists quests_comments_trg on public.comments;
create trigger quests_comments_trg
  after insert on public.comments
  for each row execute procedure public.quests_after_comment();

-- ─── 2. ACTIVITY FEED ────────────────────────────────────────────────────────

do $$ begin
  if not exists (select 1 from pg_type where typname = 'activity_kind') then
    create type activity_kind as enum (
      'library_add', 'library_complete', 'review_post', 'collection_create',
      'comment_post', 'badge_earned', 'edit_approved'
    );
  end if;
end $$;

create table if not exists public.activity_feed (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  kind            activity_kind not null,
  anime_id        integer,
  anime_title     text,
  anime_cover     text,
  collection_id   uuid,
  badge_id        text,
  meta            jsonb,
  is_public       boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists activity_feed_recent_idx
  on public.activity_feed(created_at desc) where is_public = true;
create index if not exists activity_feed_user_idx
  on public.activity_feed(user_id, created_at desc);

alter table public.activity_feed enable row level security;
drop policy if exists "activity_read_public" on public.activity_feed;
drop policy if exists "activity_read_own"    on public.activity_feed;
drop policy if exists "activity_insert_own"  on public.activity_feed;
drop policy if exists "activity_delete_own"  on public.activity_feed;
create policy "activity_read_public" on public.activity_feed
  for select using (is_public = true);
create policy "activity_read_own" on public.activity_feed
  for select using (auth.uid() = user_id);
create policy "activity_insert_own" on public.activity_feed
  for insert with check (auth.uid() = user_id);
create policy "activity_delete_own" on public.activity_feed
  for delete using (auth.uid() = user_id);

-- Auto-record activity on key events (library + reviews + collections)
create or replace function public.record_activity_library()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_feed (user_id, kind, anime_id, anime_title, anime_cover)
    values (new.user_id, 'library_add', new.anime_id, new.anime_title, new.anime_cover);
  elsif tg_op = 'UPDATE' and new.status = 'completed' and old.status is distinct from 'completed' then
    insert into public.activity_feed (user_id, kind, anime_id, anime_title, anime_cover)
    values (new.user_id, 'library_complete', new.anime_id, new.anime_title, new.anime_cover);
  end if;
  return null;
end;
$$;
drop trigger if exists activity_library_trg on public.user_library;
create trigger activity_library_trg
  after insert or update on public.user_library
  for each row execute procedure public.record_activity_library();

create or replace function public.record_activity_collection()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.is_public = true then
    insert into public.activity_feed (user_id, kind, collection_id, meta)
    values (new.user_id, 'collection_create', new.id,
            jsonb_build_object('title', new.title));
  end if;
  return null;
end;
$$;
drop trigger if exists activity_collection_trg on public.collections;
create trigger activity_collection_trg
  after insert on public.collections
  for each row execute procedure public.record_activity_collection();

-- View: enriched feed có sẵn display_name, avatar_url, badges
create or replace view public.activity_feed_enriched as
  select
    a.id, a.user_id, a.kind, a.anime_id, a.anime_title, a.anime_cover,
    a.collection_id, a.badge_id, a.meta, a.created_at,
    p.display_name, p.username, p.avatar_url, p.badges
  from public.activity_feed a
  left join public.profiles p on p.id = a.user_id
  where a.is_public = true;

-- ─── 3. ADMIN DAILY PASSWORD ─────────────────────────────────────────────────
-- Mỗi ngày sinh password mới, lưu hash bcrypt-style (dùng pgcrypto crypt()), gửi
-- plaintext về Discord webhook (qua Edge Function/cron riêng).

create table if not exists public.admin_passwords (
  id              uuid primary key default gen_random_uuid(),
  password_hash   text not null,                        -- crypt(password, gen_salt('bf'))
  valid_for_date  date not null unique,                 -- 1 password / day
  created_at      timestamptz not null default now()
);
create index if not exists admin_passwords_date_idx
  on public.admin_passwords(valid_for_date desc);

alter table public.admin_passwords enable row level security;
-- Không ai được SELECT/INSERT trực tiếp — chỉ qua function security definer.
drop policy if exists "admin_passwords_no_direct_access" on public.admin_passwords;
create policy "admin_passwords_no_direct_access" on public.admin_passwords
  for select using (false);

-- Function rotate password — service role gọi từ Vercel cron, trả plaintext để
-- gửi vào Discord webhook (chỉ thấy 1 lần).
create or replace function public.rotate_admin_password()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_password text;
  alphabet     text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i            integer;
begin
  -- 16 ký tự dễ đọc (loại bỏ 0/O/1/I)
  new_password := '';
  for i in 1..16 loop
    new_password := new_password || substr(alphabet, 1 + (random() * (length(alphabet) - 1))::int, 1);
  end loop;

  insert into public.admin_passwords (password_hash, valid_for_date)
  values (crypt(new_password, gen_salt('bf', 10)), current_date)
  on conflict (valid_for_date) do update
    set password_hash = excluded.password_hash, created_at = now();

  -- Cleanup các password cũ hơn 7 ngày
  delete from public.admin_passwords where valid_for_date < current_date - interval '7 days';

  return new_password;
end;
$$;

-- Verify password — bất kỳ user đã đăng nhập nào cũng có thể test, nhưng chỉ
-- trả TRUE nếu (a) password đúng VÀ (b) profile có badge mod/admin/owner.
-- Đây là 2 yếu tố (2FA): badge + daily password.
create or replace function public.verify_admin_password(candidate text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  stored_hash text;
  ok          boolean := false;
begin
  if not public.is_mod_or_above(auth.uid()) then
    return false;
  end if;

  select password_hash into stored_hash
  from public.admin_passwords
  where valid_for_date = current_date
  limit 1;

  if stored_hash is null then return false; end if;

  ok := (stored_hash = crypt(candidate, stored_hash));

  -- Audit log mọi attempt
  insert into public.audit_logs (actor_id, action, target_type, target_id, reason)
  values (auth.uid(), 'login', 'admin_password', current_date::text,
          case when ok then 'success' else 'failed' end);

  return ok;
end;
$$;

-- ============================================================
-- ✅ Done v8
--   • Tables: quests, user_quest_progress, activity_feed, admin_passwords
--   • Views:  activity_feed_enriched
--   • Triggers: auto bump_quest_progress + record_activity on library/comments/collections
--   • Helpers: bump_quest_progress, rotate_admin_password, verify_admin_password
-- ============================================================
