import { headPath, lidPaths } from './cat'

// ---------------------------------------------------------------------------
// On her back: the half turn onto her crown, the things she does while she is
// down there, and the half turn back.
//
// This is the one move the rest of the rig cannot express. Every other pose is
// a set of numbers handed to CSS, and CSS walks her there — but a half turn
// about her middle takes the flat of her head from her chin to her crown, her
// paws round the outside of her head rather than through the floor, and the
// light on her the other way from the turn. None of that is a channel. So for
// as long as she is over, one frame loop drives the parts directly, and when
// she is back up it hands every one of them back exactly as it found them.
//
// One number, p, runs from 0 (upright) to 1 (on her back), and everything is a
// function of it plus the clock — so the move can be played either way, and a
// reaction laid over the top of it composes with wherever the turn has got to.
// ---------------------------------------------------------------------------

type Path = { cmds: string[]; nums: number[][] }
const parse = (d: string): Path => {
  const cmds: string[] = [], nums: number[][] = []
  for (const m of d.matchAll(/([MCZ])([^MCZ]*)/g)) {
    cmds.push(m[1]); nums.push((m[2].match(/-?\d*\.?\d+/g) ?? []).map(Number))
  }
  return { cmds, nums }
}
const write = (p: Path) => p.cmds.map((c, i) => c + p.nums[i].map((v) => v.toFixed(2)).join(' ')).join('')
const lerpPath = (a: Path, b: Path, t: number): Path => ({
  cmds: a.cmds, nums: a.nums.map((row, i) => row.map((v, j) => v + (b.nums[i][j] - v) * t)),
})
const map = (a: Path, f: (x: number, y: number) => [number, number]): Path => ({
  cmds: a.cmds,
  nums: a.nums.map((row) => row.flatMap((_, j) => (j % 2 ? [] : f(row[j], row[j + 1])))),
})

// She turns about her own middle: halfway between the crown (14.95) and the
// floor (100), so a half turn lands her crown exactly where her chin was.
const CX = 60, CY = 57.5
const REST = parse(headPath(0.85))
// Off the floor and turning, a head has no flat on it anywhere: the round
// head, moved down three so its centre is the centre she turns about.
const ROUND = map(parse(headPath(0)), (x, y) => [x, y + 3])
// What she arrives at is the shape that, turned half round, reads on screen as
// a head resting on its crown — flat on the floor, domed where it is free. It
// is a resting head turned half round in her own frame, not one mirrored top
// for bottom: mirrored, every point is on the wrong side and the blend folds
// the head flat halfway. Turning keeps the points in order, and a circle about
// the centre she turns on is the same circle turned, so the switch from one
// half of the blend to the other lands on the one frame it cannot show.
//
// Halfway to the flat, lying-down head rather than the resting one: landing on
// her crown spreads her more than sitting on her chin does.
const turned = (a: Path) => map(a, (x, y) => [2 * CX - x, 2 * CY - y])
const ROUND_T = turned(ROUND)
const REST_T = turned(parse(headPath(0.99)))

const clamp = (v: number) => Math.max(0, Math.min(1, v))
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a))
const smooth = (t: number) => t * t * (3 - 2 * t)
const bump = (p: number, a: number, b: number) => Math.sin(Math.PI * seg(p, a, b))
// Overshoots by a little and comes back: weight arriving, not a value
// reaching a target.
const land = (t: number, k = 1.5) => { const u = t - 1; return 1 + (k + 1) * u * u * u + k * u * u }

// The turn is one steep curve. She starts slowly — a lean you could mistake
// for curiosity — then nearly all of the half turn goes by at once, and she
// arrives slowly. A logistic does exactly that with no seams in it.
const K = 30
const S = (t: number, k: number) => {
  const f = (x: number) => 1 / (1 + Math.exp(-k * (x - 0.5)))
  return (f(clamp(t)) - f(0)) / (f(1) - f(0))
}
// How fast the turn is going, as a 0..1 pulse centred on the whip: the
// logistic's own derivative, so it is exactly as sharp as the turn.
const whipAt = (t: number, k: number) => { const e = Math.exp(-k * (clamp(t) - 0.5)); return (4 * e) / ((1 + e) * (1 + e)) }
// The whip at a third of the way through rather than halfway, so the lean
// before it is a lean and not a wait; the time it gives up goes to the landing.
const rollOf = (p: number) => {
  const raw = seg(p, 0.03, 0.86)
  return raw < 0.34 ? raw * (0.5 / 0.34) : 0.5 + (raw - 0.34) * (0.5 / 0.66)
}

