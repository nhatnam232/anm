# 🚀 Deployment Guide (Zero-config edition)

End-to-end checklist for deploying Anime Wiki. Follow theo thứ tự — total ~10 phút.

> ✨ **CRON_SECRET không cần generate nữa** — Vercel cron tự auth qua header `x-vercel-cron-signature`. Backend cũng tự sinh secret cho external callers (pg_cron / curl) và lưu trong DB. Bạn chỉ paste env mà thôi.

---

## ⚡ TL;DR — 3 bước tối thiểu để chạy

1. **Supabase**: tạo project Singapore → SQL Editor → paste `supabase/setup_all.sql` → Run.
2. **Vercel**: import repo → paste 3 env required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. **Vercel Settings → Functions → Function Region** → đổi sang **Singapore** hoặc **Hong Kong** → Save → Redeploy.

Vào `/admin` → bấm "Sinh mật khẩu hôm nay" → xong! ✅

Mọi thứ khác (hCaptcha / Discord / Upstash / DeepL) là OPTIONAL.

---

## 1. Supabase project (5 phút)

1. <https://supabase.com> → "New project" → đặt tên + DB password (lưu lại) → Region **`Southeast Asia (Singapore)`** (gần VN).
2. Đợi project khởi tạo (~2 phút).
3. **SQL Editor** → New query → paste TOÀN BỘ `supabase/setup_all.sql` → **Run**. Idempotent.
4. Vẫn ở SQL Editor, bootstrap mình thành owner:
   ```sql
   select public.bootstrap_owner('your-email@example.com');
   ```
5. **Settings → API**:
   - `Project URL` → env `VITE_SUPABASE_URL`
   - `anon public` key → env `VITE_SUPABASE_ANON_KEY`
   - `service_role` key (giấu kỹ) → env `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. hCaptcha (3 phút) — RECOMMENDED

1. <https://www.hcaptcha.com/> → đăng ký free → add site → domain `*.vercel.app`.
2. Copy **Site key** → env `VITE_HCAPTCHA_SITE_KEY`.
3. Supabase Dashboard → **Authentication → Providers → enable hCaptcha** → paste **Secret key**.

---

## 3. Discord webhook (2 phút) — OPTIONAL

Để password mỗi sáng tự về Discord channel:

1. Discord server → **Server Settings → Integrations → Webhooks → New Webhook**.
2. Đặt tên (vd: "Anime Wiki Bot") → chọn channel #admin → **Copy Webhook URL**.
3. Paste vào Vercel env `ADMIN_PASSWORD_WEBHOOK`. **KHÔNG commit vào Git.**

Không có webhook? Vẫn dùng được — vào `/admin` bấm "Sinh mật khẩu hôm nay" như cách dưới.

---

## 4. (Optional) Upstash Redis cache

1. <https://upstash.com> → free → Create Database → Region `ap-southeast-1` (Singapore) → Plan **Free**.
2. Tab "REST API" → copy `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN`.

Bỏ qua nếu không cần — server fallback in-memory cache.

---

## 5. Deploy Vercel (3 phút)

1. <https://vercel.com> → **Add New → Project** → import repo `nhatnam232/anm`.
2. Framework: **Vite** (auto-detect).
3. **Settings → Environment Variables** → thêm:

   | Tên | Bắt buộc? |
   |-----|----------|
   | `VITE_SUPABASE_URL` | ✅ |
   | `VITE_SUPABASE_ANON_KEY` | ✅ |
   | `SUPABASE_SERVICE_ROLE_KEY` | ✅ |
   | `VITE_HCAPTCHA_SITE_KEY` | Recommended |
   | `ADMIN_PASSWORD_WEBHOOK` | Optional (cho cron tự push) |
   | `UPSTASH_REDIS_REST_URL` | Optional |
   | `UPSTASH_REDIS_REST_TOKEN` | Optional |
   | `SITE_URL` | Optional |

4. **Settings → Functions → Function Region** → đổi sang **Hong Kong (`hkg1`)** hoặc **Singapore (`sin1`)** → Save.
5. **Deployments** tab → bấm "..." → "Redeploy" để áp dụng env mới.

> ⚠️ **Tại sao deploy vẫn chạy ở USA mặc dù `vercel.json` ghi `hkg1`?**
>
> Vercel **Hobby plan** cho phép chỉ 1 region cho serverless function. File `vercel.json` đã set `["hkg1"]` (Hong Kong) — nhưng dashboard region setting **override** file config. Bạn phải vào **Project Settings → Functions → Function Region** và đổi thủ công.
>
> - **Singapore (`sin1`)** — gần Việt Nam nhất, ~30ms latency
> - **Hong Kong (`hkg1`)** — cũng tốt, ~40ms latency
> - **Tokyo (`hnd1`)** — fallback, ~80ms
>
> Edge functions (middleware) chạy global, không bị giới hạn region.

---

## 6. Lấy admin password lần đầu

3 cách (chọn 1):

| Cách | Chi tiết |
|------|----------|
| 🟢 **UI (dễ nhất)** | Login bằng email owner → vào `/admin` → bấm nút "Sinh mật khẩu hôm nay" trong khung amber → password hiện trong khung xanh, copy ngay (chỉ hiện 1 lần). |
| 🟢 **Vercel cron** | Sau khi deploy xong, Vercel cron sẽ chạy lần đầu vào 00:00 UTC ngày kế tiếp → password tự về Discord webhook (nếu có cấu hình). |
| 🟢 **SQL** | Supabase SQL Editor → `select public.rotate_admin_password();` → copy plaintext trả về. |
| 🟢 **Trigger cron ngay** | Curl: `curl https://YOUR-SITE.vercel.app/api/admin/rotate-password -X POST -H "x-cron-secret: $(curl https://YOUR-SITE.vercel.app/api/admin/cron-secret -H 'Authorization: Bearer YOUR_TOKEN')"` (chỉ owner gọi được endpoint cron-secret). |

