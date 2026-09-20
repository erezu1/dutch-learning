import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { requestPersistentStorage } from './core/db'
import { refuseZoomGestures } from './core/gestures'
import { watchForUpdates } from './core/update'
import './index.css'

// Ask the browser not to evict our progress. Granted automatically for
// installed apps; harmless when it isn't.
void requestPersistentStorage()

// The stylesheet already says no to zooming; this says it again in the one
// language every browser understands.
refuseZoomGestures()

// And pick up a new build when one arrives, rather than the load after next.
watchForUpdates()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
