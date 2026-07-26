import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Search, Users, X } from 'lucide-react'
import WikiLayout from '@/wiki/components/WikiLayout'
import { listCharacters, listStories } from '@/wiki/registry'
import { shortPreview, proxyImage } from '@/wiki/utils/format'
import { useLangContext } from '@/providers/LangProvider'

type Tab = 'all' | 'characters' | 'stories'

/**
 * Wiki index — every article in one place, with a filter box.
 *
 * WikiHome only surfaces a curated grid, so before this page the only way to
 * reach an article was a link somebody had manually placed. The main app has
 * BrowsePage for exactly this job; the wiki sub-app had no equivalent.
 *
 * The registry is a static in-memory object, so filtering client-side is fine
 * here — no debounce or server round-trip needed, unlike BrowsePage.
 */
export default function WikiAll() {
  const { lang } = useLangContext()
  const vi = lang === 'vi'
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('all')

  const characters = listCharacters()
  const stories = listStories()

  const needle = query.trim().toLowerCase()

  const filteredCharacters = useMemo(() => {
    if (tab === 'stories') return []
    if (!needle) return characters
    return characters.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        (c.affiliations ?? []).some((a) => a.toLowerCase().includes(needle)),
    )
  }, [characters, needle, tab])

  const filteredStories = useMemo(() => {
    if (tab === 'characters') return []
    if (!needle) return stories
    return stories.filter((s) => s.title.toLowerCase().includes(needle))
  }, [stories, needle, tab])

  const total = filteredCharacters.length + filteredStories.length

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'all', label: vi ? 'Tất cả' : 'All' },
    { key: 'characters', label: vi ? 'Nhân vật' : 'Characters' },
    { key: 'stories', label: vi ? 'Cốt truyện' : 'Stories' },
  ]

  return (
    <WikiLayout>
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-text">
          {vi ? 'Toàn bộ bài viết' : 'All articles'}
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          {vi
            ? `${characters.length} nhân vật · ${stories.length} cốt truyện`
            : `${characters.length} characters · ${stories.length} stories`}
        </p>
      </header>

      {/* Filter box */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={vi ? 'Tìm theo tên...' : 'Filter by name...'}
            className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-10 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-primary/60"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={vi ? 'Xoá bộ lọc' : 'Clear filter'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="flex gap-1.5">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={
                tab === item.key
                  ? 'rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white keep-white-on-light'
                  : 'rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-text-muted transition-colors hover:text-text'
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card/30 px-6 py-16 text-center">
          <Search className="h-10 w-10 text-primary/60" />
          <h2 className="text-lg font-semibold text-text">
            {vi ? 'Không tìm thấy bài viết nào' : 'No articles found'}
          </h2>
          <p className="max-w-sm text-sm text-text-muted">
            {vi
              ? `Không có kết quả cho "${query}". Thử từ khoá ngắn hơn, hoặc tự viết bài mới.`
              : `Nothing matches "${query}". Try a shorter term, or write the article yourself.`}
          </p>
          <Link
            to="/new/character"
            className="mt-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover keep-white-on-light"
          >
            {vi ? '+ Thêm nhân vật mới' : '+ Add new character'}
          </Link>
        </div>
      ) : null}

      {filteredCharacters.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-text">
            <Users className="h-5 w-5 text-primary" />
            {vi ? 'Nhân vật' : 'Characters'}
            <span className="text-xs font-normal text-text-muted">({filteredCharacters.length})</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCharacters.map((c) => (
              <Link
                key={c.id}
                to={`/wiki/character/${c.id}`}
                className="group flex gap-3 rounded-2xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/60"
              >
                <img
                  src={proxyImage(c.avatarUrl)}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-20 w-14 flex-shrink-0 rounded-md object-cover"
                  onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text group-hover:text-primary">{c.name}</p>
                  <p className="mt-1 line-clamp-3 text-xs text-text-muted">
                    {shortPreview(c.shortBio, lang)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {filteredStories.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-text">
            <BookOpen className="h-5 w-5 text-primary" />
            {vi ? 'Cốt truyện' : 'Stories'}
            <span className="text-xs font-normal text-text-muted">({filteredStories.length})</span>
          </h2>
          <ul className="space-y-3">
            {filteredStories.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/wiki/story/${s.id}`}
                  className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/60"
                >
                  {s.coverUrl ? (
                    <img
                      src={proxyImage(s.coverUrl)}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-24 w-16 flex-shrink-0 rounded-md object-cover"
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                    />
                  ) : (
                    <div className="flex h-24 w-16 flex-shrink-0 items-center justify-center rounded-md bg-surface text-text-muted">
                      <BookOpen className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-text">{s.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-text-muted">
                      {shortPreview(s.shortSummary, lang)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </WikiLayout>
  )
}
