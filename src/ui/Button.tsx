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
 * The fill's own gradient, and its direction of travel is the whole point.
 *
 * On the quiet tones the ground is pale, so the wash is the accent and the
 * filled part goes DEEPER. On the saturated ones the ground is already the
 * accent, so the wash is ink and the filled part goes deeper still. Either
 * way "done" is the heavier end — a white wash on a strong ground makes the
 * part you have finished look like the part you have not.
 */
function wash(tone: Tone): string {
  const quiet = tone === 'accent' || tone === 'neutral'
  const ink = quiet ? 'var(--color-primary)' : '#000'
  const at = (pct: number) => `color-mix(in srgb, ${ink} ${pct}%, transparent)`
  return quiet
    ? `linear-gradient(to right, ${at(6)}, ${at(22)})`
    : `linear-gradient(to right, ${at(7)}, ${at(20)})`
}

interface Props {
  children: ReactNode
  onClick: () => void
  tone?: Tone
  disabled?: boolean
  /**
   * How much of today is behind you, nought to one. The button draws it.
   *
   * Same idea as the Continue bar's countdown, which is the one place in the
   * app that already fills a button: the wash grows from the left and is
   * graded from faint to strong across itself, so — because the gradient spans
   * the fill rather than the button — its strongest point always sits exactly
   * where the progress has reached. A crisp leading edge and nothing behind it
   * competing with the words.
   *
   * White here rather than the accent, because this button's ground already IS
   * the accent. And it sits under the label, so the words are one ink from end
   * to end rather than half on one colour and half on another.
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
          className="absolute inset-y-0 left-0"
          style={{ background: wash(tone) }}
          initial={false}
          animate={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
          transition={quiet}
        />
      )}
      <span className="relative">{children}</span>
    </motion.button>
  )
}
