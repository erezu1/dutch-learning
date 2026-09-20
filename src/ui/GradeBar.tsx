import { motion } from 'framer-motion'
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

/** Long enough to read the answer before anything starts moving. */
const READ_PAUSE = 3
/** Then the button fills, and carries on by itself when it is full. */
const COUNTDOWN = 5

/**
 * Shown after a multiple-choice answer. The app already knows whether you were
 * right, so there is nothing to grade — just carry on.
 *
 * After a pause to read, the button fills from the left and moves on by
 * itself. The fill sits behind the label rather than over it, so the word
 * stays readable the whole way across, and tapping at any point skips ahead.
 *
 * Only multiple choice does this. A self-graded card is waiting on a judgement
 * only you can make, so it waits as long as it takes.
 */
export function ContinueBar({ onContinue, correct }: { onContinue: () => void; correct: boolean }) {
  return (
    <div className="w-full px-4 pb-4">
      <Button
        tone={correct ? 'good' : 'neutral'}
        onClick={onContinue}
        className="relative w-full overflow-hidden"
      >
        {/* Width rather than a scaled block, so the leading edge can stay a
            fixed softness instead of stretching with it — a hard grey bar
            sweeping across reads like a loading screen. */}
        <motion.span
          aria-hidden="true"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: COUNTDOWN, delay: READ_PAUSE, ease: 'linear' }}
          onAnimationComplete={onContinue}
          className="absolute inset-y-0 left-0 opacity-[0.16]"
          style={{
            background: `linear-gradient(to right, ${
              correct ? 'var(--color-good-ink)' : 'var(--color-primary)'
            } 0, ${
              correct ? 'var(--color-good-ink)' : 'var(--color-primary)'
            } calc(100% - 30px), transparent 100%)`,
          }}
        />
        <span className="relative">Continue</span>
      </Button>
    </div>
  )
}
