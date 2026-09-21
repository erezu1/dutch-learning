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

import type { SceneName } from './cat-rig'

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
 * One line under the dots — and one line, literally: every branch has to fit
 * across a phone at the size it is set, because a message that wraps to two
 * lines on the narrow screens and one on the wide ones moves everything under
 * it depending on what kind of week you had.
 *
 * Each says two things and only two: how much is behind you, and a reason to
 * open it again today. It should read like someone who is pleased for you
 * and has not been keeping a ledger: a missed day is worth naming once, and
 * never worth naming twice. Nothing here scolds, because an app that scolds
 * gets deleted on the first bad week — and nothing here trails off into a
 * full stop either, which is the punctuation of a status bar rather than of
 * someone glad you turned up.
 */
function readWeek(days: WeekDay[]) {
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

  return { index, done, missed, started, todayDone, streak, firstDay }
}

export function weekMessage(days: WeekDay[]): string {
  const { index, done, missed, started, todayDone, streak, firstDay } = readWeek(days)
  if (index === 0 && !todayDone && started === 0) return 'A clean week. Start it right!'
  // Not "day one of the week": it can be a Saturday, and the dots say so.
  // This is day one of the history the app has, which is also what it says
  // after a reset.
  if (firstDay && !todayDone) return 'Day one. Nothing to catch up on!'
  if (firstDay && todayDone) return 'Day one, done!'
  if (todayDone && missed === 0 && started === 0) {
    if (index === 6) return 'All seven days. Perfect week!'
    return streak > 1 ? `${streak} days straight. Week is clean!` : 'Day one, done!'
  }
  if (todayDone && streak > 1) return `${streak} days in a row!`
  if (todayDone) return missed === 1 ? 'Back on it after one off day!' : 'Today is done!'

  if (missed === 0) {
    if (started > 0) return 'Nothing missed. Finish today!'
    return done > 0 ? 'Clean week so far. Keep it up!' : 'Nothing missed yet. Clean start!'
  }
  if (missed === 1) return 'One day missed. Today evens it!'
  if (done > 0) return `${missed} missed, ${done} done. Today counts!`
  return `${missed} days missed. Plenty of week left!`
}

/**
 * The face she arrives with. This is the line under the dots, read off the
 * same week by the same rules and said with a face instead of words — so the
 * two can never disagree, which is the whole point of them sharing a reading.
 * Anything else would mean the cat is sad above a sentence congratulating you.
 *
 * Four faces rather than seven: an expression is a blunter instrument than a
 * sentence, and a mascot with a distinct face for every shade of a week is a
 * mascot whose faces stop meaning anything. What survives the compression is
 * the part you would want to hear first — whether you are ahead, here, behind,
 * or properly gone.
 */
export function weekMood(days: WeekDay[]): SceneName {
  const { index, missed, todayDone, streak, firstDay } = readWeek(days)

  // Today is already in. Nothing that happened earlier in the week outranks
  // that, and a clean week or a run of them is worth more than a nod.
  if (todayDone) return streak > 1 || missed === 0 ? 'arriveProud' : 'arriveGlad'
  // A week with no history behind it yet: there is nothing to be sorry about,
  // and pretending otherwise on someone's first day is the worst first day.
  if (index === 0 || firstDay) return 'arriveGlad'
  if (missed >= 2) return 'arriveAway'
  if (missed === 1) return 'arriveBehind'
  return 'arriveGlad'
}
