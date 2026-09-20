import { AnimatePresence, motion } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import type { Session } from '../session/useSession'
import { ContinueBar, GradeBar } from './GradeBar'
import { cardVariants, glide, quiet, swapVariants, tap, turn } from './motion'
import { PromptCard } from './PromptCard'
import { ScorePop } from './ScorePop'

/**
 * Both header icons are drawn to fill the same 13-unit box inside a 24-unit
 * viewBox, at the same stroke width. Text glyphs (✕, ↺) are set at very
 * different optical sizes, and scaling one icon to match the other scales its
 * stroke too, which makes it visibly thinner — so both are drawn at native
 * size instead.
 */
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

const headerButton =
  'grid h-10 w-10 shrink-0 place-items-center rounded-full text-on-surface-dim transition-[color,background-color,opacity]'

export function ReviewScreen({ session, onExit }: { session: Session; onExit: () => void }) {
  const { prompt, revealed, picked, correct, position, length } = session
  const [spins, setSpins] = useState(0)
  if (!prompt) return null

  return (
    <div className="relative flex flex-1 flex-col">
      <header className="flex items-center gap-3 px-4 pt-3">
        <motion.button
          onClick={onExit}
          aria-label="Stop"
          whileTap={{ scale: 0.82 }}
          transition={tap}
          className={`${headerButton} active:bg-surface-2`}
        >
          <Icon>
            <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />
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
          onClick={() => {
            setSpins((n) => n - 1)
            session.undo()
          }}
          disabled={!session.canUndo}
          aria-label="Undo"
          whileTap={{ scale: 0.82 }}
          transition={tap}
          // Faded by the element's own opacity rather than by a translucent
          // ink. The icon is two strokes that meet at the top left, and a
          // translucent stroke composites twice where they overlap — a dark
          // notch on the corner of an otherwise even icon.
          className={`${headerButton} active:bg-surface-2 disabled:opacity-25`}
        >
          {/* The icon turns a full circle each time, so the button visibly
              does something rather than just recolouring. */}
          <motion.span animate={{ rotate: spins * 360 }} transition={turn} className="grid">
            <Icon>
              {/* Scaled to fill the same 13-unit box as the cross, with the
                  stroke width pre-divided by that scale so it still renders at
                  2 — scaling a group scales its stroke, which is what made
                  this read heavier and smaller than the cross beside it. */}
              <g transform="translate(3.33 3.33) scale(0.7222)" strokeWidth={2 / 0.7222}>
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </g>
            </Icon>
          </motion.span>
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

      <ScorePop award={session.award} />

      {/* The bar rises into place the way the answer above it does, rather
          than appearing fully formed the instant the card is answered. */}
      <div className="flex min-h-[7.5rem] items-end">
        <AnimatePresence initial={false}>
          {revealed && (
            <motion.div
              key="bar"
              variants={swapVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={glide}
              className="w-full"
            >
              {session.autoGrade !== null ? (
                // Multiple choice: already graded, just move on.
                // Already recorded when the option was chosen; this only moves on.
                <ContinueBar onContinue={session.advance} countdown={session.autoContinue} />
              ) : (
                <GradeBar onGrade={session.grade} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
