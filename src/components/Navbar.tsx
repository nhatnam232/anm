import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  Globe2,
  LogOut,
  Menu,
  Search,
  Star,
  Trophy,
  User as UserIcon,
  X,
} from 'lucide-react'
import Logo from './Logo'
import AuthModal from './AuthModal'
import LangSwitcher, { LangIcon } from './LangSwitcher'
import ReloadLink from '@/components/ReloadLink'
import { useAuth } from '@/providers/AuthProvider'
import { useLangContext } from '@/providers/LangProvider'
import { useDebounce } from '@/hooks/useDebounce'
import { searchAnime } from '@/lib/api'
import type { Lang } from '@/lib/i18n'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SuggestionItem {
  id: number
  title: string
  cover_image: string
  score: number | null
  type: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LANGUAGE_OPTIONS: Array<{ value: Lang }> = [
  { value: 'vi' },
  { value: 'en' },
]

// ─── Autocomplete Suggestion Popup ───────────────────────────────────────────

interface SuggestionPopupProps {
  suggestions: SuggestionItem[]
  loading: boolean
  query: string
  onSelect: (id: number) => void
  onViewAll: () => void
  lang: string
}

function SuggestionPopup({ suggestions, loading, query, onSelect, onViewAll, lang }: SuggestionPopupProps) {
  if (!query.trim()) return null

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-2xl border border-gray-700 bg-card shadow-2xl">
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          {lang === 'vi' ? 'Đang tìm...' : 'Searching...'}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="py-4 text-center text-sm text-gray-500">
          {lang === 'vi' ? 'Không tìm thấy kết quả' : 'No results found'}
        </div>
      ) : (
        <>
          <div className="max-h-80 overflow-y-auto">
            {suggestions.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-800"
              >
                <div className="h-10 w-7 flex-shrink-0 overflow-hidden rounded-md">
                  <img
                    src={item.cover_image}
                    alt={item.title}
                    className="h-full w-full object-cover"
                    onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{item.title}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{item.type}</span>
                    {item.score && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 text-yellow-400">
                          <Star className="h-3 w-3 fill-current" />
                          {item.score.toFixed(1)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={onViewAll}
            className="flex w-full items-center justify-center gap-2 border-t border-gray-800 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-gray-800"
          >
            <Search className="h-4 w-4" />
            {lang === 'vi' ? `Xem tất cả kết quả cho "${query}"` : `View all results for "${query}"`}
          </button>
        </>
      )}
    </div>
  )
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────

export default function Navbar() {
  const { t, lang, setLang } = useLangContext()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [langModalOpen, setLangModalOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { user, profile, signOut, configured } = useAuth()

  const debouncedQuery = useDebounce(searchQuery, 500)

  // ── Fetch autocomplete suggestions ──
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setSuggestions([])
      return
    }

    let cancelled = false
    setSuggestLoading(true)

    searchAnime({ q: debouncedQuery, limit: 6, sort: 'score' })
      .then((res) => {
        if (!cancelled && res.success) {
          setSuggestions(res.data?.slice(0, 6) ?? [])
        }
      })
      .catch(() => {
        if (!cancelled) setSuggestions([])
      })
      .finally(() => {
        if (!cancelled) setSuggestLoading(false)
      })

    return () => { cancelled = true }
  }, [debouncedQuery])

  // ── Click-away handlers ──
  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLangModalOpen(false)
        setUserMenuOpen(false)
        setIsMenuOpen(false)
        setShowSuggestions(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (langModalOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
    return undefined
  }, [langModalOpen])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setShowSuggestions(false)
      setIsMenuOpen(false)
    }
  }

  const handleSelectSuggestion = (id: number) => {
    navigate(`/anime/${id}`)
    setSearchQuery('')
    setShowSuggestions(false)
    setIsMenuOpen(false)
  }

  const handleViewAll = () => {
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    setSearchQuery('')
    setShowSuggestions(false)
    setIsMenuOpen(false)
  }

  const displayName =
    profile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You'
  const avatar = profile?.avatar_url || user?.user_metadata?.avatar_url || null
  const currentLanguageLabel = lang === 'vi' ? t.vietnamese : t.english

  const handleLanguageChange = (nextLang: Lang) => {
    setLang(nextLang)
    setLangModalOpen(false)
    setIsMenuOpen(false)
  }

  const renderLanguageButton = (compact = false) => (
    <LangSwitcher
      lang={lang}
      label={currentLanguageLabel}
      compact={compact}
      onClick={() => setLangModalOpen(true)}
    />
  )

  // ── Nav links config ──
  const primaryNavLinks = [
    {
      to: '/schedule',
      icon: <Calendar className="h-4 w-4" />,
      label: lang === 'vi' ? 'Lịch chiếu' : 'Schedule',
    },
    {
      to: '/library',
      icon: <BookOpen className="h-4 w-4" />,
      label: lang === 'vi' ? 'Thư viện' : 'Library',
    },
    {
      to: '/ranking',
      icon: <Trophy className="h-4 w-4" />,
      label: lang === 'vi' ? 'Xếp hạng' : 'Ranking',
    },
    {
      to: '/season',
      icon: <Star className="h-4 w-4" />,
      label: lang === 'vi' ? 'Theo mùa' : 'Seasonal',
    },
  ]

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-gray-800/90 bg-card/90 shadow-sm backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <ReloadLink to="/" className="flex flex-shrink-0 items-center text-xl">
              <Logo size={32} />
            </ReloadLink>

            {/* Search bar with autocomplete */}
            <div className="relative mx-4 hidden max-w-sm flex-1 md:block" ref={searchRef}>
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full rounded-full border border-gray-700 bg-background/80 py-2 pl-10 pr-4 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSuggestions([]) }}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </form>
              {showSuggestions && (
                <SuggestionPopup
                  suggestions={suggestions}
                  loading={suggestLoading}
                  query={searchQuery}
                  onSelect={handleSelectSuggestion}
                  onViewAll={handleViewAll}
                  lang={lang}
                />
              )}
            </div>

            {/* Desktop nav links */}
            <div className="hidden items-center gap-1 lg:flex">
              <ReloadLink
                to="/"
                className="rounded-lg px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
              >
                {t.home}
              </ReloadLink>
              <ReloadLink
                to="/search"
                className="rounded-lg px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
              >
                {t.browse}
              </ReloadLink>

              {/* Divider */}
              <div className="mx-1 h-5 w-px bg-gray-700" />

              {/* Priority nav links */}
              {primaryNavLinks.map((link) => (
                <ReloadLink
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-300 transition-all hover:bg-primary/10 hover:text-primary"
                >
                  {link.icon}
                  {link.label}
                </ReloadLink>
              ))}
            </div>

            {/* Right side: lang + user */}
            <div className="hidden items-center gap-3 md:flex">
              {renderLanguageButton()}

              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-full border border-gray-700 bg-background py-1 pl-1 pr-3 text-sm transition-colors hover:border-primary"
                  >
                    {avatar ? (
                      <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                        {displayName[0]?.toUpperCase()}
                      </span>
                    )}
                    <span className="max-w-[100px] truncate text-gray-200">{displayName}</span>
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-gray-800 bg-card shadow-xl">
                      <div className="border-b border-gray-800 px-3 py-2 text-xs text-gray-400">
                        {user.email}
                      </div>
                      <ReloadLink
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-200 transition-colors hover:bg-gray-800"
                      >
                        <UserIcon className="h-4 w-4" /> {t.profile}
                      </ReloadLink>
                      <ReloadLink
                        to="/library"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-200 transition-colors hover:bg-gray-800"
                      >
                        <BookOpen className="h-4 w-4" />
                        {lang === 'vi' ? 'Thư viện của tôi' : 'My Library'}
                      </ReloadLink>
                      <button
                        onClick={async () => {
                          setUserMenuOpen(false)
                          await signOut()
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-200 transition-colors hover:bg-gray-800"
                      >
                        <LogOut className="h-4 w-4" /> {t.signOut}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  disabled={!configured}
                  className="flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  <UserIcon className="h-4 w-4" /> {t.signIn}
                </button>
              )}
            </div>

            {/* Mobile: lang + hamburger */}
            <div className="flex items-center gap-2 md:hidden">
              {renderLanguageButton(true)}
              <button
                className="text-gray-300 transition-colors hover:text-white"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isMenuOpen && (
            <div className="space-y-3 border-t border-gray-800 py-4 md:hidden">
              {/* Mobile search */}
              <div className="relative" ref={searchRef}>
                <form onSubmit={handleSearch}>
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setShowSuggestions(true)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-full rounded-full border border-gray-700 bg-background py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </form>
                {showSuggestions && (
                  <SuggestionPopup
                    suggestions={suggestions}
                    loading={suggestLoading}
                    query={searchQuery}
                    onSelect={handleSelectSuggestion}
                    onViewAll={handleViewAll}
                    lang={lang}
                  />
                )}
              </div>

              {/* Mobile nav links */}
              <div className="flex flex-col gap-1">
                <ReloadLink
                  to="/"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
                >
                  {t.home}
                </ReloadLink>
                <ReloadLink
                  to="/search"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
                >
                  {t.browse}
                </ReloadLink>

                {/* Priority links in mobile */}
                <div className="my-1 border-t border-gray-800" />
                {primaryNavLinks.map((link) => (
                  <ReloadLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-gray-200 transition-all hover:bg-primary/10 hover:text-primary"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {link.icon}
                    </span>
                    {link.label}
                  </ReloadLink>
                ))}

                <div className="my-1 border-t border-gray-800" />

                {user ? (
                  <>
                    <ReloadLink
                      to="/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
                    >
                      <UserIcon className="h-4 w-4" /> {t.profile}
                    </ReloadLink>
                    <button
                      onClick={async () => {
                        await signOut()
                        setIsMenuOpen(false)
                      }}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
                    >
                      <LogOut className="h-4 w-4" /> {t.signOut} ({displayName})
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false)
                      setAuthOpen(true)
                    }}
                    disabled={!configured}
                    className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    <UserIcon className="h-4 w-4" /> {t.signIn}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Language modal */}
      {langModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <button
            type="button"
            aria-label={t.close}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setLangModalOpen(false)}
          />
          <div className="surface-float relative z-10 w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-2xl">
            <div className="border-b border-white/10 bg-gradient-to-r from-primary/20 via-sky-500/10 to-emerald-400/10 px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Globe2 className="h-4 w-4" />
                    {t.language}
                  </div>
                  <h2 className="mt-2 text-2xl font-bold text-white">{t.chooseLanguage}</h2>
                  <p className="mt-1 text-sm text-gray-300">
                    {t.currentLanguage}: {currentLanguageLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLangModalOpen(false)}
                  className="rounded-full border border-white/10 p-2 text-gray-300 transition-colors hover:border-primary hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3 px-5 py-5">
              {LANGUAGE_OPTIONS.map((option) => {
                const isActive = option.value === lang
                const label = option.value === 'vi' ? t.vietnamese : t.english

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleLanguageChange(option.value)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all ${
                      isActive
                        ? 'border-primary bg-primary/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04)]'
                        : 'border-white/10 bg-white/[0.03] text-gray-200 hover:border-primary/60 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <LangIcon lang={option.value} size={36} />
                      <div>
                        <div className="font-semibold">{label}</div>
                        <div className="text-sm text-gray-400">
                          {isActive ? t.currentLanguage : t.languageChangedTo(label)}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        isActive ? 'bg-primary text-white' : 'bg-white/5 text-gray-500'
                      }`}
                    >
                      {isActive ? <Check className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 rotate-[-90deg]" />}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
