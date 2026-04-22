import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { translations, type Lang, type Translation } from '@/lib/i18n'
import { useLang } from '@/hooks/useLang'

type LangContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Translation
}

const LangContext = createContext<LangContextValue | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const { lang, setLang } = useLang()

  const value = useMemo<LangContextValue>(
    () => ({ lang, setLang, t: translations[lang] }),
    [lang],
  )

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLangContext(): LangContextValue {
  const ctx = useContext(LangContext)
  if (!ctx) {
    throw new Error('useLangContext must be used within <LangProvider>')
  }
  return ctx
}
