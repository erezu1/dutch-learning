// ---------------------------------------------------------------------------
// Doei's cat.
//
// The pose is the peek: ears and face, a hint of chest, two front paws hooked
// over an edge, everything below that edge cut off. It is the pose that needs
// furniture to sit on, which is what makes it placeable in an app that is
// mostly cards.
//
// Nothing here is a picture. A coat is a handful of colours and two blobs
// clipped to the silhouette; an expression is a choice of eyes and a mouth.
// So the eleventh expression costs a line, not a drawing.
//
// Every moving part comes out as its own <g> with an id and a pivot already
// set, because a mascot welded into one path can only ever fade in and out.
// ---------------------------------------------------------------------------

// --- geometry --------------------------------------------------------------
// One box, 120 wide and 108 tall, with the ground along the bottom edge.
//
// The box height is a drawing decision, not a container. Make it taller and
// the paws show their straight sides and read as two posts; crop it here and
// only the domes clear the edge, which is what a paw hooked over something
// actually looks like.

// The head is not a shape, it is a shape under load. She is lying with her
// chin on the carpet, and that is the whole reason she is wider than she is
// tall: the weight spreads the lower half. Lift the head and the spread comes
// out of it — narrower, taller, brow further from the floor.
//
// So `squash` is a parameter and not a drawing. 1 is fully down on the
// carpet, 0 is head raised clear of it. The floor line stays put at y=100
// whatever it is set to, because that is the one thing she is resting on.
const FLOOR = 100

export function headPath(q = 1): string {
  const top = 16 - 7 * (1 - q)
  const h = FLOOR - top
  const wLo = 46 + 6 * q      // half-width low down, where the weight lands
  const wUp = 31 + 3 * q      // half-width across the brow, barely loaded
  const yWide = FLOOR - h * 0.4
  const yBrow = top + h * 0.18
  const x = 60
  return `M${x} ${top}` +
    `C${x + wUp * 0.5} ${top} ${x + wUp * 0.88} ${yBrow - 6} ${x + wUp} ${yBrow}` +
    `C${x + wLo * 0.85} ${yBrow + 11} ${x + wLo} ${yWide - 12} ${x + wLo} ${yWide}` +
    `C${x + wLo} ${yWide + 18} ${x + wLo * 0.62} ${FLOOR} ${x} ${FLOOR}` +
    `C${x - wLo * 0.62} ${FLOOR} ${x - wLo} ${yWide + 18} ${x - wLo} ${yWide}` +
    `C${x - wLo} ${yWide - 12} ${x - wLo * 0.85} ${yBrow + 11} ${x - wUp} ${yBrow}` +
    `C${x - wUp * 0.88} ${yBrow - 6} ${x - wUp * 0.5} ${top} ${x} ${top}Z`
}

// Big triangles off the top corners. The ear is the silhouette — it is what
// still says "cat" at 36px, when the whole face has become four grey pixels.
// The base runs a long way down into the skull. None of that lobe is ever
// seen — the head is drawn over it — and it is there entirely so the ear
// still has something to sit on once it has been turned by a perk or lifted
// by a squash. A base cut to just what shows at rest comes away from the
// head the moment anything moves.
const EAR_L = 'M12 48C7 33 4 12 8 5C10.5 1 15 3 18.5 7.5C26 17 38 26 48 24C52 40 44 58 28 60C18 61 13 55 12 48Z'
const EAR_R = 'M108 48C113 33 116 12 112 5C109.5 1 105 3 101.5 7.5C94 17 82 26 72 24C68 40 76 58 92 60C102 61 107 55 108 48Z'

// The pink sits inside the ear, off-centre toward the OUTER edge: roughly
// four units of fur along the outside against seven or more along the inside.
// That offset alone is what makes an ear look like it is facing away from the
// centre of the head. Centre it and both ears face straight at you.
//
// The inner band has to be thick where the ear is VISIBLE, which is only
// above the skull line — an earlier version put all its clearance down at the
// base, where the head covers it, so the two ears looked identical.
const EAR_L_IN = 'M14.5 44C9.5 32 8 13 11 7.5C12.5 5.5 14 6.5 15.5 10C18 15 21 19.5 24.5 22.5C21 28.5 17.5 36.5 14.5 44Z'
const EAR_R_IN = 'M105.5 44C110.5 32 112 13 109 7.5C107.5 5.5 106 6.5 104.5 10C102 15 99 19.5 95.5 22.5C99 28.5 102.5 36.5 105.5 44Z'

// A squircle, not a rectangle: the same four arcs an ellipse has, but pulled
// with a fatter handle (0.72 of the radius instead of 0.552) so the top,
// bottom and sides run flatter and the turns happen closer to the corners.
// There is no straight segment anywhere in it — the last version had real
// H and V edges, which is what made it a box. A pure ellipse went the other
// way and turned them into eggs; this sits between the two.
// Whole rounded shapes, top and bottom both. Nothing is cut by the frame —
// they rest above it. Two earlier tries were wrong in opposite directions: a
// half-oval, which has no bottom at all, and then a rounded rectangle, which
// has twelve units of dead straight side. This has neither; the curve never
// stops turning.
const PAW_L = 'M11 92C11 83.4 15.5 80 27 80C38.5 80 43 83.4 43 92C43 100.6 38.5 104 27 104C15.5 104 11 100.6 11 92Z'
const PAW_R = 'M77 92C77 83.4 81.5 80 93 80C104.5 80 109 83.4 109 92C109 100.6 104.5 104 93 104C81.5 104 77 100.6 77 92Z'
// The toe splits rise from the bottom of the paw, not down from the crown. A
// paw divides front-to-back; a line hanging off the top reads as a seam.
const TOES_L = 'M23 102V97M33 102V97'
const TOES_R = 'M87 102V97M97 102V97'

const EYE = { l: 40, r: 80, y: 58, rx: 11.5, ry: 12 }
/**
 * How far the nose and mouth ride above where they are drawn.
 *
 * They are drawn as one assembly — every mouth hangs off the nose's bottom
 * point at y 80.4 — so moving the nose means moving both, and one number
 * does it for all of them rather than five sets of coordinates being nudged
 * out of agreement with each other.
 */
export const SNOUT = -3

const NOSE = 'M60 80.4C56.6 80.4 53.5 78.1 53.5 75.5C53.5 73.5 56.5 72.4 60 72.4C63.5 72.4 66.5 73.5 66.5 75.5C66.5 78.1 63.4 80.4 60 80.4Z'
// Long, and deliberately outside the silhouette. Clipping them to the head
// was wrong — in life and in the reference they cross the edge.
// Three z's rising off her right ear. Drawn rather than set as text: at this
// size a glyph is at the mercy of hinting and a font that may not have loaded,
// and this is two strokes.
//
// They live in the frame's right margin — the space the ear tips needed for a
// tilt — so they never cross her. A zzz over the cat is a label saying she is
// asleep; a zzz beside her is her sleeping.
export const ZED = 'M0 0h5.4L0 6.6h5.4'

