// ---------------------------------------------------------------------------
// Zoom, refused a second time.
//
// `touch-action: pan-x pan-y` in the stylesheet is the right way to say this,
// and on its own it isn't always enough: Safari has its own gesture events
// that predate touch-action and ignore it, a trackpad pinch arrives as a wheel
// event with ctrl held, and a browser is free to decide the page doesn't get
// to have an opinion. So the gestures are also cancelled as they happen.
//
// What this cannot beat, and shouldn't: Chrome's "Force enable zoom", under
// Accessibility in the phone's own Chrome settings. That switch exists so that
// someone who needs to magnify a page can, whatever the page says, and a
// language app is not the place to argue with it.
// ---------------------------------------------------------------------------

export function refuseZoomGestures(): void {
  if (typeof document === 'undefined') return

  // Two fingers moving is a pinch. Nothing here is drawn at a size worth
  // pinching into, and nothing here needs a two-finger drag for anything else.
  document.addEventListener(
    'touchmove',
    (event) => {
      if (event.touches.length > 1) event.preventDefault()
    },
    // Not passive, or the browser is entitled to ignore the preventDefault.
    { passive: false },
  )

  // Safari's own, which arrive instead of a pinch rather than alongside it.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (event) => event.preventDefault())
  }

  // A trackpad pinch on a laptop, which is a wheel event with ctrl held.
  document.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey) event.preventDefault()
    },
    { passive: false },
  )
}