export type FlipMood = 'happy' | 'yawn' | 'up' | 'down' | 'swat'
const MOOD_MS: Record<FlipMood, number> = { happy: 1900, yawn: 2800, up: 2200, down: 2200, swat: 1150 }
const envelope = (t: number, a = 0.18, r = 0.28) =>
  (t <= 0 || t >= 1 ? 0 : Math.min(smooth(clamp(t / a)), smooth(clamp((1 - t) / r))))

const OVER_MS = 1600
const BACK_MS = 1500
const JUMP_MS = 1050

interface Saved { el: SVGElement; transform: string; origin: string; box: string; transition: string }

export class Flip {
  svg: SVGSVGElement
  /** 0 upright, 1 on her back. */
  p = 0
  /**
   * Still cross. Set for the jump back up after a swat, so the glare and the
   * flat ears go all the way up with her instead of being dropped the instant
   * the swipe is over — the swat was the point she decided you were done.
   */
  sulk = false
  #from = 0
  #to = 0
  #t0 = 0
  #dur = 1
  #raf = 0
  #then: (() => void) | null = null
  #mood: { name: FlipMood; at: number; side: number } | null = null
  #side = 1
  #face: (eyes: string, mouth: string) => void
  #shown = ''
  #saved: Saved[] = []
  #skullD: { el: SVGElement; d: string; transition: string }[] = []
  #contactOpacity = ''
  #contactTf: (string | null)[] = []

  heads: SVGElement[]; earsL: SVGElement[]; earsR: SVGElement[]
  pawsL: SVGElement[]; pawsR: SVGElement[]
  skulls: SVGElement[]; shade: Element | null; contact: SVGElement[]
  whiskers: SVGElement[]
  #whiskerTf: string[] = []
  contactClip: SVGElement | null
  glints: { el: SVGElement; cx: number; cy: number }[]
  lids: { mask: SVGPathElement; lash: SVGPathElement | null; cx: number; cy: number; rx: number; ry: number; t0: number }[]

  constructor(svg: SVGSVGElement, face: (eyes: string, mouth: string) => void) {
    this.svg = svg
    this.#face = face
    const q = <T extends Element>(s: string) => [...svg.querySelectorAll<T>(s)]
    // Every part is drawn twice — the outline pass, then the fills — and both
    // copies have to move as one or the union silhouette tears.
    this.heads = q('.cat-head')
    this.earsL = q('.cat-ear-l'); this.earsR = q('.cat-ear-r')
    this.pawsL = q('.cat-paw-l'); this.pawsR = q('.cat-paw-r')
    this.skulls = q('.cat-skull, .cat-skull-line, .cat-shade')
    // The coat's clip turns with the head; the contact shadow's does not — it
    // lives on screen, where the outline ends up the resting one anyway.
    const coatClip = svg.querySelector<SVGElement>('clipPath[id$="s"] .cat-skull-clip')
    if (coatClip) this.skulls.push(coatClip)
    this.shade = svg.querySelector('radialGradient[id$="v"]')
    this.contact = q('.cat-contact ellipse')
    // The paws' shadows are cut with an outline of their own, on screen. It
    // has to be her outline as it is right now — turned, lifted, flattened —
    // or upside down the shadow is cut to a head that is not there.
    this.contactClip = svg.querySelector<SVGElement>('clipPath[id$="body"] .cat-skull-clip')
    if (this.contactClip) this.skulls.push(this.contactClip)
    this.whiskers = q('.cat-whiskers')
    // Only the glints turn back against her, about the pupil's own centre: the
    // pupil sits toward her nose, and turning all of it back about the eye's
    // centre carried it across the eye, so she looked past you.
    this.glints = q<SVGGElement>('.cat-pupil').flatMap((g) => {
      const e = g.querySelector('ellipse')
      if (!e) return []
      const cx = +e.getAttribute('cx')!, cy = +e.getAttribute('cy')!
      return [...g.querySelectorAll<SVGElement>('circle')].map((el) => ({ el, cx, cy }))
    })
    this.lids = q<SVGPathElement>('.cat-lidmask').map((mask) => {
      const d = mask.dataset
      const lash = mask.closest('[data-eyes]')?.querySelector<SVGPathElement>('.cat-lash') ?? null
      return { mask, lash, cx: +d.cx!, cy: +d.cy!, rx: +d.rx!, ry: +d.ry!, t0: +d.t0! }
    })
  }