---

## 7. Test deploy

- ✅ `https://YOUR-SITE.vercel.app/api/health` — `{"success":true,"message":"ok"}`
- ✅ `https://YOUR-SITE.vercel.app/api/anime/?limit=3` — trả 3 anime
- ✅ `https://YOUR-SITE.vercel.app/manifest.webmanifest` — JSON manifest
- ✅ Network tab: response từ `/api/*` có header `x-vercel-execution-region: hkg1`
- ✅ Vào `/admin` → nhập password → unlock thành công

---

## 8. (Optional) Cron alternative — pg_cron

Nếu bạn muốn chạy ngoài Vercel (vd: cùng job với Supabase pg_cron):

```sql
-- Trong Supabase: Settings → Database → Extensions → enable pg_cron + pg_net
-- Sau đó:
select cron.schedule(
  'rotate-admin-password',
  '0 0 * * *',
  $$ select public.rotate_admin_password(); $$
);
```

Cách trực tiếp này KHÔNG gửi Discord webhook. Để có webhook, dùng `net.http_post` gọi Vercel endpoint thay vì gọi RPC trực tiếp:

```sql
-- Lấy CRON_SECRET một lần (chỉ owner login mới fetch được):
-- GET https://YOUR-SITE.vercel.app/api/admin/cron-secret
-- Authorization: Bearer <session-token>

select cron.schedule('rotate-via-vercel', '0 0 * * *', $$
  select net.http_post(
    url := 'https://YOUR-SITE.vercel.app/api/admin/rotate-password',
    headers := jsonb_build_object('x-cron-secret', 'PASTE_THE_SECRET_HERE')
  );
$$);
```

---

## 🆘 Troubleshooting

### "rotate-password 401 Unauthorized" khi gọi từ Vercel cron
→ Cron của Vercel tự gửi header `x-vercel-cron-signature`. Nếu đang lỗi 401, check:
- `vercel.json` có entry `crons` không? (hiện tại có rồi)
- `SUPABASE_SERVICE_ROLE_KEY` đã set chưa?

### "Webhook gửi nhưng password không vào DB"
→ `SUPABASE_SERVICE_ROLE_KEY` chưa set hoặc sai. Service role key bypass RLS — bắt buộc.

### "Region vẫn là `iad1` mặc dù `vercel.json` ghi `hkg1`"
→ Hobby plan cho 1 region duy nhất, dashboard override file config. **Settings → Functions → Function Region** → đổi → Save → Redeploy.

### "Activity feed trống"
→ Trigger DB chưa cài. Chạy lại `setup_all.sql` (idempotent).

### "Quests không cập nhật"
→ Triggers `quests_library_trg`, `quests_comments_trg` chưa tạo. Check Supabase Dashboard → Database → Triggers.

### "Tôi muốn xem CRON_SECRET đang là gì"
→ Login bằng owner → `GET /api/admin/cron-secret` với `Authorization: Bearer <session-token>`. Hoặc trong Supabase SQL: `set role service_role; select value from public.system_secrets where key = 'cron_secret'; reset role;`

---

## 📋 Checklist nhanh

- [ ] Supabase project (Singapore)
- [ ] `setup_all.sql` đã chạy
- [ ] `bootstrap_owner('email')` đã chạy với email của bạn
- [ ] Vercel project import xong
- [ ] 3 env required (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) đã paste
- [ ] Function region đã đổi sang Singapore/Hong Kong
- [ ] hCaptcha (recommended) cấu hình xong
- [ ] Discord webhook (optional) paste vào `ADMIN_PASSWORD_WEBHOOK`
- [ ] Test login → vào `/admin` → bấm "Sinh mật khẩu hôm nay" → unlock OK
