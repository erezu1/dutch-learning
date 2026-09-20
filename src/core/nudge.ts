// ---------------------------------------------------------------------------
// The app's half of the evening nudge. The other half is public/nudge.js,
// which runs inside the service worker; this only decides whether it may.
//
// Periodic background sync is the one way a web app gets to run while it is
// closed without a server anywhere, and it is not given away: the browser
// wants the app installed to the home screen and used enough to be worth
// waking, and it grants the permission itself rather than asking. So every
// step here can fail for reasons that are nobody's fault, and each of them
// comes back as something the settings screen can say out loud.
// ---------------------------------------------------------------------------

import { getMeta, setMeta } from './db'

const TAG = 'daily-nudge'
/** A floor, not a schedule. Android fires it when it suits Android. */
const MIN_INTERVAL = 12 * 60 * 60 * 1000

interface PeriodicSyncManager {
  register: (tag: string, options?: { minInterval?: number }) => Promise<void>
  unregister: (tag: string) => Promise<void>
  getTags: () => Promise<string[]>
}

type Registration = ServiceWorkerRegistration & { periodicSync?: PeriodicSyncManager }

export type NudgeTrouble =
  /** This browser has no periodic background sync. */
  | 'unsupported'
  /** Notifications are switched off for the app in the phone's own settings. */
  | 'blocked'
  /** The browser won't wake the app — usually: not installed, or too new. */
  | 'not-allowed'

export interface NudgeState {
  on: boolean
  trouble?: NudgeTrouble
}

function manager(registration: ServiceWorkerRegistration): PeriodicSyncManager | undefined {
  return (registration as Registration).periodicSync
}

export function nudgeSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window &&
    'PeriodicSyncManager' in window
  )
}

/**
 * What the switch should show. The registration is the truth — a tag that is
 * no longer there means the browser dropped it, whatever the app remembers.
 */
export async function nudgeState(): Promise<NudgeState> {
  if (!nudgeSupported()) return { on: false, trouble: 'unsupported' }
  if (Notification.permission === 'denied') return { on: false, trouble: 'blocked' }

  try {
    const registration = await navigator.serviceWorker.ready
    const tags = (await manager(registration)?.getTags()) ?? []
    const on = tags.includes(TAG)
    // Remembered as on, but the browser is no longer holding it.
    if (!on && (await getMeta<boolean>('nudge', false)))
      return { on: false, trouble: 'not-allowed' }
    return { on }
  } catch {
    return { on: false, trouble: 'unsupported' }
  }
}

export async function enableNudge(): Promise<NudgeState> {
  if (!nudgeSupported()) return { on: false, trouble: 'unsupported' }

  // Asked from the tap on the switch, which is the only moment a browser will
  // entertain the question.
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { on: false, trouble: 'blocked' }

  try {
    const registration = await navigator.serviceWorker.ready
    await manager(registration)?.register(TAG, { minInterval: MIN_INTERVAL })
    // Written whatever happens next: the service worker reads this before it
    // shows anything, so a stale true here would nudge someone who said no.
    await setMeta('nudge', true)
    return await nudgeState()
  } catch {
    await setMeta('nudge', false)
    return { on: false, trouble: 'not-allowed' }
  }
}

export async function disableNudge(): Promise<NudgeState> {
  await setMeta('nudge', false).catch(() => {})
  if (!nudgeSupported()) return { on: false, trouble: 'unsupported' }
  try {
    const registration = await navigator.serviceWorker.ready
    await manager(registration)?.unregister(TAG)
  } catch {
    /* Off in the database is off, whether or not the tag could be dropped. */
  }
  return { on: false }
}
