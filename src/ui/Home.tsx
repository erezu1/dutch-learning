import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { onVoicesReady, speak, voiceReport, type VoiceReport } from '../core/speech'
import type { LevelOption } from '../core/levels'
import type { Resolved, Theme } from '../core/themes'
import type { SessionStats } from '../session/useSession'
import { Button } from './Button'
import { promptInstall } from '../core/install'
import { Paw } from './Paw'
import { useCanInstall } from './useCanInstall'
import { ThemePicker } from './ThemePicker'
import { pressable, quiet } from './motion'
import { TITLE, WORDMARK } from './type'

interface Props {
  stats: SessionStats
  score: number
  level: LevelOption
  onOpenSettings: () => void
  theme: Theme
  resolvedMode: Resolved
  onStart: () => void
  onChangeLevel: () => void
  onChangeTheme: (theme: Theme) => void
}

export function Home({
  stats,
  score,
  level,
  theme,
  resolvedMode,
  onStart,
  onChangeLevel,
  onChangeTheme,
  onOpenSettings,
}: Props) {
  const [voice, setVoice] = useState<VoiceReport>(voiceReport)
  const canInstall = useCanInstall()

  useEffect(() => onVoicesReady(() => setVoice(voiceReport())), [])

  const waiting = stats.dueCount + stats.newCount
  // The ring is today: it empties overnight and closes when the day's cards
  // are done. It used to show words known out of the whole two thousand, which
  // on any real day is a sliver that never visibly moves — it read as broken
  // because nothing you did changed it.
  const progress = stats.plannedToday ? stats.doneToday / stats.plannedToday : 0

  return (
    <div className="flex h-full flex-col justify-between px-6 py-10">
      <div>
        <div className="flex items-center justify-between gap-4">
          {/* The paw is sized against the word's cap height, not against its
              line box, and the gap is set from the mark's own edge — which is
              why these are exact numbers rather than the spacing scale. */}
          <div className="flex items-center gap-3">
            <Paw className="h-[38px] w-[38px] text-primary" />
            <h1 className={`text-[2.6rem] leading-none ${WORDMARK}`}>Doei</h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Only while the browser will actually install it. The one-time
              card is easy to dismiss, so this stays as the way back. */}
            {canInstall && (
              <motion.button
                {...pressable}
                onClick={() => void promptInstall()}
                aria-label="Add to home screen"
                className="grid h-8 w-8 place-items-center rounded-full bg-surface-1 text-on-surface-dim shadow-1"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-[18px] w-[18px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 4.5v11" />
                  <path d="M7.5 11 12 15.5 16.5 11" />
                  <path d="M5 19h14" />
                </svg>
              </motion.button>
            )}

            <motion.button
              {...pressable}
              onClick={onChangeLevel}
              className="rounded-full bg-surface-1 px-3 py-1.5 text-xs font-medium text-on-surface-dim shadow-1"
            >
              {level.name}
            </motion.button>

            <motion.button
              {...pressable}
              onClick={onOpenSettings}
              aria-label="Settings"
              className="grid h-8 w-8 place-items-center rounded-full bg-surface-1 text-on-surface-dim shadow-1"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 14.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9.1a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.03Z" />
              </svg>
            </motion.button>
          </div>
        </div>

        <p className="mt-1 text-on-surface-dim">A little Dutch, every day.</p>
      </div>

      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="relative grid h-48 w-48 place-items-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="var(--color-surface-3)"
                strokeWidth="8"
              />
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
              <motion.p
                key={score}
                initial={{ scale: 0.86, opacity: 0.4 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={quiet}
                className={`text-5xl ${TITLE}`}
              >
                {score.toLocaleString()}
              </motion.p>
              <p className="text-sm text-on-surface-dim">points</p>
            </div>
          </div>

          {/* What the ring is measuring, said in words. The number inside it is
            a lifetime total and the ring is only today, so without this the
            two look like they ought to agree, and don't. Below rather than
            inside: it doesn't fit across a circle. */}
          <p className="text-sm text-on-surface-dim">
            {waiting > 0
              ? `${stats.doneToday} of ${stats.plannedToday} questions today`
              : stats.doneToday > 0
                ? `all ${stats.doneToday} questions done today`
                : 'nothing due today'}
          </p>
        </div>

        <Button onClick={onStart} disabled={waiting === 0} className="w-full max-w-xs">
          {waiting === 0 ? 'Done for today' : stats.doneToday > 0 ? 'Continue' : 'Start'}
        </Button>
      </div>

      <div className="flex flex-col items-center gap-5">
        <ThemePicker current={theme} resolved={resolvedMode} onPick={onChangeTheme} />

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
