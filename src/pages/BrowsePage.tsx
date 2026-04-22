/**
 * BrowsePage.tsx
 * Unified Search + Browse page with infinite scroll and instant filter.
 * Replaces both /search and /browse routes.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, Filter, RefreshCw, Search, X } from 'lucide-react'
import Layout from '@/components/Layout'
import Breadcrumbs from '@/components/Breadcrumbs'
import AnimeCard from '@/components/AnimeCard'
import AuthModal from '@/components/AuthModal'
import { PageLoader, InlineLoader } from '@/components/LottieLoader'
import { searchAnime, fetchSearchFilters } from '@/lib/api'
import { useDebounce } from '@/hooks/useDebounce'
import { useLangContext } from '@/providers/LangProvider'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function BrowseSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl bg-card">
          <div className="aspect-[3/4] rounded-t-xl bg-gray-800" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-full rounded bg-gray-800" />
            <div className="h-3 w-2/3 rounded bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 24

export default function BrowsePage() {
  const { t, lang } = useLangContext()
  const [searchParams, setSearchParams] = useSearchParams()

  // Read initial values from URL params (supports /search?q=... links)
  const [keyword, setKeyword] = useState(searchParams.get('q') || '')
  const [genre, setGenre] = useState(searchParams.get('genre') || 'All')
  const [status, setStatus] = useState(searchParams.get('status') || 'All')
  const [sort, setSort] = useState(searchParams.get('sort') || 'score')
  const [minScore, setMinScore] = useState(searchParams.get('min_score') || '')
  const [maxScore, setMaxScore] = useState(searchParams.get('max_score') || '')

  const [genres, setGenres] = useState<Array<{ id: number; name: string }>>([])
  const [animeList, setAnimeList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [authOpen, setAuthOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Debounced filters
  const debouncedKeyword = useDebounce(keyword, 500)
  const debouncedGenre = useDebounce(genre, 300)
  const debouncedStatus = useDebounce(status, 300)
  const debouncedSort = useDebounce(sort, 300)
  const debouncedMinScore = useDebounce(minScore, 600)
  const debouncedMaxScore = useDebounce(maxScore, 600)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Load genres
  useEffect(() => {
    fetchSearchFilters()
      .then((res) => {
        if (res.success) setGenres(res.data.genres ?? [])
      })
      .catch(() => {})
  }, [])

  // Build API params from current debounced state
  const buildParams = useCallback(
    (pageNum: number) => {
      const params: Record<string, any> = {
        sort: debouncedSort,
        limit: PAGE_SIZE,
        page: pageNum,
      }
      if (debouncedKeyword.trim()) params.q = debouncedKeyword.trim()
      if (debouncedGenre && debouncedGenre !== 'All') params.genre = debouncedGenre
      if (debouncedStatus && debouncedStatus !== 'All') params.status = debouncedStatus
      if (debouncedMinScore) params.min_score = debouncedMinScore
      if (debouncedMaxScore) params.max_score = debouncedMaxScore
      return params
    },
    [debouncedKeyword, debouncedGenre, debouncedStatus, debouncedSort, debouncedMinScore, debouncedMaxScore],
  )

  // Sync URL params when filters change
  useEffect(() => {
    const next = new URLSearchParams()
    if (debouncedKeyword.trim()) next.set('q', debouncedKeyword.trim())
    if (debouncedGenre !== 'All') next.set('genre', debouncedGenre)
    if (debouncedStatus !== 'All') next.set('status', debouncedStatus)
    if (debouncedSort !== 'score') next.set('sort', debouncedSort)
    if (debouncedMinScore) next.set('min_score', debouncedMinScore)
    if (debouncedMaxScore) next.set('max_score', debouncedMaxScore)
    setSearchParams(next, { replace: true })
  }, [debouncedKeyword, debouncedGenre, debouncedStatus, debouncedSort, debouncedMinScore, debouncedMaxScore])

  const loadPage = useCallback(
    async (pageNum: number, reset = false) => {
      if (reset) setLoading(true)
      else setLoadingMore(true)
      setError(null)

      try {
        const res = await searchAnime(buildParams(pageNum))
        if (res.success) {
          const newItems: any[] = res.data ?? []
          setAnimeList((prev) => (reset ? newItems : [...prev, ...newItems]))
          setHasMore(newItems.length === PAGE_SIZE)
          if (reset) setTotalCount(res.total ?? 0)
        } else {
          setError(t.loadError)
        }
      } catch {
        setError(t.loadError)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [buildParams, t.loadError],
  )

  // Reset + reload when filters change
  useEffect(() => {
    setAnimeList([])
    setPage(1)
    setHasMore(true)
    void loadPage(1, true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [debouncedKeyword, debouncedGenre, debouncedStatus, debouncedSort, debouncedMinScore, debouncedMaxScore])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    observerRef.current?.disconnect()
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = page + 1
          setPage(nextPage)
          void loadPage(nextPage, false)
        }
      },
      { threshold: 0.1 },
    )
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current)
    return () => observerRef.current?.disconnect()
  }, [hasMore, loadingMore, loading, page, loadPage])

  const handleClear = () => {
    setKeyword('')
    setGenre('All')
    setStatus('All')
    setSort('score')
    setMinScore('')
    setMaxScore('')
  }

  const hasActiveFilters =
    keyword.trim() !== '' ||
    genre !== 'All' ||
    status !== 'All' ||
    sort !== 'score' ||
    minScore !== '' ||
    maxScore !== ''

  const sortOptions = [
    { value: 'score', label: lang === 'vi' ? 'Điểm cao nhất' : 'Highest Score' },
    { value: 'popularity', label: lang === 'vi' ? 'Phổ biến nhất' : 'Most Popular' },
    { value: 'newest', label: lang === 'vi' ? 'Mới nhất' : 'Newest First' },
  ]

  const statusOptions = [
    { value: 'All', label: lang === 'vi' ? 'Tất cả' : 'All' },
    { value: 'Ongoing', label: lang === 'vi' ? 'Đang chiếu' : 'Ongoing' },
    { value: 'Finished', label: lang === 'vi' ? 'Hoàn thành' : 'Finished' },
    { value: 'Upcoming', label: lang === 'vi' ? 'Sắp chiếu' : 'Upcoming' },
  ]

  return (
    <Layout>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Breadcrumbs
          crumbs={[
            {
              name: debouncedKeyword
                ? (lang === 'vi' ? `Kết quả: "${debouncedKeyword}"` : `Results: "${debouncedKeyword}"`)
                : (lang === 'vi' ? 'Tất cả Anime' : 'Browse All Anime'),
            },
          ]}
        />

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {debouncedKeyword
                ? (lang === 'vi' ? `Kết quả cho "${debouncedKeyword}"` : `Results for "${debouncedKeyword}"`)
                : (lang === 'vi' ? 'Tất Cả Anime' : 'Browse All Anime')}
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              {loading
                ? (lang === 'vi' ? 'Đang tải...' : 'Loading...')
                : totalCount > 0
                  ? (lang === 'vi' ? `${totalCount.toLocaleString()} kết quả` : `${totalCount.toLocaleString()} results`)
                  : (lang === 'vi' ? 'Cuộn xuống để tải thêm' : 'Scroll to load more')}
            </p>
          </div>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all md:hidden ${
              isFilterOpen || hasActiveFilters
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-gray-700 text-gray-300 hover:border-primary hover:text-primary'
            }`}
          >
            <Filter className="h-4 w-4" />
            {lang === 'vi' ? 'Bộ lọc' : 'Filters'}
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                !
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col gap-6 md:flex-row">
          {/* ── Sidebar filters ── */}
          <div className={`w-full flex-shrink-0 md:w-64 ${isFilterOpen ? 'block' : 'hidden md:block'}`}>
            <div className="sticky top-24 space-y-4 rounded-2xl border border-gray-800 bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-bold text-white">
                  <Filter className="h-4 w-4 text-primary" />
                  {lang === 'vi' ? 'Bộ lọc' : 'Filters'}
                </h2>
                {hasActiveFilters && (
                  <button
                    onClick={handleClear}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary"
                  >
                    <X className="h-3 w-3" />
                    {lang === 'vi' ? 'Xóa tất cả' : 'Clear all'}
                  </button>
                )}
              </div>

              {/* Keyword */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  {lang === 'vi' ? 'Từ khóa' : 'Keyword'}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder={lang === 'vi' ? 'Tên anime...' : 'Anime title...'}
                    className="w-full rounded-lg border border-gray-700 bg-background py-2 pl-9 pr-8 text-sm text-white focus:border-primary focus:outline-none"
                  />
                  {keyword && (
                    <button
                      onClick={() => setKeyword('')}
                      className="absolute right-2 top-2.5 text-gray-500 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  {lang === 'vi' ? 'Sắp xếp' : 'Sort By'}
                </label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-background px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Genre */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  {lang === 'vi' ? 'Thể loại' : 'Genre'}
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-background px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                >
                  <option value="All">{lang === 'vi' ? 'Tất cả' : 'All'}</option>
                  {genres.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  {lang === 'vi' ? 'Trạng thái' : 'Status'}
                </label>
                <div className="flex flex-col gap-1">
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setStatus(opt.value)}
                      className={`rounded-lg px-3 py-1.5 text-left text-sm transition-all ${
                        status === opt.value
                          ? 'bg-primary/20 font-medium text-primary'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Score range */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  {lang === 'vi' ? 'Điểm số' : 'Score Range'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={minScore}
                    onChange={(e) => setMinScore(e.target.value)}
                    placeholder="0.0"
                    className="w-full rounded-lg border border-gray-700 bg-background px-2 py-1.5 text-sm text-white focus:border-primary focus:outline-none"
                  />
                  <span className="flex items-center text-gray-500">—</span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                    placeholder="10"
                    className="w-full rounded-lg border border-gray-700 bg-background px-2 py-1.5 text-sm text-white focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Main content ── */}
          <div className="flex-1">
            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="mb-4 flex flex-wrap gap-2">
                {keyword && (
                  <span className="flex items-center gap-1 rounded-full bg-primary/20 px-3 py-1 text-xs text-primary">
                    🔍 "{keyword}"
                    <button onClick={() => setKeyword('')}><X className="h-3 w-3" /></button>
                  </span>
                )}
                {genre !== 'All' && (
                  <span className="flex items-center gap-1 rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300">
                    {genre}
                    <button onClick={() => setGenre('All')}><X className="h-3 w-3" /></button>
                  </span>
                )}
                {status !== 'All' && (
                  <span className="flex items-center gap-1 rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300">
                    {statusOptions.find((s) => s.value === status)?.label}
                    <button onClick={() => setStatus('All')}><X className="h-3 w-3" /></button>
                  </span>
                )}
                {(minScore || maxScore) && (
                  <span className="flex items-center gap-1 rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300">
                    ⭐ {minScore || '0'} – {maxScore || '10'}
                    <button onClick={() => { setMinScore(''); setMaxScore('') }}><X className="h-3 w-3" /></button>
                  </span>
                )}
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="flex flex-col items-center gap-3 py-16">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <p className="text-gray-400">{error}</p>
                <button
                  onClick={() => void loadPage(1, true)}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
                >
                  <RefreshCw className="h-4 w-4" />
                  {t.retry}
                </button>
              </div>
            )}

            {/* Grid */}
            {loading ? (
              <PageLoader message={lang === 'vi' ? 'Đang tải anime...' : 'Loading anime...'} />
            ) : animeList.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-800 bg-card/50 py-20 text-center">
                <Search className="mb-4 h-12 w-12 text-gray-600" />
                <h3 className="mb-2 text-xl font-bold text-white">
                  {lang === 'vi' ? 'Không tìm thấy anime' : 'No anime found'}
                </h3>
                <p className="text-gray-500">
                  {lang === 'vi' ? 'Thử thay đổi bộ lọc' : 'Try adjusting your filters'}
                </p>
                <button
                  onClick={handleClear}
                  className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover"
                >
                  {lang === 'vi' ? 'Xóa bộ lọc' : 'Clear Filters'}
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {animeList.map((anime, idx) => (
                    <AnimeCard
                      key={`${anime.id}-${idx}`}
                      anime={anime}
                      onAuthRequired={() => setAuthOpen(true)}
                    />
                  ))}
                </div>

                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} className="mt-8 flex justify-center py-4">
                  {loadingMore && (
                    <InlineLoader label={lang === 'vi' ? 'Đang tải thêm...' : 'Loading more...'} />
                  )}
                  {!hasMore && animeList.length > 0 && (
                    <p className="text-sm text-gray-600">
                      {lang === 'vi'
                        ? `Đã hiển thị tất cả ${animeList.length} anime`
                        : `All ${animeList.length} anime loaded`}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </Layout>
  )
}
