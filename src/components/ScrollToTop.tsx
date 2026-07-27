import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * Resets scroll position to the top on navigation.
 *
 * The app mounts this once inside <Router> rather than inside <Layout>,
 * because the wiki sub-app renders WikiLayout instead of Layout and needs the
 * same behaviour.
 *
 * POP navigations (browser back/forward) are deliberately skipped: the browser
 * already restores the previous scroll offset there, and stealing it makes
 * "back" feel like it lost your place in a long grid.
 *
 * `search` is part of the dependency list so /browse?page=2 style filter
 * changes also jump back to the top of the results.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if (navigationType === 'POP') return
    // 'auto' rather than 'smooth': a smooth scroll races the page-enter
    // animation and you see the old page slide away underneath.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, search, navigationType])

  return null
}
