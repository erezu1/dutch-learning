import type { SessionStats } from '../session/useSession'

interface Props {
  stats: SessionStats
  onHome: () => void
}

export function Done({ stats, onHome }: Props) {
  const pct = stats.reviewed ? Math.round((stats.correct / stats.reviewed) * 100) : 0

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <p className="text-6xl">🎉</p>
        <h1 className="mt-4 text-3xl font-semibold">Done for today</h1>
        <p className="mt-2 text-on-surface-dim">
          {stats.reviewed} cards · {pct}% correct
        </p>
      </div>

      <button
        onClick={onHome}
        className="rounded-full bg-primary px-10 py-4 font-semibold text-on-primary transition active:scale-95"
      >
        Back
      </button>
    </div>
  )
}
