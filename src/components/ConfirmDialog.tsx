import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

type Props = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Visual tone — `danger` makes the confirm button red. Default `default`. */
  tone?: 'default' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Themed confirmation dialog used in place of native `confirm()`.
 * - Respects light / dark mode (uses theme tokens, not hardcoded slate).
 * - Backdrop click + ESC key both cancel.
 * - Lock body scroll while open.
 *
 * Used by:
 *   • Navbar sign-out button — "Bạn chắc chắn muốn đăng xuất?"
 *   • Future destructive actions (delete account, clear library, etc.)
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <button
            type="button"
            aria-label={cancelLabel}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card text-text shadow-2xl"
          >
            <div className="flex items-start gap-3 p-5">
              <span
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                  tone === 'danger'
                    ? 'bg-red-500/15 text-red-500'
                    : 'bg-primary/15 text-primary'
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-text">{title}</h3>
                {description && (
                  <p className="mt-1 text-sm text-text-muted">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full p-1 text-text-muted hover:bg-surface hover:text-text"
                aria-label={cancelLabel}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border bg-surface/40 px-5 py-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-text"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold text-white transition-colors keep-white-on-light ${
                  tone === 'danger'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-primary hover:bg-primary-hover'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
