import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { CoatId } from '../core/cat'
import { reachedLevel, type LevelOption } from '../core/levels'
import type { Resolved, Theme } from '../core/themes'
import type { SessionStats } from '../session/useSession'
import { Button } from './Button'
import { promptInstall } from '../core/install'
import { Cat } from './Cat'
import { CoatPicker } from './CoatPicker'
import { Paw } from './Paw'
import { useCanInstall } from './useCanInstall'
import { ThemePicker } from './ThemePicker'
import { afterRing, pressable, ringGrow } from './motion'
import { WeekStrip } from './WeekStrip'
import type { WeekDay } from '../core/week'
import { TITLE, WORDMARK } from './type'

interface Props {
  stats: SessionStats
  score: number
  level: LevelOption
  week: WeekDay[]
  onOpenSettings: () => void
  theme: Theme
  coat: CoatId
  onChangeCoat: (coat: CoatId) => void
  resolvedMode: Resolved
  onStart: (extra: boolean) => void
  onChangeLevel: () => void
  onChangeTheme: (theme: Theme) => void
}

export function Home({
  stats,
  score,
  level,
  week,
  theme,
  coat,
  onChangeCoat,
  resolvedMode,
  onStart,
  onChangeLevel,
  onChangeTheme,
  onOpenSettings,
}: Props) {
  const canInstall = useCanInstall()
  /**
   * Flipped one tick after mount, and the ring and the numbers below animate
   * because it changed rather than because they appeared. The app's screen
   * switcher suppresses entrance animations on the very first render — which
   * is exactly the render this is, when the app is opened cold — so an
   * `initial` here would be ignored precisely when it matters most.
   */
  const [arrived, setArrived] = useState(false)

  useEffect(() => {
    // A timer rather than a frame callback: a frame callback is at the mercy
    // of how often the page is being painted, and this only has to happen
    // after the first paint, not on it.
    const id = setTimeout(() => setArrived(true), 30)
    return () => clearTimeout(id)
  }, [])

  const waiting = stats.waiting
  // Once the day is done there is always more deck, so there is no reason to
  // stop anyone who wants to carry on — the day's shape is a suggestion, not
  // a gate. Only a finished deck disables the button.
  const another = waiting === 0 && stats.extraWaiting > 0
  // The ring is today: it empties overnight and closes when the day's cards
  // are done. It used to show words known out of the whole two thousand, which
  // on any real day is a sliver that never visibly moves — it read as broken
  // because nothing you did changed it.
  const progress = stats.plannedToday ? stats.doneToday / stats.plannedToday : 0
  // The level you've reached, not the one you claimed on the first run. The
  // claim only decides where the deck starts handing out words; this moves as
  // the words go by, which is what a level is for.
  const reached = reachedLevel(stats.known, level)

  return (
    <div className="flex flex-1 flex-col justify-between px-6 py-10">
      <div>
        <div className="flex items-center justify-between gap-4">
          {/* The paw is sized against the word's cap height, not against its
              line box, and the gap is set from the mark's own edge — which is
              why these are exact numbers rather than the spacing scale. */}
          <div className="flex items-center gap-3">
            <Paw className="h-[38px] w-[38px] text-primary" />
            <h1 className={`text-[2.6rem] leading-none ${WORDMARK}`}>Doei!</h1>
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
              {reached.name}
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

      </div>

      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          {/* On the ring, exactly as she is on the progress bar while you
              review. The ring is what this screen measures, so it is the thing
              she rests on — and being in the same relationship to the same kind
              of object on both screens is what makes her one cat rather than
              two decorations.

              In the column's flow rather than floating above the ring on an
              absolute layer. Out of flow she cost the layout nothing, so the
              column could not account for her: she ended up crammed four
              pixels off the ring with sixty pixels of slack going spare at the
              bottom. In flow she is simply the top of this block, and
              justify-between gives the space above her and the space below the
              week the same size without either being named.

              She waits for the ring to finish drawing. Arriving with it, there
              would be two things moving and nowhere to look. */}
          <div className="flex flex-col items-center">
            <motion.div
              initial={false}
              animate={{ opacity: arrived ? 1 : 0 }}
              transition={afterRing(0.12)}
              // Centred in the gap between the header and the ring rather
              // than perched on the ring's edge. Because the column is
              // justify-between, the space above her is whatever is left over
              // — so the way to move her down is to push the ring away from
              // her, which takes half of it back off the top. This margin is
              // the number that makes the two gaps match.
              className="mb-9"
            >
              <Cat
                coat={coat}
                rim={resolvedMode === 'dark'}
                size={101}
                scene={waiting > 0 ? 'waiting' : 'nothingDue'}
                label="The cat"
              />
            </motion.div>
            <div className="relative grid h-48 w-48 place-items-center">
            {/* The clearing is its own element, a plain circle the size of the ring,
                  so nothing that animates lives inside the thing casting it. */}
              <div
                aria-hidden="true"
                className="clearing-ring pointer-events-none absolute inset-[-34px] rounded-full"
              />
              <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="var(--color-surface-3)"
                strokeWidth="8"
              />
              {/* Nothing at all when nothing has been done: a round cap on an
                  arc of zero length still draws a dot, and a dot on the ring
                  reads as a score. */}
              {progress > 0 && (
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  // Drawn in from nothing every time the screen arrives, rather
                  // than being there already. The ring is the day, and watching
                  // it close is the closest the app gets to a reward.
                  initial={false}
                  animate={{ strokeDasharray: arrived ? `${progress * 283} 283` : '0 283' }}
                  transition={ringGrow}
                />
              )}
            </svg>
            {/* The numbers wait for the ring: arriving together, the eye has
                nowhere to start. */}
            <motion.div
              initial={false}
              animate={{ opacity: arrived ? 1 : 0 }}
              transition={afterRing()}
              className="text-center"
            >
              <p className={`text-5xl ${TITLE}`}>{score.toLocaleString()}</p>
              <p className="text-sm text-on-surface-dim">points</p>
            </motion.div>
            </div>
          </div>

          {/* What the ring is measuring, said in words. The number inside it is
            a lifetime total and the ring is only today, so without this the
            two look like they ought to agree, and don't. Below rather than
            inside: it doesn't fit across a circle. */}
          <motion.p
            initial={false}
            animate={{ opacity: arrived ? 1 : 0 }}
            transition={afterRing(0.09)}
            className="text-sm text-on-surface-dim"
          >
            {waiting > 0
              ? `${stats.doneToday} of ${stats.plannedToday} questions today`
              : stats.doneToday > 0
                ? `${stats.doneToday} questions today — that's the lot`
                : 'nothing due today'}
          </motion.p>
        </div>

        {/* The week sits a little apart from the button: it's a record, not
            a second thing to press. */}
        <div className="flex w-full flex-col items-center gap-10">
          {/* Narrower than the column, but the same height and type as every
              other button in the app. This screen is not only its button — the
              ring above it and the cat on that ring are the reason you are
              looking, and a full-width block of accent under them takes the
              eye straight back down. Width is the part that can vary; a button
              that is also a different size is just a different button. */}
          <Button
            onClick={() => onStart(another)}
            disabled={waiting === 0 && !another}
            className="px-14"
          >
            {/* Not "Continue": nothing is ever in progress here. The queue is
                built when you press this and thrown away when you leave, so
                every press starts a session — what changes is whether the day
                has been started, which is what these say instead. */}
            {waiting > 0
              ? stats.doneToday > 0
                ? 'Keep going'
                : 'Start'
              : another
                ? 'Another round?'
                : 'Nothing left'}
          </Button>

          <WeekStrip week={week} arrived={arrived} />
        </div>
      </div>


      {/* Two rows of the same control: which cat, then which colour. The cat
          comes first because she is the thing you just looked at. */}
      <div className="flex flex-col items-center gap-3">
        <CoatPicker current={coat} onPick={onChangeCoat} />
        <ThemePicker current={theme} resolved={resolvedMode} onPick={onChangeTheme} />
      </div>
    </div>
  )
}
