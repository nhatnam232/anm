# 🚀 Deployment Guide

End-to-end checklist for deploying Anime Wiki to Vercel + Supabase. Follow trong thứ tự — mỗi bước mất 1-3 phút.

---

## 1. Supabase project (5 phút)

1. Vào <https://supabase.com> → "New project" → đặt tên + DB password (lưu lại) → Region **chọn `Southeast Asia (Singapore)`** để gần Việt Nam.
2. Đợi project khởi tạo (~2 phút).
3. Vào **SQL Editor** → New query → paste TOÀN BỘ nội dung `supabase/setup_all.sql` → bấm **Run**. Idempotent — chạy lại bao nhiêu lần cũng được.
4. Vẫn ở SQL Editor, tự bootstrap mình thành owner:
   ```sql
   select public.bootstrap_owner('your-email@example.com');
   ```
5. Vào **Settings → API**:
   - Copy `Project URL` → sẽ dùng cho `VITE_SUPABASE_URL`
   - Copy `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - Copy `service_role` key (giấu kỹ!) → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. hCaptcha (3 phút) — RECOMMENDED

1. <https://www.hcaptcha.com/> → đăng ký free.
2. Add new site → domain `*.vercel.app` (hoặc domain custom của bạn).
3. Copy **Site key** → `VITE_HCAPTCHA_SITE_KEY`.
4. Trong Supabase Dashboard → **Authentication → Providers → enable "hCaptcha"** → paste **Secret key** (lấy từ hCaptcha settings).

---

## 3. Discord webhook (2 phút) — cho admin password

1. Discord → server của bạn → **Server Settings → Integrations → Webhooks → New Webhook**.
2. Đặt tên (vd: "Anime Wiki Bot") → chọn channel (nên tạo channel `#admin` chỉ owner xem được) → **Copy Webhook URL**.
3. Lưu URL — sẽ paste vào Vercel env `ADMIN_PASSWORD_WEBHOOK`. **KHÔNG commit vào Git.**

---

## 4. Tạo CRON_SECRET (10 giây)

Mở terminal, chạy 1 trong các lệnh sau:

```bash
# Python (có sẵn trên máy bạn):
python -c "import secrets; print(secrets.token_urlsafe(32))"

# OpenSSL:
openssl rand -hex 32

# Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy chuỗi output (vd: `xtE1A1F2_iie7yWAjrSJlpVPVF7S9AvHLavnfy3B5C0`) — sẽ dùng ở 2 chỗ:
- Vercel env `CRON_SECRET`
- File `vercel.json` → thay `replace-with-CRON_SECRET` thành chuỗi trên (commit thay đổi này — secret nằm trong query string nhưng vẫn an toàn vì chỉ dùng để gọi từ Vercel cron về API của chính bạn).

---

## 5. (Optional) Upstash Redis — multi-region cache

1. <https://upstash.com> → đăng ký free.
2. Create Database → Region `ap-southeast-1` (Singapore) → Plan: **Free** (10k req/day).
3. Tab "REST API" → copy `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN`.

Bỏ qua nếu không cần — server tự fallback về in-memory cache.

---

## 6. Deploy Vercel (3 phút)

1. <https://vercel.com> → **Add New → Project** → import repo `nhatnam232/anm`.
2. Framework: **Vite** (auto-detect).
3. Vào **Settings → Environment Variables** → thêm:

   | Tên | Value | Bắt buộc? |
   |-----|-------|----------|
   | `VITE_SUPABASE_URL` | từ bước 1.5 | ✅ |
   | `VITE_SUPABASE_ANON_KEY` | từ bước 1.5 | ✅ |
   | `SUPABASE_SERVICE_ROLE_KEY` | từ bước 1.5 | ✅ |
   | `VITE_HCAPTCHA_SITE_KEY` | từ bước 2.3 | Recommended |
   | `ADMIN_PASSWORD_WEBHOOK` | từ bước 3.2 | ✅ (cho cron) |
   | `CRON_SECRET` | từ bước 4 | ✅ (cho cron) |
   | `UPSTASH_REDIS_REST_URL` | từ bước 5 | Optional |
   | `UPSTASH_REDIS_REST_TOKEN` | từ bước 5 | Optional |
   | `SITE_URL` | URL Vercel của bạn | Optional |

4. Vào **Settings → Functions → Function Region** → đổi sang **Hong Kong (`hkg1`)** hoặc **Singapore (`sin1`)** → Save.
5. Hit **Redeploy** ở tab "Deployments" để áp dụng env mới.

> ⚠️ **Tại sao deploy vẫn chạy ở USA?**
>
> 2 lý do thường gặp:
>
> 1. **Hobby plan của Vercel chỉ cho 1 region**, mặc định là `iad1` (Washington DC, US). Bạn phải vào **Settings → Functions → Function Region** để đổi sang region khác (Singapore `sin1` hoặc Hong Kong `hkg1` gần VN nhất).
> 2. **`vercel.json` chỉ định `regions`** — Vercel Hobby chỉ tôn trọng 1 region. File hiện tại đã set `["hkg1"]`. Nếu vẫn deploy ở US, mở **Project Settings → Functions** trên dashboard, đổi default region → Save → redeploy.
>
> Edge functions (vd middleware) chạy global; chỉ serverless functions của bạn mới bị giới hạn region.

---

## 7. (Optional) Custom domain

Vercel → Settings → Domains → Add → trỏ DNS theo hướng dẫn. SSL tự động.

Nhớ update `SITE_URL` env thành domain mới.

---

## 8. Cron alternative — pg_cron (NẾU không muốn dùng Vercel cron)

Vercel Hobby plan **giới hạn 2 cron job** và mỗi cron job chỉ chạy được 1 lần/ngày. Nếu bạn muốn chạy ngoài Vercel hoặc dùng Free plan của Supabase, bật `pg_cron`:

```sql
-- Trong Supabase SQL Editor (project settings → Database → Extensions → enable pg_cron + pg_net):
select cron.schedule(
  'rotate-admin-password-daily',
  '0 0 * * *',                                  -- mỗi ngày 00:00 UTC
  $$
    select net.http_post(
      url      := 'https://YOUR-PROJECT.vercel.app/api/admin/rotate-password',
      headers  := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', current_setting('app.settings.cron_secret', true)
      )
    );
  $$
);

