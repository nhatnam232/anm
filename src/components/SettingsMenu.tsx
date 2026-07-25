import { useEffect, useId, useRef, useState } from 'react'
import {
  Check,
  Facebook,
  Globe2,
  Monitor,
  Moon,
  Palette,
  Settings,
  Sun,
} from 'lucide-react'
import { useThemeContext } from '@/providers/ThemeProvider'
import { useLangContext } from '@/providers/LangProvider'
import type { ThemeMode } from '@/hooks/useTheme'
import type { Lang } from '@/lib/i18n'
import { DISCORD_INVITE, DiscordIcon, FACEBOOK_URL } from './SocialLinks'

/*
 * Flags are inline SVG, not emoji.
 *
 * \uD83C\uDDFB\uD83C\uDDF3 and \uD83C\uDDFA\uD83C\uDDF8 are regional indicator pairs, and Windows ships no
 * glyphs for them — every Chrome/Edge user on Windows saw the literal letters
 * "VN" and "US" where the flags were meant to be. Emoji also can't be sized
 * or corner-rounded to match the surrounding chips.
 */

function FlagVN({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={className} aria-hidden="true" focusable="false">
      <rect width="30" height="20" rx="3" fill="#da251d" />
      <path
        d="M15 4.4l1.72 5.29h5.56l-4.5 3.27 1.72 5.29L15 15l-4.5 3.25 1.72-5.29-4.5-3.27h5.56z"
        fill="#ffff00"
      />
    </svg>
  )
}

function FlagUS({ className = '' }: { className?: string }) {
  // 13 stripes at 20/13 tall each; odd indices stay white via the base rect.
  const stripe = 20 / 13
  const clipId = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 30 20" className={className} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`us-${clipId}`}>
          <rect width="30" height="20" rx="3" />
        </clipPath>
      </defs>
      <g clipPath={`url(#us-${clipId})`}>
        <rect width="30" height="20" fill="#ffffff" />
        {[0, 2, 4, 6, 8, 10, 12].map((i) => (
          <rect key={i} y={i * stripe} width="30" height={stripe} fill="#b22234" />
        ))}
        <rect width="13" height={stripe * 7} fill="#3c3b6e" />
        {/* Suggestion of stars — at 20px wide, 50 of them would be mud. */}
        {[2.2, 5.4, 8.6, 11.8].map((x) =>
          [2.2, 5.4, 8.6].map((y) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="0.85" fill="#ffffff" />
          )),
        )}
      </g>
    </svg>
  )
}

/**
 * Single combined dropdown that replaces what used to be 3 separate icon
 * buttons crammed into the navbar (Theme + Language + Discord/FB).
 *
 * Why combine them?
 *   • Keeps the navbar clean — only ONE settings cog instead of 4 icons.
 *   • Matches the pattern users already expect from VS Code, Discord, etc.
 *   • Discord/FB still discoverable in 2 clicks (cog → click brand button).
 *
 * UX details:
 *   • Theme and language are segmented controls: one pill slides between
 *     slots on a transform, instead of each option lighting up its own
 *     background. The movement is what tells you the two options are
 *     mutually exclusive.
 *   • Both switch instantly on click — no separate fullscreen modal (that's
 *     still used from the user-menu fallback for accessibility).
 *   • Brand-coloured Discord + Facebook buttons sit at the bottom so they're
 *     the call-to-action, not random navbar noise.
 */
