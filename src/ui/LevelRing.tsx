import { animate, AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { COATS, type CoatId } from '../core/cat'
import type { Rung } from '../core/ladder'
import { Confetti } from './Confetti'
import { TITLE } from './type'

// ---------------------------------------------------------------------------
// The home screen's ring, finishing a level in front of you.
//
// It fills from nothing, the way it does every time the home screen arrives,
// with the count underneath running up with it, and when it closes it flashes
// and bursts — confetti out of the ring itself, in the cat's colours — while
// the number inside rolls over to the new level. Then it stays full: this
// screen is about the level you just finished, and the one you have started
// is on the home screen, where its ring begins.
//
// The same ring as on the home screen, at the same proportions, so what
// closes here is recognisably the thing you have been watching fill for days.
// ---------------------------------------------------------------------------

const C = 283 // circumference of r=45, as on the home screen
const EASE = [0.4, 0, 0.6, 1] as const
const FILL_DELAY = 0.45
const FILL = 1.4

type Phase = 'fill' | 'burst' | 'done'

/** Too light to see on the page: a white cat's fur makes invisible confetti. */
function visible(hex: string): boolean {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return true
  const n = parseInt(m[1], 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 225
}

/** Her patches, her stripes, the pink of her ears, and the app's accent. */
function colorsFor(coat: CoatId): string[] {
  const c = COATS[coat]
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
  const own = [
    ...(c.patches ?? []).map((p) => p.fill),
    c.stripes?.fill,
    c.ear,
    c.base,
    c.iris,
  ].filter((x): x is string => !!x && visible(x))
  const unique = [...new Set(own)]
  // A cat with little colour of her own still gets a party: gold stands in.
  if (unique.length < 3) unique.push('#F2C14E')
  // The accent twice, so it is the colour you see most of.
  return accent ? [accent, accent, ...unique] : unique
}

interface Props {
  from: Rung
  to: Rung
  coat: CoatId
  /**
   * Everything counted into the old level, this round included — more than
   * its span when the round went past it. The count runs all the way there;
   * the ring can only be full.
   */
  total: number
  /** Called the moment the ring bursts, for whatever else celebrates it. */
  onBurst: () => void
}

export function LevelRing({ from, to, coat, total, onBurst }: Props) {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [phase, setPhase] = useState<Phase>(reduced ? 'done' : 'fill')
  const [fire, setFire] = useState(0)
  const ring = useRef<HTMLDivElement>(null)

  const counted = useMotionValue(reduced ? total : 0)
  const shown = useTransform(counted, (v) => Math.round(v).toLocaleString())
  // The arc follows the count, and stops at full: past the end of the level the
  // number keeps going while the ring holds, closed, until the count lands.
  const offset = useTransform(counted, (v) => C * (1 - Math.min(1, v / from.span)))
  // The same pace all the way, so the part past full takes as long as it
  // would have taken to fill — within reason.
  const run = Math.min(FILL * Math.max(1, total / from.span), FILL * 1.6)

  useEffect(() => {
    if (reduced) {
      onBurst()
      return
    }
    // Up from nothing, the ring with it, to everything this round brought.
    const up = animate(counted, total, { duration: run, delay: FILL_DELAY, ease: EASE })
    // It bursts when the count lands, not on a clock of its own: a phone
    // that drops frames would otherwise burst the ring with the number still
    // on its way.
    let settle: ReturnType<typeof setTimeout> | undefined
    let live = true
    up.then(() => {
      if (!live) return
      setPhase('burst')
      setFire(1)
      onBurst()
      settle = setTimeout(() => setPhase('done'), 600)
    })
    return () => {
      live = false
      up.stop()
      clearTimeout(settle)
    }
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The big number turns over the moment the ring closes.
  const level = phase === 'fill' ? from.level : to.level

  return (
    <>
      <Confetti
        fire={fire}
        colors={colorsFor(coat)}
        origin={() => {
          const r = ring.current?.getBoundingClientRect()
          return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null
        }}
      />
      <motion.div
        ref={ring}
        // The flash: a quick swell when it closes, and back.
        animate={phase === 'burst' ? { scale: [1, 1.14, 0.97, 1] } : { scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative grid h-44 w-44 place-items-center"
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90 overflow-visible">
          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-surface-3)" strokeWidth="8" />
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="8"
            strokeLinecap="round"
            // One full-length dash, slid into view by the count.
            strokeDasharray={C}
            style={{ strokeDashoffset: offset }}
          />
          {/* A ring of light that leaves the ring as it closes. */}
          {phase === 'burst' && (
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="6"
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 1.35, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ transformOrigin: '50px 50px' }}
            />
          )}
        </svg>

        <div className="text-center">
          <p className="text-xs tracking-wide text-on-surface-dim">level</p>
          {/* The number rolls over: the old one goes up and out, the new one
              comes up from below, the way a counter turns. */}
          <div className="relative h-[3.75rem] overflow-hidden">
            <AnimatePresence initial={false}>
              <motion.p
                key={level}
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '-100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className={`absolute inset-x-0 text-5xl leading-tight ${TITLE}`}
              >
                {level}
              </motion.p>
            </AnimatePresence>
          </div>
          <p className="text-sm tabular-nums text-on-surface-dim">
            <motion.span>{shown}</motion.span> / {from.span.toLocaleString()}
          </p>
        </div>
      </motion.div>
    </>
  )
}
