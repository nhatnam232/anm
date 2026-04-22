import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookmarkPlus, Check, ChevronDown, Loader2, Trash2 } from 'lucide-react'
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
  ring: string
}> = [
  { key: 'plan_to_watch', en: 'Plan to Watch', vi: 'Muốn xem', dot: 'bg-purple-400', ring: 'ring-purple-400/40' },
  { key: 'watching',      en: 'Watching',      vi: 'Đang xem',  dot: 'bg-blue-400',   ring: 'ring-blue-400/40' },
  { key: 'completed',     en: 'Completed',     vi: 'Đã xem',    dot: 'bg-green-400',  ring: 'ring-green-400/40' },
  { key: 'on_hold',       en: 'On Hold',       vi: 'Tạm dừng',  dot: 'bg-amber-400',  ring: 'ring-amber-400/40' },
  { key: 'dropped',       en: 'Dropped',       vi: 'Đã bỏ',     dot: 'bg-red-400',    ring: 'ring-red-400/40' },
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
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<WatchStatus | 'remove' | null>(null)
  const [currentStatus, setCurrentStatus] = useState<WatchStatus | null>(null)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const label = (opt: (typeof STATUS_OPTIONS)[number]) => (lang === 'vi' ? opt.vi : opt.en)
  const activeOpt = currentStatus ? STATUS_OPTIONS.find((o) => o.key === currentStatus) : null

  // Initial fetch.
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
      .then(({ data, error }) => {
        if (cancelled) return
        if (error && error.code !== 'PGRST116') {
          console.warn('[AddToLibrary] read failed', error)
        }
        setCurrentStatus((data?.status as WatchStatus | undefined) ?? null)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [animeId, user])

  // Click-away.
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const setStatus = async (status: WatchStatus) => {
    if (!user) {
      onAuthRequired?.()
      return
    }
    if (!isSupabaseConfigured) return
    setBusyKey(status)
    const previous = currentStatus
    setCurrentStatus(status)

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
    setBusyKey(null)
    setOpen(false)

    if (error) {
      setCurrentStatus(previous)
      console.error('[AddToLibrary] upsert failed', error)
      const friendly =
        lang === 'vi'
          ? error.code === '42P01'
            ? 'Bảng user_library chưa tồn tại. Hãy chạy supabase/setup_all.sql.'
            : `Không thể lưu vào thư viện (${error.code ?? 'lỗi'})`
          : error.code === '42P01'
            ? 'Table user_library does not exist. Run supabase/setup_all.sql.'
            : `Could not save to library (${error.code ?? 'error'})`
      toast.error(friendly, error.message)
      return
    }
    const opt = STATUS_OPTIONS.find((o) => o.key === status)!
    toast.success(
      previous
        ? lang === 'vi' ? 'Đã cập nhật trạng thái' : 'Library status updated'
        : lang === 'vi' ? 'Đã thêm vào thư viện' : 'Added to library',
      `${animeTitle} · ${label(opt)}`,
    )
  }

  const removeFromLibrary = async () => {
    if (!user || !currentStatus) return
    setBusyKey('remove')
    const previous = currentStatus
    setCurrentStatus(null)
    const { error } = await supabase
      .from('user_library')
      .delete()
      .eq('user_id', user.id)
      .eq('anime_id', animeId)
    setBusyKey(null)
    setOpen(false)
    if (error) {
      setCurrentStatus(previous)
      toast.error(
        lang === 'vi' ? 'Không thể gỡ khỏi thư viện' : 'Could not remove from library',
        error.message,
      )
      return
    }
    toast.info(lang === 'vi' ? 'Đã gỡ khỏi thư viện' : 'Removed from library', animeTitle)
  }

  // Not signed in → big CTA.
  if (!user) {
    return (
      <button
        onClick={() => onAuthRequired?.()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-emerald-500/50"
      >
        <BookmarkPlus className="h-4 w-4" />
        {lang === 'vi' ? 'Thêm vào thư viện' : 'Add to Library'}
      </button>
    )
  }

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-700 bg-background/40 py-2.5 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        {lang === 'vi' ? 'Đang tải...' : 'Loading...'}
      </div>
    )
  }

  // Signed in: single CTA button → click opens dropdown panel below.
  const isAdded = currentStatus !== null
  return (
    <div ref={rootRef} className="relative w-full">
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen((v) => !v)}
        disabled={busyKey !== null}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-60 ${
          isAdded
            ? 'border border-emerald-400/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
            : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50'
        }`}
      >
        {busyKey ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isAdded ? (
          <Check className="h-4 w-4" />
        ) : (
          <BookmarkPlus className="h-4 w-4" />
        )}
        <span>
          {isAdded
            ? `${lang === 'vi' ? 'Đã có trong thư viện' : 'In your library'} · ${activeOpt ? label(activeOpt) : ''}`
            : lang === 'vi'
              ? 'Thêm vào thư viện'
              : 'Add to Library'}
        </span>
        <ChevronDown
          className={`ml-auto h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl backdrop-blur"
          >
            <p className="px-2 pb-1 pt-0.5 text-[11px] uppercase tracking-widest text-gray-500">
              {lang === 'vi' ? 'Chọn trạng thái' : 'Pick a status'}
            </p>
            <ul className="space-y-0.5">
              {STATUS_OPTIONS.map((opt) => {
                const active = opt.key === currentStatus
                const busy = busyKey === opt.key
                return (
                  <li key={opt.key}>
                    <button
                      onClick={() => void setStatus(opt.key)}
                      disabled={busyKey !== null}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors disabled:opacity-50 ${
                        active
                          ? `bg-primary/15 text-primary ring-1 ${opt.ring}`
                          : 'text-gray-200 hover:bg-white/5'
                      }`}
                    >
                      <span className={`h-2 w-2 flex-shrink-0 rounded-full ${opt.dot}`} />
                      <span className="flex-1 text-left">{label(opt)}</span>
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : active ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
            {isAdded && (
              <>
                <div className="my-1 h-px bg-white/10" />
                <button
                  onClick={() => void removeFromLibrary()}
                  disabled={busyKey !== null}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/15 disabled:opacity-50"
                >
                  {busyKey === 'remove' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  <span>{lang === 'vi' ? 'Gỡ khỏi thư viện' : 'Remove from library'}</span>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
