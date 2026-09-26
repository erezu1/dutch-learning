import { useEffect, useRef } from 'react'

// ---------------------------------------------------------------------------
// Confetti, for the one screen that has earned it: a new level.
//
// Drawn on a canvas rather than as a few hundred DOM nodes — every piece moves
// every frame, and a layout engine is the wrong tool for that. Each piece is
// thrown out from a point (the ring, when it bursts), turns over as it falls,
// and drifts; a few seconds later a lighter shower comes down from the top,
// so the screen is still celebrating after the burst itself has landed.
//
// The pieces are in the cat's own colours — her patches, her stripes, the
// pink of her ears — with the app's accent, so a calico's confetti is black,
// ginger and pink and a tabby's is orange. About one in seven is a paw print.
// ---------------------------------------------------------------------------

type Shape = 'strip' | 'dot' | 'paw'

interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  angle: number
  spin: number
  /** Phase of the turn-over: a strip seen edge-on is thin. */
  flip: number
  flipRate: number
  color: string
  shape: Shape
}

const GRAVITY = 900 // px/s²
const DRAG = 0.985 // per frame at 60 fps

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function shape(): Shape {
  const r = Math.random()
  return r < 0.14 ? 'paw' : r < 0.4 ? 'dot' : 'strip'
}

function burst(x: number, y: number, colors: string[], count: number): Piece[] {
  return Array.from({ length: count }, () => {
    const a = Math.random() * Math.PI * 2
    // Mostly outwards and upwards: a burst that throws as much down as up
    // spends half itself on the floor at once.
    const speed = 380 + Math.random() * 620
    return {
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed * 0.8 - 420,
      size: 9 + Math.random() * 8,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 12,
      flip: Math.random() * Math.PI * 2,
      flipRate: 6 + Math.random() * 8,
      color: pick(colors),
      shape: shape(),
    }
  })
}

function shower(width: number, colors: string[], count: number): Piece[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: -20 - Math.random() * 260,
    vx: (Math.random() - 0.5) * 80,
    vy: 60 + Math.random() * 120,
    size: 8 + Math.random() * 7,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 8,
    flip: Math.random() * Math.PI * 2,
    flipRate: 4 + Math.random() * 6,
    color: pick(colors),
    shape: shape(),
  }))
}

function drawPaw(ctx: CanvasRenderingContext2D, s: number) {
  // A pad and four toes, in a box about `s` across.
  ctx.beginPath()
  ctx.ellipse(0, s * 0.18, s * 0.32, s * 0.26, 0, 0, Math.PI * 2)
  ctx.fill()
  const toes: [number, number][] = [
    [-0.36, -0.14],
    [-0.13, -0.36],
    [0.13, -0.36],
    [0.36, -0.14],
  ]
  for (const [tx, ty] of toes) {
    ctx.beginPath()
    ctx.arc(tx * s, ty * s, s * 0.12, 0, Math.PI * 2)
    ctx.fill()
  }
}

function draw(ctx: CanvasRenderingContext2D, p: Piece) {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.angle)
  // Turning over: squash one axis by the cosine of the flip, so a strip
  // catches the light and goes edge-on as it tumbles.
  ctx.scale(1, Math.max(0.15, Math.abs(Math.cos(p.flip))))
  ctx.fillStyle = p.color
  if (p.shape === 'strip') ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
  else if (p.shape === 'dot') {
    ctx.beginPath()
    ctx.arc(0, 0, p.size / 2.6, 0, Math.PI * 2)
    ctx.fill()
  } else drawPaw(ctx, p.size * 1.25)
  ctx.restore()
}

interface Props {
  /** Change it to fire. Zero (or unchanged) does nothing. */
  fire: number
  /** Where the burst comes from, in viewport pixels. */
  origin: () => { x: number; y: number } | null
  colors: string[]
}

export function Confetti({ fire, origin, colors }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const pieces = useRef<Piece[]>([])
  const raf = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (!fire) return
    const el = canvas.current
    const at = origin()
    if (!el || !at || !colors.length) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      el.width = window.innerWidth * dpr
      el.height = window.innerHeight * dpr
    }
    resize()
    const ctx = el.getContext('2d')
    if (!ctx) return

    pieces.current.push(...burst(at.x, at.y, colors, 180))
    // Two lighter showers from the top, after the burst has had its moment.
    timers.current.push(
      setTimeout(() => pieces.current.push(...shower(window.innerWidth, colors, 70)), 700),
      setTimeout(() => pieces.current.push(...shower(window.innerWidth, colors, 50)), 1700),
    )

    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const drag = Math.pow(DRAG, dt * 60)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      const floor = window.innerHeight + 40
      pieces.current = pieces.current.filter((p) => p.y < floor)
      for (const p of pieces.current) {
        p.vx *= drag
        p.vy = p.vy * drag + GRAVITY * dt * 0.55
        // Light things fall at their own pace: cap the speed so the paper
        // flutters down rather than dropping like a stone.
        p.vy = Math.min(p.vy, 420)
        p.x += p.vx * dt + Math.sin(p.flip) * 0.6
        p.y += p.vy * dt
        p.angle += p.spin * dt
        p.flip += p.flipRate * dt
        draw(ctx, p)
      }
      if (pieces.current.length || timers.current.length) raf.current = requestAnimationFrame(step)
      else raf.current = 0
    }
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(step)
    // The showers are queued; once they have gone in there is nothing left to
    // wait for, and the loop stops when the last piece is off the bottom.
    const done = setTimeout(() => (timers.current = []), 1800)
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      clearTimeout(done)
      for (const t of timers.current) clearTimeout(t)
      timers.current = []
      cancelAnimationFrame(raf.current)
      raf.current = 0
      pieces.current = []
    }
    // Fired by `fire` alone: the colours and origin are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fire])

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  )
}
