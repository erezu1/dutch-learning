// ---------------------------------------------------------------------------
// Colour schemes. Each one is a block of CSS custom properties in index.css,
// selected by a data-theme attribute on <html>. Nothing in the components
// knows which theme is active — they only ever reference the tokens.
// ---------------------------------------------------------------------------

export interface Theme {
  id: string
  name: string
  /** The dot shown in the picker. */
  swatch: string
  /** A contrasting ring for the dot, so pale swatches stay visible. */
  ring: string
}

export const THEMES: Theme[] = [
  { id: 'orange', name: 'Klomp', swatch: '#e2622a', ring: '#faf7f2' },
  { id: 'delft', name: 'Delft', swatch: '#2a5fd0', ring: '#f4f6fb' },
  { id: 'tulip', name: 'Tulp', swatch: '#c2306b', ring: '#fdf5f7' },
  { id: 'polder', name: 'Polder', swatch: '#2f7d5c', ring: '#f4f9f5' },
  { id: 'night', name: 'Nacht', swatch: '#8fa4ff', ring: '#181820' },
]

export const DEFAULT_THEME = THEMES[0]

export function themeById(id: string | null): Theme {
  return THEMES.find((t) => t.id === id) ?? DEFAULT_THEME
}

/** Applied to <html>, which is where the CSS overrides hang. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme.id
  // Keep the phone's status bar in step with the page.
  const meta = document.querySelector('meta[name="theme-color"]')
  const bg = getComputedStyle(document.body).backgroundColor
  if (meta && bg) meta.setAttribute('content', bg)
}
