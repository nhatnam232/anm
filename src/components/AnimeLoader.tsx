/**
 * Layout-shaped loading placeholder.
 *
 * Named `AnimeLoader` for history — it used to be the spinning percentage
 * counter. That moved to `BootLoader` and this became a skeleton, because a
 * spinner on a route whose layout we already know throws that layout away:
 * the page goes blank, then snaps into shape when data lands. A skeleton
 * holds the shape, so nothing jumps.
 *
 * The prop signature is deliberately unchanged (`label` is now announced to
 * screen readers instead of drawn) so existing call sites kept working
 * without edits.
 *
 * Shimmer comes from the `.skeleton` class in `src/index.css`, which is a
 * single compositor-friendly transform rather than `animate-pulse` — pulse
 * repaints the full area of every block, which gets expensive across a grid.
 */

type Variant = 'detail' | 'grid'

function CardSkeleton() {
  return (
    <div className="space-y-2">
      <div className="skeleton aspect-[2/3] w-full rounded-xl" />
      <div className="skeleton h-3.5 w-11/12" />
      <div className="skeleton h-3 w-2/3" />
    </div>
  )
}

function CardGrid({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

export default function AnimeLoader({
  label,
  variant = 'detail',
}: {
  label?: string
  variant?: Variant
}) {
  return (
    <div
      className="w-full"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Visually redundant next to the skeleton, but the skeleton is
          invisible to assistive tech — this is the only announcement. */}
      <span className="sr-only">{label ?? 'Loading…'}</span>

      {variant === 'grid' ? (
        <div className="space-y-6">
          <div className="skeleton h-8 w-56 rounded-lg" />
          <CardGrid count={18} />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Hero banner */}
          <div className="skeleton h-44 w-full rounded-2xl sm:h-60" />

          {/* Poster + metadata column */}
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="skeleton h-64 w-44 flex-shrink-0 self-center rounded-xl sm:self-start" />

            <div className="flex-1 space-y-4">
              <div className="skeleton h-8 w-3/4 rounded-lg" />
              <div className="skeleton h-4 w-1/2" />

              {/* Genre chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {['w-16', 'w-20', 'w-14', 'w-24'].map((w) => (
                  <div key={w} className={`skeleton h-6 rounded-full ${w}`} />
                ))}
              </div>

              {/* Synopsis lines. Last one is short so the block reads as a
                  paragraph rather than a filled rectangle. */}
              <div className="space-y-2 pt-2">
                <div className="skeleton h-3.5 w-full" />
                <div className="skeleton h-3.5 w-full" />
                <div className="skeleton h-3.5 w-11/12" />
                <div className="skeleton h-3.5 w-4/5" />
                <div className="skeleton h-3.5 w-2/5" />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <div className="skeleton h-10 w-32 rounded-xl" />
                <div className="skeleton h-10 w-10 rounded-xl" />
              </div>
            </div>
          </div>

          {/* Related titles rail */}
          <div className="space-y-4">
            <div className="skeleton h-6 w-48 rounded-lg" />
            <CardGrid count={6} />
          </div>
        </div>
      )}
    </div>
  )
}
