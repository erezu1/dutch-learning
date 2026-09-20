import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import deckCore from './content/deck-core.json'
import type { Deck } from './core/types'
import { useSession } from './session/useSession'
import { Done } from './ui/Done'
import { Home } from './ui/Home'
import { LevelPicker } from './ui/LevelPicker'
import { glide, screenVariants } from './ui/motion'
import { ReviewScreen } from './ui/ReviewScreen'

const deck = deckCore as Deck

/** Every screen enters and leaves the same way, so no change is abrupt. */
function Screen({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <motion.div
      key={name}
      variants={screenVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={glide}
      className="h-full"
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const session = useSession(deck)
  const [screen, setScreen] = useState<'home' | 'review' | 'level'>('home')

  if (session.status === 'loading') {
    return <div className="grid h-full place-items-center text-on-surface-dim">…</div>
  }

  // Asked once, before anything else.
  const showLevel = !session.levelChosen || screen === 'level'
  const reviewing = !showLevel && screen === 'review' && session.status === 'reviewing'
  const finished = !showLevel && screen === 'review' && session.status === 'done'

  return (
    <AnimatePresence mode="wait" initial={false}>
      {showLevel ? (
        <Screen name="level">
          <LevelPicker
            current={session.levelChosen ? session.level : undefined}
            onPick={(option) => {
              session.setLevel(option)
              setScreen('home')
            }}
            onCancel={session.levelChosen ? () => setScreen('home') : undefined}
          />
        </Screen>
      ) : reviewing ? (
        <Screen name="review">
          <ReviewScreen session={session} onExit={() => setScreen('home')} />
        </Screen>
      ) : finished ? (
        <Screen name="done">
          <Done stats={session.stats} onHome={() => setScreen('home')} />
        </Screen>
      ) : (
        <Screen name="home">
          <Home
            stats={session.stats}
            level={session.level}
            theme={session.theme}
            onChangeTheme={session.setTheme}
            onChangeLevel={() => setScreen('level')}
            onStart={() => {
              session.start()
              setScreen('review')
            }}
          />
        </Screen>
      )}
    </AnimatePresence>
  )
}
