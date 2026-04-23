import { Link } from 'react-router-dom'
import { BookMarked, ExternalLink } from 'lucide-react'
import {
  findCharacterByAnilistId,
  findStoryByAnilistAnimeId,
} from '@/wiki/registry'

type Props = {
  /** Pass exactly ONE of these. */
  anilistCharacterId?: number | null
  anilistAnimeId?: number | null
  /** Compact = pill button, full = labelled card. */
  variant?: 'compact' | 'full'
  className?: string
}

/**
 * Reusable badge the **main app** drops into character / anime detail pages.
 * If the registry knows about the entity, render a "Tìm hiểu thêm tại
 * Fandom Wiki ↗" link. Otherwise renders nothing — no "no data" noise.
 *
 * Place it anywhere — doesn't have to live near the Wiki module.
 */
export default function WikiCrosslinkBadge({
  anilistCharacterId,
  anilistAnimeId,
  variant = 'compact',
  className = '',
}: Props) {
  const char = anilistCharacterId
    ? findCharacterByAnilistId(anilistCharacterId)
    : null
  const story = anilistAnimeId ? findStoryByAnilistAnimeId(anilistAnimeId) : null

  if (!char && !story) return null

  const href = char ? `/wiki/character/${char.id}` : `/wiki/story/${story!.id}`
  const label = char
    ? `Xem ${char.name} trên Fandom Wiki`
    : `Xem ${story!.title} trên Fandom Wiki`

  if (variant === 'compact') {
    return (
      <Link
        to={href}
        className={`inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/25 ${className}`}
      >
        <BookMarked className="h-3.5 w-3.5" />
        Fandom Wiki
        <ExternalLink className="h-3 w-3 opacity-70" />
      </Link>
    )
  }

  return (
    <Link
      to={href}
      className={`flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3 transition-colors hover:border-primary/60 ${className}`}
    >
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <BookMarked className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Fandom Wiki
        </p>
        <p className="truncate text-sm font-medium text-text">{label}</p>
      </div>
      <ExternalLink className="h-4 w-4 flex-shrink-0 text-text-muted" />
    </Link>
  )
}