// And hearts, when she is delighted. The same corner of the frame as the zzz,
// since the two moods can never happen at once, and the same construction —
// the difference between sleeping and being pleased should be what rises off
// her, not where it rises from.
//
// Two of them, not three. At this size a third crowds the corner and turns a
// gesture into a cloud, and the zzz get three precisely because they are
// smaller: how many there are is set by how much room each one takes, not by
// matching the other beat.
export const HEART =
  'M0 2.1C0 0.7 1.2 0 2.1 0.6C2.5 0.85 2.8 1.2 3 1.5C3.2 1.2 3.5 0.85 3.9 0.6' +
  'C4.8 0 6 0.7 6 2.1C6 3.9 3.9 5.5 3 6.2C2.1 5.5 0 3.9 0 2.1Z'

const WHISKERS = 'M44 67q-17-4-28-6M44 72q-18 1-29 1M44 77q-17 5-27 7M76 67q17-4 28-6M76 72q18 1 29 1M76 77q17 5 27 7'

// --- coats -----------------------------------------------------------------
// Independent of the theme on purpose: this is which cat you have, not which
// colour the app is. Every coat still has to survive both ramps, so none uses
// pure white or pure black, and each carries its own line colour — a darkened
// version of its own fur, never one generic grey outline for all of them.

/** A circle, as a path, because a patch is a `d` and an ellipse is not. */
const disc = (cx: number, cy: number, r: number): string =>
  `M${cx - r} ${cy}A${r} ${r} 0 1 1 ${cx + r} ${cy}A${r} ${r} 0 1 1 ${cx - r} ${cy}Z`

// A two-colour cat is two caps, one over each ear, carried down the side of
// the head until they pass behind the eye. That is what the marking actually
// is on a real animal — colour that comes over the top and stops — and it
// leaves the white where a cat's white belongs: up the middle of the face and
// all the way round the muzzle.
//
// Each one is a plain circle. Nothing drawn by hand out of segments stays
// round under a clip and a squash, and every earlier attempt read as what it
// was: two lines meeting at a corner somewhere on her forehead. A circle has
// no corner to find. Kept small enough to be a marking rather than a hood:
// it takes the ear and the brow above the eye and stops, which leaves her
// most of a white face to make expressions with.
//
// The two are not the same size. A cat whose markings match on both sides is
// a logo; the left one comes further down and wraps under the eye onto the
// cheek, which is the difference between a pattern and an animal.
const P = {
  left: disc(19, 33, 38),
  right: disc(98, 23, 30),
  mask: 'M60 44C82 44 99 62 99 86C99 110 82 126 60 126C38 126 21 110 21 86C21 62 38 44 60 44Z',
}

// Tabby markings, as ellipses that run off the edge of the head and are cut
// by the silhouette clip. Drawn as closed triangles they read as loose
// shapes floating inside her — a band has to arrive from somewhere, so each
// one starts outside the head and the clip decides where it enters.
//
// They also stop well clear of the eyes. A stripe running down into the lash
// line reads as a scar rather than as fur.
const STRIPES: Stripe[] = [
  { cx: 60, cy: 17, rx: 4.6, ry: 17 },
  { cx: 44, cy: 19, rx: 3.9, ry: 16, rot: -12 },
  { cx: 76, cy: 19, rx: 3.9, ry: 16, rot: 12 },
  { cx: 29, cy: 25, rx: 3.6, ry: 15, rot: -27 },
  { cx: 91, cy: 25, rx: 3.6, ry: 15, rot: 27 },
  { cx: 13, cy: 41, rx: 3.4, ry: 14, rot: -58 },
  { cx: 107, cy: 41, rx: 3.4, ry: 14, rot: 58 },
]

// One pupil for every cat. What changes between them is the iris behind it —
// pale by default, gold on the black cat, blue on the Siamese — which is how
// a gold-eyed cat can still have the same eye as everybody else.
const PUPIL = '#262019'

export interface Coat {
  /** What the marking is called. */
  name: string
  /**
   * What she is called. A coat is a description and a cat is somebody, and
   * the difference is most of why anyone picks one over another — nobody is
   * attached to "Gray". Dutch, and earned by the coat rather than assigned to
   * it: soot, ginger, mist, mocha, a snowflake, a patch of cloth. Teller is
   * the exception and gets to be a name for its own sake.
   */
  who: string
  base: string
  muzzle: string
  ear: string
  iris: string
  pupil: string
  line: string
  /**
   * The line on a dark page, where one is needed. A coat's outline is normally
   * a darkened version of its own fur, which works because the page is pale —
   * but on a dark page a dark cat's outline is darker than both her and the
   * ground, so it does nothing and she loses her edge entirely. The coats that
   * carry a lot of black say what to use instead.
   */
  lineDark?: string
  paw: string
  dark?: boolean
  nose?: string
  muzzleAlpha?: number
  earPatch?: string
  patches?: { d: string; fill: string; soft?: boolean }[]
  stripes?: { d: Stripe[]; fill: string }
  chin?: { cx: number; cy: number; rx: number; ry: number; fill: string }
}

interface Stripe { cx: number; cy: number; rx: number; ry: number; rot?: number }

export interface Mood {
  eyes: keyof typeof EYES
  mouth: keyof typeof MOUTHS
  label: string
  squash?: number
  tilt?: number
  ear?: 'perk' | 'flat'
  gaze?: [number, number]
  arc?: number
  lid?: number
}

