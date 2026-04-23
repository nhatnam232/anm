import { Music2 } from 'lucide-react'

/**
 * Embed a Spotify track / playlist / album / show / episode on a profile page.
 * Accepts any open.spotify.com URL or a spotify:type:id URI and converts it to
 * the official Spotify iframe embed URL.
 *
 * Returns null silently if the URL doesn't look like a Spotify link, so callers
 * can pass an unchecked profile.spotify_url freely.
 */

const ALLOWED_TYPES = new Set(['track', 'album', 'playlist', 'show', 'episode', 'artist'])

export function toEmbedUrl(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null

  // spotify:track:abcdef
  const uriMatch = trimmed.match(/^spotify:(track|album|playlist|show|episode|artist):([A-Za-z0-9]+)/i)
  if (uriMatch) {
    const [, type, id] = uriMatch
    return `https://open.spotify.com/embed/${type.toLowerCase()}/${id}`
  }

  try {
    const u = new URL(trimmed)
    if (!u.hostname.endsWith('spotify.com')) return null
    // Path looks like /track/<id> or /intl-vi/track/<id>
    const segments = u.pathname.split('/').filter(Boolean)
    let i = 0
    if (segments[0]?.startsWith('intl')) i = 1
    const type = segments[i]
    const id = segments[i + 1]?.split('?')[0]
    if (!type || !id || !ALLOWED_TYPES.has(type)) return null
    return `https://open.spotify.com/embed/${type}/${id}`
  } catch {
    return null
  }
}

export default function SpotifyEmbed({
  url,
  className,
  height = 152,
  title,
}: {
  url: string | null | undefined
  className?: string
  height?: number
  title?: string
}) {
  const embedUrl = toEmbedUrl(url)
  if (!embedUrl) return null

  return (
    <div
      className={
        className ??
        'overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/5'
      }
    >
      <div className="flex items-center gap-2 border-b border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">
        <Music2 className="h-3.5 w-3.5" />
        {title ?? 'Now playing'}
      </div>
      <iframe
        src={embedUrl}
        width="100%"
        height={height}
        frameBorder={0}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title={title ?? 'Spotify player'}
        style={{ border: 0 }}
      />
    </div>
  )
}
