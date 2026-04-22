import { Home, Search } from 'lucide-react'
import Layout from '@/components/Layout'
import ReloadLink from '@/components/ReloadLink'
import { useLangContext } from '@/providers/LangProvider'

export default function NotFound() {
  const { t } = useLangContext()

  return (
    <Layout>
      <div className="container mx-auto flex max-w-2xl flex-1 flex-col justify-center px-4 py-24 text-center">
        <h1 className="mb-4 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-9xl font-extrabold text-transparent">
          404
        </h1>
        <h2 className="mb-6 text-3xl font-bold text-white">{t.pageNotFound}</h2>
        <p className="mb-10 text-lg leading-relaxed text-gray-400">{t.pageNotFoundSubtitle}</p>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <ReloadLink
            to="/"
            className="flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 font-medium text-white transition-all hover:scale-105 hover:bg-primary-hover"
          >
            <Home className="h-5 w-5" />
            {t.backToHome}
          </ReloadLink>
          <ReloadLink
            to="/search"
            className="flex items-center justify-center gap-2 rounded-full border border-gray-700 bg-card px-8 py-3 font-medium text-white transition-all hover:scale-105 hover:bg-gray-800"
          >
            <Search className="h-5 w-5" />
            {t.browseAnime}
          </ReloadLink>
        </div>
      </div>
    </Layout>
  )
}
