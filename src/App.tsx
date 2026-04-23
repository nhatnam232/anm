import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import Home from '@/pages/Home'
import AnimeLoader from '@/components/AnimeLoader'
import TosModal from '@/components/TosModal'
import SpotifyMiniPlayer from '@/components/SpotifyMiniPlayer'
import PWAInstaller from '@/components/PWAInstaller'
import CommandPalette, { useCommandPaletteShortcut } from '@/components/CommandPalette'
import { AuthProvider } from '@/providers/AuthProvider'
import { LangProvider } from '@/providers/LangProvider'
import { ToastProvider } from '@/providers/ToastProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { NotificationsProvider } from '@/providers/NotificationsProvider'
import { NowPlayingProvider } from '@/providers/NowPlayingProvider'
import { queryClient } from '@/lib/queryClient'

// ── Code-split heavy routes ──────────────────────────────────────────────────
//
// Home is eagerly imported because it's the LCP for ~80% of traffic. Anything
// else loads on-demand, shrinking the initial bundle by ~60% and dropping
// First Contentful Paint significantly on slow networks.
//
// React.lazy + Suspense is the React-router-dom blessed pattern. Vite turns
// each `import('@/pages/...')` into its own chunk automatically.
const AnimeDetail      = lazy(() => import('@/pages/AnimeDetail'))
const CharacterDetail  = lazy(() => import('@/pages/CharacterDetail'))
const Studio           = lazy(() => import('@/pages/Studio'))
const SearchResults    = lazy(() => import('@/pages/BrowsePage'))
const NotFound         = lazy(() => import('@/pages/NotFound'))
const AuthCallback     = lazy(() => import('@/pages/AuthCallback'))
const Profile          = lazy(() => import('@/pages/Profile'))
const AnimeCalendar    = lazy(() => import('@/pages/AnimeCalendar'))
const PersonalLibrary  = lazy(() => import('@/pages/PersonalLibrary'))
const RankingPage      = lazy(() => import('@/pages/RankingPage'))
const SeasonChart      = lazy(() => import('@/pages/SeasonChart'))
const ToS              = lazy(() => import('@/pages/ToS'))
const ComparePage      = lazy(() => import('@/pages/ComparePage'))
const CollectionsPage  = lazy(() => import('@/pages/CollectionsPage'))
const AdminDashboard   = lazy(() => import('@/pages/AdminDashboard'))
const ActivityFeed     = lazy(() => import('@/pages/ActivityFeed'))
const Login            = lazy(() => import('@/pages/Login'))

function PageFallback() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <AnimeLoader label="Loading..." />
    </div>
  )
}

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LangProvider>
            <ToastProvider>
              <AuthProvider>
                <NotificationsProvider>
                  <NowPlayingProvider>
                    <Router>
                      <TosModal />
                      <Suspense fallback={<PageFallback />}>
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/anime/:id" element={<AnimeDetail />} />
                          <Route path="/character/:id" element={<CharacterDetail />} />
                          <Route path="/studio/:id" element={<Studio />} />
                          <Route path="/search" element={<SearchResults />} />
                          <Route path="/auth/callback" element={<AuthCallback />} />
                          <Route path="/login" element={<Login />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/profile/:userId" element={<Profile />} />
                          <Route path="/schedule" element={<AnimeCalendar />} />
                          <Route path="/library" element={<PersonalLibrary />} />
                          <Route path="/ranking" element={<RankingPage />} />
                          <Route path="/season" element={<SeasonChart />} />
                          <Route path="/compare" element={<ComparePage />} />
                          <Route path="/collections" element={<CollectionsPage />} />
                          <Route path="/activity" element={<ActivityFeed />} />
                          <Route path="/admin" element={<AdminDashboard />} />
                          <Route path="/tos" element={<ToS />} />
                          <Route path="/browse" element={<SearchResults />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                      {/* Floating global mini-player so Spotify keeps playing across pages */}
                      <SpotifyMiniPlayer />
                      {/* PWA install prompt + service worker registration */}
                      <PWAInstaller />
                      {/* Ctrl+K command palette mounted at root */}
                      <GlobalCommandPalette />
                    </Router>
                  </NowPlayingProvider>
                </NotificationsProvider>
              </AuthProvider>
            </ToastProvider>
          </LangProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  )
}

/**
 * Tiny wrapper so the Ctrl+K shortcut hook can mount inside the Router context
 * (which it doesn't strictly need, but keeping it inside means future
 * useNavigate() calls inside the palette work without prop-drilling).
 */
function GlobalCommandPalette() {
  const [open, setOpen] = useCommandPaletteShortcut()
  return <CommandPalette open={open} onClose={() => setOpen(false)} />
}
