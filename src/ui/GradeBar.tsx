import { Rating, type Grade } from '../core/scheduler'

// ---------------------------------------------------------------------------
// Two buttons. The only judgement that has to be honest is "did I know it or
// not", and asking for a finer one on every card invites dishonest grading,
// which would poison the scheduler. FSRS is fine on Again and Good alone.
//
// The small time under each button is when that word comes back.
// ---------------------------------------------------------------------------

interface Props {
  onGrade: (grade: Grade) => void
  intervals: Record<Grade, string> | null
}

export function GradeBar({ onGrade, intervals }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pb-4">
      <button
        onClick={() => onGrade(Rating.Again)}
        className="flex flex-col items-center gap-0.5 rounded-3xl bg-bad/15 py-5 text-bad transition active:scale-95"
      >
        <span className="text-base font-semibold">Didn&rsquo;t know</span>
        {intervals && <span className="text-xs opacity-60">back in {intervals[Rating.Again]}</span>}
      </button>

      <button
        onClick={() => onGrade(Rating.Good)}
        className="flex flex-col items-center gap-0.5 rounded-3xl bg-good/15 py-5 text-good transition active:scale-95"
      >
        <span className="text-base font-semibold">Knew it</span>
        {intervals && <span className="text-xs opacity-60">back in {intervals[Rating.Good]}</span>}
      </button>
    </div>
  )
}

/**
 * Shown after a multiple-choice answer. The app already knows whether you were
 * right, so there is nothing to grade — just carry on.
 */
export function ContinueBar({
  onContinue,
  correct,
  interval,
}: {
  onContinue: () => void
  correct: boolean
  interval?: string
}) {
  return (
    <div className="px-4 pb-4">
      <button
        onClick={onContinue}
        className={`flex w-full flex-col items-center gap-0.5 rounded-3xl py-5 transition active:scale-95 ${
          correct ? 'bg-good/15 text-good' : 'bg-surface-2 text-on-surface'
        }`}
      >
        <span className="text-base font-semibold">Continue</span>
        {interval && <span className="text-xs opacity-60">back in {interval}</span>}
      </button>
    </div>
  )
}
