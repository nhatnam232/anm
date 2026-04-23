import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import {
  Heart,
  Star,
  Calendar,
  Tv,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Trophy,
  Flame,
  Film,
  Radio,
  Globe,
  PencilLine,
  PlayCircle,
  Music2,
  Search,
  X,
} from 'lucide-react'
import Layout from '@/components/Layout'
import Breadcrumbs from '@/components/Breadcrumbs'
import AnimeCard from '@/components/AnimeCard'
import AnimeLoader from '@/components/AnimeLoader'
import { MarkdownText } from '@/lib/markdown'
import HeroArtwork from '@/components/HeroArtwork'
import ReloadLink from '@/components/ReloadLink'
import { fetchAnimeDetails } from '@/lib/api'
import { useAnimeLike } from '@/hooks/useAnimeLike'
import { useManualTranslation } from '@/hooks/useManualTranslation'
import CommentSection from '@/components/CommentSection'
import AddToLibraryButton from '@/components/AddToLibraryButton'
import AuthModal from '@/components/AuthModal'
import SuggestEditModal from '@/components/SuggestEditModal'
import SEO, { buildAnimeJsonLd } from '@/components/SEO'
import { useLangContext } from '@/providers/LangProvider'
import { cleanDuration, cleanEpisodeCount, localizeGenre, localizeSeason, localizeStatus, orUnknown } from '@/lib/formatters'


