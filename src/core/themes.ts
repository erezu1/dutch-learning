// ---------------------------------------------------------------------------
// Appearance: a colour and a mode, kept apart on purpose.
//
// The colour is a hue, how much of it there is, and how light its accent
// wants to be; index.css derives every surface, ink and edge from those,
// twice — once for light and once for dark. So every colour has a dark mode,
// and adding a colour is three numbers rather than a block of hand-picked hex.
//
// Nothing in the components knows which theme is active. They only ever
// reference the tokens.
// ---------------------------------------------------------------------------

import { pawSvg } from './paw'

export interface Theme {
  id: string
  name: string
  /** Where the colour sits on the wheel, in oklch degrees. */
  hue: number
  /** How saturated it is. Hues differ in how much chroma they can carry. */
  chroma: number
  /** How light the accent is. A yellow has to be light; a blue must not be. */
  light: number
  /** Where dark mode differs from lifting the accent the usual amount. */
  dark?: { light?: number; chroma?: number; hue?: number }
}

/**
 * In wheel order, so the row of dots reads as a spectrum. These are the same
 * numbers as the blocks in index.css — kept here only so the dots can be drawn
 * without asking the browser to resolve seven stylesheets' worth of variables.
 */
export const THEMES: Theme[] = [
  { id: 'tulip', name: 'Tulp', hue: 1, chroma: 0.187, light: 55 },
  {
    id: 'baksteen',
    name: 'Baksteen',
    hue: 15,
    chroma: 0.17,
    light: 51,
    dark: { light: 66, chroma: 0.17 },
  },
  { id: 'klomp', name: 'Klomp', hue: 42, chroma: 0.173, light: 58 },
  { id: 'polder', name: 'Polder', hue: 158, chroma: 0.11, light: 55 },
  { id: 'zee', name: 'Zee', hue: 200, chroma: 0.115, light: 54 },
  { id: 'lucht', name: 'Lucht', hue: 255, chroma: 0.16, light: 55 },
  { id: 'lavendel', name: 'Lavendel', hue: 310, chroma: 0.18, light: 54 },
]

export const DEFAULT_THEME = THEMES[0]

/**
 * What the schemes that no longer exist under those names became. Nacht isn't
 * here because it didn't become a colour — it became a mode, which is what
 * `wasNightScheme` is for.
 */
const RENAMED: Record<string, string> = {
  orange: 'klomp',
  delft: 'lucht',
  // Stroop was a mustard, and mustard is not a colour anything should be.
  stroop: 'baksteen',
}

export function themeById(id: string | null): Theme {
  const wanted = id ? (RENAMED[id] ?? id) : null
  return THEMES.find((t) => t.id === wanted) ?? DEFAULT_THEME
}

/** True for the old dark *scheme*, whose owner should land in dark *mode*. */
export const wasNightScheme = (id: string | null): boolean => id === 'night'

/** What the app was asked for. 'system' follows the phone. */
export type Mode = 'system' | 'light' | 'dark'
/** What it resolves to right now. */
export type Resolved = 'light' | 'dark'

export const MODES: { id: Mode; name: string }[] = [
  { id: 'light', name: 'Light' },
  { id: 'dark', name: 'Dark' },
  { id: 'system', name: 'System' },
]

export const DEFAULT_MODE: Mode = 'system'

export function modeById(id: string | null): Mode {
  return MODES.some((m) => m.id === id) ? (id as Mode) : DEFAULT_MODE
}

const darkQuery = () =>
  typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null

export function resolveMode(mode: Mode): Resolved {
  if (mode !== 'system') return mode
  return darkQuery()?.matches ? 'dark' : 'light'
}

/** Calls back whenever the phone's own setting changes. Returns an unsubscribe. */
export function onSystemModeChange(fn: () => void): () => void {
  const query = darkQuery()
  if (!query) return () => {}
  query.addEventListener('change', fn)
  return () => query.removeEventListener('change', fn)
}

/**
 * The swatch for one scheme's dot, at the lightness the accent has in the mode
 * being shown. An accent dark enough to read on white is muddy on a dark page,
 * and the dots should look like what choosing them will give you.
 */
export function swatch(theme: Theme, resolved: Resolved): string {
  if (resolved !== 'dark') return `oklch(${theme.light}% ${theme.chroma} ${theme.hue})`
  const { light = 78, chroma = theme.chroma * 0.8, hue = theme.hue } = theme.dark ?? {}
  return `oklch(${light}% ${chroma} ${hue})`
}

let settling: ReturnType<typeof setTimeout> | null = null

/** Applied to <html>, which is where the CSS overrides hang. */
export function applyAppearance(theme: Theme, mode: Mode, animate = false): void {
  const root = document.documentElement

  if (animate) {
    // Colour transitions are switched on only for the length of the change.
    // Leaving them on permanently would make every press and hover fade in
    // too, which is exactly the sludge that makes an interface feel slow.
    root.dataset.themeChanging = ''
    if (settling) clearTimeout(settling)
    settling = setTimeout(() => {
      delete root.dataset.themeChanging
      settling = null
    }, THEME_FADE)
  }

  root.dataset.theme = theme.id
  root.dataset.mode = resolveMode(mode)

  // The strip above the app gets the plain surface, and the ground fades out
  // before it reaches the top of the screen so the page meets it with exactly
  // that. Chasing it with the live colour was the wrong idea: an installed app
  // takes this once, at launch, and nothing set at run time reaches it.
  const meta = document.querySelector('meta[name="theme-color"]')
  const bg = getComputedStyle(document.body).backgroundColor
  if (meta && bg) meta.setAttribute('content', bg)

  setFavicon()
}

/**
 * The accent as the browser has actually worked it out — an sRGB string, so it
 * can go somewhere that isn't a stylesheet. The tokens are written in oklch
 * and derived through calc, so there is nothing to read without asking the
 * browser to resolve it.
 */
function resolvedAccent(): string {
  const probe = document.createElement('span')
  probe.style.cssText = 'display:none;color:var(--color-primary)'
  document.body.appendChild(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  if (!value) return '#c2306b'
  // Chrome hands back the oklch exactly as written, and setting a canvas's
  // fillStyle to it hands it straight back too. Painting one pixel and reading
  // it is the only way to get plain sRGB out, which is what belongs in an SVG
  // that has to survive being a data URI in a <link rel=icon>.
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (ctx) {
      ctx.fillStyle = value
      ctx.fillRect(0, 0, 1, 1)
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
      return `rgb(${r} ${g} ${b})`
    }
  } catch {
    /* Fall through to the raw value; a modern browser renders it anyway. */
  }
  return value
}

/**
 * The browser tab icon follows the scheme too. The installed app's icon
 * cannot — Android takes a copy of the PNG when you add it to the home screen
 * and never asks again — so that one stays the default orange.
 */
function setFavicon(): void {
  const svg = pawSvg('#ffffff', resolvedAccent())
  const href = `data:image/svg+xml,${encodeURIComponent(svg)}`
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.type = 'image/svg+xml'
  link.href = href
}

/** Kept in step with the CSS transition duration. */
export const THEME_FADE = 420
