import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { onVoicesReady, speak, voiceReport, type VoiceReport } from '../core/speech'
import type { LevelOption } from '../core/levels'
import type { Theme } from '../core/themes'
import type { SessionStats } from '../session/useSession'
import { Button } from './Button'
import { ThemePicker } from './ThemePicker'
import { pressable, quiet } from './motion'

interface Props {
  stats: SessionStats
  level: LevelOption
  theme: Theme
  onStart: () => void
  onChangeLevel: () => void
  onChangeTheme: (theme: Theme) => void
}

export function Home({ stats, level, theme, onStart, onChangeLevel, onChangeTheme }: Props) {
  const [voice, setVoice] = useState<VoiceReport>(voiceReport)

  useEffect(() => onVoicesReady(() => setVoice(voiceReport())), [])

  const waiting = stats.dueCount + stats.newCount
  const progress = stats.total ? stats.known / stats.total : 0

  return (
    <div className="flex h-full flex-col justify-between px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold">Doei</h1>
          <p className="mt-1 text-on-surface-dim">A little Dutch, every day.</p>
        </div>
        <motion.button
          {...pressable}
          onClick={onChangeLevel}
          className="rounded-full bg-surface-1 px-3 py-1.5 text-xs font-medium text-on-surface-dim shadow-1"
        >
          {level.name}
        </motion.button>
      </div>

      <div className="flex flex-col items-center gap-8">
        <div className="relative grid h-48 w-48 place-items-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-surface-3)" strokeWidth="8" />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="8"
              strokeLinecap="round"
              initial={false}
              animate={{ strokeDasharray: `${progress * 283} 283` }}
              transition={quiet}
            />
          </svg>
          <div className="text-center">
            <p className="font-display text-5xl font-semibold">{stats.known}</p>
            <p className="text-sm text-on-surface-dim">of {stats.total} words</p>
          </div>
        </div>

        <Button onClick={onStart} disabled={waiting === 0} className="w-full max-w-xs">
          {waiting > 0 ? `Start — ${waiting} cards` : 'Nothing due — done for today'}
        </Button>

        <div className="flex gap-6 text-center text-sm">
          <div>
            <p className="font-display text-2xl font-semibold">{stats.dueCount}</p>
            <p className="text-on-surface-dim">to review</p>
          </div>
          <div>
            <p className="font-display text-2xl font-semibold">{stats.newCount}</p>
            <p className="text-on-surface-dim">new</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-5">
        <ThemePicker current={theme} onPick={onChangeTheme} />

        {/* Phase 0 diagnostic: does this phone actually have a Dutch voice? */}
        <motion.button
          {...pressable}
          onClick={() => speak('Goedemorgen, hoe gaat het met je?')}
        className="mx-auto flex items-center gap-2 rounded-full bg-surface-1 px-4 py-2 text-xs text-on-surface-dim shadow-1"
      >
        <span className={voice.found ? 'text-good-ink' : 'text-bad-ink'}>●</span>
        {voice.found
          ? `Dutch voice: ${voice.name}${voice.local ? '' : ' (online)'} — tap to test`
          : voice.supported
            ? 'No Dutch voice on this device'
            : 'Speech not supported here'}
        </motion.button>
      </div>
    </div>
  )
}
