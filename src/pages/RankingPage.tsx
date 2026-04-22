import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Medal, RefreshCw, Star, TrendingDown, TrendingUp, Trophy, Tv } from 'lucide-react'
import Layout from '@/components/Layout'
import Breadcrumbs from '@/components/Breadcrumbs'
import ReloadLink from '@/components/ReloadLink'
import { fetchAnimeList } from '@/lib/api'
import { useLangContext } from '@/providers/LangProvider'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RankedAnime {
  id: number
  title: string
  cover_image: string
  score: number | null
  rank: number | null
  popularity: number | null
  episodes: number | null
  type: string
  status: string
  genres: string[]
  studio_name?: string
  members?: number
}

// ─── Medal Component ──────────────────────────────────────────────────────────

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center">
        <div className="absolute inset-0 animate-pulse rounded-full bg-yellow-400/20" />
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 shadow-[0_0_20px_rgba(234,179,8,0.6)]">
          <Trophy className="h-5 w-5 text-yellow-900" />
        </div>
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-500 shadow-[0_0_12px_rgba(156,163,175,0.5)]">
          <Medal className="h-5 w-5 text-gray-800" />
        </div>
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 shadow-[0_0_12px_rgba(180,83,9,0.5)]">
          <Medal className="h-5 w-5 text-amber-200" />
        </div>
      </div>
    )
  }
  return (
    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center">
      <span className="text-lg font-bold text-gray-500">#{rank}</span>
    </div>
  )
}

// ─── Trend Badge ─────────────────────────────────────────────────────────────
// Simulates trend arrows based on rank position (top ranks = rising, lower = stable/falling)
function TrendBadge({ rank }: { rank: number }) {
  if (rank <= 5) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-400">
        <TrendingUp className="h-3 w-3" />
        HOT
      </span>
    )
  }
  if (rank <= 15) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] text-emerald-500/70">
        <TrendingUp className="h-3 w-3" />
      </span>
    )
  }
  if (rank > 50) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] text-gray-600">
        <TrendingDown className="h-3 w-3" />
      </span>
    )
  }
  return null
}

// ─── Rank Row ─────────────────────────────────────────────────────────────────

interface RankRowProps {
  anime: RankedAnime
  rank: number
  lang: string
}