export const COATS: Record<string, Coat> = {
  calico: {
    lineDark: '#6E5C4C', // her black side would otherwise have no edge
    name: 'Calico', who: 'Lapje', base: '#FBF2E3', muzzle: '#FFFCF6', ear: '#F2B3AA',
    iris: '#FFFFFF', pupil: PUPIL, line: '#5A4A3E', paw: '#FFFCF6',
    patches: [{ d: P.left, fill: '#3C3430' }, { d: P.right, fill: '#E39A4C' }],
  },
  // The same two patches as the calico, both in black. A tuxedo is not a
  // different animal, it is the same animal with the ginger taken out.
  tuxedo: {
    lineDark: '#6B615B', // light enough to clear the page, dark enough to show on her chin
    name: 'Tuxedo', who: 'Teller', base: '#FCF7EF', muzzle: '#FFFFFF', ear: '#EFAEA6',
    iris: '#FFFFFF', pupil: PUPIL, line: '#4A423E', paw: '#FFFFFF',
    patches: [{ d: P.left, fill: '#2F2B29' }, { d: P.right, fill: '#2F2B29' }],
    // The goatee. A tuxedo's chin spot is what stops the white muzzle reading
    // as a bib, and it is four numbers.
    // A half oval, made by putting a whole oval's CENTRE on the chin and
    // letting the head clip take the rest: the jawline cuts it along its own
    // curve, so the flat edge of the half is the bottom of her face rather
    // than a straight line drawn across it.
    chin: { cx: 60, cy: FLOOR, rx: 11, ry: 9, fill: '#2F2B29' },
  },
  black: {
    lineDark: '#7C726B', // the only coat that is dark everywhere
    name: 'Black', who: 'Roet', base: '#3A3533', muzzle: '#454038', ear: '#6E5350',
    iris: '#F2CB64', pupil: '#1C1815', line: '#211E1D', dark: true, paw: '#443E3B',
  },
  ginger: {
    // Her ear is a deeper rose than the others'. A ginger cat's pink sits on
    // orange, and the two are close enough in both hue and lightness that the
    // usual salmon disappeared into the coat — the one place the inner ear
    // has to fight its own background rather than contrast with it.
    name: 'Ginger', who: 'Gember', base: '#EDA45C', muzzle: '#FBE7CE', ear: '#D5747F',
    iris: '#FFF3DE', pupil: PUPIL, line: '#A9622C', paw: '#FBE7CE',
    stripes: { d: STRIPES, fill: '#D5823C' },
  },
  gray: {
    name: 'Gray', who: 'Mist', base: '#A9AEB0', muzzle: '#E4E6E6', ear: '#E0A9A2',
    iris: '#FFFFFF', pupil: PUPIL, line: '#6B7073', paw: '#E8EAEA',
    stripes: { d: STRIPES, fill: '#868D90' },
  },
  siamese: {
    name: 'Siamese', who: 'Mokka', base: '#F1E3CE', muzzle: '#F7EEE0', ear: '#8A6A58',
    iris: '#A9D4EE', pupil: PUPIL, line: '#8D765F', paw: '#F9F2E7',
    patches: [{ d: P.mask, fill: '#6E5747', soft: true }],
    earPatch: '#8A6A58',
    // The mask runs right over the muzzle, and a rose nose on top of that
    // brown is two dark things on each other — the nose disappeared. So the
    // muzzle reads at nearly full strength on this coat, which is what gives
    // the nose a pale field to sit on, and the nose itself goes deeper so it
    // is darker than what is now behind it rather than lighter.
    muzzleAlpha: 0.88,
    nose: '#C2726C',
  },
  white: {
    name: 'White', who: 'Vlok', base: '#FCF9F3', muzzle: '#FFFFFF', ear: '#F2B3AA',
    // A pale cat needs a darker line than a dark one, not a lighter one: she
    // has no edge contrast of her own against an off-white page.
    iris: '#FFFFFF', pupil: PUPIL, line: '#8E8375', paw: '#FFFFFF',
  },
}

// --- eyes ------------------------------------------------------------------
// One structure everywhere: an iris field, a pupil that fills most of it, and
// two highlights. The gaze moves the pupil and its highlights together, which
// is all "looking up and to the left" has ever been.

// One curve does both jobs.
//
// The eye closes because a lid comes down across it, so there is exactly one
// piece of geometry involved: the lid's edge. The mask is the region below
// that edge, and the drawn border IS that edge. Deriving them separately is
// what was broken before — the mask was a rectangle, so the top of the
// clipped eye was a straight horizontal line, while the border was a curved
// arc sliding down independently. Two different shapes; they could never
// agree, and what you saw was a line drifting over an eye that ignored it.
//
// t is how shut she is. 0 is open, and the lid then traces the top of the
// eye, which is why the border at rest looks like the eye's own outline. 0.5
// puts it flat across the middle. 1 bulges it past the bottom, which leaves
// no eye at all.
// Zero: at rest the lid sits exactly on the top of the eye, so the eye is a
// full circle and the border traces its outline. Any resting value above zero
// makes every eye a lens instead — a small distortion, applied permanently,
// to a shape that carries most of her character.
export const LID_OPEN = 0

export function lidPaths(cx: number, cy: number, rx: number, ry: number, t: number) {
  // The eye narrows onto its own centre line, evenly from above and below, so
  // the mask is simply the eye's ellipse with its vertical radius collapsing:
  // radii (rx, h) with h running from ry to nothing. At t = 0 it is the eye
  // itself and nothing is hidden; at t = 1 it has closed to a line across the
  // middle and there is no eye left on either side of it.
  //
  // The border is the top half of that same ellipse, which is why it reads as
  // the eye's own outline at rest and as a straight line when shut — one
  // shape, sampled twice, so the two can never disagree.
  //
  // Elliptical arcs rather than Béziers: a quadratic through the same three
  // points sags badly at the sides, and that is what made the open eye's
  // border cut across it instead of sitting on it.
  const h = Math.max(ry * (1 - t) * 1.03, 0.01)
  const n = (v: number) => v.toFixed(2)
  // sweep-flag 1 is the positive angle direction, which with y pointing down
  // runs clockwise on screen — left point, over the top, right point.
  const over = `A${n(rx)} ${n(h)} 0 0 1 ${n(cx + rx)} ${n(cy)}`
  const under = `A${n(rx)} ${n(h)} 0 0 1 ${n(cx - rx)} ${n(cy)}`
  return {
    mask: `M${n(cx - rx)} ${n(cy)}${over}${under}Z`,
    lash: `M${n(cx - rx)} ${n(cy)}${over}`,
  }
}

interface EyeOpts {
  gaze?: [number, number]
  inward?: number
  lid?: number
  arc?: number
  /**
   * Which blink channel this eye answers to. Kept in the call sites even
   * though the markup no longer branches on it: every eye is blinkable now,
   * and the name documents which side a call is building.
   */
  blink?: string
}

