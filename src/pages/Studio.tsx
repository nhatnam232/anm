import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import AnimeCard from '@/components/AnimeCard'
import AuthModal from '@/components/AuthModal'
import Breadcrumbs from '@/components/Breadcrumbs'
import Layout from '@/components/Layout'
import ReloadLink from '@/components/ReloadLink'
import { fetchStudioDetails } from '@/lib/api'
import { useAutoTranslation } from '@/hooks/useAutoTranslation'
import { useLangContext } from '@/providers/LangProvider'

export default function Studio() {
  const { t, lang } = useLangContext()
  const { id } = useParams<{ id: string }>()
  const [studio, setStudio] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const studioDescription = useAutoTranslation(studio?.description, lang)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchStudioDetails(Number(id))
      if (res.success) {
        setStudio(res.data)
      } else {
        setError(t.loadError)
      }
    } catch (err) {
      console.error(err)
      setError(t.loadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    window.scrollTo(0, 0)
  }, [id])

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto animate-pulse px-4 py-12">
          <div className="mb-8 h-32 w-full rounded-xl bg-card" />
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-card" />
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <AlertCircle className="h-12 w-12 text-red-400" />
          <p className="text-center text-gray-400">{t.loadError}</p>
          <button
            onClick={() => {
              setError(null)
              void loadData()
            }}
            className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
          >
            {t.retry}
          </button>
        </div>
      </Layout>
    )
  }

  if (!studio) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="mb-4 text-2xl font-bold text-white">{t.studioNotFound}</h2>
          <ReloadLink to="/" className="text-primary hover:underline">
            {t.returnHome}
          </ReloadLink>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <Breadcrumbs
          crumbs={[
            { name: t.studios, path: '/search' },
            { name: studio.name },
          ]}
        />

        <div className="mb-12 flex flex-col items-center gap-8 rounded-2xl border border-gray-800 bg-card p-8 shadow-xl md:flex-row md:items-start">
          <div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-xl bg-white p-4 shadow-inner">
            <img
              src={studio.logo}
              alt={`${studio.name} logo`}
              className="max-h-full max-w-full object-contain"
              onError={(e) => {
                e.currentTarget.style.visibility = 'hidden'
              }}
            />
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="mb-4 text-4xl font-bold text-white">{studio.name}</h1>
            <p className="max-w-3xl text-lg leading-relaxed text-gray-300">
              {studioDescription.text}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4 md:justify-start">
              <div className="rounded-lg border border-gray-800 bg-background px-4 py-2">
                <span className="block text-sm text-gray-400">{t.totalAnime}</span>
                <span className="text-xl font-bold text-white">{studio.count || studio.anime.length}</span>
              </div>
              {studio.established ? (
                <div className="rounded-lg border border-gray-800 bg-background px-4 py-2">
                  <span className="block text-sm text-gray-400">{t.established}</span>
                  <span className="text-xl font-bold text-white">
                    {new Date(studio.established).getUTCFullYear()}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <h2 className="mb-6 border-b border-gray-800 pb-4 text-2xl font-bold text-white">
          {t.animeProducedBy(studio.name)}
        </h2>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {studio.anime.map((anime: any) => (
            <AnimeCard key={anime.id} anime={anime} onAuthRequired={() => setAuthOpen(true)} />
          ))}
        </div>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </Layout>
  )
}
