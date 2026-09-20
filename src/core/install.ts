// ---------------------------------------------------------------------------
// Adding the app to the home screen.
//
// The browser fires beforeinstallprompt once, early — usually before any
// component that cares has mounted — so the event is captured here at module
// level and handed out to whoever asks. Two places want it: the one-time card
// and the small button on the home screen.
// ---------------------------------------------------------------------------

const DISMISSED = 'install-dismissed'

interface InstallEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallEvent | null = null
const listeners = new Set<() => void>()

function notify() {
  for (const fn of listeners) fn()
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Chrome shows its own bar unless we take the event.
    e.preventDefault()
    deferred = e as InstallEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

/** Already running as an installed app? Then there is nothing to offer. */
export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS reports it here instead.
    (navigator as { standalone?: boolean }).standalone === true
  )
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function canInstall(): boolean {
  return deferred !== null && !isInstalled()
}

/** Opens the browser's own install dialog. Resolves once it is answered. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred
  if (!e) return false
  deferred = null
  notify()
  await e.prompt()
  const { outcome } = await e.userChoice
  // Declining the system dialog counts as declining. Don't nag.
  if (outcome === 'dismissed') rememberDismissed()
  return outcome === 'accepted'
}

export function cardDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED) === '1'
  } catch {
    // Private browsing and blocked storage both throw. Asking again is the
    // kinder failure than never asking.
    return false
  }
}

export function rememberDismissed(): void {
  try {
    localStorage.setItem(DISMISSED, '1')
  } catch {
    /* nothing to do; it will ask again next time */
  }
}
