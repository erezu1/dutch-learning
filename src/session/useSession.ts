import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { allCards, type Card } from '../core/cards'
import { db, type CardStateRow } from '../core/db'
import { buildQueue, DEFAULTS, type QueueOptions } from '../core/queue'
import { applyGrade, emptyState, isNew, previewIntervals, Rating, State, type Grade } from '../core/scheduler'
import type { Deck, Note } from '../core/types'
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
  intervals: Record<Grade, string> | null

  start: () => void
  reveal: () => void
  choose: (value: string) => void
  grade: (grade: Grade) => void
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

  const [states, setStates] = useState<Map<string, CardStateRow>>(new Map())
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [queue, setQueue] = useState<Card[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const [reviewed, setReviewed] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)

  const shownAt = useRef<number>(Date.now())
  const undoStack = useRef<UndoEntry[]>([])

  // Load saved progress once.
  useEffect(() => {
    let cancelled = false
    db.states.toArray().then((rows) => {
      if (cancelled) return
      setStates(new Map(rows.map((r) => [r.cardId, r] as const)))
      setStatus('idle')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const options: QueueOptions = useMemo(
    () => ({ ...DEFAULTS, now: new Date() }),
    // Rebuilt whenever progress changes, which is what we want.
    [states],
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
    const q = buildQueue(cards, states, { ...DEFAULTS, now: new Date() })
    undoStack.current = []
    setQueue(q.cards)
    setIndex(0)
    setReviewed(0)
    setCorrectCount(0)
    setRevealed(false)
    setPicked(null)
    shownAt.current = Date.now()
    setStatus(q.cards.length ? 'reviewing' : 'done')
  }, [cards, states])

  const card = queue[index] ?? null
  const note: Note | null = card ? notes.get(card.noteId) ?? null : null
  const prompt = card && note ? buildPrompt(card, note) : null

  const currentState = useMemo(() => {
    if (!card) return null
    return states.get(card.id) ?? emptyState(card.id)
  }, [card, states])

  const intervals = useMemo(
    () => (currentState && revealed ? previewIntervals(currentState) : null),
    [currentState, revealed],
  )

  const correct = useMemo(() => {
    if (!prompt || prompt.shape !== 'choice' || picked === null) return null
    return picked === prompt.answer
  }, [prompt, picked])

  const reveal = useCallback(() => setRevealed(true), [])

  const choose = useCallback((value: string) => {
    setPicked(value)
    setRevealed(true)
  }, [])

  const grade = useCallback(
    async (g: Grade) => {
      if (!card) return
      const previous = states.get(card.id)
      const base = previous ?? emptyState(card.id)
      const now = new Date()
      const next = applyGrade(base, g, now)

      const reviewId = await db.reviews.add({
        cardId: card.id,
        at: now.getTime(),
        rating: g,
        elapsedMs: Date.now() - shownAt.current,
      })
      await db.states.put(next)

      undoStack.current.push({ previous, reviewId: reviewId as number, index, wasCorrect: correct })

      setStates((prev) => new Map(prev).set(card.id, next))
      setReviewed((n) => n + 1)
      if (g !== Rating.Again) setCorrectCount((n) => n + 1)

      // A failed card comes back later in the same session.
      setQueue((prev) => (g === Rating.Again ? [...prev, card] : prev))

      setRevealed(false)
      setPicked(null)
      shownAt.current = Date.now()
      setIndex((i) => {
        const nextIndex = i + 1
        if (nextIndex >= (g === Rating.Again ? queue.length + 1 : queue.length)) setStatus('done')
        return nextIndex
      })
    },
    [card, states, index, queue.length, correct],
  )

  const undo = useCallback(async () => {
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
    intervals,
    start,
    reveal,
    choose,
    grade,
    undo,
    canUndo: undoStack.current.length > 0,
  }
}

export { isNew, Rating, type Grade }
