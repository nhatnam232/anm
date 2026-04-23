import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, Globe2, Loader2 } from 'lucide-react'
import { useWikipediaSections, useWikipediaSummary } from '@/wiki/hooks/useWikipedia'
import { useLangContext } from '@/providers/LangProvider'

type Props = {
  /** Wikipedia slug for the EN article (e.g. "Frieren"). Required. */
  slug?: string | null
  /** Optional VI slug — tried first when site lang is Vietnamese. */
  slugVi?: string | null
}

/**
 * Themed "Read on Wikipedia" panel that drops into any Wiki page.
 *
 * - Always uses theme tokens (`bg-card`, `text-text`, `border-border`) so
 *   it inherits light/dark mode from the rest of the site.
 * - Lazy-loads sections (only when user clicks expand) — saves bandwidth
 *   and keeps initial page render fast.
 * - When Wikipedia is only available in EN, server runs each section
 *   through DeepL/MyMemory and the UI shows the translated text first,
 *   with a "Show original" toggle for purists.
 * - Always shows attribution per Wikipedia's CC-BY-SA license.
 */
export default function WikipediaPanel({ slug, slugVi }: Props) {
  const { lang } = useLangContext()
  const summary = useWikipediaSummary(slugVi, slug)
  const [expanded, setExpanded] = useState(false)
  const sections = useWikipediaSections(slugVi, slug, expanded)
  const [showOriginal, setShowOriginal] = useState(false)

  if (!slug && !slugVi) return null
  if (summary.loading) {
    return (
      <div className="my-6 flex items-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        {lang === 'vi' ? 'Đang tải nội dung Wikipedia…' : 'Loading Wikipedia content…'}
      </div>
    )
  }
  if (!summary.data) return null

  const wasTranslated = sections.data?.translatedTo && sections.data.lang !== sections.data.translatedTo
  const langLabel = summary.data.lang.toUpperCase()
  const isCrossLang = (lang === 'vi' && summary.data.lang === 'en')

  return (
    <section className="my-6 overflow-hidden rounded-2xl border border-border bg-card text-text shadow-sm">
      <header className="flex items-start justify-between gap-3 border-b border-border bg-surface/40 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Globe2 className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
              {lang === 'vi' ? 'Từ Wikipedia' : 'From Wikipedia'}
              <span className="ml-2 inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-text-muted">
                {langLabel}
              </span>
            </h3>
            <p className="mt-1 text-base font-semibold text-text">{summary.data.title}</p>
            {summary.data.description && (
              <p className="mt-0.5 text-xs italic text-text-muted">{summary.data.description}</p>
            )}
          </div>
        </div>
        {summary.data.thumbnail && (
          <img
            src={summary.data.thumbnail}
            alt=""
            className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
            onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
          />
        )}
      </header>

      {isCrossLang && (
        <p className="border-b border-border bg-amber-500/10 px-4 py-2 text-[11px] text-amber-700 dark:text-amber-200">
          {lang === 'vi'
            ? 'Wikipedia tiếng Việt không có bài này — đang hiện bài tiếng Anh và sẽ tự dịch khi bạn mở rộng.'
            : 'Vietnamese Wikipedia has no article — falling back to English.'}
        </p>
      )}

      <div className="space-y-3 p-4">
        {/* Lead extract */}
        <p className="whitespace-pre-line text-sm leading-relaxed text-text">
          {summary.data.extract}
        </p>

        {/* Expand button */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <BookOpen className="h-3.5 w-3.5" />
            {expanded
              ? lang === 'vi' ? 'Ẩn nội dung chi tiết' : 'Hide full sections'
              : lang === 'vi' ? 'Đọc các phần đầy đủ' : 'Read full sections'}
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {summary.data.pageUrl && (
            <a
              href={summary.data.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-primary"
            >
              {lang === 'vi' ? 'Mở trên Wikipedia' : 'Open on Wikipedia'}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Sections — lazy-loaded */}
        {expanded && (
          <div className="mt-2 space-y-4 border-t border-border pt-4">
            {sections.loading && (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                {lang === 'vi' ? 'Đang tải các phần & dịch…' : 'Loading sections & translating…'}
              </div>
            )}
            {sections.error && (
              <p className="text-sm text-red-500">⚠️ {sections.error}</p>
            )}
            {sections.data && (
              <>
                {wasTranslated && (
                  <div className="flex items-center justify-between rounded-xl bg-surface/60 px-3 py-2 text-[11px] text-text-muted">
                    <span>
                      {lang === 'vi'
                        ? `Dịch tự động từ Wikipedia ${sections.data.lang.toUpperCase()} bằng DeepL/MyMemory.`
                        : `Auto-translated from ${sections.data.lang.toUpperCase()} Wikipedia via DeepL/MyMemory.`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowOriginal((v) => !v)}
                      className="rounded-full border border-border px-2 py-0.5 font-semibold hover:border-primary hover:text-primary"
                    >
                      {showOriginal
                        ? lang === 'vi' ? 'Xem bản dịch' : 'Show translated'
                        : lang === 'vi' ? 'Xem bản gốc' : 'Show original'}
                    </button>
                  </div>
                )}
                {sections.data.sections.map((s) => {
                  const text = !showOriginal && s.translated ? s.translated : s.text
                  if (!text) return null
                  return (
                    <article key={s.id}>
                      <h4 className="mb-1.5 text-sm font-bold text-text">{s.title}</h4>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-text-muted">
                        {text}
                      </p>
                    </article>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>

      <footer className="border-t border-border bg-surface/40 px-4 py-2 text-[10px] text-text-muted">
        {lang === 'vi'
          ? 'Nguồn: Wikipedia, được cấp phép theo CC BY-SA 4.0.'
          : 'Source: Wikipedia, licensed under CC BY-SA 4.0.'}
      </footer>
    </section>
  )
}
