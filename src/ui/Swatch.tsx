import { motion } from 'framer-motion'
import { type ReactNode, type Ref } from 'react'
import { pressable } from './motion'

// ---------------------------------------------------------------------------
// One dot in a row of dots: the control for a choice you make by looking.
//
// Two rows use it — which colour, and which cat — and they were the same
// twenty lines written twice. Which is fine until one of them is tuned: the
// ring on one row was drawn in the swatch's own colour and on the other in the
// accent, which on every theme but the selected one is a different colour. The
// rows are meant to be the same control saying the same thing about two
// different lists, so they are one component now.
//
// The selected ring is drawn in two layers — the page colour first, then the
// accent — so a gap always separates the ring from the dot, whatever the dot
// is filled with. Without it a pale swatch and a pale page merge into one and
// the ring reads as floating.
// ---------------------------------------------------------------------------

export function Swatch({
  active,
  fill,
  label,
  onClick,
  children,
  ref,
}: {
  active: boolean
  /** What the dot itself is filled with. */
  fill: string
  label: string
  onClick: () => void
  /** Anything drawn inside the dot, like a face. */
  children?: ReactNode
  /** The row above measures where its dots are, so it needs to reach them. */
  ref?: Ref<HTMLButtonElement>
}) {
  return (
    <motion.button
      ref={ref}
      {...pressable}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      animate={{ scale: active ? 1.15 : 1 }}
      className="grid h-8 w-8 place-items-center rounded-full"
    >
      <span
        className="grid h-5 w-5 place-items-center overflow-hidden rounded-full transition-[box-shadow]"
        style={{
          background: fill,
          // On the elevation scale like every other control on this screen —
          // they were the one thing sitting flat on the page while the buttons
          // around them sat above it.
          boxShadow: active
            ? '0 0 0 3px var(--color-surface), 0 0 0 4.5px var(--color-primary), var(--shadow-1)'
            : 'var(--shadow-1)',
        }}
      >
        {children}
      </span>
    </motion.button>
  )
}
