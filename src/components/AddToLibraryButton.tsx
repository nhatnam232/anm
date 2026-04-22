import { useEffect, useRef, useState } from 'react'
import {
  BookmarkPlus,
  Check,
  ChevronDown,
  CircleDashed,
  Loader2,
  Trash2,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'
import { useLangContext } from '@/providers/LangProvider'

type WatchStatus = 'watching' | 'completed' | 'plan_to_watch' | 'dropped' | 'on_hold'

type Props = {
  animeId: number
  animeTitle: string
  animeCover?: string | null
  animeEpisodes?: number | null
  onAuthRequired?: () => void
}

const STATUS_OPTIONS: Array<{
  key: WatchStatus
  en: string
  vi: string
  dot: string
}> = [
  { key: 'watching', en: 'Watching', vi: 'Đang xem', dot: 'bg-blue-400' },
  { key: 'completed', en: 'Completed', vi: 'Đã xem', dot: 'bg-green-400' },
  { key: 'plan_to_watch', en: 'Plan to Watch', vi: 'Muốn xem', dot: 'bg-purple-400' },
  { key: 'on_hold', en: 'On Hold', vi: 'Tạm dừng', dot: 'bg-amber-400' },
  { key: 'dropped', en: 'Dropped', vi: 'Đã bỏ', dot: 'bg-red-400' },
]

export default function AddToLibraryButton({
  animeId,
  animeTitle,
  animeCover,
  animeEpisodes,
  onAuthRequired,
}: Props) {
  const { user } = useAuth()
  const { lang } = useLangContext()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<WatchStatus | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const label = (opt: (typeof STATUS_OPTIONS)[number]) => (lang === 'vi' ? opt.vi : opt.en)

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('user_library')
      .select('status')
      .eq('user_id', user.id)
      .eq('anime_id', animeId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setCurrentStatus((data?.status as WatchStatus | undefined) ?? null)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [animeId, user])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const setStatus = async (status: WatchStatus) => {
    if (!user) {
      onAuthRequired?.()
      return
    }
    if (!isSupabaseConfigured) return
    setBusy(true)
    const previous = currentStatus
    setCurrentStatus(status) // optimistic
    const { error } = await supabase.from('user_library').upsert(
      {
        user_id: user.id,
        anime_id: animeId,
        anime_title: animeTitle,
        anime_cover: animeCover ?? null,
        anime_episodes: animeEpisodes ?? null,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,anime_id' },
    )
    setBusy(false)
    setOpen(false)
    if (error) {
      setCurrentStatus(previous) // rollback
      toast.error(
        lang === 'vi' ? 'Không thể lưu vào thư viện' : 'Could not save to library',
        error.message,
      )
      return
    }
    const opt = STATUS_OPTIONS.find((o) => o.key === status)!
    toast.success(
      previous
        ? lang === 'vi'
          ? 'Đã cập nhật trạng thái'
          : 'Library status updated'
        : lang === 'vi'
          ? 'Đã thêm vào thư viện'
          : 'Added to library',
      `${animeTitle} · ${label(opt)}`,
    )
  }

  const removeFromLibrary = async () => {
    if (!user || !currentStatus) return
    setBusy(true)
    const previous = currentStatus
    setCurrentStatus(null)
    const { error } = await supabase
      .from('user_library')
      .delete()
      .eq('user_id', user.id)
      .eq('anime_id', animeId)
    setBusy(false)
    setOpen(false)
    if (error) {
      setCurrentStatus(previous)
      toast.error(
        lang === 'vi' ? 'Không thể gỡ khỏi thư viện' : 'Could not remove from library',
        error.message,
      )
      return
    }
    toast.info(
      lang === 'vi' ? 'Đã gỡ khỏi thư viện' : 'Removed from library',
      animeTitle,
    )
  }

  const activeOpt = currentStatus
    ? STATUS_OPTIONS.find((o) => o.key === currentStatus)
    : null

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        onClick={() => {
          if (!user) {
            onAuthRequired?.()
            return
          }
          setOpen((v) => !v)
        }}
        disabled={busy || loading}
        className={`flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all disabled:opacity-60 ${
          currentStatus
            ? 'border border-primary/40 bg-primary/15 text-primary hover:bg-primary/25'
            : 'border border-gray-700 bg-background text-gray-100 hover:border-primary hover:bg-primary/10 hover:text-primary'
        }`}
      >
        {busy || loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : currentStatus ? (
          <Check className="h-4 w-4" />
        ) : (
          <BookmarkPlus className="h-4 w-4" />
        )}
        {activeOpt
          ? label(activeOpt)
          : lang === 'vi'
            ? 'Thêm vào thư viện'
            : 'Add to Library'}
        <ChevronDown
          className={`ml-auto h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-gray-700 bg-card shadow-2xl animate-[fadeIn_0.18s_ease-out]">
          <ul className="py-1">
            {STATUS_OPTIONS.map((opt) => {
              const active = opt.key === currentStatus
              return (
                <li key={opt.key}>
                  <button
                    onClick={() => void setStatus(opt.key)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-primary/15 text-primary'
                        : 'text-gray-200 hover:bg-white/5'
                    }`}
                  >
                    <span className={`h-2 w-2 flex-shrink-0 rounded-full ${opt.dot}`} />
                    <span className="flex-1 text-left">{label(opt)}</span>
                    {active ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <CircleDashed className="h-4 w-4 opacity-40" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
          {currentStatus && (
            <div className="border-t border-gray-800">
              <button
                onClick={() => void removeFromLibrary()}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                {lang === 'vi' ? 'Gỡ khỏi thư viện' : 'Remove from library'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