function RankRow({ anime, rank, lang }: RankRowProps) {
  const isTop3 = rank <= 3
  const rowBg =
    rank === 1
      ? 'border-yellow-500/40 bg-gradient-to-r from-yellow-500/10 to-transparent hover:from-yellow-500/15'
      : rank === 2
        ? 'border-gray-400/30 bg-gradient-to-r from-gray-400/8 to-transparent hover:from-gray-400/12'
        : rank === 3
          ? 'border-amber-700/30 bg-gradient-to-r from-amber-700/8 to-transparent hover:from-amber-700/12'
          : 'border-gray-800 bg-card hover:border-gray-600 hover:bg-gray-800/60'

  return (
    <ReloadLink
      to={`/anime/${anime.id}`}
      className={`group flex items-center gap-4 rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${rowBg}`}
    >
      {/* Rank medal / number */}
      <RankMedal rank={rank} />

      {/* Cover */}
      <div className={`relative flex-shrink-0 overflow-hidden rounded-xl ${isTop3 ? 'h-20 w-14' : 'h-16 w-11'}`}>
        <img
          src={anime.cover_image}
          alt={anime.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
        />
        {isTop3 && (
          <div className="absolute inset-0 rounded-xl ring-2 ring-inset ring-white/10" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <h3 className={`line-clamp-1 font-bold text-white transition-colors group-hover:text-primary ${isTop3 ? 'text-base' : 'text-sm'}`}>
          {anime.title}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
          {anime.type && <span>{anime.type}</span>}
          {anime.episodes && (
            <span className="flex items-center gap-1">
              <Tv className="h-3 w-3" />
              {anime.episodes} {lang === 'vi' ? 'tập' : 'eps'}
            </span>
          )}
          {anime.studio_name && <span className="hidden sm:inline">{anime.studio_name}</span>}
          {anime.status && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              anime.status === 'Ongoing'
                ? 'bg-green-500/20 text-green-300'
                : anime.status === 'Upcoming'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-gray-700/50 text-gray-400'
            }`}>
              {anime.status === 'Ongoing'
                ? lang === 'vi' ? 'Đang chiếu' : 'Ongoing'
                : anime.status === 'Upcoming'
                  ? lang === 'vi' ? 'Sắp chiếu' : 'Upcoming'
                  : lang === 'vi' ? 'Hoàn thành' : 'Finished'}
            </span>
          )}
        </div>
        {anime.genres?.length > 0 && (
          <div className="mt-1.5 hidden flex-wrap gap-1 sm:flex">
            {anime.genres.slice(0, 3).map((g) => (
              <span key={g} className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-400">
                {g}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Score + Trend */}
      <div className="flex flex-shrink-0 flex-col items-end gap-1 text-right">
        {anime.score !== null ? (
          <div className={`flex items-center gap-1 font-bold ${
            rank === 1 ? 'text-yellow-400 text-xl' : rank <= 3 ? 'text-yellow-400 text-lg' : 'text-yellow-400 text-base'
          }`}>
            <Star className={`fill-current ${rank === 1 ? 'h-5 w-5' : 'h-4 w-4'}`} />
            {anime.score.toFixed(2)}
          </div>
        ) : (
          <span className="text-sm text-gray-600">N/A</span>
        )}
        {/* Trend arrow — simulated based on rank position */}
        <TrendBadge rank={rank} />
        {anime.members && (
          <div className="text-xs text-gray-500">
            {(anime.members / 1000).toFixed(0)}K {lang === 'vi' ? 'thành viên' : 'members'}
          </div>
        )}
      </div>
    </ReloadLink>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type SortMode = 'score' | 'popularity' | 'members'
type FilterType = 'all' | 'tv' | 'movie' | 'ova'

export default function RankingPage() {
  const { lang } = useLangContext()
  const [animeList, setAnimeList] = useState<RankedAnime[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('score')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const PAGE_SIZE = 25

  const loadRanking = async (reset = false) => {
    setLoading(true)
    setError(null)
    const currentPage = reset ? 1 : page
    try {
      const res = await fetchAnimeList({
        sort: sortMode === 'score' ? 'score' : sortMode === 'popularity' ? 'popularity' : 'members',
        limit: PAGE_SIZE,
        page: currentPage,
        ...(filterType !== 'all' ? { type: filterType.toUpperCase() } : {}),
      })
      if (res.success) {
        const newItems = res.data ?? []
        setAnimeList((prev) => (reset ? newItems : [...prev, ...newItems]))
        setHasMore(newItems.length === PAGE_SIZE)
        if (!reset) setPage((p) => p + 1)
      } else {
        setError(lang === 'vi' ? 'Không thể tải dữ liệu.' : 'Failed to load data.')
      }
    } catch {
      setError(lang === 'vi' ? 'Không thể tải dữ liệu.' : 'Failed to load data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    setAnimeList([])
    void loadRanking(true)
    window.scrollTo(0, 0)
  }, [sortMode, filterType])

  const rankedList = useMemo(() => animeList, [animeList])

  const sortOptions: Array<{ key: SortMode; labelEn: string; labelVi: string }> = [
    { key: 'score', labelEn: 'By Score', labelVi: 'Theo điểm số' },
    { key: 'popularity', labelEn: 'By Popularity', labelVi: 'Theo độ phổ biến' },
    { key: 'members', labelEn: 'By Members', labelVi: 'Theo thành viên' },
  ]

  const typeFilters: Array<{ key: FilterType; labelEn: string; labelVi: string }> = [
    { key: 'all', labelEn: 'All Types', labelVi: 'Tất cả' },
    { key: 'tv', labelEn: 'TV Series', labelVi: 'TV Series' },
    { key: 'movie', labelEn: 'Movies', labelVi: 'Phim lẻ' },
    { key: 'ova', labelEn: 'OVA', labelVi: 'OVA' },
  ]

  return (
    <Layout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Breadcrumbs
          crumbs={[{ name: lang === 'vi' ? 'Bảng xếp hạng' : 'Ranking' }]}
        />

        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/20">
              <Trophy className="h-5 w-5 text-yellow-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">
              {lang === 'vi' ? 'Bảng Xếp Hạng Anime' : 'Anime Ranking'}
            </h1>
          </div>
          <p className="text-gray-400">
            {lang === 'vi'
              ? 'Top anime được đánh giá cao nhất. Top 1, 2, 3 nhận huy chương đặc biệt.'
              : 'Top rated anime of all time. Top 1, 2, 3 receive special medals.'}
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Sort tabs */}
          <div className="flex gap-1 rounded-xl border border-gray-800 bg-card p-1">
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortMode(opt.key)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                  sortMode === opt.key
                    ? 'bg-primary text-white shadow-md'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {lang === 'vi' ? opt.labelVi : opt.labelEn}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div className="flex gap-1 rounded-xl border border-gray-800 bg-card p-1">
            {typeFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterType(f.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  filterType === f.key
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-500 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {lang === 'vi' ? f.labelVi : f.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Medal legend */}
        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-gray-800 bg-card/50 px-4 py-3 text-xs text-gray-400">
          <span>{lang === 'vi' ? 'Huy chương:' : 'Medals:'}</span>
          <span className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600">
              <Trophy className="h-3 w-3 text-yellow-900" />
            </span>
            {lang === 'vi' ? 'Vàng - Hạng 1' : 'Gold - Rank 1'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-500">
              <Medal className="h-3 w-3 text-gray-800" />
            </span>
            {lang === 'vi' ? 'Bạc - Hạng 2' : 'Silver - Rank 2'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800">
              <Medal className="h-3 w-3 text-amber-200" />
            </span>
            {lang === 'vi' ? 'Đồng - Hạng 3' : 'Bronze - Rank 3'}
          </span>
        </div>

        {/* Error */}
        {error && !loading && (
          <div className="mb-4 flex flex-col items-center gap-3 py-10">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-gray-400">{error}</p>
            <button
              onClick={() => void loadRanking(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
            >
              <RefreshCw className="h-4 w-4" />
              {lang === 'vi' ? 'Thử lại' : 'Retry'}
            </button>
          </div>
        )}

        {/* Ranking list */}
        <div className="space-y-2">
          {rankedList.map((anime, idx) => (
            <RankRow
              key={anime.id}
              anime={anime}
              rank={idx + 1}
              lang={lang}
            />
          ))}

          {/* Skeleton rows */}
          {loading && (
            <>
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="flex animate-pulse items-center gap-4 rounded-2xl border border-gray-800 bg-card p-4"
                >
                  <div className="h-12 w-12 flex-shrink-0 rounded-full bg-gray-800" />
                  <div className="h-16 w-11 flex-shrink-0 rounded-xl bg-gray-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-gray-800" />
                    <div className="h-3 w-1/2 rounded bg-gray-800" />
                  </div>
                  <div className="h-6 w-16 rounded bg-gray-800" />
                </div>
              ))}
            </>
          )}
        </div>

        {/* Load more */}
        {!loading && hasMore && rankedList.length > 0 && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => void loadRanking(false)}
              className="rounded-full border border-gray-700 px-6 py-2.5 text-sm font-medium text-gray-300 transition-all hover:border-primary hover:text-primary"
            >
              {lang === 'vi' ? 'Tải thêm' : 'Load More'}
            </button>
          </div>
        )}

        {!loading && rankedList.length === 0 && !error && (
          <div className="py-20 text-center text-gray-500">
            {lang === 'vi' ? 'Không có dữ liệu.' : 'No data available.'}
          </div>
        )}
      </div>
    </Layout>
  )
}
