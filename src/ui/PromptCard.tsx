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

const choiceColor: Record<string, string> = {
  de: 'text-de',
  het: 'text-het',
  hebben: 'text-de',
  zijn: 'text-het',
}

export function PromptCard({ prompt, revealed, picked, correct, onReveal, onChoose }: Props) {
  const isChoice = prompt.shape === 'choice'

  return (
    <div className="flex flex-1 flex-col">
      <div
        onClick={!isChoice && !revealed ? onReveal : undefined}
        className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <p className="text-sm font-medium tracking-wide text-on-surface-dim">{prompt.instruction}</p>

        <div className="flex items-center gap-3">
          <h1
            lang={prompt.questionLang}
            className="text-[2.75rem] leading-tight font-semibold text-balance"
          >
            {prompt.question}
          </h1>
          {prompt.questionLang === 'nl' && <SpeakButton text={prompt.question} />}
        </div>

        {prompt.subtitle && <p className="text-sm text-on-surface-dim">{prompt.subtitle}</p>}

        {!revealed && !isChoice && (
          <p className="mt-6 text-sm text-on-surface-dim/70">tik om te zien</p>
        )}

        {revealed && (
          <div className="mt-2 flex flex-col items-center gap-3">
            <div className="h-px w-16 bg-surface-3" />
            <div className="flex items-center gap-3">
              <p
                lang={prompt.answerLang}
                className={`text-3xl font-semibold ${
                  correct === false ? 'text-bad' : correct === true ? 'text-good' : ''
                }`}
              >
                {prompt.answer}
              </p>
              {prompt.answerLang === 'nl' && prompt.speak && <SpeakButton text={prompt.speak} />}
            </div>

            {correct === false && picked && (
              <p className="text-sm text-bad/80">je koos &ldquo;{picked}&rdquo;</p>
            )}

            {prompt.detail && (
              <div className="mt-4 max-w-xs space-y-1">
                <p lang="nl" className="text-base text-on-surface/90">
                  {prompt.detail}
                </p>
                {prompt.detailTranslation && (
                  <p className="text-sm text-on-surface-dim">{prompt.detailTranslation}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {isChoice && !revealed && (
        <div className="flex gap-3 px-4 pb-2">
          {prompt.choices!.map((choice) => (
            <button
              key={choice}
              onClick={() => onChoose(choice)}
              className={`flex-1 rounded-3xl bg-surface-2 py-6 text-2xl font-semibold transition active:scale-95 ${
                choiceColor[choice] ?? ''
              }`}
            >
              {choice}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
