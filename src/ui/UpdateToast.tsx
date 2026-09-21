import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { tookUpdate } from '../core/update'
import { glide } from './motion'

// ---------------------------------------------------------------------------
// A new build arrives by reloading the page, which on its own is a blink and
// nothing else — the same screen, very slightly different, for no reason the
// app ever gave. This is the reason, said once and then gone.
//
// It asks for nothing and is not dismissible: there is no decision here, the
// update has already happened. Anything with a button on it would be claiming
// otherwise.
// ---------------------------------------------------------------------------

/** Long enough to be read without hurrying, short enough to not be in the way. */
const LINGER = 3400

export function UpdateToast() {
  const [show, setShow] = useState(tookUpdate)

  useEffect(() => {
    if (!show) return
    const id = setTimeout(() => setShow(false), LINGER)
    return () => clearTimeout(id)
  }, [show])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={glide}
          // Announced rather than interrupting: a screen reader reads it when
          // it is finished with whatever it was saying.
          role="status"
          aria-live="polite"
          // Fixed sits against the glass, not inside the padding the body
          // keeps for the notch, so this clears it itself.
          className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]"
        >
          <p className="rounded-full bg-surface-1 px-5 py-2.5 text-sm font-medium shadow-4">
            App updated!
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
