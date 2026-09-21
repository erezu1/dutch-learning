import { motion } from 'framer-motion'
import { glide } from './motion'
import { TITLE } from './type'

// ---------------------------------------------------------------------------
// The top of a screen you opened and can close again: an arrow, then the name
// of the place you are in, on one line.
//
// One component rather than one per screen. They were written twice and drifted
// immediately — a different arrow, a different type size, one of them centred
// down the page while the other sat at the top — and a back button that is in
// a different place on each screen is a back button you have to look for.
// ---------------------------------------------------------------------------

export function BackHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div className="flex items-center gap-3">
      {onBack && (
        <motion.button
          whileTap={{ scale: 0.85 }}
          transition={glide}
          onClick={onBack}
          aria-label="Back"
          className="-ml-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-on-surface-dim"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-[22px] w-[22px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 5.5 8 12l7 6.5" />
          </svg>
        </motion.button>
      )}
      <h1 className={`text-3xl ${TITLE}`}>{title}</h1>
    </div>
  )
}
