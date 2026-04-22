# Anime Wiki - Folder Structure (6 Core Features)

## Bước 2: Đề xuất cấu trúc thư mục

```
anm-main/
├── supabase/
│   ├── schema.sql              ← (existing) Base schema
│   └── schema_v2.sql           ← (NEW) Extension for 6 features
│
├── api/
│   ├── app.ts                  ← (existing) Express app
│   ├── lib/
│   │   ├── jikan.ts            ← (existing) Jikan API wrapper
│   │   └── translate.ts        ← (existing) LibreTranslate wrapper
│   └── routes/
│       ├── anime.ts            ← (existing)
│       ├── auth.ts             ← (existing)
│       ├── character.ts        ← (existing)
│       ├── search.ts           ← (existing)
│       ├── studio.ts           ← (existing)
│       ├── translate.ts        ← (existing)
│       ├── season.ts           ← (NEW) Feature 1: Seasonal Chart API
│       ├── schedule.ts         ← (NEW) Feature 4: Calendar API
│       ├── library.ts          ← (NEW) Feature 3: Personal Library API
│       ├── reactions.ts        ← (NEW) Feature 5: Reactions & Reviews API
│       └── mal.ts              ← (NEW) Feature 6: MAL Import API
│
└── src/
    ├── App.tsx                 ← (UPDATED) Add new routes
    ├── lib/
    │   ├── api.ts              ← (UPDATED) Add new API calls
    │   ├── i18n.ts             ← (UPDATED) Add new translation keys
    │   ├── supabase.ts         ← (existing)
    │   └── utils.ts            ← (existing)
    │
    ├── store/
    │   ├── useFavoritesStore.ts    ← (existing)
    │   └── useLibraryStore.ts      ← (NEW) Feature 3: Zustand store for library
    │
    ├── hooks/
    │   ├── useAnimeLike.ts         ← (existing)
    │   ├── useAutoTranslation.ts   ← (existing)
    │   ├── useLang.ts              ← (existing)
    │   ├── useManualTranslation.ts ← (existing)
    │   ├── useTheme.ts             ← (existing)
    │   ├── useLibrary.ts           ← (NEW) Feature 3: Library CRUD hook
    │   ├── useReactions.ts         ← (NEW) Feature 5: Reactions hook
    │   └── useReviews.ts           ← (NEW) Feature 5: Reviews hook
    │
    ├── providers/
    │   ├── AuthProvider.tsx        ← (existing)
    │   └── LangProvider.tsx        ← (existing)
    │
    ├── components/
    │   ├── AnimeCard.tsx           ← (existing)
    │   ├── AnimeGridSkeleton.tsx   ← (existing)
    │   ├── AuthModal.tsx           ← (existing)
    │   ├── BackToTop.tsx           ← (existing)
    │   ├── Breadcrumbs.tsx         ← (existing)
    │   ├── CommentSection.tsx      ← (existing)
    │   ├── Empty.tsx               ← (existing)
    │   ├── Footer.tsx              ← (existing)
    │   ├── HCaptchaWidget.tsx      ← (existing)
    │   ├── HeroArtwork.tsx         ← (existing)
    │   ├── Layout.tsx              ← (existing)
    │   ├── Logo.tsx                ← (existing)
    │   ├── Navbar.tsx              ← (existing)
    │   ├── ReloadLink.tsx          ← (existing)
    │   │
    │   ├── season/                 ← (NEW) Feature 1: Seasonal Chart
    │   │   ├── SeasonSelector.tsx      ← Dropdown chọn season/year
    │   │   └── SeasonAnimeCard.tsx     ← Card hiển thị anime theo mùa
    │   │
    │   ├── recommendations/        ← (NEW) Feature 2: Smart Recommendations
    │   │   └── Recommendations.tsx     ← "Fans also liked" section
    │   │
    │   ├── library/                ← (NEW) Feature 3: Personal Library
    │   │   ├── LibraryStatusBadge.tsx  ← Badge hiển thị trạng thái
    │   │   ├── LibraryEntryModal.tsx   ← Modal thêm/sửa entry
    │   │   └── LibraryProgressBar.tsx  ← Progress bar tập phim
    │   │
    │   ├── schedule/               ← (NEW) Feature 4: Anime Calendar
    │   │   ├── ScheduleDayColumn.tsx   ← Cột ngày trong tuần
    │   │   └── ScheduleAnimeItem.tsx   ← Item anime trong lịch
    │   │
    │   ├── reactions/              ← (NEW) Feature 5: Quick Review & Reaction
    │   │   ├── ReactionBar.tsx         ← Thanh reaction (❤️😂😢)
    │   │   └── QuickReview.tsx         ← Form review ngắn 200 ký tự
    │   │
    │   └── mal/                    ← (NEW) Feature 6: MAL Import
    │       └── MALImportForm.tsx       ← Form nhập username MAL
    │
    └── pages/
        ├── Home.tsx                ← (existing)
        ├── AnimeDetail.tsx         ← (UPDATED) Add Recommendations + Reactions
        ├── CharacterDetail.tsx     ← (existing)
        ├── Studio.tsx              ← (existing)
        ├── SearchResults.tsx       ← (existing)
        ├── NotFound.tsx            ← (existing)
        ├── AuthCallback.tsx        ← (existing)
        ├── Profile.tsx             ← (UPDATED) Add Library stats tab
        ├── SeasonChart.tsx         ← (NEW) Feature 1: Route /season
        ├── AnimeCalendar.tsx       ← (NEW) Feature 4: Route /schedule
        ├── PersonalLibrary.tsx     ← (NEW) Feature 3: Route /library
        └── MALImport.tsx           ← (NEW) Feature 6: Route /mal-import
```

## Giải thích kiến trúc

### Data Flow
```
Jikan API (MAL) → api/lib/jikan.ts → api/routes/*.ts → src/lib/api.ts → Pages/Components
Supabase DB     → src/lib/supabase.ts → hooks/*.ts → Pages/Components
```

### State Management
- **Zustand** (`src/store/`): Client-side state (favorites, library cache)
- **Supabase** (`src/lib/supabase.ts`): Server-side state (library, reactions, reviews)
- **React State**: Local UI state (loading, modals, filters)

### Routing (App.tsx updates)
```tsx
<Route path="/season"      element={<SeasonChart />} />
<Route path="/schedule"    element={<AnimeCalendar />} />
<Route path="/library"     element={<PersonalLibrary />} />
<Route path="/mal-import"  element={<MALImport />} />
```

### API Endpoints (new)
```
GET  /api/season?season=spring&year=2026    → Seasonal anime list
GET  /api/schedule                          → Weekly broadcast schedule
GET  /api/library (auth)                    → User's library
POST /api/library (auth)                    → Add/update library entry
DEL  /api/library/:id (auth)               → Remove from library
GET  /api/reactions/:animeId               → Get reactions for anime
POST /api/reactions (auth)                 → Add/update reaction
POST /api/reviews (auth)                   → Add/update review
POST /api/mal/import (auth)               → Import from MAL
```

### Component Placement trong AnimeDetail.tsx
```
AnimeDetail
├── HeroArtwork
├── Synopsis / Background
├── Trailer
├── Community Stats
├── Characters
├── Relations
├── Recommendations (NEW - "Fans also liked")
├── ReactionBar + QuickReview (NEW - Feature 5)
└── CommentSection (existing)
```
