// ---------------------------------------------------------------------------
// The state machine.
//
// Borrowed in shape from how Rive does it — named states, one-shot triggers,
// the app setting values rather than calling play() — and none of its runtime.
// A 200KB WASM player for one cat would also have baked her colours into the
// file, which is the thing that cannot happen here: her coats have to survive
// seven schemes in two ramps.
//
// The split that makes it work:
//
//   continuous  tilt, squash, ear turn, gaze. Numbers. They live in custom
//               properties, CSS transitions them, and two moods can therefore
//               be halfway between each other.
//   discrete    which eyes, which mouth, which brows. Drawings. All rendered
//               once and all but one hidden, so switching is an attribute
//               rather than a re-render — a fresh SVG would restart the breath
//               and drop every scheduled beat of the idle loop.
// ---------------------------------------------------------------------------

import { HEART, lidPaths, MOODS, EAR_TURN, ZED, type Mood } from './cat'

// --- what each mood is FOR -------------------------------------------------
// Three jobs, and every mood holds at least one. A mood with no job is a
// drawing nobody asked for, and it will drift out of step with the rest
// because nothing exercises it.
//
//   base      she rests here. The app chooses it from what is on screen.
//   drift     she wanders into it by herself and comes back. Never announced.
//   reaction  the app fires it at something that happened.
//   poke      she does it because you touched her.
//
// The two that needed a real answer:
//
// SAD is not for a wrong answer. Making a cat look hurt when you miss a Dutch
// word is how an app becomes something you avoid opening, and the miss is
// already on the card — she does not need to score it too. It is for coming
// back after a long absence, where the feeling is true and is about the gap,
// not about you.
//
// ANGRY is not for anything the app does. It is earned by pestering her: poke
// her four times inside a few seconds and she has had enough. That makes it
// the one mood the user can actually cause, which is worth more than using it
// as punishment, and it is self-limiting — stop poking and it never appears.
export const ROLE = {
  idle:      { jobs: ['base'],              when: 'cards are waiting' },
  lookDownC: { jobs: ['base'],              when: 'a card is on screen — she reads it' },
  lookDownL: { jobs: ['drift'],             when: 'glancing across what she is reading' },
  lookDownR: { jobs: ['drift'],             when: 'glancing across what she is reading' },
  sleepy:    { jobs: ['base'],              when: 'nothing is due' },
  yawn:      { jobs: ['drift'],             when: 'she has been dozing a while' },
  lookUpL:   { jobs: ['drift', 'reaction'], when: 'an idle glance up; the first run' },
  lookUpR:   { jobs: ['drift'],             when: 'an idle glance up' },
  curious:   { jobs: ['drift', 'reaction'], when: 'an idle glance; a wrong answer' },
  happy:     { jobs: ['reaction', 'poke'],  when: 'a right answer; being touched kindly' },
  surprised: { jobs: ['reaction', 'poke'],  when: 'a level reached; the first poke startles her' },
  startled:  { jobs: ['poke'],              when: 'something wakes her — the one time she leaves the ground' },
  celebrate: { jobs: ['reaction'],          when: 'the day is finished' },
  sad:       { jobs: ['reaction'],          when: 'you have been away and the pile has grown' },
  grumpy:    { jobs: ['poke'],              when: 'poked once too often' },
}

/**
 * Where she wanders from each resting state, and back.
 *
 * Looking up is in every list on purpose. A mascot that only ever looks at
 * the content is furniture; the glance up is the moment she is looking at
 * YOU, and it is worth more than any single expression because it is the one
 * that implies she knows you are there.
 */
const DRIFT: Record<string, string[]> = {
  idle: ['lookUpL', 'lookUpR', 'curious', 'lookDownC'],
  lookDownC: ['lookUpL', 'lookUpR', 'curious'],
  lookDownL: ['lookUpL', 'curious'],
  lookDownR: ['lookUpR', 'curious'],
  sleepy: ['yawn'],
}

/**
 * How likely a drift tick is to actually do anything, per resting state.
 *
 * Asleep she is mostly still. The tick runs every six to thirteen seconds and
 * a cat yawning on that cadence is not sleeping, it is performing sleeping —
 * so most ticks pass over her and the yawn arrives every minute or so, which
 * is what it is for: proof she is still there, not a metronome.
 */
const DRIFT_CHANCE: Record<string, number> = { sleepy: 0.13 }

/**
 * Moods that are the same job pointed different ways. She settles into any of
 * them and stays — unlike a drift, which is a visit and comes back.
 *
 * Reading is three directions rather than one because a gaze that holds a
 * single point is a stare, and a stare at the thing you are trying to read is
 * worse than no cat at all.
 */
const FAMILY = [['lookDownC', 'lookDownL', 'lookDownR']]
const familyOf = (name: string) => FAMILY.find((f) => f.includes(name))

