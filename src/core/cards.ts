import type { Note } from './types'

// ---------------------------------------------------------------------------
// One note expands into several cards. A card is a *question type* about a
// note, not a question itself — the wording lives in session/prompts.ts so the
// UI can present the same card however it likes.
// ---------------------------------------------------------------------------

export type CardType =
  | 'recognize' // nl -> en
  | 'recall' // en -> nl
  | 'gender' // de or het?
  | 'plural' // what's the plural?
  | 'participle' // past participle
  | 'auxiliary' // hebben or zijn?

export interface Card {
  id: string
  noteId: string
  type: CardType
}

/** Cards that introduce a word. Everything else is gated behind these. */
export const CORE_TYPES: CardType[] = ['recognize', 'recall']

export function cardId(noteId: string, type: CardType): string {
  return `${noteId}::${type}`
}

/**
 * Deterministic: the same note always produces the same cards with the same
 * ids, so regenerating after a content edit never disturbs saved progress.
 *
 * Deliberately conservative — we only add a grammar card when the answer is
 * genuinely unpredictable. Drilling regular plurals is busywork.
 */
export function cardsForNote(note: Note): Card[] {
  const types: CardType[] = ['recognize', 'recall']

  if (note.pos === 'noun') {
    if (note.gender) types.push('gender')
    if (note.plural && note.irregularPlural) types.push('plural')
  }

  if (note.verb) {
    if (note.verb.irregular || note.verb.separable) types.push('participle')
    // "hebben" is the default; only "zijn" verbs are worth a card.
    if (note.verb.auxiliary !== 'hebben') types.push('auxiliary')
  }

  return types.map((type) => ({ id: cardId(note.id, type), noteId: note.id, type }))
}

export function allCards(notes: Note[]): Card[] {
  return notes.flatMap(cardsForNote)
}
