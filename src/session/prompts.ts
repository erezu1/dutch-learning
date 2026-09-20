import { blankOut, clozeSource, type Card, type CardType } from '../core/cards'
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
  /** pick one of a few options; the app knows whether it was right */
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
  /** A sentence needs smaller type than a single word. */
  display?: 'word' | 'sentence'
  /** Disambiguates when a question alone is ambiguous, e.g. "(zelfstandig nw.)" */
  subtitle?: string

  answer: string
  answerLang: 'nl' | 'en'
  /**
   * The word's other senses, shown only once the card is answered. Asking
   * "what is 'little, few' in Dutch?" reads like a riddle; asking for "little"
   * and then showing the fuller meaning teaches the same thing without the
   * question looking odd.
   */
  meaning?: string
  /** Extra context shown once revealed, e.g. an example sentence. */
  detail?: string
  detailTranslation?: string

  choices?: string[]
  /** What TTS should read out. Undefined when nothing Dutch is worth hearing. */
  speak?: string
  note: Note
}

// The interface is in English: the Dutch on screen should be the thing you're
// learning, not the furniture around it.
const posLabel: Record<string, string> = {
  noun: 'noun',
  verb: 'verb',
  adj: 'adjective',
  adv: 'adverb',
  prep: 'preposition',
  phrase: 'phrase',
  num: 'numeral',
  pron: 'pronoun',
  det: 'determiner',
  conj: 'conjunction',
}

function example(note: Note) {
  const ex = note.examples?.[0]
  return { detail: ex?.nl, detailTranslation: ex?.en }
}

export interface PromptContext {
  /** The whole deck, so we can draw plausible wrong answers from it. */
  notes: Note[]
  /**
   * True while the word is still being learned. Multiple choice is easier than
   * recalling from nothing, so we use it to introduce a word and switch to
   * free recall once it sticks.
   */
  introduce: boolean
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Wrong answers have to be plausible or the question answers itself. Prefer
 * words of the same kind and topic; fall back to same kind, then anything.
 */
function distractors(note: Note, ctx: PromptContext, render: (n: Note) => string, count = 3): string[] {
  const correct = render(note)
  const candidates = ctx.notes.filter((n) => n.id !== note.id && render(n) !== correct)
  const tag = note.tags?.[0]

  const tiers = [
    candidates.filter((n) => n.pos === note.pos && tag && n.tags?.includes(tag)),
    candidates.filter((n) => n.pos === note.pos),
    candidates,
  ]

  const picked: string[] = []
  for (const tier of tiers) {
    for (const n of shuffle(tier)) {
      const text = render(n)
      if (picked.includes(text)) continue
      picked.push(text)
      if (picked.length === count) return picked
    }
  }
  return picked
}

const firstGloss = (n: Note) => n.en[0]
const dutch = (n: Note) => n.nl

export function buildPrompt(card: Card, note: Note, ctx: PromptContext): Prompt {
  const base = {
    cardId: card.id,
    noteId: note.id,
    cardType: card.type,
    note,
  }

  switch (card.type) {
    case 'recognize': {
      const choice = ctx.introduce
      return {
        ...base,
        shape: choice ? 'choice' : 'reveal',
        instruction: 'What does this mean?',
        question: note.nl,
        questionLang: 'nl',
        subtitle: posLabel[note.pos],
        answer: choice ? firstGloss(note) : note.en.join(' · '),
        answerLang: 'en',
        meaning: choice && note.en.length > 1 ? note.en.join(' · ') : undefined,
        choices: choice
          ? shuffle([firstGloss(note), ...distractors(note, ctx, firstGloss)])
          : undefined,
        speak: note.nl,
        ...example(note),
      }
    }

    case 'recall': {
      const choice = ctx.introduce
      return {
        ...base,
        shape: choice ? 'choice' : 'reveal',
        instruction: 'How do you say this in Dutch?',
        // Only the main sense is asked. The rest comes after the answer.
        question: firstGloss(note),
        questionLang: 'en',
        subtitle: posLabel[note.pos],
        // Free recall shows the article too; multiple choice must not, or the
        // options would give away the gender answer elsewhere in the deck.
        answer: choice ? note.nl : note.gender ? `${note.gender} ${note.nl}` : note.nl,
        answerLang: 'nl',
        meaning: note.en.length > 1 ? note.en.join(' · ') : undefined,
        choices: choice ? shuffle([dutch(note), ...distractors(note, ctx, dutch)]) : undefined,
        speak: note.nl,
        ...example(note),
      }
    }

    case 'gender':
      return {
        ...base,
        shape: 'choice',
        instruction: 'de or het?',
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
        instruction: 'What is the plural?',
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
        instruction: 'What is the past participle?',
        question: note.nl,
        questionLang: 'nl',
        subtitle: note.verb?.separable ? 'separable verb' : undefined,
        // Only claim the auxiliary when we actually know it.
        answer: note.verb!.auxiliaryUnknown
          ? note.verb!.participle
          : `${note.verb!.auxiliary} ${note.verb!.participle}`,
        answerLang: 'nl',
        speak: note.verb!.participle,
        ...example(note),
      }

    case 'cloze': {
      const ex = clozeSource(note)!
      const choice = ctx.introduce
      return {
        ...base,
        shape: choice ? 'choice' : 'reveal',
        display: 'sentence',
        instruction: 'Which word fits the gap?',
        question: blankOut(ex.nl, note.nl),
        questionLang: 'nl',
        answer: note.nl,
        answerLang: 'nl',
        choices: choice ? shuffle([dutch(note), ...distractors(note, ctx, dutch)]) : undefined,
        // The full sentence gives the answer away, so it is only spoken and
        // shown once the card has been answered.
        speak: ex.nl,
        detail: ex.nl,
        detailTranslation: ex.en,
      }
    }

    case 'auxiliary':
      return {
        ...base,
        shape: 'choice',
        instruction: 'hebben or zijn?',
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
