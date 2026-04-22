import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, Filter, Search, X } from 'lucide-react'
import AnimeCard from '@/components/AnimeCard'
import AnimeGridSkeleton from '@/components/AnimeGridSkeleton'
import AuthModal from '@/components/AuthModal'
import Layout from '@/components/Layout'
import { fetchSearchFilters, searchAnime } from '@/lib/api'
import { useDebounce } from '@/hooks/useDebounce'
import { useLangContext } from '@/providers/LangProvider'

export default function SearchResults() {
  const { t } = useLangContext()
  const [searchParams, setSearchParams] = useSearchParams()

  const DEFAULT_SORTS = [
    { value: 'score', label: t.sortHighestScore },
    { value: 'popularity', label: t.sortMostPopular },
    { value: 'newest', label: t.sortNewestFirst },
  ]

  const DEFAULT_STATUSES = [
    { value: 'All', label: t.statusAll },
    { value: 'Ongoing', label: t.statusOngoing },
    { value: 'Finished', label: t.statusFinished },
    { value: 'Upcoming', label: t.statusUpcoming },
  ]

  const queryQ = searchParams.get('q') || ''
  const queryGenre = searchParams.get('genre') || 'All'
  const queryStatus = searchParams.get('status') || 'All'
  const querySort = searchParams.get('sort') || 'score'
  const queryMinScore = searchParams.get('min_score') || ''
  const queryMaxScore = searchParams.get('max_score') || ''
  const queryPage = Number.parseInt(searchParams.get('page') || '1', 10) || 1

  const [draftQ, setDraftQ] = useState(queryQ)
  const [draftGenre, setDraftGenre] = useState(queryGenre)
  const [draftStatus, setDraftStatus] = useState(queryStatus)
  const [draftSort, setDraftSort] = useState(querySort)
  const [draftMinScore, setDraftMinScore] = useState(queryMinScore)
  const [draftMaxScore, setDraftMaxScore] = useState(queryMaxScore)

  // Debounced values for auto-filter (no Apply button needed)
  const debouncedQ = useDebounce(draftQ, 500)
  const debouncedGenre = useDebounce(draftGenre, 300)
  const debouncedStatus = useDebounce(draftStatus, 300)
  const debouncedSort = useDebounce(draftSort, 300)
  const debouncedMinScore = useDebounce(draftMinScore, 600)
  const debouncedMaxScore = useDebounce(draftMaxScore, 600)

  // Auto-update URL params when any debounced filter value changes (including keyword)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    // Build new params from all debounced values
    const nextParams = new URLSearchParams()
    if (debouncedQ.trim()) nextParams.set('q', debouncedQ.trim())
    if (debouncedGenre && debouncedGenre !== 'All') nextParams.set('genre', debouncedGenre)
    if (debouncedStatus && debouncedStatus !== 'All') nextParams.set('status', debouncedStatus)
    if (debouncedSort && debouncedSort !== 'score') nextParams.set('sort', debouncedSort)
    if (debouncedMinScore) nextParams.set('min_score', debouncedMinScore)
    if (debouncedMaxScore) nextParams.set('max_score', debouncedMaxScore)
    setSearchParams(nextParams)
  }, [debouncedQ, debouncedGenre, debouncedStatus, debouncedSort, debouncedMinScore, debouncedMaxScore])

  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [lastVisiblePage, setLastVisiblePage] = useState(1)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [genres, setGenres] = useState<Array<{ id: number; name: string }>>([])
  const [sortOptions, setSortOptions] = useState(DEFAULT_SORTS)
  const [statusOptions, setStatusOptions] = useState(DEFAULT_STATUSES)
  const [authOpen, setAuthOpen] = useState(false)
  const getStatusLabel = (status: string) =>
    (
      {
        All: t.statusAll,
        Ongoing: t.statusOngoing,
        Finished: t.statusFinished,
        Upcoming: t.statusUpcoming,
      } as Record<string, string>
    )[status] || status

  useEffect(() => {
    setSortOptions(DEFAULT_SORTS)
    setStatusOptions(DEFAULT_STATUSES)
  }, [t])

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const res = await fetchSearchFilters()
        if (res.success) {
          setGenres(res.data.genres || [])
          setSortOptions(
            res.data.sorts || [
              { value: 'score', label: t.sortHighestScore },
              { value: 'popularity', label: t.sortMostPopular },
              { value: 'newest', label: t.sortNewestFirst },
            ],
          )
          setStatusOptions(
            (res.data.statuses || ['All', 'Ongoing', 'Finished', 'Upcoming']).map((status: string) => ({
              value: status,
              label:
                (
                  {
                    All: t.statusAll,
                    Ongoing: t.statusOngoing,
                    Finished: t.statusFinished,
                    Upcoming: t.statusUpcoming,
                  } as Record<string, string>
                )[status] || status,
            })),
          )
        }
      } catch (err) {
        console.error('Failed to load filters', err)
      }
    }

    void loadFilters()
  }, [t])

  useEffect(() => {
    setDraftQ(queryQ)
    setDraftGenre(queryGenre)
    setDraftStatus(queryStatus)
    setDraftSort(querySort)
    setDraftMinScore(queryMinScore)
    setDraftMaxScore(queryMaxScore)
  }, [queryQ, queryGenre, queryStatus, querySort, queryMinScore, queryMaxScore])

  const loadResults = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await searchAnime({
        q: queryQ,
        genre: queryGenre,
        status: queryStatus,
        sort: querySort,
        min_score: queryMinScore,
        max_score: queryMaxScore,
        page: queryPage,
        limit: 20,
      })

      if (res.success) {
        setResults(res.data)
        setTotal(res.total)
        setCurrentPage(res.page)
        setHasNextPage(Boolean(res.has_next_page))
        setLastVisiblePage(res.last_visible_page || 1)
      } else {
        setError(t.loadError)
        setResults([])
      }
    } catch (err) {
      console.error('Failed to load search results', err)
      setError(t.loadError)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadResults()
    window.scrollTo(0, 0)
  }, [queryGenre, queryMaxScore, queryMinScore, queryPage, queryQ, querySort, queryStatus])

  const updateSearchParams = (overrides: Record<string, string>, page = 1) => {
    const nextParams = new URLSearchParams()

    const q = overrides.q ?? draftQ
    const genre = overrides.genre ?? draftGenre
    const status = overrides.status ?? draftStatus
    const sort = overrides.sort ?? draftSort
    const minScore = overrides.min_score ?? draftMinScore
    const maxScore = overrides.max_score ?? draftMaxScore

    if (q.trim()) nextParams.set('q', q.trim())
    if (genre && genre !== 'All') nextParams.set('genre', genre)
    if (status && status !== 'All') nextParams.set('status', status)
    if (sort && sort !== 'score') nextParams.set('sort', sort)
    if (minScore) nextParams.set('min_score', minScore)
    if (maxScore) nextParams.set('max_score', maxScore)
    if (page > 1) nextParams.set('page', String(page))

    setSearchParams(nextParams)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateSearchParams({}, 1)
    setIsFilterOpen(false)
  }

  const goToPage = (page: number) => {
    const nextParams = new URLSearchParams(searchParams)
    if (page > 1) nextParams.set('page', String(page))
    else nextParams.delete('page')
    setSearchParams(nextParams)
  }

  const handleClearFilters = () => {
    setDraftQ('')
    setDraftGenre('All')
    setDraftStatus('All')
    setDraftSort('score')
    setDraftMinScore('')
    setDraftMaxScore('')
    setSearchParams({})
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-8 md:flex-row">
          <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-card p-4 md:hidden">
            <span className="font-semibold text-white">{t.filters}</span>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="rounded-lg bg-gray-800 p-2 text-white"
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>

          <div
            className={`w-full flex-shrink-0 md:w-72 ${isFilterOpen ? 'block' : 'hidden md:block'}`}
          >
            <form
              onSubmit={handleSearch}
              className="sticky top-24 rounded-xl border border-gray-800 bg-card p-6"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                  <Filter className="h-5 w-5 text-primary" />
                  {t.searchFilters}
                </h2>
                {isFilterOpen && (
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="text-gray-400 md:hidden"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-400">{t.keyword}</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={draftQ}
                      onChange={(e) => setDraftQ(e.target.value)}
                      placeholder={t.keywordPlaceholder}
                      className="w-full rounded-lg border border-gray-700 bg-background py-2 pl-9 pr-3 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-400">{t.sortBy}</label>
                  <select
                    value={draftSort}
                    onChange={(e) => setDraftSort(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-background px-3 py-2 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-400">{t.genre}</label>
                  <select
                    value={draftGenre}
                    onChange={(e) => setDraftGenre(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-background px-3 py-2 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="All">{t.all}</option>
                    {genres.map((genreOption) => (
                      <option key={genreOption.id} value={genreOption.name}>
                        {genreOption.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-400">{t.status}</label>
                  <select
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-background px-3 py-2 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    {statusOptions.map((statusOption) => (
                      <option key={statusOption.value} value={statusOption.value}>
                        {statusOption.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-400">
                      {t.minScore}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={draftMinScore}
                      onChange={(e) => setDraftMinScore(e.target.value)}
                      placeholder="0.0"
                      className="w-full rounded-lg border border-gray-700 bg-background px-3 py-2 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-400">
                      {t.maxScore}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={draftMaxScore}
                      onChange={(e) => setDraftMaxScore(e.target.value)}
                      placeholder="10.0"
                      className="w-full rounded-lg border border-gray-700 bg-background px-3 py-2 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="w-full rounded-lg bg-gray-800 py-2 font-medium text-white transition-colors hover:bg-gray-700"
                  >
                    {t.clearFilters}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="flex-1">
            <div className="mb-6 border-b border-gray-800 pb-4">
              <h1 className="mb-2 text-3xl font-bold text-white">
                {queryQ ? t.searchResultsFor(queryQ) : t.browseAnime}
              </h1>
              <p className="text-gray-400">
                {t.foundResults(total)}
                {queryGenre !== 'All' ? ` in ${queryGenre}` : ''}
                {queryStatus !== 'All' ? ` • ${getStatusLabel(queryStatus)}` : ''}
              </p>
            </div>

            {loading ? (
              <AnimeGridSkeleton />
            ) : error ? (
              <div className="flex flex-col items-center justify-center gap-4 py-20">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <p className="text-center text-gray-400">{t.loadError}</p>
                <button
                  onClick={() => {
                    setError(null)
                    void loadResults()
                  }}
                  className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
                >
                  {t.retry}
                </button>
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
                  {results.map((anime) => (
                    <AnimeCard key={anime.id} anime={anime} onAuthRequired={() => setAuthOpen(true)} />
                  ))}
                </div>

                <div className="mt-10 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => goToPage(currentPage - 1)}
                    className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-white transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t.previous}
                  </button>
                  <span className="text-sm text-gray-400">{t.page(currentPage, lastVisiblePage)}</span>
                  <button
                    type="button"
                    disabled={!hasNextPage}
                    onClick={() => goToPage(currentPage + 1)}
                    className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-white transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t.next}
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-gray-800 bg-card p-12 text-center">
                <Search className="mx-auto mb-4 h-16 w-16 text-gray-600" />
                <h3 className="mb-2 text-xl font-bold text-white">{t.noAnimeFound}</h3>
                <p className="mb-6 text-gray-400">{t.tryAdjusting}</p>
                <button
                  onClick={handleClearFilters}
                  className="rounded-lg bg-primary px-6 py-2 font-medium text-white transition-colors hover:bg-primary-hover"
                >
                  {t.clearAllFilters}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </Layout>
  )
}
