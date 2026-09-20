import { Rating, type Grade } from '../core/scheduler'

// ---------------------------------------------------------------------------
// Two buttons, and no mention of when the card comes back. The scheduling is
// the app's job, not something to think about mid-review — being shown "back
// in 16d" invites you to grade for the interval you want rather than for what
// you actually knew, which is exactly what corrupts the data.
// ---------------------------------------------------------------------------

interface Props {
  onGrade: (grade: Grade) => void
}

export function GradeBar({ onGrade }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pb-4">
      <button
        onClick={() => onGrade(Rating.Again)}
        className="rounded-3xl bg-bad/15 py-6 text-base font-semibold text-bad transition active:scale-95"
      >
        Didn&rsquo;t know
      </button>

      <button
        onClick={() => onGrade(Rating.Good)}
        className="rounded-3xl bg-good/15 py-6 text-base font-semibold text-good transition active:scale-95"
      >
        Knew it
      </button>
    </div>
  )
}

/**
 * Shown after a multiple-choice answer. The app already knows whether you were
 * right, so there is nothing to grade — just carry on.
 */
export function ContinueBar({ onContinue, correct }: { onContinue: () => void; correct: boolean }) {
  return (
    <div className="px-4 pb-4">
      <button
        onClick={onContinue}
        className={`w-full rounded-3xl py-6 text-base font-semibold transition active:scale-95 ${
          correct ? 'bg-good/15 text-good' : 'bg-surface-2 text-on-surface'
        }`}
      >
        Continue
      </button>
    </div>
  )
}
