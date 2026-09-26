import type { CatRig } from './cat-rig'
import { MOODS, STAR } from './cat'

// ---------------------------------------------------------------------------
// Tricks: short scenes she plays with something that isn't part of her — a
// ball of yarn, a falling star, a butterfly, a fish. Kept for the rarest thing
// that happens in the app, a new level, and one is picked at random each time
// so it is still a surprise the fourth time.
//
// Everything is drawn inside her own SVG, in her own coordinates (148 units
// across; the SVG overflows), so a thing that lands on her nose lands on her
// nose at any size. Where things come from is worked out from the screen at
// the moment the trick starts: on a phone she is about a hundred pixels tall,
// so the edge of the screen is only a couple of her widths away, and a prop
// thrown from a fixed distance would either start on screen or come from
// nowhere in particular.
//
// She is a head and two paws, so a trick is made of what those can do: her
// eyes follow the thing (each eye on its own, which is how she goes cross-eyed
// when it comes close), her face changes, her paws reach. The paws are moved
// by animating their transform directly, which lays over the knead for as long
// as it runs and hands them back to it when it ends.
// ---------------------------------------------------------------------------

export type Trick = 'yarn' | 'star' | 'butterfly' | 'fish'
export const TRICKS: Trick[] = ['yarn', 'star', 'butterfly', 'fish']

/** A different one from last time, whenever there is a choice. */
export function randomTrick(last?: Trick | null): Trick {
  const pool = TRICKS.filter((t) => t !== last)
  return pool[Math.floor(Math.random() * pool.length)]
}

const LAST = 'doei:last-trick'
/**
 * The trick for a new level: one at random, never the one the last level
 * got. Remembered on this device only, which is all it needs — it is there
 * so the next surprise is a different one, not to keep a record.
 */
export function nextTrick(): Trick {
  let last: string | null = null
  try {
    last = localStorage.getItem(LAST)
  } catch {
    // Private mode, blocked storage: any of them will do.
  }
  const trick = randomTrick(TRICKS.find((t) => t === last) ?? null)
  try {
    localStorage.setItem(LAST, trick)
  } catch {
    // As above.
  }
  return trick
}

const NS = 'http://www.w3.org/2000/svg'
const EYE = { l: [40, 58], r: [80, 58] } as const
/** How far a pupil can travel inside its eye. */
const REACH = 4.4
/** The top of the ledge her paws hang over. */
const FLOOR = 100

type Attrs = Record<string, string | number>
function make<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}, parent?: Element) {
  const el = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v))
  parent?.append(el)
  return el
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const easeOut = (t: number) => 1 - (1 - t) ** 3
const easeIn = (t: number) => t ** 3
const smooth = (t: number) => t * t * (3 - 2 * t)
let uid = 0

/**
 * A value moving through keyframes the way an animation's does: each key is
 * [time from 0 to 1, value], and the easing that carries it there.
 */
type Key = [number, number, ((t: number) => number)?]
function through(keys: Key[], t: number): number {
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, ease = easeInOut] = keys[i]
    if (t <= t1) {
      const [t0, v0] = keys[i - 1]
      return lerp(v0, v1, ease((t - t0) / (t1 - t0 || 1)))
    }
  }
  return keys[keys.length - 1][1]
}

/** n+1 points from a to b, bunched towards a when k > 1. */
const along = (a: number, b: number, n: number, k = 1) =>
  Array.from({ length: n + 1 }, (_, i) => a + (b - a) * (i / n) ** k)

/** A smooth curve through points, closed or not: Catmull-Rom, written as cubic Béziers. */
function curve(points: [number, number][], closed = true): string {
  const n = points.length
  const at = (i: number) => points[closed ? (i + n) % n : clamp(i, 0, n - 1)]
  const f = (v: number) => v.toFixed(2)
  let d = `M${f(points[0][0])} ${f(points[0][1])}`
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [x0, y0] = at(i - 1)
    const [x1, y1] = at(i)
    const [x2, y2] = at(i + 1)
    const [x3, y3] = at(i + 2)
    d += `C${f(x1 + (x2 - x0) / 6)} ${f(y1 + (y2 - y0) / 6)} ${f(x2 - (x3 - x1) / 6)} ${f(y2 - (y3 - y1) / 6)} ${f(x2)} ${f(y2)}`
  }
  return closed ? `${d}Z` : d
}

/** The easing curves CSS names, as functions, for moves the trick runs itself. */
const CURVES: Record<string, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
}
function easing(css: string): (x: number) => number {
  const m = /cubic-bezier\(([^)]+)\)/.exec(css)
  const [x1, y1, x2, y2] = m ? m[1].split(',').map(Number) : (CURVES[css] ?? CURVES['ease-in-out'])
  const b = (t: number, p1: number, p2: number) => 3 * p1 * t * (1 - t) ** 2 + 3 * p2 * t * t * (1 - t) + t ** 3
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let lo = 0
    let hi = 1
    let t = x
    for (let i = 0; i < 24; i++) {
      const v = b(t, x1, x2)
      if (Math.abs(v - x) < 1e-5) break
      if (v < x) lo = t
      else hi = t
      t = (lo + hi) / 2
    }
    return b(t, y1, y2)
  }
}

/** A paw's move: where it is at each moment, as an offset from wherever it would be anyway. */
type PawKey = { at: number; x?: number; y?: number; r?: number; ease?: string }
/** The same move, for the other paw. */
const mirror = (keys: PawKey[]) => keys.map((k) => ({ ...k, x: k.x ? -k.x : 0, r: k.r ? -k.r : 0 }))

/** The visible screen, in her coordinates. */
interface View {
  left: number
  right: number
  top: number
  bottom: number
}

// --- string ------------------------------------------------------------------

interface Knot {
  x: number
  y: number
  px: number
  py: number
}

/**
 * A length of yarn: points joined by fixed lengths, moved by gravity and a
 * breeze and nothing else (Verlet integration), so it swings when the ball it
 * hangs from moves, lies down when it lands, and drifts in the air when it is
 * let go. Either end can be held by something.
 */
class Thread {
  knots: Knot[] = []
  /** Where each held end is, asked every step. */
  held = new Map<number, () => [number, number]>()
  el: SVGPathElement
  private clock = 0

  constructor(
    parent: SVGGElement,
    count: number,
    readonly link: number,
    color: string,
    /** The ledge, where there is one. Past its ends the yarn falls away. */
    readonly floor: { y: number; from: number; to: number },
  ) {
    for (let i = 0; i < count; i++) this.knots.push({ x: 0, y: 0, px: 0, py: 0 })
    this.el = make('path', { fill: 'none', stroke: color, 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent)
  }

  step(dt: number) {
    const h = 1 / 120
    for (let left = dt; left > 0; left -= h) this.tick(Math.min(h, left))
    this.draw()
  }

  private tick(h: number) {
    this.clock += h
    const g = 520
    for (let i = 0; i < this.knots.length; i++) {
      const k = this.knots[i]
      if (this.held.has(i)) continue
      // A breeze that comes and goes, and reaches each bit of the thread a
      // moment after the last, so the yarn ripples rather than swaying as one.
      const wind = 90 * (Math.sin(this.clock * 1.3 + i * 0.35) * 0.7 + Math.sin(this.clock * 3.7 + i * 0.9) * 0.3)
      const onFloor = k.y >= this.floor.y - 0.5 && k.x > this.floor.from && k.x < this.floor.to
      // Yarn is light: the air slows it a lot, which is what makes it trail
      // behind the ball, float as it comes down, and give to the breeze.
      const drag = onFloor ? 0.8 : 0.978
      const vx = (k.x - k.px) * drag
      const vy = (k.y - k.py) * drag
      k.px = k.x
      k.py = k.y
      k.x += vx + (onFloor ? wind * 0.15 : wind) * h * h
      k.y += vy + g * h * h
    }
    for (const [i, at] of this.held) {
      const [x, y] = at()
      const k = this.knots[i]
      k.px = k.x
      k.py = k.y
      k.x = x
      k.y = y
    }
    for (let pass = 0; pass < 10; pass++) {
      for (let i = 0; i < this.knots.length - 1; i++) {
        const a = this.knots[i]
        const b = this.knots[i + 1]
        const ha = this.held.has(i)
        const hb = this.held.has(i + 1)
        if (ha && hb) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d = Math.hypot(dx, dy) || 0.0001
        const diff = (d - this.link) / d
        const wa = ha ? 0 : hb ? 1 : 0.5
        const wb = hb ? 0 : ha ? 1 : 0.5
        a.x += dx * diff * wa
        a.y += dy * diff * wa
        b.x -= dx * diff * wb
        b.y -= dy * diff * wb
      }
      for (const k of this.knots) {
        if (k.x > this.floor.from && k.x < this.floor.to && k.y > this.floor.y) k.y = this.floor.y
      }
    }
  }

  /** A new knot at the held end, as more yarn comes off the ball. */
  payOut(end: number) {
    const k = this.knots[end]
    this.knots.splice(end, 0, { ...k })
    const moved = new Map<number, () => [number, number]>()
    for (const [i, at] of this.held) moved.set(i >= end ? i + 1 : i, at)
    this.held = moved
  }

  draw() {
    const k = this.knots
    let d = `M${k[0].x.toFixed(1)} ${k[0].y.toFixed(1)}`
    for (let i = 1; i < k.length - 1; i++) {
      const mx = (k[i].x + k[i + 1].x) / 2
      const my = (k[i].y + k[i + 1].y) / 2
      d += ` Q${k[i].x.toFixed(1)} ${k[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`
    }
    const last = k[k.length - 1]
    d += ` L${last.x.toFixed(1)} ${last.y.toFixed(1)}`
    this.el.setAttribute('d', d)
  }
}

// --- the scene -----------------------------------------------------------------

/** Everything one trick has put on her, so it can all be taken off again. */
class Scene {
  stopped = false
  readonly back: SVGGElement
  readonly front: SVGGElement
  readonly view: View
  private frames = new Set<number>()
  private pending = new Set<() => void>()
  private outlined = new Set<SVGPathElement>()
  /** The face the trick last gave her. */
  private worn = ''
  /** Whether the trick has taken her mouth over at any point. */
  private mouthed = false