/**
 * She cannot go straight from cross to pleased. Real irritation has a tail,
 * and a face that jumps the gap is just two drawings in sequence — the same
 * fault as a reaction with no floor, one level up.
 *
 * So being cross leaves a cooldown behind it. Anything warm asked for inside
 * that window comes out as the cooler thing instead: she will look at you, she
 * will not be delighted yet. She has to spend time ordinary — idling, reading,
 * bored — before she can be won back, which is the whole point.
 */
const WRONG = ['curious', 'surprised', 'lookUpL', 'lookUpR', 'sad']
const WRONG_WEIGHT: Record<string, number> = {
  curious: 46, surprised: 18, lookUpL: 11, lookUpR: 11, sad: 14,
}

const SULK = 5200
const WARM = new Set(['happy', 'celebrate'])
const COOLED = 'curious'

// Left alone she gets bored, and then she gets sleepy. Nothing in the app has
// to ask for this: a mascot that holds one pose forever is a sticker, and the
// second most useful thing she can do after reacting is visibly stop expecting
// anything.
//
// These are ranges rather than numbers. A cat that yawns at exactly three
// seconds every single time is a countdown, and you learn it in two cards —
// after which she is not dozing off, she is ticking. Drawn fresh on every
// stir, so no two waits are the same length.
//
// They are also short. At the forty-five seconds I first picked, the whole
// thing was unreachable in normal use: she would only ever have dozed off on
// a screen nobody was looking at, which is the one place it cannot be seen.
const YAWN_AFTER = [2000, 4200] as const   // ~3s
const SLEEP_AFTER = [2800, 5000] as const  // ~7s all in

// --- the marks that rise off her ------------------------------------------
// Each z and each heart is its own element with its own animation, spawned
// when a mood calls for one and removing itself when it has finished.
//
// A mood starts and stops the SPAWNING. It has no authority over a mark that
// is already in the air — those finish rising whatever she does next, the way
// a breath you have already let out does not come back when you change your
// mind. Gating them as a group meant waking her deleted the thought she was
// halfway through having.
const SVG_NS = 'http://www.w3.org/2000/svg'
const LANES = [-3.5, 3.5, 0]

interface Mark {
  d: string
  /** Where it starts, before its own jitter. */
  at: [number, number]
  scale: [number, number]
  rise: number
  drift: number
  ms: [number, number]
  peak: number
  /** Hearts are filled; a z is drawn. */
  stroke?: number
  fill?: string
}

// `at` is where a mark is born, and it has to be clear of her. Her ear reaches
// x = 116 near the top and her head x = 112 at its widest, so anything
// starting left of about 117 begins inside her and looks stuck to her face
// rather than rising off it. The frame's right edge is 134, which is what caps
// how large they can get: a heart at 2.4 is fourteen units across, and that is
// the whole of the room there is.
const MARKS: Record<string, Mark> = {
  z: { d: ZED, at: [112, 12], scale: [1.1, 1.55], rise: -26, drift: 6, ms: [2400, 3000], peak: 0.7, stroke: 1.8 },
  heart: { d: HEART, at: [117, 26], scale: [1.9, 2.4], rise: -30, drift: 3, ms: [1900, 2400], peak: 0.92, fill: '#EE8E96' },
}

/** Which brow set a mood wants. Only two moods have any. */
const browOf = (m: Mood) => (m.eyes === 'sad' ? 'up' : m.eyes === 'angry' ? 'down' : 'none')
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pickOne = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]
/** A coin that comes up true with probability p. */
const chance = (p: number) => Math.random() < p

export class CatRig {
  svg: SVGSVGElement
  base: string
  wanted: string
  lastActive: number
  onPose?: (name: string, mood: Mood) => void
  current = ''
  holding: ReturnType<typeof setTimeout> | null = null
  /**
   * Whether the hold in flight is something the app is saying, as opposed to
   * her own yawn. The wind-down waits for the first and is made of the second,
   * so it has to be able to tell them apart.
   */
  holdLoud = false
  drifting: ReturnType<typeof setTimeout> | null = null
  dozing: ReturnType<typeof setTimeout> | null = null
  dozeMark: ReturnType<typeof setTimeout> | null = null
  emitter: ReturnType<typeof setInterval> | null = null
  emitting: string | null = null
  emitSeq = 0
  groups: Record<string, SVGElement[]>
  pokes = 0
  lastPoke = 0
  locked = 0
  sulkUntil = 0
  lastWrong = ''

  constructor(
    svg: SVGSVGElement,
    { base = 'idle', drift = true, onPose }: {
      base?: string; drift?: boolean; onPose?: (name: string, mood: Mood) => void
    } = {},
  ) {
    this.svg = svg
    this.base = base
    this.wanted = base          // what the screen asked for
    this.lastActive = performance.now()
    this.onPose = onPose
    this.holding = null
    this.drifting = null
    this.groups = {
      eyes: [...svg.querySelectorAll<SVGElement>('[data-eyes]')],
      mouth: [...svg.querySelectorAll<SVGElement>('[data-mouth]')],
      brow: [...svg.querySelectorAll<SVGElement>('[data-brow]')],
    }
    this.pose(base)
    if (drift) this.#scheduleDrift()
    this.#scheduleDoze()
  }

