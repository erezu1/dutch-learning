// ---------------------------------------------------------------------------
// Applies the hand-made layers on top of src/content/deck-core.json:
//
//   deck-everyday.json   words the import never had
//   curation.json        corrections to the words it did have
//   course.json          the order they are taught in
//
// The import picks each word's first surviving Wiktionary sense and a Tatoeba
// sentence that merely contains the word, which is right often enough to look
// trustworthy and wrong often enough to teach nonsense: "op" came out as
// "after · bar", "te" as "located at". curation.json is the hand-checked
// correction for every note that needed one — its meaning, its part of speech,
// a sentence that uses it in that meaning, and a translation of that sentence.
//
// And the import ranks words by how often they are said in film subtitles,
// which is how "sheriff" came before "maandag" and "boterham" never came at
// all. deck-everyday.json adds what a person living in the Netherlands needs
// and the subtitles don't say; course.json pulls the everyday words forward
// and pushes the film vocabulary back.
//
// Run:  node scripts/apply-curation.mjs
//
// build-deck.mjs calls this at the end, so a rebuild keeps all of it. Applying
// twice changes nothing the second time.
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
const EVERYDAY = 'src/content/deck-everyday.json'
const COURSE = 'src/content/course.json'

/** Where each level starts in the course. build-deck.mjs uses the same. */
export function levelFor(rank) {
  if (rank <= 300) return 'A1'
  if (rank <= 900) return 'A2'
  if (rank <= 2000) return 'B1'
  return 'B2'
}

/**
 * A plural anyone could have guessed from the singular, which is not worth a
 * card: -en, -s, -'s, an -e that takes -n (ziekte, ziekten), and a stressed
 * -ie or -ee that takes -ën (idee, ideeën). Spelling changes — a vowel that
 * halves or a consonant that doubles, kraan kranen, bus bussen — do count as
 * surprising: they are the plurals people actually get wrong.
 */
function regularPlural(word, plural) {
  const w = word.toLowerCase()
  const p = plural.toLowerCase()
  return (
    p === `${w}en` ||
    p === `${w}s` ||
    p === `${w}'s` ||
    (w.endsWith('e') && p === `${w}n`) ||
    ((w.endsWith('ie') || w.endsWith('ee')) && p === `${w}ën`)
  )
}

/**
 * Hand-written notes for words the import doesn't have. One with an id the
 * import also produced replaces it, since it was checked; it keeps the
 * imported one's place in the subtitle list.
 */
function addEveryday(notes, everyday) {
  const out = [...notes]
  const at = new Map(notes.map((n, i) => [n.id, i]))
  for (const n of everyday) {
    const i = at.get(n.id)
    if (i === undefined) out.push(n)
    else out[i] = { ...n, freq: notes[i].freq ?? notes[i].rank }
  }
  return out
}

function correct(note, c) {
  const n = structuredClone(note)
  if (c.nl) n.nl = c.nl
  if (c.pos) n.pos = c.pos
  if (c.en) n.en = c.en
  if (c.examples) n.examples = c.examples
  if (c.noCloze) n.noCloze = true
  // A note turned into its lemma can be far commoner than the form it was
  // counted under: "boy" is an English word in Dutch subtitles, "jongen" is
  // one of the first nouns anyone learns.
  if (c.rank) n.freq = c.rank
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
  if (n.verb && !n.verb.auxiliary) {
    n.verb.auxiliary = 'hebben'
    n.verb.auxiliaryUnknown = true
  }
  if (!n.examples?.length) delete n.examples
  return n
}

/**
 * The teaching order. Every note keeps its subtitle rank as `freq` (set the
 * first time through), and `rank` becomes its place in the course: 1, 2, 3 …
 * with no gaps, so "a few hundred words in" means the same thing to the level
 * picker as it does to the person picking.
 *
 * Each group in `first` is spread evenly over the first stretch of the course
 * and each group in `soon` over the next, so a day's new words are a mix of
 * themes rather than all of the fruit at once. A word the subtitles already
 * put earlier stays where it was. `last` goes after everything.
 */
const FIRST_END = 350
const SOON_END = 1000

