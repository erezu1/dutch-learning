import { motion } from 'framer-motion'
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
// ---------------------------------------------------------------------------

/** Every dot occupies the same box; only what's drawn in it changes. */
const DOT: Record<DayState, string> = {
  done: 'h-[18px] w-[18px] bg-primary',
  // Started but not finished: the outline is there, the fill isn't.
  some: 'h-[18px] w-[18px] border-2 border-primary',
  // Today, still open. Fainter than a started day, so the two don't read alike.
  open: 'h-[18px] w-[18px] border-2 border-primary/35',
  missed: 'h-[18px] w-[18px] bg-surface-3',
  // Smaller, because nothing has had the chance to happen yet. Smaller is the
  // whole difference: it used to be faded as well, and three fifths of a
  // colour that was already the palest thing on the page put it back under
  // the drifting ground the colour was just lifted out of — 1.20:1 against
  // 1.34:1 for everything else it stands next to.
  ahead: 'h-[11px] w-[11px] bg-surface-3',
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
            className="flex w-6 flex-col items-center gap-1.5"
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
            <span className="grid h-[18px] place-items-center">
              <span className={`rounded-full ${DOT[day.state]}`} />
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
