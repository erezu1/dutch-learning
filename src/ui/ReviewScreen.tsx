import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { Session } from '../session/useSession'
import { ContinueBar, GradeBar } from './GradeBar'
import { cardVariants, glide, pressable, quiet } from './motion'
import { PromptCard } from './PromptCard'

/** Both header icons drawn at one size — text glyphs like ✕ and ↺ are set at
 *  wildly different optical sizes and never match. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[22px] w-[22px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

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
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-on-surface-dim"
        >
          <Icon>
            <path d="M6 6l12 12M18 6L6 18" />
          </Icon>
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
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-on-surface-dim disabled:opacity-25"
        >
          <Icon>
            <path d="M1 4v6h6" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </Icon>
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

      <div className="flex min-h-[7.5rem] items-end">
        {revealed &&
        (session.autoGrade !== null ? (
          // Multiple choice: already graded, just move on.
          <ContinueBar
            correct={correct === true}
            onContinue={() => session.grade(session.autoGrade!)}
          />
        ) : (
          <GradeBar onGrade={session.grade} />
        ))}
      </div>
    </div>
  )
}
