import { motion } from 'framer-motion'
import { speak, supported } from '../core/speech'
import { tap } from './motion'

/**
 * A bare icon, no chip around it. It sits beside text that is itself tappable,
 * so it only needs to say "this can be heard" — giving it a filled circle and
 * a shadow made it compete with the word it belongs to.
 */
export function SpeakButton({
  text,
  className = '',
  small = false,
}: {
  text: string
  className?: string
  small?: boolean
}) {
  if (!supported()) return null
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      transition={tap}
      aria-label={`Speak: ${text}`}
      onClick={(e) => {
        e.stopPropagation()
        speak(text)
      }}
      className={`shrink-0 text-on-surface-dim/60 transition-colors active:text-primary ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={small ? 'h-[18px] w-[18px]' : 'h-6 w-6'}
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4 4 0 0 0-2.5-3.7v7.4a4 4 0 0 0 2.5-3.7Zm-2.5-8v2.1a6 6 0 0 1 0 11.8V20a8 8 0 0 0 0-16Z" />
      </svg>
    </motion.button>
  )
}
