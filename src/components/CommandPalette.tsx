import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookmarkPlus,
  BookOpen,
  Calendar,
  GitCompareArrows,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Users,
} from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { searchAnime } from '@/lib/api'
import { useAuth } from '@/providers/AuthProvider'
import { useLangContext } from '@/providers/LangProvider'
import { isModerator } from '@/lib/badges'

type Props = {
  open: boolean
  onClose: () => void
}

type Action = {
  id: string
  label: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  to: string
  keywords?: string
}

/**
 * Global command palette (VSCode / Discord style). Opens on Ctrl/Cmd+K from
 * anywhere on the site.
 *
 * Behavior:
 *   • Empty query → shows curated list of "go to ___" actions.
 *   • Typed query (≥2 chars) → fuzzy-match against actions AND fire a
 *     server-side anime search (debounced).
 *   • Up/Down arrows + Enter to navigate.
 */
export default function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { lang } = useLangContext()
  const { profile } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [animeHits, setAnimeHits] = useState<
    Array<{ id: number; title: string; cover_image: string; type: string; score: number | null }>
  >([])
  const [searching, setSearching] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const debouncedQuery = useDebounce(query, 250)

  const viewerIsMod = isModerator(profile)

  const baseActions: Action[] = useMemo(() => {
    const items: Action[] = [
      { id: 'home',        label: lang === 'vi' ? 'Trang chủ' : 'Home',                icon: Sparkles,  to: '/',            keywords: 'home homepage' },
      { id: 'browse',      label: lang === 'vi' ? 'Khám phá anime' : 'Browse anime',   icon: Search,    to: '/search',      keywords: 'browse search' },
      { id: 'season',      label: lang === 'vi' ? 'Theo mùa' : 'Seasonal chart',       icon: Star,      to: '/season',      keywords: 'season chart' },
      { id: 'schedule',    label: lang === 'vi' ? 'Lịch chiếu' : 'Schedule',           icon: Calendar,  to: '/schedule',    keywords: 'calendar broadcast' },
      { id: 'ranking',     label: lang === 'vi' ? 'Xếp hạng' : 'Ranking',              icon: Trophy,    to: '/ranking',     keywords: 'top rank' },
      { id: 'compare',     label: lang === 'vi' ? 'So sánh anime' : 'Compare anime',   icon: GitCompareArrows, to: '/compare', keywords: 'compare diff' },
      { id: 'collections', label: lang === 'vi' ? 'Bộ sưu tập' : 'Collections',         icon: BookmarkPlus, to: '/collections', keywords: 'collection list' },
      { id: 'library',     label: lang === 'vi' ? 'Thư viện cá nhân' : 'My library',   icon: BookOpen,  to: '/library',     keywords: 'library mine' },
      { id: 'activity',    label: lang === 'vi' ? 'Hoạt động cộng đồng' : 'Activity feed', icon: Users, to: '/activity',  keywords: 'activity feed' },
      { id: 'profile',     label: lang === 'vi' ? 'Hồ sơ' : 'Profile',                  icon: Users,     to: '/profile',     keywords: 'profile account' },
    ]
    if (viewerIsMod) {
      items.push({
        id: 'admin',
        label: lang === 'vi' ? 'Quản trị (mod)' : 'Mod Dashboard',
        icon: ShieldCheck,
        to: '/admin',
        keywords: 'admin mod dashboard',
      })
    }
    return items
  }, [lang, viewerIsMod])

  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return baseActions
    return baseActions.filter(
      (a) => a.label.toLowerCase().includes(q) || (a.keywords ?? '').includes(q),
    )
  }, [baseActions, query])

  // ── Reset when opening ──
  useEffect(() => {
    if (open) {
      setQuery('')
      setAnimeHits([])
      setActiveIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // ── Server-side anime search ──
  useEffect(() => {
    if (!open) return
    const q = debouncedQuery.trim()
    if (q.length < 2) {
      setAnimeHits([])
      return
    }
    let cancelled = false
    setSearching(true)
    searchAnime({ q, limit: 5, sort: 'score' })
      .then((res) => {
        if (!cancelled && res.success) setAnimeHits(res.data?.slice(0, 5) ?? [])
      })
      .catch(() => { if (!cancelled) setAnimeHits([]) })
      .finally(() => { if (!cancelled) setSearching(false) })
    return () => { cancelled = true }
  }, [debouncedQuery, open])

  // ── Total list for keyboard nav ──
  const totalItems = filteredActions.length + animeHits.length

  // ── Keyboard handling ──
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (totalItems > 0 ? (i + 1) % totalItems : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (totalItems > 0 ? (i - 1 + totalItems) % totalItems : 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (activeIndex < filteredActions.length) {
          const a = filteredActions[activeIndex]
          if (a) { navigate(a.to); onClose() }
        } else {
          const hit = animeHits[activeIndex - filteredActions.length]
          if (hit) { navigate(`/anime/${hit.id}`); onClose() }
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, totalItems, activeIndex, filteredActions, animeHits, navigate, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center px-4 pt-[15vh]"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />

      <div
        role="dialog"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        className="surface-float relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-5 w-5 flex-shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0) }}
            placeholder={lang === 'vi' ? 'Tìm anime, trang, tác vụ…' : 'Search anime, pages, actions…'}
            className="w-full bg-transparent text-sm text-text placeholder-text-muted focus:outline-none"
          />
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
          ) : (
            <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-text-muted sm:inline">
              ESC
            </kbd>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {/* Quick actions */}
          {filteredActions.length > 0 && (
            <div>
              <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {lang === 'vi' ? 'Đi tới' : 'Quick navigate'}
              </p>
              {filteredActions.map((a, idx) => {
                const Icon = a.icon
                const active = idx === activeIndex
                return (
                  <button
                    key={a.id}
                    onClick={() => { navigate(a.to); onClose() }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                      active ? 'bg-primary/10 text-primary' : 'text-text hover:bg-surface'
                    }`}
                  >
                    <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                      active ? 'bg-primary/20 text-primary' : 'bg-surface text-text-muted'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-sm">{a.label}</span>
                    {active && <ArrowRight className="h-3.5 w-3.5" />}
                  </button>
                )
              })}
            </div>
          )}

          {/* Anime results */}
          {animeHits.length > 0 && (
            <div className="mt-2 border-t border-border pt-2">
              <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {lang === 'vi' ? 'Anime' : 'Anime matches'}
              </p>
              {animeHits.map((hit, hitIdx) => {
                const idx = filteredActions.length + hitIdx
                const active = idx === activeIndex
                return (
                  <button
                    key={hit.id}
                    onClick={() => { navigate(`/anime/${hit.id}`); onClose() }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                      active ? 'bg-primary/10' : 'hover:bg-surface'
                    }`}
                  >
                    <img
                      src={hit.cover_image}
                      alt={hit.title}
                      className="h-10 w-7 flex-shrink-0 rounded object-cover"
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text">{hit.title}</span>
                      <span className="block text-xs text-text-muted">
                        {hit.type}
                        {hit.score != null && ` · ★ ${hit.score.toFixed(1)}`}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {!searching && totalItems === 0 && (
            <p className="px-4 py-6 text-center text-sm text-text-muted">
              {lang === 'vi' ? 'Không có kết quả' : 'No matches'}
            </p>
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between gap-2 border-t border-border bg-background px-4 py-2 text-[11px] text-text-muted">
          <span className="flex items-center gap-2">
            <kbd className="rounded border border-border bg-card px-1 py-0.5">↑</kbd>
            <kbd className="rounded border border-border bg-card px-1 py-0.5">↓</kbd>
            {lang === 'vi' ? 'di chuyển' : 'navigate'}
          </span>
          <span className="flex items-center gap-2">
            <kbd className="rounded border border-border bg-card px-1 py-0.5">Enter</kbd>
            {lang === 'vi' ? 'mở' : 'open'}
          </span>
          <span className="flex items-center gap-2">
            <kbd className="rounded border border-border bg-card px-1 py-0.5">Ctrl</kbd>
            <kbd className="rounded border border-border bg-card px-1 py-0.5">K</kbd>
            {lang === 'vi' ? 'mở/đóng' : 'toggle'}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook that wires the global Ctrl+K shortcut. Mount in a top-level component
 * (App.tsx) and pass the `setOpen` setter from the same place that mounts
 * the palette. Returns `[open, setOpen]` for convenience.
 */
export function useCommandPaletteShortcut(): [boolean, (v: boolean) => void] {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        // Don't hijack inputs that already have focus and aren't expecting Ctrl+K
        const target = e.target as HTMLElement | null
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          // OK: still allow Ctrl+K because it's the universal "search" shortcut.
        }
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  return [open, setOpen]
}
