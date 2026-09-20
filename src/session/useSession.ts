import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { allCards, type Card } from '../core/cards'
import { db, getMeta, setMeta, type CardStateRow } from '../core/db'
import { buildQueue, DEFAULTS, type QueueOptions } from '../core/queue'
import { applyGrade, emptyState, isNew, Rating, State, type Grade } from '../core/scheduler'
import { awardFor, type Award } from '../core/score'
import { DEFAULT_LEVEL, levelById, type LevelOption } from '../core/levels'
import { applyTheme, DEFAULT_THEME, themeById, type Theme } from '../core/themes'
import type { Deck, Note } from '../core/types'
import { SELECT_DELAY } from '../ui/motion'
import { buildPrompt, type Prompt } from './prompts'

// ---------------------------------------------------------------------------
// All session logic, no rendering. The UI gets a prompt and four functions.
// A swipe layer in Phase 3 calls exactly the same grade() a button does.
// ---------------------------------------------------------------------------

export type SessionStatus = 'loading' | 'idle' | 'reviewing' | 'done'

export interface SessionStats {
  reviewed: number
  correct: number
  dueCount: number
  newCount: number
  /** Words whose recognise card has reached the review stage. */
  known: number
  total: number
}

export interface Session {
  status: SessionStatus
  prompt: Prompt | null
  revealed: boolean
  /** For a 'choice' prompt: what was picked, and whether it was right. */
  picked: string | null
  correct: boolean | null
  position: number
  length: number
  stats: SessionStats
  /** Lifetime points. Only ever increases. */
  score: number
  /** Points earned in this session, for the finishing screen. */
  sessionPoints: number
  /** The most recent award, for the animation. Null between sessions. */
  award: (Award & { key: number }) | null
  /** Set for a choice prompt once answered: the grade the app will apply. */
  autoGrade: Grade | null
  level: LevelOption
  /** False until the level has been picked, so we can ask on first run. */
  levelChosen: boolean
  setLevel: (option: LevelOption) => void
  theme: Theme
  setTheme: (theme: Theme) => void

  start: () => void
  reveal: () => void
  choose: (value: string) => void
  grade: (grade: Grade) => void
  /** Moves on without recording — a choice card is recorded when answered. */
  advance: () => void
  undo: () => void
  canUndo: boolean
}

interface UndoEntry {
  previous: CardStateRow | undefined
  reviewId: number
  index: number
  wasCorrect: boolean | null
}

