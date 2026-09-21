// ---------------------------------------------------------------------------
// Which words you start on. Self-assessed, changeable, and expressed as a
// position in the frequency-ordered deck rather than a CEFR label the deck
// can't actually verify.
//
// It sets where new words *start*, not which ones exist: the queue works
// forward from that point and then comes back for what it skipped, so the
// choice shapes your first weeks and then quietly stops mattering. What
// replaces it is `reachedLevel` — the level you can be seen to be at, which
// moves on its own as the deck goes by.
// ---------------------------------------------------------------------------

export interface LevelOption {
  id: string
  name: string
  description: string
  /** New words are introduced from this frequency rank upwards. */
  startRank: number
}

export const LEVELS: LevelOption[] = [
  // Named the way people describe how much of a language they have, rather
  // than by how much of this app applies to them. Nobody is "Everyday" at a
  // language; they are a beginner, or they get by, or they are conversational.
  { id: 'beginner', name: 'Beginner', description: 'Little or no Dutch', startRank: 0 },
  { id: 'a1', name: 'Elementary', description: 'A few hundred words', startRank: 250 },
  { id: 'a2', name: 'Getting by', description: 'Simple conversations', startRank: 750 },
  { id: 'b1', name: 'Fluent', description: 'Comfortable day to day', startRank: 1500 },
]

export const DEFAULT_LEVEL = LEVELS[0]

export function levelById(id: string | null): LevelOption {
  return LEVELS.find((l) => l.id === id) ?? DEFAULT_LEVEL
}

/**
 * The level you've reached, as opposed to the one you claimed. The claim is
 * counted in: someone who started at Confident is not a beginner because the
 * app has only watched them learn forty words.
 *
 * Once the queue loops back for the words the head start skipped, those get
 * counted twice — by which point you are at the top of the list anyway, and
 * the number has nothing left to be wrong about.
 */
export function reachedLevel(known: number, from: LevelOption): LevelOption {
  const reach = known + from.startRank
  return LEVELS.reduce((best, l) => (reach >= l.startRank ? l : best), LEVELS[0])
}

/** The next rung and how many words away it is, or null at the top. */
export function toNextLevel(
  known: number,
  from: LevelOption,
): { next: LevelOption; remaining: number } | null {
  const reach = known + from.startRank
  const next = LEVELS.find((l) => l.startRank > reach)
  return next ? { next, remaining: next.startRank - reach } : null
}
