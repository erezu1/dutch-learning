// ---------------------------------------------------------------------------
// Checks src/content/deck-core.json for the mistakes that turn into bad cards.
//
// Run:  node scripts/audit-deck.mjs
//
// Problems (exit code 1): things that would put a wrong or broken question in
// front of someone. Warnings: things worth a look that may be fine.
// ---------------------------------------------------------------------------

import { readFile } from 'node:fs/promises'

const deck = JSON.parse(await readFile('src/content/deck-core.json', 'utf8'))
const problems = []
const warnings = []

// The same whole-word match the app uses to build a gap-fill (core/cards.ts).
const wordPattern = (word) =>
  new RegExp(`(^|\\P{L})(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(\\P{L}|$)`, 'iu')

const byNl = new Map()
const byPrompt = new Map()

for (const n of deck.notes) {
  const at = `${n.id} (${n.nl})`
  if (!n.en?.length || n.en.some((g) => !g.trim())) problems.push(`${at}: no meaning`)
  for (const g of n.en ?? []) if (g.length > 64) warnings.push(`${at}: long gloss "${g}"`)
  if (n.pos === 'verb' && !n.verb) problems.push(`${at}: verb without forms`)
  if (n.pos === 'verb' && n.verb && !(n.verb.past && n.verb.participle))
    problems.push(`${at}: verb missing past or participle`)
  if (n.pos === 'verb' && !n.en[0].startsWith('to ') && !/^(may|can|must|shall|will)\b/.test(n.en[0]))
    warnings.push(`${at}: verb gloss without "to": "${n.en[0]}"`)
  if (n.pos === 'noun' && !n.gender) warnings.push(`${at}: noun without gender`)

  for (const ex of n.examples ?? []) {
    if (!ex.nl?.trim() || !ex.en?.trim()) problems.push(`${at}: empty example`)
    if (/ = | \| /.test(ex.nl) || / = | \| /.test(ex.en)) problems.push(`${at}: separator in example`)
  }
  if (n.examples?.length && !n.noCloze && !n.examples.some((ex) => wordPattern(n.nl).test(ex.nl)))
    warnings.push(`${at}: no example contains "${n.nl}", so no gap-fill`)

  // Homographs are fine (zijn the verb, zijn "his"); the same word twice as
  // the same part of speech is not.
  const key = `${n.nl.toLowerCase()} ${n.pos}`
  byNl.set(key, [...(byNl.get(key) ?? []), n.id])
  // The recall card shows the whole first sense, clarifier and all.
  const prompt = (n.en[0] ?? '').toLowerCase()
  byPrompt.set(prompt, [...(byPrompt.get(prompt) ?? []), `${n.nl}`])
}

for (const [nl, ids] of byNl) if (ids.length > 1) problems.push(`"${nl}" is in the deck twice: ${ids.join(", ")}`)
// Two notes asked with the same English can't be told apart on a recall card.
for (const [prompt, words] of byPrompt)
  if (words.length > 1) problems.push(`recall "${prompt}" has ${words.length} answers: ${words.join(', ')}`)

const resetIds = new Set((deck.resets ?? []).flatMap((r) => r.ids))
const ids = new Set(deck.notes.map((n) => n.id))
for (const id of resetIds) if (!ids.has(id)) warnings.push(`reset for a note not in the deck: ${id}`)

if (process.argv.includes('--warnings')) for (const w of warnings) console.log(`  · ${w}`)
for (const p of problems) console.log(`  ! ${p}`)
console.log(
  `\n${deck.notes.length} notes, ${resetIds.size} to relearn — ${problems.length} problems, ${warnings.length} warnings` +
    (process.argv.includes('--warnings') ? '' : ' (--warnings to list them)'),
)
process.exit(problems.length ? 1 : 0)
