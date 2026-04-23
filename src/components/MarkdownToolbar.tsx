import { useMemo } from 'react'
import { Bold, EyeOff, Italic } from 'lucide-react'
import { useLangContext } from '@/providers/LangProvider'

type Props = {
  /** Ref / id of the textarea element to insert markdown into. */
  textareaRef: React.RefObject<HTMLTextAreaElement>
  value: string
  onChange: (next: string) => void
  className?: string
}

type Marker = '**' | '*' | '||'

/**
 * Inline toolbar for inserting common markdown markers (**bold**, *italic*,
 * ||spoiler||). Behavior:
 *
 *   • If the current selection is ALREADY wrapped by the marker on both sides,
 *     the toolbar STRIPS the markers (toggle off). This avoids the
 *     "**bold****bold**" spam reported by users when they hit the bold
 *     button twice in a row.
 *   • If the marker exists immediately INSIDE the selection (e.g. user
 *     selected `**foo**` including the markers), strip those instead.
 *   • Otherwise wrap the selection (or insert a placeholder if no text was
 *     selected). The cursor is restored to the inner text so users can keep
 *     typing.
 */
export default function MarkdownToolbar({ textareaRef, value, onChange, className }: Props) {
  const { t } = useLangContext()

  const apply = (marker: Marker, placeholder: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart ?? 0
    const end = ta.selectionEnd ?? 0
    const before = value.slice(0, start)
    const selected = value.slice(start, end)
    const after = value.slice(end)
    const m = marker
    const mLen = m.length

    let next: string
    let nextStart: number
    let nextEnd: number

    // Case 1 — selection itself is wrapped: "**foo**" → "foo"
    if (
      selected.length >= mLen * 2 &&
      selected.startsWith(m) &&
      selected.endsWith(m)
    ) {
      const inner = selected.slice(mLen, selected.length - mLen)
      next = before + inner + after
      nextStart = start
      nextEnd = start + inner.length
    }
    // Case 2 — markers are immediately outside selection: "**|foo|**" → "foo"
    else if (
      before.endsWith(m) &&
      after.startsWith(m)
    ) {
      next = before.slice(0, -mLen) + selected + after.slice(mLen)
      nextStart = start - mLen
      nextEnd = end - mLen
    }
    // Case 3 — wrap as new
    else {
      const body = selected || placeholder
      next = `${before}${m}${body}${m}${after}`
      nextStart = start + mLen
      nextEnd = nextStart + body.length
    }

    onChange(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(nextStart, nextEnd)
    })
  }

  const buttons = useMemo(
    () => [
      { marker: '**' as const, icon: Bold, title: `${t.insertBold} (Ctrl+B)`, placeholder: t.insertBold.toLowerCase(), tone: 'default' },
      { marker: '*'  as const, icon: Italic, title: `${t.insertItalic} (Ctrl+I)`, placeholder: t.insertItalic.toLowerCase(), tone: 'default' },
      { marker: '||' as const, icon: EyeOff, title: t.insertSpoiler, placeholder: t.insertSpoiler.toLowerCase(), tone: 'amber', label: t.insertSpoiler },
    ],
    [t.insertBold, t.insertItalic, t.insertSpoiler],
  )

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className ?? ''}`}>
      {buttons.map((b) => {
        const Icon = b.icon
        const tone = b.tone === 'amber'
          ? 'text-text-muted hover:bg-amber-500/15 hover:text-amber-400'
          : 'text-text-muted hover:bg-surface hover:text-text'
        return (
          <button
            key={b.marker}
            type="button"
            title={b.title}
            onClick={() => apply(b.marker, b.placeholder)}
            className={`flex h-7 items-center justify-center gap-1 rounded-md px-2 transition-colors ${tone}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {b.label && <span className="hidden text-xs sm:inline">{b.label}</span>}
          </button>
        )
      })}
      <span className="ml-1 hidden text-[10px] text-text-muted/70 sm:inline">
        {t.formattingHint}
      </span>
    </div>
  )
}

/**
 * Keyboard shortcut handler — call from textarea.onKeyDown to wire up
 * Ctrl/Cmd+B, Ctrl/Cmd+I to insert/strip bold/italic. Reuses the SAME toggle
 * logic as the toolbar buttons so both code paths stay in sync.
 */
export function applyMarkdownShortcut(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  value: string,
  onChange: (next: string) => void,
): boolean {
  if (!(e.ctrlKey || e.metaKey)) return false
  const key = e.key.toLowerCase()
  if (key !== 'b' && key !== 'i') return false
  e.preventDefault()
  const ta = e.currentTarget
  const start = ta.selectionStart ?? 0
  const end = ta.selectionEnd ?? 0
  const m: Marker = key === 'b' ? '**' : '*'
  const mLen = m.length
  const before = value.slice(0, start)
  const selected = value.slice(start, end)
  const after = value.slice(end)

  let next: string
  let nextStart: number
  let nextEnd: number

  if (selected.length >= mLen * 2 && selected.startsWith(m) && selected.endsWith(m)) {
    const inner = selected.slice(mLen, selected.length - mLen)
    next = before + inner + after
    nextStart = start
    nextEnd = start + inner.length
  } else if (before.endsWith(m) && after.startsWith(m)) {
    next = before.slice(0, -mLen) + selected + after.slice(mLen)
    nextStart = start - mLen
    nextEnd = end - mLen
  } else {
    const body = selected || (key === 'b' ? 'bold' : 'italic')
    next = `${before}${m}${body}${m}${after}`
    nextStart = start + mLen
    nextEnd = nextStart + body.length
  }

  onChange(next)
  requestAnimationFrame(() => {
    ta.focus()
    ta.setSelectionRange(nextStart, nextEnd)
  })
  return true
}