export function useSession(deck: Deck): Session {
  const notes = useMemo(() => new Map(deck.notes.map((n) => [n.id, n] as const)), [deck])
  const cards = useMemo(() => allCards(deck.notes), [deck])
  // Hand-written notes have no frequency rank; fall back to deck order.
  const rankOf = useMemo(
    () => new Map(deck.notes.map((n, i) => [n.id, n.rank ?? i] as const)),
    [deck],
  )

  const [states, setStates] = useState<Map<string, CardStateRow>>(new Map())
  const [level, setLevelState] = useState<LevelOption>(DEFAULT_LEVEL)
  const [levelChosen, setLevelChosen] = useState(false)
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME)
  const [score, setScore] = useState(0)
  /** The most recent award, with a key so the same amount re-animates. */
  const [award, setAward] = useState<(Award & { key: number }) | null>(null)
  const [sessionPoints, setSessionPoints] = useState(0)
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [queue, setQueue] = useState<Card[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const [reviewed, setReviewed] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)

  const shownAt = useRef<number>(Date.now())
  const undoStack = useRef<UndoEntry[]>([])
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Guards against scoring the same card twice — once on answer, once on Continue. */
  const recorded = useRef(false)
  /** The live queue, so advancing can see a card requeued a moment earlier. */
  const queueRef = useRef<Card[]>([])
  const promptRef = useRef<Prompt | null>(null)

  const clearRevealTimer = useCallback(() => {
    if (revealTimer.current) {
      clearTimeout(revealTimer.current)
      revealTimer.current = null
    }
  }, [])

  useEffect(() => clearRevealTimer, [clearRevealTimer])

  // Load saved progress and the chosen level once.
  useEffect(() => {
    let cancelled = false
    Promise.all([
      db.states.toArray(),
      getMeta<string | null>('level', null),
      getMeta<string | null>('theme', null),
      getMeta<number>('score', 0),
    ]).then(([rows, savedLevel, savedTheme, savedScore]) => {
      if (cancelled) return
      setStates(new Map(rows.map((r) => [r.cardId, r] as const)))
      setLevelState(levelById(savedLevel))
      setLevelChosen(savedLevel !== null)
      setScore(savedScore)
      const t = themeById(savedTheme)
      setThemeState(t)
      applyTheme(t)
      setStatus('idle')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    applyTheme(next, true)
    void setMeta('theme', next.id).catch(() => {})
  }, [])

  const setLevel = useCallback((option: LevelOption) => {
    // Update first, persist after. Waiting on the write means a storage
    // hiccup leaves the app stuck on the level screen with no way forward.
    setLevelState(option)
    setLevelChosen(true)
    void setMeta('level', option.id).catch(() => {
      /* The choice still applies this session; it just won't be remembered. */
    })
  }, [])

  const options: QueueOptions = useMemo(
    () => ({ ...DEFAULTS, now: new Date(), rankOf, startRank: level.startRank }),
    // Rebuilt whenever progress or level changes, which is what we want.
    [states, rankOf, level],
  )

  const preview = useMemo(
    () => buildQueue(cards, states, options),
    [cards, states, options],
  )

  const stats: SessionStats = useMemo(() => {
    let known = 0
    for (const note of deck.notes) {
      const s = states.get(`${note.id}::recognize`)
      if (s && s.state === State.Review) known++
    }
    return {
      reviewed,
      correct: correctCount,
      dueCount: preview.dueCount,
      newCount: preview.newCount,
      known,
      total: deck.notes.length,
    }
  }, [deck, states, preview, reviewed, correctCount])

  const start = useCallback(() => {
    clearRevealTimer()
    const q = buildQueue(cards, states, {
      ...DEFAULTS,
      now: new Date(),
      rankOf,
      startRank: level.startRank,
    })
    undoStack.current = []
    queueRef.current = q.cards
    recorded.current = false
    setQueue(q.cards)
    setIndex(0)
    setReviewed(0)
    setCorrectCount(0)
    setSessionPoints(0)
    setAward(null)
    setRevealed(false)
    setPicked(null)
    shownAt.current = Date.now()
    setStatus(q.cards.length ? 'reviewing' : 'done')
  }, [cards, states, rankOf, level, clearRevealTimer])

  const card = queue[index] ?? null
  const note: Note | null = card ? notes.get(card.noteId) ?? null : null

  // Memoised on the card, not the render: multiple-choice options are shuffled
  // when they are built, so rebuilding on every render would reorder the
  // buttons under the user's finger.
  const prompt = useMemo(() => {
    if (!card || !note) return null
    const saved = states.get(card.id)
    return buildPrompt(card, note, {
      notes: deck.notes,
      // Multiple choice while learning, free recall once the word sticks.
      introduce: !saved || saved.state !== State.Review,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id, note?.id, deck])

  promptRef.current = prompt

  const correct = useMemo(() => {
    if (!prompt || prompt.shape !== 'choice' || picked === null) return null
    return picked === prompt.answer
  }, [prompt, picked])

  const reveal = useCallback(() => setRevealed(true), [])

  /** Records the answer: persists it, scores it, and requeues a failure. */
  const record = useCallback(
    async (g: Grade) => {
      if (!card || recorded.current) return
      recorded.current = true
      const previous = states.get(card.id)
      const base = previous ?? emptyState(card.id)
      const now = new Date()
      const next = applyGrade(base, g, now)

      const earned = awardFor(g, base, next)

      const reviewId = await db.reviews.add({
        cardId: card.id,
        at: now.getTime(),
        rating: g,
        elapsedMs: Date.now() - shownAt.current,
      })
      await db.states.put(next)

      undoStack.current.push({ previous, reviewId: reviewId as number, index, wasCorrect: correct })

      setStates((prev) => new Map(prev).set(card.id, next))
      setScore((s) => {
        const total = s + earned.amount
        void setMeta('score', total).catch(() => {})
        return total
      })
      setSessionPoints((p) => p + earned.amount)
      setAward({ ...earned, key: Date.now() })
      setReviewed((n) => n + 1)
      if (g !== Rating.Again) setCorrectCount((n) => n + 1)

      // A failed card comes back later in the same session.
      if (g === Rating.Again) {
        queueRef.current = [...queueRef.current, card]
        setQueue(queueRef.current)
      }
    },
    [card, states, index, correct],
  )

  const choose = useCallback(
    (value: string) => {
      if (revealTimer.current || recorded.current) return // already answered
      setPicked(value)
      // The answer is known the instant it is given, so score it now — the
      // points belong to the moment you got it right, not to pressing Continue
      // afterwards.
      void record(value === promptRef.current?.answer ? Rating.Good : Rating.Again)
      // Then hold, so the option you pressed is visibly the one you pressed and
      // the points have the screen, before the answer takes their place.
      revealTimer.current = setTimeout(() => {
        revealTimer.current = null
        setRevealed(true)
      }, SELECT_DELAY)
    },
    [record],
  )

  /**
   * A multiple-choice answer is graded by the app, not by you — it already
   * knows whether you were right. Wrong becomes Again, right becomes Good.
   */
  const autoGrade: Grade | null = useMemo(() => {
    if (correct === null) return null
    return correct ? Rating.Good : Rating.Again
  }, [correct])

  /** Moves to the next card. Separate, so recording can happen earlier. */
  const advance = useCallback(() => {
    clearRevealTimer()
    recorded.current = false
    setRevealed(false)
    setPicked(null)
    shownAt.current = Date.now()
    setIndex((i) => {
      const nextIndex = i + 1
      if (nextIndex >= queueRef.current.length) setStatus('done')
      return nextIndex
    })
  }, [clearRevealTimer])

  /** Self-graded cards do both at once: you judge, then it moves on. */
  const grade = useCallback(
    async (g: Grade) => {
      await record(g)
      advance()
    },
    [record, advance],
  )

  const undo = useCallback(async () => {
    clearRevealTimer()
    const last = undoStack.current.pop()
    if (!last) return
    await db.reviews.delete(last.reviewId)
    const cardAt = queue[last.index]
    if (last.previous) await db.states.put(last.previous)
    else if (cardAt) await db.states.delete(cardAt.id)

    setStates((prev) => {
      const copy = new Map(prev)
      if (last.previous) copy.set(last.previous.cardId, last.previous)
      else if (cardAt) copy.delete(cardAt.id)
      return copy
    })
    setIndex(last.index)
    setReviewed((n) => Math.max(0, n - 1))
    setRevealed(false)
    setPicked(null)
    setStatus('reviewing')
    shownAt.current = Date.now()
  }, [queue])

  return {
    status,
    prompt,
    revealed,
    picked,
    correct,
    position: Math.min(index + 1, queue.length),
    length: queue.length,
    stats,
    score,
    sessionPoints,
    award,
    autoGrade,
    level,
    levelChosen,
    setLevel,
    theme,
    setTheme,
    start,
    reveal,
    choose,
    grade,
    advance,
    undo,
    canUndo: undoStack.current.length > 0,
  }
}

export { isNew, Rating, type Grade }
