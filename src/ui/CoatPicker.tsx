import { AnimatePresence, motion } from 'framer-motion'
import { COAT_IDS, COATS, type CoatId } from '../core/cat'
import { pressable, quiet } from './motion'

// ---------------------------------------------------------------------------
// A row of cats, built like the row of colour dots above it: the swatch is the
// control, because which cat you want is a choice made by looking.
//
// Her name is the exception, and it goes above the row rather than under each
// face. Seven names at once is a list to read; one name is the cat you have,
// and it changes as you try them on.
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
  return (
    <div className="flex flex-col items-center">
      {/* A fixed line to swap inside, so nothing below moves when the name
          changes — a row of buttons that shifts under your finger as you
          press it is a row you press twice. */}
      <div className="flex h-6 items-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={current}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={quiet}
            className="font-display text-sm font-medium text-on-surface-dim"
          >
            {COATS[current].who}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
      {COAT_IDS.map((id) => {
        const coat = COATS[id]
        const active = id === current
        return (
          <motion.button
            key={id}
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
      <path d="M60 80.4C56.6 80.4 53.5 78.1 53.5 75.5C53.5 73.5 56.5 72.4 60 72.4C63.5 72.4 66.5 73.5 66.5 75.5C66.5 78.1 63.4 80.4 60 80.4Z" fill="${c.nose ?? (c.dark ? '#C98C86' : '#E29A93')}"/>
    </g>`
}
