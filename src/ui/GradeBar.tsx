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
 *
 * It always wears the accent, never a right-or-wrong colour: whether you got
 * it is already said by the answer above, and a button that changes colour for
 * a reason you have to work out is worse than one that doesn't change at all.
 *
 * With "Continue automatically" on, a right answer doesn't show this at all
 * (see ReviewScreen), and a wrong one waits here for as long as you want to
 * look at what the answer was. It used to count down and leave by itself
 * either way, which is exactly backwards for a mistake: that is the card you
 * want to stay on.
 */
export function ContinueBar({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="w-full px-4 pb-4">
      <Button tone="accent" onClick={onContinue} className="w-full">
        Continue
      </Button>
    </div>
  )
}
