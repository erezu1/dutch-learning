import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { pressable } from './motion'

// ---------------------------------------------------------------------------
// One button, so every action in the app is the same height, the same type
// size and the same shape. Start, Continue, Back and the two grade buttons all
// come from here — buttons that differ slightly from screen to screen are one
// of the clearest tells of a homemade interface.
// ---------------------------------------------------------------------------

type Tone = 'primary' | 'good' | 'bad' | 'neutral'

const tones: Record<Tone, string> = {
  primary: 'bg-primary text-on-primary shadow-3',
  good: 'bg-good text-good-ink shadow-2',
  bad: 'bg-bad text-bad-ink shadow-2',
  neutral: 'bg-surface-1 text-on-surface shadow-2',
}

interface Props {
  children: ReactNode
  onClick: () => void
  tone?: Tone
  disabled?: boolean
  className?: string
}

export function Button({ children, onClick, tone = 'primary', disabled, className = '' }: Props) {
  return (
    <motion.button
      {...pressable}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-8 py-5 text-lg leading-none font-semibold transition-shadow active:shadow-press disabled:opacity-40 disabled:shadow-1 ${tones[tone]} ${className}`}
    >
      {children}
    </motion.button>
  )
}
