import { splitAroundWord } from '../core/cards'
import type { Prompt } from '../session/prompts'
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
  de: 'text-de',
  het: 'text-het',
  hebben: 'text-de',
  zijn: 'text-het',
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
      {choices.map((choice) => (
        <button
          key={choice}
          onClick={() => onChoose(choice)}
          translate="no"
          className={`notranslate rounded-3xl bg-surface-2 transition active:scale-95 ${
            pair ? 'flex-1 py-6 text-2xl font-semibold' : 'px-5 py-4 text-lg'
          } ${choiceColor[choice] ?? ''}`}
        >
          <Gloss text={choice} />
        </button>
      ))}
    </div>
  )
}

/**
 * A gap-fill shows the answer back in the sentence it came from, rather than
 * on its own — the word in context is the thing worth reading, and the audio
 * is of the whole sentence.
 */
function FilledSentence({ prompt }: { prompt: Prompt }) {
  const parts = prompt.detail ? splitAroundWord(prompt.detail, prompt.answer) : null
  if (!parts) return <p className="text-2xl font-semibold">{prompt.detail}</p>
  return (
    <p lang="nl" translate="no" className="notranslate text-2xl leading-snug font-semibold">
      {parts.before}
      <span className="text-good">{parts.match}</span>
      {parts.after}
    </p>
  )
}

export function PromptCard({ prompt, revealed, picked, correct, onReveal, onChoose }: Props) {
  const isChoice = prompt.shape === 'choice'
  const isSentence = prompt.display === 'sentence'
  const isCloze = prompt.cardType === 'cloze'

  return (
    <div className="flex flex-1 flex-col">
      <div
        onClick={!isChoice && !revealed ? onReveal : undefined}
        className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"
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
          <div className="mt-2 flex flex-col items-center gap-3">
            <div className="h-px w-16 bg-surface-3" />

            {isCloze ? (
              <div className="flex max-w-sm items-center gap-3">
                <FilledSentence prompt={prompt} />
                {prompt.speak && <SpeakButton text={prompt.speak} className="shrink-0" />}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p
                  lang={prompt.answerLang}
                  translate="no"
                  className={`notranslate text-3xl font-semibold ${
                    correct === false ? 'text-bad' : correct === true ? 'text-good' : ''
                  }`}
                >
                  {prompt.answerLang === 'en' ? <Gloss text={prompt.answer} /> : prompt.answer}
                </p>
                {prompt.answerLang === 'nl' && prompt.speak && <SpeakButton text={prompt.speak} />}
              </div>
            )}

            {correct === false && picked && (
              <p className="text-sm text-bad/80">you chose &ldquo;{picked}&rdquo;</p>
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
                <div className="mt-4 max-w-xs space-y-1">
                  <p lang="nl" translate="no" className="notranslate text-base text-on-surface/90">
                    {prompt.detail}
                  </p>
                  {prompt.detailTranslation && (
                    <p className="text-sm text-on-surface-dim">{prompt.detailTranslation}</p>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {isChoice && !revealed && <Choices prompt={prompt} onChoose={onChoose} />}
    </div>
  )
}
