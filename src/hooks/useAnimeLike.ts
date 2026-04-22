import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { useFavoritesStore, type AnimeFavorite } from '@/store/useFavoritesStore'

export type LikableAnime = AnimeFavorite

/**
 * Unified like/favorite hook:
 * - Guests: localStorage via zustand store (instant, offline-friendly)
 * - Logged-in users: DB row in `favorites` table (synced, public counter)
 *
 * On sign-in we push any guest favorites up to the DB (best-effort).
 */
export function useAnimeLike(anime: LikableAnime | null | undefined) {
  const { user } = useAuth()
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavoritesStore()
  const [serverLiked, setServerLiked] = useState<boolean | null>(null)
  const [count, setCount] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const animeId = anime?.id ?? null

  // Load server state
  useEffect(() => {
    if (!isSupabaseConfigured || !animeId) return
    let cancelled = false

    const loadCount = async () => {
      const { count: c } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('anime_id', animeId)
      if (!cancelled) setCount(c ?? 0)
    }
    void loadCount()

    if (!user) {
      setServerLiked(null)
      return () => {
        cancelled = true
      }
    }

    supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('anime_id', animeId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setServerLiked(Boolean(data))
      })

    return () => {
      cancelled = true
    }
  }, [animeId, user])

  // On sign-in, push local favorites up (best-effort, one-shot)
  useEffect(() => {
    if (!user || !isSupabaseConfigured || favorites.length === 0) return
    const syncedKey = `anm-synced-${user.id}`
    if (localStorage.getItem(syncedKey)) return

    const rows = favorites.map((f) => ({
      user_id: user.id,
      anime_id: f.id,
      anime_title: f.title,
      anime_cover: f.cover_image,
    }))
    supabase
      .from('favorites')
      .upsert(rows, { onConflict: 'user_id,anime_id', ignoreDuplicates: true })
      .then(({ error }) => {
        if (!error) localStorage.setItem(syncedKey, '1')
      })
  }, [user, favorites])

  const liked = user ? serverLiked === true : isFavorite(animeId ?? -1)

  const toggle = async () => {
    if (!anime) return
    if (!user) {
      if (isFavorite(anime.id)) removeFavorite(anime.id)
      else addFavorite(anime)
      return
    }
    if (busy) return
    setBusy(true)
    try {
      if (serverLiked) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('anime_id', anime.id)
        if (!error) {
          setServerLiked(false)
          setCount((c) => (typeof c === 'number' ? Math.max(0, c - 1) : c))
        }
      } else {
        const { error } = await supabase.from('favorites').insert({
          user_id: user.id,
          anime_id: anime.id,
          anime_title: anime.title,
          anime_cover: anime.cover_image,
        })
        if (!error) {
          setServerLiked(true)
          setCount((c) => (typeof c === 'number' ? c + 1 : c))
        }
      }
    } finally {
      setBusy(false)
    }
  }

  return {
    liked,
    toggle,
    busy,
    count,
    requiresAuth: !user && isSupabaseConfigured,
  }
}
