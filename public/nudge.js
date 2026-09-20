// ---------------------------------------------------------------------------
// The evening nudge, and the only part of this app that runs while the app
// isn't.
//
// It is imported into the generated service worker (see vite.config.ts), which
// is why it is plain JavaScript with no build step and talks to IndexedDB
// through the raw API rather than through Dexie: nothing from src/ exists in
// here.
//
// Android decides when a periodic sync fires — the interval we ask for is a
// floor, not a schedule, and a phone that is asleep, on a metered connection
// or simply uninterested will skip it. So this checks the conditions itself
// every time it is woken: the right part of the day, nothing answered yet, and
// not already nudged. Anything else, it goes back to sleep without a word.
// ---------------------------------------------------------------------------

const TAG = 'daily-nudge'
const DB_NAME = 'dutch'

/** The evening, roughly. Early enough to act on, late enough to be fair. */
const FROM_HOUR = 15
const UNTIL_HOUR = 22

self.addEventListener('periodicsync', (event) => {
  if (event.tag !== TAG) return
  event.waitUntil(maybeNudge())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(openApp())
})

async function openApp() {
  const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  for (const client of open) {
    if ('focus' in client) return client.focus()
  }
  if (self.clients.openWindow) return self.clients.openWindow(self.registration.scope)
}

async function maybeNudge() {
  // Permission can be withdrawn in the phone's settings without the app ever
  // being opened again, so it is checked here rather than trusted from when
  // the switch was turned on.
  if (self.Notification?.permission !== 'granted') return

  const hour = new Date().getHours()
  if (hour < FROM_HOUR || hour >= UNTIL_HOUR) return

  const db = await openDb()
  if (!db) return

  try {
    if ((await getMeta(db, 'nudge')) !== true) return

    const today = dayKey()
    if ((await getMeta(db, 'lastNudge')) === today) return

    // The whole point: nothing today means nothing at all, not "less than the
    // day's plan". Someone who answered three questions on the bus has turned
    // up, and being told otherwise is how an app earns its notifications
    // being switched off.
    if ((await answeredToday(db)) > 0) return

    await setMeta(db, 'lastNudge', today)
    await self.registration.showNotification('Doei', {
      body: 'Nothing today yet. A few minutes closes the ring.',
      icon: new URL('icon-192.png', self.registration.scope).href,
      badge: new URL('icon-192.png', self.registration.scope).href,
      tag: TAG,
      // One reminder, and it waits for you rather than vibrating the phone.
      silent: true,
    })
  } finally {
    db.close()
  }
}

/** The same local-day key the app writes, so the two agree about "today". */
function dayKey() {
  return new Date().toLocaleDateString('sv')
}

function openDb() {
  return new Promise((resolve) => {
    // No version and no upgrade handler: if the app has never run on this
    // phone there is nothing to nudge about, and creating the database from
    // here would only give Dexie an empty one to be confused by.
    const request = indexedDB.open(DB_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
}

function getMeta(db, key) {
  return new Promise((resolve) => {
    try {
      const request = db.transaction('meta', 'readonly').objectStore('meta').get(key)
      request.onsuccess = () => resolve(request.result ? request.result.value : undefined)
      request.onerror = () => resolve(undefined)
    } catch {
      resolve(undefined)
    }
  })
}

function setMeta(db, key, value) {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('meta', 'readwrite')
      tx.objectStore('meta').put({ key, value })
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

function answeredToday(db) {
  return new Promise((resolve) => {
    try {
      const midnight = new Date().setHours(0, 0, 0, 0)
      const request = db
        .transaction('reviews', 'readonly')
        .objectStore('reviews')
        .index('at')
        .count(IDBKeyRange.lowerBound(midnight))
      request.onsuccess = () => resolve(request.result ?? 0)
      // An error here would be read as "nothing answered", so it answers the
      // other way: better a missed nudge than one on a day you did the work.
      request.onerror = () => resolve(1)
    } catch {
      resolve(1)
    }
  })
}
