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

/** What each button would do, for showing "2 days" under the grade buttons. */
export function previewIntervals(row: CardStateRow, now = new Date()): Record<Grade, string> {
  const s = scheduler.repeat(toFsrs(row), now)
  const fmt = (d: Date) => humanInterval(d.getTime() - now.getTime())
  return {
    [Rating.Again]: fmt(s[Rating.Again].card.due),
    [Rating.Hard]: fmt(s[Rating.Hard].card.due),
    [Rating.Good]: fmt(s[Rating.Good].card.due),
    [Rating.Easy]: fmt(s[Rating.Easy].card.due),
  } as Record<Grade, string>
}

export function humanInterval(ms: number): string {
  const min = ms / 60000
  if (min < 1) return 'nu'
  if (min < 60) return `${Math.round(min)}m`
  const hours = min / 60
  if (hours < 24) return `${Math.round(hours)}u`
  const days = hours / 24
  if (days < 30) return `${Math.round(days)}d`
  const months = days / 30.4
  if (months < 12) return `${Math.round(months)}mnd`
  return `${(days / 365).toFixed(1)}j`
}

export function isNew(row: CardStateRow | undefined): boolean {
  return !row || row.state === State.New
}
