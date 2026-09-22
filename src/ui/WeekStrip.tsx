import { motion } from 'framer-motion'
import { useId } from 'react'
import { weekMessage, type DayState, type WeekDay } from '../core/week'
import { afterRing } from './motion'

// ---------------------------------------------------------------------------
// Seven dots and a sentence. The ring above is today and forgets everything
// overnight; this is the only place the app remembers that you were here
// yesterday, which is the thing a daily habit actually runs on.
//
// Quiet, but not so quiet it cannot be read. The dots were ten pixels with
// fourteen between them, which at arm's length on a phone is a dotted line
// rather than seven days — bigger, and closer together, so they read as one
// object you can count. It is still a record and not a demand: a week with
// holes in it should look like a week with holes in it and nothing more.
//
// A day you finished carries a mark, and the mark is a HOLE: the tick is cut
// out of the dot rather than drawn on it, so the page shows through and it
// needs no ink of its own in either scheme. That is also why the dots grew —
// a mark needs room the plain dot never did. A day that went by empty is the
// other way round: all page, with a dashed outline round where it would have
// been.
// ---------------------------------------------------------------------------

/** The dot's size, and the mark's own box, which the marks are drawn in. */
const SIZE = 22

/** Cut out of a day you finished. */
const TICK = 'M6.1 11.5 L9.4 14.7 L15.9 7.7'

/**
 * A disc with a mark taken out of it.
 *
 * A mask rather than a second path in the page's colour: the page is a moving
 * wash, so a mark painted in "the background colour" is only the background
 * colour for part of the minute. A hole is a hole whatever drifts under it.
 */
function Cut({ mark, fill }: { mark: string; fill: string }) {
  // Scoped per instance: seven dots on the screen, and an id reused across
  // them is one mask that seven elements are fighting over.
  const id = useId()
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 22 22" aria-hidden="true" className="block">
      <mask id={id}>
        <circle cx="11" cy="11" r="11" fill="#fff" />
        <path
          d={mark}
          fill="none"
          stroke="#000"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </mask>
      <circle cx="11" cy="11" r="11" fill={fill} mask={`url(#${id})`} />
    </svg>
  )
}

/**
 * A day that went by with nothing in it: an outline and the page inside it.
 *
 * Drawn rather than bordered. A CSS dashed border on a 22px circle is at the
 * mercy of how the browser divides the dashes, and they come out uneven and
 * chunky at the ends; a stroke on a circle of known circumference takes a
 * pattern that closes exactly, ten times round.
 */
function Gone() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 22 22" aria-hidden="true" className="block">
      <circle
        cx="11"
        cy="11"
        r="10"
        fill="none"
        stroke="var(--color-week-gone)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3.4 2.88"
      />
    </svg>
  )
}

/** Every dot occupies the same box; only what's drawn in it changes. */
function Dot({ state }: { state: DayState }) {
  switch (state) {
    case 'done':
      return <Cut mark={TICK} fill="var(--color-primary)" />
    // Empty, and openly so: nothing was put in it and there is nothing in it
    // now. A filled dot in the empty colour was still a coin on the board.
    case 'missed':
      return <Gone />
    // Started but not finished: the outline is there, the fill isn't. No mark,
    // because nothing has been decided about the day yet.
    case 'some':
      return <span className="h-[22px] w-[22px] rounded-full border-2 border-primary" />
    // Today, still open. Fainter than a started day, so the two don't read alike.
    case 'open':
      return <span className="h-[22px] w-[22px] rounded-full border-2 border-primary/35" />
    // Smaller, because nothing has had the chance to happen yet. Smaller is the
    // whole difference: it used to be faded as well, and three fifths of a
    // colour that was already the palest thing on the page put it back under
    // the drifting ground the colour had just been lifted out of.
    default:
      return <span className="h-[13px] w-[13px] rounded-full bg-surface-3" />
  }
}

interface Props {
  week: WeekDay[]
  /** False until the home screen has landed, so this can follow the ring in. */
  arrived: boolean
}

export function WeekStrip({ week, arrived }: Props) {
  // `w-full` on the column, or it is only as wide as the row of dots and the
  // longest lines wrap: the dots are 240 across and three of the messages are
  // wider than that. The dots stay centred inside it either way.
  return (
    <div className="flex w-full flex-col items-center gap-2.5">
      <div className="flex items-start gap-3">
        {week.map((day, i) => (
          <motion.div
            key={day.key}
            initial={false}
            animate={{ opacity: arrived ? 1 : 0, y: arrived ? 0 : 4 }}
            // Left to right, a beat apart, so the week reads as a week rather
            // than as seven things appearing at once.
            transition={afterRing(0.14 + i * 0.035)}
            className="flex w-7 flex-col items-center gap-1.5"
          >
            <span
              className={`text-[0.78rem] leading-none ${
                day.today ? 'font-semibold text-on-surface' : 'text-on-surface-dim/70'
              }`}
            >
              {day.letter}
            </span>
            {/* A fixed-height box so the smaller 'ahead' dot sits on the same
                line as the rest instead of hanging from the letter. */}
            <span className="grid h-[22px] place-items-center">
              <Dot state={day.state} />
            </span>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={false}
        animate={{ opacity: arrived ? 1 : 0 }}
        transition={afterRing(0.42)}
        className="text-center text-base font-semibold text-on-surface"
      >
        {weekMessage(week)}
      </motion.p>
    </div>
  )
}
