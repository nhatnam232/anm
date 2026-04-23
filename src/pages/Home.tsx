import { useEffect, useState } from 'react'
import { AlertCircle, ChevronRight, PlayCircle, Star } from 'lucide-react'
import AnimeCard from '@/components/AnimeCard'
import AnimeGridSkeleton from '@/components/AnimeGridSkeleton'
import AuthModal from '@/components/AuthModal'
import HeroArtwork from '@/components/HeroArtwork'
import Layout from '@/components/Layout'
import ReloadLink from '@/components/ReloadLink'
import RecommendedForYou from '@/components/RecommendedForYou'
import { fetchAnimeList, fetchFeaturedAnime } from '@/lib/api'
import { useAutoTranslation } from '@/hooks/useAutoTranslation'
import { useLangContext } from '@/providers/LangProvider'

const CATEGORIES = ['All', 'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy']

export default function Home() {
  const { t, lang } = useLangContext()
  const [featured, setFeatured] = useState<any[]>([])
  const [featuredError, setFeaturedError] = useState<string | null>(null)
  const [animeList, setAnimeList] = useState<any[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)
  const [authOpen, setAuthOpen] = useState(false)

  const loadFeatured = async () => {
    setFeaturedError(null)
    try {
      const res = await fetchFeaturedAnime()
      if (res.success) {
        setFeatured(res.data)
      } else {
        setFeaturedError(t.loadError)
      }
    } catch (error) {
      console.error('Failed to load featured anime', error)
      setFeaturedError(t.loadError)
    }
  }

  const loadList = async (category: string) => {
    setListLoading(true)
    setListError(null)
    try {
      const res = await fetchAnimeList({
        genre: category,
        limit: 12,
        sort: 'score',
      })
      if (res.success) {
        setAnimeList(res.data)
      } else {
        setListError(t.loadError)
      }
    } catch (error) {
      console.error('Failed to load anime list', error)
      setListError(t.loadError)
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    void loadFeatured()
  }, [])

  useEffect(() => {
    void loadList(activeCategory)
  }, [activeCategory])

  useEffect(() => {
    if (featured.length === 0) return undefined

    const interval = window.setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % featured.length)
    }, 5000)

    return () => window.clearInterval(interval)
  }, [featured])

  const currentFeatured = featured[currentBannerIndex]
  const featuredSynopsis = useAutoTranslation(currentFeatured?.synopsis, lang)
  const listTitle = activeCategory === 'All' ? t.topAnime : t.topAnimeCategory(activeCategory)
  const getCategoryLabel = (category: string) => (category === 'All' ? t.all : category)

  return (
    <Layout>
      <div className="bg-background">
        <section className="relative flex min-h-[520px] flex-col overflow-hidden sm:min-h-[560px] lg:h-[78vh] lg:min-h-[680px]">
          {currentFeatured ? (
            <>
              <div className="absolute inset-0">
                <HeroArtwork
                  bannerImage={currentFeatured.banner_image}
                  coverImage={currentFeatured.cover_image}
                  title={currentFeatured.title}
                  heightClassName="h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/25" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_32%),radial-gradient(circle_at_left,rgba(14,165,233,0.12),transparent_28%)]" />
              </div>

              <div className="relative z-10 mt-auto w-full px-4 pb-16 pt-10 sm:px-6 sm:pb-20 lg:px-16 lg:pb-24">
                <div className="container mx-auto max-w-7xl">
                  <div className="surface-float mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200 backdrop-blur">
                      {t.featuredSpotlight}
                    </span>
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white sm:text-sm">
                      {t.topRanked}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-3 py-1 text-xs text-gray-100 backdrop-blur sm:text-sm">
                      <Star className="h-4 w-4 fill-current text-yellow-400" />
                      {typeof currentFeatured.score === 'number'
                        ? currentFeatured.score.toFixed(1)
                        : t.unknown}
                    </span>
                    {featuredSynopsis.isTranslated && (
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                        {t.autoTranslation}
                      </span>
                    )}
                  </div>

                  <h1 className="surface-float mb-3 line-clamp-2 max-w-4xl text-2xl font-bold text-white sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
                    {currentFeatured.title}
                  </h1>

                  <p className="surface-float mb-5 line-clamp-3 max-w-3xl text-sm text-gray-200 sm:text-base md:line-clamp-4 md:text-lg">
                    {featuredSynopsis.text}
                  </p>

                  <div className="surface-float flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-300 sm:text-sm">
                    <span>{currentFeatured.status}</span>
                    <span>•</span>
                    <span>
                      {currentFeatured.episodes || '?'} {t.episodesShort}
                    </span>
                    <span>•</span>
                    <span className="truncate">{currentFeatured.studio_name}</span>
                  </div>

                  <div className="mt-6">
                    <ReloadLink
                      to={`/anime/${currentFeatured.id}`}
                      className="surface-float inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-hover sm:px-6 sm:py-3 sm:text-base"
                    >
                      <PlayCircle className="h-5 w-5" />
                      {t.viewDetails}
                    </ReloadLink>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
                {featured.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentBannerIndex(idx)}
                    className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                      idx === currentBannerIndex
                        ? 'scale-125 bg-primary'
                        : 'bg-gray-500 hover:bg-gray-300'
                    }`}
                    aria-label={`Show ${item.title}`}
                  />
                ))}
              </div>
            </>
          ) : featuredError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card">
              <AlertCircle className="h-12 w-12 text-red-400" />
              <p className="text-center text-gray-400">{t.loadError}</p>
              <button
                onClick={() => {
                  setFeaturedError(null)
                  void loadFeatured()
                }}
                className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
              >
                {t.retry}
              </button>
            </div>
          ) : (
            <div className="absolute inset-0 animate-pulse bg-card" />
          )}
        </section>

        {/* Personalised picks for signed-in users (no-op for guests). */}
        <RecommendedForYou onAuthRequired={() => setAuthOpen(true)} />

        <section className="container mx-auto max-w-7xl px-4 py-12">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-bold text-white">{listTitle}</h2>
              <p className="mt-2 text-gray-400">{t.homeSubtitle}</p>
            </div>

            <div className="flex w-full gap-2 overflow-x-auto pb-2 md:w-auto">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                    activeCategory === category
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-card text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {getCategoryLabel(category)}
                </button>
              ))}
            </div>
          </div>

          {listLoading ? (
            <AnimeGridSkeleton
              count={12}
              columns="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
            />
          ) : listError ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <AlertCircle className="h-12 w-12 text-red-400" />
              <p className="text-center text-gray-400">{t.loadError}</p>
              <button
                onClick={() => {
                  setListError(null)
                  void loadList(activeCategory)
                }}
                className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
              >
                {t.retry}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {animeList.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} onAuthRequired={() => setAuthOpen(true)} />
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            <ReloadLink
              to="/search"
              className="inline-flex items-center gap-2 font-medium text-primary transition-colors hover:text-primary-hover"
            >
              {t.openSearch}
              <ChevronRight className="h-4 w-4" />
            </ReloadLink>
          </div>
        </section>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </Layout>
  )
}
