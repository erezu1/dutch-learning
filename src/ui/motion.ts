import type { Transition, Variants } from 'framer-motion'

// ---------------------------------------------------------------------------
// One motion vocabulary for the whole app. Components pick from here rather
// than inventing their own curves, because a different easing per component
// is what makes an interface feel homemade.
// ---------------------------------------------------------------------------

/** Buttons and anything responding directly to a finger. Fast, barely bouncy. */
export const tap: Transition = { type: 'spring', stiffness: 700, damping: 30, mass: 0.6 }

/** Cards moving on and off screen. Softer, with a little overshoot. */
export const glide: Transition = { type: 'spring', stiffness: 260, damping: 28, mass: 0.9 }

/** Things that shouldn't draw attention: progress bars, fades. */
export const quiet: Transition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] }

/** A card arrives from below and leaves upward, like a feed. */
export const cardVariants: Variants = {
  enter: { opacity: 0, y: 24, scale: 0.98 },
  center: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -18, scale: 0.98 },
}

/** The standard press: a small squash, never a colour change. */
export const pressable = {
  whileTap: { scale: 0.96 },
  transition: tap,
} as const
