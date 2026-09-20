import { AnimatePresence, motion } from 'framer-motion'
import { useRef, useState, type ReactNode } from 'react'
import type React from 'react'
import { splitAroundWord } from '../core/cards'
import type { Prompt } from '../session/prompts'
import { speak as say } from '../core/speech'
import { glide, pressable, swapVariants, tap } from './motion'
import { FOCUS } from './type'
import { SpeakButton, STEP } from './SpeakButton'

// ---------------------------------------------------------------------------
// The presentation of one question. Phase 3 replaces this file (full-bleed,
// swipeable, animated) without touching any logic — it only ever reads a
// Prompt and calls the callbacks it is handed.
//
// Layout is two equal zones. The question sits at the bottom of the upper
// zone, just above the optical centre, and everything that appears afterwards
// grows downward into the lower one. Centring the whole lot instead would make
// the question jump upward the moment an answer appeared beneath it.
// ---------------------------------------------------------------------------

interface Props {
  prompt: Prompt
  revealed: boolean
  picked: string | null
  correct: boolean | null
  onReveal: () => void
  onChoose: (value: string) => void
}

/**
 * The largest size a word can be set at and still fit across the screen.
 *
 * A Dutch word can be very long — ziekenhuis, achteruitgaan, tevoorschijn —
 * and a single word cannot wrap, so a fixed size overflows silently. This
 * scales with the longest unbreakable run: roughly, a character is half an em
 * wide, so the run fits when the size is about twice the width available per
 * character. Clamped so short words don't become enormous and long ones stay
 * readable.
 */
function fitSize(text: string, max: string, min = '1.6rem'): string {
  const longest = Math.max(...text.split(/\s+/).map((w) => w.length), 1)
  // 80vw, not the full width: the speaker hangs off the word's right edge
  // and needs somewhere to be.
  return `clamp(${min}, calc(80vw / ${longest} * 1.85), ${max})`
}

/**
 * Renders "you (formal)" with the clarifying part played down, so the word
 * itself is what sits in the middle rather than the word plus its footnote.
 *
 * On a button the note hangs off the right at a fraction of the size. At the
 * question's size that same note is large enough to run off the screen, so
 * there it drops underneath instead — still out of the way of centring, but
 * with somewhere to go.
 */
function Gloss({ text, stacked = false }: { text: string; stacked?: boolean }) {
  const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(text)
  if (!m) return <>{text}</>

  if (stacked) {
    return (
      <span className="inline-flex flex-col items-center leading-tight">
        <span>{m[1]}</span>
        <span className="mt-1 font-sans text-base font-normal text-on-surface-dim">({m[2]})</span>
      </span>
    )
  }

  return (
    <span className="relative inline-block">
      {m[1]}
      <span className="absolute top-1/2 left-full ml-1.5 -translate-y-1/2 font-sans text-[0.55em] font-normal whitespace-nowrap opacity-50">
        ({m[2]})
      </span>
    </span>
  )
}

function Choices({
  prompt,
  picked,
  correct,
  onChoose,
}: {
  prompt: Prompt
  picked: string | null
  correct: boolean | null
  onChoose: (v: string) => void
}) {
  const choices = prompt.choices!
  // Two options are the grammar pairs (de/het, hebben/zijn) and sit side by
  // side. Four vocabulary options stack, so longer glosses fit. They are the
  // same button either way — only the arrangement differs.
  const pair = choices.length === 2

  return (
    <div className={`w-full ${pair ? 'flex gap-3' : 'flex flex-col gap-2.5'}`}>
      {choices.map((choice, i) => {
        // Between the tap and the answer appearing, the option you pressed
        // shows its own result, so you see what you chose before the view
        // moves on.
        const isPicked = picked === choice
        const isAnswer = picked !== null && choice === prompt.answer
        const resultTone = isPicked
          ? correct
            ? 'bg-good text-good-ink'
            : 'bg-bad text-bad-ink'
          : isAnswer
            ? 'bg-good text-good-ink'
            : ''

        return (
          <motion.button
            key={choice}
            {...(picked === null ? pressable : {})}
            initial={{ opacity: 0, y: 12 }}
            animate={{
              opacity: picked !== null && !isPicked && !isAnswer ? 0.35 : 1,
              y: 0,
              scale: isPicked ? 1.03 : 1,
            }}
            transition={{ ...glide, delay: picked === null ? 0.04 * i : 0 }}
            onClick={() => onChoose(choice)}
            translate="no"
            className={`notranslate rounded-3xl shadow-2 transition-shadow active:shadow-press ${
              pair ? 'flex-1 py-7 text-xl' : 'px-5 py-4 text-xl'
            } ${resultTone || 'bg-surface-1'}`}
          >
            <Gloss text={choice} />
          </motion.button>
        )
      })}
    </div>
  )
}

/**
 * Centres the text on the frame and hangs the speaker off its right edge.
 * Putting the two in a row and centring the row centres the *pair*, which
 * leaves the word itself sitting left of centre — visible as soon as you line
 * it up against the label above and the buttons below.
 */