  constructor(readonly rig: CatRig) {
    const svg = rig.svg
    // Behind her paws, in front of her face: a star held in her paws is behind
    // them, a butterfly on her nose is on top of it.
    const firstPaw = svg.querySelector(':scope > .cat-paw')
    this.back = make('g', { class: 'cat-trick' })
    svg.insertBefore(this.back, firstPaw)
    this.front = make('g', { class: 'cat-trick' }, svg)
    svg.dataset.trick = ''
    this.view = viewOf(svg)
  }

  /** Runs `fn` every frame for `ms` (or until it returns true), with t from 0 to 1 and dt in seconds. */
  tween(ms: number, fn: (t: number, dt: number) => void | boolean): Promise<void> {
    return new Promise((resolve) => {
      if (this.stopped) return resolve()
      // Ending the scene settles every tween still waiting, so a trick cut off
      // in the middle runs out to its end at once instead of hanging there.
      const finish = () => {
        this.pending.delete(finish)
        resolve()
      }
      this.pending.add(finish)
      const start = performance.now()
      let last = start
      const step = (now: number) => {
        if (this.stopped) return finish()
        const t = clamp((now - start) / ms, 0, 1)
        const done = fn(t, Math.min(0.05, (now - last) / 1000))
        last = now
        if (t < 1 && done !== true) this.frames.add(requestAnimationFrame(step))
        else finish()
      }
      this.frames.add(requestAnimationFrame(step))
    })
  }

  wait(ms: number): Promise<void> {
    return this.tween(ms, () => {})
  }

  /**
   * The last thing a scene does: whatever it drew that is still showing fades
   * out, so a trick ends on her alone. Each trick clears up after itself —
   * the fish is eaten, the butterfly and the ball leave the screen, the dust
   * and the thread fade — and this is for anything that has not: nothing a
   * trick brought is ever still there when it ends, and nothing vanishes.
   */
  async clear(ms = 240): Promise<void> {
    await this.tween(ms, (t) => {
      const o = (1 - smooth(t)).toFixed(3)
      this.back.setAttribute('opacity', o)
      this.front.setAttribute('opacity', o)
    })
  }

  /** Each eye looks at the point on its own, so something close makes her cross-eyed. */
  look(x: number, y: number) {
    if (this.stopped) return
    for (const side of ['l', 'r'] as const) {
      const [ex, ey] = EYE[side]
      const dx = x - ex
      const dy = y - ey
      const d = Math.hypot(dx, dy) || 1
      const k = Math.min(1, d / 26)
      const g = this.rig.svg.querySelector<SVGGElement>(`.cat-eye-${side}`)
      g?.style.setProperty('--gaze-px', `${((dx / d) * REACH * k).toFixed(2)}px`)
      g?.style.setProperty('--gaze-py', `${clamp((dy / d) * REACH * k, -4, 5).toFixed(2)}px`)
    }
  }

  /** Back to wherever her mood is looking. */
  unlook() {
    for (const side of ['l', 'r'] as const) {
      const g = this.rig.svg.querySelector<SVGGElement>(`.cat-eye-${side}`)
      g?.style.removeProperty('--gaze-px')
      g?.style.removeProperty('--gaze-py')
    }
  }

  /**
   * Moves a paw, fill and outline together. Each key is an offset — shifted,
   * lifted (negative y is up) and turned about the point where it hooks over
   * the ledge — on the paw's trick channels, which her pose adds after its
   * own: the knead, a pleased cat's lift, a tremble all carry on underneath,
   * so the paw leaves from exactly where it was and comes back to exactly
   * where it would have been. The first and last keys are rest. Each key's
   * easing is the curve out of it, as in CSS.
   */
  paw(side: 'l' | 'r', keys: PawKey[], ms: number): Promise<void> {
    if (this.stopped) return Promise.resolve()
    const svg = this.rig.svg
    const fur = this.outline(side)
    const curves = keys.map((k) => easing(k.ease ?? 'ease-in-out'))
    // Its line comes with it: there as the paw leaves the ledge and gone as
    // it lands, never switched on or off in a frame.
    const lit = (k: PawKey) => (k.x || k.y || k.r ? 1 : 0)
    const set = (x: number, y: number, r: number, line: number) => {
      svg.style.setProperty(`--t-paw-${side}-x`, `${x.toFixed(2)}px`)
      svg.style.setProperty(`--t-paw-${side}-y`, `${y.toFixed(2)}px`)
      svg.style.setProperty(`--t-paw-${side}-r`, `${r.toFixed(2)}deg`)
      if (fur) fur.style.strokeOpacity = line.toFixed(3)
    }
    return this.tween(ms, (t) => {
      let i = 0
      while (i < keys.length - 2 && t > keys[i + 1].at) i++
      const a = keys[i]
      const b = keys[i + 1]
      const p = curves[i](clamp((t - a.at) / (b.at - a.at || 1), 0, 1))
      set(lerp(a.x ?? 0, b.x ?? 0, p), lerp(a.y ?? 0, b.y ?? 0, p), lerp(a.r ?? 0, b.r ?? 0, p), lerp(lit(a), lit(b), p))
    })
  }

  /**
   * Her paws' outline is drawn behind her head, with the rest of her
   * silhouette — right while they rest on the ledge below it, wrong the moment
   * one comes up in front of her face: cream fur over a cream muzzle with its
   * line hidden behind the head, and the paw is simply gone. So a paw that a
   * trick moves carries its own line, under its fill, at the real one's width,
   * shown while it is off the ledge.
   */
  private outline(side: 'l' | 'r'): SVGPathElement | null {
    const ink = this.rig.svg.querySelector('.cat-outline')?.getAttribute('stroke') ?? '#5A4A3E'
    const fur = this.rig.svg.querySelector<SVGPathElement>(`:scope > .cat-paw-${side} > path`)
    if (!fur) return null
    if (!this.outlined.has(fur)) {
      fur.style.stroke = ink
      fur.style.strokeWidth = '5.2'
      fur.style.strokeLinejoin = 'round'
      fur.style.paintOrder = 'stroke'
      fur.style.strokeOpacity = '0'
      this.outlined.add(fur)
    }
    return fur
  }

  /**
   * Her head, moved by the trick: a rise and a tilt ADDED to whatever her mood
   * has it doing, on channels of their own. A move starts from nothing and
   * ends at nothing, so her head leaves from wherever it was and lands
   * wherever her mood has taken it meanwhile — never a step, whatever the
   * mood underneath is doing.
   */
  head(rise: number, tilt = 0) {
    if (this.stopped) return
    this.rig.svg.style.setProperty('--t-rise', rise.toFixed(2))
    this.rig.svg.style.setProperty('--t-tilt', `${tilt.toFixed(2)}deg`)
  }

  /**
   * Her face for a moment of the trick. A face, not a feeling: the grumpy one
   * borrowed for a swat must not count as losing her temper — no sulk after
   * it to cool her next smile, no shaking the next time — so her temper is
   * left the way it was. Asking again for the face she has changes nothing.
   */
  mood(name: string) {
    if (this.stopped || name === this.worn) return
    this.worn = name
    const { sulkUntil, cross } = this.rig
    this.rig.sulkUntil = 0
    this.rig.pose(name)
    this.rig.sulkUntil = sulkUntil
    this.rig.cross = cross
  }

  /**
   * One of her mouths, whatever her mood says — for the few a trick needs
   * that no mood has, like chewing — or none, while the trick draws its own.
   * The next face the trick gives her brings her own mouth back.
   */
  mouth(name: string) {
    if (this.stopped) return
    this.mouthed = true
    this.worn = ''
    for (const el of this.rig.svg.querySelectorAll<SVGGElement>('.cat-mouth [data-mouth]')) {
      el.setAttribute('display', el.dataset.mouth === name ? 'inline' : 'none')
    }
  }

  /**
   * What an element of hers is doing right now: the matrix from its own
   * coordinates into hers, with everything her head is doing to it — the
   * rise, the tilt, the breath — included.
   */
  matrix(el: SVGGraphicsElement): DOMMatrix | null {
    const svg = this.rig.svg.getScreenCTM()
    const own = el.getScreenCTM()
    return svg && own ? svg.inverse().multiply(own) : null
  }

