import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import Breadcrumbs from '@/components/Breadcrumbs'
import Layout from '@/components/Layout'
import CommentSection from '@/components/CommentSection'
import ReloadLink from '@/components/ReloadLink'
import AnimeLoader from '@/components/AnimeLoader'
import { fetchCharacterDetails } from '@/lib/api'
import { useManualTranslation } from '@/hooks/useManualTranslation'
import { useLangContext } from '@/providers/LangProvider'

export default function CharacterDetail() {
  const { t, lang } = useLangContext()
  const { id } = useParams<{ id: string }>()
  const [character, setCharacter] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const biography = useManualTranslation(character?.description, lang)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      const res = await fetchCharacterDetails(Number(id))
      if (res.success) {
        setCharacter(res.data)
      } else {
        setError(t.loadError)
      }
    } catch (err: any) {
      console.error(err)
      // 404 from server → treat as "not found" (so we render the proper UI)
      if (err?.status === 404 || err?.notFound) {
        setNotFound(true)
      } else {
        setError(t.loadError)
      }
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
        <AnimeLoader label="Summoning character data" />
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

  if (notFound || !character) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="mb-4 text-2xl font-bold text-white">{t.characterNotFound}</h2>
          <ReloadLink to="/" className="text-primary hover:underline">
            {t.returnHome}
          </ReloadLink>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <Breadcrumbs crumbs={[{ name: character.name }]} />

        <div className="mt-8 flex flex-col gap-12 md:flex-row">
          <div className="flex w-full flex-col items-center md:w-1/3">
            <div className="mb-6 h-64 w-64 overflow-hidden rounded-full border-4 border-primary/20 shadow-2xl">
              <img
                src={character.image}
                alt={character.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.visibility = 'hidden'
                }}
              />
            </div>

            <div className="w-full rounded-xl border border-gray-800 bg-card p-6">
              <h3 className="mb-4 border-b border-gray-700 pb-2 text-lg font-semibold text-white">
                {t.information}
              </h3>
              <div className="space-y-3 text-sm">
                {character.name_kanji ? (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">{t.japaneseName}</span>
                    <span className="text-right text-gray-200">{character.name_kanji}</span>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">{t.favorites}</span>
                  <span className="text-gray-200">{character.favorites?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">{t.nicknames}</span>
                  <span className="text-right text-gray-200">
                    {character.nicknames?.length ? character.nicknames.join(', ') : t.none}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full md:w-2/3">
            <h1 className="mb-6 text-4xl font-bold text-white md:text-5xl">{character.name}</h1>

            <div className="mb-10 rounded-xl border border-gray-800 bg-card p-6">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold text-white">{t.biography}</h2>
                {biography.canTranslate && (
                  <button
                    type="button"
                    onClick={() => {
                      if (biography.isTranslated) {
                        biography.reset()
                        return
                      }
                      void biography.translate()
                    }}
                    disabled={biography.loading}
                    className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary transition-colors hover:bg-primary/20 disabled:cursor-wait disabled:opacity-60"
                  >
                    {biography.isTranslated
                      ? t.showOriginal
                      : biography.loading
                        ? t.autoTranslationLoading
                        : t.translateNow}
                  </button>
                )}
                {biography.isTranslated && (
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                    {t.translatedToVietnamese}
                  </span>
                )}
                {!biography.isTranslated && biography.unavailable && (
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">
                    {t.autoTranslationUnavailable}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-line leading-relaxed text-gray-300">
                {biography.text}
              </p>
            </div>

            <h2 className="mb-6 text-2xl font-bold text-white">{t.appearsIn}</h2>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
              {character.appears_in.map((anime: any) => (
                <ReloadLink
                  key={anime.id}
                  to={`/anime/${anime.id}`}
                  className="group overflow-hidden rounded-xl border border-gray-800 bg-card transition-all duration-300 hover:border-primary"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={anime.cover_image}
                      alt={anime.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h4 className="mb-1 line-clamp-1 font-medium text-white transition-colors group-hover:text-primary">
                      {anime.title}
                    </h4>
                    <span className="rounded-full bg-gray-800 px-2 py-1 text-xs text-gray-400">
                      {anime.role === 'Main' ? t.mainCharacter : t.supportingCharacter}
                    </span>
                  </div>
                </ReloadLink>
              ))}
            </div>

            <div className="mt-10">
              <CommentSection entityType="character" entityId={character.id} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
