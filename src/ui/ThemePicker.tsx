import { swatch, THEMES, type Resolved, type Theme } from '../core/themes'
import { Swatch } from './Swatch'

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
          <Swatch
            key={theme.id}
            active={active}
            fill={swatch(theme, resolved)}
            label={theme.name}
            onClick={() => onPick(theme)}
          />
        )
      })}
    </div>
  )
}