-- Lưu CRON_SECRET vào Postgres so the schedule can read it:
alter database postgres set "app.settings.cron_secret" = 'PASTE_YOUR_CRON_SECRET_HERE';
```

Hoặc đơn giản hơn — gọi RPC trực tiếp (không cần Vercel API):

```sql
select cron.schedule(
  'rotate-admin-password-direct',
  '0 0 * * *',
  $$ select public.rotate_admin_password(); $$
);
```

⚠️ Cách trực tiếp KHÔNG gửi Discord webhook — bạn phải tự fetch password từ table `admin_passwords` hoặc dùng nút "Generate today's password" trong UI.

---

## 9. Lấy password admin lần đầu

3 cách (chọn 1):

| Cách | Khi nào dùng |
|------|--------------|
| 🟢 **UI**: vào `/admin` với tài khoản owner → bấm "Sinh mật khẩu hôm nay" → copy plaintext hiển thị 1 lần. | Không có Discord webhook, không có terminal |
| 🟢 **SQL**: `select public.rotate_admin_password();` trong Supabase SQL editor. | Có Supabase nhưng chưa deploy |
| 🟢 **Cron**: cấu hình `ADMIN_PASSWORD_WEBHOOK` → cron Vercel POST plaintext mỗi đêm. | Đã deploy, có Discord channel |

---

## 10. Kiểm tra deploy thành công

Mở các URL sau (thay `YOUR-PROJECT.vercel.app` bằng domain thật):

- ✅ `https://YOUR-PROJECT.vercel.app/` — homepage load
- ✅ `https://YOUR-PROJECT.vercel.app/api/health` — trả `{"success":true,"message":"ok"}`
- ✅ `https://YOUR-PROJECT.vercel.app/api/anime/?limit=3` — trả 3 anime
- ✅ `https://YOUR-PROJECT.vercel.app/manifest.webmanifest` — trả JSON manifest
- ✅ `https://YOUR-PROJECT.vercel.app/sw.js` — trả service worker JS
- ✅ Mở DevTools → Application → Service Workers → thấy `sw.js` activated
- ✅ Tab Network: response từ `/api/*` có header `x-vercel-execution-region: hkg1` (hoặc sin1)

---

## 🆘 Troubleshooting

### "rotate-password 401 Unauthorized"
→ Chưa set `CRON_SECRET` trên Vercel HOẶC `vercel.json` còn dòng `replace-with-CRON_SECRET`.

### "Webhook gửi nhưng password không vào DB"
→ `SUPABASE_SERVICE_ROLE_KEY` chưa set hoặc sai. Service role key bypass RLS — bắt buộc cho admin rotation.

### "Region vẫn là `iad1` mặc dù `vercel.json` ghi `hkg1`"
→ Hobby plan của Vercel chỉ cho 1 region. Vào **Settings → Functions → Function Region** → chọn → Save → bấm "Redeploy" ở tab Deployments.

### "Activity feed trống dù đã có user thêm anime"
→ Trigger DB chưa cài. Chạy lại `setup_all.sql` (idempotent).

### "Quests không cập nhật progress"
→ Triggers `quests_library_trg`, `quests_comments_trg` cần được tạo. Check trong Supabase Dashboard → Database → Triggers.

---

## 📋 Checklist nhanh

- [ ] Supabase project created (Singapore region)
- [ ] `setup_all.sql` đã chạy
- [ ] `bootstrap_owner('email')` đã chạy với email của bạn
- [ ] `CRON_SECRET` đã generate + paste vào Vercel env + `vercel.json`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` đã paste vào Vercel
- [ ] `ADMIN_PASSWORD_WEBHOOK` Discord URL đã paste vào Vercel
- [ ] Vercel function region đã đổi sang Singapore/Hong Kong
- [ ] hCaptcha site key đã paste vào Vercel + Supabase Auth provider
- [ ] Test `/api/admin/rotate-password?secret=YOUR_SECRET` → trả 200 + password vào Discord
- [ ] Login → vào `/admin` → nhập password → unlock thành công
