import { useState, useEffect } from 'react'
import { Disc3, Music2, Pause, Play, Square, X, ChevronUp, ChevronDown } from 'lucide-react'
import { useNowPlaying } from '@/providers/NowPlayingProvider'
import { useLangContext } from '@/providers/LangProvider'
import { toEmbedUrl } from './SpotifyEmbed'

/**
 * Floating Spotify mini-player.
 *
 * - Rendered globally so navigating between pages does NOT recreate the iframe
 *   (which would interrupt playback).
 * - Always shown when a track is set; user can dismiss with the X button.
 * - Rotating vinyl disc visual indicates "playing" state.
 *
 * The Spotify embed itself doesn't expose play/pause to JS, so the spinning
 * disc reflects user-toggled UI state — handy for muting the rotation visual
 * without reaching into the iframe.
 */
export default function SpotifyMiniPlayer() {
  const { track, playing, togglePlaying, stop, expanded, setExpanded } = useNowPlaying()
  const { lang, t } = useLangContext()
  // Avoid SSR mismatch — only render after mount
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted || !track) return null
  const embedUrl = toEmbedUrl(track.url)
  if (!embedUrl) return null

  return (
    <div
      role="region"
      aria-label={t.spotifyMiniLabel}
      className="fixed bottom-4 right-4 z-[80] max-w-[calc(100vw-2rem)] sm:bottom-6 sm:right-6"
    >
      <div
        className={`relative flex flex-col overflow-hidden rounded-2xl border border-emerald-500/30 bg-slate-950/95 shadow-2xl backdrop-blur transition-all ${
          expanded ? 'w-[min(90vw,360px)]' : 'w-auto'
        }`}
      >
        {/* Compact bar */}
        <div className="flex items-center gap-3 px-3 py-2">
          {/* Rotating disc */}
          <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center">
            <div
              className={`vinyl-spin absolute inset-0 rounded-full bg-gradient-to-br from-slate-800 to-black${
                playing ? '' : ' is-paused'
              }`}
              aria-hidden
            >
              <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500" />
              <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950" />
            </div>
            <Disc3
              className={`relative h-5 w-5 text-emerald-300 ${playing ? 'animate-spin-slower' : ''}`}
              aria-hidden
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-emerald-300/80">
              <Music2 className="h-3 w-3" />
              {t.spotifyMiniLabel}
            </span>
            <span className="truncate text-xs font-medium text-white">
              {track.title || (track.fromUser ? `From ${track.fromUser}` : 'Spotify')}
            </span>
          </div>

          <button
            type="button"
            onClick={togglePlaying}
            title={playing ? (lang === 'vi' ? 'Tạm dừng (UI)' : 'Pause (UI)') : (lang === 'vi' ? 'Phát' : 'Play')}
            aria-label={playing ? 'Pause UI' : 'Resume UI'}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 transition-colors hover:bg-emerald-500/25"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? t.spotifyClose : t.spotifyOpenFull}
            aria-label={expanded ? t.spotifyClose : t.spotifyOpenFull}
            className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-300/80 transition-colors hover:bg-emerald-500/15 hover:text-emerald-300"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={stop}
            title={t.spotifyClose}
            aria-label={t.spotifyClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-rose-300/80 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Expanded iframe.
            We always render the iframe (visibility-hidden when collapsed) so the
            audio doesn't restart whenever the user expands/collapses the mini
            player. Height transitions smoothly. */}
        <div
          className={`overflow-hidden border-t border-emerald-500/20 transition-[height] duration-300 ease-out ${
            expanded ? 'h-[152px]' : 'h-0'
          }`}
        >
          <iframe
            src={embedUrl}
            width="100%"
            height={152}
            frameBorder={0}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title={t.spotifyMiniLabel}
            style={{ border: 0 }}
          />
        </div>

        {/* Hidden iframe to keep audio alive when collapsed.
            We skip this if expanded (the visible iframe handles it). */}
        {!expanded && (
          <iframe
            aria-hidden
            tabIndex={-1}
            src={embedUrl}
            width="0"
            height="0"
            frameBorder={0}
            allow="autoplay; clipboard-write; encrypted-media"
            title="spotify-bg"
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* "Stop visual" tip on hover for first-time users */}
      <span className="sr-only">
        <Square /> Stop, <Play /> Play, <Pause /> Pause vinyl spin animation
      </span>
    </div>
  )
}