function eye(cx: number, cy: number, rx: number, ry: number, c: Coat, id: string,
  { gaze = [0, 0] as [number, number], inward = 0, lid = 0, arc = LID_OPEN }: EyeOpts = {}): string {
  const [gx, gy] = gaze
  const px = cx + gx + inward, py = cy + gy
  const prx = rx * 0.74, pry = ry * 0.82
  const shape = `cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"`

  // The pupil is clipped to the eye, always. It sits off-centre toward the
  // nose by default and moves further with the mood, and the hole it lives in
  // is the only thing keeping that from sliding out onto the cheek.
  // A blink is a lid travelling down over an eye that does not itself change.
  // Scaling the eye group was wrong twice over: it squashed the pupil out of
  // round and it thinned the lash line, because a stroke scales with whatever
  // it is drawn on. So the eye is clipped by a rectangle that slides down over
  // it, and the lash line — which IS the edge of the lid — translates the same
  // distance. Nothing is scaled, so the pupil keeps its shape and the stroke
  // keeps its weight; they are simply covered.
  //
  // Clipping rather than covering also means whatever is behind the eye shows
  // through as she closes it, which matters on a calico: her left eye sits on
  // a black patch and her right on cream, and a single lid colour would be
  // wrong on one of them.
  // Both the lid and the lash line are moved from JS, by attribute, and not
  // through a custom property. Chrome does not re-evaluate a clipPath's
  // geometry when a registered property inside it animates, and CSS
  // `clip-path: inset()` on the group does not either — the eye simply never
  // changed while the lash line slid down it on its own. Attributes always
  // repaint, and driving both in the same tick is also the only way to
  // guarantee the line stays welded to the edge it is drawing.
  // Both elements are redrawn from lidPaths by JS, by attribute. A registered
  // custom property cannot drive this: Chrome does not re-evaluate a
  // clipPath's geometry when one animates inside it, and CSS clip-path:inset
  // on the group does not repaint either. Attributes always do.
  const geo = `data-cx="${cx}" data-cy="${cy}" data-rx="${rx}" data-ry="${ry}" data-t0="${arc}"`
  const d0 = lidPaths(cx, cy, rx, ry, arc)
  const inner = `
      <clipPath id="${id}h"><ellipse ${shape}/></clipPath>
      <clipPath id="${id}d"><path class="cat-lidmask" ${geo} d="${d0.mask}"/></clipPath>
      <g clip-path="url(#${id}d)">
        <ellipse ${shape} fill="${c.iris}"/>
        <g clip-path="url(#${id}h)">
          <g class="cat-pupil" style="transform-box:view-box;transform:${POSE_GAZE}">
          <ellipse cx="${px}" cy="${py}" rx="${prx}" ry="${pry}" fill="${c.pupil}"/>
          <circle cx="${px + prx * 0.34}" cy="${py - pry * 0.44}" r="${prx * 0.32}" fill="#fff" opacity=".96"/>
          <circle cx="${px - prx * 0.42}" cy="${py + pry * 0.42}" r="${prx * 0.18}" fill="#fff" opacity=".6"/>
          </g>
        </g>
      </g>
      <path class="cat-lash" ${geo} d="${d0.lash}" fill="none" stroke="${c.line}"
        stroke-width="2.6" stroke-linecap="round"/>`

  if (!lid) return inner

  // The cross eye. Not a smaller eye — a lid drawn across it, dropping toward
  // the nose. Narrowing an eye symmetrically only makes a cat look far away;
  // it is the slant that reads as an opinion.
  const o = 4
  const a = [cx - lid * (rx + o), cy - ry * 0.72]
  const b = [cx + lid * (rx + o), cy - ry * 0.08]
  // Walk the quad's perimeter: a, b, b's foot, a's foot. Sorting the two x
  // values instead put the corners in the order right, left, right, left on
  // whichever eye had a negative lid, which is a bowtie, not a quad — and a
  // self-intersecting clip is what grew the extra eye on the grumpy face.
  const foot = cy + ry + o
  return `<clipPath id="${id}k"><polygon points="${a[0]},${a[1]} ${b[0]},${b[1]}
      ${b[0]},${foot} ${a[0]},${foot}"/></clipPath>
    <g clip-path="url(#${id}k)">${inner}</g>
    <path d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}" stroke="${c.line}" stroke-width="2.2"
      stroke-linecap="round" fill="none"/>`
}

// How far the pupils sit toward the nose. A pair of pupils dead centre in
// their own sockets is a doll; pulling them in a couple of units is the whole
// of the silly, slightly cross-eyed look the reference has.
const IN = 2.6

// A closed eye is an arc, and which way it bends is the entire mood: up is
// pleased, down is asleep. Same stroke, opposite sign.
function arcEye(cx: number, cy: number, c: Coat, up = true) {
  const w = 10, h = up ? -6.4 : 5.8
  return `<path d="M${cx - w} ${cy + (up ? 2.6 : -1)}q${w} ${h * 2} ${w * 2} 0" fill="none"
      stroke="${c.pupil}" stroke-width="3.6" stroke-linecap="round"/>`
}

// Brows are two short strokes and they carry more mood than the eyes do.
// Which end is raised is the whole difference: inner-up reads as pleading,
// inner-down as cross. Nothing else about the face changes between the two.
// Measured off the eye rather than typed in. Hand-placed brows are exactly
// what gets left behind the next time the face moves.
const brow = (c: Coat, inner: 'up' | 'down') => {
  const x0 = EYE.l - EYE.rx - 1
  const w = (EYE.rx + 1) * 2
  const y = EYE.y - EYE.ry - 3.5
  const dy = inner === 'up' ? -3 : 4.6
  const lift = inner === 'up' ? -5.5 : 1.2
  return `<path d="M${x0} ${y}q${w / 2} ${lift} ${w} ${dy}M${120 - x0} ${y}q${-w / 2} ${lift} ${-w} ${dy}"
      fill="none" stroke="${c.pupil}" stroke-width="2.7" stroke-linecap="round" opacity=".7"/>`
}

const E = EYE
const open2 = (c: Coat, id: string, g: [number, number], arc: number, dx = 0, dy = 0): [string, string] => [
  eye(E.l, E.y + dy, E.rx + dx, E.ry + dx, c, id + 'a', { gaze: g, inward: IN, arc, blink: '--blink-l' }),
  eye(E.r, E.y + dy, E.rx + dx, E.ry + dx, c, id + 'b', { gaze: g, inward: -IN, arc, blink: '--blink-r' }),
]
type EyeFn = (c: Coat, id: string, g: [number, number], arc: number) => [string, string, string]

