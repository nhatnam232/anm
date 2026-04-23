import { Link, useParams } from 'react-router-dom'
import { ArrowRight, BookOpen, Calendar, ExternalLink, Pencil, Users } from 'lucide-react'
import WikiLayout from '@/wiki/components/WikiLayout'
import WikiTextRenderer from '@/wiki/components/WikiTextRenderer'
import { getCharacter, getStory } from '@/wiki/registry'

export default function WikiCharacter() {
  const { id = '' } = useParams<{ id: string }>()
  const char = getCharacter(id)

  if (!char) {
    return (
      <WikiLayout>
        <div className="rounded-3xl border border-border bg-card p-12 text-center">
          <p className="text-lg font-semibold text-text">Không tìm thấy nhân vật "{id}"</p>
          <Link to="/wiki" className="mt-4 inline-block text-sm text-primary hover:underline">
            ← Về trang chủ Wiki
          </Link>
        </div>
      </WikiLayout>
    )
  }

  const stories = (char.storyIds ?? []).map(getStory).filter(Boolean)

  return (
    <WikiLayout>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main content (left) */}
        <article className="rounded-3xl border border-border bg-card p-6 shadow-xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-text-muted">Character</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
                {char.name}
              </h1>
            </div>
            <Link
              to={`/edit/character/${char.id}`}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-primary hover:text-primary"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit this page
            </Link>
          </div>

          <hr className="my-4 border-border" />

          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-text-muted">
            Tiểu sử
          </h2>
          <WikiTextRenderer text={char.bio} />

          {stories.length > 0 && (
            <>
              <hr className="my-6 border-border" />
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-muted">
                <BookOpen className="h-4 w-4" />
                Xuất hiện trong
              </h3>
              <ul className="space-y-2">
                {stories.map((s) => (
                  <li key={s!.id}>
                    <Link
                      to={`/wiki/story/${s!.id}`}
                      className="flex items-center gap-2 rounded-xl border border-border bg-surface/40 px-3 py-2 text-sm font-medium text-text transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      <BookOpen className="h-4 w-4 text-primary" />
                      <span className="flex-1">{s!.title}</span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Cross-link to main app character page (deep link back) */}
          {char.anilistCharacterId && (
            <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm">
              <p className="mb-2 text-xs uppercase tracking-widest text-primary">
                Cross-link
              </p>
              <Link
                to={`/character/${char.anilistCharacterId}`}
                className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
              >
                Xem trang nhân vật trên Anime Wiki gốc
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </article>

        {/* Infobox (right) */}
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
            <img
              src={char.avatarUrl}
              alt={char.name}
              className="h-72 w-full object-cover"
              onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
            />
            <div className="space-y-3 p-4 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-muted">Wiki ID</p>
                <p className="font-mono text-text">{char.id}</p>
              </div>
              {char.affiliations && char.affiliations.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted">
                    Affiliations
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {char.affiliations.map((a) => (
                      <span
                        key={a}
                        className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-text"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {char.updatedAt && (
                <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                  <Calendar className="h-3 w-3" />
                  Cập nhật {char.updatedAt}
                </div>
              )}
            </div>
          </div>

          {char.anilistCharacterId && (
            <Link
              to={`/character/${char.anilistCharacterId}`}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-text transition-colors hover:border-primary hover:text-primary"
            >
              <Users className="h-4 w-4" />
              Xem trên Anime Wiki gốc
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </Link>
          )}
        </aside>
      </div>
    </WikiLayout>
  )
}
