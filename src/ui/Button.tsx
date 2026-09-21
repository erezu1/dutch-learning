import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { pressable } from './motion'

// ---------------------------------------------------------------------------
// One button, so every action in the app is the same height, the same type
// size and the same shape. Start, Continue, Back and the two grade buttons all
// come from here — buttons that differ slightly from screen to screen are one
// of the clearest tells of a homemade interface.
// ---------------------------------------------------------------------------

type Tone = 'primary' | 'accent' | 'good' | 'bad' | 'neutral'

/**
 * Two heights, not a free-for-all. The large one is for a screen whose whole
 * job is that button; the small one is for a screen where the button shares
 * the space with something else worth looking at.
 */
type Size = 'md' | 'sm'

const sizes: Record<Size, string> = {
  md: 'px-8 py-5 text-lg',
  sm: 'px-8 py-3.5 text-base',
}

const tones: Record<Tone, string> = {
  primary: 'bg-primary text-on-primary shadow-3',
  /** The accent, quietly — for an action that shouldn't shout on every card. */
  accent: 'bg-primary-container text-on-primary-container shadow-2',
  good: 'bg-good text-good-ink shadow-2',
  bad: 'bg-bad text-bad-ink shadow-2',
  neutral: 'bg-surface-1 text-on-surface shadow-2',
}

interface Props {
  children: ReactNode
  onClick: () => void
  tone?: Tone
  size?: Size
  disabled?: boolean
  className?: string
}

export function Button({
  children,
  onClick,
  tone = 'primary',
  size = 'md',
  disabled,
  className = '',
}: Props) {
  return (
    <motion.button
      {...pressable}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full leading-none font-semibold transition-shadow active:shadow-press disabled:opacity-40 disabled:shadow-1 ${sizes[size]} ${tones[tone]} ${className}`}
    >
      {children}
    </motion.button>
  )
}