const EYES: Record<string, EyeFn> = {
  open: (c, id, g, arc) => [...open2(c, id, g, arc), ''],
  wide: (c, id, g, arc) => [...open2(c, id, g, arc, 1.8), ''],
  happy: (c) => [arcEye(E.l, E.y, c, true), arcEye(E.r, E.y, c, true), ''],
  sleepy: (c) => [arcEye(E.l, E.y + 2, c, false), arcEye(E.r, E.y + 2, c, false), ''],
  // Sad is not a frown — it is the eyes going big and the brows tipping in.
  sad: (c, id, g, arc) => [...open2(c, id, g, arc, 0.6, 1), brow(c, 'up')],
  // Curious: one eye a shade larger. Asymmetry is what reads as attention.
  // One eye a shade larger than the other — but both still circles, and
  // scaled evenly. Asymmetry is what reads as attention; a squint is not.
  curious: (c, id, g, arc) => [
    eye(E.l, E.y, E.rx + 0.8, E.ry + 0.8, c, id + 'a', { gaze: g, inward: IN, arc, blink: '--blink-l' }),
    eye(E.r, E.y + 1.6, E.rx - 1.8, E.ry - 1.8, c, id + 'b', { gaze: g, inward: -IN, arc, blink: '--blink-r' }), ''],
  angry: (c, id, _g, arc) => [
    eye(E.l, E.y, E.rx, E.ry, c, id + 'a', { gaze: [0, 1], inward: IN, lid: 1, arc, blink: '--blink-l' }),
    eye(E.r, E.y, E.rx, E.ry, c, id + 'b', { gaze: [0, 1], inward: -IN, lid: -1, arc, blink: '--blink-r' }), brow(c, 'down')],
}

