import { motion } from 'framer-motion'
import { MODES, type Mode } from '../core/themes'
import { glide, pressable, tap } from './motion'
import { Switch } from './Switch'
import { TITLE } from './type'

interface Props {
  autoContinue: boolean
  onAutoContinue: (next: boolean) => void
  mode: Mode
  onMode: (next: Mode) => void
  onBack: () => void
}

/**
 * Three choices where a switch would only offer two. The selected one is
 * marked by a pill that slides between them rather than by three buttons that
 * each change colour, so it stays obvious which is on at a glance.
 */
function ModePicker({ mode, onMode }: { mode: Mode; onMode: (next: Mode) => void }) {
  return (
    <div className="mt-4 flex rounded-full bg-surface-2 p-1">
      {MODES.map((option) => {
        const active = option.id === mode
        return (
          <motion.button
            key={option.id}
            {...pressable}
            onClick={() => onMode(option.id)}
            aria-pressed={active}
            className="relative flex-1 rounded-full px-3 py-2 text-sm font-medium"
          >
            {active && (
              <motion.span
                layoutId="mode-pill"
                transition={tap}
                className="absolute inset-0 rounded-full bg-surface-1 shadow-1"
              />
            )}
            <span className={`relative ${active ? '' : 'text-on-surface-dim'}`}>{option.name}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

export function Settings({ autoContinue, onAutoContinue, mode, onMode, onBack }: Props) {
  return (
    <div className="flex h-full flex-col px-6 py-10">
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.85 }}
          transition={glide}
          onClick={onBack}
          aria-label="Back"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-on-surface-dim"
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
        <h1 className={`text-3xl ${TITLE}`}>Settings</h1>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={glide}
          className="flex items-center justify-between gap-5 rounded-3xl bg-surface-1 px-5 py-4 shadow-2"
        >
          <div>
            <p className="font-semibold">Continue automatically</p>
            <p className="mt-0.5 text-sm text-on-surface-dim">
              After a multiple-choice answer, move on by itself instead of waiting for a tap.
            </p>
          </div>
          <Switch
            checked={autoContinue}
            onChange={onAutoContinue}
            label="Continue automatically"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...glide, delay: 0.05 }}
          className="rounded-3xl bg-surface-1 px-5 py-4 shadow-2"
        >
          <p className="font-semibold">Appearance</p>
          <p className="mt-0.5 text-sm text-on-surface-dim">
            Every colour comes in both. System follows your phone.
          </p>
          <ModePicker mode={mode} onMode={onMode} />
        </motion.div>
      </div>
    </div>
  )
}
