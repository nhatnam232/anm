import { Music2, Pause, Play } from 'lucide-react'
import { useNowPlaying } from '@/providers/NowPlayingProvider'
import { useLangContext } from '@/providers/LangProvider'

type Props = {
  /** The Spotify URL stored on the profile (track or playlist). */
  spotifyUrl: string | null | undefined
  /** Optional friendly username/displayname shown in the toast / mini-player. */
  fromUser?: string | null
}

/**
 * Small floating Spotify badge anchored at the top-right corner of the
 * profile banner. When clicked, it hooks the URL into the global
 * `useNowPlaying()` mini-player at the bottom-right of the page so the
 * audio survives navigation across the rest of the site.
 *
 * Visual feedback:
 *   - Idle: brand-green play icon + label "Spotify"
 *   - Playing (this exact track): three "beat" bars bouncing + pause icon
 *   - Hover: subtle scale + glow
 *
 * Why a separate component (not part of the existing right-of-bio Spotify
 * card)? The badge is *visible at first paint* over the banner image,
 * which is the whole point — visitors see your music taste before
 * scrolling. The card stays as a fallback in the right column.
 */
export default function ProfileSpotifyBadge({ spotifyUrl, fromUser }: Props) {
  const nowPlaying = useNowPlaying()
  const { lang } = useLangContext()

  if (!spotifyUrl) return null

  const isCurrent = nowPlaying.track?.url === spotifyUrl
  const isPlaying = isCurrent && nowPlaying.playing

  const handleClick = () => {
    if (isCurrent) {
      // Toggle pause/resume on the visual spinner; tapping again stops.
      if (isPlaying) {
        nowPlaying.togglePlaying()
      } else {
        nowPlaying.stop()
      }
    } else {
      nowPlaying.setTrack({ url: spotifyUrl, fromUser: fromUser ?? undefined })
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={
        isPlaying
          ? lang === 'vi' ? 'Đang phát — bấm để tạm dừng' : 'Now playing — click to pause'
          : lang === 'vi' ? 'Phát nhạc của họ' : 'Play their track'
      }
      className={`group flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur transition-all keep-white-on-light ${
        isPlaying
          ? 'border border-emerald-300/60 bg-emerald-500/85 text-white shadow-lg shadow-emerald-500/40'
          : 'border border-white/30 bg-black/55 text-white hover:bg-emerald-500/40 hover:border-emerald-300/60'
      }`}
    >
      {isPlaying ? (
        <>
          {/* Beat bars — three bars bouncing in different rhythms.
              Tailwind doesn't ship a beat keyframe so we use inline style
              with custom animation-duration to stagger the visual phases. */}
          <span className="flex h-3.5 items-end gap-[2px]" aria-hidden>
            <span
              className="w-[3px] rounded-sm bg-white"
              style={{ animation: 'spotify-beat 0.85s ease-in-out infinite', height: '60%' }}
            />
            <span
              className="w-[3px] rounded-sm bg-white"
              style={{ animation: 'spotify-beat 0.65s 0.15s ease-in-out infinite', height: '100%' }}
            />
            <span
              className="w-[3px] rounded-sm bg-white"
              style={{ animation: 'spotify-beat 0.95s 0.3s ease-in-out infinite', height: '75%' }}
            />
          </span>
          <span className="hidden sm:inline">
            {lang === 'vi' ? 'Đang phát' : 'Playing'}
          </span>
          <Pause className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
        </>
      ) : (
        <>
          <Music2 className="h-3.5 w-3.5 text-emerald-300 group-hover:text-white" />
          <span className="hidden sm:inline">Spotify</span>
          <Play className="h-3 w-3" />
        </>
      )}
    </button>
  )
}
