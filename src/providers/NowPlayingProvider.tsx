import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * Persistent "now-playing" state shared across pages so a user's Spotify
 * track keeps playing when they navigate away from a profile.
 *
 * Backed by localStorage so playback survives full reloads. Includes a tiny
 * mini-player overlay (rendered separately by `<SpotifyMiniPlayer />`).
 *
 * Note: Spotify embed iframe does NOT expose its play/pause state to us.
 * `playing` here is best-effort — defaults to true on track set, can be
 * toggled by the user via the mini-player UI to pause the rotating disc
 * animation. Actual audio play/pause must be done via Spotify controls.
 */

type Track = {
  url: string         // original spotify URL (track / playlist / album)
  title?: string      // optional display label
  fromUser?: string   // username this track came from (for "Now playing from X")
}

type Ctx = {
  track: Track | null
  /** UI hint — does not actually pause the iframe (see note above). */
  playing: boolean
  /** Open the global mini-player on this track. Resumes playback indication. */
  setTrack: (next: Track | null) => void
  /** UI toggle: just spins/un-spins the disc visual. */
  togglePlaying: () => void
  /** Stop & dismiss the mini player. */
  stop: () => void
  /** Whether the user has expanded the mini-player into the larger Spotify embed. */
  expanded: boolean
  setExpanded: (v: boolean) => void
}

const STORAGE_KEY = 'anm-nowplaying'
const NowPlayingContext = createContext<Ctx | null>(null)

function readPersisted(): Track | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Track
    if (parsed && typeof parsed.url === 'string') return parsed
  } catch {
    /* ignore */
  }
  return null
}

function writePersisted(t: Track | null) {
  try {
    if (t) localStorage.setItem(STORAGE_KEY, JSON.stringify(t))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function NowPlayingProvider({ children }: { children: ReactNode }) {
  const [track, setTrackState] = useState<Track | null>(() => readPersisted())
  const [playing, setPlaying] = useState<boolean>(() => Boolean(readPersisted()))
  const [expanded, setExpanded] = useState(false)

  const setTrack = useCallback((next: Track | null) => {
    setTrackState(next)
    setPlaying(Boolean(next))
    writePersisted(next)
  }, [])

  const togglePlaying = useCallback(() => setPlaying((p) => !p), [])

  const stop = useCallback(() => {
    setTrackState(null)
    setPlaying(false)
    setExpanded(false)
    writePersisted(null)
  }, [])

  // Cross-tab sync (if you change tracks in one tab, others follow)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      if (!e.newValue) {
        setTrackState(null)
        setPlaying(false)
        return
      }
      try {
        const next = JSON.parse(e.newValue) as Track
        setTrackState(next)
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo<Ctx>(
    () => ({ track, playing, setTrack, togglePlaying, stop, expanded, setExpanded }),
    [track, playing, setTrack, togglePlaying, stop, expanded],
  )

  return <NowPlayingContext.Provider value={value}>{children}</NowPlayingContext.Provider>
}

export function useNowPlaying(): Ctx {
  const ctx = useContext(NowPlayingContext)
  if (!ctx) {
    return {
      track: null,
      playing: false,
      setTrack: () => {},
      togglePlaying: () => {},
      stop: () => {},
      expanded: false,
      setExpanded: () => {},
    }
  }
  return ctx
}
