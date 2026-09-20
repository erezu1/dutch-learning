import { motion } from 'framer-motion'
import { splitAroundWord } from '../core/cards'
import type { Prompt } from '../session/prompts'
import { glide, pressable } from './motion'
import { SpeakButton } from './SpeakButton'

// ---------------------------------------------------------------------------
// The presentation of one question. Phase 3 replaces this file (full-bleed,
// swipeable, animated) without touching any logic — it only ever reads a
// Prompt and calls the callbacks it is handed.
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

/** Renders "you (formal)" with the clarifying part played down. */
function Gloss({ text }: { text: string }) {
  const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(text)
  if (!m) return <>{text}</>
  return (
    <>
      {m[1]} <span className="text-[0.6em] font-normal opacity-50">({m[2]})</span>
    </>
  )
}

function Choices({ prompt, onChoose }: { prompt: Prompt; onChoose: (v: string) => void }) {
  const choices = prompt.choices!
  // Two options are the grammar pairs (de/het, hebben/zijn) and deserve to be
  // big and side by side. Four vocabulary options stack, so long glosses fit.
  const pair = choices.length === 2

  return (
    <div className={`px-4 pb-2 ${pair ? 'flex gap-3' : 'flex flex-col gap-2'}`}>
      {choices.map((choice, i) => (
        <motion.button
          key={choice}
          {...pressable}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...glide, delay: 0.04 * i }}
          onClick={() => onChoose(choice)}
          translate="no"
          className={`notranslate rounded-3xl shadow-2 transition-shadow active:shadow-press ${
            pair ? 'flex-1 py-6 text-2xl font-semibold' : 'px-5 py-4 text-lg'
          } ${choiceColor[choice] ?? 'bg-surface-1'}`}
        >
          <Gloss text={choice} />
        </motion.button>
      ))}
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
    <div className="flex flex-1 flex-col">
      {/* Anchored to the top rather than vertically centred: centring makes the
          question jump upwards the moment the answer appears below it. */}
      <div
        onClick={!isChoice && !revealed ? onReveal : undefined}
        className="flex flex-1 flex-col items-center gap-4 overflow-y-auto px-6 pt-[18vh] text-center"
      >
        <p className="text-sm font-medium tracking-wide text-on-surface-dim">{prompt.instruction}</p>

        {/* Once a gap-fill is answered the filled sentence replaces the gapped
            one, so the question isn't shown twice. */}
        {!(isCloze && revealed) && (
          <div className="flex items-center gap-3">
            <h1
              lang={prompt.questionLang}
              translate="no"
              className={`notranslate font-semibold text-balance ${
                isSentence ? 'text-2xl leading-snug' : 'text-[2.75rem] leading-tight'
              }`}
            >
              {prompt.questionLang === 'en' ? <Gloss text={prompt.question} /> : prompt.question}
            </h1>
            {/* Speaking a gap-fill sentence would read out the answer. */}
            {prompt.questionLang === 'nl' && !isSentence && <SpeakButton text={prompt.question} />}
          </div>
        )}

        {prompt.subtitle && !(isCloze && revealed) && (
          <p className="text-sm text-on-surface-dim">{prompt.subtitle}</p>
        )}

        {!revealed && !isChoice && (
          <p className="mt-6 text-sm text-on-surface-dim/70">tap to reveal</p>
        )}

        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={glide}
            className="mt-2 flex flex-col items-center gap-3"
          >
            <div className="h-px w-16 bg-surface-3" />

            {isCloze ? (
              <div className="flex max-w-sm items-center gap-3">
                <Sentence
                  sentence={prompt.detail ?? ''}
                  word={prompt.answer}
                  className="text-2xl leading-snug font-semibold"
                  highlight="text-good-ink"
                />
                {prompt.speak && <SpeakButton text={prompt.speak} />}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p
                  lang={prompt.answerLang}
                  translate="no"
                  className={`notranslate text-3xl font-semibold ${
                    correct === false ? 'text-bad-ink' : correct === true ? 'text-good-ink' : ''
                  }`}
                >
                  {prompt.answerLang === 'en' ? <Gloss text={prompt.answer} /> : prompt.answer}
                </p>
                {prompt.answerLang === 'nl' && prompt.speak && <SpeakButton text={prompt.speak} />}
              </div>
            )}

            {correct === false && picked && (
              <p className="text-sm text-bad-ink/80">you chose &ldquo;{picked}&rdquo;</p>
            )}

            {prompt.meaning && (
              <p className="max-w-xs text-sm text-on-surface-dim">{prompt.meaning}</p>
            )}

            {isCloze ? (
              prompt.detailTranslation && (
                <p className="max-w-xs text-sm text-on-surface-dim">{prompt.detailTranslation}</p>
              )
            ) : (
              prompt.detail && (
                <div className="mt-4 flex max-w-xs items-start gap-2">
                  <div className="space-y-1 text-left">
                    <Sentence
                      sentence={prompt.detail}
                      word={prompt.note.nl}
                      className="text-base text-on-surface/80"
                    />
                    {prompt.detailTranslation && (
                      <p className="text-sm text-on-surface-dim">{prompt.detailTranslation}</p>
                    )}
                  </div>
                  <SpeakButton text={prompt.detail} small className="mt-0.5" />
                </div>
              )
            )}
          </motion.div>
        )}
      </div>

      {isChoice && !revealed && <Choices prompt={prompt} onChoose={onChoose} />}
    </div>
  )
}
