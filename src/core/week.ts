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

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** Monday of the week `now` falls in, at midnight. */
export function weekStart(now: Date): Date {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  // getDay is Sunday-first; the Netherlands, and the app, start on Monday.
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
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
): WeekDay[] {
  const start = weekStart(now)
  const todayKey = dayKey(now)
  return LETTERS.map((letter, i) => {
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
 * gets deleted on the first bad week.
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
  if (index === 0 && !todayDone && started === 0) return 'A new week. Start it straight.'
  if (firstDay && !todayDone) return 'Day one. The rest of the week is yours.'
  if (firstDay && todayDone) return 'First day, done.'
  if (todayDone && missed === 0 && started === 0) {
    if (index === 6) return 'Every day this week. All seven.'
    return streak > 1 ? `${streak} days straight, and the week is clean.` : 'Day one, done.'
  }
  if (todayDone && streak > 1) return `${streak} days in a row.`
  if (todayDone) return missed === 1 ? 'Back on it after one off day.' : 'Today is done.'

  if (missed === 0) {
    if (started > 0) return 'Nothing missed yet — finish today and it stays that way.'
    return done > 0 ? 'Clean week so far. Keep it.' : 'Nothing missed yet this week.'
  }
  if (missed === 1) return 'One day missed this week. Today evens it up.'
  if (done > 0) return `${missed} days missed, ${done} done. Today decides which way it goes.`
  return `${missed} days missed this week. The week can still turn around.`
}
