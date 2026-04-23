import { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLangContext } from '@/providers/LangProvider'

type Props = {
  /** ISO `YYYY-MM-DD` value (or empty string). */
  value: string
  onChange: (next: string) => void
  /** Optional `min` and `max` ISO bounds. */
  min?: string
  max?: string
  placeholder?: string
  className?: string
  /** Disabled / readonly states. */
  disabled?: boolean
}

const VI_MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12']
const EN_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const VI_DOW = ['CN','T2','T3','T4','T5','T6','T7']
const EN_DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function toIso(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function parseIso(s: string): { y: number; m: number; d: number } | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) }
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate()
}

/**
 * Themed date-picker popover that replaces native `<input type="date">`.
 *
 * Why custom?
 *   - Native date input shows the OS chrome which clashes hard with the
 *     site's purple gradient theme + light/dark switching.
 *   - User asked for a "đẹp hơn" picker.
 *
 * UX:
 *   - Trigger button shows the formatted date or placeholder.
 *   - Click → popover with month/year nav + day grid.
 *   - Year picker reachable by clicking the title.
 *   - ESC + click-away to close.
 *   - Keyboard: arrow keys to move selection (when popover open).
 */
export default function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder,
  className = '',
  disabled = false,
}: Props) {
  const { lang } = useLangContext()
  const months = lang === 'vi' ? VI_MONTHS : EN_MONTHS
  const dow = lang === 'vi' ? VI_DOW : EN_DOW

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const parsed = parseIso(value)
  const today = new Date()
  const initialView = parsed
    ? { y: parsed.y, m: parsed.m }
    : { y: today.getFullYear(), m: today.getMonth() }
  const [view, setView] = useState(initialView)
  const [yearMode, setYearMode] = useState(false)

  // Re-sync view when `value` changes externally
  useEffect(() => {
    const p = parseIso(value)
    if (p) setView({ y: p.y, m: p.m })
  }, [value])

  // Click-away + ESC
  useEffect(() => {
    if (!open) return
    const onClickAway = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClickAway)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickAway)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const minP = min ? parseIso(min) : null
  const maxP = max ? parseIso(max) : null

  function isOutOfRange(y: number, m: number, d: number) {
    const target = new Date(y, m, d).getTime()
    if (minP && target < new Date(minP.y, minP.m, minP.d).getTime()) return true
    if (maxP && target > new Date(maxP.y, maxP.m, maxP.d).getTime()) return true
    return false
  }

  const grid = useMemo(() => {
    const firstDow = new Date(view.y, view.m, 1).getDay()
    const total = daysInMonth(view.y, view.m)
    const cells: Array<{ d: number | null }> = []
    for (let i = 0; i < firstDow; i++) cells.push({ d: null })
    for (let d = 1; d <= total; d++) cells.push({ d })
    while (cells.length % 7 !== 0) cells.push({ d: null })
    return cells
  }, [view])

  function gotoPrev() {
    const next = view.m === 0 ? { y: view.y - 1, m: 11 } : { y: view.y, m: view.m - 1 }
    setView(next)
  }
  function gotoNext() {
    const next = view.m === 11 ? { y: view.y + 1, m: 0 } : { y: view.y, m: view.m + 1 }
    setView(next)
  }

  const formatted = parsed
    ? lang === 'vi'
      ? `${pad(parsed.d)}/${pad(parsed.m + 1)}/${parsed.y}`
      : new Date(parsed.y, parsed.m, parsed.d).toLocaleDateString(undefined, {
          year: 'numeric', month: 'short', day: 'numeric',
        })
    : ''

  const yearRange = useMemo(() => {
    const base = view.y - (view.y % 12)
    return Array.from({ length: 12 }, (_, i) => base + i)
  }, [view.y])

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={`flex w-full items-center gap-2 rounded-xl border bg-background px-4 py-3 text-left text-sm transition-colors ${
          open ? 'border-primary' : 'border-border hover:border-primary/60'
        } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        <Calendar className="h-4 w-4 text-text-muted" />
        <span className={`flex-1 ${formatted ? 'text-text' : 'text-text-muted'}`}>
          {formatted || placeholder || (lang === 'vi' ? 'Chọn ngày' : 'Pick a date')}
        </span>
        {value && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation()
              if (disabled) return
              onChange('')
            }}
            className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-text-muted hover:bg-surface hover:text-text"
            aria-label={lang === 'vi' ? 'Xoá' : 'Clear'}
          >
            ✕
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="false"
          className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-card text-text shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <button
              type="button"
              onClick={gotoPrev}
              className="rounded-full p-1.5 text-text-muted hover:bg-surface hover:text-text"
              aria-label={lang === 'vi' ? 'Tháng trước' : 'Previous month'}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setYearMode((v) => !v)}
              className="flex-1 rounded-lg px-3 py-1 text-sm font-semibold text-text hover:bg-surface"
            >
              {yearMode
                ? `${yearRange[0]} – ${yearRange[yearRange.length - 1]}`
                : `${months[view.m]} ${view.y}`}
            </button>
            <button
              type="button"
              onClick={gotoNext}
              className="rounded-full p-1.5 text-text-muted hover:bg-surface hover:text-text"
              aria-label={lang === 'vi' ? 'Tháng sau' : 'Next month'}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Body — either day grid or year picker */}
          {yearMode ? (
            <div className="grid grid-cols-3 gap-1 p-2">
              {yearRange.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setView({ y, m: view.m })
                    setYearMode(false)
                  }}
                  className={`rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                    y === view.y
                      ? 'bg-primary text-white'
                      : 'text-text-muted hover:bg-surface hover:text-text'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-2 pb-2">
              <div className="mb-1 grid grid-cols-7 gap-1 px-1 pt-1 text-center text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {dow.map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {grid.map((cell, i) => {
                  if (cell.d === null) return <div key={i} />
                  const iso = toIso(view.y, view.m, cell.d)
                  const isSelected = iso === value
                  const isToday =
                    view.y === today.getFullYear() &&
                    view.m === today.getMonth() &&
                    cell.d === today.getDate()
                  const disabled = isOutOfRange(view.y, view.m, cell.d)
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        onChange(iso)
                        setOpen(false)
                      }}
                      className={`h-9 rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-primary text-white shadow-md'
                          : isToday
                            ? 'bg-primary/15 text-primary ring-1 ring-primary/40'
                            : 'text-text hover:bg-surface'
                      } disabled:cursor-not-allowed disabled:opacity-30`}
                    >
                      {cell.d}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs">
            <button
              type="button"
              onClick={() => {
                const t = new Date()
                onChange(toIso(t.getFullYear(), t.getMonth(), t.getDate()))
                setOpen(false)
              }}
              className="rounded-full px-3 py-1 font-medium text-primary hover:bg-primary/10"
            >
              {lang === 'vi' ? 'Hôm nay' : 'Today'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full px-3 py-1 font-medium text-text-muted hover:bg-surface hover:text-text"
            >
              {lang === 'vi' ? 'Đóng' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
