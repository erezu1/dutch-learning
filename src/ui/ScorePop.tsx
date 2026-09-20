import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { Award } from '../core/score'

// ---------------------------------------------------------------------------
// The points a card just earned, rising and fading near the progress bar.
//
// Anchored to the top corner rather than the middle of the card: the centre is
// where the answer appears at exactly the same moment, so a number floating
// there lands on top of the thing you are trying to read.
//
// A word graduating is worth much more than an ordinary answer, so it arrives
// bigger and in the accent colour rather than quietly.
// ---------------------------------------------------------------------------

const VISIBLE_MS = 1100

export function ScorePop({ award }: { award: (Award & { key: number }) | null }) {
  const [shown, setShown] = useState<(Award & { key: number }) | null>(null)

  useEffect(() => {
    if (!award) return
    setShown(award)
    const t = setTimeout(() => setShown(null), VISIBLE_MS)
    return () => clearTimeout(t)
  }, [award])

  return (
    <div className="pointer-events-none absolute top-12 right-5 z-20 flex justify-end">
      <AnimatePresence>
        {shown && (
          <motion.div
            key={shown.key}
            initial={{ opacity: 0, y: 10, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -22, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, mass: 0.7 }}
            className="flex flex-col items-end"
          >
            <span
              className={`font-display leading-none font-semibold ${
                shown.milestone ? 'text-4xl text-primary' : 'text-2xl text-on-surface-dim'
              }`}
            >
              +{shown.amount}
            </span>
            {shown.milestone && (
              <span className="mt-1 text-xs font-medium tracking-wide text-primary/80">
                word learned
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
