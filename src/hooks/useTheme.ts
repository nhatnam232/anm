import { useEffect, useState, useCallback } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'anm-theme'

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* ignore SSR / private mode */
  }
  return 'dark' // historical default for Anime Wiki
}

function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement
  // Tailwind dark-mode: 'class' → toggle .dark on <html>.
  root.classList.toggle('dark', resolved === 'dark')
  root.classList.toggle('light', resolved === 'light')
  // Provide data-attr too for any future selector hook (e.g. CSS var fallback).
  root.dataset.theme = resolved
  root.style.colorScheme = resolved
}

/**
 * Theme manager hook.
 *
 * Supports 3 modes (light / dark / system) with live update when the user
 * changes their OS appearance. Persists choice to localStorage.
 *
 * Usage:
 *   const { mode, resolved, setMode, toggleTheme, isDark } = useTheme()
 */
export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => readStored())
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveMode(readStored()))

  // Apply theme whenever resolved value changes
  useEffect(() => {
    applyTheme(resolved)
  }, [resolved])

  // Recompute resolved when mode changes OR system preference flips
  useEffect(() => {
    setResolved(resolveMode(mode))
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => setResolved(mq.matches ? 'light' : 'dark')
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange) // legacy Safari
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  }, [mode])

  // Cross-tab sync via storage events
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark' || e.newValue === 'system')) {
        setModeState(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const toggleTheme = useCallback(() => {
    // Cycle dark → light → system → dark for the toggle button.
    setMode(mode === 'dark' ? 'light' : mode === 'light' ? 'system' : 'dark')
  }, [mode, setMode])

  return {
    mode,
    resolved,
    isDark: resolved === 'dark',
    isLight: resolved === 'light',
    setMode,
    toggleTheme,
  }
}
