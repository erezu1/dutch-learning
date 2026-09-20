import { useState } from 'react'
import deckA1 from './content/deck-a1.json'
import type { Deck } from './core/types'
import { useSession } from './session/useSession'
import { Done } from './ui/Done'
import { Home } from './ui/Home'
import { ReviewScreen } from './ui/ReviewScreen'

const deck = deckA1 as Deck

export default function App() {
  const session = useSession(deck)
  const [screen, setScreen] = useState<'home' | 'review'>('home')

  if (session.status === 'loading') {
    return <div className="grid h-full place-items-center text-on-surface-dim">…</div>
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
      onStart={() => {
        session.start()
        setScreen('review')
      }}
    />
  )
}
