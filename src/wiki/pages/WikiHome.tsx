import { Link } from 'react-router-dom'
import { BookOpen, BookPlus, Sparkles, UserPlus, Users } from 'lucide-react'
import WikiLayout from '@/wiki/components/WikiLayout'
import { listCharacters, listStories } from '@/wiki/registry'
import { stripWikiTags } from '@/wiki/utils/parser'
import { useWikiText } from '@/wiki/i18n'

export default function WikiHome() {
  const t = useWikiText()
  const characters = listCharacters()
  const stories = listStories()

  return (
    <WikiLayout>
      {/* Hero */}
      <section className="mb-10 rounded-3xl border border-border bg-card/70 p-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          {t.communityCurated}
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
          {t.homeTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-text-muted">{t.homeSubtitle}</p>

        {/* Contribution CTAs — front-and-centre so users always know they
            can grow the wiki without hunting for the button. */}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/new/character"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary-hover keep-white-on-light"
          >
            <UserPlus className="h-4 w-4" />
            {t.charactersCount(0).includes('character')
              ? '+ Add new character'
              : '+ Thêm nhân vật mới'}
          </Link>
          <Link
            to="/new/story"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <BookPlus className="h-4 w-4" />
            {t.charactersCount(0).includes('character')
              ? '+ Add new story'
              : '+ Thêm cốt truyện mới'}
          </Link>
        </div>
      </section>

      {/* Top characters */}
      <section className="mb-12">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-text">
            <Users className="h-5 w-5 text-primary" />
            {t.topCharacters}
          </h2>
          <span className="text-xs text-text-muted">{t.charactersCount(characters.length)}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((c) => (
            <Link
              key={c.id}
              to={`/wiki/character/${c.id}`}
              className="group flex gap-3 rounded-2xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/60"
            >
              <img
                src={c.avatarUrl}
                alt=""
                className="h-20 w-14 flex-shrink-0 rounded-md object-cover"
                onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-text group-hover:text-primary">{c.name}</p>
                <p className="mt-1 line-clamp-3 text-xs text-text-muted">
                  {stripWikiTags(c.shortBio)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Stories */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-text">
            <BookOpen className="h-5 w-5 text-primary" />
            {t.storiesAndLore}
          </h2>
          <span className="text-xs text-text-muted">{t.storiesCount(stories.length)}</span>
        </div>
        <ul className="space-y-3">
          {stories.map((s) => (
            <li key={s.id}>
              <Link
                to={`/wiki/story/${s.id}`}
                className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/60"
              >
                {s.coverUrl ? (
                  <img
                    src={s.coverUrl}
                    alt=""
                    className="h-24 w-16 flex-shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-16 flex-shrink-0 items-center justify-center rounded-md bg-surface text-text-muted">
                    <BookOpen className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text">{s.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-text-muted">
                    {stripWikiTags(s.shortSummary)}
                  </p>
                  {s.characterIds && s.characterIds.length > 0 && (
                    <p className="mt-2 text-[11px] text-text-muted">
                      {t.charactersCount(s.characterIds.length)}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </WikiLayout>
  )
}