  /** Where an element of hers is right now, in her coordinates. */
  box(el: Element): { x: number; y: number; w: number; h: number } | null {
    const m = this.rig.svg.getScreenCTM()
    if (!m) return null
    const r = el.getBoundingClientRect()
    const inv = m.inverse()
    const a = new DOMPoint(r.left, r.top).matrixTransform(inv)
    const b = new DOMPoint(r.right, r.bottom).matrixTransform(inv)
    return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }
  }

  end() {
    if (this.stopped) return
    this.stopped = true
    for (const id of this.frames) cancelAnimationFrame(id)
    for (const finish of [...this.pending]) finish()
    for (const p of this.outlined) {
      for (const prop of ['stroke', 'stroke-width', 'stroke-linejoin', 'paint-order', 'stroke-opacity']) {
        p.style.removeProperty(prop)
      }
    }
    const svg = this.rig.svg
    for (const name of ['--t-rise', '--t-tilt', ...['l', 'r'].flatMap((p) => ['x', 'y', 'r'].map((c) => `--t-paw-${p}-${c}`))]) {
      svg.style.removeProperty(name)
    }
    // Whatever mouth the trick left her with, back to her mood's own.
    if (this.mouthed) {
      const want = MOODS[this.rig.current]?.mouth
      for (const el of svg.querySelectorAll<SVGGElement>('.cat-mouth [data-mouth]')) {
        el.setAttribute('display', el.dataset.mouth === want ? 'inline' : 'none')
      }
    }
    this.back.remove()
    this.front.remove()
    this.unlook()
    delete svg.dataset.trick
  }
}

function viewOf(svg: SVGSVGElement): View {
  const m = svg.getScreenCTM()
  if (!m) return { left: -200, right: 320, top: -260, bottom: 200 }
  const inv = m.inverse()
  const a = new DOMPoint(0, 0).matrixTransform(inv)
  const b = new DOMPoint(window.innerWidth, window.innerHeight).matrixTransform(inv)
  return { left: a.x, right: b.x, top: a.y, bottom: b.y }
}

const playing = new WeakMap<CatRig, { scene: Scene; done: Promise<void> }>()

/**
 * Plays one trick and resolves when she has finished with it. One at a time:
 * asked for another while she is in the middle of one, she carries on with the
 * one she is doing, and the answer is when that one ends. Touching her does
 * nothing either until it is over — the rig ignores taps while a trick is on
 * her — so nothing interrupts a scene but leaving the screen (`stopTrick`).
 */
export function playTrick(rig: CatRig, trick: Trick): Promise<void> {
  const running = playing.get(rig)
  if (running) return running.done
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve()
  const scene = new Scene(rig)
  const done = perform(rig, scene, trick)
  playing.set(rig, { scene, done })
  return done
}

/** Ends the trick she is in the middle of, where it is: for when she is going away. */
export function stopTrick(rig: CatRig) {
  const running = playing.get(rig)
  if (!running) return
  playing.delete(rig)
  running.scene.end()
}

async function perform(rig: CatRig, s: Scene, trick: Trick): Promise<void> {
  // On her back she gets up first, quickly: a trick is for a cat the right
  // way up, and her faces do not reach her while she is over.
  while (rig.flip.engaged && !s.stopped) {
    if (rig.flip.turning) await s.wait(150)
    else await new Promise<void>((up) => rig.flipBack({ quick: true, into: 'curious' }, up))
  }
  // Asleep, she wakes into it rather than with a start. Waking takes her off
  // the ledge — a jump, the first thing the scene would do — and the startle
  // belongs to the app's own beats; here the surprise is the trick.
  if (rig.current === 'sleepy') rig.pose('idle')
  // Held for the length of the scene, so nothing of hers — a drift, a glance
  // back to rest — takes over halfway through. The trick poses her itself.
  rig.react('curious', { ms: 30000, min: 0 })
  // No hearts while she is busy: the celebrate face is borrowed for moments
  // that are not the end of a day.
  const starring = rig.starring
  rig.starring = true
  try {
    await PLAY[trick](s)
    await s.clear()
  } finally {
    rig.starring = starring
    // Stopped from outside, she is already being taken away: nothing more.
    if (playing.get(rig)?.scene === s) {
      playing.delete(rig)
      s.end()
      rig.react('happy', { ms: 1800, min: 0 })
    }
  }
}

// --- the props -------------------------------------------------------------

/**
 * A ball of yarn, drawn the way yarn is drawn: the ball divided into wraps
 * that lie over one another at different angles, each one a band of parallel
 * strands curving round the ball, its edges where it crosses the wrap below.
 * The first layer goes all the way round; three more are laid over it.
 */
