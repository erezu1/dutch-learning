import type { Session } from '../session/useSession'
import { ContinueBar, GradeBar } from './GradeBar'
import { PromptCard } from './PromptCard'

export function ReviewScreen({ session, onExit }: { session: Session; onExit: () => void }) {
  const { prompt, revealed, picked, correct, position, length } = session
  if (!prompt) return null

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 px-4 pt-3">
        <button
          onClick={onExit}
          aria-label="Stop"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-on-surface-dim active:scale-90"
        >
          ✕
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${length ? (position / length) * 100 : 0}%` }}
          />
        </div>
        <button
          onClick={session.undo}
          disabled={!session.canUndo}
          aria-label="Undo"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-on-surface-dim active:scale-90 disabled:opacity-25"
        >
          ↺
        </button>
      </header>

      <PromptCard
        prompt={prompt}
        revealed={revealed}
        picked={picked}
        correct={correct}
        onReveal={session.reveal}
        onChoose={session.choose}
      />

      {revealed &&
        (session.autoGrade !== null ? (
          // Multiple choice: already graded, just move on.
          <ContinueBar correct={correct === true} onContinue={() => session.grade(session.autoGrade!)} />
        ) : (
          <GradeBar onGrade={session.grade} />
        ))}
    </div>
  )
}
