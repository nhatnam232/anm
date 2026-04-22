import { useState } from 'react'
import { Heart, Star } from 'lucide-react'
import { useAnimeLike } from '@/hooks/useAnimeLike'
import { useLangContext } from '@/providers/LangProvider'
import { cleanEpisodeCount, cleanScore, localizeStatus } from '@/lib/formatters'
import AnimePreviewModal, { type AnimePreview } from '@/components/AnimePreviewModal'

interface AnimeCardProps {
  anime: {
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
  onAuthRequired?: () => void
}

export default function AnimeCard({ anime, onAuthRequired }: AnimeCardProps) {
  const { t, lang } = useLangContext()
  const [previewOpen, setPreviewOpen] = useState(false)
  const safeScore = cleanScore(anime.score)
  const safeEpisodes = cleanEpisodeCount(anime.episodes)

  const like = useAnimeLike({
    id: anime.id,
    title: anime.title,
    cover_image: anime.cover_image,
    score: safeScore ?? 0,
    episodes: safeEpisodes ?? 0,
    status: anime.status ?? t.unknown,
  })
  const favorite = like.liked

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (like.requiresAuth) {
      onAuthRequired?.()
      return
    }
    void like.toggle()
  }

  const statusLabel = localizeStatus(anime.status, lang)
  const statusColor =
    anime.status === 'Ongoing' || anime.status === 'Airing' || anime.status === 'Currently Airing'
      ? 'bg-green-500/80'
      : anime.status === 'Upcoming' || anime.status === 'Not yet aired'
        ? 'bg-amber-500/80'
        : 'bg-black/60'

  // Quick badges shown on the card itself.
  const cardBadges: Array<{ label: string; tone: string }> = []
  if (safeScore !== null && safeScore >= 8.5) {
    cardBadges.push({ label: '⭐', tone: 'bg-yellow-500/80 text-white' })
  }
  if (typeof anime.popularity === 'number' && anime.popularity <= 50) {
    cardBadges.push({ label: '🔥', tone: 'bg-orange-500/80 text-white' })
  }
  if ((anime.type ?? '').toUpperCase() === 'MOVIE') {
    cardBadges.push({ label: '🎬', tone: 'bg-purple-500/80 text-white' })
  }
  if (anime.isAdult) {
    cardBadges.push({ label: '18+', tone: 'bg-red-500/85 text-white' })
  }

  return (
    <>
    <button
      type="button"
      onClick={() => setPreviewOpen(true)}
      className="group relative block w-full overflow-hidden rounded-xl bg-card text-left shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={anime.cover_image}
          alt={anime.title}
          className="h-full w-full object-cover"
          loading="lazy"
          width={225}
          height={318}
          onError={(e) => {
            e.currentTarget.style.visibility = 'hidden'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {anime.status && (
          <div className={`absolute left-2 top-2 rounded px-2 py-1 text-xs font-medium text-white backdrop-blur-sm ${statusColor}`}>
            {statusLabel}
          </div>
        )}

        {/* Quick badges (right side, vertical stack) */}
        {cardBadges.length > 0 && (
          <div className="absolute right-2 top-12 z-10 flex flex-col gap-1">
            {cardBadges.map((b, i) => (
              <span
                key={i}
                className={`inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md px-1 text-[11px] font-bold backdrop-blur-sm ${b.tone}`}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}

        {/* AniList ID badge — handy for power users / debugging */}
        <div className="absolute bottom-2 left-2 z-10 rounded-md border border-white/10 bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-gray-200 backdrop-blur-sm">
          #{anime.id}
        </div>

        <button
          onClick={toggleFavorite}
          disabled={like.busy}
          className="absolute right-2 top-2 z-10 rounded-full bg-black/40 p-2 backdrop-blur-sm transition-colors hover:bg-primary/80 disabled:opacity-60"
          aria-label={favorite ? t.liked : t.like}
        >
          <Heart className={`h-4 w-4 ${favorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
        </button>

        <div className="absolute bottom-0 left-0 right-0 z-10 translate-y-full p-4 transition-transform duration-300 group-hover:translate-y-0">
          <div className="mb-1 flex items-center gap-2 text-sm text-gray-300">
            {safeScore !== null && (
              <span className="flex items-center gap-1 text-yellow-400">
                <Star className="h-4 w-4 fill-current" />
                {safeScore.toFixed(1)}
              </span>
            )}
            {safeScore !== null && safeEpisodes !== null ? <span>•</span> : null}
            {safeEpisodes !== null ? (
              <span>{safeEpisodes} {lang === 'vi' ? 'tập' : t.episodesShort}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-3">
        <h3 className="line-clamp-1 font-semibold text-white transition-colors group-hover:text-primary">
          {anime.title}
        </h3>
      </div>
    </button>

    <AnimePreviewModal
      anime={anime as AnimePreview}
      open={previewOpen}
      onClose={() => setPreviewOpen(false)}
    />
    </>
  )
}
