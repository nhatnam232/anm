import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Calendar, ExternalLink, Pencil, Tv, Users } from 'lucide-react'
import WikiLayout from '@/wiki/components/WikiLayout'
import WikiTextRenderer from '@/wiki/components/WikiTextRenderer'
import { getCharacter, getStory } from '@/wiki/registry'

export default function WikiStory() {
  const { id = '' } = useParams<{ id: string }>()
  const story = getStory(id)

  if (!story) {
    return (
      <WikiLayout>
        <div className="rounded-3xl border border-border bg-card p-12 text-center">
          <p className="text-lg font-semibold text-text">Không tìm thấy story "{id}"</p>
          <Link to="/wiki" className="mt-4 inline-block text-sm text-primary hover:underline">
            ← Về trang chủ Wiki
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
              <p className="text-xs uppercase tracking-widest text-text-muted">Story / Lore</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
                {story.title}
              </h1>
              {story.updatedAt && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-text-muted">
                  <Calendar className="h-3 w-3" />
                  Cập nhật {story.updatedAt}
                </p>
              )}
            </div>
            <Link
              to={`/edit/story/${story.id}`}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-primary hover:text-primary"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit this page
            </Link>
          </div>

          <hr className="my-4 border-border" />

          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-text-muted">
            Tóm tắt
          </h2>
          <WikiTextRenderer text={story.shortSummary} className="mb-6" />

          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-text-muted">
            Nội dung chi tiết
          </h2>
          <WikiTextRenderer text={story.body} />

          {characters.length > 0 && (
            <>
              <hr className="my-6 border-border" />
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-muted">
                <Users className="h-4 w-4" />
                Nhân vật xuất hiện
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
                Xem chi tiết / Lịch chiếu
              </Link>
              <Link
                to={`/anime/${story.anilistAnimeId}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-primary hover:text-primary"
              >
                Thêm vào thư viện
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </article>
    </WikiLayout>
  )
}
