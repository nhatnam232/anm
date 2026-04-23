import { Link } from 'react-router-dom'
import { BookOpen, Sparkles, Users } from 'lucide-react'
import WikiLayout from '@/wiki/components/WikiLayout'
import { listCharacters, listStories } from '@/wiki/registry'
import { stripWikiTags } from '@/wiki/utils/parser'

export default function WikiHome() {
  const characters = listCharacters()
  const stories = listStories()

  return (
    <WikiLayout>
      {/* Hero */}
      <section className="mb-10 rounded-3xl border border-border bg-card/70 p-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Community-curated lore
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
          Fandom Wiki — Tóm tắt thế giới
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-text-muted">
          Toàn bộ tiểu sử nhân vật, cốt truyện và các mối liên kết được người
          dùng đóng góp. Click vào bất kỳ tên nhân vật nào trong văn bản để
          mở thẻ preview hoặc nhảy thẳng tới trang tiểu sử.
        </p>
      </section>

      {/* Top characters */}
      <section className="mb-12">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-text">
            <Users className="h-5 w-5 text-primary" />
            Nhân vật nổi bật
          </h2>
          <span className="text-xs text-text-muted">{characters.length} nhân vật</span>
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
            Cốt truyện & Lore
          </h2>
          <span className="text-xs text-text-muted">{stories.length} bài viết</span>
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
                      {s.characterIds.length} nhân vật xuất hiện
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
