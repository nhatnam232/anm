import { useId } from 'react'

type LogoProps = {
  size?: number
  showWordmark?: boolean
  className?: string
}

/**
 * Anime Wiki brand logo.
 *
 * Concept: an open book hinged against a play triangle. The left half is a
 * page leaf in perspective, the right half is a play button — "a wiki about
 * anime" stated in one shape instead of initials.
 *
 * Replaces the old "AW" monogram tile. Monograms only work once a brand is
 * recognisable enough that the letters mean something; before that they're
 * just two letters in a box, and this one was also carrying the violet→pink
 * gradient that the teal palette retired.
 *
 * Everything is geometry — no <text>, so there's no dependence on host fonts
 * and no reflow risk. The spine gap stays open at small sizes because it's a
 * real 2px gap rather than a stroke that would round away.
 *
 * The gradient IDs are `useId`-scoped: the navbar and the mobile drawer both
 * mount a Logo, and duplicate SVG defs IDs make the second instance inherit
 * the first one's fill.
 */
export default function Logo({ size = 32, showWordmark = true, className = '' }: LogoProps) {
  const uid = useId().replace(/:/g, '')
  const tileGrad = `logo-tile-${uid}`
  const playGrad = `logo-play-${uid}`

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Anime Wiki"
      >
        <defs>
          <linearGradient id={tileGrad} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0f766e" />
            <stop offset="52%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id={playGrad} x1="34" y1="20" x2="54" y2="46" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#ccfbf1" />
          </linearGradient>
        </defs>

        {/* Tile */}
        <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#${tileGrad})`} />
        {/* Top-edge highlight — sells the tile as a physical surface rather
            than a flat swatch, and survives being scaled down to a favicon. */}
        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="16"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.25"
          strokeWidth="1.25"
        />

        {/* Left: page leaf in perspective. The outer edge is lower than the
            spine edge, which is what makes it read as a page lying open
            rather than a plain trapezoid. */}
        <path
          d="M12 21.5 L30 25 L30 45.5 L12 49 Z"
          fill="#ffffff"
          fillOpacity="0.92"
        />
        {/* Two text rules on the leaf. Angled to follow the page skew. */}
        <path
          d="M16.5 29.6 L26 31.4"
          stroke="#0f766e"
          strokeOpacity="0.45"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M16.5 35.3 L23 36.6"
          stroke="#0f766e"
          strokeOpacity="0.32"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Right: play triangle, rounded so it matches the tile radius
            language instead of looking like a sharp media-player glyph. */}
        <path
          d="M35.5 23.2 C35.5 21.8 37 21 38.2 21.7 L52 30.9 C53.1 31.6 53.1 33.2 52 33.9 L38.2 45.3 C37 46 35.5 45.2 35.5 43.8 Z"
          fill={`url(#${playGrad})`}
        />

        {/* Spark — four-point star, the "new edit" beat. Sits in the corner
            negative space so it never crowds the mark. */}
        <path
          d="M49.5 48 C49.5 51 50.5 52 53.5 52 C50.5 52 49.5 53 49.5 56 C49.5 53 48.5 52 45.5 52 C48.5 52 49.5 51 49.5 48 Z"
          fill="#fef3c7"
        />
      </svg>

      {showWordmark && (
        <span className="flex items-baseline gap-1 text-base font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-teal-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
            Anime
          </span>
          <span className="text-text">Wiki</span>
        </span>
      )}
    </span>
  )
}
