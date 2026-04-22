/**
 * Provider abstraction: prefer the fast AniList GraphQL adapter, fall back to
 * the original Jikan REST adapter if AniList errors / returns nothing.
 *
 * This keeps existing route code untouched: routes import from `provider.js`
 * instead of `jikan.js` and get the same shape, just faster.
 *
 * Disable AniList at runtime by setting `USE_ANILIST=false` in env (useful for
 * debugging or if AniList is having issues).
 */

import * as jikan from './jikan.js'
import * as anilist from './anilist.js'

const USE_ANILIST = String(process.env.USE_ANILIST ?? 'true').toLowerCase() !== 'false'

async function tryAniListThenJikan<T>(
  anilistFn: () => Promise<T>,
  jikanFn: () => Promise<T>,
  label: string,
): Promise<T> {
  if (!USE_ANILIST) return jikanFn()

  try {
    const result = await anilistFn()
    // If AniList returns an "empty" list-shaped result, fall back to Jikan
    // (some MAL ids don't exist on AniList).
    if (
      result &&
      typeof result === 'object' &&
      Array.isArray((result as any).data) &&
      (result as any).data.length === 0 &&
      ((result as any).total ?? 0) === 0
    ) {
      throw new Error('empty')
    }
    return result
  } catch (err: any) {
    console.warn(`[provider] AniList ${label} failed, falling back to Jikan:`, err?.message ?? err)
    return jikanFn()
  }
}

export const getAnimeList: typeof jikan.getAnimeList = (params) =>
  tryAniListThenJikan(
    () => anilist.getAnimeList(params),
    () => jikan.getAnimeList(params),
    'getAnimeList',
  )

export const getFeaturedAnime: typeof jikan.getFeaturedAnime = (limit) =>
  tryAniListThenJikan(
    () => anilist.getFeaturedAnime(limit),
    () => jikan.getFeaturedAnime(limit),
    'getFeaturedAnime',
  )

export const getSeasonAnime: typeof jikan.getSeasonAnime = (params) =>
  tryAniListThenJikan(
    () => anilist.getSeasonAnime(params),
    () => jikan.getSeasonAnime(params),
    'getSeasonAnime',
  )

export const searchAnime: typeof jikan.searchAnime = (params) =>
  tryAniListThenJikan(
    () => anilist.searchAnime(params),
    () => jikan.searchAnime(params),
    'searchAnime',
  )

export const getGenreOptions: typeof jikan.getGenreOptions = () =>
  tryAniListThenJikan(
    () => anilist.getGenreOptions(),
    () => jikan.getGenreOptions(),
    'getGenreOptions',
  )

export const getAnimeDetails: typeof jikan.getAnimeDetails = async (id) => {
  if (!USE_ANILIST) return jikan.getAnimeDetails(id)
  try {
    const detail = await anilist.getAnimeDetails(id)
    if (detail) return detail
    // Not found on AniList → fall back
    return jikan.getAnimeDetails(id)
  } catch (err: any) {
    console.warn('[provider] AniList getAnimeDetails failed, falling back to Jikan:', err?.message ?? err)
    return jikan.getAnimeDetails(id)
  }
}

/**
 * Character details with multi-source fallback:
 *
 *   1. Jikan `/characters/:id/full` (richest, by MAL id directly)
 *   2. Jikan `/characters/:id` (lighter, sometimes works when /full 404s)
 *   3. Jikan `/anime/:?` cross-lookup is too expensive — instead use the
 *      character name from `/anime/.../characters` cache if we have it
 *   4. AniList by name (if we got a name from any of the above)
 *
 * Steps 1+2 already happen inside `jikan.getCharacterDetails`. If that returns
 * null, we try AniList by-name as a last-ditch fallback. Without a name we
 * give up (return null).
 */
export const getCharacterDetails: typeof jikan.getCharacterDetails = async (id) => {
  // First: Jikan (which already does its own /full → /:id retry).
  const fromJikan = await jikan.getCharacterDetails(id).catch((err: any) => {
    console.warn(`[provider] Jikan getCharacterDetails(${id}) failed:`, err?.message ?? err)
    return null
  })
  if (fromJikan) return fromJikan

  if (!USE_ANILIST) return null

  // Second: try to recover a name from /anime/:id/characters cache via Jikan
  // search endpoint. We attempt a cheap MAL search by id-as-keyword which
  // sometimes returns the character (e.g. when /full 404s but /search hits).
  let nameHint: string | null = null
  try {
    // Reach into the raw Jikan search endpoint via the typed wrapper.
    // (We avoid importing the internal fetchJson; just try /characters search.)
    const res = await fetch(`https://api.jikan.moe/v4/characters?q=${id}&limit=1`)
    if (res.ok) {
      const json: any = await res.json()
      const first = json?.data?.[0]
      if (first?.mal_id === id) nameHint = first.name
    }
  } catch {
    /* ignore */
  }

  if (!nameHint) {
    console.warn(`[provider] No name hint for character ${id}; cannot AniList-fallback`)
    return null
  }

  console.warn(`[provider] Falling back to AniList by name for character ${id} ("${nameHint}")`)
  return anilist.searchCharacterByName(nameHint)
}

export const getStudioDetails = jikan.getStudioDetails
