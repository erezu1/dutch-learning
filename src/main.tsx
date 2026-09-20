import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { requestPersistentStorage } from './core/db'
import { trackStatusBar } from './core/statusbar'
import { watchForUpdates } from './core/update'
import './index.css'

// Ask the browser not to evict our progress. Granted automatically for
// installed apps; harmless when it isn't.
void requestPersistentStorage()

// And pick up a new build when one arrives, rather than the load after next.
watchForUpdates()

// Keep the status bar the colour the top of the page is, as the ground moves.
trackStatusBar()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
