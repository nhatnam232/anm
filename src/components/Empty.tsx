import { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

type EmptyProps = {
  /** Icon shown above the title. Defaults to a neutral inbox glyph. */
  icon?: ReactNode
  title: string
  description?: string
  /** Optional CTA — a button or <ReloadLink>. */
  action?: ReactNode
  className?: string
}

/**
 * Shared empty state.
 *
 * This file used to be the scaffold stub that shipped with the project
 * template — it rendered the literal string "Empty" and was imported nowhere,
 * while every page hand-rolled its own empty markup (PersonalLibrary, Profile,
 * CollectionsPage...). That is why an empty library looks different from an
 * empty comment thread.
 *
 * The design deliberately matches EmptyComments: same card treatment, same
 * muted body text, so the two can sit on the same page without clashing.
 *
 * An empty state without an `action` is a dead end, so callers are strongly
 * encouraged to pass one ("Browse anime", "Clear filters").
 */
export default function Empty({
  icon,
  title,
  description,
  action,
  className,
}: EmptyProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card/30 px-6 py-16 text-center',
        className,
      )}
    >
      <div className="text-primary/60">
        {icon ?? <Inbox className="h-10 w-10" />}
      </div>

      <h3 className="text-lg font-semibold text-text">{title}</h3>

      {description ? (
        <p className="max-w-sm text-sm leading-relaxed text-text-muted">{description}</p>
      ) : null}

      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
