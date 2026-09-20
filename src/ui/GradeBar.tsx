import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { Rating, type Grade } from '../core/scheduler'
import { Button } from './Button'

// ---------------------------------------------------------------------------
// Two buttons. The only judgement that has to be honest is "did I know it or
// not", and asking for a finer one on every card invites dishonest grading,
// which would poison the scheduler.
//
// No mention of when the card comes back: the scheduling is the app's job.
// ---------------------------------------------------------------------------

export function GradeBar({ onGrade }: { onGrade: (grade: Grade) => void }) {
  return (
    <div className="grid w-full grid-cols-2 gap-3 px-4 pb-4">
      <Button tone="bad" onClick={() => onGrade(Rating.Again)} className="px-4">
        Didn&rsquo;t know
      </Button>
      <Button tone="good" onClick={() => onGrade(Rating.Good)} className="px-4">
        Knew it
      </Button>
    </div>
  )
}

/** The countdown's wash, faint at the start and stronger at the leading edge. */
function fillGradient(): string {
  const at = (pct: number) => `color-mix(in srgb, var(--color-primary) ${pct}%, transparent)`
  return `linear-gradient(to right, ${at(8)}, ${at(30)})`
}

/** Long enough to read the answer before anything starts moving. */
const READ_PAUSE = 3
/** Then the button fills, and carries on by itself when it is full. */
const COUNTDOWN_SECONDS = 5
/** A beat at the end, so the button is seen full before the card leaves. */
const SETTLE = 300

/**
 * Shown after a multiple-choice answer. The app already knows whether you were
 * right, so there is nothing to grade — just carry on.
 *
 * It always wears the accent, never a right-or-wrong colour: whether you got
 * it is already said by the answer above, and a button that changes colour for
 * a reason you have to work out is worse than one that doesn't change at all.
 *
 * After a pause to read, the button fills from the left and moves on by
 * itself. The fill sits behind the label rather than over it, so the word
 * stays readable the whole way across, and tapping at any point skips ahead.
 *
 * Only multiple choice does this. A self-graded card is waiting on a judgement
 * only you can make, so it waits as long as it takes.
 */
export function ContinueBar({
  onContinue,
  countdown,
}: {
  onContinue: () => void
  countdown: boolean
}) {
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (settle.current) clearTimeout(settle.current)
    },
    [],
  )

  return (
    <div className="w-full px-4 pb-4">
      <Button tone="accent" onClick={onContinue} className="relative w-full overflow-hidden">
        {/* Only when asked for. A crisp leading edge, with the fill itself
            graded from faint at the start to stronger at the edge: because the
            gradient spans the element it stretches as the fill grows, so the
            strongest point always sits where the progress has reached. */}
        {countdown && (
          <motion.span
            aria-hidden="true"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: COUNTDOWN_SECONDS, delay: READ_PAUSE, ease: 'linear' }}
            // Not straight into the next card: the bar reaching the end and
            // the card leaving at the same instant reads as a jump cut.
            onAnimationComplete={() => {
              settle.current = setTimeout(onContinue, SETTLE)
            }}
            className="absolute inset-y-0 left-0"
            style={{ background: fillGradient() }}
          />
        )}

        <span className="relative">Continue</span>
      </Button>
    </div>
  )
}
