/**
 * LottieLoader.tsx
 * Anime-themed loading animations using inline Lottie JSON data.
 * Uses @lottiefiles/react-lottie-player for rendering.
 * All animations are royalty-free / MIT licensed.
 */
import { Player } from '@lottiefiles/react-lottie-player'

// ─── Sword Spin Animation (inline JSON) ──────────────────────────────────────
// Simple rotating sword - anime battle theme
const SWORD_LOTTIE = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 200,
  h: 200,
  nm: 'Sword Spin',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'Sword',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: {
          a: 1,
          k: [
            { i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] }, t: 0, s: [0] },
            { t: 60, s: [360] },
          ],
        },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ty: 'rc',
              d: 1,
              s: { a: 0, k: [8, 80] },
              p: { a: 0, k: [0, 0] },
              r: { a: 0, k: 4 },
              nm: 'Blade',
            },
            {
              ty: 'fl',
              c: { a: 0, k: [0.6, 0.8, 1, 1] },
              o: { a: 0, k: 100 },
              r: 1,
              nm: 'Fill',
            },
            {
              ty: 'tr',
              p: { a: 0, k: [0, -10] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
            },
          ],
          nm: 'Blade Group',
        },
        {
          ty: 'gr',
          it: [
            {
              ty: 'rc',
              d: 1,
              s: { a: 0, k: [24, 6] },
              p: { a: 0, k: [0, 0] },
              r: { a: 0, k: 2 },
              nm: 'Guard',
            },
            {
              ty: 'fl',
              c: { a: 0, k: [0.9, 0.7, 0.2, 1] },
              o: { a: 0, k: 100 },
              r: 1,
              nm: 'Fill',
            },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 30] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
            },
          ],
          nm: 'Guard Group',
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0,
    },
  ],
}

// ─── Star Burst Animation ─────────────────────────────────────────────────────
const STAR_LOTTIE = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 45,
  w: 200,
  h: 200,
  nm: 'Star Burst',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'Star',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: {
          a: 1,
          k: [
            { i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] }, t: 0, s: [0] },
            { t: 45, s: [360] },
          ],
        },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { i: { x: [0.833, 0.833, 0.833], y: [0.833, 0.833, 0.833] }, o: { x: [0.167, 0.167, 0.167], y: [0.167, 0.167, 0.167] }, t: 0, s: [80, 80, 100] },
            { i: { x: [0.833, 0.833, 0.833], y: [0.833, 0.833, 0.833] }, o: { x: [0.167, 0.167, 0.167], y: [0.167, 0.167, 0.167] }, t: 22, s: [110, 110, 100] },
            { t: 45, s: [80, 80, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'sr',
          d: 1,
          pt: { a: 0, k: 5 },
          p: { a: 0, k: [0, 0] },
          r: { a: 0, k: 0 },
          ir: { a: 0, k: 25 },
          is: { a: 0, k: 0 },
          or: { a: 0, k: 55 },
          os: { a: 0, k: 0 },
          ix: 1,
          nm: 'Star Shape',
          sy: 1,
        },
        {
          ty: 'fl',
          c: {
            a: 1,
            k: [
              { i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] }, t: 0, s: [0.98, 0.82, 0.1, 1] },
              { i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] }, t: 22, s: [0.6, 0.8, 1, 1] },
              { t: 45, s: [0.98, 0.82, 0.1, 1] },
            ],
          },
          o: { a: 0, k: 100 },
          r: 1,
          nm: 'Fill',
        },
      ],
      ip: 0,
      op: 45,
      st: 0,
      bm: 0,
    },
  ],
}

// ─── Exported Components ──────────────────────────────────────────────────────

interface LottieLoaderProps {
  size?: number
  className?: string
}

/**
 * SwordLoader - Rotating sword animation for page loading states
 */
export function SwordLoader({ size = 80, className = '' }: LottieLoaderProps) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <Player
        autoplay
        loop
        src={SWORD_LOTTIE as any}
        style={{ width: size, height: size }}
      />
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * StarLoader - Pulsing star animation for smaller loading states
 */
export function StarLoader({ size = 60, className = '' }: LottieLoaderProps) {
  return (
    <Player
      autoplay
      loop
      src={STAR_LOTTIE as any}
      style={{ width: size, height: size }}
      className={className}
    />
  )
}

/**
 * PageLoader - Full-page loading overlay with sword animation
 */
export function PageLoader({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <SwordLoader size={100} />
      {message && (
        <p className="animate-pulse text-sm text-gray-400">{message}</p>
      )}
    </div>
  )
}

/**
 * InlineLoader - Small inline spinner with star for card/section loading
 */
export function InlineLoader({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <StarLoader size={24} />
      {label && <span className="animate-pulse">{label}</span>}
    </div>
  )
}