function WithSpeaker({
  speak: phrase,
  small = false,
  children,
}: {
  speak?: string
  small?: boolean
  children: ReactNode
}) {
  // True while the voice is talking, so the waves run for the length of the
  // word or sentence instead of a fixed beat. Shared, so tapping the word
  // animates the icon exactly as tapping the icon does.
  const [speaking, setSpeaking] = useState(false)
  const startedAt = useRef(0)

  const trigger = () => {
    if (!phrase) return
    startedAt.current = performance.now()
    setSpeaking(true)
    void say(phrase).finally(() => {
      // Don't cut a wave off mid-flight. The icon is exactly its resting self
      // every STEP seconds — one wave on the inner arc, one on the outer — so
      // run on to the next of those and stop there.
      //
      // The remaining time is read from the animation's own clock rather than
      // from when the tap happened: the element mounts a render later, and
      // that drift is enough to stop it short of the boundary.
      const step = STEP * 1000
      const wave = document.querySelector('.speaker-wave')
      const clock = wave?.getAnimations?.()[0]?.currentTime
      const elapsed = typeof clock === 'number' ? clock : performance.now() - startedAt.current
      setTimeout(() => setSpeaking(false), step - (elapsed % step))
    })
  }

  // The same elements whether or not there is anything to hear. Returning the
  // children bare when there isn't moves everything inside up two levels of
  // the tree, which unmounts whatever was animating in there — that is what
  // stopped a gap-fill's sentence from ever animating, since the sentence only
  // becomes speakable at the moment it changes.
  return (
    <div className="flex justify-center">
      {/* The text itself is the button — tapping the word or the sentence is
          the obvious way to hear it, and the icon is only a hint that you can.
          Stops propagation so it doesn't also flip the card. */}
      <motion.div
        {...(phrase
          ? {
              role: 'button',
              tabIndex: 0,
              whileTap: { scale: 0.97 },
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation()
                trigger()
              },
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation()
                  trigger()
                }
              },
            }
          : {})}
        transition={tap}
        className={`relative ${phrase ? 'cursor-pointer' : ''}`}
      >
        {children}
        {phrase && (
          <SpeakButton
            text={phrase}
            small={small}
            speaking={speaking}
            onActivate={trigger}
            className={`absolute top-1/2 -translate-y-1/2 ${small ? 'left-full ml-1.5' : 'left-full ml-2.5'}`}
          />
        )}
      </motion.div>
    </div>
  )
}

/**
 * A sentence with the word it is teaching picked out, so the eye lands on it
 * rather than having to search the line.
 */
function Sentence({
  sentence,
  word,
  className = '',
  highlight = 'font-semibold text-on-surface',
  as: Tag = 'p',
}: {
  sentence: string
  word: string
  className?: string
  highlight?: string
  as?: 'p' | 'span'
}) {
  const parts = splitAroundWord(sentence, word)
  return (
    <Tag lang="nl" translate="no" className={`notranslate ${className}`}>
      {parts ? (
        <>
          {parts.before}
          <span className={highlight}>{parts.match}</span>
          {parts.after}
        </>
      ) : (
        sentence
      )}
    </Tag>
  )
}

