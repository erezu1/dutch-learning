import { motion } from 'framer-motion'
import { glide } from './motion'
import { Switch } from './Switch'

interface Props {
  autoContinue: boolean
  onAutoContinue: (next: boolean) => void
  onBack: () => void
}

export function Settings({ autoContinue, onAutoContinue, onBack }: Props) {
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
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
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
      </div>
    </div>
  )
}
