import { getAvatarRingClass, type BadgeId } from '@/lib/badges'

type Props = {
  src?: string | null
  name?: string | null
  /** Badge ids belonging to this user — first badge determines ring color. */
  badges?: BadgeId[]
  /** Pixel size — default 40 */
  size?: number
  className?: string
  /** Disable the badge-tinted ring (use plain border instead). */
  noRing?: boolean
  /** Render as a square (rounded-2xl) instead of circle. */
  square?: boolean
}

/**
 * Reusable avatar with badge-aware ring color.
 *
 * Falls back to a colorful gradient + uppercase initial when `src` is missing,
 * matching the existing app aesthetic. Wraps the underlying <img> in a
 * positioned container so the ring + crown overlay renders cleanly.
 */
export default function UserAvatar({
  src,
  name,
  badges = [],
  size = 40,
  className = '',
  noRing = false,
  square = false,
}: Props) {
  const initial = (name || 'U').trim().charAt(0).toUpperCase() || 'U'
  const radius = square ? 'rounded-2xl' : 'rounded-full'
  const ringCls = noRing ? '' : getAvatarRingClass(badges)
  const dim = { width: size, height: size }
  const fontSize = Math.max(12, Math.round(size * 0.45))

  return (
    <span className={`relative inline-flex flex-shrink-0 ${className}`} style={dim}>
      {src ? (
        <img
          src={src}
          alt={name ?? 'avatar'}
          width={size}
          height={size}
          className={`${radius} h-full w-full object-cover ${ringCls}`}
          loading="lazy"
          onError={(e) => {
            // Hide broken image so the gradient fallback below is visible
            e.currentTarget.style.display = 'none'
            const next = e.currentTarget.nextElementSibling as HTMLElement | null
            if (next) next.style.display = 'flex'
          }}
        />
      ) : null}
      <span
        aria-hidden={Boolean(src)}
        className={`${radius} flex h-full w-full items-center justify-center bg-gradient-to-br from-primary via-fuchsia-500 to-pink-500 font-bold text-white ${ringCls}`}
        style={{
          fontSize,
          // Hidden under the img when src is provided; the onError handler flips it.
          display: src ? 'none' : 'flex',
          position: src ? 'absolute' : 'relative',
          inset: src ? 0 : undefined,
        }}
      >
        {initial}
      </span>
    </span>
  )
}
