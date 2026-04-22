import { useEffect, useState } from 'react'

/**
 * Anime-style loading screen with a 1→100% percentage counter.
 *
 * Used to replace boring skeleton screens with a more thematic experience.
 * Auto-completes around 95% if the underlying data hasn't arrived yet so the
 * user doesn't see "100%" while still waiting; the host page should unmount
 * this component once it actually has data.
 */
export default function AnimeLoader({ label }: { label?: string }) {
  const [pct, setPct] = useState(1)

  useEffect(() => {
    let cancelled = false
    let current = 1
    const tick = () => {
      if (cancelled) return
      // Ease-out: jump faster at first, slower as we approach 95%.
      const remaining = 95 - current
      if (remaining <= 0) return
      const step = Math.max(1, Math.round(remaining * 0.08))
      current = Math.min(95, current + step)
      setPct(current)
      window.setTimeout(tick, 80 + Math.random() * 60)
    }
    tick()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 bg-transparent">
      <div className="relative flex h-40 w-40 items-center justify-center">
        {/* outer rotating ring */}
        <div className="absolute inset-0 animate-[spin_2.4s_linear_infinite] rounded-full border-2 border-primary/20 border-t-primary" />
        {/* inner reverse ring */}
        <div className="absolute inset-3 animate-[spin_3.6s_linear_infinite_reverse] rounded-full border-2 border-pink-400/20 border-b-pink-400" />
        {/* glowing dot */}
        <div className="absolute inset-10 rounded-full bg-gradient-to-br from-primary/80 to-pink-500/80 shadow-[0_0_40px_8px_rgba(236,72,153,0.35)] blur-[2px]" />
        {/* percentage */}
        <div className="relative z-10 text-center">
          <span
            className="bg-gradient-to-r from-primary to-pink-400 bg-clip-text text-4xl font-extrabold tabular-nums text-transparent"
            aria-live="polite"
          >
            {pct}%
          </span>
        </div>
      </div>

      {/* progress bar */}
      <div className="h-1.5 w-64 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-primary via-pink-400 to-purple-400 transition-all duration-200 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="bg-gradient-to-r from-primary to-pink-400 bg-clip-text text-sm font-medium tracking-widest text-transparent uppercase">
        {label ?? 'Loading… please wait'}
      </p>

      <span className="text-xs text-gray-500">Powered by AniList × Jikan</span>
    </div>
  )
}
