# Anime Wiki

A modern anime wiki built with **React + TypeScript + Vite** on the frontend and a thin **Express** API on the backend, deployed on **Vercel** at <https://animewiki.vercel.app>.

> Licensed under the [MIT License](./LICENSE).

## Stack

- ⚡ Vite + React 18 + TypeScript
- 🎨 TailwindCSS (CSS-variable theming for light/dark)
- 🧠 React Query (server-state cache + optimistic mutations)
- 🪪 react-helmet-async (per-route SEO meta + JSON-LD)
- 🔐 Supabase (auth, profiles, library, comments, collections, notifications, audit log, storage)
- 🐎 Hybrid data layer:
  - **Primary**: [AniList GraphQL](https://anilist.gitbook.io/anilist-apiv2-docs/) — single round-trip, no aggressive rate limit
  - **Fallback**: [Jikan REST](https://jikan.moe/) (MyAnimeList) when AniList is missing data or fails
- 🧊 Two-tier API cache: in-memory L1 + optional **Upstash Redis** L2 (survives Vercel cold starts)

## Why hybrid data?

Jikan was the original source but has tight rate limits (~3 req/s) and no batch — fetching one anime detail page costs 4 separate REST calls. AniList exposes everything we need in **one GraphQL query** and tolerates higher throughput. We keep MAL IDs as the public route IDs (AniList exposes `idMal` on every entry) so URLs stay stable.

```bash
USE_ANILIST=false   # disable AniList, force Jikan only
```

## Features

### 👤 Profile
- 🖼️ **Cover banner** + avatar with badge-tinted ring (color reflects highest badge: owner/admin/mod/reviewer/top-fan/active/member/newcomer)
- 🎵 Spotify embed → opens **global mini-player** (rotating disc) so music keeps playing across pages
- 📊 **Activity tabs**: Favorites · Watching · Completed · Plan to Watch · On Hold · Dropped
- 📝 Bio, gender, birthday, username, display name

### 💬 Comments
- 🌳 Nested threads with Reddit-style up/down votes
- 🖋️ **Markdown** (`**bold**`, `*italic*`, `~~strike~~`) + **`||spoiler||`** click-to-reveal — perfect for anime discussions without spoiling plot twists
- ⌨️ Ctrl/Cmd + B / I shortcuts
- 🛡️ Mod/Admin/Owner can delete any comment via Supabase RLS (`is_mod_or_above()`) — bypassing the UI is also blocked
- 🌸 Friendly inline anime cat-girl illustration when no comments yet
- ⚡ **Optimistic vote/delete** — clicks reflect instantly via React Query

### 📚 Library
- 5 watch statuses, progress bar, score 1-10, notes
- **Optimistic upsert** (`useLibraryMutation`) — toggling state feels instantaneous
- React Query cache invalidates on relevant mutations only (no full refetch)

### 📦 Collections
- Create public anime lists (e.g. "Top 10 Isekai with overpowered MC") at `/collections`
- Like / unlike with optimistic counter updates
- Each list has its own slug page; mod can delete spam via RLS

### 🔁 Compare
- Side-by-side comparison of up to 3 anime at `/compare?ids=1,2,3`
- Auto-highlights the "winner" of each numeric metric
- URL is shareable

### ✏️ Edit Suggestions
- "Suggest an edit" button on every anime page (trailer URL / synopsis / studio)
- **Trusted users** (Active+ / Top Fan / Mod+) auto-approved via DB trigger → straight into audit log
- **New users** sit in `pending` queue → reviewed at `/admin`
- All approve/reject actions logged in `audit_logs` with diff JSONB

### 🛡️ Admin Dashboard (`/admin`)
- Mod/Admin/Owner only (RLS enforced server-side)
- Pending edit queue with one-click Approve / Reject + reviewer note
- Permission helpers (`isModerator`, `canDeleteComment`, `getStaffRole`) in `src/lib/badges.tsx`

### 🔍 SEO
- `<SEO />` component injects per-route `<title>` + Open Graph / Twitter Card / Canonical / JSON-LD
- `npm run build:prerender` generates static `dist/<route>/index.html` files for crawlers (Googlebot, Facebook, Discord)
- Bot detection (`isBotUserAgent`) skips ToS modal so unfurlers see real previews
- `vercel.json` adds long-lived cache headers for static assets

### 🌗 Theme
- Light / Dark / System modes (persisted, cross-tab synced)
- CSS variables (`--color-bg`, `--color-card` …) — no `dark:` class duplication
- Inline boot script in `index.html` prevents wrong-theme flash

### 🔔 Notifications
- Bell icon with unread badge in navbar
- Realtime subscribe + 60s polling fallback
- Schema designed for cron jobs to insert "new episode" rows for anime in user's library

### 🎉 Reactions
- `<ReactionConfetti />` emoji burst on like / badge unlock
- Honors `prefers-reduced-motion`

### 🌐 i18n
- Full Vietnamese + English, geo-detected via ipapi.co (`vi` for Vietnam, `en` everywhere else)
- `localizeSeason("Fall 2022", "vi")` → `"Thu 2022"` ✅
- 50+ translation keys

### 📱 Mobile + Performance
- `prefers-reduced-motion` honored across all animations
- Sub-640px breakpoint reduces backdrop-blur intensity for low-end devices
- Lazy-loaded images, manual route-level chunks, sourcemap=false in prod
- Two-tier cache: in-memory L1 + Upstash Redis L2

### 🔐 Security & Auth
- **hCaptcha is mandatory** for ALL sign-in / sign-up flows including Google OAuth
- Database is the single source of truth for permissions — frontend can't elevate
- Server functions (`approve_edit`, `reject_edit`, `is_mod_or_above`, `bootstrap_owner`) double-check role inside Postgres
- All mutations logged in `audit_logs`

## Folder structure

See [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md).

## Local development

```bash
npm install
npm run dev          # vite + nodemon concurrently
```

## Production build

```bash
npm run build               # standard SPA build → dist/
npm run build:prerender     # SPA build + per-route prerender for SEO
```

## Database setup

Run the one-shot Supabase script (idempotent — safe to re-run):

```bash
# In Supabase Dashboard → SQL Editor → paste & Run
supabase/setup_all.sql
```

Then bootstrap yourself as the project owner:

```sql
select public.bootstrap_owner('your-email@example.com');
```

You can grant additional roles to other users:

```sql
select public.grant_badge('<their-uuid>', 'mod');     -- add Mod badge
select public.grant_badge('<their-uuid>', 'admin');   -- add Admin badge
select public.revoke_badge('<their-uuid>', 'mod');    -- remove
```

## Optional env vars

```bash
# Edge cache (otherwise just in-memory L1)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Translation providers (DeepL preferred, others as fallback)
DEEPL_API_KEY=...
LIBRETRANSLATE_URL=...
LIBRETRANSLATE_API_KEY=...

# Captcha (highly recommended in production)
VITE_HCAPTCHA_SITE_KEY=...

# Anti-bot SEO override
SITE_URL=https://animewiki.vercel.app
```

## License

[MIT](./LICENSE) © 2026 nhatnam232
