import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Lightweight emoji confetti burst — cheaper than a full Lottie file but
 * just as satisfying for "tim bay lên" / "got new badge!" feedback.
 *
 * Usage:
 *   <ReactionConfetti trigger={count} emoji="❤️" />
 *
 * Bumping `trigger` (any number, but typically just incrementing) replays the
 * animation. We honor `prefers-reduced-motion` for accessibility.
 */
export default function ReactionConfetti({
  trigger,
  emoji = '❤️',
  count = 12,
}: {
  trigger: number
  emoji?: string
  count?: number
}) {
  const [active, setActive] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    const onChange = () => setReduceMotion(mq.matches)
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  }, [])

  useEffect(() => {
    if (trigger === 0) return
    setActive(true)
    const t = setTimeout(() => setActive(false), 1200)
    return () => clearTimeout(t)
  }, [trigger])

  if (reduceMotion || !active) return null

  // Pre-compute random offsets so each emoji spreads in a different direction.
  const particles = Array.from({ length: count }).map((_, i) => {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6
    const distance = 50 + Math.random() * 60
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 20, // tilt upward
      rotate: (Math.random() - 0.5) * 360,
      scale: 0.7 + Math.random() * 0.6,
    }
  })

  return (
    <AnimatePresence>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
      >
        {particles.map((p) => (
          <motion.span
            key={`${trigger}-${p.id}`}
            initial={{ opacity: 0, scale: 0.4, x: 0, y: 0, rotate: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.4, p.scale, p.scale, p.scale * 0.6],
              x: p.x,
              y: p.y,
              rotate: p.rotate,
            }}
            transition={{ duration: 1.0, ease: 'easeOut' }}
            className="absolute select-none text-2xl"
            style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))' }}
          >
            {emoji}
          </motion.span>
        ))}
      </div>
    </AnimatePresence>
  )
}
