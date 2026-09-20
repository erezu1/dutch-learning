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

let reviewing = false
let waiting = false

/** Told by the UI whether a session is in progress. */
export function setReviewing(next: boolean): void {
  reviewing = next
  if (!reviewing && waiting) location.reload()
}

export function watchForUpdates(): void {
  if (!('serviceWorker' in navigator)) return

  // A page with no controller is getting its first one, which is not an
  // update — reloading there would reload every first visit.
  const isUpdate = !!navigator.serviceWorker.controller

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!isUpdate) return
    if (reviewing) waiting = true
    else location.reload()
  })
}
