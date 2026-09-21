import { motion } from 'framer-motion'
import { weekMessage, type DayState, type WeekDay } from '../core/week'
import { afterRing } from './motion'

// ---------------------------------------------------------------------------
// Seven dots and a sentence. The ring above is today and forgets everything
// overnight; this is the only place the app remembers that you were here
// yesterday, which is the thing a daily habit actually runs on.
//
// Deliberately small and quiet. It sits under the button you came here to
// press, and it is a record, not a demand — a week with holes in it should
// look like a week with holes in it and nothing more.
// ---------------------------------------------------------------------------

/** Every dot occupies the same box; only what's drawn in it changes. */
const DOT: Record<DayState, string> = {
  done: 'h-[10px] w-[10px] bg-primary',
  // Started but not finished: the outline is there, the fill isn't.
  some: 'h-[10px] w-[10px] border-2 border-primary',
  // Today, still open. Fainter than a started day, so the two don't read alike.
  open: 'h-[10px] w-[10px] border-2 border-primary/35',
  missed: 'h-[10px] w-[10px] bg-surface-3',
  // Smaller, because nothing has had the chance to happen yet.
  ahead: 'h-[6px] w-[6px] bg-surface-3/60',
}

interface Props {
  week: WeekDay[]
  /** False until the home screen has landed, so this can follow the ring in. */
  arrived: boolean
}

export function WeekStrip({ week, arrived }: Props) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex items-start gap-3.5">
        {week.map((day, i) => (
          <motion.div
            key={day.key}
            initial={false}
            animate={{ opacity: arrived ? 1 : 0, y: arrived ? 0 : 4 }}
            // Left to right, a beat apart, so the week reads as a week rather
            // than as seven things appearing at once.
            transition={afterRing(0.14 + i * 0.035)}
            className="flex w-4 flex-col items-center gap-1.5"
          >
            <span
              className={`text-[0.62rem] leading-none ${
                day.today ? 'font-semibold text-on-surface' : 'text-on-surface-dim/70'
              }`}
            >
              {day.letter}
            </span>
            {/* A fixed-height box so the smaller 'ahead' dot sits on the same
                line as the rest instead of hanging from the letter. */}
            <span className="grid h-[10px] place-items-center">
              <span className={`rounded-full ${DOT[day.state]}`} />
            </span>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={false}
        animate={{ opacity: arrived ? 1 : 0 }}
        transition={afterRing(0.42)}
        className="text-center text-sm text-on-surface"
      >
        {weekMessage(week)}
      </motion.p>
    </div>
  )
}