  /**
   * Show one variant of a discrete part and hide its siblings.
   *
   * Via `display`, not the `hidden` property: `hidden` is honoured through a
   * UA stylesheet rule scoped to HTML elements and has no effect on an SVG
   * group, which left every variant drawn on top of every other one.
   */
  #choose(part: string, want: string) {
    for (const el of this.groups[part]) {
      el.setAttribute('display', el.dataset[part] === want ? 'inline' : 'none')
    }
  }

  /**
   * Put her in a mood. The drawings change now; the numbers are handed to CSS,
   * which walks them there over the transition — so calling this mid-move
   * redirects from wherever she currently is rather than snapping to the start.
   */
  pose(name: string) {
    const m = MOODS[name]
    if (!m) return
    this.current = name
    const s = this.svg.style
    const turn = m.ear ? (EAR_TURN[m.ear] ?? 0) : 0
    const [gx, gy] = m.gaze ?? [0, 0]
    s.setProperty('--tilt', `${m.tilt ?? 0}deg`)
    s.setProperty('--sq', String(m.squash ?? 0.85))
    s.setProperty('--ear-l', `${turn}deg`)
    s.setProperty('--ear-r', `${-turn}deg`)
    s.setProperty('--gaze-px', `${gx}px`)
    s.setProperty('--gaze-py', `${gy}px`)
    this.#choose('eyes', m.eyes)
    this.#choose('mouth', m.mouth)
    this.#choose('brow', browOf(m))
    // Cross once and she only pulls a face. Cross again while she is still
    // coming down from the last time, and it reaches her paws — losing your
    // temper is a thing that builds, and a cat who shakes at the first
    // annoyance has nowhere left to go when you keep at it.
    //
    // Read before the clock is reset, because resetting it is what would make
    // every temper look like a second one.
    const again = name === 'grumpy' && performance.now() < this.sulkUntil
    if (name === 'grumpy') this.sulkUntil = performance.now() + SULK
    // Two moods reach the paws. Toggled by class rather than written into the
    // pose, because they are loops and the pose is a destination.
    this.svg.classList.toggle('cat-delighted', name === 'celebrate')
    // A yawn trembles and so does a temper that has already been lost once.
    // Same channel: being properly cross is a whole-body thing, and leaving
    // her paws perfectly still under a furious face is what made the anger
    // read as a mask.
    this.svg.classList.toggle('cat-shake', name === 'yawn' || again)
    // Only while she is actually settled — a yawn is a moment on the way there
    // and on the way back, and zzz flickering on either side of it would read
    // as a fault — and not until she has been settled a second.
    //
    // She has to visibly stop first. Arriving with the pose, the two read as
    // one switch being thrown rather than as a cat falling asleep and then
    // being asleep. Coming back is not symmetrical: waking is a single event,
    // so the class goes the instant anything else happens.
    clearTimeout(this.dozeMark ?? undefined)
    if (name === 'sleepy') {
      // She has to visibly stop, and then stay stopped, before the first one
      // appears. Arriving with the pose they read as one switch being thrown;
      // arriving straight after it they read as a cat falling asleep. Three
      // seconds is what it takes to read as a cat that is already asleep,
      // which is the thing the z is actually reporting.
      this.dozeMark = setTimeout(() => this.#emit('z'), 2950)
    } else {
      this.dozeMark = null
      this.#emit(name === 'celebrate' ? 'heart' : null)
    }
    // A gesture the mood cannot carry itself. Arriving at curious is a sniff:
    // she has noticed something and is checking it, which the face alone only
    // says statically.
    if (name === 'curious' && this.current !== name) this.gesture('sniff')
    this.onPose?.(name, m)
    // The idle loop reads this so a blink closes whatever is still open rather
    // than opening her eyes first to do it.
    this.svg.dataset.lid = String(m.lid ?? 0)
    // The mood she is actually wearing, where it can be seen from outside —
    // by CSS, and by anyone checking that what she is doing is what the app
    // asked for.
    this.svg.dataset.mood = name
  }

  /** The mood she falls back to. Takes effect at the end of any current hold. */
  setBase(name: string) {
    this.wanted = this.base = name
    this.lastActive = performance.now()
    // A new situation restarts the wind-down: arriving at a card should give
    // her the full three seconds before she starts yawning at you, not
    // whatever was left over from the last one.
    this.#scheduleDoze()
    if (!this.holding) this.pose(name)
  }

  /** Anything that means she is being paid attention to. Wakes her up. */
  #stir() {
    this.lastActive = performance.now()
    this.#scheduleDoze()
    // Settling on a different direction within the same family is not
    // something to correct — the screen asked her to read, and she is still
    // reading, just not at the same spot.
    const family = familyOf(this.wanted)
    if (this.base !== this.wanted && !(family && family.includes(this.base))) {
      this.base = this.wanted
    }
  }

  /**
   * A one-shot. She holds the mood, then returns to base on her own.
   * Calling it again mid-react replaces the first rather than queueing: a
   * mascot working through a backlog of reactions is answering questions you
   * have stopped asking.
   */
  react(name: string, { ms = 1500, then, quiet = false, min = 450 }:
    { ms?: number; then?: () => void; quiet?: boolean; min?: number } = {}) {
    const now = performance.now()
    // Still coming down. Acknowledge, do not celebrate.
    if (WARM.has(name) && now < this.sulkUntil) name = COOLED
    // A reaction gets to finish saying what it is. Until its floor has passed
    // nothing else may replace it — except itself, which is how a mood extends
    // rather than restarts. Without this she flickers between contradictory
    // states on rapid input and reads as having nothing behind the face.
    if (this.locked > now && name !== this.current) return
    // Woken. Anything the app or a finger does to her while she is asleep
    // gets her off the ground first — a cat that opens her eyes and is
    // simply awake never was asleep. The drift is exempt because it is
    // quiet: shifting in her sleep is not being woken by anything.
    if (!quiet && this.current === 'sleepy' && name !== 'sleepy') this.hop()
    this.locked = now + Math.min(min, ms)
    if (!quiet) this.#stir()
    clearTimeout(this.holding ?? undefined)
    this.pose(name)
    this.holdLoud = !quiet
    this.holding = setTimeout(() => {
      this.holding = null
      this.holdLoud = false
      if (then) then()
      else this.pose(this.base)
      // The wind-down starts from when she stopped reacting, not from when she
      // started: a long reaction should not be followed instantly by a yawn.
      // Her own yawn is exempt, or it would keep restarting the clock that
      // produced it and she would never get to sleep.
      if (!quiet) this.#scheduleDoze()
    }, ms)
  }

  /**
   * Being touched. The first poke startles her and she recovers into pleased;
   * keep poking and she runs out of patience. Counting inside a window rather
   * than forever means she forgives you as soon as you stop.
   */
  tap() {
    // A poke always lands. The floor exists to stop reactions flickering past
    // each other, not to make her ignore you — and the thing it was most
    // likely to swallow was a tap arriving during a drift, which is a beat
    // nobody asked for blocking one somebody did.
    this.locked = 0
    this.#stir()
    const now = performance.now()
    this.pokes = now - this.lastPoke < 2600 ? this.pokes + 1 : 1
    this.lastPoke = now
    // Once she is cross, more poking does not cheer her up — it extends it.
    // Any other reading means she goes from angry to delighted in one frame,
    // which is not a mood change, it is two unrelated drawings in sequence.
    if (this.current === 'grumpy' || this.pokes >= 4) {
      // Poked while already cross. The expression cannot say anything new —
      // she is wearing it — so the answer is a gesture: a hard huff through
      // the nose. It is also the only way a held mood can acknowledge input
      // at all without abandoning itself.
      this.huff()
      return this.react('grumpy', { ms: 2800, min: 2800 })
    }
    // The first poke is the big one. Meeting somebody is worth more than the
    // fourth time they prod you, so she is delighted once and merely pleased
    // after that — and the difference is what makes the first one feel like a
    // greeting rather than a response.
    //
    // The startle stays either way, short, as anticipation: something small
    // before something large is what stops the large thing arriving from
    // nowhere. The warm half goes through react, so the cooling-off period
    // still catches it — poke her just after a sulk and she startles and then
    // merely looks at you.
    const warm = this.pokes === 1 ? 'celebrate' : 'happy'
    // Prodding someone awake is not the same as prodding someone. The startle
    // is the bigger one and it is given room to land before the warm half.
    const woken = this.current === 'sleepy'
    this.react(woken ? 'startled' : 'surprised', {
      ms: woken ? 760 : 520, min: woken ? 760 : 520,
      then: () => this.react(warm, { ms: warm === 'celebrate' ? 2100 : 1600, min: 900 }),
    })
  }

  /**
   * She wanders off on her own and comes back. Without it one loop goes stale
   * in about a minute and a half — long enough that you stop noticing her, and
   * then notice that you stopped.
   */
  /**
   * Her own clock for winding down, on its own timers rather than polled by
   * the drift tick. The tick runs every six to thirteen seconds, so anything
   * it checks cannot resolve faster than that — a three-second yawn tested
   * against it simply never happened on time.
   */
  #scheduleDoze() {
    clearTimeout(this.dozing ?? undefined)
    if (this.wanted === 'sleepy') return
    this.dozing = setTimeout(() => {
      // `quiet`, so a yawn does not count as being paid attention to and reset
      // the very clock that produced it.
      if (!this.holding) this.react('yawn', { ms: 2400, quiet: true, min: 0 })
      this.dozing = setTimeout(() => {
        this.dozing = null
        if (this.wanted === 'sleepy') return
        // Mid-reaction. Falling asleep behind it would mean opening her eyes
        // on a face she never chose — wait, and start the clock over.
        if (this.holdLoud) return this.#scheduleDoze()
        this.base = 'sleepy'
        if (!this.holding) this.pose('sleepy')
      }, rand(...SLEEP_AFTER))
    }, rand(...YAWN_AFTER))
  }

  #scheduleDrift() {
    this.drifting = setTimeout(() => {
      // Never over a reaction: the app is saying something and she is not.
      if (!this.holding) {
        {
          const family = familyOf(this.base)
          // Half the time she resettles somewhere else in the same family and
          // stays there; the rest of the time she pays a visit and returns.
          // Only resettling makes her restless, only visiting makes her a
          // metronome pointed at one spot.
          if (family && Math.random() < 0.5) {
            const to = pickOne(family.filter((f) => f !== this.base))
            this.base = to
            this.pose(to)
          } else {
            const options = DRIFT[this.base]
            if (options && chance(DRIFT_CHANCE[this.base] ?? 1)) {
              this.react(pickOne(options), { ms: rand(1400, 2800), quiet: true, min: 0 })
            }
          }
        }
      }
      this.#scheduleDrift()
    }, rand(6000, 13000))
  }

  /**
   * The huff: ears flat, nose working, whiskers back. Three sharp pulses, not
   * one swell — a sniff is curiosity and this is not.
   *
   * It lives here rather than in the idle loop because it is a response to
   * input, and the idle loop stops itself whenever the tab is hidden. A
   * reaction that only works while she happens to be idling is not a
   * reaction. The loop keeps the beats nobody asked for; the rig keeps the
   * ones somebody did.
   */
  huff() {
    const pulse = (prop: string, ms: number) =>
      this.svg.animate([
        { [prop]: 0 },
        { [prop]: 1, offset: 0.13 }, { [prop]: 0.12, offset: 0.3 },
        { [prop]: 0.95, offset: 0.46 }, { [prop]: 0.08, offset: 0.63 },
        { [prop]: 0.72, offset: 0.79 }, { [prop]: 0 },
      ], { duration: ms, easing: 'ease-out', fill: 'none' })

    // The nose goes every time — it is the part that says "again?" and the
    // huff would not be a huff without it.
    pulse('--huff', 680)

    // The ears are optional and independent: neither, one, or both. A tic
    // that repeats exactly is a mechanism rather than a mood, and the ears
    // are the cheapest place to buy that variation.
    const ears = pickOne([[], ['l'], ['r'], ['l', 'r'], ['l', 'r']])
    // Slightly different lengths, so even "both" is never quite symmetrical.
    for (const side of ears) pulse(`--huff-${side}`, rand(560, 760))
  }

  /** How she takes a miss. Weighted, and never the same twice running. */
  pickWrong(): string {
    const pool = WRONG.filter((m) => m !== this.lastWrong)
    const roll = Math.random() * pool.reduce((n, m) => n + WRONG_WEIGHT[m], 0)
    let seen = 0
    const chosen = pool.find((m) => (seen += WRONG_WEIGHT[m]) >= roll) ?? pool[0]
    this.lastWrong = chosen
    return chosen
  }

  /** One mark, launched and then on its own. */
  #spawn(kind: string) {
    const m = MARKS[kind]
    const host = this.svg.querySelector<SVGElement>('.cat-emit')
    if (!m || !host) return
    const g = document.createElementNS(SVG_NS, 'g')
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', m.d)
    if (m.fill) path.setAttribute('fill', m.fill)
    else {
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', host.dataset.ink ?? '#000')
      path.setAttribute('stroke-width', String(m.stroke ?? 1.8))
      path.setAttribute('stroke-linecap', 'round')
      path.setAttribute('stroke-linejoin', 'round')
    }
    g.append(path)
    g.style.transformBox = 'fill-box'
    g.style.transformOrigin = 'center'
    host.append(g)

    // Consecutive marks take turns across three lanes rather than each
    // picking at random. Random placement in a space this narrow keeps
    // producing pairs that sit on top of each other, and two z's overlapping
    // read as one badly drawn z. Taking turns guarantees the separation that
    // randomness only tends towards.
    //
    // The timing does the other half: each is spawned after the one before it
    // has risen further than a mark is tall, so they are apart vertically even
    // when the lanes bring them back into line.
    const lane = LANES[this.emitSeq++ % LANES.length]
    const x = m.at[0] + lane + rand(-0.8, 0.8)
    const y = m.at[1] + rand(-2, 2)
    const s = rand(m.scale[0], m.scale[1])
    const at = (px: number, py: number, ps: number) =>
      `translate(${px.toFixed(2)}px, ${py.toFixed(2)}px) scale(${ps.toFixed(3)})`
    const anim = g.animate(
      [
        { opacity: 0, transform: at(x, y, s * 0.6) },
        { opacity: m.peak, offset: 0.24, transform: at(x, y + m.rise * 0.2, s) },
        { opacity: 0, transform: at(x + m.drift, y + m.rise, s * 1.1) },
      ],
      { duration: rand(m.ms[0], m.ms[1]), easing: 'ease-out', fill: 'none' },
    )
    anim.finished.then(() => g.remove()).catch(() => g.remove())
  }

  /** Start or stop spawning. Never touches what is already rising. */
  #emit(kind: string | null) {
    if (this.emitting === kind) return
    this.emitting = kind
    clearInterval(this.emitter ?? undefined)
    this.emitter = null
    if (!kind || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    this.#spawn(kind)
    // Long enough that the last one has climbed clear. Below that they stack
    // up in the same few units of sky and stop reading as separate marks.
    this.emitter = setInterval(() => this.#spawn(kind), kind === 'heart' ? 1150 : 1500)
  }

  /** A gesture the idle loop owns. It may not be listening. */
  /**
   * A start: she comes off the ledge and settles back onto it.
   *
   * One channel, `--hop`, which the head and the paws each read at their own
   * gain — so it composes with whatever mood she is in instead of fighting it,
   * and a one-shot that returns to zero leaves nothing behind for the next
   * mood to undo.
   */
  hop() {
    // Up is muscle and down is gravity, so up is the shorter half: about
    // 130ms of rise against 220ms of fall, the rise decelerating into the
    // apex and the fall accelerating out of it. Equal halves read as a
    // bounce on a spring rather than as something that jumped.
    //
    // The whole thing is over in six hundred milliseconds. A start is a
    // thing that has happened to her, not a thing she is doing.
    //
    // She crouches before she goes and absorbs when she lands. Neither is
    // the jump, and both are small, but without them she arrives at the top
    // of the move with nothing having led up to it — which is the whole of
    // what "abrupt" means in a drawing that is otherwise this soft.
    const arc = [
      { v: 0, at: 0, ease: 'ease-out' },
      { v: -0.12, at: 0.13, ease: 'cubic-bezier(.18,.9,.36,1)' },
      { v: 1, at: 0.34, ease: 'cubic-bezier(.45,0,.75,.62)' },
      { v: 0, at: 0.7, ease: 'ease-out' },
      { v: -0.09, at: 0.82, ease: 'ease-out' },
      { v: 0, at: 1 },
    ]
    const frames = (prop: string) =>
      arc.map((k) => ({ [prop]: k.v, offset: k.at, easing: k.ease })) as Keyframe[]
    const timing = { duration: 600, easing: 'linear' } as const
    this.svg.animate(frames('--hop'), timing)
    // The same curve, late. The body goes first and drags the legs after it.
    this.svg.animate(frames('--hop-paw'), { ...timing, delay: 60 })
  }

  gesture(name: string) {
    this.svg.dispatchEvent(new CustomEvent(`cat:${name}`))
  }

  destroy() {
    clearTimeout(this.holding ?? undefined)
    clearTimeout(this.drifting ?? undefined)
    clearTimeout(this.dozing ?? undefined)
    clearTimeout(this.dozeMark ?? undefined)
    clearInterval(this.emitter ?? undefined)
    this.holding = this.drifting = this.dozing = this.dozeMark = null
    this.emitter = null
  }
}

