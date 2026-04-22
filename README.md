# Anime Wiki

A modern anime wiki built with **React + TypeScript + Vite** on the frontend and a thin **Express** API on the backend, deployed on **Vercel** at <https://animewiki.vercel.app>.

> Licensed under the [MIT License](./LICENSE).

## Stack

- ⚡ Vite + React 18 + TypeScript
- 🎨 TailwindCSS
- 🔐 Supabase (auth, profiles, library, comments)
- 🐎 Hybrid data layer:
  - **Primary**: [AniList GraphQL](https://anilist.gitbook.io/anilist-apiv2-docs/) — single round-trip, no aggressive rate limit
  - **Fallback**: [Jikan REST](https://jikan.moe/) (MyAnimeList) when AniList is missing data or fails

## Why hybrid?

Jikan was the original source but has tight rate limits (~3 req/s) and no batch — fetching one anime detail page costs 4 separate REST calls. AniList exposes everything we need in **one GraphQL query** and tolerates higher throughput. We keep MAL IDs as the public route IDs (AniList exposes `idMal` on every entry) so URLs stay stable; if a MAL ID is missing on AniList we transparently fall back to Jikan.

Toggle the behavior with an env flag:

```bash
USE_ANILIST=false   # disable AniList, force Jikan only
```

## Folder structure

See [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md).

## Local development

```bash
npm install
npm run dev          # runs vite + nodemon concurrently
```

## License

[MIT](./LICENSE) © 2026 nhatnam232