function order(notes, course) {
  for (const n of notes) n.freq = n.freq ?? n.rank ?? 99999
  const bySubtitles = [...notes].sort((a, b) => a.freq - b.freq)
  const place = new Map(bySubtitles.map((n, i) => [n, i + 1]))

  const target = new Map()
  const spread = (groups, start, end) => {
    for (const group of groups) {
      group.forEach((word, i) => {
        const t = start + ((i + 0.5) / group.length) * (end - start)
        const w = word.toLowerCase()
        if (!target.has(w) || target.get(w) > t) target.set(w, t)
      })
    }
  }
  spread(course.first ?? [], 0, FIRST_END)
  spread(course.soon ?? [], FIRST_END, SOON_END)
  const last = new Set((course.last ?? []).map((w) => w.toLowerCase()))

  const keyOf = (n) => {
    const at = place.get(n)
    const w = n.nl.toLowerCase()
    if (last.has(w)) return at + notes.length
    return Math.min(at, target.get(w) ?? Infinity)
  }
  const keys = new Map(notes.map((n) => [n, keyOf(n)]))
  const sorted = [...notes].sort((a, b) => keys.get(a) - keys.get(b) || a.freq - b.freq)
  sorted.forEach((n, i) => {
    n.rank = i + 1
    n.level = levelFor(n.rank)
  })

  const known = new Set(notes.map((n) => n.nl.toLowerCase()))
  const absent = [...target.keys(), ...last].filter((w) => !known.has(w))
  if (absent.length) console.warn(`  ! in course.json but not in the deck: ${absent.join(', ')}`)
  return sorted
}

/** One key order for every note, so that applying twice writes the same bytes. */
const KEYS = ['id', 'nl', 'en', 'pos', 'level', 'rank', 'freq', 'tags', 'gender', 'plural',
  'irregularPlural', 'verb', 'comparative', 'superlative', 'noCloze', 'examples']
function tidy(n) {
  const out = {}
  for (const k of KEYS) if (n[k] !== undefined) out[k] = n[k]
  for (const k of Object.keys(n)) if (!(k in out) && n[k] !== undefined) out[k] = n[k]
  return out
}

export function applyCuration(deck, curation, { everyday = [], course = {} } = {}) {
  const all = addEveryday(deck.notes, everyday)

  const ids = new Set(all.map((n) => n.id))
  for (const id of Object.keys(curation.notes)) {
    // A dropped note is already gone the second time round.
    if (!ids.has(id) && !curation.notes[id].drop) console.warn(`  ! curation for unknown note ${id}`)
  }

  const notes = []
  for (const note of all) {
    const c = curation.notes[note.id]
    if (c?.drop) continue
    const n = c ? correct(note, c) : structuredClone(note)
    if (n.pos === 'noun' && n.plural) {
      if (regularPlural(n.nl, n.plural)) delete n.irregularPlural
      else n.irregularPlural = true
    }
    notes.push(n)
  }

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
  const CHOSEN = 'Everyday words and teaching order chosen by hand: deck-everyday.json, course.json'
  const sources = [...(deck.sources ?? []).filter((x) => x !== CHECKED && x !== CHOSEN), CHECKED, CHOSEN]
  return { ...deck, sources, notes: order(notes, course).map(tidy), resets }
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (e) {
    if (e.code === 'ENOENT') return fallback
    throw e
  }
}

/** Everything applyCuration needs besides the deck, read from src/content. */
export async function loadLayers() {
  return {
    curation: await readJson(CURATION, { notes: {} }),
    everyday: (await readJson(EVERYDAY, { notes: [] })).notes,
    course: await readJson(COURSE, {}),
  }
}

async function main() {
  const deck = JSON.parse(await readFile(DECK, 'utf8'))
  const { curation, everyday, course } = await loadLayers()
  const out = applyCuration(deck, curation, { everyday, course })
  await writeFile(DECK, JSON.stringify(out, null, 1), 'utf8')
  const count = out.resets.reduce((sum, r) => sum + r.ids.length, 0)
  console.log(`curated: ${deck.notes.length} -> ${out.notes.length} notes, ${count} to relearn`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
