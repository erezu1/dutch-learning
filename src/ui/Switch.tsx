import { motion } from 'framer-motion'
import { tap } from './motion'

/** A plain on/off switch: the knob slides, the track takes the accent when on. */
export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  /** For a switch the phone won't honour: still readable, not pressable. */
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-[3.25rem] shrink-0 rounded-full transition-[color,background-color,opacity] disabled:opacity-40 ${
        checked ? 'bg-primary' : 'bg-surface-3'
      }`}
    >
      <motion.span
        layout
        transition={tap}
        className="absolute top-1 h-6 w-6 rounded-full bg-surface-1 shadow-1"
        style={{ left: checked ? 'calc(100% - 1.75rem)' : '0.25rem' }}
      />
    </button>
  )
}
