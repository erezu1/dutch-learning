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

/**
 * Shown after a multiple-choice answer. The app already knows whether you were
 * right, so there is nothing to grade — just carry on.
 */
export function ContinueBar({ onContinue, correct }: { onContinue: () => void; correct: boolean }) {
  return (
    <div className="w-full px-4 pb-4">
      <Button tone={correct ? 'good' : 'neutral'} onClick={onContinue} className="w-full">
        Continue
      </Button>
    </div>
  )
}
