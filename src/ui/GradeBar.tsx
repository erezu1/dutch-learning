import { motion } from 'framer-motion'
import { Rating, type Grade } from '../core/scheduler'
import { pressable } from './motion'

// ---------------------------------------------------------------------------
// Two buttons. The only judgement that has to be honest is "did I know it or
// not", and asking for a finer one on every card invites dishonest grading,
// which would poison the scheduler.
//
// No mention of when the card comes back: the scheduling is the app's job.
// ---------------------------------------------------------------------------

interface Props {
  onGrade: (grade: Grade) => void
}

const base =
  'rounded-3xl py-6 text-base font-semibold shadow-2 transition-shadow active:shadow-press'

export function GradeBar({ onGrade }: Props) {
  return (
    <div className="grid w-full grid-cols-2 gap-3 px-4 pb-4">
      <motion.button
        {...pressable}
        onClick={() => onGrade(Rating.Again)}
        className={`${base} bg-bad text-bad-ink`}
      >
        Didn&rsquo;t know
      </motion.button>

      <motion.button
        {...pressable}
        onClick={() => onGrade(Rating.Good)}
        className={`${base} bg-good text-good-ink`}
      >
        Knew it
      </motion.button>
    </div>
  )
}

/**
 * Shown after a multiple-choice answer. The app already knows whether you were
 * right, so there is nothing to grade — just carry on.
 */
export function ContinueBar({ onContinue, correct }: { onContinue: () => void; correct: boolean }) {
  return (
    <div className="w-full px-4 pb-4">
      <motion.button
        {...pressable}
        onClick={onContinue}
        className={`w-full ${base} ${
          correct ? 'bg-good text-good-ink' : 'bg-surface-1 text-on-surface'
        }`}
      >
        Continue
      </motion.button>
    </div>
  )
}
