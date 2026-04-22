import { useEffect, useState } from 'react'
import { translateText } from '@/lib/api'
import type { Lang } from '@/lib/i18n'

type TranslationState = {
  text: string
  isTranslated: boolean
  loading: boolean
  unavailable: boolean
}

const cache = new Map<string, string>()

function buildKey(text: string, targetLang: Lang) {
  return `${targetLang}:${text}`
}

export function useAutoTranslation(text: string | null | undefined, lang: Lang): TranslationState {
  const sourceText = text?.trim() ?? ''
  const [state, setState] = useState<TranslationState>({
    text: sourceText,
    isTranslated: false,
    loading: false,
    unavailable: false,
  })

  useEffect(() => {
    if (!sourceText) {
      setState({
        text: '',
        isTranslated: false,
        loading: false,
        unavailable: false,
      })
      return
    }

    if (lang !== 'vi') {
      setState({
        text: sourceText,
        isTranslated: false,
        loading: false,
        unavailable: false,
      })
      return
    }

    const cacheKey = buildKey(sourceText, lang)
    const cached = cache.get(cacheKey)
    if (cached) {
      setState({
        text: cached,
        isTranslated: true,
        loading: false,
        unavailable: false,
      })
      return
    }

    let cancelled = false
    setState({
      text: sourceText,
      isTranslated: false,
      loading: true,
      unavailable: false,
    })

    void translateText(sourceText, 'vi')
      .then((res) => {
        if (cancelled) return
        const translated = res?.data?.text?.trim()
        if (!translated) {
          setState({
            text: sourceText,
            isTranslated: false,
            loading: false,
            unavailable: true,
          })
          return
        }
        cache.set(cacheKey, translated)
        setState({
          text: translated,
          isTranslated: true,
          loading: false,
          unavailable: false,
        })
      })
      .catch((error: Error & { unavailable?: boolean }) => {
        if (cancelled) return
        setState({
          text: sourceText,
          isTranslated: false,
          loading: false,
          unavailable: Boolean(error?.unavailable),
        })
      })

    return () => {
      cancelled = true
    }
  }, [lang, sourceText])

  return state
}
