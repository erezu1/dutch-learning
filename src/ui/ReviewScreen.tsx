import { AnimatePresence, motion } from 'framer-motion'
import type { Session } from '../session/useSession'
import { ContinueBar, GradeBar } from './GradeBar'
import { cardVariants, glide, pressable, quiet } from './motion'
import { PromptCard } from './PromptCard'

export function ReviewScreen({ session, onExit }: { session: Session; onExit: () => void }) {
  const { prompt, revealed, picked, correct, position, length } = session
  if (!prompt) return null

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 px-4 pt-3">
        <motion.button
          {...pressable}
          onClick={onExit}
          aria-label="Stop"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-on-surface-dim"
        >
          ✕
        </motion.button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${length ? (position / length) * 100 : 0}%` }}
            transition={quiet}
          />
        </div>
        <motion.button
          {...pressable}
          onClick={session.undo}
          disabled={!session.canUndo}
          aria-label="Undo"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-on-surface-dim disabled:opacity-25"
        >
          ↺
        </motion.button>
      </header>

      {/* Keyed on the card, so moving to the next one animates rather than
          swapping the text in place. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={prompt.cardId}
          variants={cardVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={glide}
          className="flex flex-1 flex-col"
        >
          <PromptCard
            prompt={prompt}
            revealed={revealed}
            picked={picked}
            correct={correct}
            onReveal={session.reveal}
            onChoose={session.choose}
          />
        </motion.div>
      </AnimatePresence>

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
