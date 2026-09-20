import { motion } from 'framer-motion'
import { supported } from '../core/speech'
import { tap } from './motion'

/**
 * A bare icon, no chip around it. It sits beside text that is itself tappable,
 * so it only needs to say "this can be heard" — giving it a filled circle and
 * a shadow made it compete with the word it belongs to.
 *
 * `pulse` is a counter owned by the parent: it goes up whenever the phrase is
 * spoken, however it was triggered, and remounting on it replays the ripple.
 * So tapping the word animates the icon just as tapping the icon does.
 */
export function SpeakButton({
  text,
  pulse,
  onActivate,
  className = '',
  small = false,
}: {
  text: string
  pulse: number
  onActivate: () => void
  className?: string
  small?: boolean
}) {
  if (!supported()) return null
  const size = small ? 'h-[18px] w-[18px]' : 'h-6 w-6'

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      transition={tap}
      aria-label={`Speak: ${text}`}
      onClick={(e) => {
        e.stopPropagation()
        onActivate()
      }}
      // Positioning is the caller's business. Giving this a `relative` of its
      // own collided with the `absolute` passed in — two position utilities on
      // one element, and the stylesheet's order decides, not the string's — so
      // the button fell back into the flow and sat below its word.
      className={`shrink-0 ${className}`}
    >
      <span className="relative grid place-items-center">
        {/* A ring leaving the icon, like sound going out. */}
        {pulse > 0 && (
          <motion.span
            key={`ring-${pulse}`}
            initial={{ scale: 0.5, opacity: 0.5 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className={`absolute rounded-full border border-primary ${size}`}
          />
        )}

        <motion.span
          key={pulse}
          initial={pulse > 0 ? { scale: 1, color: 'var(--color-primary)' } : false}
          animate={{ scale: [1, 1.28, 1], color: 'var(--color-on-surface-dim)' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="block text-on-surface-dim/60"
        >
          <svg viewBox="0 0 24 24" className={size} fill="currentColor" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4 4 0 0 0-2.5-3.7v7.4a4 4 0 0 0 2.5-3.7Zm-2.5-8v2.1a6 6 0 0 1 0 11.8V20a8 8 0 0 0 0-16Z" />
          </svg>
        </motion.span>
      </span>
    </motion.button>
  )
}
