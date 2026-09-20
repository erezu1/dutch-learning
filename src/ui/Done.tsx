import { motion } from 'framer-motion'
import type { SessionStats } from '../session/useSession'
import { Button } from './Button'
import { glide } from './motion'

interface Props {
  stats: SessionStats
  onHome: () => void
}

export function Done({ stats, onHome }: Props) {
  const pct = stats.reviewed ? Math.round((stats.correct / stats.reviewed) * 100) : 0

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={glide}
      >
        <p className="text-6xl">🎉</p>
        <h1 className="mt-4 font-display text-4xl font-semibold">Done for today</h1>
        <p className="mt-2 text-on-surface-dim">
          {stats.reviewed} cards · {pct}% correct
        </p>
      </motion.div>

      <Button onClick={onHome} className="px-12">
        Back
      </Button>
    </div>
  )
}
