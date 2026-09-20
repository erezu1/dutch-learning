import { motion } from 'framer-motion'
import type { SessionStats } from '../session/useSession'
import { Button } from './Button'
import { glide } from './motion'
import { TITLE } from './type'

interface Props {
  stats: SessionStats
  points: number
  onHome: () => void
}

export function Done({ stats, points, onHome }: Props) {
  const pct = stats.reviewed ? Math.round((stats.correct / stats.reviewed) * 100) : 0

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={glide}
      >
        <p className="text-6xl">🎉</p>
        <h1 className={`mt-4 text-4xl ${TITLE}`}>Done for today</h1>
        <motion.p
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 0.15 }}
          className={`mt-3 text-5xl text-primary ${TITLE}`}
        >
          +{points}
        </motion.p>
        <p className="mt-1 text-on-surface-dim">{pct}% correct</p>
      </motion.div>

      <Button onClick={onHome} className="px-12">
        Back
      </Button>
    </div>
  )
}
