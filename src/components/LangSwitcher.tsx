import { ChevronDown } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

/**
 * Custom language indicator — replaces the OS flag emoji with a hand-drawn
 * SVG that contains a globe + the current language code (VI / EN). This stays
 * visually consistent across Windows, macOS and Android browsers (where flag
 * emojis sometimes render as just letters).
 */
export function LangIcon({ lang, size = 22 }: { lang: Lang; size?: number }) {
  const code = lang === 'vi' ? 'VI' : 'EN'
  const accent = lang === 'vi' ? '#ef4444' : '#0ea5e9' // red vs blue accent
  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      role="img"
      aria-label={code}
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id={`lang-${lang}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1f2937" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
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

export default function LangSwitcher({ lang, label, compact = false, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="flex items-center gap-1.5 rounded-full border border-gray-700 bg-background/70 px-2.5 py-1.5 text-sm text-gray-200 transition-all hover:border-primary hover:text-white"
    >
      <LangIcon lang={lang} size={20} />
      {!compact && <span className="hidden text-xs sm:inline">{label}</span>}
      <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
    </button>
  )
}
