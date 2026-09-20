import { motion } from 'framer-motion'
import { supported } from '../core/speech'

// ---------------------------------------------------------------------------
// The speaker, with its own waves as the animation.
//
// The two arcs are concentric about the cone's mouth, and the outer one is
// exactly 1.94x the inner — so growing the inner by that factor lands it
// precisely where the outer was. On each utterance the outer wave travels on
// and fades, the inner takes its place, and a new one appears at the mouth.
// The icon ends the animation identical to how it started, which is what makes
// it loop cleanly rather than snap back.
//
// No press animation and no ripple: the waves are the feedback.
// ---------------------------------------------------------------------------

const CONE = 'M4 9v6h4l5 4V5L8 9H4Z'
const WAVE_INNER = 'M15.27 9.47A3.4 3.4 0 0 1 15.27 14.53'
const WAVE_OUTER = 'M17.42 7.1A6.6 6.6 0 0 1 17.42 16.9'

/** How much bigger the outer wave is than the inner one. */
const STEP = 1.94
const DURATION = 0.62

/** Everything scales about the cone's mouth, so the waves leave from it. */
const origin = { transformBox: 'view-box', transformOrigin: '13px 12px' } as const

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

  const wave = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
  }

  return (
    <button
      type="button"
      aria-label={`Speak: ${text}`}
      onClick={(e) => {
        e.stopPropagation()
        onActivate()
      }}
      className={`shrink-0 text-on-surface-dim/60 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={small ? 'h-[18px] w-[18px]' : 'h-6 w-6'}
        fill="currentColor"
        aria-hidden="true"
      >
        <path d={CONE} />

        {pulse === 0 ? (
          <>
            <path d={WAVE_INNER} {...wave} />
            <path d={WAVE_OUTER} {...wave} />
          </>
        ) : (
          <g key={pulse}>
            {/* The outer wave carries on outwards and fades. */}
            <motion.path
              d={WAVE_OUTER}
              {...wave}
              style={origin}
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: STEP, opacity: 0 }}
              transition={{ duration: DURATION, ease: 'easeOut' }}
            />
            {/* The inner one grows into exactly where the outer was. */}
            <motion.path
              d={WAVE_INNER}
              {...wave}
              style={origin}
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: STEP, opacity: 1 }}
              transition={{ duration: DURATION, ease: 'easeOut' }}
            />
            {/* And a new one forms at the mouth to replace it. */}
            <motion.path
              d={WAVE_INNER}
              {...wave}
              style={origin}
              initial={{ scale: 0.45, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: DURATION, ease: 'easeOut' }}
            />
          </g>
        )}
      </svg>
    </button>
  )
}
