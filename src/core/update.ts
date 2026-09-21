// ---------------------------------------------------------------------------
// Picking up a new build.
//
// The service worker installs a new build and claims the page as soon as it
// activates — but the page carries on running the code it loaded with. So a
// change is deployed, the app is opened, and it looks exactly as it did: the
// new build is sitting in the cache waiting for the load after this one. On a
// phone, where the app is resumed rather than opened, that can be a long wait.
//
// This reloads when a new build takes over, and never in the middle of a card:
// being thrown back to the start of a session to receive a new shade of pink
// is worse than waiting until the session is over.
// ---------------------------------------------------------------------------

const MARK = 'took-update'

let reviewing = false
let waiting = false

/**
 * Reload, having left a note for the page that comes back.
 *
 * The reload is the whole mechanism and it is invisible: the app blinks and
 * is a different build, which reads as a glitch rather than as an event. The
 * note is what lets the new page say so. sessionStorage because it wants
 * exactly this scope — this tab, across this one navigation — and because it
 * is gone by the next launch whether or not anyone read it.
 */
function take(): void {
  try {
    sessionStorage.setItem(MARK, '1')
  } catch {
    /* private browsing; the reload still happens, just unannounced */
  }
  location.reload()
}

/**
 * Read once, at module load, because reading it consumes it: the note is for
 * the first page after the reload and nobody else. A getter that cleared as a
 * side effect would answer differently depending on who asked first.
 */
const arrivedOnUpdate = ((): boolean => {
  try {
    const yes = sessionStorage.getItem(MARK) === '1'
    if (yes) sessionStorage.removeItem(MARK)
    return yes
  } catch {
    return false
  }
})()

/** Did this page load because a new build took over? */
export function tookUpdate(): boolean {
  return arrivedOnUpdate
}

/** Told by the UI whether a session is in progress. */
export function setReviewing(next: boolean): void {
  reviewing = next
  if (!reviewing && waiting) take()
}

export function watchForUpdates(): void {
  if (!('serviceWorker' in navigator)) return

  // A page with no controller is getting its first one, which is not an
  // update — reloading there would reload every first visit.
  const isUpdate = !!navigator.serviceWorker.controller

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!isUpdate) return
    if (reviewing) waiting = true
    else take()
  })
}
