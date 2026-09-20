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

/** A deliberate, readable full turn — fast enough to feel responsive, slow
 *  enough that you see it happen. */
export const turn: Transition = { duration: 0.62, ease: [0.22, 1, 0.36, 1] }

/**
 * The home screen's ring drawing itself in, and the seconds the text inside
 * and under it waits for that to finish. Written out rather than left to the
 * general curves: this is the one moment in the app that is allowed to take
 * its time, because it is the only one you arrive at rather than cause.
 */
export const RING_GROW = 0.85
export const ringGrow: Transition = { duration: RING_GROW, ease: [0.22, 1, 0.36, 1] }
export const afterRing = (extra = 0): Transition => ({
  duration: 0.42,
  ease: 'easeOut',
  delay: RING_GROW + extra,
})

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

/**
 * How long a tap's own result stays on screen before the view moves on.
 * Acting instantly reads as a glitch — you never see what you pressed.
 *
 * On a multiple-choice card this also gives the points their moment: the
 * answer is scored the instant you choose, so the burst plays over the option
 * you picked and has cleared by the time the answer takes the screen.
 */
export const SELECT_DELAY = 780

/** Whole screens. Quieter than the card motion, so they don't compete. */
export const screenVariants: Variants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

/** The swap between a question's options and its answer. */
export const swapVariants: Variants = {
  enter: { opacity: 0, y: 14 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}
