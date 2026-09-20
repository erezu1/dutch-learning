// ---------------------------------------------------------------------------
// The app mark's geometry, kept here rather than in the UI layer so the
// favicon (which core owns, alongside the theme) and the React component can
// share one definition. Nothing in core imports from ui.
//
// A paw is five separate shapes, which is a lot for a mark that has to survive
// being 16px in a browser tab. What holds it together is the negative space:
// the gaps between the toes, and between the toes and the pad, are the thing
// the eye actually reads. So the toes sit on one arc at even angles rather
// than at hand-picked coordinates, they are ellipses turned to point along
// that arc rather than circles, and they are graded — the two in the middle
// larger than the two at the edges, as a real paw is.
//
// Drawn to fill the box with a hair of margin, because a mark that floats in
// the middle of its own frame reads as small next to text set solid.
// ---------------------------------------------------------------------------

export interface Toe {
  cx: number
  cy: number
  rx: number
  ry: number
  /** Degrees, turning the long axis to point outward along the arc. */
  rot: number
}

/**
 * Where the arc the toes sit on is centred, and how far out they sit. Set so
 * the drawn mark is centred in the box rather than the box's geometry being:
 * a paw is wider than it is tall, and the leftover space belongs equally above
 * and below, or the mark hangs low against text set beside it.
 */
const ARC = { x: 12, y: 14.95, r: 9.1 }
/** Angles from straight up. Even either side, wider at the edges. */
const ANGLES = [-58, -20, 20, 58]

function toeAt(deg: number, index: number): Toe {
  const rad = (deg * Math.PI) / 180
  // The middle pair carries the mark; the outer pair is smaller and set a
  // little shorter, which is what stops the four reading as a row of dots.
  const middle = index === 1 || index === 2
  return {
    cx: +(ARC.x + ARC.r * Math.sin(rad)).toFixed(2),
    cy: +(ARC.y - ARC.r * Math.cos(rad)).toFixed(2),
    rx: middle ? 2.3 : 2.05,
    ry: middle ? 2.95 : 2.6,
    rot: deg,
  }
}

export const PAW_TOES: Toe[] = ANGLES.map(toeAt)

/**
 * The pad: a rounded triangle standing on a wide base, with a shallow dip in
 * the middle of that base. The dip is a sixth of a unit at 16px — invisible
 * there, and the thing that makes it a paw rather than a blob at the size it
 * sits beside the app's name.
 */
export const PAW_PAD =
  'M12 10.75c3.8 0 6.85 3 6.85 6.05 0 2.25-1.75 3.65-3.85 3.65-1.35 0-2.2-.55-3-.55s-1.65.55-3 .55c-2.1 0-3.85-1.4-3.85-3.65C5.15 13.75 8.2 10.75 12 10.75z'

const toePath = (t: Toe) =>
  `<ellipse cx="${t.cx}" cy="${t.cy}" rx="${t.rx}" ry="${t.ry}" transform="rotate(${t.rot} ${t.cx} ${t.cy})"/>`

/** The mark as a standalone SVG string, used for the favicon. */
export function pawSvg(color: string, background?: string): string {
  const toes = PAW_TOES.map(toePath).join('')
  const bg = background ? `<rect width="24" height="24" rx="5.5" fill="${background}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${bg}<g fill="${color}">${toes}<path d="${PAW_PAD}"/></g></svg>`
}
