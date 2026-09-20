// ---------------------------------------------------------------------------
// The week behind you, in seven dots.
//
// A daily habit needs somewhere to see itself. The ring on the home screen is
// only ever today: it fills, and overnight it is empty again with nothing to
// show that yesterday ever happened. This is the other half — what the week
// has looked like, and one line of encouragement drawn from it.
//
// Two sources, because they answer different questions. The review log knows
// which days you *studied*; only the app knows which days you got to the end
// of, so those are written down as they happen. A day you started and didn't
// finish is worth showing as exactly that, rather than rounding it to nothing.
// ---------------------------------------------------------------------------

/** Local calendar day. Sortable, and the same key the session uses. */
export const dayKey = (d: Date): string => d.toLocaleDateString('sv')

export type DayState =
  /** Got to the end of the day's questions. */
  | 'done'
  /** Answered something, but stopped short. */
  | 'some'
  /** A day gone by with nothing on it. */
  | 'missed'
  /** Today, not started yet. */
  | 'open'
  /** Still to come — or before you started, which is the same nothing. */
  | 'ahead'

export interface WeekDay {
  key: string
  /** One letter, Monday first. */
  letter: string
  state: DayState
  today: boolean
}

/** A day of the week in JavaScript's own numbering: 0 is Sunday. */
export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Sunday first, because that is the order `getDay` counts in. */
const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

/**
 * The Netherlands starts its weeks on Monday, so the app does too until told
 * otherwise. Which day it is changes nothing but where the strip is cut: the
 * days themselves are the same days.
 */
export const DEFAULT_WEEK_START: WeekStartDay = 1

export function weekStartDay(value: unknown): WeekStartDay {
  return typeof value === 'number' && value >= 0 && value <= 6
    ? (Math.trunc(value) as WeekStartDay)
    : DEFAULT_WEEK_START
}

/** The first day of the week `now` falls in, at midnight. */
export function weekStart(now: Date, startsOn: WeekStartDay = DEFAULT_WEEK_START): Date {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() - startsOn + 7) % 7))
  return start
}

/**
 * `since` is the day of your first ever answer. Days before it are nobody's
 * fault: installing the app on a Sunday should not be greeted with six missed
 * days, which is what a week with no beginning says.
 */
export function weekDays(
  now: Date,
  studied: Set<string>,
  finished: Set<string>,
  since?: string,
  startsOn: WeekStartDay = DEFAULT_WEEK_START,
): WeekDay[] {
  const start = weekStart(now, startsOn)
  const todayKey = dayKey(now)
  return LETTERS.map((_, i) => {
    const letter = LETTERS[(startsOn + i) % 7]
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const key = dayKey(date)
    const today = key === todayKey
    const state: DayState = finished.has(key)
      ? 'done'
      : studied.has(key)
        ? 'some'
        : today
          ? 'open'
          : key < todayKey && (!since || key >= since)
            ? 'missed'
            : 'ahead'
    return { key, letter, state, today }
  })
}

/**
 * One line under the dots. It should read like someone who is pleased for you
 * and has not been keeping a ledger: a missed day is worth naming once, and
 * never worth naming twice. Nothing here scolds, because an app that scolds
 * gets deleted on the first bad week — and nothing here trails off into a
 * full stop either, which is the punctuation of a status bar rather than of
 * someone glad you turned up.
 */
export function weekMessage(days: WeekDay[]): string {
  const index = days.findIndex((d) => d.today)
  const sofar = days.slice(0, index + 1)
  const done = sofar.filter((d) => d.state === 'done').length
  const missed = sofar.filter((d) => d.state === 'missed').length
  const started = sofar.filter((d) => d.state === 'some').length
  const todayDone = sofar[index]?.state === 'done'

  // Days in a row, counting back from today. Today only counts if it's done,
  // so the streak is a fact rather than a promise.
  let streak = 0
  for (let i = todayDone ? index : index - 1; i >= 0 && days[i].state === 'done'; i--) streak++

  // Nothing before today belongs to you yet: this is your first day, either
  // of the week or of the app.
  // Vacuously true on a Monday, which is why the index is part of it.
  const firstDay = index > 0 && sofar.slice(0, index).every((d) => d.state === 'ahead')
  if (index === 0 && !todayDone && started === 0) return 'A new week. Start it straight!'
  // Not "day one of the week": it can be a Saturday, and the dots say so.
  // This is day one of the history the app has, which is also what it says
  // after a reset.
  if (firstDay && !todayDone) return 'A fresh start — nothing to catch up on!'
  if (firstDay && todayDone) return 'First day, done!'
  if (todayDone && missed === 0 && started === 0) {
    if (index === 6) return 'Every day this week. All seven!'
    return streak > 1 ? `${streak} days straight, and the week is clean!` : 'Day one, done!'
  }
  if (todayDone && streak > 1) return `${streak} days in a row!`
  if (todayDone) return missed === 1 ? 'Back on it after one off day!' : 'Today is done!'

  if (missed === 0) {
    if (started > 0) return 'Nothing missed yet — finish today and it stays that way!'
    return done > 0
      ? 'Clean week so far. Keep it up!'
      : 'Nothing missed yet this week — off to a clean start!'
  }
  if (missed === 1) return 'One day missed this week. Today evens it up!'
  if (done > 0) return `${missed} days missed, ${done} done. Today decides which way it goes!`
  return `${missed} days missed this week. Plenty of week left!`
}