const formatCount = (value?: number | null) => {
  if (typeof value !== 'number') return '—'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

export default function AnimeDetail() {
  const { t, lang } = useLangContext()
  const { id } = useParams<{ id: string }>()
  const numId = Number(id)
  const validId = Number.isFinite(numId) && numId > 0
  const [anime, setAnime] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [charSearch, setCharSearch] = useState('')
  const [suggestEditOpen, setSuggestEditOpen] = useState(false)
  const like = useAnimeLike(
    anime
      ? {
          id: anime.id,
          title: anime.title,
          cover_image: anime.cover_image,
          score: anime.score ?? 0,
          episodes: anime.episodes ?? 0,
          status: anime.status ?? '',
        }
      : null,
  )

  const loadAnime = async () => {
    if (!validId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetchAnimeDetails(numId)
      if (res.success) {
        setAnime(res.data)
      } else {
        setError(t.loadError)
      }
    } catch (err) {
      console.error(err)
      setError(t.loadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAnime()
    window.scrollTo(0, 0)
  }, [id])

  const synopsisText = useManualTranslation(anime?.synopsis, lang)
  const backgroundText = useManualTranslation(anime?.background, lang)

  if (!validId) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="mb-4 text-2xl font-bold text-white">{t.animeNotFound}</h2>
          <ReloadLink to="/" className="text-primary hover:underline">
            {t.returnHome}
          </ReloadLink>
        </div>
      </Layout>
    )
  }

  if (loading) {
    return (
      <Layout>
        <AnimeLoader label="Fetching anime data" />
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <AlertCircle className="h-12 w-12 text-red-400" />
          <p className="text-center text-gray-400">{t.loadError}</p>
          <button
            onClick={() => {
              setError(null)
              void loadAnime()
            }}
            className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
          >
            {t.retry}
          </button>
        </div>
      </Layout>
    )
  }

  if (!anime) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="mb-4 text-2xl font-bold text-white">{t.animeNotFound}</h2>
          <ReloadLink to="/" className="text-primary hover:underline">
            {t.returnHome}
          </ReloadLink>
        </div>
      </Layout>
    )
  }

  const favorite = like.liked
  const animeScore = typeof anime.score === 'number' ? anime.score : null

  const toggleFavorite = () => {
    if (like.requiresAuth) {
      setAuthOpen(true)
      return
    }
    void like.toggle()
  }

  const stats = anime.statistics
  const scoreBreakdown: { score: number; votes: number; percentage: number }[] =
    stats?.score_breakdown ?? []
  const statusIcons: Record<string, ReactNode> = {
    Finished: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    Ongoing: <Radio className="h-4 w-4 text-blue-400" />,
    Upcoming: <Clock className="h-4 w-4 text-amber-400" />,
  }

  const filteredCharacters =
    anime.characters?.filter((char: any) => {
      const normalizedQuery = charSearch.trim().toLowerCase()
      if (!normalizedQuery) return true
      const name = (char.name ?? '').toLowerCase()
      const cv = (char.voice_actor?.name ?? '').toLowerCase()
      return name.includes(normalizedQuery) || cv.includes(normalizedQuery)
    }) ?? []

  const synopsisBadge =
    synopsisText.loading
      ? t.autoTranslationLoading
      : synopsisText.isTranslated
        ? t.translatedToVietnamese
        : synopsisText.unavailable
          ? t.autoTranslationUnavailable
          : null

  const backgroundBadge =
    backgroundText.loading
      ? t.autoTranslationLoading
      : backgroundText.isTranslated
        ? t.translatedToVietnamese
        : backgroundText.unavailable
          ? t.autoTranslationUnavailable
          : null

  return (
    <Layout>
      <SEO
        title={anime.title}
        description={(anime.synopsis ?? '').slice(0, 200)}
        image={anime.banner_image || anime.cover_image}
        type="article"
        jsonLd={buildAnimeJsonLd({
          id: anime.id,
          title: anime.title,
          cover_image: anime.cover_image,
          synopsis: anime.synopsis,
          score: anime.score,
          episodes: anime.episodes,
          status: anime.status,
          studio_name: anime.studio_name,
          aired_from: anime.aired_from,
        })}
      />
      <HeroArtwork
        bannerImage={anime.banner_image}
        coverImage={anime.cover_image}
        title={anime.title}
      />

      <div className="container relative z-10 mx-auto -mt-32 px-4 md:-mt-48">
        <Breadcrumbs
          crumbs={[
            { name: `#${anime.id} • ${anime.title}` },
          ]}
        />

        <div className="flex flex-col gap-8 md:flex-row">
          <div className="w-full flex-shrink-0 md:w-64">
            <div className="surface-float overflow-hidden rounded-xl bg-card shadow-xl">
              <img
                src={anime.cover_image}
                alt={anime.title}
                className="aspect-[3/4] w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.visibility = 'hidden'
                }}
              />
              <div className="flex flex-col gap-2 p-4">
                <button
                  onClick={toggleFavorite}
                  disabled={like.busy}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2 font-medium transition-colors disabled:opacity-60 ${
                    favorite
                      ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                      : 'bg-primary text-white hover:bg-primary-hover'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${favorite ? 'fill-current' : ''}`} />
                  {favorite ? t.liked : t.like}
                  {typeof like.count === 'number' && (
                    <span className="ml-1 text-xs opacity-80">• {like.count}</span>
                  )}
                </button>

                <AddToLibraryButton
                  animeId={anime.id}
                  animeTitle={anime.title}
                  animeCover={anime.cover_image}
                  animeEpisodes={anime.episodes ?? null}
                  onAuthRequired={() => setAuthOpen(true)}
                />

                {/* Prominent "Suggest edit" CTA — anyone signed-in can submit a
                    correction; trusted users (active, top_fan, mod, admin,
                    owner) get auto-approved by the DB trigger. */}
                <button
                  type="button"
                  onClick={() => {
                    if (!anime) return
                    setSuggestEditOpen(true)
                  }}
                  className="flex items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                  title={lang === 'vi' ? 'Đề xuất chỉnh sửa thông tin anime này' : 'Suggest an edit for this anime'}
                >
                  <PencilLine className="h-4 w-4" />
                  {lang === 'vi' ? 'Đề xuất chỉnh sửa' : 'Suggest edit'}
                </button>
              </div>
            </div>

            <div className="surface-float mt-4 space-y-4 rounded-xl bg-card p-4">
              {anime.title_english && anime.title_english !== anime.title && (
                <div>
                  <span className="block text-sm text-gray-400">{t.englishTitle}</span>
                  <span className="text-gray-200">{anime.title_english}</span>
                </div>
              )}
              <div>
                <span className="block text-sm text-gray-400">{t.japaneseTitle}</span>
                <span className="text-gray-200">{anime.title_jp || t.unknown}</span>
              </div>
              {anime.title_synonyms && anime.title_synonyms.length > 0 && (
                <div>
                  <span className="block text-sm text-gray-400">{t.synonyms}</span>
                  <span className="text-sm text-gray-200">{anime.title_synonyms.join(', ')}</span>
                </div>
              )}
              <div>
                <span className="block text-sm text-gray-400">{t.status}</span>
                <span className="flex items-center gap-2 text-gray-200">
                  {statusIcons[anime.status] ?? <AlertCircle className="h-4 w-4 text-gray-400" />}
                  {localizeStatus(anime.status, lang)}
                </span>
              </div>
              <div>
                <span className="block text-sm text-gray-400">{t.episodes}</span>
                <span className="flex items-center gap-2 text-gray-200">
                  <Tv className="h-4 w-4" />
                  {cleanEpisodeCount(anime.episodes) ?? (lang === 'vi' ? 'Chưa rõ' : 'Unknown')}
                </span>
              </div>
              <div>
                <span className="block text-sm text-gray-400">{t.duration}</span>
                <span className="flex items-center gap-2 text-gray-200">
                  <Clock className="h-4 w-4" /> {cleanDuration(anime.duration, lang)}
                </span>
              </div>
              <div>
                <span className="block text-sm text-gray-400">{t.season}</span>
                <span className="flex items-center gap-2 text-gray-200">
                  <Calendar className="h-4 w-4" />
                  {anime.season ? localizeSeason(anime.season, lang) : orUnknown(null, lang)}
                </span>
              </div>

              {anime.broadcast && (
                <div>
                  <span className="block text-sm text-gray-400">{t.broadcast}</span>
                  <span className="flex items-center gap-2 text-gray-200">
                    <Radio className="h-4 w-4" /> {anime.broadcast}
                  </span>
                </div>
              )}
              <div>
                <span className="block text-sm text-gray-400">{t.studio}</span>
                {anime.studio_id ? (
                  <ReloadLink
                    to={`/studio/${anime.studio_id}`}
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Building className="h-4 w-4" /> {anime.studio_name}
                  </ReloadLink>
                ) : (
                  <span className="flex items-center gap-2 text-gray-200">
                    <Building className="h-4 w-4" /> {anime.studio_name || t.unknown}
                  </span>
                )}
              </div>
              <div>
                <span className="block text-sm text-gray-400">{t.aired}</span>
                <span className="text-gray-200">{anime.aired_string || t.unknown}</span>
              </div>
              <div>
                <span className="block text-sm text-gray-400">{t.type}</span>
                <span className="flex items-center gap-2 text-gray-200">
                  <Film className="h-4 w-4" /> {anime.type || t.unknown}
                </span>
              </div>
              <div>
                <span className="block text-sm text-gray-400">{t.source}</span>
                <span className="text-gray-200">{anime.source || t.unknown}</span>
              </div>
              <div>
                <span className="block text-sm text-gray-400">{t.rating}</span>
                <span className="text-gray-200">{anime.rating || t.unknown}</span>
              </div>
              {anime.producers && anime.producers.length > 0 && (
                <div>
                  <span className="block text-sm text-gray-400">{t.producers}</span>
                  <span className="text-sm text-gray-200">
                    {anime.producers.map((p: any) => p.name).join(', ')}
                  </span>
                </div>
              )}
              {anime.licensors && anime.licensors.length > 0 && (
                <div>
                  <span className="block text-sm text-gray-400">{t.licensors}</span>
                  <span className="text-sm text-gray-200">
                    {anime.licensors.map((p: any) => p.name).join(', ')}
                  </span>
                </div>
              )}
              {anime.demographics && anime.demographics.length > 0 && (
                <div>
                  <span className="block text-sm text-gray-400">{t.demographics}</span>
                  <span className="text-sm text-gray-200">
                    {anime.demographics.map((d: any) => d.name).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 pb-12">
            <div className="surface-float mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h1 className="mb-2 text-3xl font-bold text-white md:text-5xl">{anime.title}</h1>
                <div className="flex flex-wrap gap-2">
                  {anime.genres.map((g: string) => (
                    <span key={g} className="rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-300">
                      {localizeGenre(g, lang)}
                    </span>
                  ))}
                  {(anime.themes_tags ?? []).map((theme: any) => (
                    <span
                      key={`theme-${theme.name}`}
                      className="rounded-full bg-primary/15 px-3 py-1 text-sm text-primary"
                    >
                      {theme.name}
                    </span>
                  ))}
                </div>
              </div>
              {animeScore !== null && (
                <div className="self-start rounded-xl border border-gray-800 bg-card px-4 py-2 md:self-auto">
                  <div className="flex items-center gap-3">
                    <Star className="h-8 w-8 fill-current text-yellow-400" />
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold leading-none text-white">
                        {animeScore.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {anime.scored_by ? t.votes(formatCount(anime.scored_by)) : t.scoreLabel}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <section className="surface-float mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-800 bg-card p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400">
                  <Trophy className="h-4 w-4" /> {t.rank}
                </div>
                <div className="mt-1 text-xl font-semibold text-white">
                  {anime.rank ? `#${anime.rank}` : '—'}
                </div>
              </div>
              <div className="rounded-xl border border-gray-800 bg-card p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400">
                  <Flame className="h-4 w-4" /> {t.popularity}
                </div>
                <div className="mt-1 text-xl font-semibold text-white">
                  {anime.popularity ? `#${anime.popularity}` : '—'}
                </div>
              </div>
              <div className="rounded-xl border border-gray-800 bg-card p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400">
                  <Users className="h-4 w-4" /> {t.members}
                </div>
                <div className="mt-1 text-xl font-semibold text-white">{formatCount(anime.members)}</div>
              </div>
              <div className="rounded-xl border border-gray-800 bg-card p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400">
                  <Heart className="h-4 w-4" /> {t.favorites}
                </div>
                <div className="mt-1 text-xl font-semibold text-white">
                  {formatCount(anime.favorites)}
                </div>
              </div>
            </section>

            <section className="surface-float mb-10">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-white">{t.synopsis}</h2>
                {synopsisText.canTranslate && (
                  <button
                    type="button"
                    onClick={() => {
                      if (synopsisText.isTranslated) {
                        synopsisText.reset()
                        return
                      }
                      void synopsisText.translate()
                    }}
                    disabled={synopsisText.loading}
                    className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary transition-colors hover:bg-primary/20 disabled:cursor-wait disabled:opacity-60"
                  >
                    {synopsisText.isTranslated
                      ? t.showOriginal
                      : synopsisText.loading
                        ? t.autoTranslationLoading
                        : t.translateNow}
                  </button>
                )}
                {lang === 'vi' && synopsisBadge && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      synopsisText.isTranslated
                        ? 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                        : 'border border-amber-400/20 bg-amber-400/10 text-amber-100'
                    }`}
                  >
                    {synopsisBadge}
                  </span>
                )}
              </div>
              <div className="rounded-xl border border-gray-800 bg-card p-6">
                <MarkdownText className="leading-relaxed text-gray-300">
                  {synopsisText.text || t.originalTextFallback}
                </MarkdownText>
              </div>
            </section>

            {anime.background && (
              <section className="surface-float mb-10">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold text-white">{t.background}</h2>
                  {backgroundText.canTranslate && (
                    <button
                      type="button"
                      onClick={() => {
                        if (backgroundText.isTranslated) {
                          backgroundText.reset()
                          return
                        }
                        void backgroundText.translate()
                      }}
                      disabled={backgroundText.loading}
                      className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary transition-colors hover:bg-primary/20 disabled:cursor-wait disabled:opacity-60"
                    >
                      {backgroundText.isTranslated
                        ? t.showOriginal
                        : backgroundText.loading
                          ? t.autoTranslationLoading
                          : t.translateNow}
                    </button>
                  )}
                  {lang === 'vi' && backgroundBadge && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        backgroundText.isTranslated
                          ? 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                          : 'border border-amber-400/20 bg-amber-400/10 text-amber-100'
                      }`}
                    >
                      {backgroundBadge}
                    </span>
                  )}
                </div>
                <div className="rounded-xl border border-gray-800 bg-card p-6">
                  <MarkdownText className="leading-relaxed text-gray-300">
                    {backgroundText.text}
                  </MarkdownText>
                </div>
              </section>
            )}

            {anime.trailer_embed && (
              <section className="surface-float mb-10">
                <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
                  <PlayCircle className="h-6 w-6 text-primary" /> {t.trailer}
                </h2>
                <div className="aspect-video overflow-hidden rounded-xl border border-gray-800 bg-black">
                  <iframe
                    src={anime.trailer_embed}
                    title={`${anime.title} trailer`}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </section>
            )}

            {stats && (
              <section className="surface-float mb-10">
                <h2 className="mb-4 text-2xl font-bold text-white">{t.communityStats}</h2>
                <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
                  {[
                    { label: t.watching, value: stats.watching },
                    { label: t.completed, value: stats.completed },
                    { label: t.onHold, value: stats.on_hold },
                    { label: t.dropped, value: stats.dropped },
                    { label: t.planToWatch, value: stats.plan_to_watch },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-gray-800 bg-card p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-400">{item.label}</div>
                      <div className="mt-1 text-lg font-semibold text-white">{formatCount(item.value)}</div>
                    </div>
                  ))}
                </div>
                {scoreBreakdown.length > 0 && (
                  <div className="rounded-xl border border-gray-800 bg-card p-4">
                    <div className="mb-3 text-sm text-gray-400">{t.scoreDistribution}</div>
                    <div className="space-y-2">
                      {scoreBreakdown
                        .slice()
                        .sort((a, b) => b.score - a.score)
                        .map((bucket) => (
                          <div
                            key={bucket.score}
                            className="flex items-center gap-3 text-sm"
                            title={`${bucket.percentage}% (${bucket.votes} votes)`}
                          >
                            <span className="w-6 text-gray-400">{bucket.score}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
                              <div
                                className="h-full bg-gradient-to-r from-violet-500 to-pink-500"
                                style={{ width: `${bucket.percentage}%` }}
                              />
                            </div>
                            <span className="w-20 text-right text-gray-300">
                              {formatCount(bucket.votes)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {(anime.opening_themes?.length > 0 || anime.ending_themes?.length > 0) && (
              <section className="surface-float mb-10">
                <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
                  <Music2 className="h-6 w-6 text-primary" /> {t.opEdThemes}
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {anime.opening_themes?.length > 0 && (
                    <div className="rounded-xl border border-gray-800 bg-card p-4">
                      <div className="mb-2 text-sm text-gray-400">{t.openings}</div>
                      <ul className="space-y-1 text-sm text-gray-200">
                        {anime.opening_themes.map((theme: string, i: number) => (
                          <li key={`op-${i}`}>• {theme}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {anime.ending_themes?.length > 0 && (
                    <div className="rounded-xl border border-gray-800 bg-card p-4">
                      <div className="mb-2 text-sm text-gray-400">{t.endings}</div>
                      <ul className="space-y-1 text-sm text-gray-200">
                        {anime.ending_themes.map((theme: string, i: number) => (
                          <li key={`ed-${i}`}>• {theme}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}

            {anime.streaming && anime.streaming.length > 0 && (
              <section className="surface-float mb-10">
                <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
                  <Globe className="h-6 w-6 text-primary" /> {t.whereToWatch}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {anime.streaming.map((streaming: any) => (
                    <a
                      key={streaming.url}
                      href={streaming.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-gray-800 bg-card px-3 py-2 text-sm text-gray-200 transition-colors hover:border-primary"
                    >
                      {streaming.name}
                    </a>
                  ))}
                </div>
              </section>
            )}

            {anime.characters && anime.characters.length > 0 && (
              <section className="surface-float mb-10">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold text-white">{t.characters}</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={t.searchCharacter}
                      value={charSearch}
                      onChange={(e) => setCharSearch(e.target.value)}
                      aria-label={t.searchCharacter}
                      className="w-48 rounded-full border border-gray-700 bg-card py-2 pl-9 pr-8 text-sm text-white placeholder-gray-500 focus:border-primary focus:outline-none"
                    />
                    {charSearch && (
                      <button
                        type="button"
                        onClick={() => setCharSearch('')}
                        aria-label={t.clearSearch}
                        className="absolute right-2 top-2.5 text-gray-400 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {filteredCharacters.length === 0 ? (
                  <p className="py-8 text-center text-gray-400">{t.noCharFound}</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {anime.characters.map((char: any) => {
                      const match = filteredCharacters.some((item: any) => item.id === char.id)
                      return (
                        <ReloadLink
                          key={char.id}
                          to={`/character/${char.id}`}
                          className={`flex items-center gap-3 rounded-xl border bg-card p-3 transition-all ${
                            charSearch.trim()
                              ? match
                                ? 'border-primary opacity-100 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]'
                                : 'border-gray-800 opacity-30 hover:opacity-60'
                              : 'border-gray-800 opacity-100 hover:border-primary'
                          }`}
                        >
                          <img
                            src={char.image}
                            alt={char.name}
                            className="h-14 w-14 rounded-lg bg-gray-800 object-cover"
                            onError={(e) => {
                              e.currentTarget.style.visibility = 'hidden'
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate font-semibold text-gray-200">{char.name}</h4>
                            <span
                              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${
                                char.role === 'Main'
                                  ? 'bg-primary/20 text-primary'
                                  : 'bg-gray-700 text-gray-300'
                              }`}
                            >
                              {char.role === 'Main' ? t.main : t.supporting}
                            </span>
                          </div>
                          {char.voice_actor && (
                            <div className="flex max-w-[45%] items-center gap-2 border-l border-gray-800 pl-3">
                              {char.voice_actor.image && (
                                <img
                                  src={char.voice_actor.image}
                                  alt={char.voice_actor.name}
                                  className="h-10 w-10 rounded-lg bg-gray-800 object-cover"
                                />
                              )}
                              <div className="min-w-0">
                                <div className="text-xs text-gray-400">{t.cv}</div>
                                <div className="truncate text-xs text-gray-200">
                                  {char.voice_actor.name}
                                </div>
                              </div>
                            </div>
                          )}
                        </ReloadLink>
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {anime.relations && anime.relations.length > 0 && (
              <section className="surface-float mb-10">
                <h2 className="mb-4 text-2xl font-bold text-white">{t.relations}</h2>
                <div className="divide-y divide-gray-800 rounded-xl border border-gray-800 bg-card">
                  {anime.relations.map((rel: any, idx: number) => (
                    <div
                      key={`${rel.id}-${idx}`}
                      className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                    >
                      <span className="w-32 flex-shrink-0 text-gray-400">{rel.relation}</span>
                      {rel.type === 'anime' && rel.id ? (
                        <ReloadLink
                          to={`/anime/${rel.id}`}
                          className="flex-1 truncate text-primary hover:underline"
                        >
                          {rel.name}
                        </ReloadLink>
                      ) : (
                        <span className="flex-1 truncate text-gray-200">{rel.name}</span>
                      )}
                      <span className="text-xs uppercase text-gray-500">{rel.type}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {anime.related_anime && anime.related_anime.length > 0 && (
              <section className="surface-float mb-10">
                <h2 className="mb-4 text-2xl font-bold text-white">{t.youMayAlsoLike}</h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {anime.related_anime.map((related: any) => (
                    <AnimeCard
                      key={related.id}
                      anime={related}
                      onAuthRequired={() => setAuthOpen(true)}
                    />
                  ))}
                </div>
              </section>
            )}

            <CommentSection entityType="anime" entityId={anime.id} />
          </div>
        </div>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <SuggestEditModal
        open={suggestEditOpen}
        onClose={() => setSuggestEditOpen(false)}
        anime={{
          id: anime.id,
          title: anime.title,
          synopsis: anime.synopsis,
          trailer_url: anime.trailer_url,
        }}
      />
    </Layout>
  )
}
