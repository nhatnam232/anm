import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { queryKeys } from '@/lib/queryClient'

export type WatchStatus = 'watching' | 'completed' | 'plan_to_watch' | 'dropped' | 'on_hold'

export type LibraryEntry = {
  id?: string
  user_id?: string
  anime_id: number
  anime_title: string
  anime_cover: string | null
  anime_episodes: number | null
  status: WatchStatus
  current_episode?: number
  score?: number | null
  notes?: string | null
  updated_at?: string
}

/**
 * Single entry lookup for "is this anime in my library?" check, with React
 * Query caching so re-mounting the AddToLibraryButton doesn't refetch.
 */
export function useLibraryEntry(animeId: number) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['library-entry', user?.id, animeId],
    enabled: Boolean(user && isSupabaseConfigured),
    staleTime: 60_000,
    queryFn: async (): Promise<LibraryEntry | null> => {
      if (!user) return null
      const { data, error } = await supabase
        .from('user_library')
        .select('*')
        .eq('user_id', user.id)
        .eq('anime_id', animeId)
        .maybeSingle()
      if (error && error.code !== 'PGRST116') throw error
      return (data as LibraryEntry) ?? null
    },
  })
}

/**
 * Whole-library list, sorted by recent updates. Used by PersonalLibrary page.
 */
export function useLibraryList() {
  const { user } = useAuth()
  return useQuery({
    queryKey: queryKeys.myLibrary(user?.id ?? 'anon'),
    enabled: Boolean(user && isSupabaseConfigured),
    staleTime: 30_000,
    queryFn: async (): Promise<LibraryEntry[]> => {
      if (!user) return []
      const { data, error } = await supabase
        .from('user_library')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return (data as LibraryEntry[]) ?? []
    },
  })
}

/**
 * Optimistic upsert: the UI flips status instantly while the request flies.
 * Rolls back the previous entry if the request fails.
 */
export function useUpsertLibraryEntry() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: LibraryEntry) => {
      if (!user) throw new Error('not signed in')
      const payload = {
        user_id: user.id,
        anime_id: input.anime_id,
        anime_title: input.anime_title,
        anime_cover: input.anime_cover,
        anime_episodes: input.anime_episodes,
        status: input.status,
        ...(input.current_episode !== undefined ? { current_episode: input.current_episode } : {}),
        ...(input.score !== undefined ? { score: input.score } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        updated_at: new Date().toISOString(),
      }
      const { error, data } = await supabase
        .from('user_library')
        .upsert(payload, { onConflict: 'user_id,anime_id' })
        .select()
        .single()
      if (error) throw error
      return data as LibraryEntry
    },
    onMutate: async (input) => {
      if (!user) return
      const entryKey = ['library-entry', user.id, input.anime_id]
      const listKey = queryKeys.myLibrary(user.id)
      await qc.cancelQueries({ queryKey: entryKey })
      await qc.cancelQueries({ queryKey: listKey })
      const prevEntry = qc.getQueryData<LibraryEntry | null>(entryKey)
      const prevList = qc.getQueryData<LibraryEntry[]>(listKey) ?? []
      // Snapshot for rollback
      const optimistic: LibraryEntry = {
        ...prevEntry,
        ...input,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      }
      qc.setQueryData(entryKey, optimistic)
      const without = prevList.filter((e) => e.anime_id !== input.anime_id)
      qc.setQueryData<LibraryEntry[]>(listKey, [optimistic, ...without])
      return { prevEntry, prevList, entryKey, listKey }
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return
      qc.setQueryData(ctx.entryKey, ctx.prevEntry)
      qc.setQueryData(ctx.listKey, ctx.prevList)
    },
    onSettled: (_data, _err, vars) => {
      if (!user) return
      qc.invalidateQueries({ queryKey: ['library-entry', user.id, vars.anime_id] })
      qc.invalidateQueries({ queryKey: queryKeys.myLibrary(user.id) })
    },
  })
}

/** Optimistic delete from library. */
export function useRemoveLibraryEntry() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (animeId: number) => {
      if (!user) throw new Error('not signed in')
      const { error } = await supabase
        .from('user_library')
        .delete()
        .eq('user_id', user.id)
        .eq('anime_id', animeId)
      if (error) throw error
    },
    onMutate: async (animeId) => {
      if (!user) return
      const entryKey = ['library-entry', user.id, animeId]
      const listKey = queryKeys.myLibrary(user.id)
      await qc.cancelQueries({ queryKey: entryKey })
      await qc.cancelQueries({ queryKey: listKey })
      const prevEntry = qc.getQueryData<LibraryEntry | null>(entryKey)
      const prevList = qc.getQueryData<LibraryEntry[]>(listKey) ?? []
      qc.setQueryData(entryKey, null)
      qc.setQueryData<LibraryEntry[]>(listKey, prevList.filter((e) => e.anime_id !== animeId))
      return { prevEntry, prevList, entryKey, listKey }
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return
      qc.setQueryData(ctx.entryKey, ctx.prevEntry)
      qc.setQueryData(ctx.listKey, ctx.prevList)
    },
    onSettled: (_data, _err, animeId) => {
      if (!user) return
      qc.invalidateQueries({ queryKey: ['library-entry', user.id, animeId] })
      qc.invalidateQueries({ queryKey: queryKeys.myLibrary(user.id) })
    },
  })
}
