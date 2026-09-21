import { motion } from 'framer-motion'
import type { CoatId } from '../core/cat'
import { Button } from './Button'
import { Cat } from './Cat'
import { glide } from './motion'
import { WORDMARK } from './type'

// ---------------------------------------------------------------------------
// The first thing anyone sees. Opening on a question — "where are you now?" —
// asks for something before giving anything, so the mark and a sentence about
// what this is come first.
// ---------------------------------------------------------------------------

export function Welcome({ coat, dark, onBegin }: { coat: CoatId; dark: boolean; onBegin: () => void }) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto items-center justify-center gap-10 py-6 px-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ ...glide, delay: 0.05 }}
      >
        {/* She is the first thing anyone sees, and she is pleased to see them.
            The old mark in a rounded square said what the app was called; she
            says what it is like. */}
        <Cat
          coat={coat}
          rim={dark}
          size={165}
          scene="waiting"
          beat={{ scene: 'greeting', key: 1 }}
          label="The cat, saying hello"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...glide, delay: 0.18 }}
      >
        <h1 className={`text-6xl leading-none ${WORDMARK}`}>Doei!</h1>
        <p className="mt-3 text-lg text-balance text-on-surface-dim">Dutch, a few minutes a day.</p>
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
