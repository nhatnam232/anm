import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

export type ToastKind = 'success' | 'error' | 'info'

type Toast = {
  id: number
  kind: ToastKind
  title: string
  description?: string
  duration: number
}

type ToastInput = {
  kind?: ToastKind
  title: string
  description?: string
  duration?: number
}

type ToastContextValue = {
  show: (input: ToastInput) => number
  success: (title: string, description?: string) => number
  error: (title: string, description?: string) => number
  info: (title: string, description?: string) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const KIND_STYLES: Record<
  ToastKind,
  { icon: ReactNode; ring: string; bar: string; bg: string; accent: string }
> = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    ring: 'ring-emerald-500/30',
    bar: 'from-emerald-400 to-teal-400',
    bg: 'from-emerald-500/10 to-emerald-500/0',
    accent: 'text-emerald-300',
  },
  error: {
    icon: <AlertCircle className="h-5 w-5" />,
    ring: 'ring-red-500/30',
    bar: 'from-red-400 to-rose-400',
    bg: 'from-red-500/10 to-red-500/0',
    accent: 'text-red-300',
  },
  info: {
    icon: <Info className="h-5 w-5" />,
    ring: 'ring-sky-500/30',
    bar: 'from-sky-400 to-indigo-400',
    bg: 'from-sky-500/10 to-sky-500/0',
    accent: 'text-sky-300',
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counterRef = useRef(0)
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const show = useCallback(
    ({ kind = 'info', title, description, duration = 3200 }: ToastInput) => {
      const id = ++counterRef.current
      setToasts((prev) => [...prev, { id, kind, title, description, duration }])
      const timer = setTimeout(() => {
        dismiss(id)
      }, duration)
      timers.current.set(id, timer)
      return id
    },
    [dismiss],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (title, description) => show({ kind: 'success', title, description }),
      error: (title, description) => show({ kind: 'error', title, description }),
      info: (title, description) => show({ kind: 'info', title, description }),
      dismiss,
    }),
    [dismiss, show],
  )

  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach((t) => clearTimeout(t))
      map.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 top-4 z-[1000] flex flex-col items-center gap-2 px-4 sm:left-auto sm:right-4 sm:top-4 sm:items-end sm:px-0"
      >
        {toasts.map((t) => {
          const style = KIND_STYLES[t.kind]
          return (
            <div
              key={t.id}
              className={`pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 px-4 py-3 pr-10 text-sm text-white shadow-2xl ring-1 ${style.ring} backdrop-blur-md animate-[toastIn_0.28s_cubic-bezier(0.16,1,0.3,1)]`}
              role="status"
            >
              <div
                className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${style.bar}`}
                aria-hidden
              />
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${style.bg}`}
                aria-hidden
              />
              <div className={`relative mt-0.5 flex-shrink-0 ${style.accent}`}>{style.icon}</div>
              <div className="relative min-w-0 flex-1">
                <div className="font-semibold leading-tight">{t.title}</div>
                {t.description && (
                  <div className="mt-0.5 text-xs text-slate-300">{t.description}</div>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="absolute right-2 top-2 rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}
