import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookmarkPlus,
  BookOpen,
  Calendar,
  ChevronDown,
  Compass,
  GitCompareArrows,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Star,
  Trophy,
  User as UserIcon,
  X,
} from 'lucide-react'

import Logo from './Logo'
import NotificationBell from './NotificationBell'
import UserAvatar from './UserAvatar'
import SettingsMenu from './SettingsMenu'
import CommandPalette from './CommandPalette'
import ReloadLink from '@/components/ReloadLink'
import { useAuth } from '@/providers/AuthProvider'
import { useLangContext } from '@/providers/LangProvider'
import { useDebounce } from '@/hooks/useDebounce'
import { searchAnime } from '@/lib/api'
import {
  computeAutoBadges,
  isModerator,
  mergeBadges,
  type BadgeId,
} from '@/lib/badges'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SuggestionItem {
  id: number
  title: string
  cover_image: string
  score: number | null
  type: string
}

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
    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-text-muted">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          {lang === 'vi' ? 'Đang tìm...' : 'Searching...'}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="py-4 text-center text-sm text-text-muted">
          {lang === 'vi' ? 'Không tìm thấy kết quả' : 'No results found'}
        </div>
      ) : (
        <>
          <div className="max-h-80 overflow-y-auto">
            {suggestions.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface"
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
                  <p className="truncate text-sm font-medium text-text">{item.title}</p>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>{item.type}</span>
                    {item.score && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 text-yellow-500">
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
            className="flex w-full items-center justify-center gap-2 border-t border-border py-2.5 text-sm font-medium text-primary transition-colors hover:bg-surface"
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
  const { t, lang } = useLangContext()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [exploreOpen, setExploreOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const exploreMenuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { user, profile, signOut, configured } = useAuth()

  const debouncedQuery = useDebounce(searchQuery, 500)

  // ── Compute viewer badges for avatar ring ──
  const viewerBadges: BadgeId[] = profile
    ? mergeBadges(
        computeAutoBadges({
          createdAt: profile.created_at,
          commentsCount: profile.comments_count ?? 0,
          libraryCount: profile.library_count ?? 0,
          reviewsCount: profile.reviews_count ?? 0,
        }),
        profile.badges,
      )
    : []

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
      if (exploreMenuRef.current && !exploreMenuRef.current.contains(e.target as Node)) {
        setExploreOpen(false)
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
        setUserMenuOpen(false)
        setExploreOpen(false)
        setIsMenuOpen(false)
        setShowSuggestions(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

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

  const viewerIsMod = isModerator(profile)

  // ── Explore dropdown links — gom hết Schedule/Library/Ranking/Season vào 1 dropdown ──
  const exploreLinks: Array<{
    to: string
    icon: any
    label: string
    description: string
  }> = [
    {
      to: '/schedule',
      icon: <Calendar className="h-4 w-4" />,
      label: t.scheduleNav,
      description: lang === 'vi' ? 'Lịch phát sóng tuần này' : 'This week\'s broadcast',
    },
    {
      to: '/season',
      icon: <Star className="h-4 w-4" />,
      label: t.seasonNav,
      description: lang === 'vi' ? 'Anime theo từng mùa' : 'Anime grouped by season',
    },
    {
      to: '/ranking',
      icon: <Trophy className="h-4 w-4" />,
      label: t.rankingNav,
      description: lang === 'vi' ? 'Top anime đánh giá cao' : 'Top rated anime',
    },
    {
      to: '/compare',
      icon: <GitCompareArrows className="h-4 w-4" />,
      label: lang === 'vi' ? 'So sánh' : 'Compare',
      description: lang === 'vi' ? 'So sánh nhiều bộ anime cạnh nhau' : 'Side-by-side anime comparison',
    },
    {
      to: '/collections',
      icon: <BookmarkPlus className="h-4 w-4" />,
      label: lang === 'vi' ? 'Bộ sưu tập' : 'Collections',
      description: lang === 'vi' ? 'List anime do cộng đồng tạo' : 'Community-curated lists',
    },
    {
      to: '/library',
      icon: <BookOpen className="h-4 w-4" />,
      label: t.libraryNav,
      description: lang === 'vi' ? 'Thư viện cá nhân của bạn' : 'Your personal watch list',
    },
  ]
  // Mods/Admins/Owners get a quick-link to the dashboard at the bottom.
  if (viewerIsMod) {
    exploreLinks.push({
      to: '/admin',
      icon: <ShieldCheck className="h-4 w-4" />,
      label: lang === 'vi' ? 'Quản trị' : 'Mod Dashboard',
      description: lang === 'vi' ? 'Duyệt đề xuất chỉnh sửa' : 'Review pending edit suggestions',
    })
  }


  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-border bg-card/90 shadow-sm backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <ReloadLink to="/" className="flex flex-shrink-0 items-center text-xl">
              <Logo size={32} />
            </ReloadLink>

            {/* Search bar with autocomplete */}
            <div className="relative mx-2 hidden max-w-sm flex-1 md:block" ref={searchRef}>
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
                  className="w-full rounded-full border border-border bg-background/80 py-2 pl-10 pr-4 text-sm text-text transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSuggestions([]) }}
                    className="absolute right-3 top-2.5 text-text-muted hover:text-text"
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

            {/* Desktop nav links — minimal: Home + Browse + Explore dropdown */}
            <div className="hidden items-center gap-1 lg:flex">
              <ReloadLink
                to="/"
                className="rounded-lg px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text"
              >
                {t.home}
              </ReloadLink>
              <ReloadLink
                to="/search"
                className="rounded-lg px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text"
              >
                {t.browse}
              </ReloadLink>

              {/* Explore dropdown — gom 4 link cho gọn navbar */}
              <div className="relative" ref={exploreMenuRef}>
                <button
                  type="button"
                  onClick={() => setExploreOpen((v) => !v)}
                  aria-expanded={exploreOpen}
                  aria-haspopup="menu"
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                    exploreOpen
                      ? 'bg-primary/15 text-primary'
                      : 'text-text-muted hover:bg-surface hover:text-text'
                  }`}
                >
                  <Compass className="h-4 w-4" />
                  {t.exploreMenu}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${exploreOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {exploreOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
                  >
                    <p className="border-b border-border px-3 py-2 text-[10px] uppercase tracking-widest text-text-muted">
                      {t.exploreMenuHint}
                    </p>
                    <ul>
                      {exploreLinks.map((link) => (
                        <li key={link.to}>
                          <ReloadLink
                            to={link.to}
                            onClick={() => setExploreOpen(false)}
                            className="flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-primary/10 hover:text-primary"
                          >
                            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                              {link.icon}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-text">
                                {link.label}
                              </span>
                              <span className="block text-xs text-text-muted">
                                {link.description}
                              </span>
                            </span>
                          </ReloadLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Right side (desktop) — combined SettingsMenu + bell + user.
                One settings cog replaces the old Theme + Lang + Discord + FB
                cluster, drastically reducing visual noise. */}
            <div className="hidden items-center gap-2 md:flex">
              {user && <NotificationBell />}
              <SettingsMenu />

              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-1 pr-3 text-sm transition-colors hover:border-primary"
                  >
                    <UserAvatar src={avatar} name={displayName} badges={viewerBadges} size={28} />
                    <span className="max-w-[100px] truncate text-text">{displayName}</span>
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                      <div className="border-b border-border px-3 py-2 text-xs text-text-muted">
                        {user.email}
                      </div>
                      <ReloadLink
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text transition-colors hover:bg-surface"
                      >
                        <UserIcon className="h-4 w-4" /> {t.profile}
                      </ReloadLink>
                      <ReloadLink
                        to="/library"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text transition-colors hover:bg-surface"
                      >
                        <BookOpen className="h-4 w-4" />
                        {t.myLibrary}
                      </ReloadLink>
                      <button
                        onClick={async () => {
                          setUserMenuOpen(false)
                          await signOut()
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text transition-colors hover:bg-surface"
                      >
                        <LogOut className="h-4 w-4" /> {t.signOut}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <ReloadLink
                  to={`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                  className={`flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover ${!configured ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <UserIcon className="h-4 w-4" /> {t.signIn}
                </ReloadLink>
              )}
            </div>

            {/* Mobile: notif + settings cog + search + hamburger */}
            <div className="flex items-center gap-1.5 md:hidden">
              {user && <NotificationBell />}
              <SettingsMenu compact />
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                aria-label="Open command palette"
                title="Search (Ctrl+K)"
                className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text"
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                className="text-text-muted transition-colors hover:text-text"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isMenuOpen && (
            <div className="space-y-3 border-t border-border py-4 md:hidden">
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
                    className="w-full rounded-full border border-border bg-background py-2 pl-10 pr-4 text-sm text-text focus:border-primary focus:outline-none"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
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
                  className="rounded-lg px-3 py-2 text-text-muted transition-colors hover:bg-surface hover:text-text"
                >
                  {t.home}
                </ReloadLink>
                <ReloadLink
                  to="/search"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-text-muted transition-colors hover:bg-surface hover:text-text"
                >
                  {t.browse}
                </ReloadLink>

                {/* Explore section header */}
                <div className="my-2 border-t border-border" />
                <p className="px-3 pb-1 text-[10px] uppercase tracking-widest text-text-muted">
                  {t.exploreMenu}
                </p>
                {exploreLinks.map((link) => (
                  <ReloadLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-text transition-all hover:bg-primary/10 hover:text-primary"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {link.icon}
                    </span>
                    {link.label}
                  </ReloadLink>
                ))}

                <div className="my-2 border-t border-border" />

                {user ? (
                  <>
                    <ReloadLink
                      to="/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-text-muted transition-colors hover:bg-surface hover:text-text"
                    >
                      <UserIcon className="h-4 w-4" /> {t.profile}
                    </ReloadLink>
                    <button
                      onClick={async () => {
                        await signOut()
                        setIsMenuOpen(false)
                      }}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-text-muted transition-colors hover:bg-surface hover:text-text"
                    >
                      <LogOut className="h-4 w-4" /> {t.signOut} ({displayName})
                    </button>
                  </>
                ) : (
                  <ReloadLink
                    to={`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white ${!configured ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    <UserIcon className="h-4 w-4" /> {t.signIn}
                  </ReloadLink>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Global Ctrl+K command palette */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  )
}