function yarnBall(parent: SVGGElement, r: number) {
  const g = make('g', {}, parent)
  const spin = make('g', {}, g)
  const id = `trk${uid++}`
  const defs = make('defs', {}, spin)
  const clip = make('clipPath', { id: `${id}c` }, defs)
  make('circle', { r }, clip)
  const shade = make('radialGradient', { id: `${id}s`, cx: 0.34, cy: 0.3, r: 0.8 }, defs)
  make('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0.3 }, shade)
  make('stop', { offset: 0.5, 'stop-color': '#fff', 'stop-opacity': 0 }, shade)
  make('stop', { offset: 1, 'stop-color': '#3A0B16', 'stop-opacity': 0.4 }, shade)
  const BASE = '#D6495A'
  const STRAND = '#A32E41'
  const LIGHT = '#EE7B89'
  make('circle', { r, fill: BASE }, spin)
  const wound = make('g', { 'clip-path': `url(#${id}c)` }, spin)
  /** One line of yarn across the ball, bowed the way a strand round a sphere is. */
  const strand = (band: SVGGElement, y: number, bow: number, color: string, width: number) =>
    make('path', {
      d: `M${(-r * 1.3).toFixed(2)} ${y.toFixed(2)} Q0 ${(y - bow).toFixed(2)} ${(r * 1.3).toFixed(2)} ${y.toFixed(2)}`,
      fill: 'none',
      stroke: color,
      'stroke-width': width,
      'stroke-linecap': 'round',
    }, band)
  // The bottom layer, all the way round.
  const under = make('g', { transform: 'rotate(8)' }, wound)
  for (let i = -5; i <= 5; i++) strand(under, (i / 5.2) * r, r * 0.4, i % 2 ? LIGHT : STRAND, 1.1)
  // The wraps over it: [angle, from, to] in units of the radius.
  const wraps: [number, number, number][] = [
    [38, -0.12, 0.55],
    [-50, -0.72, -0.08],
    [102, -0.32, 0.3],
  ]
  for (const [angle, a, b] of wraps) {
    const band = make('g', { transform: `rotate(${angle})` }, wound)
    const bow = r * 0.42
    const y1 = a * r
    const y2 = b * r
    const w = r * 1.3
    // The wrap covers what it lies on, and its edges are the darkest lines.
    make('path', {
      d: `M${-w} ${y1} Q0 ${y1 - bow} ${w} ${y1} L${w} ${y2} Q0 ${y2 - bow} ${-w} ${y2} Z`,
      fill: BASE,
    }, band)
    const n = 4
    for (let k = 1; k <= n; k++) strand(band, lerp(y1, y2, k / (n + 1)), bow, k % 2 ? LIGHT : STRAND, 1)
    strand(band, y1, bow, STRAND, 1.5)
    strand(band, y2, bow, STRAND, 1.5)
  }
  // Round: light from the upper left, like everything else of hers.
  make('circle', { r, fill: `url(#${id}s)` }, spin)
  make('circle', { r, fill: 'none', stroke: '#7B2030', 'stroke-width': 1.4 }, spin)
  return { g, spin }
}

// The fish. Its shape is written down once, as how far it reaches above and
// below its middle at each point along it; the drawing is made from that, and
// so is her mouth when it closes on the fish.

/** How much bigger than its own units the fish is drawn. */
const FISH = 1.4
/** Nose to the root of the tail, and nose to the tips of it, in its own units. */
const BODY = 32
const SPAN = 43.5
/** Nose to tail, as drawn. */
const FISH_LENGTH = SPAN * FISH

const bump = (u: number, a: number, b: number, h: number) =>
  u > a && u < b ? h * Math.sin((Math.PI * (u - a)) / (b - a)) : 0
/** Half the depth of its body: a blunt head, deepest a third of the way back, narrowing to the tail. */
const girth = (u: number) => {
  const s = clamp(u / BODY, 0, 1)
  return (5.2 * s ** 0.45 * (1 - s)) / 0.4072 + 1.45 * s ** 3
}
/** How far its tail fans out at a point along it, folded shut by `fold` (1 open). */
const fanned = (u: number, fold: number) =>
  1.45 + 5.2 * clamp((u - BODY) / (SPAN - BODY), 0, 1) ** 0.8 * fold

/** How far the fish reaches above and below its middle at a point along it, fins and all. */
function reach(u: number, fold = 1): { up: number; down: number } {
  if (u <= 0 || u >= SPAN) return { up: 0, down: 0 }
  if (u > BODY) return { up: fanned(u, fold), down: fanned(u, fold) }
  const h = girth(u)
  return { up: h + bump(u, 9, 20, 1.5), down: h * 1.04 + bump(u, 12, 17.5, 1) + bump(u, 21, 26, 0.9) }
}

function tailPath(fold: number) {
  const us = along(BODY, SPAN, 6)
  return curve([
    [BODY - 2.5, -girth(BODY - 2.5) + 0.4],
    ...us.map((u): [number, number] => [u, -fanned(u, fold)]),
    [SPAN - 3.8 * fold, 0],
    ...[...us].reverse().map((u): [number, number] => [u, fanned(u, fold)]),
    [BODY - 2.5, girth(BODY - 2.5) * 1.04 - 0.4],
  ])
}

/**
 * A goldfish, long enough to be eaten in several bites: the tip of its nose at
 * the origin, facing left, its tail behind it. Drawn twice over — in colour,
 * and as a flat shadow of itself for the part of it that is inside her mouth.
 */
function fish(into: SVGGElement, shadow: SVGGElement) {
  const g = make('g', {}, into)
  const shade = make('g', { fill: '#1E1614' }, shadow)
  const top = (u: number) => -girth(u)
  const bottom = (u: number) => girth(u) * 1.04
  const us = along(0, BODY, 22, 1.6)
  const body = curve([
    ...us.map((u): [number, number] => [u, top(u)]),
    ...us.slice(1).reverse().map((u): [number, number] => [u, bottom(u)]),
  ])
  /** A fin along its back (-1) or its belly (1), its root hidden in the body. */
  const fin = (a: number, b: number, h: number, side: 1 | -1) => {
    const edge = side < 0 ? top : bottom
    return curve([
      ...along(a, b, 10).map((u): [number, number] => [u, edge(u) + side * bump(u, a, b, h)]),
      ...along(a, b, 3).reverse().map((u): [number, number] => [u, edge(u) - side * 1.2]),
    ])
  }
  const fins = [fin(9, 20, 1.5, -1), fin(12, 17.5, 1, 1), fin(21, 26, 0.9, 1)]
  const FIN = '#E8843A'
  const tails: SVGPathElement[] = []
  for (const [layer, color] of [[g, FIN], [shade, null]] as const) {
    tails.push(make('path', color ? { fill: color } : {}, layer))
    for (const d of fins) make('path', color ? { d, fill: color } : { d }, layer)
    make('path', color ? { d: body, fill: '#F29A45' } : { d: body }, layer)
  }
  // A darker back and a paler belly, a gill, rows of scales, the fin at its
  // side, an eye and a mouth.
  const line = (d: string, stroke: string, width: number, opacity = 1) =>
    make('path', { d, fill: 'none', stroke, 'stroke-width': width, 'stroke-linecap': 'round', opacity }, g)
  line(curve(along(4, 25, 8).map((u): [number, number] => [u, top(u) * 0.6]), false), '#E27A2F', 1.2, 0.6)
  line(curve(along(2, 22, 8).map((u): [number, number] => [u, bottom(u) * 0.55]), false), '#F9C98A', 1.4)
  line(`M6.4 ${(top(6.4) * 0.74).toFixed(2)}Q8.6 0 6.4 ${(bottom(6.4) * 0.74).toFixed(2)}`, '#D9722F', 0.8)
  for (const u of [11.5, 15.5, 19.5]) {
    const h = girth(u) * 0.5
    line(`M${u} ${(-h).toFixed(2)}Q${u + 2.2} 0 ${u} ${h.toFixed(2)}`, '#E4843A', 0.6, 0.7)
  }
  make('path', { d: 'M6.8 1.6C9 2 11.5 3.4 12.6 5.4C10.2 5.6 8 4.4 6.8 2.6Z', fill: FIN }, g)
  make('circle', { cx: 3.3, cy: -1.2, r: 1.15, fill: '#2B2320' }, g)
  make('circle', { cx: 3, cy: -1.5, r: 0.36, fill: '#fff' }, g)
  line('M0.4 0.8Q1.3 1.25 2 0.8', '#C0602A', 0.5)
  let folded = -1
  /** The tail, fanned open (1) or folded shut the way it goes when it is sucked in. */
  const fold = (k: number) => {
    if (Math.abs(k - folded) < 0.002) return
    folded = k
    const d = tailPath(k)
    for (const t of tails) t.setAttribute('d', d)
  }
  fold(1)
  return { g, shade, fold }
}

/** Her open mouth, as she draws it — 18.4 across and 11.3 deep, hung from just under her nose. */
const MOUTH_W = 18.4
const MOUTH_H = 11.3
/**
 * Her open mouth at any size: her own outline, hung from the same point under
 * her nose and stretched. At her own size it is her mouth exactly.
 */
function gape(w: number, h: number): string {
  const X = (n: number) => (60 + (n * w) / 2).toFixed(2)
  const Y = (n: number) => (80.8 + n * h).toFixed(2)
  return (
    `M${X(0)} ${Y(0)}C${X(0.641)} ${Y(0)} ${X(1)} ${Y(0.097)} ${X(1)} ${Y(0.31)}` +
    `C${X(1)} ${Y(0.69)} ${X(0.554)} ${Y(1)} ${X(0)} ${Y(1)}` +
    `C${X(-0.554)} ${Y(1)} ${X(-1)} ${Y(0.69)} ${X(-1)} ${Y(0.31)}` +
    `C${X(-1)} ${Y(0.097)} ${X(-0.641)} ${Y(0)} ${X(0)} ${Y(0)}Z`
  )
}
/** And the tongue in it, stretched with it. */
function tongue(w: number, h: number): string {
  const X = (n: number) => (60 + (n * w) / 2).toFixed(2)
  const Y = (n: number) => (80.8 + n * h).toFixed(2)
  return (
    `M${X(0)} ${Y(0.973)}C${X(0.293)} ${Y(0.956)} ${X(0.478)} ${Y(0.814)} ${X(0.478)} ${Y(0.681)}` +
    `C${X(0.478)} ${Y(0.566)} ${X(0.261)} ${Y(0.496)} ${X(0)} ${Y(0.496)}` +
    `C${X(-0.261)} ${Y(0.496)} ${X(-0.478)} ${Y(0.566)} ${X(-0.478)} ${Y(0.681)}` +
    `C${X(-0.478)} ${Y(0.814)} ${X(-0.293)} ${Y(0.956)} ${X(0)} ${Y(0.973)}Z`
  )
}

/**
 * A butterfly that turns in space. Each wing hinges on the body, and what the
 * eye sees of it is its width foreshortened by the angle it makes with the
 * screen — the flap and the way the body is turned, added for one wing and
 * taken away for the other. Past edge-on a wing shows its underside, which is
 * paler.
 */
function butterfly(parent: SVGGElement) {
  const g = make('g', {}, parent)
  const id = `trk${uid++}`
  const defs = make('defs', {}, g)
  const top = make('linearGradient', { id: `${id}t`, x1: 0, y1: 0, x2: 1, y2: 0 }, defs)
  make('stop', { offset: 0, 'stop-color': '#4F6FD8' }, top)
  make('stop', { offset: 0.7, 'stop-color': '#86A6F5' }, top)
  make('stop', { offset: 1, 'stop-color': '#2E3F8F' }, top)
  const FORE = 'M0 -1 C3 -11 14 -15 17 -8 C18.5 -3.5 12 0 0 0.5 Z'
  const HIND = 'M0 0.5 C8 1 13 5 11.5 10 C9.5 13.5 3 9 0 3 Z'
  const wing = () => {
    const w = make('g', {}, g)
    const upper = make('g', {}, w)
    make('path', { d: FORE, fill: `url(#${id}t)`, stroke: '#2B3470', 'stroke-width': 0.7 }, upper)
    make('path', { d: HIND, fill: '#9DB5F7', stroke: '#2B3470', 'stroke-width': 0.7 }, upper)
    make('circle', { cx: 13, cy: -8, r: 1.3, fill: '#fff', opacity: 0.9 }, upper)
    make('circle', { cx: 10.5, cy: -10, r: 0.8, fill: '#fff', opacity: 0.8 }, upper)
    make('path', { d: 'M1 -1 Q8 -6 14 -9 M1 0 Q7 -2 15 -4 M1 1.5 Q6 4 10 8', fill: 'none', stroke: '#2B3470', 'stroke-width': 0.4, opacity: 0.5 }, upper)
    const under = make('g', { opacity: 0 }, w)
    make('path', { d: FORE, fill: '#C9C2E8', stroke: '#6B6599', 'stroke-width': 0.6 }, under)
    make('path', { d: HIND, fill: '#DDD8F2', stroke: '#6B6599', 'stroke-width': 0.6 }, under)
    return { w, upper, under }
  }
  const right = wing()
  const left = wing()
  const body = make('g', {}, g)
  make('ellipse', { cx: 0, cy: 1, rx: 1.2, ry: 5.2, fill: '#2E2640' }, body)
  make('circle', { cx: 0, cy: -4.6, r: 1.5, fill: '#2E2640' }, body)
  make('path', { d: 'M-0.4 -5.6 Q-2 -9.5 -3.6 -10.4 M0.4 -5.6 Q2 -9.5 3.6 -10.4', fill: 'none', stroke: '#2E2640', 'stroke-width': 0.55 }, body)
  make('circle', { cx: -3.6, cy: -10.4, r: 0.7, fill: '#2E2640' }, body)
  make('circle', { cx: 3.6, cy: -10.4, r: 0.7, fill: '#2E2640' }, body)

  /**
   * `open` is how far the wings are spread, 1 flat and 0 closed above the
   * body; `turn` is how far the whole butterfly is turned, in radians, with 0
   * facing you.
   */
  const pose = (open: number, turn: number) => {
    const lift = (1 - open) * (Math.PI / 2) * 0.95
    for (const [w, sign] of [[right, 1], [left, -1]] as const) {
      const c = Math.cos(lift + sign * turn)
      const width = Math.max(0.06, Math.abs(c))
      w.w.setAttribute('transform', `scale(${(sign * width).toFixed(3)} ${(0.94 + 0.06 * Math.abs(c)).toFixed(3)})`)
      w.upper.setAttribute('opacity', c >= 0 ? '1' : '0')
      w.under.setAttribute('opacity', c >= 0 ? '0' : '1')
    }
    body.setAttribute('transform', `scale(${(0.8 + 0.2 * Math.cos(turn)).toFixed(3)} 1)`)
  }
  return { g, pose }
}

/** How much bigger than its own ten units the star is drawn. */
const STAR_SIZE = 3.4

/**
 * The star; its glow, on a circle of its own so it can sit behind her paws;
 * a light at its heart that comes up as it fills; and the same star in white,
 * laid over it, for when it is white-hot.
 */
function star(parent: SVGGElement) {
  const id = `trk${uid++}`
  const defs = make('defs', {}, parent)
  const grad = make('radialGradient', { id }, defs)
  make('stop', { offset: 0, 'stop-color': '#FFF1BF', 'stop-opacity': 1 }, grad)
  make('stop', { offset: 0.55, 'stop-color': '#FFD35C', 'stop-opacity': 0.8 }, grad)
  make('stop', { offset: 1, 'stop-color': '#FFC93C', 'stop-opacity': 0 }, grad)
  const heart = make('radialGradient', { id: `${id}h` }, defs)
  make('stop', { offset: 0, 'stop-color': '#FFFFFF', 'stop-opacity': 1 }, heart)
  make('stop', { offset: 1, 'stop-color': '#FFF4C8', 'stop-opacity': 0 }, heart)
  const glow = make('circle', { r: 24, fill: `url(#${id})`, opacity: 0 }, parent)
  const g = make('g', {}, parent)
  make('path', {
    d: STAR,
    fill: '#F2B52E',
    stroke: '#D99A12',
    'stroke-width': 0.45,
    transform: `scale(${STAR_SIZE}) translate(-5 -5)`,
  }, g)
  const hot = make('path', {
    d: STAR,
    fill: '#FFFBEA',
    transform: `scale(${STAR_SIZE}) translate(-5 -5)`,
    opacity: 0,
  }, g)
  const core = make('circle', { r: 8, fill: `url(#${id}h)`, opacity: 0 }, g)
  return { g, glow, core, hot }
}

// --- the tricks --------------------------------------------------------------

const PLAY: Record<Trick, (s: Scene) => Promise<void>> = {
  /**
   * A ball of yarn comes in low from the left, bounces along the ledge — each
   * bounce carrying on to the right — and rolls up against her paw, its loose
   * end trailing. She looks at it, wiggles, and swats it back the way it came.
   * It goes, unravelling along the ledge, and the thread it leaves behind lies
   * there, stirring in the breeze.
   */
  async yarn(s) {
    const R = 17
    const v = s.view
    // The ledge her paws are on runs the whole width of the screen: the ball
    // lands on it, rolls along it, and the yarn ends up lying on it.
    const floor = { y: FLOOR, from: -Infinity, to: Infinity }
    const ball = yarnBall(s.back, R)
    const thread = new Thread(s.back, 12, 3.4, '#B53A4C', floor)
    let x = v.left - R - 10
    let y = 36
    let vx = 0
    let vy = -90
    let rot = 0
    // Against the outside of her left paw.
    const stopAt = 11 - R - 1
    // The loose end comes off the side of the ball that is behind it. Tied to
    // a point that turned with the ball, the roll wound it straight back on,
    // which is true to life and left nothing to see.
    let behind = -1
    const hold = (): [number, number] => [x + behind * R * 0.8, y + R * 0.5]
    thread.knots.forEach((k, i) => {
      k.x = k.px = x - 4 - i * 3.4
      k.y = k.py = y
    })
    thread.held.set(0, hold)
    const place = () => {
      ball.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`)
      ball.spin.setAttribute('transform', `rotate(${rot.toFixed(1)})`)
    }
    s.mood('curious')
    // Thrown, bounced, rolled. The bounces are real — gravity and a floor
    // that gives back less each time — and the way along the ledge is one
    // continuous slowing, so every bounce carries on in the direction it was
    // going and the last of it is a roll that ends against her paw.
    const x0 = x
    let last = x
    await s.tween(1900, (t, dt) => {
      vy += 900 * dt
      y += vy * dt
      if (y > FLOOR - R) {
        y = FLOOR - R
        vy = Math.abs(vy) > 70 ? -Math.abs(vy) * 0.5 : 0
      }
      x = lerp(x0, stopAt, 1 - (1 - t) ** 2.6)
      rot += ((x - last) / R) * (180 / Math.PI)
      last = x
      place()
      thread.step(dt)
      s.look(x, y)
    })
    x = stopAt
    y = FLOOR - R
    place()
    // She has it now. Down at it, and the wiggle before a pounce: her head
    // going side to side on top of wherever her mood holds it, out from
    // level and back to it.
    s.mood('lookDownL')
    await s.tween(420, (_t, dt) => {
      thread.step(dt)
      s.look(x, y)
    })
    await s.tween(800, (t, dt) => {
      s.head(0, Math.sin(t * Math.PI * 4) * 5 * Math.sin(t * Math.PI) ** 0.5)
      thread.step(dt)
      s.look(x, y)
    })
    s.head(0, 0)
    // The swat, with the paw on its side: a small cock inwards, then fast
    // out and over onto the ball.
    s.mood('grumpy')
    const swat = 560
    s.paw(
      'l',
      [
        { at: 0 },
        { at: 0.36, r: 14, y: -5, ease: 'cubic-bezier(.6,0,.9,.5)' },
        { at: 0.52, r: -38, y: -9, x: -6, ease: 'ease-out' },
        { at: 0.64, r: -34, y: -8, x: -5, ease: 'ease-in-out' },
        { at: 1 },
      ],
      swat,
    )
    await s.tween(swat * 0.48, (_t, dt) => thread.step(dt))
    // Off it goes: low, along the ledge, paying out yarn the whole way.
    s.mood('happy')
    vx = -540
    vy = -170
    // The yarn comes off the back of the ball as it goes, and the old loose
    // end is left lying where it was.
    behind = 1
    const end = () => thread.knots.length - 1
    thread.held.clear()
    thread.held.set(end(), hold)
    let gone = false
    let run = 0
    await s.tween(3800, (t, dt) => {
      if (!gone) {
        vy += 900 * dt
        x += vx * dt
        y += vy * dt
        if (y > FLOOR - R) {
          y = FLOOR - R
          const bounce = Math.abs(vy) > 70
          vy = bounce ? -Math.abs(vy) * 0.4 : 0
          // A bounce costs it some of its speed; rolling costs it very little,
          // so it rolls on off the edge of the screen rather than stopping
          // somewhere on it.
          vx *= bounce ? 0.9 : Math.pow(0.994, dt * 60)
        }
        rot += (vx / R) * (180 / Math.PI) * dt
        place()
        // A length of yarn for every length it travels, so the thread stays
        // slack and the loose end stays behind.
        run += Math.hypot(vx, vy) * dt
        while (run > thread.link && thread.knots.length < 320) {
          thread.payOut(end())
          run -= thread.link
        }
        if (x < v.left - R - 20) {
          gone = true
          thread.held.clear()
          ball.g.remove()
        }
        if (t < 0.1) s.look(x, y)
        else s.unlook()
      }
      thread.step(dt)
      // The yarn it left fades at the end — and the ball with it, on a screen
      // so wide it is still rolling across it.
      if (t > 0.8) {
        const o = ((1 - t) / 0.2).toFixed(3)
        thread.el.setAttribute('opacity', o)
        if (!gone) ball.g.setAttribute('opacity', o)
      }
    })
  },

  /**
   * A star drifts down out of the sky, glowing a little. Her eyes follow it
   * until they cross; she catches it between her paws, held by its points so
   * that it stays in sight, and watches it while it warms — the glow growing
   * the whole time she holds it, evenly, beating as it goes. Then it breaks
   * into a shower of tiny stars, the glow opening out with them as it fades,
   * and only once it has does she smile.
   */
  async star(s) {
    const st = star(s.back)
    const held = [60, 78]
    const v = s.view
    let glow = { r: 24, o: 0.34 }
    const shine = (x: number, y: number) => {
      st.glow.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`)
      st.glow.setAttribute('r', glow.r.toFixed(2))
      st.glow.setAttribute('opacity', glow.o.toFixed(3))
    }
    s.mood('lookUpL')
    await s.tween(3000, (t) => {
      const e = easeInOut(t)
      const sway = Math.sin(t * Math.PI * 3) * 26 * (1 - t)
      const x = lerp(24, held[0], e) + sway
      const y = lerp(v.top - 26, held[1], e)
      // Two fifths of a turn on the way down, which is upright again.
      st.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(t * 144).toFixed(1)})`)
      // A little glow all the way down: a star, not a shape.
      glow = { r: 24 + Math.sin(t * 16) * 1.2, o: 0.34 + 0.05 * Math.sin(t * 11) }
      shine(x, y)
      s.look(x, y)
      if (t > 0.55) s.mood('curious')
    })
    // Caught by its two sides: each paw comes in until it covers the tip of
    // a point, and the rest of the star is in plain sight between them.
    const build = 2300
    const surge = 420
    const hold = build + surge + 520
    const grip: PawKey[] = [
      { at: 0 },
      { at: 0.06, x: 3, y: -13, r: 8, ease: 'cubic-bezier(.3,1.4,.6,1)' },
      { at: (build + surge) / hold, x: 3, y: -13, r: 8 },
      { at: 1 },
    ]
    s.paw('l', grip, hold)
    s.paw('r', mirror(grip), hold)
    s.mood('surprised')
    /** The star where she holds it, shivering by `shake`, turned `turn` degrees and grown by `grow`. */
    const inPaws = (ms: number, shake: number, turn: number, grow: number) => {
      const jx = (Math.sin(ms / 7.3) + Math.sin(ms / 3.1) * 0.5) * 0.9 * shake
      const jy = (Math.sin(ms / 6.1 + 1) + Math.sin(ms / 2.7) * 0.5) * 0.9 * shake
      const jr = Math.sin(ms / 5.3) * 7 * shake
      st.g.setAttribute('transform', `translate(${(held[0] + jx).toFixed(2)} ${(held[1] + jy).toFixed(2)}) rotate(${(turn + jr).toFixed(2)}) scale(${grow.toFixed(3)})`)
    }
    // Warming in her paws, from the moment she has it: the glow grows, and
    // grows faster the longer she holds it, beating quicker and quicker, and
    // the star begins to shiver with it and to go white.
    const from = glow
    let beat = 0
    await s.tween(build, (t, dt) => {
      if (t > 0.1) s.mood('curious')
      const ms = t * build
      const e = t * (0.4 + 0.6 * t)
      beat += dt * lerp(5, 19, t)
      const pulse = Math.sin(beat) * lerp(0.02, 0.09, e)
      glow = { r: lerp(from.r, 62, e) * (1 + pulse), o: Math.min(1, lerp(from.o, 0.9, e) * (1 + pulse * 0.5)) }
      shine(held[0], held[1])
      const shiver = clamp((t - 0.4) / 0.6, 0, 1) ** 1.6
      inPaws(ms, shiver, Math.sin(t * Math.PI * 2) * 5 * (1 - t), 1 + 0.14 * e + pulse * 0.5)
      st.core.setAttribute('opacity', (0.8 * e).toFixed(3))
      st.hot.setAttribute('opacity', (0.35 * shiver).toFixed(3))
      s.look(held[0], held[1] + 2)
    })
    // More than it can hold. The glow swells past anything it has been, the
    // star goes white and shakes, her eyes go wide — and it bursts.
    s.mood('surprised')
    const peak = { ...glow }
    await s.tween(surge, (t) => {
      const ms = build + t * surge
      const e = easeIn(t)
      glow = { r: lerp(peak.r, 88, e) * (1 + Math.sin(ms / 11) * 0.05 * t), o: Math.min(1, lerp(peak.o, 1, e)) }
      shine(held[0], held[1])
      inPaws(ms, 1 + 1.4 * t, 0, 1.14 + 0.2 * e)
      st.core.setAttribute('opacity', (0.8 + 0.2 * t).toFixed(3))
      st.hot.setAttribute('opacity', lerp(0.35, 0.9, e).toFixed(3))
      s.look(held[0], held[1] + 2)
    })
    // It goes. The star flares and is gone, what it was made of flying out of
    // the glow — which opens out with it and fades, rather than going out;
    // quickly, so the gold thrown out of it is not lost against it.
    s.unlook()
    const going = stardust(s, held[0], held[1] - 1)
    const last = { ...glow }
    const opening = s.tween(520, (t) => {
      glow = { r: last.r * (1 + 0.8 * easeOut(t)), o: last.o * (1 - t) ** 2.2 }
      shine(held[0], held[1])
      const k = clamp(t / 0.2, 0, 1)
      inPaws(0, 0, 0, 1.34 + 0.4 * easeOut(k))
      st.g.setAttribute('opacity', (1 - k).toFixed(3))
    })
    await s.wait(380)
    s.mood('celebrate')
    await Promise.all([going, opening])
  },

  /**
   * A butterfly flutters in, turning as it flies, and settles on her nose. She
   * looks at it until she is cross-eyed, builds up to a sneeze, sneezes it off,
   * and watches it go, a little sorry.
   */
  async butterfly(s) {
    const b = butterfly(s.front)
    const v = s.view
    // Where it sits: on the top of her nose, wherever her nose is. Read off
    // the nose itself every frame — its place and the angle her head is at —
    // so from the moment it lands until the sneeze throws it off, it goes
    // everywhere her nose goes: the face settling under it, her breathing,
    // the head coming up with the "ah… ah…".
    const noseEl = s.rig.svg.querySelector<SVGGraphicsElement>('.cat-nose')
    const nb = noseEl?.getBBox()
    const perch = () => {
      const m = noseEl && s.matrix(noseEl)
      if (!m || !nb) return { x: 60, y: 68, a: 0 }
      const p = new DOMPoint(nb.x + nb.width / 2, nb.y + nb.height / 2 - 1.1).matrixTransform(m)
      return { x: p.x, y: p.y, a: (Math.atan2(m.b, m.a) * 180) / Math.PI }
    }
    const from = [v.right + 20, Math.max(v.top + 30, -110)]
    s.mood('lookUpR')
    let flap = 0
    let px = from[0]
    const at = (x: number, y: number, tilt: number) =>
      b.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${tilt.toFixed(1)})`)
    await s.tween(2600, (t, dt) => {
      // Coming in to land: over the last stretch the flight gives way to the
      // pose it will sit in — wings slowing and opening, the lean and the
      // turn coming out — so touching down is the end of a movement rather
      // than a cut to a different picture.
      const settle = clamp((t - 0.78) / 0.22, 0, 1)
      const w = settle * settle * (3 - 2 * settle)
      flap += dt * 16 * (1 - 0.75 * w)
      const e = easeInOut(t)
      // Flying at her nose as it is now, not where it was when it set off:
      // her face is still moving as it comes in.
      const p = perch()
      const x = lerp(from[0], p.x, e) + Math.sin(t * Math.PI * 4) * 30 * (1 - t)
      const y = lerp(from[1], p.y, e) + Math.sin(t * Math.PI * 6) * 14 * (1 - t)
      const vx = dt ? (x - px) / dt : 0
      px = x
      at(x, y, Math.sin(t * 9) * 12 * (1 - w) + p.a * w)
      // Turned the way it is flying, and a little more when it banks.
      const flying = 0.5 + 0.5 * Math.sin(flap)
      b.pose(lerp(flying, 0.92, w), (clamp(vx / 160, -1, 1) * 0.9 + Math.sin(t * 7) * 0.25) * (1 - w))
      s.look(x, y)
      // Her face settles as it does, a moment before it lands rather than on
      // the same frame.
      if (t > 0.86) s.mood('idle')
      else if (t > 0.6) s.mood('curious')
    })
    /** On her nose, and her eyes on it. */
    const sit = () => {
      const p = perch()
      at(p.x, p.y, p.a)
      s.look(p.x, p.y + 2)
      return p
    }
    // Settled. Slow wings, turning a little on its perch.
    await s.tween(1700, (t) => {
      sit()
      b.pose(0.62 + 0.3 * Math.cos(t * Math.PI * 3.5), Math.sin(t * Math.PI * 2) * 0.45)
    })
    // Ah… ah… — the head coming up in two catches, eyes going, mouth opening,
    // and a held breath at the top. It rides up on her nose.
    s.mood('yawn')
    await s.tween(950, (t) => {
      const e = t < 0.45 ? easeInOut(t / 0.45) * 0.55 : 0.55 + easeInOut((t - 0.45) / 0.55) * 0.45
      s.head(e * 6)
      sit()
      // From exactly where the perch left the wings.
      b.pose(0.62 + 0.3 * Math.sin(t * Math.PI * 2.5), 0.2 * easeInOut(t))
    })
    await s.tween(180, () => {
      sit()
      b.pose(0.92, 0.2)
    })
    // CHOO — all of it at once. The head snaps down in a sixteenth of a
    // second with the eyes screwed shut and the mouth wide, the spray goes,
    // and in that same frame the butterfly is blown off her nose: until now
    // it has been sitting on it, and it leaves from where it was sitting.
    const off = perch()
    s.unlook()
    s.mouth('open')
    // The snap is an offset on her head, as the "ah" was, so it hands her
    // back to whatever her mood has done meanwhile without a step.
    const snap = s.tween(900, (t) =>
      s.head(
        through([[0, 6], [0.07, -7, easeOut], [0.3, -6], [1, 0]], t),
        through([[0, 0], [0.07, 5, easeOut], [0.3, 4], [1, 0]], t),
      ),
    )
    spray(s, off.x, off.y + 8)
    // Blown up and off — a puff, not a shot: a short way, tumbling over as it
    // goes, and then flying again.
    let fx = off.x
    let fy = off.y
    let fvx = 110
    let fvy = -190
    let tumble = 0
    let spin = 520
    let sad = false
    // Until it has flown off the screen — and she has had a moment to watch it
    // go. On a screen too wide to leave in time, it fades instead.
    const away = 4200
    await s.tween(away, (t, dt) => {
      const ms = t * away
      const blown = ms < 480
      flap += dt * (blown ? 30 : 20)
      spin *= Math.pow(0.02, dt)
      tumble += spin * dt
      if (!blown) {
        fvx += (-150 + Math.sin(ms * 0.00346) * 140) * dt
        fvy += (-50 - fvy * 0.9) * dt
      } else {
        fvx *= Math.pow(0.1, dt)
        fvy *= Math.pow(0.1, dt)
      }
      fx += fvx * dt
      fy += fvy * dt
      at(fx, fy, off.a + tumble + Math.sin(ms * 0.00308) * 10 * Math.min(1, ms / 300))
      b.pose(0.5 + 0.5 * Math.sin(flap), clamp(fvx / 160, -1, 1) * 0.9)
      if (ms > 420 && !sad) {
        sad = true
        s.mood('sad')
      }
      if (ms > 420) s.look(fx, fy)
      if (t > 0.8) b.g.setAttribute('opacity', ((1 - t) / 0.2).toFixed(3))
      const out = fx < v.left - 30 || fx > v.right + 30 || fy < v.top - 30
      return out && ms > 1200
    })
    await snap
    s.unlook()
  },

  /**
   * A fish is lobbed in. Her eyes go wide and her mouth opens — as wide as
   * the fish needs — and it goes in head first: into the opening, the part of
   * it in there seen through it and darker the further in it is, the rest of
   * it still out in front of her face. Her mouth closes on it, exactly as
   * tight as the fish is deep where her lips are, and she chews; every chew
   * takes a little more in, her mouth giving round each fin as it passes and
   * the tail folding shut as it gets there, until the last of it goes and her
   * mouth shuts behind it.
   *
   * While the fish is in it her mouth is drawn by the trick, from the outline
   * of her own, and the fish is cut by that same outline — so what shows of
   * the fish is exactly what her mouth would show. All of it goes where her
   * mouth goes: up as she lifts her head, over as she tilts it, nodding as
   * she chews.
   */
  async fish(s) {
    const v = s.view
    const svg = s.rig.svg
    const hers = svg.querySelector<SVGGraphicsElement>('.cat-mouth')
    const dark = svg.querySelector('.cat-mouth [data-mouth="open"] path')?.getAttribute('fill') ?? '#2B2320'
    const id = `trk${uid++}`
    const defs = make('defs', {}, s.front)
    const hole = make('path', { id: `${id}h` }, defs)
    const inMouth = make('clipPath', { id: `${id}t` }, defs)
    make('use', { href: `#${id}h` }, inMouth)
    const mouth = make('g', { display: 'none' }, s.front)
    make('use', { href: `#${id}h`, fill: dark }, mouth)
    const tongueEl = make('path', { fill: '#EE8E96', 'clip-path': `url(#${id}t)` }, mouth)
    const box = { maskUnits: 'userSpaceOnUse', x: -2000, y: -2000, width: 4000, height: 4000 }
    const all = { x: -2000, y: -2000, width: 4000, height: 4000 }
    // Seen: in front of her face on the near side of her lips, and through the opening.
    const seen = make('mask', { id: `${id}s`, ...box }, defs)
    make('rect', { ...all, fill: '#000' }, seen)
    const near = make('path', { fill: '#fff' }, seen)
    const seenHole = make('use', { href: `#${id}h`, fill: '#fff' }, seen)
    // In shadow: what is in the opening, more of it the deeper it is.
    const deepClip = make('clipPath', { id: `${id}c` }, defs)
    const deepHole = make('use', { href: `#${id}h` }, deepClip)
    const grad = make('linearGradient', { id: `${id}g`, gradientUnits: 'userSpaceOnUse' }, defs)
    make('stop', { offset: 0, 'stop-color': '#000' }, grad)
    make('stop', { offset: 1, 'stop-color': '#fff' }, grad)
    const deep = make('mask', { id: `${id}d`, ...box }, defs)
    make('rect', { ...all, fill: `url(#${id}g)`, 'clip-path': `url(#${id}c)` }, deep)
    // Cut on layers of their own that stay still: a mask on the fish itself
    // would be read in the fish's own coordinates and travel with it.
    const lit = make('g', { mask: `url(#${id}s)` }, s.front)
    const dim = make('g', { mask: `url(#${id}d)`, opacity: 0.9 }, s.front)
    const f = fish(lit, dim)

    let w = MOUTH_W
    let h = MOUTH_H
    /** Which way the fish is pointing, nose first. */
    let dir = { x: 1, y: 0 }
    const frame = () => (hers && s.matrix(hers)) || new DOMMatrix()
    /** Into her mouth from the left and a little down, turned with her head. */
    const inward = (m: DOMMatrix) => {
      const [x, y] = [Math.cos(0.24), Math.sin(0.24)]
      const ax = m.a * x + m.c * y
      const ay = m.b * x + m.d * y
      const n = Math.hypot(ax, ay) || 1
      return { x: ax / n, y: ay / n }
    }
    /** Where her lips close: the middle of the opening, in her coordinates. */
    const middle = (m: DOMMatrix) => new DOMPoint(60, 80.8 + h / 2).matrixTransform(m)
    /**
     * Her mouth at its size now, and the cuts for a fish going into it along
     * `dir`: across its way through the middle of the opening is her lips.
     * On the near side of them the fish is in front of her face; past them
     * only the opening shows it, darkening towards the back.
     */
    const open = (m: DOMMatrix) => {
      const mt = `matrix(${[m.a, m.b, m.c, m.d, m.e, m.f].map((n) => n.toFixed(4)).join(' ')})`
      hole.setAttribute('d', gape(w, h))
      tongueEl.setAttribute('d', tongue(w, h))
      for (const el of [mouth, seenHole, deepHole]) el.setAttribute('transform', mt)
      const c = middle(m)
      const L = 1500
      const [px, py] = [-dir.y * L, dir.x * L]
      const [bx, by] = [-dir.x * L, -dir.y * L]
      const pt = (x: number, y: number) => `${x.toFixed(1)} ${y.toFixed(1)}`
      near.setAttribute('d', `M${pt(c.x + px, c.y + py)}L${pt(c.x + px + bx, c.y + py + by)}L${pt(c.x - px + bx, c.y - py + by)}L${pt(c.x - px, c.y - py)}Z`)
      // Dark well before the back of it: the inside of a mouth is dark.
      const back = w * 0.3
      grad.setAttribute('x1', c.x.toFixed(2))
      grad.setAttribute('y1', c.y.toFixed(2))
      grad.setAttribute('x2', (c.x + dir.x * back).toFixed(2))
      grad.setAttribute('y2', (c.y + dir.y * back).toFixed(2))
      return c
    }
    /** The fish with its nose at (x, y), pointing along `dir`, its tail swung `wag` degrees about her lips. */
    const place = (x: number, y: number, wag = 0, lips?: DOMPoint) => {
      const a = (Math.atan2(dir.y, dir.x) * 180) / Math.PI + 180
      const swing = lips ? `rotate(${wag.toFixed(2)} ${lips.x.toFixed(2)} ${lips.y.toFixed(2)}) ` : ''
      const t = `${swing}translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${a.toFixed(2)}) scale(${FISH})`
      f.g.setAttribute('transform', t)
      f.shade.setAttribute('transform', t)
    }

    // Thrown in from the left, and thrown like a thing with weight: up, over
    // and down into her mouth in a little over half a second, falling the
    // way things fall — slow at the top, fast into the catch. The arc is
    // worked out for where her mouth is when it is thrown; where her mouth
    // goes meanwhile is blended in as it comes, so it lands in her mouth and
    // not where her mouth was. As it comes her eyes go wide and her mouth
    // opens — her own open mouth, then the trick's in its place, the same
    // outline in the same spot, so the change cannot be seen — and goes on
    // opening, as wide as the fish needs.
    const G = 1200
    const from = { x: v.left - 30, y: 52 }
    const aim = middle(frame())
    // Up forty units over where it was thrown from, which keeps the whole
    // flight in front of her face on a phone; a long way off, on a wide
    // screen, it is lobbed higher rather than thrown faster.
    let vy = -Math.sqrt(2 * G * 40)
    let T = (-vy + Math.sqrt(vy * vy + 2 * G * (aim.y - from.y))) / G
    T = Math.max(T, (aim.x - from.x) / 650)
    vy = (aim.y - from.y - 0.5 * G * T * T) / T
    const vx = (aim.x - from.x) / T
    let prev = { ...from }
    let mine = false
    s.mood('curious')
    await s.tween(T * 1000, (t) => {
      if (t > 0.3 && !mine) {
        mine = true
        s.mood('surprised')
        s.mouth('none')
        mouth.removeAttribute('display')
      }
      if (mine) {
        const k = smooth(clamp((t - 0.3) / 0.5, 0, 1))
        w = lerp(MOUTH_W, 24, k)
        h = lerp(MOUTH_H, 17, k)
      }
      const m = frame()
      const c = middle(m)
      const sec = t * T
      const k = smooth(t)
      const x = from.x + vx * sec + (c.x - aim.x) * k
      const y = from.y + vy * sec + 0.5 * G * sec * sec + (c.y - aim.y) * k
      const d = Math.hypot(x - prev.x, y - prev.y)
      if (d > 0.01) {
        // Pointing the way it flies, levelling out over the last of the way
        // into the way it will be held.
        const into = inward(m)
        const q = smooth(clamp((t - 0.72) / 0.28, 0, 1))
        const bx = lerp((x - prev.x) / d, into.x, q)
        const by = lerp((y - prev.y) / d, into.y, q)
        const n = Math.hypot(bx, by) || 1
        dir = { x: bx / n, y: by / n }
      }
      prev = { x, y }
      open(m)
      place(x, y)
      s.look(x, y)
    })
    s.unlook()
    // From here her mouth holds it: `depth` is how far its nose is past her
    // lips, and its tail folds shut as it gets to them.
    let depth = 0
    let fold = 1
    const folding = () => {
      fold = 1 - 0.55 * smooth(clamp((depth / FISH - (BODY - 4)) / 7, 0, 1))
      f.fold(fold)
    }
    /** As open as her mouth has to be for the fish where her lips are, and no more. */
    const snug = () => {
      const r = reach(depth / FISH, fold)
      return Math.max(3, (r.up + r.down) * FISH * 1.03 + 1.4)
    }
    const held = (wag = 0) => {
      const m = frame()
      dir = inward(m)
      const c = open(m)
      place(c.x + dir.x * depth, c.y + dir.y * depth, wag, c)
    }
    // Caught. Its own speed carries it in and her mouth stops it dead — in a
    // few hundredths of a second, with a knock to her head that the catch
    // gives it — and then closes on it.
    s.mood('happy')
    s.mouth('none')
    await s.tween(80, (t) => {
      depth = 12 * (1 - (1 - t) ** 2)
      folding()
      s.head(0, 3.5 * Math.sin((t * Math.PI) / 2))
      held()
    })
    await s.tween(240, (t) => {
      const k = smooth(t)
      w = lerp(24, 21, k)
      h = lerp(17, snug(), k)
      s.head(0, 3.5 * Math.cos((t * Math.PI) / 2))
      held(Math.sin(t * Math.PI) * 3)
    })
    // Chewing: her jaw drops a little round it and comes up again, her head
    // nodding with it, and on the way up a pull takes more of it in. The tail
    // flaps as it goes.
    const chews = 6
    const start = depth
    const end = FISH_LENGTH - 3
    for (let i = 0; i < chews; i++) {
      const was = depth
      const to = lerp(start, end, (i + 1) / chews)
      await s.tween(380, (t) => {
        depth = lerp(was, to, smooth(clamp((t - 0.3) / 0.7, 0, 1)))
        folding()
        h = snug() + (t < 0.5 ? Math.sin((t / 0.5) * Math.PI) * 2.6 : 0)
        s.head(-1.3 * Math.sin(t * Math.PI))
        held(Math.sin(t * Math.PI * 2) * 7 * (1 - i / chews))
      })
    }
    // The last of it in one go, and her mouth shuts behind it.
    const was = depth
    const wide = h
    await s.tween(220, (t) => {
      const e = easeIn(t)
      depth = lerp(was, FISH_LENGTH + 4, e)
      folding()
      h = lerp(wide, 0.4, e)
      w = lerp(21, 16, e)
      held()
    })
    lit.remove()
    dim.remove()
    mouth.remove()
    // Swallowed: a couple more chews with nothing in her mouth, and pleased
    // with herself.
    for (const [shape, ms] of [['munch2', 130], ['munch', 160], ['munch2', 130], ['munch', 170]] as const) {
      s.mouth(shape)
      await s.tween(ms, (t) => s.head(-0.9 * Math.sin(t * Math.PI)))
    }
    s.head(0)
    s.mood('happy')
    await s.wait(600)
  },
}

