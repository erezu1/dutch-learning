import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { cardDismissed, promptInstall, rememberDismissed } from '../core/install'
import { Button } from './Button'
import { glide, pressable } from './motion'
import { Paw } from './Paw'
import { useCanInstall } from './useCanInstall'

// ---------------------------------------------------------------------------
// The one-time offer. Installing is what makes the app open fullscreen, work
// offline reliably, and keep its stored progress from being evicted — so it is
// worth asking once. Once: dismissing it is remembered, and the small button
// on the home screen remains for anyone who changes their mind.
// ---------------------------------------------------------------------------

export function InstallPrompt() {
  const available = useCanInstall()
  const [hidden, setHidden] = useState(() => cardDismissed())
  const show = available && !hidden

  const dismiss = () => {
    rememberDismissed()
    setHidden(true)
  }

  return (
    <AnimatePresence>
      {show && (
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
              <Button onClick={() => void promptInstall()} className="flex-1">
                Add
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
