import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, BookMarked, Search } from 'lucide-react'
import Logo from '@/components/Logo'
import { searchCharacters } from '@/wiki/registry'
import { useWikiText } from '@/wiki/i18n'
import type { WikiCharacter } from '@/wiki/types'

type Props = {
  children: ReactNode
  /** Hide the omnibar on the edit page where it would be a distraction. */
  showSearch?: boolean
}

/**
 * Wrapper for every wiki page — a darker, denser theme than the main app
 * to signal "you are now in the Wiki". Top bar includes:
 *   - Back-to-main-app link.
 *   - Wiki logo + name.
 *   - Big global omnibar (defaults to character search).
 */
export default function WikiLayout({ children, showSearch = true }: Props) {
  const t = useWikiText()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<WikiCharacter[]>([])
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setResults(searchCharacters(q, 8))
  }, [q])

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [])

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.10)_0%,_rgba(15,23,42,0)_55%)] text-text">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-primary hover:text-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Anime Wiki</span>
          </Link>

          <Link to="/wiki" className="flex items-center gap-2">
            <Logo size={28} showWordmark={false} />
            <span className="flex items-center gap-1.5 text-sm font-extrabold tracking-tight">
              <BookMarked className="h-4 w-4 text-primary" />
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                {t.fandomWiki}
              </span>
            </span>
          </Link>

          {showSearch && (
            <div className="relative ml-auto max-w-xl flex-1" ref={ref}>
              <Search className="absolute left-4 top-3 h-4 w-4 text-text-muted" />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setOpen(true) }}
                onFocus={() => setOpen(true)}
                placeholder={t.searchPlaceholder}
                className="w-full rounded-full border border-border bg-background py-2.5 pl-11 pr-4 text-sm text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {open && results.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                  {results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        navigate(`/wiki/character/${c.id}`)
                        setOpen(false)
                        setQ('')
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface"
                    >
                      <img
                        src={c.avatarUrl}
                        alt=""
                        className="h-10 w-7 flex-shrink-0 rounded object-cover"
                        onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text">{c.name}</p>
                        <p className="truncate text-[11px] text-text-muted">{c.shortBio.replace(/\[\[([^\]|]+)\|[^\]]+\]\]/g, '$1')}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {open && q.trim().length > 0 && results.length === 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-border bg-card px-3 py-3 text-xs text-text-muted shadow-2xl">
                  {t.noResults(q)}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">{children}</main>

      <footer className="mt-16 border-t border-border bg-card/40 py-6 text-center text-xs text-text-muted">
        {t.fandomWiki} · Anime Wiki community contributions
      </footer>
    </div>
  )
}
