import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
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
import TosModal from '@/components/TosModal'
import { AuthProvider } from '@/providers/AuthProvider'
import { LangProvider } from '@/providers/LangProvider'

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
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
            <Route path="/schedule" element={<AnimeCalendar />} />
            <Route path="/library" element={<PersonalLibrary />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/season" element={<SeasonChart />} />
            <Route path="/tos" element={<ToS />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </LangProvider>
  )
}
