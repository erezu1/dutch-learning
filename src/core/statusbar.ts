// ---------------------------------------------------------------------------
// The strip above the app.
//
// On Android a standalone PWA does not draw under the status bar — the system
// fills it with a single flat colour taken from <meta name="theme-color">, and
// that is the whole of the control we have. So the gradient cannot continue up
// there. What it can do is meet it exactly: work out what colour the page is
// at its very top edge right now, and give the bar that. One flat colour, but
// the right one, and it follows the ground as the ground moves, so there is no
// line between the two.
//
// The sum is done here rather than read off the screen because nothing can
// read a pixel back out of a page. It is the same arithmetic the browser does:
// each light is the accent at some strength, fading linearly to nothing at a
// fraction of the distance to its own farthest corner, composited in the order
// they are painted and then over the surface.
// ---------------------------------------------------------------------------

/** How far past the viewport each light extends, matching `inset: -28%`. */
const OVERHANG = 0.28
/** Where each light's colour has faded out, as a fraction of its own radius. */
const FALLOFF = { near: 0.44, far: 0.4 }

type Rgb = [number, number, number]

/** A CSS colour as plain sRGB. A canvas is the only thing that resolves oklch. */
function rgbOf(value: string): Rgb | null {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.fillStyle = value
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    return [r, g, b]
  } catch {
    return null
  }
}

function tokenRgb(name: string): Rgb | null {
  const probe = document.createElement('span')
  probe.style.cssText = `display:none;color:var(${name})`
  document.body.appendChild(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value ? rgbOf(value) : null
}

/** How much of the accent one light contributes at the top-centre of the screen. */
function strengthAt(which: 'near' | 'far'): number {
  const style = getComputedStyle(document.body, which === 'near' ? '::before' : '::after')
  const ambient = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(`--ambient-${which}`),
  )
  if (!Number.isFinite(ambient)) return 0

  const vw = innerWidth
  const vh = innerHeight
  // The light is the viewport plus the overhang on each side, so its centre
  // starts on the centre of the screen and is moved by its own transform.
  const half = { x: vw * (0.5 + OVERHANG), y: vh * (0.5 + OVERHANG) }
  const shift = new DOMMatrixReadOnly(style.transform)
  const centre = { x: vw / 2 + shift.e, y: vh / 2 + shift.f }

  // A `circle` gradient with no size reaches its last stop at the farthest
  // corner of the box it is painted in.
  const radius = Math.hypot(half.x, half.y) * FALLOFF[which]
  const distance = Math.hypot(vw / 2 - centre.x, 0 - centre.y)
  return (ambient / 100) * Math.max(0, 1 - distance / radius)
}

const over = (src: Rgb, dst: Rgb, a: number): Rgb => [
  src[0] * a + dst[0] * (1 - a),
  src[1] * a + dst[1] * (1 - a),
  src[2] * a + dst[2] * (1 - a),
]

let last = ''

/** Works out the colour at the top of the page and gives it to the status bar. */
export function paintStatusBar(): void {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return

  const surface = rgbOf(getComputedStyle(document.body).backgroundColor)
  const accent = tokenRgb('--color-primary')
  if (!surface || !accent) return

  // ::before is painted first and ::after over it, so the far light goes on top.
  let colour = over(accent, surface, strengthAt('near'))
  colour = over(accent, colour, strengthAt('far'))

  const next = `rgb(${colour.map((c) => Math.round(c)).join(' ')})`
  if (next === last) return
  last = next
  meta.setAttribute('content', next)
}

/**
 * Keeps it in step. The lights take a minute and a half to come round, so the
 * colour up there changes by less than a step of anything every few seconds —
 * this is a cheap interval, not an animation.
 */
export function trackStatusBar(): void {
  paintStatusBar()
  setInterval(paintStatusBar, 2000)
  addEventListener('resize', paintStatusBar)
}
