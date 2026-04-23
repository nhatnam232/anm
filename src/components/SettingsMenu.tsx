import { useEffect, useRef, useState } from 'react'
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
 *   • Theme picker uses radio-style "menuitemradio" — instant switch on click.
 *   • Language picker also instant — no need for the separate fullscreen modal
 *     anymore (that's still used from the user-menu fallback for accessibility).
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

  const langOptions: Array<{ key: Lang; label: string }> = [
    { key: 'vi', label: t.vietnamese },
    { key: 'en', label: t.english },
  ]

  // Visual hint for the trigger — shows current resolved theme as the icon
  // accent so the user can tell at a glance which theme is active.
  const TriggerIcon = mode === 'system' ? Monitor : resolved === 'dark' ? Moon : Sun

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={lang === 'vi' ? 'Tuỳ chỉnh & cộng đồng' : 'Settings & community'}
        className={`flex items-center gap-1.5 rounded-full border transition-all ${
          open
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border/60 bg-background/70 text-text-muted hover:border-primary hover:text-text'
        } ${compact ? 'px-2 py-1.5' : 'px-2.5 py-1.5'}`}
      >
        <Settings className="h-4 w-4" />
        {!compact && (
          <>
            {/* Tiny indicator showing currently-active theme */}
            <TriggerIcon className="h-3.5 w-3.5 opacity-60" />
            <span className="hidden text-xs font-mono uppercase sm:inline">{lang}</span>
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        >
          {/* ─── Theme section ─── */}
          <div className="border-b border-border">
            <p className="flex items-center gap-1.5 px-3 pb-1.5 pt-3 text-[10px] uppercase tracking-widest text-text-muted">
              <Palette className="h-3 w-3" />
              {t.theme}
            </p>
            <div className="grid grid-cols-3 gap-1 px-2 pb-2">
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
                    className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-all ${
                      active
                        ? 'bg-primary/15 text-primary ring-1 ring-primary/40'
                        : 'text-text-muted hover:bg-surface hover:text-text'
                    }`}
                  >
                    <OptIcon className="h-4 w-4" />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ─── Language section ─── */}
          <div className="border-b border-border">
            <p className="flex items-center gap-1.5 px-3 pb-1.5 pt-3 text-[10px] uppercase tracking-widest text-text-muted">
              <Globe2 className="h-3 w-3" />
              {t.language}
            </p>
            <div className="grid grid-cols-2 gap-1 px-2 pb-2">
              {langOptions.map((opt) => {
                const active = lang === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => setLang(opt.key)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium transition-all ${
                      active
                        ? 'bg-primary/15 text-primary ring-1 ring-primary/40'
                        : 'text-text-muted hover:bg-surface hover:text-text'
                    }`}
                  >
                    <span className="text-sm">{opt.key === 'vi' ? '🇻🇳' : '🇺🇸'}</span>
                    {opt.label}
                    {active && <Check className="h-3 w-3" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ─── Community CTA ─── */}
          <div>
            <p className="px-3 pb-1.5 pt-3 text-[10px] uppercase tracking-widest text-text-muted">
              {lang === 'vi' ? 'Cộng đồng' : 'Community'}
            </p>
            <div className="grid grid-cols-2 gap-1 px-2 pb-2">
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#5865F2]/10 px-2 py-2 text-xs font-semibold text-[#5865F2] transition-colors hover:bg-[#5865F2]/20"
              >
                <DiscordIcon className="h-3.5 w-3.5" />
                Discord
              </a>
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#1877F2]/10 px-2 py-2 text-xs font-semibold text-[#1877F2] transition-colors hover:bg-[#1877F2]/20"
              >
                <Facebook className="h-3.5 w-3.5" />
                Facebook
              </a>
            </div>
            <p className="px-3 pb-3 text-[10px] text-text-muted/70">
              dsc.gg/animewiki
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
