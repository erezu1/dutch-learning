import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import type { CoatId } from '../core/cat'
import { nextTrick, type Trick } from '../core/cat-tricks'
import { rungAt, type Rung } from '../core/ladder'
import type { SessionStats } from '../session/useSession'
import { Cat } from './Cat'
import { Button } from './Button'
import { LevelRing } from './LevelRing'
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
  /** The trick a new level gets. One at random when not given — given to preview one in particular. */
  trick?: Trick
}

export function Done({ stats, score, points, coat, dark, onHome, onMore, trick }: Props) {
  // Worked out rather than remembered: the level before this round is the
  // level of the score minus what the round earned, so nothing has to be
  // written down when a round starts and nothing can be lost if it is left.
  const rose = rungAt(score).level > rungAt(score - points).level
  const pct = stats.reviewed ? Math.round((stats.correct / stats.reviewed) * 100) : 0
  // The end of a session is not the end of the day, and even the end of the
  // day is not the end of the deck. Whichever it is, the way on is the button
  // you land on — going back to the home screen to start again is a detour.
  const more = stats.waiting > 0
  const another = !more && stats.extraWaiting > 0

  if (rose) {
    return (
      <LevelUp
        from={rungAt(score - points)}
        to={rungAt(score)}
        points={points}
        pct={pct}
        coat={coat}
        dark={dark}
        more={more}
        another={another}
        onHome={onHome}
        onMore={onMore}
        trick={trick}
      />
    )
  }

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
          beat={{ scene: 'finished', key: 1 }}
          label="The cat, pleased with you"
        />
        <h1 className={`mt-4 text-4xl ${TITLE}`}>
          {more ? 'Nice work!' : "That's today!"}
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

      <WayOn more={more} another={another} onHome={onHome} onMore={onMore} />
    </div>
  )
}

/** The buttons at the bottom of either screen: the way on, and the way home. */
function WayOn({
  more,
  another,
  onHome,
  onMore,
}: Pick<Props, 'onHome' | 'onMore'> & { more: boolean; another: boolean }) {
  return (
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
  )
}

/** How long after the ring bursts the cat's trick begins: her first delight has had its moment, and the confetti is still coming down. */
const TRICK_AFTER = 1900

/**
 * A round that crossed a level. The ring you watch fill on the home screen
 * closes here, bursts into confetti in the cat's colours, and rolls over to
 * the new level — and only then does the screen say so, because the ring
 * closing is the news and the headline is its caption. Then the cat does
 * something she does for nothing else: one of her tricks, a different one
 * from the last level's.
 */
function LevelUp({
  from,
  to,
  points,
  pct,
  coat,
  dark,
  more,
  another,
  onHome,
  onMore,
  trick,
}: {
  from: Rung
  to: Rung
  points: number
  pct: number
  coat: CoatId
  dark: boolean
  more: boolean
  another: boolean
  onHome: () => void
  onMore: (extra: boolean) => void
  trick?: Trick
}) {
  const [burst, setBurst] = useState(false)
  // One object for the one beat. A fresh one on every render reads as a new
  // beat to the cat, and the render that starts the trick would have her
  // leap up and celebrate the ring all over again in the middle of it.
  const beat = useMemo(() => (burst ? { scene: 'levelUp' as const, key: 1 } : null), [burst])
  // Chosen on arrival, once.
  const [chosen] = useState(() => trick ?? nextTrick())
  const [playing, setPlaying] = useState<{ name: Trick; key: number } | null>(null)
  useEffect(() => {
    if (!burst) return
    const t = setTimeout(() => setPlaying({ name: chosen, key: 1 }), TRICK_AFTER)
    return () => clearTimeout(t)
  }, [burst, chosen])
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-7 overflow-y-auto px-6 py-6 text-center">
      <div className="flex flex-col items-center">
        <Cat
          coat={coat}
          rim={dark}
          size={104}
          scene="waiting"
          // Her beat waits for the ring: she reacts to it closing, with you.
          beat={beat}
          trick={playing}
          label="The cat, pleased with you"
        />
        <LevelRing from={from} to={to} coat={coat} total={from.into + points} onBurst={() => setBurst(true)} />
      </div>

      <motion.div
        initial={false}
        animate={burst ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 10 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16 }}
      >
        <h1 className={`text-4xl ${TITLE}`}>Level {to.level}!</h1>
        <p className="mt-2 text-on-surface-dim">
          <span className={`text-primary ${TITLE} text-2xl`}>+{points}</span> · {pct}% correct
        </p>
      </motion.div>

      <WayOn more={more} another={another} onHome={onHome} onMore={onMore} />
    </div>
  )
}