  /** Anywhere but upright, or on the way. */
  get engaged() { return this.#raf !== 0 || this.p > 0 }
  /** All the way over and not moving. */
  get down() { return this.p === 1 && this.#to === 1 }
  get turning() { return this.p !== this.#to }

  over(then?: () => void) { this.#go(1, OVER_MS, then) }
  back({ quick = false } = {}, then?: () => void) { this.#go(0, quick ? JUMP_MS : BACK_MS, then) }
  /** Straight onto her back with no move — for a redraw that happens while she is already there. */
  set(p: number) { this.#take(); this.p = this.#from = this.#to = p; this.#run() }

  react(name: FlipMood) {
    if (name === 'swat') this.#side = -this.#side
    this.#mood = { name, at: performance.now(), side: this.#side }
    this.#run()
  }
  get mood() { return this.#mood?.name ?? null }
  static ms(name: FlipMood) { return MOOD_MS[name] }

  destroy() {
    cancelAnimationFrame(this.#raf)
    this.#raf = 0
    if (this.#saved.length) this.#give()
  }

  #go(to: number, ms: number, then?: () => void) {
    this.#take()
    this.#from = this.p; this.#to = to; this.#t0 = performance.now()
    this.#dur = ms * Math.max(0.35, Math.abs(to - this.p))
    this.#then = then ?? null
    this.#run()
  }

  #run() {
    if (this.#raf) return
    const step = (now: number) => {
      this.#raf = 0
      // Every frame drawn is drawn over parts that have been written down, so
      // there is always something exact to hand back.
      this.#take()
      if (this.p !== this.#to) {
        const k = clamp((now - this.#t0) / this.#dur)
        this.p = k >= 1 ? this.#to : this.#from + (this.#to - this.#from) * k
      }
      if (this.#mood && now - this.#mood.at > MOOD_MS[this.#mood.name]) this.#mood = null
      this.#pose(now)
      const then = this.p === this.#to ? this.#then : null
      if (then) this.#then = null
      // Back up with nothing left to do: hand every part back and stop, and
      // only then say so — whatever happens next poses the rig's own drawing.
      if (this.p === 0 && this.#to === 0 && !this.#mood) { this.#give(); then?.(); return }
      then?.()
      // `then` may have started the loop itself — a reaction on landing — and
      // one loop is the most there can be. Two drew over each other, and the
      // second went on drawing after the first had handed her parts back.
      if (!this.#raf) this.#raf = requestAnimationFrame(step)
    }
    this.#raf = requestAnimationFrame(step)
  }

  // Everything this drives has a value the rest of the rig owns. It is
  // written down on the way in and put back on the way out, so being upright
  // again is the rig's own drawing, not an approximation of it.
  #take() {
    if (this.#saved.length) return
    const els = [...this.heads, ...this.earsL, ...this.earsR, ...this.pawsL, ...this.pawsR, ...this.glints.map((g) => g.el),
      ...(this.contactClip ? [this.contactClip] : [])]
    this.#saved = els.map((el) => ({
      el, transform: el.style.transform, origin: el.style.transformOrigin,
      box: el.style.transformBox, transition: el.style.transition,
    }))
    for (const el of els) { el.style.transformBox = 'view-box'; el.style.transition = 'none' }
    this.#skullD = this.skulls.map((el) => ({ el, d: el.style.getPropertyValue('d'), transition: el.style.transition }))
    for (const el of this.skulls) el.style.transition = 'none'
    this.#contactOpacity = (this.contact[0]?.parentNode as SVGElement | null)?.getAttribute('opacity') ?? ''
    this.#contactTf = this.contact.map((c) => c.getAttribute('transform'))
    this.#whiskerTf = this.whiskers.map((w) => w.style.transform)
    this.#shown = ''
    this.svg.dataset.flip = '1'
  }

  #give() {
    for (const s of this.#saved) {
      s.el.style.transform = s.transform; s.el.style.transformOrigin = s.origin
      s.el.style.transformBox = s.box; s.el.style.transition = s.transition
    }
    for (const s of this.#skullD) { s.el.style.setProperty('d', s.d); s.el.style.transition = s.transition }
    this.contact.forEach((c, i) => {
      const t = this.#contactTf[i]
      if (t === null) c.removeAttribute('transform'); else c.setAttribute('transform', t)
    })
    const g = this.contact[0]?.parentNode as SVGElement | null
    if (g && this.#contactOpacity) g.setAttribute('opacity', this.#contactOpacity)
    this.shade?.removeAttribute('gradientTransform')
    this.svg.style.removeProperty('--gaze-x'); this.svg.style.removeProperty('--gaze-y')
    for (const l of this.lids) {
      const lp = lidPaths(l.cx, l.cy, l.rx, l.ry, l.t0)
      l.mask.setAttribute('d', lp.mask); l.lash?.setAttribute('d', lp.lash)
    }
    this.whiskers.forEach((w, i) => { w.style.transform = this.#whiskerTf[i] })
    this.#saved = []; this.#skullD = []
    this.sulk = false
    delete this.svg.dataset.flip
  }

  #show(eyes: string, mouth: string) {
    const key = eyes + '/' + mouth
    if (key === this.#shown) return
    this.#shown = key
    this.#face(eyes, mouth)
  }

  #pose(now: number) {
    const p = this.p, time = now / 1000
    const md = this.#mood
    const mt = md ? (now - md.at) / MOOD_MS[md.name] : 1
    const w = md ? envelope(mt) : 0
    const is = (n: FlipMood) => (md?.name === n ? w : 0)
    const happy = is('happy'), yawn = is('yawn'), up = is('up'), down = is('down')
    const side = md?.side ?? this.#side

    // The swat: the face goes first, then one paw — back and up, fast, then
    // down at you, faster, past where it started, then back. The strike is a
    // tenth of a second; the wind-up and the glare around it are what read.
    const angry = is('swat')
    const cross = Math.max(angry, this.sulk ? 1 : 0)
    // Flat ears are a thing she does on her back. The grumpy she lands in
    // keeps its ears up, so on the way up hers come up with her, and are
    // already where that mood has them by the time it takes over.
    const crossEars = Math.max(angry, this.sulk ? smooth(seg(p, 0, 0.45)) : 0)
    const sm = md?.name === 'swat' ? clamp(mt) : 1
    const wind = smooth(seg(sm, 0.12, 0.3))
    const strike = Math.pow(seg(sm, 0.3, 0.4), 2)
    const recover = smooth(seg(sm, 0.46, 0.8))
    const swatY = (-15 * wind + 32 * strike) * (1 - recover)
    const swatA = (-28 * wind + 66 * strike) * (1 - recover)
    const jolt = strike * (1 - recover)

    const rollT = rollOf(p)
    const turn = S(rollT, K)
    const whip = whipAt(rollT, K)
    // Before the whip she gathers: a little lower, a little tighter.
    const gather = bump(rollT, 0.05, 0.48)
    // Past the half turn and back — her weight arriving on her crown — and a
    // smaller swing the other way as it settles.
    const settle = 9 * bump(rollT, 0.5, 0.86) - 2.5 * bump(rollT, 0.82, 1)
    // A pure logistic sits almost still for its first stretch, which reads as
    // a pause. A lean of her own leads into it and hands over as it takes off.
    const creep = 15 * smooth(seg(rollT, 0.04, 0.44)) * (1 - turn)
    const theta = 180 * turn + creep + settle
    const lift = 11 * whip - 2 * gather + happy * 2.5 * Math.abs(Math.sin(time * 7))
    const held = smooth(seg(p, 0.86, 1))
    // The rig's own breath, read from the same channel it breathes on, so the
    // frame she is handed back on breathes exactly as the frame before it.
    const BREATH = 'var(--breath, 0)'
    const sway = held * 2.2 * Math.sin(time * 0.9)
      + happy * 5 * Math.sin(time * 11)
      + yawn * 4 * Math.sin(Math.PI * clamp(mt))
      + (down - up) * 2.5 * Math.sign(Math.cos(Math.PI * turn))
      + side * (-3 * wind + 9 * jolt)
    const spin = theta + sway

    // --- skull: resting, round in the air, resting again the other way up.
    const m = turn
    const shape = m < 0.5 ? lerpPath(REST, ROUND, smooth(m * 2)) : lerpPath(ROUND_T, REST_T, smooth((m - 0.5) * 2))
    const d = `path('${write(shape)}')`
    for (const s of this.skulls) s.style.setProperty('d', d)

    // --- head: turned about its middle, breathing about whichever point is on
    // the floor, crouched as she gathers, puffed for the instant of the whip.
    const oy = 100 + (15 - 100) * m
    const puff = 1 + 0.04 * whip
    const sx = (1 + 0.03 * gather) * puff
    const sy = (1 - 0.06 * gather) * puff * (1 + 0.05 * yawn)
    // Upright, a resting head sits three quarters of a unit up off the floor —
    // the rig's lift at its resting squash — and the loop starts and ends
    // there, not at nought, so there is no step either side of it.
    const REST_LIFT = (1 - 0.85) * 5
    const head =
      `translate(0px, ${(-lift - REST_LIFT * (1 - m)).toFixed(2)}px) ` +
      `translate(${CX}px, ${CY}px) rotate(${spin.toFixed(2)}deg) translate(${-CX}px, ${-CY}px) ` +
      `translate(${CX}px, ${oy}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)}) ` +
      `scale(calc(1 - ${BREATH} * 0.006), calc(1 + ${BREATH} * 0.013)) translate(${-CX}px, ${-oy}px)`
    for (const h of this.heads) { h.style.transformOrigin = '0 0'; h.style.transform = head }
    if (this.contactClip) { this.contactClip.style.transformOrigin = '0 0'; this.contactClip.style.transform = head }

    // --- ears: back and short as she gathers, shortest through the whip —
    // on her side, out is down, and the ear nearest the floor is the one being
    // leant on — then out along the carpet with a spring in them. Angry is
    // flat back, the one thing every cat does before it swipes.
    const fold = Math.max(0.55 * gather, whip)
    const earLand = land(seg(rollT, 0.58, 0.96), 2.2)
    const flick = held * (Math.max(0, Math.sin(time * 2.7 + 1.3)) ** 24)
    const earA = -(24 * earLand - 7 * flick + 16 * crossEars)
    const earS = (1 - 0.12 * earLand) * (1 - 0.42 * fold) * (1 - 0.22 * yawn) * (1 + 0.08 * up) * (1 - 0.34 * crossEars)
    const earW = 1 + 0.05 * earLand
    for (const e of this.earsL) { e.style.transformOrigin = '28px 40px'; e.style.transform = `rotate(${earA.toFixed(2)}deg) scale(${earW.toFixed(3)}, ${earS.toFixed(3)})` }
    for (const e of this.earsR) { e.style.transformOrigin = '92px 40px'; e.style.transform = `rotate(${(-earA).toFixed(2)}deg) scale(${earW.toFixed(3)}, ${earS.toFixed(3)})` }

    // --- paws: they end where turning the whole of her half round would put
    // them — the upright pose upside down, toes up. Half a turn about her
    // middle takes a paw through the floor, so each goes round its own side
    // instead, turning over as it goes, a moment behind the head.
    const pr = seg(rollT, 0.06, 1)
    const pq = S(pr, K * 0.9)
    const pw = whipAt(pr, K * 0.9)
    const flop = 0.06 * bump(rollT, 0.62, 0.9)
    const out = 24 * Math.sin(Math.PI * pq)
    // Air biscuits, and quicker ones when she is pleased. Two steady rhythms
    // blended, not one rhythm whose speed changes: speeding up a sine by
    // changing its frequency moves its phase by the frequency times the whole
    // time the page has been open — minutes of it — so as the mood faded in
    // the paws jumped all over their cycle and buzzed.
    const knead = held * ((1 - happy) * Math.sin(time * 3.2) + happy * 2.2 * Math.sin(time * 6.4))
    const reach = yawn * Math.sin(Math.PI * clamp(mt))
    const dy = -69 * (pq + flop) - 3 * gather * (1 - pq)
    const turnP = 180 * pq
    const reachY = 8 * reach * Math.cos(Math.PI * pq)
    const pawL = { x: -out - 8 * reach, y: dy + held * 1.3 * knead + reachY, a: turnP + 5 * knead - 14 * reach }
    const pawR = { x: out + 8 * reach, y: dy - held * 1.3 * knead + reachY, a: -turnP + 5 * knead + 14 * reach }
    // One paw swats; the other braces. The paw keeps its size — the strike is
    // in the speed and the arc, not in the paw growing.
    const hit = side > 0 ? pawL : pawR, brace = side > 0 ? pawR : pawL
    const outward = side > 0 ? -1 : 1
    hit.y += swatY; hit.a += outward * swatA; hit.x += outward * 6 * jolt
    brace.y += 3 * angry
    const pawS = 1 + 0.05 * pw
    for (const e of this.pawsL) { e.style.transformOrigin = '27px 92px'; e.style.transform = `translate(${pawL.x.toFixed(2)}px, ${pawL.y.toFixed(2)}px) rotate(${pawL.a.toFixed(2)}deg) scale(${pawS.toFixed(3)})` }
    for (const e of this.pawsR) { e.style.transformOrigin = '93px 92px'; e.style.transform = `translate(${pawR.x.toFixed(2)}px, ${pawR.y.toFixed(2)}px) rotate(${pawR.a.toFixed(2)}deg) scale(${pawS.toFixed(3)})` }
    // The shadows the paws cast on her face follow them, and are gone while
    // the paws are in the air.
    const [cl, cr] = this.contact
    if (cl && cr) {
      const sh = dy + 16 * pq
      cl.setAttribute('transform', `translate(${pawL.x.toFixed(2)} ${sh.toFixed(2)})`)
      cr.setAttribute('transform', `translate(${pawR.x.toFixed(2)} ${sh.toFixed(2)})`)
      ;(cl.parentNode as SVGElement).setAttribute('opacity', (0.26 * (1 - Math.sin(Math.PI * pq))).toFixed(3))
    }

    // --- whiskers: they fan out and down from her cheeks, and turned half
    // round with her they fan up — the one part that says "upside down"
    // wrong, because whiskers hang the way they hang whichever way up the head
    // is. Mirrored top for bottom as she turns, they keep their set on screen.
    // About the middle of their own roots (y 68, the three strands start at
    // 62, 68 and 74), not the group's pivot at 78: mirrored about that, the
    // roots slid ten units down her face and the whiskers came out of her
    // forehead. About 68 the three roots land on each other's places.
    const wf = 1 - 2 * smooth(turn)
    this.whiskers.forEach((w, i) => {
      w.style.transform = `${this.#whiskerTf[i]} translate(0px, -10px) scale(1, ${wf.toFixed(3)}) translate(0px, 10px)`
    })

    // --- light: the room does not turn over with her.
    this.shade?.setAttribute('gradientTransform', `rotate(${(-spin).toFixed(2)} .5 .5)`)
    for (const { el, cx, cy } of this.glints) { el.style.transformOrigin = `${cx}px ${cy}px`; el.style.transform = `rotate(${(-spin).toFixed(2)}deg)` }

    // --- gaze: asked for on screen, turned into her frame.
    const gy = 4.2 * (down - up), a = -(spin * Math.PI) / 180
    this.svg.style.setProperty('--gaze-x', (-gy * Math.sin(a)).toFixed(2) + 'px')
    this.svg.style.setProperty('--gaze-y', (gy * Math.cos(a)).toFixed(2) + 'px')

    // --- faces, swapped at the top of each envelope.
    this.#show(cross > 0.2 ? 'angry' : happy > 0.35 ? 'happy' : yawn > 0.3 ? 'sleepy' : 'open',
      angry > 0.2 ? 'open' : this.sulk ? 'neutral' : happy > 0.35 ? 'smile' : yawn > 0.25 ? 'yawn' : 'neutral')

    // --- eyes: squeezed shut for the whip, then slow blinks, content.
    const squeeze = Math.max(bump(rollT, 0.36, 0.7), 0.6 * gather) * (this.sulk ? 0.35 : 1)
    const phase = (time % 4.6) / 4.6
    const lazy = held * (phase > 0.9 ? Math.sin(Math.PI * (phase - 0.9) / 0.1) : 0)
    const shut = Math.max(squeeze, lazy * 0.95 * (1 - up - down), held * 0.28 * (1 - Math.max(up, down, cross)))
    for (const l of this.lids) {
      const lp = lidPaths(l.cx, l.cy, l.rx, l.ry, l.t0 + (1 - l.t0) * shut)
      l.mask.setAttribute('d', lp.mask)
      l.lash?.setAttribute('d', lp.lash)
    }
  }
}
