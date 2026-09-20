import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { Award } from '../core/score'

// ---------------------------------------------------------------------------
// The points a card just earned.
//
// Anchored near the progress bar rather than the middle of the card: the
// centre is where the answer appears at exactly the same moment, so a number
// floating there lands on top of the thing you are trying to read.
//
// A word graduating is worth much more than an ordinary answer, so it arrives
// with a wider, brighter burst and says what happened.
// ---------------------------------------------------------------------------

const VISIBLE_MS = 1250

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
  const sparks = sparkOffsets(big ? 10 : 6, big ? 46 : 28)

  return (
    <div className="pointer-events-none absolute top-11 right-8 z-20">
      <AnimatePresence>
        {shown && (
          <motion.div
            key={shown.key}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="relative"
          >
            {/* A ring that snaps outward and vanishes — the flash of the hit. */}
            <motion.span
              initial={{ scale: 0.2, opacity: 0.55 }}
              animate={{ scale: big ? 3 : 2, opacity: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="absolute top-1/2 left-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary"
            />

            {sparks.map((s, i) => (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
                animate={{ x: s.x, y: s.y, scale: [0.3, 1, 0.2], opacity: [0, 1, 0] }}
                transition={{ duration: 0.62, ease: 'easeOut', delay: 0.015 * i }}
                className={`absolute top-1/2 left-1/2 rounded-full bg-primary ${
                  big ? 'h-2 w-2' : 'h-1.5 w-1.5'
                }`}
              />
            ))}

            {/* The number itself overshoots before settling. */}
            <motion.div
              initial={{ scale: 0.3, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 13, mass: 0.7 }}
              className="relative flex flex-col items-end"
            >
              <span
                className={`font-display leading-none font-semibold text-primary ${
                  big ? 'text-5xl' : 'text-3xl'
                }`}
              >
                +{shown.amount}
              </span>
              {big && (
                <motion.span
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.16 }}
                  className="mt-1 text-xs font-semibold tracking-wide text-primary/80"
                >
                  word learned
                </motion.span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
