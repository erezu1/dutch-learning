import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { LEVELS, reachedLevel, type LevelOption } from '../core/levels'
import { glide, pressable, SELECT_DELAY } from './motion'
import { TITLE } from './type'

// ---------------------------------------------------------------------------
// Asked once on first run, changeable any time. It sets where new words start
// in the frequency list — the deck works forward from there and comes back
// afterwards for whatever the head start skipped, so picking wrong costs you
// an ordering and nothing else.
//
// Which also means the answer stops mattering after the first few weeks, so
// once there is a real number to show, the screen shows that instead.
// ---------------------------------------------------------------------------

interface Props {
  current?: LevelOption
  /** Words whose recognise card has reached the review stage. */
  known: number
  onPick: (option: LevelOption) => void
  onCancel?: () => void
}

export function LevelPicker({ current, known, onPick, onCancel }: Props) {
  const reached = current ? reachedLevel(known, current) : null
  // Leaving the instant you tap means you never see which one you chose.
  const [chosen, setChosen] = useState<LevelOption | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  const pick = (option: LevelOption) => {
    if (timer.current) return
    setChosen(option)
    timer.current = setTimeout(() => onPick(option), SELECT_DELAY)
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-8 px-6 py-10">
      <div>
        {/* The same control as Settings, in the same corner. This screen is
            reachable from home once a level has been chosen, and a screen you
            can open is a screen you need a way out of — the text link at the
            bottom was somewhere else entirely, below three cards you had to
            scroll past. On first run there is no way out, because there is
            nothing to go back to yet. */}
        <div className="flex items-center gap-3">
          {onCancel && (
            <motion.button
              whileTap={{ scale: 0.85 }}
              transition={glide}
              onClick={onCancel}
              aria-label="Back"
              className="-ml-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-on-surface-dim"
            >
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
                <path d="M15 5.5 8 12l7 6.5" />
              </svg>
            </motion.button>
          )}
          {/* Smaller beside the arrow than it was alone, so the two sit on one
              line the way Settings does rather than the title wrapping around
              a button parked above it. */}
          <h1 className={`${onCancel ? 'text-3xl' : 'text-4xl'} ${TITLE}`}>Starting point</h1>
        </div>
        <p className="mt-2 text-on-surface-dim">
          Which words you get first. Nothing is skipped for good.
        </p>
        {reached && known > 0 && (
          <p className="mt-3 text-sm text-on-surface-dim">
            You know {known.toLocaleString()} {known === 1 ? 'word' : 'words'} so far, which puts
            you at <span className="text-on-surface">{reached.name}</span>.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {LEVELS.map((option) => {
          const active = chosen ? chosen.id === option.id : current?.id === option.id
          const dimmed = chosen !== null && chosen.id !== option.id
          return (
            <motion.button
              key={option.id}
              {...(chosen === null ? pressable : {})}
              initial={{ opacity: 0, y: 14 }}
              animate={{
                opacity: dimmed ? 0.4 : 1,
                y: 0,
                scale: chosen?.id === option.id ? 1.03 : 1,
              }}
              transition={{ ...glide, delay: chosen ? 0 : 0.05 * LEVELS.indexOf(option) }}
              onClick={() => pick(option)}
              className={`rounded-3xl px-5 py-4 text-left shadow-2 transition-shadow active:shadow-press ${
                active ? 'bg-primary-container text-on-primary-container' : 'bg-surface-1'
              }`}
            >
              <p className={`text-xl ${TITLE}`}>{option.name}</p>
              <p className={`mt-0.5 text-sm ${active ? 'opacity-70' : 'text-on-surface-dim'}`}>
                {option.description}
              </p>
            </motion.button>
          )
        })}
      </div>

      {/* The word data is openly licensed and asks to be credited. Kept here
          rather than on the home screen, which you see every day. */}
      <p className="text-center text-[0.65rem] leading-relaxed text-on-surface-dim/50">
        Word data from Wiktionary (CC BY-SA) and Tatoeba (CC BY), ordered by OpenSubtitles
        frequency.
      </p>
    </div>
  )
}
