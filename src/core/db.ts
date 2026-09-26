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

/**
 * Everything the app knows about you, gone: the scheduling state, the log it
 * could be rebuilt from, the score, the level, the colour. Back to a first
 * run. The word list isn't touched — it ships with the build and was never
 * yours to lose.
 *
 * The caller reloads afterwards rather than trying to talk the running app
 * back to its starting state, which is more code and more ways to be wrong.
 */
export async function eraseEverything(): Promise<void> {
  await db.transaction('rw', db.states, db.reviews, db.meta, async () => {
    await db.states.clear()
    await db.reviews.clear()
    await db.meta.clear()
  })
}

/**
 * Forget what was learned about words whose meaning has since been corrected.
 *
 * Each correction round carries a version; this runs once per version, on the
 * first launch of a build that has it. Only the scheduling state goes — the
 * review log stays, as it always does. The words then come back as new, and
 * are introduced again with the meaning they should have had.
 */
export async function forgetRetaught(resets: { version: number; ids: string[] }[]): Promise<void> {
  const seen = await getMeta<number>('resetVersion', 0)
  const pending = resets.filter((r) => r.version > seen)
  if (!pending.length) return
  const notes = new Set(pending.flatMap((r) => r.ids))
  const latest = Math.max(...pending.map((r) => r.version))
  await db.transaction('rw', db.states, db.meta, async () => {
    // Card ids are "<note>::<type>", so every card of a note shares its prefix.
    const doomed = (await db.states.toCollection().primaryKeys()).filter((id) =>
      notes.has(String(id).split('::')[0]),
    )
    await db.states.bulkDelete(doomed)
    await db.meta.put({ key: 'resetVersion', value: latest })
  })
}
