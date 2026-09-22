import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { LEVELS, reachedLevel, type LevelOption } from '../core/levels'
import { BackHeader } from './BackHeader'
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
    <div className="flex flex-1 flex-col overflow-y-auto gap-8 px-6 py-10">
      <div>
        {/* The same control as Settings, in the same corner. This screen is
            reachable from home once a level has been chosen, and a screen you
            can open is a screen you need a way out of — the text link at the
            bottom was somewhere else entirely, below three cards you had to
            scroll past. On first run there is no way out, because there is
            nothing to go back to yet. */}
        <BackHeader title="Starting point" onBack={onCancel} />
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
              // Chosen is a ring, not a fill. A tinted card on a tinted page
              // is two versions of the same colour with the type in a third,
              // and the one you had picked was the hardest of the four to
              // read. The ring is the same way the cat and colour pickers say
              // "this one", and it leaves the words in ordinary ink.
              className={`rounded-3xl bg-surface-1 px-5 py-4 text-left shadow-2 transition-shadow active:shadow-press ${
                active ? 'ring-2 ring-primary' : ''
              }`}
            >
              <p className={`text-xl ${TITLE}`}>{option.name}</p>
              <p className="mt-0.5 text-sm text-on-surface-dim">
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
