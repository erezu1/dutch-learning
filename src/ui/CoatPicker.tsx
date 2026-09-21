import { motion } from 'framer-motion'
import { useLayoutEffect, useRef, useState } from 'react'
import { COAT_IDS, COATS, SNOUT, type CoatId } from '../core/cat'
import { glide, pressable } from './motion'

// ---------------------------------------------------------------------------
// A row of cats, built like the row of colour dots above it: the swatch is the
// control, because which cat you want is a choice made by looking.
//
// Her name is the exception, and it rides above whichever face is chosen —
// seven names at once is a list to read, and one name sitting in the middle
// of the row belongs to no cat in particular. It slides across as you try
// them on, which is what says it is naming the one under it.
//
// Each dot is her actual face, not a colour sample. A calico and a tuxedo are
// the same three colours in different places, so a plain swatch of either
// would be the same dot twice.
// ---------------------------------------------------------------------------

export function CoatPicker({
  current,
  onPick,
}: {
  current: CoatId
  onPick: (coat: CoatId) => void
}) {
  // Measured rather than computed from the index: the row can wrap, the
  // buttons carry a scale, and a number worked out from either would be a
  // second opinion about a layout the browser has already decided.
  const row = useRef<HTMLDivElement>(null)
  const buttons = useRef(new Map<CoatId, HTMLButtonElement>())
  const [x, setX] = useState<number | null>(null)

  useLayoutEffect(() => {
    const place = () => {
      const r = row.current
      const b = buttons.current.get(current)
      if (!r || !b) return
      const rr = r.getBoundingClientRect()
      const bb = b.getBoundingClientRect()
      setX(bb.left + bb.width / 2 - (rr.left + rr.width / 2))
    }
    place()
    // The row is centred, so it moves whenever the page width does.
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [current])

  return (
    <div className="flex flex-col items-center">
      {/* A line of its own height, so nothing below moves when the name
          changes — a row of buttons that shifts under your finger as you
          press it is a row you press twice. */}
      <div className="relative h-6 w-full">
        {/* The box stays put and the TEXT moves inside it. Translating the box
            itself pushed a full-width element half its own width off the side
            of the page, which on a phone is a page you can scroll sideways —
            invisible for the cats left of centre and a real horizontal scroll
            for the ones right of it. The text is forty pixels wide and never
            leaves the screen. */}
        <p className="absolute inset-x-0 top-0 text-center text-sm font-medium text-on-surface-dim">
          {/* Not rendered until it has been measured. `initial` is captured on
              the first render, so a name that mounts before the measurement
              mounts at nought and then travels to where it belongs — which is
              the slide in from the middle. Mounting it late costs one frame
              and it simply fades in where it goes. */}
          {x !== null && (
            <motion.span
              className="inline-block whitespace-nowrap"
              initial={{ x, opacity: 0 }}
              animate={{ x, opacity: 1 }}
              transition={glide}
            >
              {COATS[current].who}
            </motion.span>
          )}
        </p>
      </div>
      <div ref={row} className="flex flex-wrap items-center justify-center gap-2">
      {COAT_IDS.map((id) => {
        const coat = COATS[id]
        const active = id === current
        return (
          <motion.button
            key={id}
            ref={(el) => {
              if (el) buttons.current.set(id, el)
              else buttons.current.delete(id)
            }}
            {...pressable}
            onClick={() => onPick(id)}
            aria-label={`${coat.who}, the ${coat.name.toLowerCase()} cat`}
            aria-pressed={active}
            animate={{ scale: active ? 1.15 : 1 }}
            className="grid h-8 w-8 place-items-center rounded-full"
          >
            <span
              className="grid h-5 w-5 place-items-center overflow-hidden rounded-full transition-[box-shadow]"
              style={{
                background: coat.base,
                boxShadow: active
                  ? `0 0 0 3px var(--color-surface), 0 0 0 4.5px var(--color-primary), var(--shadow-1)`
                  : 'var(--shadow-1)',
              }}
            >
              {/* Just the head, cropped to the dot: at 28px the ears and paws
                  are noise, and what tells two coats apart is the face. */}
              <svg viewBox="21 19 78 78" className="h-[26px] w-[26px]" aria-hidden="true">
                <g dangerouslySetInnerHTML={{ __html: faceMark(id) }} />
              </svg>
            </span>
          </motion.button>
        )
      })}
      </div>
    </div>
  )
}

/**
 * The coat's markings alone, on a disc. Reusing the full drawing here would
 * mean seven live rigs on the home screen, each with its own idle loop.
 */
function faceMark(id: CoatId): string {
  const c = COATS[id]
  const patches = (c.patches ?? [])
    .map((p) => `<path d="${p.d}" fill="${p.fill}" opacity="${p.soft ? 0.9 : 1}"/>`)
    .join('')
  const stripes = (c.stripes?.d ?? [])
    .map(
      (e) =>
        `<ellipse cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}"${
          e.rot ? ` transform="rotate(${e.rot} ${e.cx} ${e.cy})"` : ''
        } fill="${c.stripes?.fill ?? 'none'}"/>`,
    )
    .join('')
  // Same coordinates as the cat herself — the patches and stripes are drawn in
  // her own space, so anything invented here would land in the wrong place on
  // her face. The disc is centred on her eyes rather than on her head, because
  // it is the eyes that have to survive the crop.
  const eye = (cx: number) =>
    `<ellipse cx="${cx}" cy="58" rx="11.5" ry="12" fill="${c.iris}"/>` +
    `<ellipse cx="${cx}" cy="58" rx="8.5" ry="9.8" fill="${c.pupil}"/>` +
    `<circle cx="${cx + 2.9}" cy="53.9" r="2.7" fill="#fff" opacity=".96"/>`
  return `<clipPath id="disc-${id}"><circle cx="60" cy="58" r="39"/></clipPath>
    <g clip-path="url(#disc-${id})">
      <rect x="0" y="0" width="120" height="120" fill="${c.base}"/>
      ${patches}${stripes}
      <ellipse cx="60" cy="75" rx="24" ry="13.5" fill="${c.muzzle}" opacity="${c.muzzleAlpha ?? (c.dark ? 0.42 : 0.65)}"/>
      ${eye(40)}${eye(80)}
      <path transform="translate(0 ${SNOUT})" d="M60 80.4C56.6 80.4 53.5 78.1 53.5 75.5C53.5 73.5 56.5 72.4 60 72.4C63.5 72.4 66.5 73.5 66.5 75.5C66.5 78.1 63.4 80.4 60 80.4Z" fill="${c.ear}"/>
    </g>`
}
