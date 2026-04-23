type LogoProps = {
  size?: number
  showWordmark?: boolean
  className?: string
}

/**
 * Anime Wiki brand logo.
 *
 * Design: rounded violet→fuchsia→pink gradient tile carrying a clean
 * "AW" monogram rendered as `<text>` (browser font, not custom path) so
 * the letters always render crisply at any size and never overflow the
 * tile — the previous hand-drawn path was clipping outside the bg in
 * dense layouts.
 *
 * The wordmark next to it ("Anime Wiki") uses the same gradient on
 * "Anime" so the lockup feels cohesive even when the icon is shrunk.
 */
export default function Logo({ size = 32, showWordmark = true, className = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Anime Wiki logo"
      >
        <defs>
          <linearGradient id="anmBgGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="55%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>

        {/* Tile background + soft inner highlight */}
        <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#anmBgGrad)" />
        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="14"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.22"
          strokeWidth="1.25"
        />

        {/* "AW" monogram — uses <text> with `textLength` so it ALWAYS fits
            the tile no matter the host font. `lengthAdjust="spacingAndGlyphs"`
            squeezes the glyph widths if the OS font is wider than expected. */}
        <text
          x="32"
          y="44"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
          fontSize="34"
          fontWeight="900"
          fontStyle="italic"
          fill="#ffffff"
          letterSpacing="-2"
          textLength="40"
          lengthAdjust="spacingAndGlyphs"
        >
          AW
        </text>

        {/* Sparkle accent — tiny dot bottom-right, evokes "wiki spark of knowledge" */}
        <circle cx="51" cy="51" r="3" fill="#fde68a" />
        <circle cx="51" cy="51" r="1.2" fill="#fffbeb" />
      </svg>
      {showWordmark && (
        <span className="flex items-baseline gap-1 text-base font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            Anime
          </span>
          <span className="text-text">Wiki</span>
        </span>
      )}
    </span>
  )
}