/**
 * What the app actually says to her. Screens name a situation, never an
 * expression, so the mapping can change without touching a screen.
 */
export type SceneName =
  | 'waiting' | 'reading' | 'nothingDue' | 'correct' | 'wrong'
  | 'finished' | 'levelUp' | 'greeting'
  // How she takes the week when you walk in. One of these fires once per
  // visit, and only ever on arrival.
  | 'arriveProud' | 'arriveGlad' | 'arriveBehind' | 'arriveAway'

export const SCENE: Record<SceneName, (r: CatRig) => void> = {
  waiting: (r: CatRig) => r.setBase('idle'),
  reading: (r: CatRig) => r.setBase('lookDownC'),
  nothingDue: (r: CatRig) => r.setBase('sleepy'),
  // Every hold is long enough to be read at a glance and then some. Under
  // about a second a reaction registers as a flicker: you see that something
  // happened without seeing what, which is worse than not reacting at all.
  correct: (r: CatRig) => r.react('happy', { ms: 1600, min: 900 }),
  // A miss is not one fixed face. Mostly she is puzzled — that is the honest
  // reading of a wrong answer, and it keeps the weight on the word rather
  // than on you. Sometimes she is caught out by it, sometimes she looks up at
  // you instead of at the card, and once in a while it does land as a small
  // disappointment. Sad earns its place here precisely because it is rare:
  // every time would be an app that tells you off, and never at all would be
  // an app that does not notice.
  //
  // Never the same one twice running, which matters more than the weights: a
  // repeat reads as a fixed response even when the set is varied.
  wrong: (r: CatRig) => r.react(r.pickWrong(), { ms: 1500, min: 900 }),
  finished: (r: CatRig) => r.react('celebrate', { ms: 2800, min: 1600 }),
  levelUp: (r: CatRig) => r.react('surprised', { ms: 1900, min: 1100 }),
  greeting: (r: CatRig) => r.react('lookUpL', { ms: 2200, min: 1200 }),
  // Arrival is the one moment she is not reacting to something you just did,
  // so it is also the one moment nothing else is competing for your eye. These
  // hold about twice as long as an in-round reaction: you are still finding
  // your bearings on a screen you have just opened, and a face that has
  // finished making its point before you have finished arriving made no point
  // at all. The wind-down cannot cut them short — a loud hold defers the doze
  // clock and restarts it when it ends.
  arriveProud: (r: CatRig) => r.react('celebrate', { ms: 3600, min: 2600 }),
  arriveGlad: (r: CatRig) => r.react('happy', { ms: 3400, min: 2400 }),
  arriveBehind: (r: CatRig) => r.react('curious', { ms: 3400, min: 2400 }),
  arriveAway: (r: CatRig) => r.react('sad', { ms: 4200, min: 3200 }),
}
// ---------------------------------------------------------------------------
// The idle loop: what she does when nothing is happening.
//
// Three rules from how this is done properly, all of which change the code:
//
// 1. The blink must NOT run on the same clock as the breath. Two loops of
//    fixed length, however well chosen, resolve into one long pattern and the
//    whole thing reads as a machine. So the breath is a CSS loop and every
//    other beat is scheduled on its own random interval.
// 2. One base loop goes stale after roughly a minute and a half. It needs
//    secondary idles — the ear flick, the nose twitch, the glance — fired far
//    enough apart that you never learn their rhythm.
// 3. Parts cascade rather than moving together. An ear that twitches at the
//    same instant as the head reads as one rigid object.
//
// Everything is driven through registered custom properties, so it composes
// with whatever pose the mood has set instead of overwriting it.
// ---------------------------------------------------------------------------



