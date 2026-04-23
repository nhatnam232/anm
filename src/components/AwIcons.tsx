/**
 * Custom Anime-Wiki ("AW") icon set.
 *
 * Why custom icons? Lucide-react ships generic shapes that show up on every
 * generic SaaS site. These use a slightly bolder stroke + subtle fills to
 * match the rest of our brand language (rounded purple tile + sparkle).
 *
 * All icons follow the same conventions:
 *   - 24×24 viewBox
 *   - currentColor stroke + accent-toned fill (so they recolour with parent)
 *   - 1.75 stroke-width to match the bolder text we use post-readability fix
 *   - className passes through to the <svg> root
 */
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { className?: string; size?: number }

function base(size: number | undefined) {
  return {
    viewBox: '0 0 24 24',
    width: size ?? 24,
    height: size ?? 24,
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg' as const,
    'aria-hidden': true,
  }
}

/** Home — stylised house with tiny sparkle. */
export function AwHomeIcon({ className = '', size, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <path
        d="M3.5 11 L12 4 L20.5 11 V19.5 a1 1 0 0 1 -1 1 H14 V14.5 H10 V20.5 H4.5 a1 1 0 0 1 -1 -1 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="18" cy="7" r="0.9" fill="currentColor" opacity="0.55" />
    </svg>
  )
}

/** Browse / discover — magnifier + tiny anime spark inside. */
export function AwBrowseIcon({ className = '', size, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <circle cx="10.5" cy="10.5" r="6.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M15.5 15.5 L20 20"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M10.5 7.5 L11.4 9.6 L13.5 10.5 L11.4 11.4 L10.5 13.5 L9.6 11.4 L7.5 10.5 L9.6 9.6 Z"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  )
}

/** Plan to watch — bookmark with plus sign. */
export function AwPlanToWatchIcon({ className = '', size, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <path
        d="M6.5 3.5 H17.5 a1 1 0 0 1 1 1 V20.5 L12 16.5 L5.5 20.5 V4.5 a1 1 0 0 1 1 -1 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M12 8 V13 M9.5 10.5 H14.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

/** Watching — play triangle inside circle. */
export function AwWatchingIcon({ className = '', size, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M10 8.5 L16 12 L10 15.5 Z"
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  )
}

/** Completed / Đã xem — checkmark inside rounded badge. */
export function AwCompletedIcon({ className = '', size, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <path
        d="M12 2.5 L14.5 4.5 L17.5 4.2 L18.7 7 L21.5 8.2 L21.2 11.2 L23 13.5 L21.2 15.8 L21.5 18.8 L18.7 20 L17.5 22.8 L14.5 22.5 L12 24.5 L9.5 22.5 L6.5 22.8 L5.3 20 L2.5 18.8 L2.8 15.8 L1 13.5 L2.8 11.2 L2.5 8.2 L5.3 7 L6.5 4.2 L9.5 4.5 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <path
        d="M8 12.5 L11 15.5 L16.5 9.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

/** On hold — pause inside rounded square. */
export function AwOnHoldIcon({ className = '', size, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <rect x="9" y="8" width="2" height="8" rx="0.7" fill="currentColor" />
      <rect x="13" y="8" width="2" height="8" rx="0.7" fill="currentColor" />
    </svg>
  )
}

/** Dropped — broken-circle X. */
export function AwDroppedIcon({ className = '', size, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M8.5 8.5 L15.5 15.5 M15.5 8.5 L8.5 15.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Favorite (heart with sparkle) */
export function AwFavoriteIcon({ className = '', size, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <path
        d="M12 20 C5 15 3 11 4.5 7.5 a4.5 4.5 0 0 1 7.5 -1.5 a4.5 4.5 0 0 1 7.5 1.5 C21 11 19 15 12 20 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="5.5" r="0.9" fill="currentColor" opacity="0.6" />
    </svg>
  )
}