export default function SettingsMenu({ compact = false }: { compact?: boolean }) {
  const { mode, resolved, setMode } = useThemeContext()
  const { lang, setLang, t } = useLangContext()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClickAway)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickAway)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const themeOptions: Array<{ key: ThemeMode; icon: typeof Sun; label: string }> = [
    { key: 'light',  icon: Sun,     label: t.themeLight },
    { key: 'dark',   icon: Moon,    label: t.themeDark },
    { key: 'system', icon: Monitor, label: t.themeSystem },
  ]

  const langOptions: Array<{ key: Lang; label: string; code: string; Flag: typeof FlagVN }> = [
    { key: 'vi', label: t.vietnamese, code: 'VI', Flag: FlagVN },
    { key: 'en', label: t.english,    code: 'EN', Flag: FlagUS },
  ]

  const themeIndex = Math.max(0, themeOptions.findIndex((o) => o.key === mode))
  const langIndex = Math.max(0, langOptions.findIndex((o) => o.key === lang))

  // Visual hint for the trigger — shows current resolved theme as the icon
  // accent so the user can tell at a glance which theme is active.
  const TriggerIcon = mode === 'system' ? Monitor : resolved === 'dark' ? Moon : Sun

  const selectLang = (next: Lang) => {
    if (lang === next) {
      setOpen(false)
      return
    }
    setLang(next)
    // Hard-reload so all server-rendered strings, cached queries, and i18n
    // strings re-fetch in the new lang. Tiny delay so the localStorage write
    // commits before reload, and so the pill is seen sliding first.
    setTimeout(() => window.location.reload(), 260)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={lang === 'vi' ? 'Tuỳ chỉnh & cộng đồng' : 'Settings & community'}
        className={`group flex items-center gap-1.5 rounded-full border transition-all duration-300 ${
          open
            ? 'border-primary bg-primary/10 text-primary shadow-[0_0_16px_-4px_rgb(var(--color-primary))]'
            : 'border-border/60 bg-background/70 text-text-muted hover:border-primary hover:text-text'
        } ${compact ? 'px-2 py-1.5' : 'px-2.5 py-1.5'}`}
      >
        <Settings
          className={`h-4 w-4 transition-transform duration-500 ${
            open ? 'rotate-180' : 'group-hover:rotate-90'
          }`}
        />
        {!compact && (
          <>
            {/* Tiny indicator showing currently-active theme */}
            <TriggerIcon className="h-3.5 w-3.5 opacity-60" />
            <span className="hidden font-mono text-xs uppercase sm:inline">{lang}</span>
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right animate-[fadeIn_180ms_cubic-bezier(0.22,1,0.36,1)] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl"
        >
          {/* Brand hairline so the panel reads as part of the product */}
          <div className="h-0.5 w-full bg-gradient-to-r from-primary via-cyan-300 to-transparent" />

          {/* ─── Theme section ─── */}
          <div className="border-b border-border">
            <p className="flex items-center gap-1.5 px-3 pb-2 pt-3 text-[10px] uppercase tracking-widest text-text-muted">
              <Palette className="h-3 w-3" />
              {t.theme}
            </p>
            <div className="px-2 pb-3">
              <div className="relative grid grid-cols-3 rounded-xl bg-surface/70 p-1">
                {/* Sliding selection pill. One transform beats three
                    independent background fades. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-1 left-1 rounded-lg bg-primary/20 ring-1 ring-primary/50 transition-transform duration-300 ease-out"
                  style={{
                    width: 'calc((100% - 0.5rem) / 3)',
                    transform: `translateX(${themeIndex * 100}%)`,
                  }}
                />
                {themeOptions.map((opt) => {
                  const OptIcon = opt.icon
                  const active = mode === opt.key
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => setMode(opt.key)}
                      className={`relative z-10 flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors duration-200 ${
                        active ? 'text-primary' : 'text-text-muted hover:text-text'
                      }`}
                    >
                      <OptIcon
                        className={`h-4 w-4 transition-transform duration-300 ${
                          active ? 'scale-110' : ''
                        }`}
                      />
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ─── Language section ─── */}
          <div className="border-b border-border">
            <p className="flex items-center gap-1.5 px-3 pb-2 pt-3 text-[10px] uppercase tracking-widest text-text-muted">
              <Globe2 className="h-3 w-3" />
              {t.language}
            </p>
            <div className="px-2 pb-3">
              <div className="relative grid grid-cols-2 rounded-xl bg-surface/70 p-1">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-1 left-1 rounded-lg bg-primary/20 ring-1 ring-primary/50 transition-transform duration-300 ease-out"
                  style={{
                    width: 'calc((100% - 0.5rem) / 2)',
                    transform: `translateX(${langIndex * 100}%)`,
                  }}
                />
                {langOptions.map((opt) => {
                  const active = lang === opt.key
                  const Flag = opt.Flag
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => selectLang(opt.key)}
                      className={`group/lang relative z-10 flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition-colors duration-200 ${
                        active ? 'text-primary' : 'text-text-muted hover:text-text'
                      }`}
                    >
                      <Flag
                        className={`h-3.5 w-5 flex-shrink-0 rounded-[3px] shadow-sm ring-1 ring-black/20 transition-transform duration-300 ${
                          active ? 'scale-105' : 'group-hover/lang:scale-105'
                        }`}
                      />
                      <span className="truncate">{opt.label}</span>
                      {active ? (
                        <Check className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <span className="font-mono text-[10px] opacity-50">{opt.code}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ─── Community CTA ─── */}
          <div>
            <p className="px-3 pb-2 pt-3 text-[10px] uppercase tracking-widest text-text-muted">
              {lang === 'vi' ? 'Cộng đồng' : 'Community'}
            </p>
            <div className="grid grid-cols-2 gap-2 px-2 pb-2">
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#5865F2]/10 px-2 py-2.5 text-xs font-semibold text-[#5865F2] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#5865F2] hover:text-white hover:shadow-lg hover:shadow-[#5865F2]/25"
              >
                <DiscordIcon className="h-3.5 w-3.5" />
                Discord
              </a>
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#1877F2]/10 px-2 py-2.5 text-xs font-semibold text-[#1877F2] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1877F2] hover:text-white hover:shadow-lg hover:shadow-[#1877F2]/25"
              >
                <Facebook className="h-3.5 w-3.5" />
                Facebook
              </a>
            </div>
            <p className="px-3 pb-3 font-mono text-[10px] text-text-muted/70">
              dsc.gg/animewiki
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
