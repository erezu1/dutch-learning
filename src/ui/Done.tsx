import { motion } from 'framer-motion'
import type { CoatId } from '../core/cat'
import { rungAt } from '../core/ladder'
import type { SessionStats } from '../session/useSession'
import { Cat } from './Cat'
import { Button } from './Button'
import { glide } from './motion'
import { TITLE } from './type'

interface Props {
  stats: SessionStats
  /** Lifetime points, for working out whether this round crossed a level. */
  score: number
  points: number
  coat: CoatId
  dark: boolean
  onHome: () => void
  onMore: (extra: boolean) => void
}

export function Done({ stats, score, points, coat, dark, onHome, onMore }: Props) {
  // Worked out rather than remembered: the level before this round is the
  // level of the score minus what the round earned, so nothing has to be
  // written down when a round starts and nothing can be lost if it is left.
  const rose = rungAt(score).level > rungAt(score - points).level
  const level = rungAt(score).level
  const pct = stats.reviewed ? Math.round((stats.correct / stats.reviewed) * 100) : 0
  // The end of a session is not the end of the day, and even the end of the
  // day is not the end of the deck. Whichever it is, the way on is the button
  // you land on — going back to the home screen to start again is a detour.
  const more = stats.waiting > 0
  const another = !more && stats.extraWaiting > 0

  return (
    <div className="flex flex-1 flex-col overflow-y-auto items-center justify-center gap-8 py-6 px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={glide}
      >
        {/* Was a 🎉 — the one place in the app where the drawing stopped
            being the app's own. She says the same thing and belongs here. */}
        <Cat
          coat={coat}
          rim={dark}
          size={136}
          scene="waiting"
          // A level is the bigger of the two things that can have just
          // happened, so it gets the beat that has been sitting unused since
          // the rig was written.
          beat={{ scene: rose ? 'levelUp' : 'finished', key: 1 }}
          label="The cat, pleased with you"
        />
        <h1 className={`mt-4 text-4xl ${TITLE}`}>
          {rose ? `Level ${level}!` : more ? 'Nice work!' : "That's today!"}
        </h1>
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
