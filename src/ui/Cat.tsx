import { useEffect, useRef } from 'react'
import { catSvg, type CoatId } from '../core/cat'
import { CatRig, idle, SCENE, type SceneName } from '../core/cat-rig'

// ---------------------------------------------------------------------------
// The mascot, as one element the rest of the app talks to in situations.
//
// She is built once and then never re-rendered: her moods are drawings that
// are all present from the start and hidden by attribute, and her poses are
// numbers in custom properties. A React re-render would restart her breath and
// drop every scheduled beat of the idle loop mid-flight, so the component
// deliberately does almost nothing after mounting — it hands the DOM node to
// the rig and gets out of the way.
//
// `scene` is the only thing that crosses the boundary. Screens name what is
// happening, never an expression, so the mapping can change here without any
// screen being touched.
// ---------------------------------------------------------------------------

interface Props {
  coat: CoatId
  /** The resting situation. Changing it moves her; it never re-renders her. */
  scene: SceneName
  /** A one-off, keyed so the same event twice still plays twice. */
  beat?: { scene: SceneName; key: number } | null
  /** Light or dark, for the rim of light she needs on a dark page. */
  rim?: boolean
  className?: string
  /** Height in px. The width follows from the drawing's own proportions. */
  size?: number
  label?: string
}

/**
 * Copy where every running animation had got to, element for element.
 *
 * The two trees are built by the same generator from the same arguments, so
 * they have the same shape and walking them together lines each animation up
 * with its own counterpart.
 */
function carryPhase(from: Element, to: Element) {
  const a = from.getAnimations()
  const b = to.getAnimations()
  for (let i = 0; i < Math.min(a.length, b.length); i++) b[i].currentTime = a[i].currentTime
  const ax = [...from.children]
  const bx = [...to.children]
  for (let i = 0; i < Math.min(ax.length, bx.length); i++) carryPhase(ax[i], bx[i])
}

export function Cat({ coat, scene, beat, rim = false, className = '', size = 96, label }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const rig = useRef<CatRig | null>(null)
  /**
   * What she was doing when the last drawing was torn down.
   *
   * React runs the old effect's cleanup before the new effect's body, so the
   * previous rig is already gone by the time the new one exists — the state
   * has to be caught on the way out and handed over on the way in.
   */
  const carried = useRef<ReturnType<CatRig['snapshot']> | null>(null)

  // Rebuilt only when the drawing itself changes — a different cat, or a
  // different ramp to stand on. Never for a mood.
  //
  // Changing coat cross-fades rather than cutting. The old cat stays for a
  // quarter of a second, lifted out of flow and fading, while the new one
  // arrives underneath it — so the swap reads as the same animal in different
  // markings rather than one being deleted and another appearing. The old one
  // goes out of flow rather than the new one, because the new one has to hold
  // the layout open: absolutely positioning the incoming cat would collapse
  // the row and everything below it would jump.
  useEffect(() => {
    const box = host.current
    if (!box) return
    const outgoing = box.firstElementChild as SVGElement | null

    const holder = document.createElement('div')
    holder.innerHTML = catSvg({ coat, mood: 'idle', rim, size, rig: true })
    const svg = holder.querySelector('svg')
    if (!svg) return
    svg.classList.add('cat-rig')
    svg.removeAttribute('width')
    svg.setAttribute('height', String(size))
    box.prepend(svg)

    if (outgoing) {
      outgoing.style.cssText = 'position:absolute;inset:0;margin:auto;pointer-events:none'
      const fade = outgoing.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 240,
        easing: 'ease-out',
        fill: 'forwards',
      })
      fade.finished.then(() => outgoing.remove()).catch(() => outgoing.remove())
      svg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-in' })
    }

    const r = new CatRig(svg)
    rig.current = r
    if (carried.current) r.restore(carried.current)
    const stopIdle = idle(svg)
    // And the loops themselves, AFTER the idle loop has started them — there
    // is nothing to line up with until it has. The breath and the knead begin
    // at zero on a new element, so without this the two cats breathe out of
    // step in front of each other, which is the one moment both are on screen
    // and the only moment it could show.
    if (outgoing) carryPhase(outgoing, svg)
    return () => {
      carried.current = r.snapshot()
      stopIdle()
      r.destroy()
      rig.current = null
    }
  }, [coat, rim, size])

  useEffect(() => {
    if (rig.current) SCENE[scene](rig.current)
  }, [scene])

  useEffect(() => {
    if (beat && rig.current) SCENE[beat.scene](rig.current)
  }, [beat])

  return (
    <div
      ref={host}
      className={`relative flex justify-center ${className}`}
      // She answers a poke, so she is a button — but a decorative one, and the
      // label says which cat and nothing about what pressing her achieves,
      // because pressing her achieves nothing.
      role="button"
      tabIndex={0}
      aria-label={label ?? 'The cat'}
      onClick={() => rig.current?.tap()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          rig.current?.tap()
        }
      }}
    />
  )
}
