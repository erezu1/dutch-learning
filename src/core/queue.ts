import type { Card } from './cards'
import { cardId } from './cards'
import type { CardStateRow } from './db'
import { isNew, State } from './scheduler'

// ---------------------------------------------------------------------------
// What to study right now. Two jobs: pick the due cards, and hold back the
// grammar cards until the word itself is familiar — otherwise day one buries
// you under four questions per word.
// ---------------------------------------------------------------------------

export interface QueueOptions {
  newPerDay: number
  maxSession: number
  now: Date
}

export const DEFAULTS: Pick<QueueOptions, 'newPerDay' | 'maxSession'> = {
  newPerDay: 8,
  maxSession: 20,
}

/**
 * A grammar card (de/het, plural, participle) only becomes eligible once the
 * word's own recognise card is out of learning. Knowing a noun's gender is
 * pointless before you know the noun.
 */
export function isUnlocked(card: Card, states: Map<string, CardStateRow>): boolean {
  if (card.type === 'recognize') return true
  const recognize = states.get(cardId(card.noteId, 'recognize'))
  if (card.type === 'recall') {
    // The reverse direction opens as soon as you've seen the word once.
    return !!recognize && recognize.reps > 0
  }
  return !!recognize && recognize.state === State.Review
}

export interface Queue {
  cards: Card[]
  dueCount: number
  newCount: number
}

export function buildQueue(
  cards: Card[],
  states: Map<string, CardStateRow>,
  opts: QueueOptions,
): Queue {
  const nowMs = opts.now.getTime()
  const eligible = cards.filter((c) => isUnlocked(c, states))

  const due: Card[] = []
  const fresh: Card[] = []

  for (const card of eligible) {
    const state = states.get(card.id)
    if (isNew(state)) fresh.push(card)
    else if (state!.due <= nowMs) due.push(card)
  }

  due.sort((a, b) => states.get(a.id)!.due - states.get(b.id)!.due)

  const newToday = fresh.slice(0, opts.newPerDay)
  const picked = [...due, ...newToday].slice(0, opts.maxSession)

  return {
    cards: interleave(picked, states),
    dueCount: due.length,
    newCount: newToday.length,
  }
}

/**
 * Mix reviews and new cards instead of front-loading all the reviews, and
 * avoid showing two cards about the same word back to back.
 */
function interleave(cards: Card[], states: Map<string, CardStateRow>): Card[] {
  const reviews = cards.filter((c) => !isNew(states.get(c.id)))
  const fresh = cards.filter((c) => isNew(states.get(c.id)))
  const out: Card[] = []
  const ratio = fresh.length ? Math.max(1, Math.round(reviews.length / fresh.length)) : Infinity

  let r = 0
  let f = 0
  while (r < reviews.length || f < fresh.length) {
    for (let i = 0; i < ratio && r < reviews.length; i++) out.push(reviews[r++])
    if (f < fresh.length) out.push(fresh[f++])
  }
  return spread(out)
}

/** Push apart cards that belong to the same note. */
function spread(cards: Card[]): Card[] {
  const out = [...cards]
  for (let i = 1; i < out.length; i++) {
    if (out[i].noteId !== out[i - 1].noteId) continue
    const swap = out.findIndex((c, j) => j > i && c.noteId !== out[i - 1].noteId)
    if (swap > -1) [out[i], out[swap]] = [out[swap], out[i]]
  }
  return out
}
