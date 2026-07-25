import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

/**
 * Custom language indicator — replaces the OS flag emoji with a hand-drawn
 * SVG that contains a globe + the current language code (VI / EN). This stays
 * visually consistent across Windows, macOS and Android browsers (where flag
 * emojis sometimes render as just letters).
 */
export function LangIcon({
  lang,
  size = 22,
  active = false,
}: {
  lang: Lang
  size?: number
  /** Draws the teal pulse ring — set while the switcher is mid-flip. */
  active?: boolean
}) {
  const code = lang === 'vi' ? 'VI' : 'EN'
  const accent = lang === 'vi' ? '#ef4444' : '#0ea5e9' // red vs blue accent
  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      role="img"
      aria-label={code}
      className="flex-shrink-0 overflow-visible"
    >
      <defs>
        <linearGradient id={`lang-${lang}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1f2937" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      {/* Expanding ring on toggle. Rendered first so it sits behind the globe. */}
      {active && (
        <circle
          cx="18"
          cy="18"
          r="17"
          fill="none"
          stroke="#14b8a6"
          strokeWidth="2"
          opacity="0"
        >
          <animate attributeName="r" from="15" to="24" dur="520ms" fill="freeze" />
          <animate attributeName="opacity" values="0;0.8;0" dur="520ms" fill="freeze" />
        </circle>
      )}
      <circle cx="18" cy="18" r="17" fill={`url(#lang-${lang}-bg)`} stroke={accent} strokeWidth="1.5" />
      {/* meridian/equator lines */}
      <ellipse cx="18" cy="18" rx="17" ry="7" fill="none" stroke={accent} strokeOpacity="0.35" strokeWidth="0.8" />
      <line x1="18" y1="1" x2="18" y2="35" stroke={accent} strokeOpacity="0.25" strokeWidth="0.8" />
      {/* code letters */}
      <text
        x="18"
        y="22"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, Inter, sans-serif"
        fontWeight="800"
        fontSize="12"
        fill="#ffffff"
        style={{ paintOrder: 'stroke' }}
        stroke="#0f172a"
        strokeWidth="0.5"
      >
        {code}
      </text>
    </svg>
  )
}

type Props = {
  lang: Lang
  label: string
  compact?: boolean
  onClick: () => void
}

const FLIP_MS = 520

export default function LangSwitcher({ lang, label, compact = false, onClick }: Props) {
  const [flipping, setFlipping] = useState(false)
  const timer = useRef<number | null>(null)

  // This component is mounted in both the desktop navbar and the mobile
  // drawer. Closing the drawer mid-flip would otherwise leave a pending
  // setState pointed at an unmounted tree.
  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [])

  const handleClick = () => {
    setFlipping(true)
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setFlipping(false), FLIP_MS)
    onClick()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={label}
      className="group relative flex items-center gap-1.5 overflow-hidden rounded-full border border-gray-700 bg-background/70 px-2.5 py-1.5 text-sm text-gray-200 transition-all duration-300 hover:border-primary hover:text-white hover:shadow-[0_0_18px_-4px_rgb(var(--color-primary))] active:scale-95"
    >
      {/* Sheen sweep on hover. Pure transform so it stays off the paint path. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
      />

      {/* Teal wash that fades in under the content on hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-primary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <span
        className={`relative z-10 inline-flex [perspective:400px] ${
          flipping ? '' : 'transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110'
        }`}
      >
        <span className={`inline-flex ${flipping ? 'lang-flip' : ''}`}>
          <LangIcon lang={lang} size={20} active={flipping} />
        </span>
      </span>

      {!compact && (
        // `key` forces a remount on language change so the fade replays.
        <span key={lang} className="lang-label-in relative z-10 hidden text-xs sm:inline">
          {label}
        </span>
      )}

      <ChevronDown className="relative z-10 h-3.5 w-3.5 text-gray-400 transition-all duration-300 group-hover:translate-y-0.5 group-hover:text-primary" />
    </button>
  )
}
