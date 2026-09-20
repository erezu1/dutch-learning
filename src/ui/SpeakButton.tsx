import { supported } from '../core/speech'

// ---------------------------------------------------------------------------
// The speaker, with its own waves as the animation.
//
// While the voice is talking the two arcs propagate: each travels outwards,
// the one at the inner position moving to where the outer is drawn while a new
// one takes its place. Three waves a third of a cycle apart mean the resting
// icon is always present inside the motion, so the mark keeps its shape rather
// than dissolving into pulses.
//
// The strokes keep their width while they grow: scaling a path scales its
// stroke too, which made a wave thicken as it travelled out. vector-effect
// holds it, so the waves differ in size and not in weight.
//
// No press animation and no ripple: the waves are the feedback.
// ---------------------------------------------------------------------------

const CONE = 'M4 9v6h4l5 4V5L8 9H4Z'
const WAVE_INNER = 'M15.27 9.47A3.4 3.4 0 0 1 15.27 14.53'
const WAVE_OUTER = 'M17.42 7.1A6.6 6.6 0 0 1 17.42 16.9'

/** A wave's lifetime, matching the CSS. One departs every CYCLE / WAVES. */
const CYCLE = 1.05
const WAVES = 3

const wave = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  vectorEffect: 'non-scaling-stroke' as const,
}

export function SpeakButton({
  text,
  speaking,
  onActivate,
  className = '',
  small = false,
}: {
  text: string
  speaking: boolean
  onActivate: () => void
  className?: string
  small?: boolean
}) {
  if (!supported()) return null

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

        {speaking ? (
          <g>
            {Array.from({ length: WAVES }, (_, i) => (
              <path
                key={i}
                d={WAVE_INNER}
                {...wave}
                className="speaker-wave"
                style={{ animationDelay: `${(i * CYCLE) / WAVES}s` }}
              />
            ))}
          </g>
        ) : (
          <>
            <path d={WAVE_INNER} {...wave} />
            <path d={WAVE_OUTER} {...wave} />
          </>
        )}
      </svg>
    </button>
  )
}
