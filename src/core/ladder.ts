// ---------------------------------------------------------------------------
// The points ladder: how far you have come, counted in the same points the
// ring on the home screen holds.
//
// Deliberately separate from `levels.ts`, which is the STARTING POINT — where
// in the frequency list your new words are drawn from. That one is a setting
// you choose once; this one is a thing that happens to you. They were both
// called "level" for a while, which is why the other one is called what it
// actually is now.
//
// Many small steps rather than a few large ones. A ladder whose rungs are a
// week apart is a number that never moves while you are looking at it, and the
// ring it fills is the thing you are looking at.
// ---------------------------------------------------------------------------

/**
 * What it costs to leave level n.
 *
 * About half a round for the first, a round by level five, a few rounds by
 * twenty. Linear rather than exponential: the point is a rhythm you can feel
 * from the start, not a curve that eventually outruns anyone.
 */
export const costOf = (level: number): number => 300 + 120 * (Math.max(1, level) - 1)

/** The total needed to have reached level n. Level one is where everyone starts. */
export function floorOf(level: number): number {
  const n = Math.max(1, level)
  return 300 * (n - 1) + 60 * (n - 2) * (n - 1)
}

export interface Rung {
  /** The level you are on. */
  level: number
  /** Points earned inside it. */
  into: number
  /** What the whole of it costs. */
  span: number
  /** What is left of it. */
  toGo: number
  /** How far through it, nought to one — what the ring draws. */
  part: number
}

/** Where a lifetime total puts you. */
export function rungAt(points: number): Rung {
  const total = Math.max(0, Math.floor(points))
  // Walked rather than solved. The closed form is a quadratic and the
  // arithmetic to invert it is more code than a loop that runs a few dozen
  // times on a number that only ever grows by twenty.
  let level = 1
  while (total >= floorOf(level + 1)) level++
  const base = floorOf(level)
  const span = costOf(level)
  const into = total - base
  return { level, into, span, toGo: span - into, part: span ? into / span : 0 }
}
