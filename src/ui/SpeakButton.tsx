import { motion } from 'framer-motion'
import { speak, supported } from '../core/speech'
import { pressable } from './motion'

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
      {...pressable}
      type="button"
      aria-label={`Speak: ${text}`}
      onClick={(e) => {
        e.stopPropagation()
        speak(text)
      }}
      className={`grid shrink-0 place-items-center rounded-full bg-surface-1 text-on-surface-dim shadow-1 ${
        small ? 'h-8 w-8' : 'h-11 w-11'
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={small ? 'h-4 w-4' : 'h-5 w-5'}
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4 4 0 0 0-2.5-3.7v7.4a4 4 0 0 0 2.5-3.7Zm-2.5-8v2.1a6 6 0 0 1 0 11.8V20a8 8 0 0 0 0-16Z" />
      </svg>
    </motion.button>
  )
}
