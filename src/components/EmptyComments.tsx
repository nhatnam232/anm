import { useLangContext } from '@/providers/LangProvider'

/**
 * Friendly anime-themed "no comments yet" illustration.
 * Inline SVG of a chibi cat-girl character holding a microphone, sitting on a
 * speech bubble — playful and on-brand.
 */
export default function EmptyComments() {
  const { t } = useLangContext()
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card/30 px-6 py-12 text-center">
      <Illustration />
      <div>
        <p className="text-base font-semibold text-text">{t.noCommentsTitle}</p>
        <p className="mt-1 max-w-xs text-sm text-text-muted">{t.beTheFirstToComment}</p>
      </div>
    </div>
  )
}

function Illustration() {
  return (
    <svg
      viewBox="0 0 200 180"
      width={180}
      height={160}
      role="img"
      aria-label="Anime character with microphone"
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id="bub-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="hair-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <radialGradient id="cheek-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fda4af" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#fda4af" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Speech bubble pedestal */}
      <g>
        <ellipse cx="100" cy="155" rx="70" ry="14" fill="#0f172a" opacity="0.18" />
        <path
          d="M40 135 Q 40 110 70 110 L 130 110 Q 160 110 160 135 Q 160 158 130 158 L 80 158 L 65 168 L 70 158 Q 40 158 40 135 Z"
          fill="url(#bub-grad)"
        />
        {/* Three dots inside bubble */}
        <circle cx="80" cy="135" r="4" fill="white" />
        <circle cx="100" cy="135" r="4" fill="white" />
        <circle cx="120" cy="135" r="4" fill="white" />
      </g>

      {/* Character body */}
      <g transform="translate(60 18)">
        {/* shadow under body */}
        <ellipse cx="40" cy="100" rx="28" ry="6" fill="#0f172a" opacity="0.22" />

        {/* Sweater */}
        <path
          d="M22 78 Q 22 70 40 70 Q 58 70 58 78 L 58 98 Q 58 102 54 102 L 26 102 Q 22 102 22 98 Z"
          fill="#7c3aed"
        />
        <path d="M28 78 L 28 100 M52 78 L 52 100" stroke="#5b21b6" strokeWidth="1" opacity="0.6" />

        {/* Microphone */}
        <g transform="translate(58 50) rotate(20)">
          <rect x="-3" y="0" width="6" height="22" rx="2" fill="#475569" />
          <ellipse cx="0" cy="0" rx="6" ry="9" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
          <path d="M-4 -3 L4 -3 M-4 0 L4 0 M-4 3 L4 3" stroke="#475569" strokeWidth="0.7" />
        </g>

        {/* Arm holding mic */}
        <path
          d="M48 76 Q 56 60 60 52"
          stroke="#7c3aed"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />

        {/* Head */}
        <circle cx="40" cy="42" r="22" fill="#fef3c7" />
        {/* Hair back */}
        <path
          d="M16 38 Q 18 18 40 16 Q 62 18 64 38 Q 64 28 56 22 Q 50 18 40 18 Q 30 18 24 22 Q 16 28 16 38 Z"
          fill="url(#hair-grad)"
        />
        {/* Cat ears */}
        <path d="M22 22 L18 8 L30 16 Z" fill="url(#hair-grad)" />
        <path d="M58 22 L62 8 L50 16 Z" fill="url(#hair-grad)" />
        <path d="M22 18 L20 10 L26 14 Z" fill="#fda4af" />
        <path d="M58 18 L60 10 L54 14 Z" fill="#fda4af" />
        {/* Hair fringe */}
        <path
          d="M19 36 Q 22 26 30 26 Q 34 26 36 32 Q 38 28 42 28 Q 50 28 52 38 Q 50 32 42 33 Q 38 38 32 36 Q 26 38 19 36 Z"
          fill="url(#hair-grad)"
        />

        {/* Cheeks */}
        <ellipse cx="30" cy="48" rx="4" ry="2.4" fill="url(#cheek-grad)" />
        <ellipse cx="50" cy="48" rx="4" ry="2.4" fill="url(#cheek-grad)" />

        {/* Eyes (closed happy) */}
        <path
          d="M28 42 Q 31 39 34 42"
          stroke="#1e293b"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M46 42 Q 49 39 52 42"
          stroke="#1e293b"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />

        {/* Mouth — "o" of singing */}
        <ellipse cx="40" cy="52" rx="2.5" ry="3.5" fill="#9f1239" />
        <ellipse cx="40" cy="50" rx="1.2" ry="1.4" fill="#fda4af" />

        {/* Music notes */}
        <g fill="#a78bfa">
          <circle cx="-4" cy="32" r="2.5" />
          <rect x="-2" y="18" width="1.5" height="14" />
          <path d="M-0.5 18 L 4 20 L 4 22 L -0.5 20 Z" />
        </g>
        <g fill="#ec4899">
          <circle cx="76" cy="40" r="2" />
          <rect x="78" y="28" width="1.2" height="12" />
        </g>
      </g>
    </svg>
  )
}
