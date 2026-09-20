import { motion } from 'framer-motion'
import { LEVELS, type LevelOption } from '../core/levels'
import { glide, pressable } from './motion'

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
  return (
    <div className="flex h-full flex-col justify-center gap-8 px-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Where are you now?</h1>
        <p className="mt-2 text-on-surface-dim">
          This decides which words you&rsquo;re given first. You can change it whenever you like.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {LEVELS.map((option) => {
          const active = current?.id === option.id
          return (
            <motion.button
              key={option.id}
              {...pressable}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...glide, delay: 0.05 * LEVELS.indexOf(option) }}
              onClick={() => onPick(option)}
              className={`rounded-3xl px-5 py-4 text-left shadow-2 transition-shadow active:shadow-press ${
                active
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-1'
              }`}
            >
              <p className="font-semibold">{option.name}</p>
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
