import { motion } from 'framer-motion'
import { Button } from './Button'
import { glide } from './motion'
import { Paw } from './Paw'
import { WORDMARK } from './type'

// ---------------------------------------------------------------------------
// The first thing anyone sees. Opening on a question — "where are you now?" —
// asks for something before giving anything, so the mark and a sentence about
// what this is come first.
// ---------------------------------------------------------------------------

export function Welcome({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-10 px-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ ...glide, delay: 0.05 }}
        className="grid h-28 w-28 place-items-center rounded-[2rem] bg-primary shadow-3"
      >
        <Paw className="h-20 w-20 text-on-primary" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...glide, delay: 0.18 }}
      >
        <h1 className={`text-6xl leading-none ${WORDMARK}`}>Doei</h1>
        <p className="mt-3 text-lg text-balance text-on-surface-dim">
          Dutch, a few minutes a day.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...glide, delay: 0.3 }}
        className="w-full max-w-xs"
      >
        <Button onClick={onBegin} className="w-full">
          Begin
        </Button>
      </motion.div>
    </div>
  )
}
