import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ChevronLeft, ChevronRight, RefreshCw, Sparkles, Star, Tv } from 'lucide-react'
import Layout from '@/components/Layout'
import Breadcrumbs from '@/components/Breadcrumbs'
import ReloadLink from '@/components/ReloadLink'
import { fetchSeasonAnime } from '@/lib/api'
import { useLangContext } from '@/providers/LangProvider'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeasonAnime {
  id: number
  title: string
  cover_image: string
  score: number | null
  episodes: number | null
  type: string
  status: string
  genres: string[]
  studio_name?: string
  season?: string
  year?: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEASONS = ['Winter', 'Spring', 'Summer', 'Fall'] as const
type Season = typeof SEASONS[number]

const SEASON_VI: Record<Season, string> = {
  Winter: 'Đông',
  Spring: 'Xuân',
  Summer: 'Hè',
  Fall: 'Thu',
}

const SEASON_EMOJI: Record<Season, string> = {
  Winter: '❄️',
  Spring: '🌸',
  Summer: '☀️',
  Fall: '🍂',
}

const SEASON_GRADIENT: Record<Season, string> = {
  Winter: 'from-blue-500/20 to-cyan-500/10',
  Spring: 'from-pink-500/20 to-rose-500/10',
  Summer: 'from-yellow-500/20 to-orange-500/10',
  Fall: 'from-amber-500/20 to-red-500/10',
}

const SEASON_BORDER: Record<Season, string> = {
  Winter: 'border-blue-500/40',
  Spring: 'border-pink-500/40',
  Summer: 'border-yellow-500/40',
  Fall: 'border-amber-500/40',
}

const SEASON_TEXT: Record<Season, string> = {
  Winter: 'text-blue-300',
  Spring: 'text-pink-300',
  Summer: 'text-yellow-300',
  Fall: 'text-amber-300',
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1
  if (month >= 1 && month <= 3) return 'Winter'
  if (month >= 4 && month <= 6) return 'Spring'
  if (month >= 7 && month <= 9) return 'Summer'
  return 'Fall'
}

function getCurrentYear(): number {
  return new Date().getFullYear()
}

// ─── Season Anime Card ────────────────────────────────────────────────────────

interface SeasonAnimeCardProps {
  anime: SeasonAnime
  lang: string
  isCurrentSeason: boolean
}

function SeasonAnimeCard({ anime, lang, isCurrentSeason }: SeasonAnimeCardProps) {
  return (
    <ReloadLink
      to={`/anime/${anime.id}`}
      className="group relative overflow-hidden rounded-2xl border border-gray-800 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_8px_30px_rgba(124,58,237,0.2)]"
    >
      {/* NEW badge for current season */}
      {isCurrentSeason && (
        <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
          <Sparkles className="h-2.5 w-2.5" />
          {lang === 'vi' ? 'MỚI' : 'NEW'}
        </div>
      )}

      {/* Cover */}
      <div className="aspect-[3/4] overflow-hidden">
        <img
          src={anime.cover_image}
          alt={anime.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-white transition-colors group-hover:text-primary">
          {anime.title}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          {anime.score !== null && (
            <span className="flex items-center gap-1 text-xs font-medium text-yellow-400">
              <Star className="h-3 w-3 fill-current" />
              {anime.score.toFixed(1)}
            </span>
          )}
          {anime.episodes && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Tv className="h-3 w-3" />
              {anime.episodes} {lang === 'vi' ? 'tập' : 'eps'}
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
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
          {anime.type && (
            <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-400">
              {anime.type}
            </span>
          )}
        </div>

        {anime.studio_name && (
          <p className="mt-1.5 truncate text-[10px] text-gray-500">{anime.studio_name}</p>
        )}
      </div>
    </ReloadLink>
  )
}

// ─── Season Selector ──────────────────────────────────────────────────────────

interface SeasonSelectorProps {
  season: Season
  year: number
  onPrev: () => void
  onNext: () => void
  lang: string
  isCurrentSeason: boolean
}

function SeasonSelector({ season, year, onPrev, onNext, lang, isCurrentSeason }: SeasonSelectorProps) {
  return (
    <div className={`flex items-center justify-between rounded-2xl border bg-gradient-to-r p-4 ${SEASON_GRADIENT[season]} ${SEASON_BORDER[season]}`}>
      <button
        onClick={onPrev}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-700 bg-card/80 text-gray-300 transition-all hover:border-primary hover:text-primary"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl">{SEASON_EMOJI[season]}</span>
          <h2 className={`text-2xl font-bold ${SEASON_TEXT[season]}`}>
            {lang === 'vi' ? SEASON_VI[season] : season} {year}
          </h2>
          {isCurrentSeason && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">
              {lang === 'vi' ? 'Hiện tại' : 'Current'}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-gray-400">
          {lang === 'vi' ? 'Anime mùa này' : 'This season\'s anime'}
        </p>
      </div>

      <button
        onClick={onNext}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-700 bg-card/80 text-gray-300 transition-all hover:border-primary hover:text-primary"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | 'ongoing' | 'upcoming' | 'finished'
type SortBy = 'score' | 'newest' | 'popularity'

export default function SeasonChart() {
  const { lang } = useLangContext()
  const [season, setSeason] = useState<Season>(getCurrentSeason())
  const [year, setYear] = useState(getCurrentYear())
  const [animeList, setAnimeList] = useState<SeasonAnime[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [sortBy, setSortBy] = useState<SortBy>('score')

  const currentSeason = getCurrentSeason()
  const currentYear = getCurrentYear()
  const isCurrentSeason = season === currentSeason && year === currentYear

  const navigateSeason = (direction: 'prev' | 'next') => {
    const idx = SEASONS.indexOf(season)
    if (direction === 'prev') {
      if (idx === 0) {
        setSeason('Fall')
        setYear((y) => y - 1)
      } else {
        setSeason(SEASONS[idx - 1])
      }
    } else {
      if (idx === 3) {
        setSeason('Winter')
        setYear((y) => y + 1)
      } else {
        setSeason(SEASONS[idx + 1])
      }
    }
  }

  const loadSeason = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch anime filtered by season/year via the dedicated Jikan /seasons endpoint
      const res = await fetchSeasonAnime({
        season: season.toLowerCase(),
        year,
        sort: sortBy === 'score' ? 'score' : sortBy === 'newest' ? 'newest' : 'popularity',
        limit: 25,
      })
      if (res.success) {
        setAnimeList(res.data ?? [])
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
    void loadSeason()
    window.scrollTo(0, 0)
  }, [season, year, sortBy])

  const filteredList = useMemo(() => {
    if (filterStatus === 'all') return animeList
    return animeList.filter((a) => {
      if (filterStatus === 'ongoing') return a.status === 'Ongoing'
      if (filterStatus === 'upcoming') return a.status === 'Upcoming'
      if (filterStatus === 'finished') return a.status === 'Finished'
      return true
    })
  }, [animeList, filterStatus])

  const statusFilters: Array<{ key: FilterStatus; labelEn: string; labelVi: string }> = [
    { key: 'all', labelEn: 'All', labelVi: 'Tất cả' },
    { key: 'ongoing', labelEn: 'Ongoing', labelVi: 'Đang chiếu' },
    { key: 'upcoming', labelEn: 'Upcoming', labelVi: 'Sắp chiếu' },
    { key: 'finished', labelEn: 'Finished', labelVi: 'Hoàn thành' },
  ]

  const sortOptions: Array<{ key: SortBy; labelEn: string; labelVi: string }> = [
    { key: 'score', labelEn: 'Highest Score', labelVi: 'Điểm cao nhất' },
    { key: 'newest', labelEn: 'Newest', labelVi: 'Mới nhất' },
    { key: 'popularity', labelEn: 'Most Popular', labelVi: 'Phổ biến nhất' },
  ]

  return (
    <Layout>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Breadcrumbs
          crumbs={[{ name: lang === 'vi' ? 'Anime theo mùa' : 'Seasonal Chart' }]}
        />

        {/* Page header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {lang === 'vi' ? 'Anime Theo Mùa' : 'Seasonal Anime Chart'}
            </h1>
            <p className="text-sm text-gray-400">
              {lang === 'vi'
                ? 'Khám phá anime theo từng mùa trong năm'
                : 'Discover anime by season and year'}
            </p>
          </div>
        </div>

        {/* Season selector */}
        <div className="mb-6">
          <SeasonSelector
            season={season}
            year={year}
            onPrev={() => navigateSeason('prev')}
            onNext={() => navigateSeason('next')}
            lang={lang}
            isCurrentSeason={isCurrentSeason}
          />
        </div>

        {/* Quick season jump */}
        <div className="mb-6 flex flex-wrap gap-2">
          {SEASONS.map((s) => (
            <button
              key={s}
              onClick={() => { setSeason(s); setYear(currentYear) }}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                season === s && year === currentYear
                  ? `${SEASON_BORDER[s]} ${SEASON_TEXT[s]} bg-white/5`
                  : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
              }`}
            >
              <span>{SEASON_EMOJI[s]}</span>
              {lang === 'vi' ? SEASON_VI[s] : s} {currentYear}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Status filter */}
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-800 bg-card p-1">
            {statusFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  filterStatus === f.key
                    ? 'bg-primary text-white shadow-md'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {lang === 'vi' ? f.labelVi : f.labelEn}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex gap-1 rounded-xl border border-gray-800 bg-card p-1">
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  sortBy === opt.key
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-500 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {lang === 'vi' ? opt.labelVi : opt.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        {!loading && animeList.length > 0 && (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
            <span className={`font-semibold ${SEASON_TEXT[season]}`}>
              {SEASON_EMOJI[season]} {lang === 'vi' ? SEASON_VI[season] : season} {year}
            </span>
            <span>·</span>
            <span>
              {filteredList.length} {lang === 'vi' ? 'anime' : 'anime'}
              {filterStatus !== 'all' && ` (${lang === 'vi' ? 'đã lọc' : 'filtered'})`}
            </span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center gap-3 py-16">
            <AlertCircle className="h-12 w-12 text-red-400" />
            <p className="text-gray-400">{error}</p>
            <button
              onClick={() => void loadSeason()}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
            >
              <RefreshCw className="h-4 w-4" />
              {lang === 'vi' ? 'Thử lại' : 'Retry'}
            </button>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-gray-800 bg-card">
                <div className="aspect-[3/4] rounded-t-2xl bg-gray-800" />
                <div className="space-y-2 p-3">
                  <div className="h-3 w-full rounded bg-gray-800" />
                  <div className="h-3 w-2/3 rounded bg-gray-800" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-800 bg-card/50 py-20 text-center">
            <span className="mb-4 text-6xl">{SEASON_EMOJI[season]}</span>
            <h3 className="mb-2 text-xl font-bold text-white">
              {lang === 'vi' ? 'Không có anime nào' : 'No anime found'}
            </h3>
            <p className="text-gray-500">
              {lang === 'vi'
                ? `Chưa có dữ liệu cho mùa ${SEASON_VI[season]} ${year}`
                : `No data available for ${season} ${year}`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredList.map((anime) => (
              <SeasonAnimeCard
                key={anime.id}
                anime={anime}
                lang={lang}
                isCurrentSeason={isCurrentSeason}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
