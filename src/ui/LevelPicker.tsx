import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { LEVELS, type LevelOption } from '../core/levels'
import { glide, pressable, SELECT_DELAY } from './motion'

// ---------------------------------------------------------------------------
// Asked once on first run, changeable any time. It sets where new words start
// in the frequency list — nothing is locked away, so picking wrong is cheap.
// ---------------------------------------------------------------------------

interface Props {
  current?: LevelOption
  onPick: (option: LevelOption) => void
  onCancel?: () => void
}

export function LevelPicker({ current, onPick, onCancel }: Props) {
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
    <div className="flex h-full flex-col justify-center gap-8 px-6 py-10">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Where are you now?</h1>
        <p className="mt-2 text-on-surface-dim">
          This decides which words you&rsquo;re given first. You can change it whenever you like.
        </p>
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
                active
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-1'
              }`}
            >
              <p className="text-xl font-bold tracking-tight">{option.name}</p>
              <p className={`mt-0.5 text-sm ${active ? 'opacity-70' : 'text-on-surface-dim'}`}>
                {option.description}
              </p>
            </motion.button>
          )
        })}
      </div>

      {onCancel && (
        <button onClick={onCancel} className="text-sm text-on-surface-dim active:scale-95">
          Cancel
        </button>
      )}

      {/* The word data is openly licensed and asks to be credited. Kept here
          rather than on the home screen, which you see every day. */}
      <p className="text-center text-[0.65rem] leading-relaxed text-on-surface-dim/50">
        Word data from Wiktionary (CC BY-SA) and Tatoeba (CC BY), ordered by OpenSubtitles
        frequency.
      </p>
    </div>
  )
}
