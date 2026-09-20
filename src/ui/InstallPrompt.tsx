import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Button } from './Button'
import { glide, pressable } from './motion'
import { Paw } from './Paw'

// ---------------------------------------------------------------------------
// Offers to add the app to the home screen. Installing is what makes it open
// fullscreen, work offline reliably, and keep its stored progress from being
// evicted — so it is worth asking once. Once.
// ---------------------------------------------------------------------------

const DISMISSED = 'install-dismissed'

interface InstallEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Already running as an installed app? Then there is nothing to offer. */
function isInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS reports it here instead.
    (navigator as { standalone?: boolean }).standalone === true
  )
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED) === '1'
  } catch {
    // Private browsing and blocked storage both throw. Asking again is the
    // kinder failure than never asking.
    return false
  }
}

function remember(): void {
  try {
    localStorage.setItem(DISMISSED, '1')
  } catch {
    /* nothing we can do; it will ask again next time */
  }
}

export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null)

  useEffect(() => {
    if (isInstalled() || wasDismissed()) return

    const onPrompt = (e: Event) => {
      // Chrome shows its own bar unless we take the event.
      e.preventDefault()
      setEvent(e as InstallEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    // If it gets installed while open, stop offering.
    const onInstalled = () => setEvent(null)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = () => {
    remember()
    setEvent(null)
  }

  const install = async () => {
    const e = event
    setEvent(null)
    if (!e) return
    await e.prompt()
    const { outcome } = await e.userChoice
    // Declining the system dialog counts as declining. Don't nag.
    if (outcome === 'dismissed') remember()
  }

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={glide}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4"
        >
          <div className="pointer-events-auto w-full max-w-sm rounded-3xl bg-surface-1 p-5 shadow-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary">
                <Paw className="h-7 w-7 text-on-primary" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold">Add Doei to your phone</p>
                <p className="text-sm text-on-surface-dim">
                  Opens fullscreen and works without a signal.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <motion.button
                {...pressable}
                onClick={dismiss}
                className="rounded-full px-5 py-3 text-base font-medium text-on-surface-dim"
              >
                Not now
              </motion.button>
              <Button onClick={install} className="flex-1">
                Add
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
