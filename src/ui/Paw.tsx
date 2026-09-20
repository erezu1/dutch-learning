import { PAW_PAD, PAW_TOES } from '../core/paw'

/**
 * The app mark. Drawn with currentColor so it takes whatever colour it is
 * placed in — which is how it follows the chosen scheme with no extra wiring.
 */
export function Paw({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      {PAW_TOES.map((t) => (
        <circle key={`${t.cx}-${t.cy}`} cx={t.cx} cy={t.cy} r={t.r} />
      ))}
      <path d={PAW_PAD} />
    </svg>
  )
}
