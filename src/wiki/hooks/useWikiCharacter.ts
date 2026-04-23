import { useEffect, useState } from 'react'
import { getCharacter } from '@/wiki/registry'
import { fetchCharacterDetails } from '@/lib/api'
import type { WikiCharacter } from '@/wiki/types'

type State = {
  character: WikiCharacter | null
  loading: boolean
  /** True when the data came from AniList live fetch instead of the local registry. */
  isLive: boolean
  error: string | null
}

/**
 * Resolve a wiki character by slug.
 *
 * Strategy:
 *   1. Try the local hand-written registry first (fast, full lore).
 *   2. If the slug is a number → treat it as an AniList character ID and
 *      fetch live data from the existing `/api/character/:id` endpoint.
 *      This means ANY AniList character (not just the 8 we shipped) gets
 *      a wiki page automatically. Bio comes from AniList's "description"
 *      field.
 *   3. If neither resolves, return `null` so the page can show a 404.
 *
 * The live entry is converted to the same `WikiCharacter` shape so the
 * UI doesn't have to special-case it.
 */
export function useWikiCharacter(slug: string): State {
  const [state, setState] = useState<State>(() => {
    const local = getCharacter(slug)
    return {
      character: local,
      loading: !local && /^\d+$/.test(slug),
      isLive: false,
      error: null,
    }
  })

  useEffect(() => {
    const local = getCharacter(slug)
    if (local) {
      setState({ character: local, loading: false, isLive: false, error: null })
      return
    }

    // Numeric slug → fetch live from AniList via the main app's /api proxy.
    if (!/^\d+$/.test(slug)) {
      setState({ character: null, loading: false, isLive: false, error: null })
      return
    }

    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    fetchCharacterDetails(Number(slug))
      .then((res) => {
        if (cancelled) return
        const d = res?.data
        if (!d) {
          setState({ character: null, loading: false, isLive: false, error: null })
          return
        }
        const live: WikiCharacter = {
          id: slug,
          name: d.name ?? `Character #${slug}`,
          anilistCharacterId: Number(slug),
          avatarUrl: d.image ?? '',
          shortBio: stripHtml(d.description ?? '').slice(0, 200),
          bio: stripHtml(d.description ?? 'Chưa có tiểu sử chi tiết. Bạn có thể đóng góp bằng nút "Edit this page" ở trên.'),
          affiliations: d.media?.slice(0, 3).map((m: any) => m.title?.romaji ?? m.title?.english).filter(Boolean) ?? [],
          storyIds: [],
          updatedAt: 'live · AniList',
        }
        setState({ character: live, loading: false, isLive: true, error: null })
      })
      .catch((e: any) => {
        if (cancelled) return
        setState({
          character: null,
          loading: false,
          isLive: false,
          error: e?.message || 'Failed to fetch character from AniList',
        })
      })

    return () => { cancelled = true }
  }, [slug])

  return state
}

/** Strip basic HTML tags from AniList descriptions (they include <br>, <i>, etc). */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(i|em|b|strong|p|span|a|ul|ol|li)[^>]*>/gi, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}