export function PromptCard({ prompt, revealed, picked, correct, onReveal, onChoose }: Props) {
  const isChoice = prompt.shape === 'choice'
  // "de or het?" is answered with one word; what you should walk away with is
  // "de man". Cards that differ this way say so, and the rest answer as asked.
  const answerText = prompt.reveal ?? prompt.answer
  const isSentence = prompt.display === 'sentence'
  const isCloze = prompt.cardType === 'cloze'
  // A gap-fill's question changes once it's answered; every other card's
  // stays as it was.
  const headline = isCloze && revealed ? (prompt.detail ?? prompt.question) : prompt.question

  return (
    <div
      onClick={!isChoice && !revealed ? onReveal : undefined}
      className="grid flex-1 grid-rows-2 gap-7 px-5 text-center"
    >
      {/* Upper zone: the question, resting on the centre line. It stays put
          from the moment the card appears until it leaves — a gap-fill has its
          blank filled in place rather than the sentence being taken away and
          put back somewhere else. */}
      <div className="flex flex-col items-center justify-end gap-3">
        <p className="text-base font-medium text-on-surface-dim">{prompt.instruction}</p>

        <WithSpeaker
          small={isSentence}
          // Speaking a gap-fill before it's answered would read out the answer.
          speak={
            isCloze
              ? revealed
                ? prompt.speak
                : undefined
              : prompt.questionLang === 'nl'
                ? prompt.question
                : undefined
          }
        >
          {/* The two sentences share one grid cell, so the old one can leave
              while the new one arrives without the line collapsing and the
              instruction above it jumping down. */}
          <div className="grid place-items-center [&>*]:col-start-1 [&>*]:row-start-1">
            <AnimatePresence initial={false}>
              <motion.h1
                // Keyed on the words it shows: a question that changes swaps
                // itself out for the new one, the way the options below swap for
                // the answer. A question that doesn't change keeps its key and
                // stays where it is.
                key={headline}
                variants={swapVariants}
                initial="enter"
                animate="center"
                // The old line leaves first and the new one follows it in, so
                // you see the gap close rather than two sentences crossing.
                // Written out because a shared transition would delay the exit
                // by as much as the entrance, and they would overlap.
                exit={{ opacity: 0, y: -10, transition: { duration: 0.15, ease: 'easeIn' } }}
                transition={{ ...glide, delay: 0.17 }}
                lang={prompt.questionLang}
                translate="no"
                // Sized from the filled sentence either way, so filling the gap
                // never changes the type size under you.
                style={{
                  fontSize: isSentence
                    ? fitSize(prompt.detail ?? prompt.question, '2.05rem', '1.35rem')
                    : fitSize(prompt.question, '4rem'),
                }}
                className={`notranslate text-balance ${FOCUS} ${
                  isSentence ? 'max-w-[17rem] leading-snug' : 'leading-none'
                }`}
              >
                {isCloze && revealed ? (
                  <Sentence
                    as="span"
                    sentence={prompt.detail ?? prompt.question}
                    word={prompt.answer}
                    highlight="text-good-ink"
                  />
                ) : prompt.questionLang === 'en' ? (
                  <Gloss text={prompt.question} stacked />
                ) : (
                  prompt.question
                )}
              </motion.h1>
            </AnimatePresence>
          </div>
        </WithSpeaker>

        {prompt.subtitle && <p className="text-base text-on-surface-dim">{prompt.subtitle}</p>}
      </div>

      {/* Lower zone: the options, or the answer once it is given. */}
      {/* A scroll container clips on every side, so the padding-and-negative-
          margin pair runs both ways: without the vertical half, the top
          option's shadow is sliced off along the container's edge. */}
      <div className="no-scrollbar -mx-3 -my-2 flex flex-col items-center gap-3 overflow-y-auto px-3 py-2">
        <AnimatePresence mode="wait" initial={false}>
          {!revealed && !isChoice && (
            <motion.p
              key="hint"
              variants={swapVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={glide}
              className="pt-4 text-base text-on-surface-dim/70"
            >
              tap to reveal
            </motion.p>
          )}

          {!revealed && isChoice && (
            <motion.div
              key="choices"
              className="w-full"
              variants={swapVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={glide}
            >
              <Choices prompt={prompt} picked={picked} correct={correct} onChoose={onChoose} />
            </motion.div>
          )}

          {revealed && (
            <motion.div
              key="answer"
              variants={swapVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={glide}
              className="flex flex-col items-center gap-3"
            >
              {/* A gap-fill is already answered above — the sentence is the
                  answer, with the word in it. Repeating the word on its own
                  underneath says the same thing a third time, so all that is
                  left is what the sentence means, and what you picked if it
                  wasn't that. */}
              {isCloze ? (
                <>
                  {prompt.detailTranslation && (
                    <p className="max-w-xs text-base text-on-surface-dim">
                      {prompt.detailTranslation}
                    </p>
                  )}
                  {correct === false && picked && (
                    <p className="text-base text-bad-ink/80">you chose &ldquo;{picked}&rdquo;</p>
                  )}
                </>
              ) : (
                <>
                  {/* Every other card states the answer here: the thing you
                      were meant to arrive at, in the serif. */}
                  <WithSpeaker speak={prompt.answerLang === 'nl' ? answerText : undefined}>
                    <p
                      lang={prompt.answerLang}
                      translate="no"
                      style={{ fontSize: fitSize(answerText, '2.6rem', '1.4rem') }}
                      // Green is the right answer, whether or not you found it —
                      // colouring the correct word red because you missed it says
                      // the word is wrong. Red belongs to what you chose, below.
                      className={`notranslate leading-none ${FOCUS} ${
                        correct === null ? '' : 'text-good-ink'
                      }`}
                    >
                      {prompt.answerLang === 'en' ? <Gloss text={answerText} stacked /> : answerText}
                    </p>
                  </WithSpeaker>

                  {correct === false && picked && (
                    <p className="text-base text-bad-ink/80">you chose &ldquo;{picked}&rdquo;</p>
                  )}

                  {prompt.meaning && (
                    <p className="max-w-xs text-base text-on-surface-dim">{prompt.meaning}</p>
                  )}

                  {/* And the sentence it lives in, on a card of its own so it
                      belongs to the same furniture as everything else. */}
                  {prompt.detail && (
                    <div className="mt-5 w-full max-w-[17rem] space-y-1 rounded-3xl bg-surface-1 px-5 py-4 shadow-1">
                      <WithSpeaker speak={prompt.detail} small>
                        <Sentence
                          sentence={prompt.detail}
                          word={prompt.note.nl}
                          className={`text-lg leading-snug text-on-surface/85 ${FOCUS}`}
                        />
                      </WithSpeaker>
                      {prompt.detailTranslation && (
                        <p className="text-base text-on-surface-dim">{prompt.detailTranslation}</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
