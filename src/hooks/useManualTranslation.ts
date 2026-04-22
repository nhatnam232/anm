import { useEffect, useState } from 'react'
import { translateText } from '@/lib/api'
import type { Lang } from '@/lib/i18n'

type ManualTranslationState = {
  text: string
  isTranslated: boolean
  loading: boolean
  unavailable: boolean
  canTranslate: boolean
  translate: () => Promise<void>
  reset: () => void
}

const cache = new Map<string, string>()

function buildKey(text: string, targetLang: Lang) {
  return `${targetLang}:${text}`
}

export function useManualTranslation(
  text: string | null | undefined,
  lang: Lang,
): ManualTranslationState {
  const sourceText = text?.trim() ?? ''
  const [translatedText, setTranslatedText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    setTranslatedText(null)
    setLoading(false)
    setUnavailable(false)
  }, [lang, sourceText])

  const canTranslate = Boolean(sourceText) && lang === 'vi'

  const translate = async () => {
    if (!canTranslate || loading) {
      return
    }

    const cacheKey = buildKey(sourceText, lang)
    const cached = cache.get(cacheKey)

    if (cached) {
      setTranslatedText(cached)
      setUnavailable(false)
      return
    }

    setLoading(true)
    setUnavailable(false)

    try {
      // translateText now calls MyMemory directly from the browser (no server needed)
      const res = await translateText(sourceText, 'vi')

      if (!res.success || !res.data?.text?.trim()) {
        setUnavailable(true)
        return
      }

      const translated = res.data.text.trim()
      cache.set(cacheKey, translated)
      setTranslatedText(translated)
      setUnavailable(false)
    } catch {
      setUnavailable(true)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setTranslatedText(null)
    setUnavailable(false)
  }

  return {
    text: translatedText ?? sourceText,
    isTranslated: Boolean(translatedText),
    loading,
    unavailable,
    canTranslate,
    translate,
    reset,
  }
}
