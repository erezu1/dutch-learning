import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { eraseEverything } from '../core/db'
import { onVoicesReady, speak, voiceReport, type VoiceReport } from '../core/speech'
import { MODES, type Mode } from '../core/themes'
import { DAY_NAMES, type WeekStartDay } from '../core/week'
import { Button } from './Button'
import { glide, pressable, swapVariants, tap } from './motion'
import { Switch } from './Switch'
import { TITLE } from './type'

interface Props {
  autoContinue: boolean
  onAutoContinue: (next: boolean) => void
  mode: Mode
  onMode: (next: Mode) => void
  weekStartsOn: WeekStartDay
  onWeekStartsOn: (day: WeekStartDay) => void
  onBack: () => void
}

/**
 * Three choices where a switch would only offer two. The selected one is
 * marked by a pill that slides between them rather than by three buttons that
 * each change colour, so it stays obvious which is on at a glance.
 */
function ModePicker({ mode, onMode }: { mode: Mode; onMode: (next: Mode) => void }) {
  return (
    <div className="mt-4 flex rounded-full bg-surface-2 p-1">
      {MODES.map((option) => {
        const active = option.id === mode
        return (
          <motion.button
            key={option.id}
            {...pressable}
            onClick={() => onMode(option.id)}
            aria-pressed={active}
            className="relative flex-1 rounded-full px-3 py-2 text-sm font-medium"
          >
            {active && (
              <motion.span
                layoutId="mode-pill"
                transition={tap}
                className="absolute inset-0 rounded-full bg-surface-1 shadow-1"
              />
            )}
            <span className={`relative ${active ? '' : 'text-on-surface-dim'}`}>{option.name}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

/**
 * Whether this phone can say anything, and what to do if it can't.
 *
 * The app has no audio files — it borrows whichever Dutch voice the phone
 * already has, which is free and works offline but is the one thing that
 * varies by device.
 *
 * This used to say "no Dutch voice installed" whenever the voice list came
 * back without one, which was wrong on the phone it was written for: Android
 * often reports no voices at all and then speaks perfectly well, because the
 * app asks for Dutch by language and the system engine answers. An empty list
 * is not evidence of silence. So the button is offered in every case and your
 * ear decides, which is the only test that was ever going to be right.
 */
function DutchVoice() {
  const [voice, setVoice] = useState<VoiceReport>(voiceReport)
  useEffect(() => onVoicesReady(() => setVoice(voiceReport())), [])

  return (
    <div className="rounded-3xl bg-surface-1 px-5 py-4 shadow-2">
      <p className="font-semibold">Dutch voice</p>

      {voice.supported ? (
        <>
          <p className="mt-0.5 text-sm text-on-surface-dim">
            {voice.found ? (
              <>
                {voice.name}
                {voice.local ? '' : ' — needs a connection'}
              </>
            ) : (
              <>
                This phone hasn&rsquo;t said which voices it has, which is normal and doesn&rsquo;t
                mean it can&rsquo;t speak. Press it and listen.
              </>
            )}
          </p>

          <div className="mt-4">
            <Button
              tone="neutral"
              onClick={() => speak('Goedemorgen, hoe gaat het met je?')}
              className="px-5 py-3 text-base"
            >
              Hear it
            </Button>
          </div>

          {!voice.found && (
            <p className="mt-3 text-sm text-on-surface-dim">
              Nothing? Then the voice data is missing. On Android:{' '}
              <span className="text-on-surface">
                Settings → System → Languages &amp; input → Text-to-speech → install Nederlands
              </span>
              . It downloads once and then works offline, like the rest of the app.
            </p>
          )}
        </>
      ) : (
        <p className="mt-0.5 text-sm text-on-surface-dim">
          This browser can&rsquo;t speak. Everything else works.
        </p>
      )}
    </div>
  )
}

/**
 * Where to cut the week for the strip on the home screen. Seven initials in
 * the order the days come in, drawn like the strip itself so it is obvious
 * what is being set — and the line underneath names the day in full, because
 * two of those letters are T and two are S.
 */
function WeekStartPicker({
  value,
  onChange,
}: {
  value: WeekStartDay
  onChange: (day: WeekStartDay) => void
}) {
  return (
    <>
      <div className="mt-4 flex rounded-full bg-surface-2 p-1">
        {DAY_NAMES.map((name, i) => {
          const day = i as WeekStartDay
          const active = day === value
          return (
            <motion.button
              key={name}
              {...pressable}
              onClick={() => onChange(day)}
              aria-label={name}
              aria-pressed={active}
              className="relative flex-1 rounded-full py-2 text-sm font-medium"
            >
              {active && (
                <motion.span
                  layoutId="week-start-pill"
                  transition={tap}
                  className="absolute inset-0 rounded-full bg-surface-1 shadow-1"
                />
              )}
              <span className={`relative ${active ? '' : 'text-on-surface-dim'}`}>{name[0]}</span>
            </motion.button>
          )
        })}
      </div>
      <p className="mt-3 text-sm text-on-surface-dim">
        Weeks run {DAY_NAMES[value]} to {DAY_NAMES[(value + 6) % 7]}.
      </p>
    </>
  )
}

/**
 * Erasing everything, behind one deliberate step. Not a browser confirm box —
 * those are easy to dismiss without reading and belong to a different app —
 * and not a single tap either, which is the wrong amount of friction for the
 * one thing here that cannot be undone.
 */
function StartOver() {
  const [asking, setAsking] = useState(false)
  const [erasing, setErasing] = useState(false)

  const erase = async () => {
    setErasing(true)
    try {
      await eraseEverything()
    } finally {
      // Reload either way: a half-erased app is worse than a reloaded one,
      // and the reload is what shows whether it worked.
      location.reload()
    }
  }

  return (
    <div className="mt-2 rounded-3xl bg-surface-1 px-5 py-4 shadow-2">
      <p className="font-semibold">Start over</p>
      <p className="mt-0.5 text-sm text-on-surface-dim">
        Erases your progress and settings. This can&rsquo;t be undone.
      </p>

      <AnimatePresence mode="wait" initial={false}>
        {asking ? (
          <motion.div
            key="asking"
            variants={swapVariants}
            initial="enter"
            animate="center"
            exit="exit"
            // Quick: this is the answer to a tap, and the card's spring took
            // well over a second to get the question on screen.
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="mt-4 flex flex-col gap-2"
          >
            <p className="text-sm font-semibold text-bad-ink">
              Erase everything and start from nothing?
            </p>
            <div className="flex gap-2">
              <Button
                tone="bad"
                onClick={() => void erase()}
                disabled={erasing}
                className="flex-1 px-4 py-3 text-base"
              >
                {erasing ? 'Erasing…' : 'Erase it all'}
              </Button>
              <Button
                tone="neutral"
                onClick={() => setAsking(false)}
                disabled={erasing}
                className="flex-1 px-4 py-3 text-base"
              >
                Keep it
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            variants={swapVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="mt-4"
          >
            <Button tone="bad" onClick={() => setAsking(true)} className="px-5 py-3 text-base">
              Start over
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Settings({
  autoContinue,
  onAutoContinue,
  mode,
  onMode,
  weekStartsOn,
  onWeekStartsOn,
  onBack,
}: Props) {
  return (
    <div className="flex h-full flex-col px-6 py-10">
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.85 }}
          transition={glide}
          onClick={onBack}
          aria-label="Back"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-on-surface-dim"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-[22px] w-[22px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 5.5 8 12l7 6.5" />
          </svg>
        </motion.button>
        <h1 className={`text-3xl ${TITLE}`}>Settings</h1>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={glide}
          className="flex items-center justify-between gap-5 rounded-3xl bg-surface-1 px-5 py-4 shadow-2"
        >
          <div>
            <p className="font-semibold">Continue automatically</p>
            <p className="mt-0.5 text-sm text-on-surface-dim">
              After a multiple-choice answer, move on by itself instead of waiting for a tap.
            </p>
          </div>
          <Switch checked={autoContinue} onChange={onAutoContinue} label="Continue automatically" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...glide, delay: 0.05 }}
          className="rounded-3xl bg-surface-1 px-5 py-4 shadow-2"
        >
          <p className="font-semibold">Appearance</p>
          <p className="mt-0.5 text-sm text-on-surface-dim">
            Every colour comes in both. System follows your phone.
          </p>
          <ModePicker mode={mode} onMode={onMode} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...glide, delay: 0.08 }}
          className="rounded-3xl bg-surface-1 px-5 py-4 shadow-2"
        >
          <p className="font-semibold">Week starts on</p>
          <p className="mt-0.5 text-sm text-on-surface-dim">
            Where the seven dots under the Start button are cut.
          </p>
          <WeekStartPicker value={weekStartsOn} onChange={onWeekStartsOn} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...glide, delay: 0.11 }}
        >
          <DutchVoice />
        </motion.div>

        {/* Apart from the rest, and last: the one thing on this screen that
            takes something away. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...glide, delay: 0.14 }}
        >
          <StartOver />
        </motion.div>
      </div>
    </div>
  )
}
