import { useState } from 'react'
import deckCore from './content/deck-core.json'
import type { Deck } from './core/types'
import { useSession } from './session/useSession'
import { Done } from './ui/Done'
import { Home } from './ui/Home'
import { LevelPicker } from './ui/LevelPicker'
import { ReviewScreen } from './ui/ReviewScreen'

const deck = deckCore as Deck

export default function App() {
  const session = useSession(deck)
  const [screen, setScreen] = useState<'home' | 'review' | 'level'>('home')

  if (session.status === 'loading') {
    return <div className="grid h-full place-items-center text-on-surface-dim">…</div>
  }

  // Asked once, before anything else.
  if (!session.levelChosen) {
    return <LevelPicker onPick={session.setLevel} />
  }

  if (screen === 'level') {
    return (
      <LevelPicker
        current={session.level}
        onPick={(option) => {
          session.setLevel(option)
          setScreen('home')
        }}
        onCancel={() => setScreen('home')}
      />
    )
  }

  if (screen === 'review' && session.status === 'reviewing') {
    return <ReviewScreen session={session} onExit={() => setScreen('home')} />
  }

  if (screen === 'review' && session.status === 'done') {
    return <Done stats={session.stats} onHome={() => setScreen('home')} />
  }

  return (
    <Home
      stats={session.stats}
      level={session.level}
      onChangeLevel={() => setScreen('level')}
      onStart={() => {
        session.start()
        setScreen('review')
      }}
    />
  )
}
