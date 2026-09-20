import { useEffect, useState } from 'react'
import { onVoicesReady, speak, voiceReport, type VoiceReport } from '../core/speech'
import type { SessionStats } from '../session/useSession'

interface Props {
  stats: SessionStats
  onStart: () => void
}

export function Home({ stats, onStart }: Props) {
  const [voice, setVoice] = useState<VoiceReport>(voiceReport)

  useEffect(() => onVoicesReady(() => setVoice(voiceReport())), [])

  const waiting = stats.dueCount + stats.newCount
  const progress = stats.total ? stats.known / stats.total : 0

  return (
    <div className="flex h-full flex-col justify-between px-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Nederlands</h1>
        <p className="mt-1 text-on-surface-dim">Een paar minuten per dag.</p>
      </div>

      <div className="flex flex-col items-center gap-8">
        <div className="relative grid h-48 w-48 place-items-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-surface-2)" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${progress * 283} 283`}
              className="transition-[stroke-dasharray] duration-700"
            />
          </svg>
          <div className="text-center">
            <p className="text-4xl font-semibold">{stats.known}</p>
            <p className="text-sm text-on-surface-dim">van {stats.total} woorden</p>
          </div>
        </div>

        <button
          onClick={onStart}
          disabled={waiting === 0}
          className="w-full max-w-xs rounded-full bg-primary py-4 text-lg font-semibold text-on-primary transition active:scale-95 disabled:opacity-40"
        >
          {waiting > 0 ? `Begin — ${waiting} kaarten` : 'Klaar voor vandaag'}
        </button>

        <div className="flex gap-6 text-center text-sm">
          <div>
            <p className="text-xl font-semibold">{stats.dueCount}</p>
            <p className="text-on-surface-dim">te herhalen</p>
          </div>
          <div>
            <p className="text-xl font-semibold">{stats.newCount}</p>
            <p className="text-on-surface-dim">nieuw</p>
          </div>
        </div>
      </div>

      {/* Phase 0 diagnostic: does this phone actually have a Dutch voice? */}
      <button
        onClick={() => speak('Goedemorgen, hoe gaat het met je?')}
        className="mx-auto flex items-center gap-2 rounded-full bg-surface-1 px-4 py-2 text-xs text-on-surface-dim active:scale-95"
      >
        <span className={voice.found ? 'text-good' : 'text-bad'}>●</span>
        {voice.found
          ? `Stem: ${voice.name}${voice.local ? '' : ' (online)'} — tik om te testen`
          : voice.supported
            ? 'Geen Nederlandse stem gevonden'
            : 'Spraak niet ondersteund'}
      </button>
    </div>
  )
}
