import { motion } from 'framer-motion'
import type { SessionStats } from '../session/useSession'
import { Button } from './Button'
import { glide } from './motion'
import { TITLE } from './type'

interface Props {
  stats: SessionStats
  points: number
  onHome: () => void
  onMore: (extra: boolean) => void
}

export function Done({ stats, points, onHome, onMore }: Props) {
  const pct = stats.reviewed ? Math.round((stats.correct / stats.reviewed) * 100) : 0
  // The end of a session is not the end of the day, and even the end of the
  // day is not the end of the deck. Whichever it is, the way on is the button
  // you land on — going back to the home screen to start again is a detour.
  const more = stats.waiting > 0
  const another = !more && stats.extraWaiting > 0

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={glide}
      >
        <p className="text-6xl">🎉</p>
        <h1 className={`mt-4 text-4xl ${TITLE}`}>{more ? 'Nice work' : "That's today"}</h1>
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

      <div className="flex w-full max-w-xs flex-col items-center gap-3">
        {(more || another) && (
          <Button onClick={() => onMore(another)} className="w-full">
            {more ? 'Keep going' : 'Another round?'}
          </Button>
        )}
        <Button tone={more || another ? 'neutral' : 'primary'} onClick={onHome} className="px-12">
          {more || another ? 'Not now' : 'Back'}
        </Button>
      </div>
    </div>
  )
}
