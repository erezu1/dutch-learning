// ---------------------------------------------------------------------------
// Content types: what we know about the Dutch language.
// These describe the deck files in src/content and are the *only* source of
// truth for what questions we can ask. Every field here is a potential card.
// ---------------------------------------------------------------------------

export type Gender = 'de' | 'het'
export type Level = 'A1' | 'A2' | 'B1' | 'B2'
export type Pos = 'noun' | 'verb' | 'adj' | 'adv' | 'prep' | 'phrase' | 'num' | 'pron' | 'det' | 'conj'
export type Auxiliary = 'hebben' | 'zijn' | 'both'

export interface Example {
  nl: string
  en: string
}

export interface VerbInfo {
  /** opbellen -> ik bel je *op* */
  separable?: boolean
  /** the bit that flies to the end of the sentence, e.g. "op" */
  particle?: string
  /** imperfect singular, e.g. "belde" */
  past: string
  /** past participle, e.g. "gebeld" */
  participle: string
  /** which helper verb the perfect tense takes */
  auxiliary: Auxiliary
  /**
   * True when `auxiliary` is a default rather than a checked fact. The
   * imported data has no hebben/zijn information, so those notes must not
   * generate an auxiliary card — drilling a guess is worse than not asking.
   */
  auxiliaryUnknown?: boolean
  /** strong/irregular verbs are worth drilling; regular ones are predictable */
  irregular?: boolean
}

export interface Note {
  /** Permanent. Progress is stored against this, so it must never change. */
  id: string
  nl: string
  en: string[]
  pos: Pos
  level: Level
  /**
   * Frequency rank in Dutch, 1 = most common. This is what decides the order
   * new words are introduced, and where each level starts. Absent for
   * hand-written notes, which fall back to their position in the deck.
   */
  rank?: number
  tags?: string[]

  // nouns
  gender?: Gender
  plural?: string
  /** true when the plural can't be guessed (stad -> steden, ei -> eieren) */
  irregularPlural?: boolean

  // verbs
  verb?: VerbInfo

  // adjectives
  comparative?: string
  superlative?: string

  examples?: Example[]
  /**
   * Never make a gap-fill of this word. Set on words whose place in a sentence
   * can't be worked out from its translation — "toch", "wel", "even" — where
   * the gap would have several right answers and the English none of them.
   */
  noCloze?: boolean
}

/**
 * Notes whose meaning was corrected after people had already learned it.
 * Their progress is wiped once, the first time a build carrying a new
 * `version` is opened, so the word comes back as new rather than being
 * scheduled on the strength of having learned the wrong thing.
 */
export interface Reset {
  version: number
  ids: string[]
}

export interface Deck {
  id: string
  name: string
  level: Level
  notes: Note[]
  resets?: Reset[]
}
