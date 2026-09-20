import type { Card, CardType } from '../core/cards'
import type { Note } from '../core/types'

// ---------------------------------------------------------------------------
// A Prompt is everything the UI needs to show one question, in a shape that
// says nothing about *how* it looks. Swiping cards, buttons, a 3D flip — they
// all render the same Prompt. This is the seam the Phase 3 UI rewrite runs
// along, so nothing below this file should ever import from ../ui.
// ---------------------------------------------------------------------------

export type PromptShape =
  /** show question, tap to reveal, self-grade */
  | 'reveal'
  /** pick one of a few options; we know whether it was right */
  | 'choice'

export interface Prompt {
  cardId: string
  noteId: string
  cardType: CardType
  shape: PromptShape

  /** Small label: "wat betekent dit?", "de of het?" */
  instruction: string
  question: string
  questionLang: 'nl' | 'en'
  /** Disambiguates when a question alone is ambiguous, e.g. "(zelfstandig nw.)" */
  subtitle?: string

  answer: string
  answerLang: 'nl' | 'en'
  /** Extra context shown once revealed, e.g. an example sentence. */
  detail?: string
  detailTranslation?: string

  choices?: string[]
  /** What TTS should read out. Undefined when nothing Dutch is worth hearing. */
  speak?: string
  note: Note
}

const posLabel: Record<string, string> = {
  noun: 'zelfstandig naamwoord',
  verb: 'werkwoord',
  adj: 'bijvoeglijk naamwoord',
  adv: 'bijwoord',
  prep: 'voorzetsel',
  phrase: 'uitdrukking',
  num: 'telwoord',
}

function example(note: Note) {
  const ex = note.examples?.[0]
  return { detail: ex?.nl, detailTranslation: ex?.en }
}

export function buildPrompt(card: Card, note: Note): Prompt {
  const base = {
    cardId: card.id,
    noteId: note.id,
    cardType: card.type,
    note,
  }

  switch (card.type) {
    case 'recognize':
      return {
        ...base,
        shape: 'reveal',
        instruction: 'Wat betekent dit?',
        question: note.nl,
        questionLang: 'nl',
        subtitle: posLabel[note.pos],
        answer: note.en.join(', '),
        answerLang: 'en',
        speak: note.nl,
        ...example(note),
      }

    case 'recall':
      return {
        ...base,
        shape: 'reveal',
        instruction: 'Hoe zeg je dit in het Nederlands?',
        question: note.en.join(', '),
        questionLang: 'en',
        subtitle: posLabel[note.pos],
        answer: note.gender ? `${note.gender} ${note.nl}` : note.nl,
        answerLang: 'nl',
        speak: note.nl,
        ...example(note),
      }

    case 'gender':
      return {
        ...base,
        shape: 'choice',
        instruction: 'de of het?',
        question: note.nl,
        questionLang: 'nl',
        answer: note.gender!,
        answerLang: 'nl',
        choices: ['de', 'het'],
        speak: `${note.gender} ${note.nl}`,
        ...example(note),
      }

    case 'plural':
      return {
        ...base,
        shape: 'reveal',
        instruction: 'Wat is het meervoud?',
        question: `${note.gender ?? ''} ${note.nl}`.trim(),
        questionLang: 'nl',
        answer: note.plural!,
        answerLang: 'nl',
        speak: note.plural,
        ...example(note),
      }

    case 'participle':
      return {
        ...base,
        shape: 'reveal',
        instruction: 'Wat is het voltooid deelwoord?',
        question: note.nl,
        questionLang: 'nl',
        subtitle: note.verb?.separable ? 'scheidbaar werkwoord' : undefined,
        answer: `${note.verb!.auxiliary} ${note.verb!.participle}`,
        answerLang: 'nl',
        speak: note.verb!.participle,
        ...example(note),
      }

    case 'auxiliary':
      return {
        ...base,
        shape: 'choice',
        instruction: 'hebben of zijn?',
        question: note.verb!.participle,
        questionLang: 'nl',
        subtitle: note.nl,
        answer: note.verb!.auxiliary === 'both' ? 'hebben' : note.verb!.auxiliary,
        answerLang: 'nl',
        choices: ['hebben', 'zijn'],
        speak: `${note.verb!.auxiliary} ${note.verb!.participle}`,
        ...example(note),
      }
  }
}
