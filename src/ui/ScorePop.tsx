import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { Award } from '../core/score'

// ---------------------------------------------------------------------------
// The points a card just earned, bursting in the middle of the screen.
//
// The centre is also where the answer appears, so the rest of the page is
// briefly washed out behind it rather than competing. The wash is drawn in the
// page's own surface colour, which lightens a light scheme and darkens a dark
// one — either way the content recedes and the number is the only thing to
// look at. It clears itself in under a second and never takes a tap.
// ---------------------------------------------------------------------------

const VISIBLE_MS = 1150

/** Spark directions, spread evenly and offset so they don't line up on axes. */
function sparkOffsets(count: number, distance: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.PI / 7
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance }
  })
}

export function ScorePop({ award }: { award: (Award & { key: number }) | null }) {
  const [shown, setShown] = useState<(Award & { key: number }) | null>(null)

  useEffect(() => {
    if (!award) return
    setShown(award)
    const t = setTimeout(() => setShown(null), VISIBLE_MS)
    return () => clearTimeout(t)
  }, [award])

  const big = shown?.milestone ?? false
  const sparks = sparkOffsets(big ? 12 : 8, big ? 92 : 62)

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          key={shown.key}
          className="pointer-events-none fixed inset-0 z-40 grid place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          {/* The wash. Fades in fast, holds briefly, leaves. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.82, 0.82, 0] }}
            transition={{ duration: VISIBLE_MS / 1000, times: [0, 0.14, 0.6, 1], ease: 'easeOut' }}
            className="absolute inset-0 bg-surface backdrop-blur-[2px]"
          />

          <div className="relative">
            {/* A ring that snaps outward and vanishes — the flash of the hit. */}
            <motion.span
              initial={{ scale: 0.2, opacity: 0.6 }}
              animate={{ scale: big ? 4.5 : 3, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute top-1/2 left-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary"
            />

            {sparks.map((s, i) => (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
                animate={{ x: s.x, y: s.y, scale: [0.3, 1, 0.2], opacity: [0, 1, 0] }}
                transition={{ duration: 0.68, ease: 'easeOut', delay: 0.015 * i }}
                className={`absolute top-1/2 left-1/2 rounded-full bg-primary ${
                  big ? 'h-2.5 w-2.5' : 'h-2 w-2'
                }`}
              />
            ))}

            {/* The number overshoots before settling. */}
            <motion.div
              initial={{ scale: 0.3, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 13, mass: 0.7 }}
              className="relative flex flex-col items-center"
            >
              <span
                className={`leading-none font-bold tracking-tight text-primary ${
                  big ? 'text-7xl' : 'text-6xl'
                }`}
              >
                +{shown.amount}
              </span>
              {big && (
                <motion.span
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.16 }}
                  className="mt-2 text-sm font-semibold tracking-wide text-primary/80"
                >
                  word learned
                </motion.span>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
