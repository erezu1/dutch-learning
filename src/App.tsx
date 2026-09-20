import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import deckCore from './content/deck-core.json'
import type { Deck } from './core/types'
import { setReviewing } from './core/update'
import { useSession } from './session/useSession'
import { Done } from './ui/Done'
import { Home } from './ui/Home'
import { InstallPrompt } from './ui/InstallPrompt'
import { LevelPicker } from './ui/LevelPicker'
import { glide, screenVariants } from './ui/motion'
import { ReviewScreen } from './ui/ReviewScreen'
import { Settings } from './ui/Settings'
import { Welcome } from './ui/Welcome'

const deck = deckCore as Deck

/**
 * Every screen enters and leaves the same way, so no change is abrupt.
 *
 * The key belongs on this component where it is used, not on the motion.div
 * inside it: AnimatePresence tracks the identity of its own direct children,
 * so a key hidden one level down is invisible to it and no exit ever runs.
 */
function Screen({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
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

type ScreenName = 'home' | 'review' | 'level' | 'settings'

/**
 * Screen changes go through the browser history, so the phone's back gesture
 * steps back through the app instead of closing it.
 *
 * Leaving a screen from inside the app calls history.back() rather than
 * setting the screen directly — otherwise every visit would leave an entry
 * behind and you would have to press back several times to get out.
 */
function useScreenHistory(): [ScreenName, (next: ScreenName) => void] {
  const [screen, setScreen] = useState<ScreenName>('home')
  const pushed = useRef(false)

  useEffect(() => {
    const onPop = () => {
      pushed.current = false
      setScreen('home')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const go = useCallback((next: ScreenName) => {
    if (next === 'home') {
      if (pushed.current) {
        // popstate sets the screen, so the two routes stay identical.
        window.history.back()
      } else {
        setScreen('home')
      }
      return
    }
    window.history.pushState({ screen: next }, '')
    pushed.current = true
    setScreen(next)
  }, [])

  return [screen, go]
}

export default function App() {
  const session = useSession(deck)
  const [screen, setScreen] = useScreenHistory()
  // Only ever seen before a level is chosen, which is stored, so it shows once.
  const [greeted, setGreeted] = useState(false)

  // A new build waits for the end of a session before it takes the screen.
  useEffect(() => {
    setReviewing(session.status === 'reviewing')
  }, [session.status])

  if (session.status === 'loading') {
    return <div className="grid h-full place-items-center text-on-surface-dim">…</div>
  }

  const firstRun = !session.levelChosen
  const showWelcome = firstRun && !greeted
  // Asked once, after the welcome.
  const showLevel = (firstRun && greeted) || screen === 'level'
  const reviewing = !showLevel && screen === 'review' && session.status === 'reviewing'
  const finished = !showLevel && screen === 'review' && session.status === 'done'

  return (
    <>
      <InstallPrompt />
      <AnimatePresence mode="wait" initial={false}>
        {showWelcome ? (
          <Screen key="welcome">
            <Welcome onBegin={() => setGreeted(true)} />
          </Screen>
        ) : showLevel ? (
          <Screen key="level">
            <LevelPicker
              current={session.levelChosen ? session.level : undefined}
              known={session.stats.known}
              onPick={(option) => {
                session.setLevel(option)
                setScreen('home')
              }}
              onCancel={session.levelChosen ? () => setScreen('home') : undefined}
            />
          </Screen>
        ) : reviewing ? (
          <Screen key="review">
            <ReviewScreen session={session} onExit={() => setScreen('home')} />
          </Screen>
        ) : screen === 'settings' ? (
          <Screen key="settings">
            <Settings
              weekStartsOn={session.weekStartsOn}
              onWeekStartsOn={session.setWeekStartsOn}
              autoContinue={session.autoContinue}
              onAutoContinue={session.setAutoContinue}
              mode={session.mode}
              onMode={session.setMode}
              onBack={() => setScreen('home')}
            />
          </Screen>
        ) : finished ? (
          <Screen key="done">
            <Done
              stats={session.stats}
              points={session.sessionPoints}
              onHome={() => setScreen('home')}
              onMore={(extra) => {
                session.start(extra)
                setScreen('review')
              }}
            />
          </Screen>
        ) : (
          <Screen key="home">
            <Home
              stats={session.stats}
              score={session.score}
              level={session.level}
              week={session.week}
              theme={session.theme}
              resolvedMode={session.resolvedMode}
              onChangeTheme={session.setTheme}
              onChangeLevel={() => setScreen('level')}
              onOpenSettings={() => setScreen('settings')}
              onStart={(extra) => {
                session.start(extra)
                setScreen('review')
              }}
            />
          </Screen>
        )}
      </AnimatePresence>
    </>
  )
}
