import { useSyncExternalStore } from 'react'
import { canInstall, subscribe } from '../core/install'

/** True while the browser is willing to install the app and it isn't already. */
export function useCanInstall(): boolean {
  return useSyncExternalStore(subscribe, canInstall, () => false)
}
