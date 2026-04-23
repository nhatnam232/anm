import { createContext, useContext, type ReactNode } from 'react'
import { useTheme, type ThemeMode } from '@/hooks/useTheme'

type ThemeContextValue = {
  mode: ThemeMode
  resolved: 'light' | 'dark'
  isDark: boolean
  isLight: boolean
  setMode: (mode: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useTheme()
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeContext must be used within <ThemeProvider>')
  return ctx
}
