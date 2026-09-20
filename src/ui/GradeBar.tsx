import { Rating, type Grade } from '../core/scheduler'

// ---------------------------------------------------------------------------
// Two buttons, because the only judgement that has to be honest is "did I know
// it or not". Hard and Easy are available underneath but never required —
// FSRS is perfectly happy on a diet of Again and Good.
//
// The small time under each button is when that word comes back.
// ---------------------------------------------------------------------------

interface Props {
  onGrade: (grade: Grade) => void
  intervals: Record<Grade, string> | null
}

export function GradeBar({ onGrade, intervals }: Props) {
  return (
    <div className="px-4 pb-4">
      <div className="grid grid-cols-2 gap-3">
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

      <div className="mt-2 flex items-center justify-center gap-6 text-xs text-on-surface-dim">
        <button onClick={() => onGrade(Rating.Hard)} className="px-3 py-2 active:scale-95">
          barely{intervals && <span className="opacity-50"> · {intervals[Rating.Hard]}</span>}
        </button>
        <button onClick={() => onGrade(Rating.Easy)} className="px-3 py-2 active:scale-95">
          too easy{intervals && <span className="opacity-50"> · {intervals[Rating.Easy]}</span>}
        </button>
      </div>
    </div>
  )
}
