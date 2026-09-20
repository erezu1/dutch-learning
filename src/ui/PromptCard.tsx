import { AnimatePresence, motion } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { splitAroundWord } from '../core/cards'
import type { Prompt } from '../session/prompts'
import { speak as say } from '../core/speech'
import { glide, pressable, swapVariants, tap } from './motion'
import { SpeakButton } from './SpeakButton'

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

// The grammar pairs get their own colours so they stay recognisable at a
// glance; vocabulary options are neutral.
const choiceColor: Record<string, string> = {
  de: 'bg-de-bg text-de',
  het: 'bg-het-bg text-het',
  hebben: 'bg-de-bg text-de',
  zijn: 'bg-het-bg text-het',
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
  // Two options are the grammar pairs (de/het, hebben/zijn) and deserve to be
  // big and side by side. Four vocabulary options stack, so longer glosses fit.
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
            // The options are Dutch whenever the answer is — on a recall card
            // they are the words themselves, so they take the serif too.
            className={`notranslate rounded-3xl shadow-2 transition-shadow active:shadow-press ${
              pair
                ? 'flex-1 py-7 font-display text-3xl font-semibold'
                : prompt.answerLang === 'nl'
                  ? 'px-5 py-4 font-display text-2xl font-semibold'
                  : 'px-5 py-4 text-xl'
            } ${resultTone || choiceColor[choice] || 'bg-surface-1'}`}
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
  // Counts each utterance so the icon can replay its ripple. Shared, so tapping
  // the word animates the icon exactly as tapping the icon does.
  const [pulse, setPulse] = useState(0)

  if (!phrase) return <>{children}</>

  const trigger = () => {
    say(phrase)
    setPulse((n) => n + 1)
  }

  return (
    <div className="flex justify-center">
      {/* The text itself is the button — tapping the word or the sentence is
          the obvious way to hear it, and the icon is only a hint that you can.
          Stops propagation so it doesn't also flip the card. */}
      <motion.div
        role="button"
        tabIndex={0}
        whileTap={{ scale: 0.97 }}
        transition={tap}
        onClick={(e) => {
          e.stopPropagation()
          trigger()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation()
            trigger()
          }
        }}
        className="relative cursor-pointer"
      >
        {children}
        <SpeakButton
          text={phrase}
          small={small}
          pulse={pulse}
          onActivate={trigger}
          className={`absolute top-1/2 -translate-y-1/2 ${small ? 'left-full ml-1.5' : 'left-full ml-2.5'}`}
        />
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
}: {
  sentence: string
  word: string
  className?: string
  highlight?: string
}) {
  const parts = splitAroundWord(sentence, word)
  return (
    <p lang="nl" translate="no" className={`notranslate ${className}`}>
      {parts ? (
        <>
          {parts.before}
          <span className={highlight}>{parts.match}</span>
          {parts.after}
        </>
      ) : (
        sentence
      )}
    </p>
  )
}

export function PromptCard({ prompt, revealed, picked, correct, onReveal, onChoose }: Props) {
  const isChoice = prompt.shape === 'choice'
  const isSentence = prompt.display === 'sentence'
  const isCloze = prompt.cardType === 'cloze'

  return (
    <div
      onClick={!isChoice && !revealed ? onReveal : undefined}
      className="grid flex-1 grid-rows-2 gap-7 px-5 text-center"
    >
      {/* Upper zone: the question, resting on the centre line. */}
      <div className="flex flex-col items-center justify-end gap-3">
        <p className="text-base font-medium text-on-surface-dim">{prompt.instruction}</p>

        {/* Once a gap-fill is answered the filled sentence replaces the gapped
            one, so the question isn't shown twice. */}
        {!(isCloze && revealed) && (
          // Speaking a gap-fill sentence would read out the answer.
          <WithSpeaker
            speak={prompt.questionLang === 'nl' && !isSentence ? prompt.question : undefined}
          >
            <h1
              lang={prompt.questionLang}
              translate="no"
              // Serif only when the question is Dutch. An English prompt is
              // interface, not material.
              style={{
                fontSize: isSentence
                  ? fitSize(prompt.question, '2.05rem', '1.35rem')
                  : fitSize(prompt.question, '4rem'),
              }}
              className={`notranslate text-balance ${
                prompt.questionLang === 'nl'
                  ? 'font-display font-semibold'
                  : 'font-bold tracking-tight'
              } ${isSentence ? 'leading-snug' : 'leading-none'}`}
            >
              {prompt.questionLang === 'en' ? (
                <Gloss text={prompt.question} stacked />
              ) : (
                prompt.question
              )}
            </h1>
          </WithSpeaker>
        )}

        {prompt.subtitle && !(isCloze && revealed) && (
          <p className="text-base text-on-surface-dim">{prompt.subtitle}</p>
        )}
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
              {isCloze ? (
                <WithSpeaker speak={prompt.speak} small>
                  <Sentence
                    sentence={prompt.detail ?? ''}
                    word={prompt.answer}
                    className="max-w-[16rem] font-display text-[1.9rem] leading-snug font-semibold"
                    highlight="text-good-ink"
                  />
                </WithSpeaker>
              ) : (
                <WithSpeaker speak={prompt.answerLang === 'nl' ? prompt.speak : undefined}>
                  <p
                    lang={prompt.answerLang}
                    translate="no"
                    className={`notranslate font-display text-[2.6rem] leading-none font-semibold ${
                      correct === false ? 'text-bad-ink' : correct === true ? 'text-good-ink' : ''
                    }`}
                  >
                    {prompt.answerLang === 'en' ? (
                    <Gloss text={prompt.answer} stacked />
                  ) : (
                    prompt.answer
                  )}
                  </p>
                </WithSpeaker>
              )}

              {correct === false && picked && (
                <p className="text-base text-bad-ink/80">you chose &ldquo;{picked}&rdquo;</p>
              )}

              {prompt.meaning && (
                <p className="max-w-xs text-base text-on-surface-dim">{prompt.meaning}</p>
              )}

              {isCloze
                ? prompt.detailTranslation && (
                    <p className="max-w-xs text-base text-on-surface-dim">
                      {prompt.detailTranslation}
                    </p>
                  )
                : prompt.detail && (
                    <div className="mt-8 max-w-[16rem] space-y-1">
                      <WithSpeaker speak={prompt.detail} small>
                        <Sentence
                          sentence={prompt.detail}
                          word={prompt.note.nl}
                          className="text-lg text-on-surface/85"
                        />
                      </WithSpeaker>
                      {prompt.detailTranslation && (
                        <p className="text-base text-on-surface-dim">{prompt.detailTranslation}</p>
                      )}
                    </div>
                  )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
