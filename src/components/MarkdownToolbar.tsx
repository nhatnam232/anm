import { Bold, EyeOff, Italic } from 'lucide-react'
import { useLangContext } from '@/providers/LangProvider'

type Props = {
  /** Ref / id of the textarea element to insert markdown into. */
  textareaRef: React.RefObject<HTMLTextAreaElement>
  value: string
  onChange: (next: string) => void
  className?: string
}

/**
 * Inline toolbar for inserting common markdown markers (**bold**, *italic*,
 * ||spoiler||). Wraps the current selection or inserts a placeholder if no
 * text is selected.
 */
export default function MarkdownToolbar({ textareaRef, value, onChange, className }: Props) {
  const { t } = useLangContext()

  const wrap = (open: string, close: string, placeholder: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart ?? 0
    const end = ta.selectionEnd ?? 0
    const selected = value.slice(start, end) || placeholder
    const before = value.slice(0, start)
    const after = value.slice(end)
    const next = `${before}${open}${selected}${close}${after}`
    onChange(next)
    // Restore selection after React re-render
    requestAnimationFrame(() => {
      ta.focus()
      const newStart = start + open.length
      const newEnd = newStart + selected.length
      ta.setSelectionRange(newStart, newEnd)
    })
  }

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className ?? ''}`}>
      <button
        type="button"
        title={t.insertBold + ' (Ctrl+B)'}
        onClick={() => wrap('**', '**', t.insertBold.toLowerCase())}
        className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface hover:text-text"
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title={t.insertItalic + ' (Ctrl+I)'}
        onClick={() => wrap('*', '*', t.insertItalic.toLowerCase())}
        className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface hover:text-text"
      >
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title={t.insertSpoiler}
        onClick={() => wrap('||', '||', t.insertSpoiler.toLowerCase())}
        className="flex h-7 items-center justify-center gap-1 rounded-md px-2 text-text-muted transition-colors hover:bg-amber-500/15 hover:text-amber-400"
      >
        <EyeOff className="h-3.5 w-3.5" />
        <span className="hidden text-xs sm:inline">{t.insertSpoiler}</span>
      </button>
      <span className="ml-1 hidden text-[10px] text-text-muted/70 sm:inline">
        {t.formattingHint}
      </span>
    </div>
  )
}

/**
 * Keyboard shortcut handler — call from textarea.onKeyDown to wire up
 * Ctrl/Cmd+B, Ctrl/Cmd+I to insert bold/italic.
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
  const selected = value.slice(start, end) || (key === 'b' ? 'bold' : 'italic')
  const marker = key === 'b' ? '**' : '*'
  const before = value.slice(0, start)
  const after = value.slice(end)
  const next = `${before}${marker}${selected}${marker}${after}`
  onChange(next)
  requestAnimationFrame(() => {
    ta.focus()
    const newStart = start + marker.length
    const newEnd = newStart + selected.length
    ta.setSelectionRange(newStart, newEnd)
  })
  return true
}
