import { supported } from '../core/speech'

// ---------------------------------------------------------------------------
// The speaker, with its own waves as the animation.
//
// While the voice is talking the arcs propagate outwards, each replaced by the
// one growing behind it. The waves run on negative delays so they are already
// spread along their path on the first frame: one on the inner arc, one on the
// outer, one forming at the mouth. The mark never stops looking like itself.
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

/**
 * A wave's whole life, matching the CSS: three equal steps, from forming at
 * the mouth, through the inner arc, through the outer, and away. Three waves
 * one step apart mean the icon is exactly its resting self every STEP seconds,
 * which is when the animation can be stopped without a jump.
 */
const LIFETIME = 1.8
const WAVES = 3
export const STEP = LIFETIME / WAVES

const wave = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  vectorEffect: 'non-scaling-stroke' as const,
}

/**
 * One size, everywhere. It is a mark saying "this can be heard", not part of
 * the text, so it doesn't grow with a heading or shrink with a caption — it
 * was two hand-picked sizes before, and which one you got depended on which
 * component happened to be rendering it.
 */
/** The one size, in pixels, so callers can place it by its middle. */
export const ICON = 20

export function SpeakButton({
  text,
  speaking,
  onActivate,
  className = '',
}: {
  text: string
  speaking: boolean
  onActivate: () => void
  className?: string
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
        style={{ width: ICON, height: ICON }}
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
                // Negative, so the second wave is already at the outer arc on
                // the first frame rather than waiting its turn at the mouth.
                style={{ animationDelay: `${-i * STEP}s` }}
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
