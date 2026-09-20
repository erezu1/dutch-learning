// ---------------------------------------------------------------------------
// The app mark's geometry, kept here rather than in the UI layer so the
// favicon (which core owns, alongside the theme) and the React component can
// share one definition. Nothing in core imports from ui.
// ---------------------------------------------------------------------------

export const PAW_TOES = [
  { cx: 4.6, cy: 11.6, r: 2.3 },
  { cx: 9.2, cy: 6.2, r: 2.6 },
  { cx: 15, cy: 6.2, r: 2.6 },
  { cx: 19.6, cy: 11.6, r: 2.3 },
] as const

export const PAW_PAD =
  'M12.1 11.8c4 0 7.3 2.8 7.3 5.8 0 2.7-3 4.2-7.3 4.2s-7.3-1.5-7.3-4.2c0-3 3.3-5.8 7.3-5.8z'

/** The mark as a standalone SVG string, used for the favicon. */
export function pawSvg(color: string, background?: string): string {
  const toes = PAW_TOES.map((t) => `<circle cx="${t.cx}" cy="${t.cy}" r="${t.r}"/>`).join('')
  const bg = background ? `<rect width="24" height="24" rx="5.5" fill="${background}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${bg}<g fill="${color}">${toes}<path d="${PAW_PAD}"/></g></svg>`
}
