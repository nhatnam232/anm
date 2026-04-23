import { useEffect, useState } from 'react'
import { getStory } from '@/wiki/registry'
import { fetchAnimeDetails } from '@/lib/api'
import type { WikiStory } from '@/wiki/types'

type State = {
  story: WikiStory | null
  loading: boolean
  isLive: boolean
  error: string | null
}

/** Same idea as `useWikiCharacter` but for `WikiStory`. */
export function useWikiStory(slug: string): State {
  const [state, setState] = useState<State>(() => {
    const local = getStory(slug)
    return {
      story: local,
      loading: !local && /^\d+$/.test(slug),
      isLive: false,
      error: null,
    }
  })

  useEffect(() => {
    const local = getStory(slug)
    if (local) {
      setState({ story: local, loading: false, isLive: false, error: null })
      return
    }

    if (!/^\d+$/.test(slug)) {
      setState({ story: null, loading: false, isLive: false, error: null })
      return
    }

    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    fetchAnimeDetails(Number(slug))
      .then((res) => {
        if (cancelled) return
        const d = res?.data
        if (!d) {
          setState({ story: null, loading: false, isLive: false, error: null })
          return
        }
        const live: WikiStory = {
          id: slug,
          title: d.title ?? `Story #${slug}`,
          anilistAnimeId: Number(slug),
          coverUrl: d.banner_image ?? d.cover_image ?? null,
          shortSummary: stripHtml(d.synopsis ?? '').slice(0, 200),
          body: stripHtml(d.synopsis ?? 'Chưa có lore chi tiết. Bạn có thể đóng góp bằng nút "Edit this page".'),
          characterIds: [],
          updatedAt: 'live · AniList',
        }
        setState({ story: live, loading: false, isLive: true, error: null })
      })
      .catch((e: any) => {
        if (cancelled) return
        setState({
          story: null,
          loading: false,
          isLive: false,
          error: e?.message || 'Failed to fetch story from AniList',
        })
      })

    return () => { cancelled = true }
  }, [slug])

  return state
}

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
