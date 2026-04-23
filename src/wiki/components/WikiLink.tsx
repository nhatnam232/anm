import { Link } from 'react-router-dom'
import * as HoverCard from '@radix-ui/react-hover-card'
import { ArrowUpRight, BookOpen } from 'lucide-react'
import { getCharacter, getStory } from '@/wiki/registry'

type Props = {
  /** Slug of the target wiki entity (character first, falls back to story). */
  targetId: string
  /** Visible link text — usually the character/story display name. */
  label: string
  /** Override the className when used inside main app vs inside wiki body. */
  className?: string
}

/**
 * Inline link that renders the target's name styled as a wiki link, plus
 * a Radix HoverCard preview on hover with the avatar + 1-2 line bio.
 *
 * - Inside the wiki itself: links to `/wiki/character/:id` or `/wiki/story/:id`.
 * - Inside the main app: same behaviour — clicking takes the user out to
 *   the wiki sub-app (no full-page reload thanks to react-router).
 *
 * If the targetId doesn't resolve in the registry the link gracefully
 * degrades to a plain underlined span (so missing wiki entries don't break
 * the prose).
 */
export default function WikiLink({ targetId, label, className }: Props) {
  const char = getCharacter(targetId)
  const story = !char ? getStory(targetId) : null
  const target = char ?? story

  if (!target) {
    return (
      <span
        className="cursor-help underline decoration-dotted decoration-text-muted/40 underline-offset-2"
        title={`Wiki entry "${targetId}" not found`}
      >
        {label}
      </span>
    )
  }

  const href = char
    ? `/wiki/character/${char.id}`
    : `/wiki/story/${story!.id}`
  const previewBio = char ? char.shortBio : story!.shortSummary

  return (
    <HoverCard.Root openDelay={150} closeDelay={120}>
      <HoverCard.Trigger asChild>
        <Link
          to={href}
          className={
            className ??
            'inline-flex items-center gap-0.5 text-primary underline decoration-primary/40 decoration-dotted underline-offset-2 transition-colors hover:text-primary-hover hover:decoration-solid'
          }
        >
          {label}
          <ArrowUpRight className="h-3 w-3 opacity-60" aria-hidden />
        </Link>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="top"
          sideOffset={6}
          align="center"
          className="z-[200] w-72 overflow-hidden rounded-2xl border border-border bg-card text-text shadow-2xl"
        >
          <div className="flex gap-3 p-3">
            {char ? (
              <img
                src={char.avatarUrl}
                alt=""
                className="h-16 w-12 flex-shrink-0 rounded-md object-cover"
                onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
              />
            ) : story?.coverUrl ? (
              <img
                src={story.coverUrl}
                alt=""
                className="h-16 w-12 flex-shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-16 w-12 flex-shrink-0 items-center justify-center rounded-md bg-surface text-text-muted">
                <BookOpen className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text">
                {char ? char.name : story?.title}
              </p>
              <p className="mt-0.5 text-[11px] uppercase tracking-widest text-text-muted">
                {char ? 'Character' : 'Story / Lore'}
              </p>
              <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-text-muted">
                {previewBio.replace(/\[\[([^\]|]+)\|[^\]]+\]\]/g, '$1')}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border bg-surface/40 px-3 py-2">
            <span className="text-[10px] uppercase tracking-widest text-text-muted">Wiki</span>
            <Link
              to={href}
              className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/25"
            >
              Open page →
            </Link>
          </div>
          <HoverCard.Arrow className="fill-card" />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  )
}
