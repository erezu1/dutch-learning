import { motion } from 'framer-motion'
import { swatch, THEMES, type Resolved, type Theme } from '../core/themes'
import { pressable } from './motion'

// ---------------------------------------------------------------------------
// A row of dots on the home screen. Colour is the kind of choice that should
// be made by looking, not by reading a list of names — so the swatch is the
// control and the name is only there for screen readers.
// ---------------------------------------------------------------------------

export function ThemePicker({
  current,
  resolved,
  onPick,
}: {
  current: Theme
  resolved: Resolved
  onPick: (t: Theme) => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {THEMES.map((theme) => {
        const active = theme.id === current.id
        return (
          <motion.button
            key={theme.id}
            {...pressable}
            onClick={() => onPick(theme)}
            aria-label={theme.name}
            aria-pressed={active}
            animate={{ scale: active ? 1.15 : 1 }}
            className="grid h-8 w-8 place-items-center rounded-full"
          >
            <span
              className="block h-5 w-5 rounded-full transition-[box-shadow]"
              style={{
                background: swatch(theme, resolved),
                // On the elevation scale like every other control on this
                // screen — they were the one thing here sitting flat on the
                // page while the buttons around them sat above it. The active
                // dot adds a ring drawn in the page colour, then in its own,
                // so it reads as selected on any background.
                boxShadow: active
                  ? `0 0 0 3px var(--color-surface), 0 0 0 4.5px ${swatch(theme, resolved)}, var(--shadow-1)`
                  : 'var(--shadow-1)',
              }}
            />
          </motion.button>
        )
      })}
    </div>
  )
}
