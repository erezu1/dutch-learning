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
  {
    id: 'beginner',
    name: 'Starting from scratch',
    description: 'Little or no Dutch. Begin with the most common words.',
    startRank: 0,
  },
  {
    id: 'a1',
    name: 'I know the basics',
    description: 'Greetings, numbers, a few hundred everyday words.',
    startRank: 250,
  },
  {
    id: 'a2',
    name: 'I can get by',
    description: 'Simple conversations, shops, directions, the past tense.',
    startRank: 750,
  },
  {
    id: 'b1',
    name: 'I can hold a conversation',
    description: 'Comfortable day to day. Skip ahead to less common words.',
    startRank: 1500,
  },
]

export const DEFAULT_LEVEL = LEVELS[0]

export function levelById(id: string | null): LevelOption {
  return LEVELS.find((l) => l.id === id) ?? DEFAULT_LEVEL
}
