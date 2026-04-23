import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'

export type NotificationKind = 'new_episode' | 'system' | 'reply'

export type NotificationItem = {
  id: string
  user_id: string
  kind: NotificationKind
  anime_id: number | null
  anime_title: string | null
  anime_cover: string | null
  episode: number | null
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

type Ctx = {
  items: NotificationItem[]
  unreadCount: number
  loading: boolean
  refresh: () => Promise<void>
  markAllRead: () => Promise<void>
  markRead: (id: string) => Promise<void>
  dismiss: (id: string) => Promise<void>
}

const NotificationsContext = createContext<Ctx | null>(null)

/**
 * Centralised notifications feed for the signed-in user.
 *
 * - Loads the most-recent 30 entries from `notifications` table on mount and
 *   when the user changes.
 * - Subscribes to realtime INSERT events so the bell badge updates without
 *   needing a refresh — important UX given the cron job inserts new-episode
 *   rows asynchronously.
 * - Falls back to a polling timer (60s) if realtime isn't available.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setItems([])
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setLoading(false)
    if (error) {
      // Silently degrade — table might not be migrated yet on dev DB.
      if (error.code !== '42P01') {
        console.warn('[notifications] load failed', error.message)
      }
      setItems([])
      return
    }
    setItems((data ?? []) as NotificationItem[])
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Realtime subscribe (INSERT/UPDATE/DELETE on notifications)
  useEffect(() => {
    if (!user || !isSupabaseConfigured) return
    const ch = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => void refresh(),
      )
      .subscribe()
    // Polling fallback every 60s in case realtime is disabled
    const interval = window.setInterval(() => void refresh(), 60_000)
    return () => {
      supabase.removeChannel(ch)
      window.clearInterval(interval)
    }
  }, [user, refresh])

  const markRead = useCallback(
    async (id: string) => {
      if (!user || !isSupabaseConfigured) return
      // Optimistic update
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
      )
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) console.warn('[notifications] markRead failed', error.message)
    },
    [user],
  )

  const markAllRead = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return
    const now = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })))
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('user_id', user.id)
      .is('read_at', null)
    if (error) console.warn('[notifications] markAllRead failed', error.message)
  }, [user])

  const dismiss = useCallback(
    async (id: string) => {
      if (!user || !isSupabaseConfigured) return
      setItems((prev) => prev.filter((n) => n.id !== id))
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) console.warn('[notifications] dismiss failed', error.message)
    },
    [user],
  )

  const unreadCount = useMemo(() => items.filter((n) => !n.read_at).length, [items])

  const value = useMemo<Ctx>(
    () => ({ items, unreadCount, loading, refresh, markAllRead, markRead, dismiss }),
    [items, unreadCount, loading, refresh, markAllRead, markRead, dismiss],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications(): Ctx {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    // Permissive: components can be mounted in pages without the provider
    // (e.g. ToS, NotFound) — return a noop shape.
    return {
      items: [],
      unreadCount: 0,
      loading: false,
      refresh: async () => {},
      markAllRead: async () => {},
      markRead: async () => {},
      dismiss: async () => {},
    }
  }
  return ctx
}
