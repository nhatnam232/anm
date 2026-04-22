import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Calendar, Film, Flame, Heart, Languages, Loader2, ShieldAlert, Star, Tv, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLangContext } from '@/providers/LangProvider'
import { localizeStatus } from '@/lib/formatters'
import { useManualTranslation } from '@/hooks/useManualTranslation'
import { MarkdownText } from '@/lib/markdown'

export type AnimePreview = {
  id: number
  title: string
  cover_image: string
  banner_image?: string | null
  score?: number | string | null
  episodes?: number | string | null
  status?: string | null
  synopsis?: string | null
  genres?: string[] | null
  type?: string | null
  popularity?: number | null
  isAdult?: boolean | null
  members?: number | null
  season?: string | null
}

type Props = {
  anime: AnimePreview | null
  open: boolean
  onClose: () => void
}

/**
 * Anime quick-preview modal. Click an AnimeCard → see core info instantly,
 * with badges (Top Rated / Trending / Movie / NSFW) and a "View details" CTA
 * that navigates to the full detail page.
 */
export default function AnimePreviewModal({ anime, open, onClose }: Props) {
  const { lang } = useLangContext()
  const navigate = useNavigate()
  const synopsisTr = useManualTranslation(anime?.synopsis ?? '', lang)

  // Lock body scroll while modal is open + ESC to close.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!anime) return null

  const score = typeof anime.score === 'number' ? anime.score : Number(anime.score) || null
  const episodes = typeof anime.episodes === 'number' ? anime.episodes : Number(anime.episodes) || null

  const badges: Array<{ icon: any; label: string; tone: string }> = []
  if (score && score >= 8.5) {
    badges.push({
      icon: Star,
      label: lang === 'vi' ? 'Điểm cao' : 'Top Rated',
      tone: 'bg-yellow-500/20 text-yellow-200 border-yellow-400/40',
    })
  }
  if (anime.popularity && anime.popularity <= 50) {
    badges.push({
      icon: Flame,
      label: lang === 'vi' ? 'Trending' : 'Trending',
      tone: 'bg-orange-500/20 text-orange-200 border-orange-400/40',
    })
  }
  const t_ = (anime.type ?? '').toUpperCase()
  if (t_ === 'MOVIE') {
    badges.push({
      icon: Film,
      label: 'Movie',
      tone: 'bg-purple-500/20 text-purple-200 border-purple-400/40',
    })
  }
  if (anime.status === 'Ongoing') {
    badges.push({
      icon: Calendar,
      label: lang === 'vi' ? 'Đang phát' : 'Airing',
      tone: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
    })
  }
  if (anime.isAdult) {
    badges.push({
      icon: ShieldAlert,
      label: 'NSFW',
      tone: 'bg-red-500/20 text-red-200 border-red-400/40',
    })
  }

  const goDetail = () => {
    onClose()
    navigate(`/anime/${anime.id}`)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close preview"
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl"
          >
            {/* Banner */}
            <div className="relative h-44 w-full overflow-hidden sm:h-56">
              {anime.banner_image || anime.cover_image ? (
                <img
                  src={anime.banner_image || anime.cover_image}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-primary/30 via-fuchsia-500/20 to-pink-500/20" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/60 p-2 text-gray-200 backdrop-blur transition-colors hover:bg-black/80 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="absolute inset-x-0 bottom-0 px-5 pb-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-primary/80">
                  #{anime.id}
                </p>
                <h2 className="mt-1 line-clamp-2 text-2xl font-extrabold text-white sm:text-3xl">
                  {anime.title}
                </h2>
              </div>
            </div>

            {/* Body */}
            <div className="grid gap-4 px-5 py-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-5">
              <div className="hidden sm:block">
                {anime.cover_image && (
                  <img
                    src={anime.cover_image}
                    alt={anime.title}
                    className="aspect-[3/4] w-full rounded-xl border border-white/10 object-cover shadow-lg"
                    onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                  />
                )}
              </div>

              <div className="min-w-0 space-y-3">
                {/* Quick stats */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {score !== null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-1 text-yellow-200">
                      <Star className="h-3 w-3 fill-current" />
                      {score.toFixed(2)}
                    </span>
                  )}
                  {episodes !== null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-gray-200">
                      <Tv className="h-3 w-3" />
                      {episodes} {lang === 'vi' ? 'tập' : 'eps'}
                    </span>
                  )}
                  {anime.season && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-gray-200">
                      <Calendar className="h-3 w-3" />
                      {anime.season}
                    </span>
                  )}
                  {anime.status && (
                    <span className="rounded-full bg-white/5 px-2 py-1 text-gray-200">
                      {localizeStatus(anime.status, lang)}
                    </span>
                  )}
                  {typeof anime.members === 'number' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-gray-200">
                      <Heart className="h-3 w-3" />
                      {anime.members.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Badges */}
                {badges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {badges.map((b, i) => {
                      const Icon = b.icon
                      return (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${b.tone}`}
                        >
                          <Icon className="h-3 w-3" />
                          {b.label}
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Genres */}
                {anime.genres && anime.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {anime.genres.slice(0, 6).map((g) => (
                      <span
                        key={g}
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-gray-300"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {/* Synopsis with translate toggle */}
                {anime.synopsis && (
                  <div>
                    {synopsisTr.canTranslate && (
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (synopsisTr.isTranslated) {
                              synopsisTr.reset()
                              return
                            }
                            void synopsisTr.translate()
                          }}
                          disabled={synopsisTr.loading}
                          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] text-primary transition-colors hover:bg-primary/20 disabled:cursor-wait disabled:opacity-60"
                        >
                          {synopsisTr.loading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Languages className="h-3 w-3" />
                          )}
                          {synopsisTr.isTranslated
                            ? lang === 'vi'
                              ? 'Xem bản gốc'
                              : 'Show original'
                            : synopsisTr.loading
                              ? lang === 'vi'
                                ? 'Đang dịch...'
                                : 'Translating...'
                              : lang === 'vi'
                                ? 'Dịch sang tiếng Việt'
                                : 'Translate to Vietnamese'}
                        </button>
                        {synopsisTr.isTranslated && (
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-200">
                            {lang === 'vi' ? 'Bản dịch tiếng Việt' : 'Vietnamese'}
                          </span>
                        )}
                        {synopsisTr.unavailable && !synopsisTr.isTranslated && (
                          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-200">
                            {lang === 'vi' ? 'Tạm thời chưa dịch được' : 'Translation unavailable'}
                          </span>
                        )}
                      </div>
                    )}
                    <MarkdownText className="line-clamp-5 text-sm leading-relaxed text-gray-300">
                      {synopsisTr.text || anime.synopsis}
                    </MarkdownText>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-white/[0.02] px-5 py-3 backdrop-blur">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5"
              >
                {lang === 'vi' ? 'Đóng' : 'Close'}
              </button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={goDetail}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-pink-500 px-5 py-1.5 text-sm font-semibold text-white shadow-lg shadow-primary/30"
              >
                {lang === 'vi' ? 'Xem chi tiết' : 'View details'}
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
