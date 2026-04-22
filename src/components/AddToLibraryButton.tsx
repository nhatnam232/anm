import { useEffect, useState } from 'react'
import { BookmarkPlus, Check, Loader2, Trash2 } from 'lucide-react'
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
  { key: 'watching',      en: 'Watching',      vi: 'Đang xem', dot: 'bg-blue-400',   ring: 'ring-blue-400/40' },
  { key: 'completed',     en: 'Completed',     vi: 'Đã xem',   dot: 'bg-green-400',  ring: 'ring-green-400/40' },
  { key: 'plan_to_watch', en: 'Plan to Watch', vi: 'Muốn xem', dot: 'bg-purple-400', ring: 'ring-purple-400/40' },
  { key: 'on_hold',       en: 'On Hold',       vi: 'Tạm dừng', dot: 'bg-amber-400',  ring: 'ring-amber-400/40' },
  { key: 'dropped',       en: 'Dropped',       vi: 'Đã bỏ',    dot: 'bg-red-400',    ring: 'ring-red-400/40' },
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

  const label = (opt: (typeof STATUS_OPTIONS)[number]) => (lang === 'vi' ? opt.vi : opt.en)

  // Initial fetch
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

  const setStatus = async (status: WatchStatus) => {
    if (!user) {
      onAuthRequired?.()
      return
    }
    if (!isSupabaseConfigured) return
    setBusyKey(status)
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
    setBusyKey(null)

    if (error) {
      setCurrentStatus(previous) // rollback
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
    if (error) {
      setCurrentStatus(previous)
      toast.error(lang === 'vi' ? 'Không thể gỡ khỏi thư viện' : 'Could not remove from library', error.message)
      return
    }
    toast.info(lang === 'vi' ? 'Đã gỡ khỏi thư viện' : 'Removed from library', animeTitle)
  }

  // Not signed in → single CTA button
  if (!user) {
    return (
      <button
        onClick={() => onAuthRequired?.()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-background py-2 text-sm font-medium text-gray-100 transition-all hover:border-primary hover:bg-primary/10 hover:text-primary"
      >
        <BookmarkPlus className="h-4 w-4" />
        {lang === 'vi' ? 'Thêm vào thư viện' : 'Add to Library'}
      </button>
    )
  }

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-background/40 py-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        {lang === 'vi' ? 'Đang tải...' : 'Loading...'}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
        <BookmarkPlus className="h-3.5 w-3.5" />
        {lang === 'vi' ? 'Thư viện' : 'Library'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map((opt) => {
          const active = currentStatus === opt.key
          const busy = busyKey === opt.key
          return (
            <button
              key={opt.key}
              onClick={() => void setStatus(opt.key)}
              disabled={busy || busyKey !== null}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all disabled:opacity-50 ${
                active
                  ? `border-transparent bg-primary/20 text-primary ring-2 ${opt.ring}`
                  : 'border-gray-700 bg-background/60 text-gray-300 hover:border-primary/50 hover:text-white'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${opt.dot}`} />
              {label(opt)}
              {busy ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : active ? (
                <Check className="h-3 w-3" />
              ) : null}
            </button>
          )
        })}
        {currentStatus && (
          <button
            onClick={() => void removeFromLibrary()}
            disabled={busyKey !== null}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
            title={lang === 'vi' ? 'Gỡ khỏi thư viện' : 'Remove from library'}
          >
            {busyKey === 'remove' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          </button>
        )}
      </div>
    </div>
  )
}
