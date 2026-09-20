import { Rating, type Grade } from '../core/scheduler'

// The four FSRS grades. Again/Good are the two that matter; Hard/Easy are
// available but never required — see the note on honest grading in ROADMAP.md.
const BUTTONS: { grade: Grade; label: string; tone: string }[] = [
  { grade: Rating.Again, label: 'Opnieuw', tone: 'bg-bad/15 text-bad' },
  { grade: Rating.Hard, label: 'Lastig', tone: 'bg-surface-2 text-on-surface-dim' },
  { grade: Rating.Good, label: 'Goed', tone: 'bg-good/15 text-good' },
  { grade: Rating.Easy, label: 'Makkelijk', tone: 'bg-primary-container text-primary' },
]

interface Props {
  onGrade: (grade: Grade) => void
  intervals: Record<Grade, string> | null
}

export function GradeBar({ onGrade, intervals }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2 px-4 pb-4">
      {BUTTONS.map(({ grade, label, tone }) => (
        <button
          key={grade}
          onClick={() => onGrade(grade)}
          className={`flex flex-col items-center gap-0.5 rounded-2xl py-4 transition active:scale-95 ${tone}`}
        >
          <span className="text-sm font-semibold">{label}</span>
          {intervals && <span className="text-[0.7rem] opacity-60">{intervals[grade]}</span>}
        </button>
      ))}
    </div>
  )
}