const MOUTHS: Record<string, (c: Coat) => string> = {
  // The default is a small w hung off the nose: two arcs, not a curve.
  neutral: (c) => `<path d="M60 80.4v2.9M60 83.3q-2.1 4.4-6.3 3.3M60 83.3q2.1 4.4 6.3 3.3" fill="none"
      stroke="${c.line}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  smile: (c) => `<path d="M60 80.4v3.1M60 83.5q-3.4 5.8-8.8 4.1M60 83.5q3.4 5.8 8.8 4.1" fill="none"
      stroke="${c.line}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  open: (c) => `<path d="M60 80.8c5.9 0 9.2 1.1 9.2 3.5 0 4.3-4.1 7.8-9.2 7.8s-9.2-3.5-9.2-7.8c0-2.4 3.3-3.5 9.2-3.5Z"
      fill="${c.pupil}"/><path d="M60 91.8c2.7-.2 4.4-1.8 4.4-3.3 0-1.3-2-2.1-4.4-2.1s-4.4.8-4.4 2.1c0 1.5 1.7 3.1 4.4 3.3Z"
      fill="#EE8E96"/>`,
  // A yawn is the open mouth taken as far as it goes, and it is the one shape
  // here that is taller than it is wide.
  yawn: (c) => `<path d="M60 79.4c6.5 0 10.3 1.3 10.3 4 0 6.9-4.6 12.6-10.3 12.6s-10.3-5.7-10.3-12.6c0-2.7 3.8-4 10.3-4Z"
      fill="${c.pupil}"/><path d="M60 95.4c3.1-.3 5.2-2.7 5.2-4.6 0-1.6-2.3-2.6-5.2-2.6s-5.2 1-5.2 2.6c0 1.9 2.1 4.3 5.2 4.6Z"
      fill="#EE8E96"/>`,
  frown: (c) => `<path d="M60 80.4v2.9M53.8 87.8q6.2-4.8 12.4 0" fill="none" stroke="${c.line}"
      stroke-width="2.4" stroke-linecap="round"/>`,
}

// `squash` is how hard her chin is pressed into the carpet: 1 flat out, 0
// head up. `ear` perks or flattens both ears; it is the difference between a cat that
// has just woken up and one that has heard something. `gaze` moves the pupils
// without moving the head, which is the cheaper and more feline of the two.
// How lidded each eye variant sits before any blink is applied. It belongs to
// the variant, not the mood, because the rig renders each variant once and
// then only chooses between them.
// Only two of these are allowed to change the eye's shape, and both have a
// reason you could name: asleep, where the eye is shut, and cross, where a lid
// comes down at an angle. Everything else keeps the circle and says what it
// means with gaze, tilt, ears and mouth. An eye quietly squeezed into a lens
// reads as a different animal, not a different mood.
export const VARIANT_LID: Record<string, number> = {
  open: 0, wide: 0, happy: 0, sleepy: 0, sad: 0, curious: 0, angry: 0.24,
}

export { EAR_TURN }

export const MOODS: Record<string, Mood> = {
  idle:      { eyes: 'open',    mouth: 'neutral', squash: 0.85, label: 'Idle' },
  happy:     { eyes: 'happy',   mouth: 'smile', squash: 0.78,   label: 'Happy' },
  sleepy:    { eyes: 'sleepy',  mouth: 'neutral', squash: 1, label: 'Sleepy', tilt: -4, ear: 'flat' },
  yawn:      { eyes: 'sleepy',  mouth: 'yawn', squash: 0.95,    label: 'Yawn',   tilt: -3, ear: 'flat' },
  curious:   { eyes: 'curious', mouth: 'neutral', squash: 0.5, label: 'Curious', tilt: 7 },
  surprised: { eyes: 'wide',    mouth: 'open', squash: 0.32,    label: 'Surprised', ear: 'perk' },
  celebrate: { eyes: 'happy',   mouth: 'open', squash: 0.4,    label: 'Celebrate', tilt: -3, ear: 'perk' },
  sad:       { eyes: 'sad',     mouth: 'frown', squash: 0.9,   label: 'Sad' },
  grumpy:    { eyes: 'angry',   mouth: 'neutral', squash: 0.8, label: 'Grumpy' },
  lookUpL:   { eyes: 'open',    mouth: 'neutral', squash: 0.45, label: 'Look up left',
               gaze: [-4.5, -4], tilt: 5, ear: 'perk' },
  lookUpR:   { eyes: 'open',    mouth: 'neutral', squash: 0.45, label: 'Look up right',
               gaze: [4.5, -4], tilt: -5, ear: 'perk' },

  // Looking down, which is most of what she will be doing: she sits above the
  // card and the card is what there is to look at. Three of them, because a
  // gaze that never moves across what it is reading is a stare.
  //
  // The pupils drop and the head comes down with them. No lid: reading is not
  // a different eye, it is the same eye pointed somewhere else.
  lookDownL: { eyes: 'open', mouth: 'neutral', squash: 0.95, label: 'Look down left',
               gaze: [-4.5, 4.5], tilt: 3 },
  lookDownC: { eyes: 'open', mouth: 'neutral', squash: 0.98, label: 'Look down',
               gaze: [0, 5], tilt: 0 },
  lookDownR: { eyes: 'open', mouth: 'neutral', squash: 0.95, label: 'Look down right',
               gaze: [4.5, 4.5], tilt: -3 },
}

// --- drawing ---------------------------------------------------------------
// Pivots are declared here rather than left to whoever animates her later. An
// ear that twitches around its own centre looks like it came loose; it has to
// turn about its base, which is a point only this file knows.

const PIVOT: Record<string, string> = {
  head: '60px 100px',   // the neck — a tilt should swing, not spin
  earL: '28px 40px',   //
  earR: '92px 40px',   // each ear about where it meets the skull
  eyeL: `${EYE.l}px ${EYE.y}px`,
  eyeR: `${EYE.r}px ${EYE.y}px`,
  pawL: '27px 104px',  // the paws pivot on the edge they are hooked over
  pawR: '93px 104px',
}
// One transform channel, not two. A `transform` attribute and a CSS
// transform-origin on the same element do not sit side by side: Chrome reads
// the attribute AS the CSS property, so the origin applies to it too and the
// part rotates about a point twice removed from the one asked for. That is
// what had the ears drifting off the skull on every tilted mood. Everything
// static goes through CSS here, which is also the channel an animation will
// use later.
const pin = (o: string, deg: string | number = 0, dx = 0, dy = 0, extra = '') => {
  const t = []
  if (dx || dy) t.push(`translate(${dx}px, ${dy}px)`)
  if (deg) t.push(`rotate(${typeof deg === 'string' ? deg : `${deg}deg`})`)
  if (extra) t.push(extra)
  return `transform-box:view-box;transform-origin:${o}${t.length ? `;transform:${t.join(' ')}` : ''}`
}

// ---------------------------------------------------------------------------
// The animation hooks.
//
// A pose and its animation must not fight over the same transform, and they
// will if both are written into it: the pose is set once when the mood
// changes, the animation runs sixty times a second, and whichever wrote last
// wins. So the pose is baked into the transform expression and the animation
// drives registered custom properties inside it. They compose instead of
// overwriting, and both copies of an ear — the outline layer and the fill
// layer — read the same variable and stay in step for free.
//
// Only transforms are animated. Nothing here touches a path's `d`: a squash
// that regenerates the head outline would rebuild and re-parse a path every
// frame, and path data is the one thing the compositor cannot help with.
// Breathing is a scale about the floor, which costs nothing.
const BREATH = 'scaleX(calc(1 - var(--breath, 0) * 0.006)) scaleY(calc(1 + var(--breath, 0) * 0.013))'

// --- the rig's pose channels -----------------------------------------------
// Squash stops being a path and becomes a transform.
//
// headPath(q) was right about the shape and wrong about the cost: a squash
// that regenerates the outline cannot be blended, because every frame of the
// blend is a new path string to build and re-parse. Scaling about the floor
// gets within a few percent of the same geometry — at the most extreme mood
// it is 0.92 across and 1.06 up — and it is free, continuous, and something
// two poses can meet in the middle of.
//
// The numbers come from headPath itself: at full lift it drew the lower half
// at 46/52 of its resting width and the head 91/84 of its resting height.
const LIFT = '(1 - var(--sq, 0.85))'
const SX = `(1 - ${LIFT} * 0.115 - var(--breath, 0) * 0.006)`
const SY = `(1 + ${LIFT} * 0.083 + var(--breath, 0) * 0.013)`
// The lift is a translate as well as a stretch. Scaling about the floor makes
// the crown rise while the chin stays welded to it, which is a head being
// pulled taller rather than a head coming up — the difference between a cat
// looking up and a cat being stretched by someone off-screen. Raising the
// whole thing as it narrows is what makes it read as her own movement.
//
// Outermost in the list, so it moves the already-deformed head rather than
// being scaled along with everything else.
const POSE_HEAD =
  `translateY(calc(${LIFT} * -5px)) ` +
  `rotate(var(--tilt, 0deg)) scaleX(calc(${SX})) scaleY(calc(${SY}))`

// The skull deforms; the things sitting in it do not. An eye is a circle and
// a squashed circle is a different eye — she goes from alert to sleepy just
// because her head met the carpet, which is not a mood anyone chose.
//
// Each feature undoes the head's scale about its OWN centre, so it keeps its
// shape while still being carried wherever the deformation puts it. Position
// follows the face, proportion does not.
const UNSQUASH = `scaleX(calc(1 / ${SX})) scaleY(calc(1 / ${SY}))`
// Each ear has its OWN huff channel, so an irritated cat can lay back both
// ears, or one, or neither. Driving them from the same value as the nose made
// every huff identical, and a tic that repeats exactly is a mechanism rather
// than a mood.
const POSE_EAR = (side: 'l' | 'r') => {
  const out = side === 'l' ? 1 : -1
  return `translate(calc(${LIFT} * ${out * 2.5}px), calc(${LIFT} * -4px)) ` +
    `rotate(calc(var(--ear-${side}, 0deg) + var(--twitch-${side}, 0deg) + var(--huff-${side}, 0) * ${out * 15}deg))`
}
// The idle glance and the mood's own gaze are separate channels that add, so
// her eyes can drift while she is also looking somewhere on purpose.
// Sleeping cats work their paws. Each turns about where it meets the ledge,
// and the two run in antiphase on a period that is not a multiple of the
// breath's — beats that share a factor resolve into one pattern.
const POSE_PAW = (side: 'l' | 'r') =>
  `rotate(calc(var(--paw-${side}, 0deg) + var(--shake, 0) * var(--shake-gain, 0) * 5deg)) ` +
  `translateY(calc(var(--paw-${side}-y, 0px) + var(--bob, 0) * var(--bob-gain, 0) * -6px))`
const POSE_GAZE =
  'translate(calc(var(--gaze-x, 0px) + var(--gaze-px, 0px)), calc(var(--gaze-y, 0px) + var(--gaze-py, 0px)))'
const TWITCH = (deg: number, v: string) => `calc(${deg}deg + var(${v}, 0deg))`
// Kept small. The base of the ear is hidden behind the skull, and these are
// the angles that stay hidden — turn it further and the ear visibly unhooks.
const EAR_TURN: Record<string, number> = { perk: -6, flat: 10 }

let uid = 0

export function catSvg({ coat = 'calico', mood = 'idle', rim = false, shade = true, size = 160, rig = false } = {}) {
  const base = COATS[coat]
  // Resolved once, here, rather than at each of the twenty places that draw a
  // line. Everything downstream — the silhouette, the whiskers, the mouth, the
  // lash, the toes, the z's — reads c.line and gets the right one.
  const c = rim && base.lineDark ? { ...base, line: base.lineDark } : base
  const m = MOODS[mood]
  const id = `c${uid++}`
  // The variant's own lid, then the mood's bias on top of what is still open —
  // the same stacking the blink uses, so a still frame matches the rig.
  const lid0 = m.arc ?? LID_OPEN
  const [eyeL, eyeR, brows] = EYES[m.eyes](c, id, m.gaze ?? [0, 0], lid0 + (m.lid ?? 0) * (1 - lid0))
  const pawFur = `fill="${c.paw ?? c.base}"`
  const turn = m.ear ? (EAR_TURN[m.ear] ?? 0) : 0
  // In rig mode the pose is not baked in. Every channel reads a custom
  // property instead, so one element can hold any mood and two moods can be
  // blended by transitioning the properties rather than swapping drawings.
  const headStyle = rig ? pin(PIVOT.head, 0, 0, 0, POSE_HEAD) : pin(PIVOT.head, m.tilt ?? 0, 0, 0, BREATH)
  const earStyle = (side: 'l' | 'r') => rig
    ? pin(side === 'l' ? PIVOT.earL : PIVOT.earR, 0, 0, 0, POSE_EAR(side))
    : pin(side === 'l' ? PIVOT.earL : PIVOT.earR,
          TWITCH(side === 'l' ? turn : -turn, `--twitch-${side}`),
          side === 'l' ? earDx : -earDx, earDy)

  // Every eye, mouth and brow is drawn once and all but one hidden. Swapping
  // by visibility rather than re-rendering is what lets the idle loop keep
  // running across a mood change: a fresh SVG would restart the breath and
  // drop every scheduled beat mid-flight.
  // `display`, not `hidden`. The HTML hidden attribute works through a UA
  // stylesheet rule that only targets HTML elements — on an SVG group it is
  // inert, so every variant drew at once and she wore all seven expressions
  // simultaneously.
  const off = (shown: boolean) => (shown ? '' : ' display="none"')
  const eyeSets = rig ? Object.entries(EYES).map(([name, fn]) => {
    const [l, r, br] = fn(c, id + name, [0, 0], VARIANT_LID[name] ?? LID_OPEN)
    return { name, l, r, br, shown: name === m.eyes }
  }) : []
  const side = (k: 'l' | 'r') => eyeSets.map((v) =>
    `<g data-eyes="${v.name}"${off(v.shown)}>${v[k]}</g>`).join('')
  const browSets = rig
    ? ['none', 'up', 'down'].map((n) =>
        `<g data-brow="${n}"${off((brows ? (brows.includes('q-5.5') ? 'up' : 'down') : 'none') === n)}>${
          n === 'none' ? '' : brow(c, n as 'up' | 'down')}</g>`).join('')
    : brows
  const mouthSets = rig
    ? Object.entries(MOUTHS).map(([n, fn]) =>
        `<g data-mouth="${n}"${off(n === m.mouth)}>${fn(c)}</g>`).join('')
    : MOUTHS[m.mouth](c)
  // How far off the carpet this mood holds its head. Anything that looks up
  // or reacts lifts; anything drowsy presses back down.
  const q = m.squash ?? 0.85
  const lift = 1 - q
  const HEAD = headPath(rig ? 1 : q)
  // The brow narrows by 3 and rises by 7 across the full range; the ears and
  // the face have to travel with it or they come unstuck from the skull.
  // The ears follow the brow up, but only about half as far as it travels.
  // The skull narrows as it lifts, and an ear that rides the full 7 units
  // ends up above the part of the head still wide enough to hold it.
  const earDx = 2.5 * lift, earDy = -4 * lift
  const faceDy = -3.5 * lift

  // Patches carry onto the ears — a calico's black side takes its ear with
  // it. Stripes do not: they are laid out for the forehead, and letting them
  // through the ear clip just drops fragments of band on the ear backs.
  const patches = (c.patches ?? []).map((p) =>
    `<path d="${p.d}" fill="${p.fill}"${p.soft ? ` filter="url(#${id}f)" opacity=".8"` : ''}/>`).join('')
  const stripeFill = c.stripes?.fill ?? 'none'
  const stripes = (c.stripes?.d ?? []).map((e) =>
    `<ellipse cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}"${e.rot ? ` transform="rotate(${e.rot} ${e.cx} ${e.cy})"` : ''} fill="${stripeFill}"/>`).join('')
  const marks = patches + stripes

  // Shading, kept to three moves. A light from the upper left that the whole
  // head shares, a darkening where one form passes behind another, and
  // nothing else — the moment fur gets its own texture she stops belonging
  // beside an interface that has no illustration anywhere else in it.
  const volume = shade ? `<path class="cat-shade" d="${HEAD}" fill="url(#${id}v)"/>` : ''
  const contact = shade
    ? `<g class="cat-contact" clip-path="url(#${id}body)" filter="url(#${id}b)" opacity="${c.dark ? '.34' : '.26'}">
      <ellipse cx="27" cy="84" rx="16" ry="7" fill="#000"/>
      <ellipse cx="93" cy="84" rx="16" ry="7" fill="#000"/>
    </g>` : ''
  const pawVolume = shade ? `fill="url(#${id}p)"` : ''

  // In dark mode the outline is joined by a rim of light rather than swapped
  // for one — the same move the app already makes with its shadows, which are
  // cast in light on a dark page instead of in ink.
  // It has to sit inside the groups that carry the pose. Drawn once at the top
  // level it never moved, so the moment she tilted or squashed it stayed
  // behind as a second outline hanging in the air where she used to be.
  // Her whole outline — ears, head and paws — as one set of paths, each still
  // inside the group that carries its own pose. Written once because the rim
  // and the line have to trace exactly the same silhouette; two copies of this
  // would eventually disagree.
  const silhouette = `<g class="cat-head" style="${headStyle}">
      <g class="cat-ear cat-ear-l" style="${earStyle('l')}"><path d="${EAR_L}"/></g>
      <g class="cat-ear cat-ear-r" style="${earStyle('r')}"><path d="${EAR_R}"/></g>
      <path d="${HEAD}"/>
    </g>
    <g class="cat-paw cat-paw-l" style="${pin(PIVOT.pawL, 0, 0, 0, POSE_PAW('l'))}"><path d="${PAW_L}"/></g>
    <g class="cat-paw cat-paw-r" style="${pin(PIVOT.pawR, 0, 0, 0, POSE_PAW('r'))}"><path d="${PAW_R}"/></g>`

  const catRim = rim
    ? `<g class="cat-rim" fill="none" stroke="#fff" stroke-width="9" opacity=".15"
      stroke-linejoin="round">${silhouette}</g>` : ''

  // The drawing is laid out in a 120x108 field and the frame is wider than
  // that on every side, because almost everything she does makes her briefly
  // bigger than her resting pose. A seven-degree tilt swings the far ear tip
  // about eight units sideways and five up; a lifted squash stretches her and
  // then raises the whole head on top of that; a huff lays the ears back.
  //
  // Measured rather than guessed: across the tilt and squash range her ears
  // reach y = -9.1, which a top edge at -10 was clipping the moment two of
  // those combined. The margin is now ten units clear at the top, where every
  // one of those effects points.
  return `<svg viewBox="-14 -20 148 134" width="${size}" height="${size * 134 / 148}"
  xmlns="http://www.w3.org/2000/svg" class="cat" role="img" aria-label="${c.name} cat, ${m.label.toLowerCase()}">
  <defs>
    <clipPath id="${id}body"><path d="${HEAD}"/></clipPath>
    <clipPath id="${id}s"><path d="${HEAD}"/></clipPath>
    <clipPath id="${id}el"><path d="${EAR_L}"/></clipPath>
    <clipPath id="${id}er"><path d="${EAR_R}"/></clipPath>
    <filter id="${id}b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.5"/></filter>
    <!-- A Siamese's points have no edge. Three and a half units of blur still
         left one — a soft line is still a line — so the soft patches get their
         own filter at twice the spread, and a fill closer to the coat so there
         is less distance for the blur to cover in the first place. -->
    <filter id="${id}f" x="-45%" y="-45%" width="190%" height="190%"><feGaussianBlur stdDeviation="8"/></filter>
    <radialGradient id="${id}v" cx="38%" cy="24%" r="82%">
      <stop offset="0%" stop-color="#fff" stop-opacity=".34"/>
      <stop offset="52%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity=".15"/>
    </radialGradient>
    <linearGradient id="${id}p" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff" stop-opacity=".3"/>
      <stop offset="60%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity=".1"/>
    </linearGradient>
  </defs>
  ${catRim}
  <!-- She is one shape, so she gets one outline — paws included. Every stroke
       is laid down first and every fill goes over the top of all of them: any
       stroke that falls inside the union is painted out, and what survives is
       only the outer boundary.

       That is why the paws are in here rather than carrying their own. Drawn
       separately they came with a full outline each, so a line ran between a
       paw and the face it rests against — she read as a cat with two objects
       in front of her rather than as a cat with her paws up.

       The width is doubled because the fills cover the inner half of it,
       leaving 2.6 showing on the outside. -->
  <g class="cat-outline" fill="none" stroke="${c.line}" stroke-width="5.2" stroke-linejoin="round">
    ${silhouette}
  </g>
  <g class="cat-head" style="${headStyle}">
    <g class="cat-ear cat-ear-l" style="${earStyle('l')}">
      <path d="${EAR_L}" fill="${c.base}"/>
      <g clip-path="url(#${id}el)">${patches}
        <path class="cat-ear-in" d="${EAR_L_IN}" fill="${c.earPatch ?? c.ear}"/></g>
    </g>
    <g class="cat-ear cat-ear-r" style="${earStyle('r')}">
      <path d="${EAR_R}" fill="${c.base}"/>
      <g clip-path="url(#${id}er)">${patches}
        <path class="cat-ear-in" d="${EAR_R_IN}" fill="${c.earPatch ?? c.ear}"/></g>
    </g>
    <path class="cat-skull" d="${HEAD}" fill="${c.base}"/>
    <g class="cat-coat" clip-path="url(#${id}s)">${marks}</g>
    <ellipse class="cat-muzzle" transform="translate(0 ${faceDy})" cx="60" cy="75" rx="24" ry="13.5"
      fill="${c.muzzle}" opacity="${c.muzzleAlpha ?? (c.dark ? 0.42 : 0.65)}"/>
    ${volume}
    ${c.chin ? `<ellipse class="cat-chin" clip-path="url(#${id}s)" cx="${c.chin.cx}"
      cy="${c.chin.cy}" rx="${c.chin.rx}" ry="${c.chin.ry}" fill="${c.chin.fill}"/>` : ''}
    <g class="cat-whiskers" transform="translate(0 ${faceDy})" style="transform-box:view-box;transform-origin:60px 78px;transform:rotate(calc(var(--huff,0) * -2.2deg + var(--whisk,0) * 2.1deg)) scaleX(calc(1 + var(--huff,0) * 0.035 + var(--whisk,0) * 0.022))">
      <path d="${WHISKERS}" fill="none" stroke="${c.line}" stroke-width="1.8"
        stroke-linecap="round" opacity=".45"/>
    </g>
    <g class="cat-face" style="${pin('60px 100px', 0, 0, faceDy)}">
      <g class="cat-brows">${browSets}</g>
      <g class="cat-eye cat-eye-l" style="${pin(PIVOT.eyeL, 0, 0, 0, rig ? UNSQUASH : '')}">${rig ? side('l') : eyeL}</g>
      <g class="cat-eye cat-eye-r" style="${pin(PIVOT.eyeR, 0, 0, 0, rig ? UNSQUASH : '')}">${rig ? side('r') : eyeR}</g>
      <g class="cat-mouth" style="transform-box:view-box;transform:translateY(calc(${SNOUT}px + var(--face-dip,0) * 1.5px))">${rig ? mouthSets : MOUTHS[m.mouth](c)}</g>
      <path class="cat-nose" d="${NOSE}" fill="${c.nose ?? (c.dark ? '#C98C86' : '#E29A93')}"
        style="transform-box:view-box;transform-origin:60px 76px;transform:translateY(calc(${SNOUT}px + var(--sniff,0) * -0.7px + var(--face-dip,0) * 1.1px + var(--huff,0) * -1.7px)) scale(calc(1 + var(--sniff,0) * 0.07 + var(--huff,0) * 0.16)) ${rig ? UNSQUASH : ''}"/>
    </g>
  </g>
  ${contact}
  <!-- Empty on purpose. Each z and each heart is spawned here when a mood
       calls for one and removes itself when it has finished rising, so a mark
       already in the air is never cut short by her changing her mind. -->
  <g class="cat-emit" data-ink="${rim ? '#ffffff' : c.line}"></g>
  <g class="cat-paw cat-paw-l" style="${pin(PIVOT.pawL, 0, 0, 0, POSE_PAW('l'))}">
<path d="${PAW_L}" ${pawFur}/><path d="${PAW_L}" ${pawVolume}/>
    <path d="${TOES_L}" fill="none" stroke="${c.line}" stroke-width="2" stroke-linecap="round" opacity=".45"/>
  </g>
  <g class="cat-paw cat-paw-r" style="${pin(PIVOT.pawR, 0, 0, 0, POSE_PAW('r'))}">
<path d="${PAW_R}" ${pawFur}/><path d="${PAW_R}" ${pawVolume}/>
    <path d="${TOES_R}" fill="none" stroke="${c.line}" stroke-width="2" stroke-linecap="round" opacity=".45"/>
  </g>
</svg>`
}

/** The coats, in the order the picker shows them. */
export const COAT_IDS = Object.keys(COATS)
export type CoatId = string
export const DEFAULT_COAT: CoatId = 'calico'
export const coatById = (id: string | null): CoatId => (id && COATS[id] ? id : DEFAULT_COAT)
