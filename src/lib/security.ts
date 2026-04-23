/**
 * Front-end "tamper resistance" helpers.
 *
 * IMPORTANT REALITY CHECK:
 *   • Anything sent to the browser CAN be inspected. There is no way to
 *     truly hide JavaScript from someone determined enough.
 *   • The actual security boundary is in the Supabase RLS policies +
 *     Postgres SECURITY DEFINER functions. THAT is what protects user data.
 *   • This file just makes casual snooping annoying:
 *       - Disables right-click + common DevTools shortcuts in PRODUCTION.
 *       - Strips console.log/info/debug calls (warn/error stay).
 *       - Detects DevTools opening and shows a friendly warning.
 *
 *   Keyboard accessibility users + power users on dev mode are unaffected.
 */

const isDev = import.meta.env.DEV
const isProd = !isDev

/**
 * Mute non-essential console methods in production. Keeps `error` and `warn`
 * since these surface real bugs from telemetry.
 */
export function silenceConsoleInProduction(): void {
  if (!isProd || typeof window === 'undefined') return
  const noop = () => {}
  // Preserve original references in case future code wants them
  ;(window as any).__origConsole = {
    log: console.log,
    info: console.info,
    debug: console.debug,
    table: console.table,
  }
  console.log = noop
  console.info = noop
  console.debug = noop
  console.table = noop as any
  // Cute branding message — common pattern (Facebook, GitHub do this).
  setTimeout(() => {
    console.warn(
      '%c⚠️ Cảnh báo!',
      'color: #ef4444; font-size: 32px; font-weight: 900;',
    )
    console.warn(
      '%cĐây là khu vực dành cho developer. Đừng paste/chạy mã ai bảo bạn nếu không hiểu — họ có thể chiếm tài khoản của bạn (self-XSS).',
      'color: #f59e0b; font-size: 14px;',
    )
    console.warn('%cMọi action đều được audit ở Anime Wiki — đừng thử trò gì funny 👀', 'color: #94a3b8; font-size: 12px;')
  }, 1000)
}

/**
 * Block right-click + common keyboard shortcuts to open DevTools. Only in
 * production. This won't stop anyone (they can use the browser menu) but
 * cuts 95% of curious snooping.
 */
export function blockCommonInspectShortcuts(): void {
  if (!isProd || typeof document === 'undefined') return

  document.addEventListener('contextmenu', (e) => {
    // Allow right-click on inputs / textareas (common UX expectation)
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
    e.preventDefault()
  })

  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault()
      return
    }
    // Ctrl/Cmd + Shift + I (Inspect Element)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
      e.preventDefault()
      return
    }
    // Ctrl/Cmd + Shift + J (Console)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
      e.preventDefault()
      return
    }
    // Ctrl/Cmd + U (View Source)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault()
      return
    }
    // Ctrl/Cmd + S (Save Page)
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault()
      return
    }
  })
}

/**
 * Best-effort DevTools detection by measuring the gap between
 * `outerWidth - innerWidth`. When DevTools docks, the inner viewport
 * shrinks. Not reliable on undocked DevTools, mobile, or modern browsers
 * where users can resize freely — this is just a deterrent.
 */
export function watchForDevTools(onOpen: () => void, onClose: () => void): () => void {
  if (isDev || typeof window === 'undefined') return () => {}

  let opened = false
  const THRESHOLD = 160 // px — typical DevTools panel width
  const check = () => {
    const widthGap = window.outerWidth - window.innerWidth
    const heightGap = window.outerHeight - window.innerHeight
    const isOpen = widthGap > THRESHOLD || heightGap > THRESHOLD
    if (isOpen && !opened) {
      opened = true
      onOpen()
    } else if (!isOpen && opened) {
      opened = false
      onClose()
    }
  }
  const interval = window.setInterval(check, 1500)
  window.addEventListener('resize', check)
  return () => {
    window.clearInterval(interval)
    window.removeEventListener('resize', check)
  }
}

/**
 * Convenience all-in-one initializer. Call ONCE from `main.tsx`.
 *
 * Order matters:
 *   1. Mute console (must be earliest so 3rd-party libs don't log).
 *   2. Wire shortcut blockers.
 *   3. Optionally start DevTools watcher.
 */
export function initSecurityHardening(): void {
  silenceConsoleInProduction()
  blockCommonInspectShortcuts()
}
