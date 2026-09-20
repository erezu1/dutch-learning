// ---------------------------------------------------------------------------
// Content types: what we know about the Dutch language.
// These describe the deck files in src/content and are the *only* source of
// truth for what questions we can ask. Every field here is a potential card.
// ---------------------------------------------------------------------------

export type Gender = 'de' | 'het'
export type Level = 'A1' | 'A2' | 'B1' | 'B2'
export type Pos = 'noun' | 'verb' | 'adj' | 'adv' | 'prep' | 'phrase' | 'num'
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
}

export interface Deck {
  id: string
  name: string
  level: Level
  notes: Note[]
}