/**
 * The star going: a small version of the confetti that a new level gets, made
 * of tiny glowing stars. They are thrown out every way from where the star
 * was, most of them upwards, in five golds; the air slows them, they tumble
 * and twinkle, fall back a little, and are gone. A quick, small flash at the
 * heart of it is the star breaking; everything after that is what it was
 * made of.
 */
async function stardust(s: Scene, x: number, y: number): Promise<void> {
  const layer = make('g', {}, s.front)
  const id = `trk${uid++}`
  const defs = make('defs', {}, layer)
  const halo = make('radialGradient', { id }, defs)
  make('stop', { offset: 0, 'stop-color': '#FFF6D2', 'stop-opacity': 1 }, halo)
  make('stop', { offset: 0.45, 'stop-color': '#FFD86B', 'stop-opacity': 0.55 }, halo)
  make('stop', { offset: 1, 'stop-color': '#FFC93C', 'stop-opacity': 0 }, halo)
  const flash = make('circle', { cx: x, cy: y, r: 30, fill: `url(#${id})` }, layer)
  const golds = ['#F2B52E', '#FFD86B', '#FFE9A0', '#E8A317', '#FFF4CC']
  interface Dust {
    g: SVGGElement
    x: number
    y: number
    vx: number
    vy: number
    rot: number
    spin: number
    size: number
    life: number
    phase: number
  }
  const dust: Dust[] = []
  for (let i = 0; i < 110; i++) {
    const a = rand(0, Math.PI * 2)
    // Thrown the way the confetti is: out, and more of it up than down.
    const speed = rand(130, 460)
    const g = make('g', {}, layer)
    make('circle', { r: 6.5, fill: `url(#${id})`, opacity: 0.6 }, g)
    // Edged a shade darker, so a gold star still reads over the gold glow it comes out of.
    make('path', { d: STAR, fill: golds[i % golds.length], stroke: '#B97F0E', 'stroke-width': 0.7, 'stroke-linejoin': 'round', transform: 'translate(-5 -5)' }, g)
    dust.push({
      g,
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed * 0.8 - 170,
      rot: rand(0, 360),
      spin: rand(-540, 540),
      // Mostly small, a few bigger. At the size she is drawn on the level
      // page a star under about six pixels is a dot, and the dots are the
      // glitter; the bigger ones are what makes it read as stars.
      size: 0.5 + 0.7 * Math.random() ** 1.4,
      life: rand(1400, 2500),
      phase: rand(0, 6),
    })
  }
  const total = 2700
  await s.tween(total, (t, dt) => {
    const ms = t * total
    const f = Math.min(1, ms / 320)
    flash.setAttribute('transform', `translate(${x} ${y}) scale(${(0.5 + 1.6 * f).toFixed(3)}) translate(${-x} ${-y})`)
    flash.setAttribute('opacity', (1 - f).toFixed(3))
    // The confetti's own air: the same drag, and a fall that tops out, so
    // they flutter down rather than drop.
    const drag = Math.pow(0.985, dt * 60)
    for (const d of dust) {
      d.vx *= drag
      d.vy = Math.min(d.vy * drag + 420 * dt, 170)
      d.x += d.vx * dt + Math.sin(ms / 110 + d.phase) * 0.12
      d.y += d.vy * dt
      d.rot += d.spin * dt
      const twinkle = 0.78 + 0.22 * Math.sin(ms / 55 + d.phase)
      const fade = ms < d.life * 0.55 ? 1 : Math.max(0, 1 - (ms - d.life * 0.55) / (d.life * 0.45))
      d.g.setAttribute('transform', `translate(${d.x.toFixed(1)} ${d.y.toFixed(1)}) rotate(${d.rot.toFixed(0)}) scale(${(d.size * twinkle).toFixed(3)})`)
      d.g.setAttribute('opacity', fade.toFixed(3))
    }
  })
  layer.remove()
}

/** A sneeze: a few droplets thrown forward and down from her nose, fast. */
function spray(s: Scene, x: number, y: number) {
  for (let i = 0; i < 9; i++) {
    const a = rand(Math.PI * 0.15, Math.PI * 0.85)
    const d = rand(10, 26)
    const c = make('circle', { cx: 0, cy: 0, r: rand(0.7, 1.4), fill: '#CFE0F5', stroke: '#9DB3CF', 'stroke-width': 0.3 }, s.front)
    c.animate(
      [
        { transform: `translate(${x}px, ${y}px)`, opacity: 1 },
        { transform: `translate(${x + Math.cos(a) * d * 1.4}px, ${y + Math.sin(a) * d}px)`, opacity: 0 },
      ],
      { duration: rand(260, 420), easing: 'cubic-bezier(.1,.8,.3,1)', fill: 'forwards' },
    )
  }
}
