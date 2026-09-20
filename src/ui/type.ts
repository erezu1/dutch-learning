// ---------------------------------------------------------------------------
// Three type roles, and nothing else decides.
//
//   FOCUS   the thing being taught at this moment — the word being asked
//           about, the answer once revealed, the Dutch example sentence.
//   TITLE   headings and numbers: "Settings", "Done for today", the score.
//   (body)  everything else, which is the default and needs no class:
//           instructions, parts of speech, options, translations, buttons.
//
// The serif marks what you are meant to be looking at, not what language it
// happens to be in — which is why the options are set in the sans even when
// they are Dutch words. They are choices, not the subject.
//
// The app's name is the one heading set in the serif, and for the same reason
// everything else in it is: *doei* is a Dutch word. Reading it as one is the
// point of calling the app that, so it is set as the material and not as the
// furniture. Screen headings around it stay in the sans — they are English,
// and they are interface.
// ---------------------------------------------------------------------------

// Selectable, because this is the role for the material itself: the word
// being asked about, the answer, the example sentence. Everything else on the
// screen is furniture, and furniture doesn't need to be copied.
export const FOCUS = 'font-display font-semibold select-text [-webkit-touch-callout:default]'
export const TITLE = 'font-bold tracking-tight'
export const WORDMARK = 'font-display font-semibold tracking-tight'
