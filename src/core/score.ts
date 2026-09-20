import { Rating, State, type Grade } from './scheduler'
import type { CardStateRow } from './db'

// ---------------------------------------------------------------------------
// Points.
//
// Tied to what actually happened rather than invented: recalling something
// earns more than failing it, and a word graduating out of learning — the
// moment it genuinely entered your memory — earns much more than any single
// answer. A wrong answer still scores, because turning up and being corrected
// is how the thing works and shouldn't feel like a penalty.
//
// The total only ever goes up. It is a record of effort, not a judgement.
// ---------------------------------------------------------------------------

export const POINTS = {
  /** Recalled it. */
  correct: 10,
  /** Missed it. Nothing — the score says what you know, not what you tried. */
  attempt: 0,
  /** The word left the learning stage and is now genuinely known. */
  graduated: 50,
} as const

export interface Award {
  amount: number
  /** True when a word graduated, which is worth calling out. */
  milestone: boolean
}

export function awardFor(grade: Grade, before: CardStateRow, after: CardStateRow): Award {
  const graduated = before.state !== State.Review && after.state === State.Review
  const base = grade === Rating.Again ? POINTS.attempt : POINTS.correct
  return {
    amount: base + (graduated ? POINTS.graduated : 0),
    milestone: graduated,
  }
}
