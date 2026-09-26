// ---------------------------------------------------------------------------
// Applies src/content/curation.json on top of src/content/deck-core.json.
//
// The import picks each word's first surviving Wiktionary sense and a Tatoeba
// sentence that merely contains the word, which is right often enough to look
// trustworthy and wrong often enough to teach nonsense: "op" came out as
// "after · bar", "te" as "located at". curation.json is the hand-checked
// correction for every note that needed one — its meaning, its part of speech,
// a sentence that uses it in that meaning, and a translation of that sentence.
//
// Run:  node scripts/apply-curation.mjs
//
// build-deck.mjs calls this at the end, so a rebuild keeps the corrections.
// Applying twice changes nothing the second time.
//
// A note whose meaning was taught wrong is listed under `resets`, with the
// curation version it was corrected in. The app wipes the scheduling state of
// those notes once, so the word comes back as new instead of being scheduled
// on the strength of having learned the wrong thing. A later correction takes a
// higher `reset` number than any already shipped — the app remembers the last
// version it applied and only acts on newer ones.
// ---------------------------------------------------------------------------

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const DECK = 'src/content/deck-core.json'
const CURATION = 'src/content/curation.json'

/** Where each level starts in the frequency list. build-deck.mjs uses the same. */
export function levelFor(rank) {
  if (rank <= 300) return 'A1'
  if (rank <= 900) return 'A2'
  if (rank <= 2000) return 'B1'
  return 'B2'
}

const regularPlural = (word, plural) =>
  plural === `${word}en` || plural === `${word}s` || plural === `${word}'s`

export function applyCuration(deck, curation) {
  const ids = new Set(deck.notes.map((n) => n.id))
  for (const id of Object.keys(curation.notes)) {
    // A dropped note is already gone the second time round.
    if (!ids.has(id) && !curation.notes[id].drop) console.warn(`  ! curation for unknown note ${id}`)
  }

  const notes = []
  for (const note of deck.notes) {
    const c = curation.notes[note.id]
    if (!c) {
      notes.push(note)
      continue
    }
    if (c.drop) continue

    const n = structuredClone(note)
    if (c.nl) n.nl = c.nl
    if (c.pos) n.pos = c.pos
    if (c.en) n.en = c.en
    if (c.examples) n.examples = c.examples
    if (c.noCloze) n.noCloze = true
    // A note turned into its lemma can be far commoner than the form it was
    // counted under: "boy" is an English word in Dutch subtitles, "jongen" is
    // one of the first nouns anyone learns.
    if (c.rank) {
      n.rank = c.rank
      n.level = levelFor(c.rank)
    }
    if (c.gender) n.gender = c.gender
    // "-" is "has no plural": humour, not humours.
    if (c.plural === '-') delete n.plural
    else if (c.plural) n.plural = c.plural
    if (c.verb) {
      n.verb = { ...(n.verb ?? {}), ...c.verb }
      if (c.verb.auxiliary) delete n.verb.auxiliaryUnknown
    }

    // Whatever belonged to the old part of speech goes with it: a noun that
    // turned out to be an adjective has no gender to be asked about.
    if (n.pos !== 'verb') delete n.verb
    if (n.pos !== 'noun') {
      delete n.gender
      delete n.plural
      delete n.irregularPlural
    }
    if (n.pos !== 'adj') {
      delete n.comparative
      delete n.superlative
    }
    if (n.pos === 'noun' && n.plural) {
      if (regularPlural(n.nl, n.plural)) delete n.irregularPlural
      else n.irregularPlural = true
    }
    if (n.verb && !n.verb.auxiliary) {
      n.verb.auxiliary = 'hebben'
      n.verb.auxiliaryUnknown = true
    }
    if (!n.examples?.length) delete n.examples

    notes.push(n)
  }

  notes.sort((a, b) => (a.rank ?? 9e9) - (b.rank ?? 9e9))

  const byVersion = new Map()
  for (const [id, c] of Object.entries(curation.notes)) {
    if (!c.reset || c.drop) continue
    if (!byVersion.has(c.reset)) byVersion.set(c.reset, [])
    byVersion.get(c.reset).push(id)
  }
  const resets = [...byVersion]
    .sort(([a], [b]) => a - b)
    .map(([version, list]) => ({ version, ids: list.sort() }))

  const CHECKED = 'Meanings, sentences and translations corrected by hand: src/content/curation.json'
  const sources = [...(deck.sources ?? []).filter((x) => x !== CHECKED), CHECKED]
  return { ...deck, sources, notes, resets }
}

async function main() {
  const deck = JSON.parse(await readFile(DECK, 'utf8'))
  const curation = JSON.parse(await readFile(CURATION, 'utf8'))
  const out = applyCuration(deck, curation)
  await writeFile(DECK, JSON.stringify(out, null, 1), 'utf8')
  const count = out.resets.reduce((sum, r) => sum + r.ids.length, 0)
  console.log(`curated: ${deck.notes.length} -> ${out.notes.length} notes, ${count} to relearn`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
