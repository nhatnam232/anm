import { useEffect, useState } from 'react'
import { DEFAULT_LANG, LANG_STORAGE_KEY, type Lang } from '@/lib/i18n'

const USER_CHOICE_KEY = 'anm-lang-manual'

function readStoredLang(): Lang | null {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY)
    if (v === 'vi' || v === 'en') return v
  } catch {
    // ignore (SSR / private mode)
  }
  return null
}

function writeStoredLang(lang: Lang, userSet: boolean) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang)
    if (userSet) localStorage.setItem(USER_CHOICE_KEY, '1')
  } catch {
    // ignore
  }
}

function hasUserChoice(): boolean {
  try {
    return localStorage.getItem(USER_CHOICE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Detect the visitor's country via ipapi.co (free tier, ~1000 req/day, no key).
 * Returns `'vi'` for Vietnam, `'en'` for everywhere else, or `null` on failure.
 */
async function detectLangFromIp(signal?: AbortSignal): Promise<Lang | null> {
  try {
    const timeoutSignal =
      typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
        ? AbortSignal.timeout(3000)
        : undefined
    const res = await fetch('https://ipapi.co/json/', {
      signal: signal ?? timeoutSignal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { country_code?: string; country?: string }
    const code = (data.country_code || data.country || '').toUpperCase()
    return code === 'VN' ? 'vi' : 'en'
  } catch {
    return null
  }
}

export function useLang() {
  // Sync read from localStorage so the initial render already respects
  // persisted choice (avoids a flash of English for returning VN users).
  const [lang, setLangState] = useState<Lang>(() => readStoredLang() ?? DEFAULT_LANG)

  useEffect(() => {
    // If user already has a stored choice (auto-detected previously OR
    // manually switched), don't hit the geo API again.
    if (readStoredLang() !== null) return

    const controller = new AbortController()
    void (async () => {
      const detected = await detectLangFromIp(controller.signal)
      // Only apply if the user hasn't manually switched in the meantime.
      if (detected && !hasUserChoice() && readStoredLang() === null) {
        setLangState(detected)
        writeStoredLang(detected, false)
      }
    })()

    return () => controller.abort()
  }, [])

  const setLang = (next: Lang) => {
    setLangState(next)
    writeStoredLang(next, true)
  }

  return { lang, setLang }
}

export const useLangState = useLang
