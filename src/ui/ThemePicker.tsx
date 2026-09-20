import { motion } from 'framer-motion'
import { THEMES, type Theme } from '../core/themes'
import { pressable } from './motion'

// ---------------------------------------------------------------------------
// A row of dots on the home screen. Colour is the kind of choice that should
// be made by looking, not by reading a list of names — so the swatch is the
// control and the name is only there for screen readers.
// ---------------------------------------------------------------------------

export function ThemePicker({ current, onPick }: { current: Theme; onPick: (t: Theme) => void }) {
  return (
    <div className="flex items-center justify-center gap-3">
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
                background: theme.swatch,
                // The active dot gets a ring drawn in the page colour, then a
                // hairline, so it reads as selected on any background.
                boxShadow: active
                  ? `0 0 0 3px ${theme.ring}, 0 0 0 4.5px ${theme.swatch}`
                  : '0 0 0 1px rgba(0,0,0,0.08)',
              }}
            />
          </motion.button>
        )
      })}
    </div>
  )
}
