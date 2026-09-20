import Dexie, { type EntityTable } from 'dexie'

// ---------------------------------------------------------------------------
// Progress lives here and only here: on the phone, per person, never pushed.
// The word list is *not* stored in Dexie — it ships with the build.
// ---------------------------------------------------------------------------

/** Scheduling state for one card. Owned by ts-fsrs, keyed by our card id. */
export interface CardStateRow {
  cardId: string
  due: number // epoch ms, so it's indexable
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  reps: number
  lapses: number
  state: number // ts-fsrs State enum
  lastReview?: number
}

/**
 * Append-only. Never edited, never deleted. Card state can be rebuilt from
 * this, which makes it the thing actually worth backing up.
 */
export interface ReviewRow {
  id?: number
  cardId: string
  at: number
  rating: number // 1 Again, 2 Hard, 3 Good, 4 Easy
  elapsedMs: number
}

export interface MetaRow {
  key: string
  value: unknown
}

const db = new Dexie('dutch') as Dexie & {
  states: EntityTable<CardStateRow, 'cardId'>
  reviews: EntityTable<ReviewRow, 'id'>
  meta: EntityTable<MetaRow, 'key'>
}

db.version(1).stores({
  states: 'cardId, due, state',
  reviews: '++id, cardId, at',
  meta: 'key',
})

export { db }

/** Ask the browser not to evict us. Installed apps are normally granted this. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted?.()) return true
  return navigator.storage.persist()
}

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const row = await db.meta.get(key)
  return row ? (row.value as T) : fallback
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value })
}
