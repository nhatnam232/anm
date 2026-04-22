/**
 * Server-side Supabase wrapper for the `character_cache` snapshot table.
 *
 * Behaviour:
 *   - `seedFromAnime(animeId, anime)` is called from the anime-detail handler
 *     to upsert every character that appears in the anime payload. This is
 *     fire-and-forget so it never slows down the response.
 *   - `getById(id)` is called by the character route as a last-resort fallback
 *     when both Jikan and AniList have nothing.
 *
 * Requires env vars:
 *     VITE_SUPABASE_URL          (also used by translate.ts)
 *     SUPABASE_SERVICE_ROLE_KEY
 *
 * If either is missing the wrapper degrades to no-ops so local dev still works
 * without Supabase configured.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL?.trim() ?? ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ''

let client: SupabaseClient | null = null
if (url && key) {
  client = createClient(url, key, { auth: { persistSession: false } })
} else {
  // Dev-time hint
  console.warn(
    '[characterCache] Supabase env not set (VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) — cache disabled',
  )
}

type CharacterRow = {
  id: number
  name: string
  name_kanji?: string | null
  image?: string | null
  favorites?: number | null
  description?: string | null
  appears_in?: any[]
}

export async function seedFromAnime(animeId: number, anime: any): Promise<void> {
  if (!client || !anime?.characters?.length) return
  const animeMeta = {
    id: animeId,
    title: anime.title,
    cover_image: anime.cover_image,
  }

  const rows = (anime.characters as any[])
    .filter((c) => c?.id)
    .map((c) => ({
      id: c.id,
      name: c.name ?? 'Unknown',
      name_kanji: null,
      image: c.image ?? null,
      favorites: c.favorites ?? 0,
      description: null,
      appears_in: [
        {
          id: animeMeta.id,
          title: animeMeta.title,
          cover_image: animeMeta.cover_image,
          role: c.role ?? 'Supporting',
        },
      ],
      source: 'anime_detail',
    }))

  if (!rows.length) return

  // Upsert with conflict on id; merge appears_in is best-effort: we just keep
  // the most recent snapshot. For now overwriting is acceptable because each
  // anime page write reflects the latest known anime context.
  const { error } = await client.from('character_cache').upsert(rows, {
    onConflict: 'id',
    ignoreDuplicates: false,
  })
  if (error) {
    console.warn('[characterCache] upsert failed:', error.message)
  }
}

export async function getById(id: number): Promise<CharacterRow | null> {
  if (!client) return null
  const { data, error } = await client
    .from('character_cache')
    .select('id,name,name_kanji,image,favorites,description,appears_in')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.warn('[characterCache] read failed:', error.message)
    return null
  }
  return (data as CharacterRow) ?? null
}

export function isEnabled(): boolean {
  return Boolean(client)
}
