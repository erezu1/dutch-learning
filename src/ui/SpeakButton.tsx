import { speak, supported } from '../core/speech'

export function SpeakButton({ text, className = '' }: { text: string; className?: string }) {
  if (!supported()) return null
  return (
    <button
      type="button"
      aria-label={`Speak: ${text}`}
      onClick={(e) => {
        e.stopPropagation()
        speak(text)
      }}
      className={`grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-on-surface-dim transition active:scale-90 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4 4 0 0 0-2.5-3.7v7.4a4 4 0 0 0 2.5-3.7Zm-2.5-8v2.1a6 6 0 0 1 0 11.8V20a8 8 0 0 0 0-16Z" />
      </svg>
    </button>
  )
}
