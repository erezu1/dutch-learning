// ---------------------------------------------------------------------------
// Which words you start on. Self-assessed, changeable, and expressed as a
// position in the frequency-ordered deck rather than a CEFR label the deck
// can't actually verify.
// ---------------------------------------------------------------------------

export interface LevelOption {
  id: string
  name: string
  description: string
  /** New words are introduced from this frequency rank upwards. */
  startRank: number
}

export const LEVELS: LevelOption[] = [
  { id: 'beginner', name: 'New', description: 'Little or no Dutch', startRank: 0 },
  { id: 'a1', name: 'Basics', description: 'A few hundred words', startRank: 250 },
  { id: 'a2', name: 'Everyday', description: 'Simple conversations', startRank: 750 },
  { id: 'b1', name: 'Confident', description: 'Comfortable day to day', startRank: 1500 },
]

export const DEFAULT_LEVEL = LEVELS[0]

export function levelById(id: string | null): LevelOption {
  return LEVELS.find((l) => l.id === id) ?? DEFAULT_LEVEL
}
