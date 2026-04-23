import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Calendar, ExternalLink, Loader2, Pencil, Sparkles, Tv, Users } from 'lucide-react'
import WikiLayout from '@/wiki/components/WikiLayout'
import TranslatedText from '@/wiki/components/TranslatedText'
import { getCharacter } from '@/wiki/registry'
import { useWikiStory } from '@/wiki/hooks/useWikiStory'
import { useWikiText } from '@/wiki/i18n'
import WikipediaPanel from '@/wiki/components/WikipediaPanel'

export default function WikiStory() {
  const { id = '' } = useParams<{ id: string }>()
  const t = useWikiText()
  const { story, loading, isLive } = useWikiStory(id)

  if (loading) {
    return (
      <WikiLayout>
        <div className="flex items-center justify-center gap-3 rounded-3xl border border-border bg-card p-12 text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          {t.loading}
        </div>
      </WikiLayout>
    )
  }

  if (!story) {
    return (
      <WikiLayout>
        <div className="rounded-3xl border border-border bg-card p-12 text-center">
          <p className="text-lg font-semibold text-text">{t.notFoundStory(id)}</p>
          <Link to="/wiki" className="mt-4 inline-block text-sm text-primary hover:underline">
            {t.backToWikiHome}
          </Link>
        </div>
      </WikiLayout>
    )
  }

  const characters = (story.characterIds ?? []).map(getCharacter).filter(Boolean)

  return (
    <WikiLayout>
      <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
        {/* Hero with cover */}
        {story.coverUrl && (
          <div className="relative h-48 w-full overflow-hidden sm:h-64">
            <img src={story.coverUrl} alt="" className="h-full w-full object-cover opacity-70" />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'linear-gradient(to top, rgb(var(--color-card)) 0%, rgba(var(--color-card), 0.85) 35%, transparent 100%)',
              }}
            />
          </div>
        )}

        <div className="p-8">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-text-muted">{t.storyLabel}</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
                {story.title}
              </h1>
              {story.updatedAt && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-text-muted">
                  <Calendar className="h-3 w-3" />
                  {t.updatedAt} {story.updatedAt}
                </p>
              )}
            </div>
            <Link
              to={`/edit/story/${story.id}`}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-primary hover:text-primary"
            >
              <Pencil className="h-3.5 w-3.5" />
              {t.editThisPage}
            </Link>
          </div>

          {isLive && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-200">
              <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{t.liveFromAnilist}</span>
            </div>
          )}

          <hr className="my-4 border-border" />

          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-text-muted">
            {t.shortSummary}
          </h2>
          <TranslatedText text={story.shortSummary} className="mb-6" />

          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-text-muted">
            {t.fullDetails}
          </h2>
          <TranslatedText text={story.body} />

          {/* Wikipedia auto-import — VI first, EN fallback with DeepL translation */}
          <WikipediaPanel slug={story.wikipediaSlug} slugVi={story.wikipediaSlugVi} />

          {characters.length > 0 && (
            <>
              <hr className="my-6 border-border" />
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-muted">
                <Users className="h-4 w-4" />
                {t.charactersAppearing}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {characters.map((c) => (
                  <Link
                    key={c!.id}
                    to={`/wiki/character/${c!.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface/40 p-2 text-sm font-medium text-text transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <img
                      src={c!.avatarUrl}
                      alt=""
                      className="h-12 w-9 flex-shrink-0 rounded-md object-cover"
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                    />
                    <span className="flex-1">{c!.name}</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                  </Link>
                ))}
              </div>
            </>
          )}

          {story.anilistAnimeId && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Link
                to={`/anime/${story.anilistAnimeId}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-primary-hover keep-white-on-light"
              >
                <Tv className="h-4 w-4" />
                {t.watchSchedule}
              </Link>
              <Link
                to={`/anime/${story.anilistAnimeId}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-primary hover:text-primary"
              >
                {t.addToLibrary}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </article>
    </WikiLayout>
  )
}
