import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { pressable, quiet } from './motion'

// ---------------------------------------------------------------------------
// One button, so every action in the app is the same height, the same type
// size and the same shape. Start, Continue, Back and the two grade buttons all
// come from here — buttons that differ slightly from screen to screen are one
// of the clearest tells of a homemade interface.
// ---------------------------------------------------------------------------

type Tone = 'primary' | 'accent' | 'good' | 'bad' | 'neutral'

const tones: Record<Tone, string> = {
  primary: 'bg-primary text-on-primary shadow-3',
  /** The accent, quietly — for an action that shouldn't shout on every card. */
  accent: 'bg-primary-container text-on-primary-container shadow-2',
  good: 'bg-good text-good-ink shadow-2',
  bad: 'bg-bad text-bad-ink shadow-2',
  neutral: 'bg-surface-1 text-on-surface shadow-2',
}

/**
 * The wash that goes over the part NOT done.
 *
 * Painting the done part was tried twice and neither way was right: darker
 * and it reads as a stain across the button, lighter and the part you have
 * finished looks like the part you have not. Paling what is left works
 * because it leaves the done part as the button's own colour — the thing you
 * are working towards is the button simply being itself.
 *
 * Faintly stronger at the far end, so the boundary where you have got to is
 * the crispest edge in it and the distance ahead fades away from you.
 */
function wash(tone: Tone): string {
  const quiet = tone === 'accent' || tone === 'neutral'
  const ink = quiet ? 'var(--color-surface)' : '#fff'
  const at = (pct: number) => `color-mix(in srgb, ${ink} ${pct}%, transparent)`
  return `linear-gradient(to right, ${at(quiet ? 40 : 26)}, ${at(quiet ? 52 : 36)})`
}

interface Props {
  children: ReactNode
  onClick: () => void
  tone?: Tone
  disabled?: boolean
  /**
   * How much of today is behind you, nought to one. The button draws it.
   *
   * The same trick as the Continue bar's countdown, which is the one place in
   * the app that already fills a button — a graded wash whose gradient spans
   * the fill rather than the button, so its edge always sits exactly where the
   * progress has reached. Turned around: this one covers what is LEFT rather
   * than what is done.
   *
   * It sits under the label, so the words are one ink from end to end rather
   * than half on one colour and half on another.
   */
  progress?: number
  className?: string
}

export function Button({
  children, onClick, tone = 'primary', disabled, progress, className = '',
}: Props) {
  return (
    <motion.button
      {...pressable}
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden rounded-full px-8 py-5 text-lg leading-none font-semibold transition-shadow active:shadow-press disabled:opacity-40 disabled:shadow-1 ${tones[tone]} ${className}`}
    >
      {progress != null && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-y-0 right-0"
          style={{ background: wash(tone) }}
          initial={false}
          animate={{ width: `${Math.max(0, Math.min(1, 1 - progress)) * 100}%` }}
          transition={quiet}
        />
      )}
      <span className="relative">{children}</span>
    </motion.button>
  )
}
