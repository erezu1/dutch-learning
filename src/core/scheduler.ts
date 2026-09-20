import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card as FsrsCard } from 'ts-fsrs'
import type { CardStateRow } from './db'

// ---------------------------------------------------------------------------
// Thin wrapper around ts-fsrs. Everything else in the app talks to *this*, not
// to ts-fsrs directly, so the scheduler can be swapped or retuned in one place.
// ---------------------------------------------------------------------------

export { Rating, State }

const params = generatorParameters({
  /** Aim to remember 90% of what's due. Lower = fewer reviews, more forgetting. */
  request_retention: 0.9,
  enable_fuzz: true,
})

const scheduler = fsrs(params)

export type Grade = typeof Rating.Again | typeof Rating.Hard | typeof Rating.Good | typeof Rating.Easy

function toRow(cardId: string, c: FsrsCard): CardStateRow {
  return {
    cardId,
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    lastReview: c.last_review?.getTime(),
  }
}

function toFsrs(row: CardStateRow): FsrsCard {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsedDays,
    scheduled_days: row.scheduledDays,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    last_review: row.lastReview ? new Date(row.lastReview) : undefined,
  } as FsrsCard
}

export function emptyState(cardId: string, now = new Date()): CardStateRow {
  return toRow(cardId, createEmptyCard(now))
}

/** Apply a grade and return the new state. Pure — caller persists it. */
export function applyGrade(row: CardStateRow, grade: Grade, now = new Date()): CardStateRow {
  const result = scheduler.next(toFsrs(row), now, grade)
  return toRow(row.cardId, result.card)
}

export function isNew(row: CardStateRow | undefined): boolean {
  return !row || row.state === State.New
}
