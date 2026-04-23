import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import Home from '@/pages/Home'
import AnimeDetail from '@/pages/AnimeDetail'
import CharacterDetail from '@/pages/CharacterDetail'
import Studio from '@/pages/Studio'
import SearchResults from '@/pages/BrowsePage'
import NotFound from '@/pages/NotFound'
import AuthCallback from '@/pages/AuthCallback'
import Profile from '@/pages/Profile'
import AnimeCalendar from '@/pages/AnimeCalendar'
import PersonalLibrary from '@/pages/PersonalLibrary'
import RankingPage from '@/pages/RankingPage'
import SeasonChart from '@/pages/SeasonChart'
import ToS from '@/pages/ToS'
import BrowsePage from '@/pages/BrowsePage'
import ComparePage from '@/pages/ComparePage'
import CollectionsPage from '@/pages/CollectionsPage'
import AdminDashboard from '@/pages/AdminDashboard'
import TosModal from '@/components/TosModal'
import SpotifyMiniPlayer from '@/components/SpotifyMiniPlayer'
import { AuthProvider } from '@/providers/AuthProvider'
import { LangProvider } from '@/providers/LangProvider'
import { ToastProvider } from '@/providers/ToastProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { NotificationsProvider } from '@/providers/NotificationsProvider'
import { NowPlayingProvider } from '@/providers/NowPlayingProvider'
import { queryClient } from '@/lib/queryClient'

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
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/anime/:id" element={<AnimeDetail />} />
                        <Route path="/character/:id" element={<CharacterDetail />} />
                        <Route path="/studio/:id" element={<Studio />} />
                        <Route path="/search" element={<SearchResults />} />
                        <Route path="/auth/callback" element={<AuthCallback />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/profile/:userId" element={<Profile />} />
                        <Route path="/schedule" element={<AnimeCalendar />} />
                        <Route path="/library" element={<PersonalLibrary />} />
                        <Route path="/ranking" element={<RankingPage />} />
                        <Route path="/season" element={<SeasonChart />} />
                        <Route path="/compare" element={<ComparePage />} />
                        <Route path="/collections" element={<CollectionsPage />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/tos" element={<ToS />} />
                        <Route path="/browse" element={<BrowsePage />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                      {/* Floating global mini-player so Spotify keeps playing across pages */}
                      <SpotifyMiniPlayer />
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