export function idle(svg: SVGSVGElement, { breath = true } = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const timers = new Set<ReturnType<typeof setTimeout>>()
  let stopped = false

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => { timers.delete(t); fn() }, ms)
    timers.add(t)
    return t
  }

  // WAAPI rather than CSS for these: the point is that each has its own
  // irregular schedule, and a CSS animation can only repeat on a fixed one.
  const play = (frames: Keyframe[], duration: number, easing = 'ease-in-out') =>
    svg.animate(frames, { duration, easing, fill: 'none' })

  // --- blink -------------------------------------------------------------
  // Driven by attribute from a frame loop, not by an animated custom
  // property: Chrome will not re-evaluate a clipPath's geometry when a
  // property inside it changes, so the lid never moved and only the lash line
  // travelled — a blinking eyebrow over an open eye. Writing both in the same
  // frame also welds the line to the lid edge it is drawing.
  //
  // A real blink is about an eighth of a second, but a drawn one that fast
  // reads as a glitch rather than as a blink: you see that something happened
  // without seeing what. Closing faster than opening is what keeps it from
  // looking sleepy at this length.
  // The mask and the border are the same curve at the same instant, so they
  // are recomputed together from one call. Anything that derives them
  // separately drifts apart the moment the timing is not identical.
  const lidParts = [...svg.querySelectorAll<SVGElement>('.cat-lidmask, .cat-lash')]
  const SHUT = 150, OPEN = 210

  function setLid(t: number) {
    // Three things stack, in order of how long they last: the eye variant's
    // own lid, the mood's bias on top of it, and the blink closing whatever
    // remains. Each closes a fraction of what is still open rather than
    // setting an absolute, so a cat already looking down blinks from there
    // instead of opening her eyes first to do it.
    const bias = +(svg.dataset.lid || 0)
    for (const el of lidParts) {
      const n = (k: string) => Number(el.dataset[k] ?? 0)
      const t0 = n('t0')
      const base = t0 + bias * (1 - t0)
      const at = base + t * (1 - base)
      const paths = lidPaths(n('cx'), n('cy'), n('rx'), n('ry'), at)
      el.setAttribute('d', el.classList.contains('cat-lash') ? paths.lash : paths.mask)
    }
  }

  // How shut she is at a given moment of the blink. Pulled out as its own
  // function because the face has to sample the same curve, just later.
  const shape = (e: number) => {
    if (e <= 0) return 0
    if (e < SHUT) return (e / SHUT) ** 1.7               // shut: accelerating
    if (e < SHUT + OPEN) return (1 - (e - SHUT) / OPEN) ** 2   // open: easing out
    return 0
  }

  // The muzzle follows the lids down and comes back up behind them. Parts that
  // arrive together read as one rigid object; the lag is most of what makes a
  // face look like it is attached to something.
  const FACE_LAG = 55

  function blink() {
    if (stopped) return
    const t0 = performance.now()
    const step = (now: number) => {
      if (stopped) { setLid(0); svg.style.setProperty('--face-dip', '0'); return }
      const e = now - t0
      setLid(shape(e))
      svg.style.setProperty('--face-dip', shape(e - FACE_LAG).toFixed(3))
      if (e >= SHUT + OPEN + FACE_LAG) { setLid(0); svg.style.setProperty('--face-dip', '0'); return }
      requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
    // Real blinks cluster. A double every so often is most of what stops the
    // interval sounding metronomic.
    if (chance(0.16)) later(blink, SHUT + OPEN + rand(90, 170))
    else later(blink, rand(2800, 7400))
  }

  // --- ear flick ---------------------------------------------------------
  // One ear at a time, never both, and asymmetric in the return: out fast,
  // back with a small overshoot. A symmetric twitch looks mechanical.
  function flick() {
    if (stopped) return
    const v = chance(0.5) ? '--twitch-l' : '--twitch-r'
    const away = v === '--twitch-l' ? -9 : 9
    play([
      { [v]: '0deg' },
      { [v]: `${away}deg`, offset: 0.28 },
      { [v]: `${-away * 0.22}deg`, offset: 0.62 },
      { [v]: '0deg' },
    ], 340, 'ease-out')
    later(flick, rand(5000, 13000))
  }

  // --- glance ------------------------------------------------------------
  // The eyes drift and come back. Cheap, and it is the single thing that
  // stops a still face looking like a drawing rather than an animal.
  function glance() {
    if (stopped) return
    const x = rand(-2.6, 2.6).toFixed(2)
    const y = rand(-1.4, 0.9).toFixed(2)
    play([
      { '--gaze-x': '0px', '--gaze-y': '0px' },
      { '--gaze-x': `${x}px`, '--gaze-y': `${y}px`, offset: 0.18 },
      { '--gaze-x': `${x}px`, '--gaze-y': `${y}px`, offset: 0.72 },
      { '--gaze-x': '0px', '--gaze-y': '0px' },
    ], rand(1400, 2200), 'ease-in-out')
    later(glance, rand(4200, 11000))
  }

  // --- nose twitch -------------------------------------------------------
  // Rare and tiny. It is the sniff, and it should barely register.
  function sniff() {
    if (stopped) return
    sniffOnce()
    later(sniff, rand(9000, 24000))
  }

  function sniffOnce() {
    play([
      { '--whisk': 0 }, { '--whisk': 0.45, offset: 0.35 }, { '--whisk': 0 },
    ], 480, 'ease-out')
    play([
      { '--sniff': 0 }, { '--sniff': 1, offset: 0.3 },
      { '--sniff': 0, offset: 0.55 }, { '--sniff': 0.6, offset: 0.75 }, { '--sniff': 0 },
    ], 420, 'ease-out')
  }

  svg.addEventListener('cat:sniff', () => !stopped && sniffOnce())

  // --- whisker twitch ----------------------------------------------------
  // The one beat that keeps running whatever she is doing. Whiskers move on a
  // sleeping cat as readily as on a waking one — they are wired to her nose,
  // not to her mood — so this is deliberately not gated on anything, and it is
  // the only sign of life left when everything else has gone still.
  //
  // Direction is random. A twitch that always goes the same way is a tic.
  function whisk() {
    if (stopped) return
    const d = chance(0.5) ? 1 : -1
    play([
      { '--whisk': 0 },
      { '--whisk': d, offset: 0.22 },
      { '--whisk': d * -0.28, offset: 0.55 },
      { '--whisk': 0 },
    ], rand(420, 620), 'ease-out')
    later(whisk, rand(5200, 14000))
  }

  function start() {
    if (reduced.matches) return
    stopped = false
    svg.classList.toggle('cat-breathing', breath)
    // Staggered entry, so the first few seconds are not all four beats at
    // once — the same cascade rule, applied to starting up.
    later(blink, rand(600, 2400))
    later(flick, rand(2000, 6000))
    later(glance, rand(1500, 5000))
    later(sniff, rand(4000, 12000))
    later(whisk, rand(1600, 5000))
  }

  function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    timers.clear()
    svg.classList.remove('cat-breathing')
    svg.getAnimations().forEach((a) => a.cancel())
  }

  // Nothing runs while the tab is in the background: the timers would pile up
  // and all fire at once on return.
  const onVisibility = () => (document.hidden ? stop() : start())
  document.addEventListener('visibilitychange', onVisibility)
  // The phone can be asked for less motion at any time, not only at load.
  reduced.addEventListener('change', () => (reduced.matches ? stop() : start()))

  start()
  return () => { stop(); document.removeEventListener('visibilitychange', onVisibility) }
}
