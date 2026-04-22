-- ============================================================
-- Anime Wiki - Translation Cache
-- Chạy file này trong Supabase SQL Editor.
-- Lưu bản dịch để không tốn quota DeepL cho cùng 1 đoạn văn 2 lần.
-- ============================================================

create table if not exists public.translation_cache (
  id             bigserial primary key,
  text_hash      text not null,           -- simpleHash(source_text)
  source_text    text not null,           -- văn bản gốc (tiếng Anh)
  translated_text text not null,          -- bản dịch
  target_lang    text not null,           -- 'vi' hoặc 'en'
  provider       text not null default 'unknown', -- 'deepl' | 'libretranslate' | 'mymemory'
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (text_hash, target_lang)         -- mỗi đoạn + ngôn ngữ chỉ lưu 1 lần
);

create index if not exists translation_cache_hash_lang_idx
  on public.translation_cache(text_hash, target_lang);

-- Tự cập nhật updated_at khi upsert
drop trigger if exists translation_cache_touch_updated_at on public.translation_cache;
create trigger translation_cache_touch_updated_at
  before update on public.translation_cache
  for each row execute procedure public.touch_updated_at();

-- ============================================================
-- Row Level Security
-- Đọc công khai (frontend không cần auth để dùng cache).
-- Ghi chỉ được phép qua service_role (server API) — anon không được ghi.
-- ============================================================
alter table public.translation_cache enable row level security;

drop policy if exists "translation_cache_read_all" on public.translation_cache;
create policy "translation_cache_read_all"
  on public.translation_cache for select
  using (true);

-- Không có policy insert/update cho anon/authenticated
-- → chỉ service_role (server) mới ghi được, đúng ý đồ thiết kế.

-- ============================================================
-- Done.
-- Sau khi chạy xong: thêm SUPABASE_SERVICE_ROLE_KEY vào Vercel
-- environment variables để server có quyền ghi vào bảng này.
-- ============================================================
