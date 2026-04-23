import { useState, useEffect, useRef } from 'react'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useThemeContext } from '@/providers/ThemeProvider'
import { useLangContext } from '@/providers/LangProvider'
import type { ThemeMode } from '@/hooks/useTheme'

/**
 * 3-state theme toggle button (Light / Dark / System).
 * Shows current mode with icon, opens a small menu on click.
 */
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { mode, resolved, setMode } = useThemeContext()
  const { t } = useLangContext()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [])

  const Icon = mode === 'system' ? Monitor : resolved === 'dark' ? Moon : Sun
  const label =
    mode === 'system' ? t.themeSystem : mode === 'dark' ? t.themeDark : t.themeLight
  const a11yLabel = resolved === 'dark' ? t.switchToLightMode : t.switchToDarkMode

  const options: Array<{ key: ThemeMode; icon: typeof Sun; label: string }> = [
    { key: 'light',  icon: Sun,     label: t.themeLight },
    { key: 'dark',   icon: Moon,    label: t.themeDark },
    { key: 'system', icon: Monitor, label: t.themeSystem },
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={a11yLabel}
        aria-label={a11yLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-2.5 py-1.5 text-sm text-text-muted transition-all hover:border-primary hover:text-text"
      >
        <Icon className="h-4 w-4" />
        {!compact && <span className="hidden text-xs sm:inline">{label}</span>}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        >
          <p className="border-b border-border px-3 py-2 text-[10px] uppercase tracking-widest text-text-muted">
            {t.theme}
          </p>
          {options.map((opt) => {
            const OptIcon = opt.icon
            const active = mode === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setMode(opt.key)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-text hover:bg-surface'
                }`}
              >
                <OptIcon className="h-4 w-4" />
                <span className="flex-1 text-left">{opt.label}</span>
                {active && <Check className="h-4 w-4" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
