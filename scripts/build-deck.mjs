// ---------------------------------------------------------------------------
// Builds src/content/deck-core.json from three open datasets.
//
//   nl_50k.txt            frequency ranking       (OpenSubtitles via
//                                                  hermitdave/FrequencyWords)
//   wiktionary-nl.jsonl   grammar and glosses     (kaikki.org, CC-BY-SA 4.0)
//   nld.txt               example sentences       (Tatoeba, CC-BY 2.0 FR)
//
// Run:  node scripts/build-deck.mjs <data-dir>
//
// The raw data stays outside the repo; only the output lands in src/content.
// Re-running is safe: note ids are derived from the word and part of speech,
// so a rebuild never disturbs saved progress.
// ---------------------------------------------------------------------------

import { createReadStream } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import path from 'node:path'

const DATA = process.argv[2]
if (!DATA) {
  console.error('usage: node scripts/build-deck.mjs <data-dir>')
  process.exit(1)
}

const TARGET_NOTES = 2000
const FREQ_CUTOFF = 14000 // scan this deep; most entries get filtered out

// Part of speech we can build cards from. Wiktionary's names on the left.
const POS_MAP = {
  noun: 'noun',
  verb: 'verb',
  adj: 'adj',
  adv: 'adv',
  prep: 'prep',
  num: 'num',
  // Pronouns, conjunctions and interjections are deliberately excluded.
  // Wiktionary describes them grammatically rather than translating them
  // ("ik: first-person singular subjective personal pronoun"), which makes
  // hopeless flashcards. They are better written by hand.
}

/**
 * Glosses that describe a word grammatically instead of translating it, or
 * that belong to an obscure homograph. These are the main source of junk at
 * the frequent end of the list.
 */
const BAD_GLOSS = [
  /\b(first|second|third)-person\b/i,
  /\b(singular|plural) of\b/i,
  /\bform of\b/i,
  /\b(subjective|objective|possessive|reflexive|demonstrative)\b/i,
  /\bsurname\b/i,
  /\bgiven name\b/i,
  /\be\.g\.|\bi\.e\./i,
  /\bused (to|as|in|for|when)\b/i,
  /\bindicat(es|ing)\b/i,
  /\bexpress(es|ing)\b/i,
  /\bdenotes?\b/i,
  /\bparticle\b/i,
  /\babbreviation\b/i,
  /\bletter of the\b/i,
]

/**
 * Which part of speech wins when a word has several entries. Very frequent
 * words are almost always the grammatical one — "van" is the preposition
 * "of", not the noun "surname" — while further down the list the content word
 * is the one worth learning.
 */
const FUNCTION_FIRST = ['prep', 'adv', 'num', 'verb', 'noun', 'adj']
const CONTENT_FIRST = ['verb', 'num', 'noun', 'adj', 'adv', 'prep']
const FUNCTION_BAND = 500

function posPriority(pos, rank) {
  const order = rank <= FUNCTION_BAND ? FUNCTION_FIRST : CONTENT_FIRST
  const i = order.indexOf(pos)
  return i === -1 ? 99 : i
}

// Senses carrying these are not what a learner should be drilled on.
const BAD_SENSE_TAGS = new Set([
  'obsolete', 'archaic', 'dated', 'rare', 'dialectal', 'poetic', 'historical',
  'nonstandard', 'informal-obsolete', 'form-of', 'alt-of', 'misspelling',
  'vulgar', 'offensive', 'derogatory', 'slur', 'ethnic-slur',
])

// Articles are taught by the de/het card, not as vocabulary. Their English
// glosses are too ambiguous to make a usable flashcard.
const SKIP_WORDS = new Set([
  'de', 'het', 'een', "'t", "'n",
  // Verb stems that Wiktionary also lists as obscure nouns. A blanket rule
  // here would be wrong — huis, geld, werk, water, week, land and school are
  // all real nouns that happen to match a verb stem, because Dutch derives
  // verbs from nouns constantly. These are the ones where the noun sense is
  // genuinely marginal and the word is overwhelmingly a verb form.
  'weet', 'kan', 'wil', 'kom', 'zit', 'kijk', 'geef', 'praat', 'zult',
  'luister', 'goede', 'mis', 'dicht', 'wacht', 'zeg', 'doe', 'sta',
  'denk', 'neem', 'leef', 'lees', 'schrijf', 'help',
])

const norm = (s) => s.normalize('NFC').toLowerCase()

// --- 1. frequency ----------------------------------------------------------

async function loadFrequency() {
  const text = await readFile(path.join(DATA, 'nl_50k.txt'), 'utf8')
  const rank = new Map()
  let i = 0
  for (const line of text.split('\n')) {
    const word = line.split(' ')[0]
    if (!word) continue
    i++
    if (i > FREQ_CUTOFF) break
    if (!rank.has(word)) rank.set(word, i)
  }
  return rank
}

// --- 2. wiktionary ---------------------------------------------------------

function cleanGloss(gloss) {
  const g = gloss
    .replace(/\([^)]*\)/g, ' ') // parenthetical asides
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[;:.]$/, '')
  // Dictionaries pile up near-synonyms — "to lead, to take the lead" — and
  // keeping them turns a flashcard answer into a list. But commas also
  // separate modifiers sharing one head noun, as in "destructive,
  // uncontrolled fire", where taking the first part leaves "destructive" and
  // loses the meaning entirely. Only split when the parts are alternatives:
  // all verbs, or all single words.
  const parts = g.split(/[,;]/).map((x) => x.trim()).filter(Boolean)
  if (parts.length > 1) {
    const allVerbs = parts.every((x) => /^to /.test(x))
    const allSingleWords = parts.every((x) => !x.includes(' '))
    if (allVerbs || allSingleWords) return parts[0].length > 38 ? '' : parts[0]
  }
  return g.length > 44 ? '' : g
}

/** Two senses are only worth showing if they mean noticeably different things. */
function distinctSense(a, b) {
  const strip = (s) => s.replace(/^(to|a|an|the) /, '').toLowerCase()
  const x = strip(a)
  const y = strip(b)
  return !(x === y || x.startsWith(y) || y.startsWith(x))
}

function pickGlosses(entry) {
  const out = []
  for (const sense of entry.senses ?? []) {
    if (!sense.glosses?.length) continue
    if (sense.form_of || sense.alt_of) continue
    const tags = sense.tags ?? []
    if (tags.some((t) => BAD_SENSE_TAGS.has(t))) continue
    const g = cleanGloss(sense.glosses[0])
    // Two-letter glosses are almost always junk ("or" for goud, from heraldry).
    if (!g || g.length < 3) continue
    if (BAD_GLOSS.some((re) => re.test(g))) continue
    // A gloss identical to the Dutch word is kept on purpose. Dutch and
    // English share a lot of vocabulary — week, land, hotel, ring, test,
    // partner, camera — and knowing you can simply use the English word is
    // real knowledge. For nouns it also carries the de/het card, which is the
    // part you actually have to learn (het land, de week).
    if (out.some((existing) => !distinctSense(existing, g))) continue
    // A second sense earns its place only if it is short. Wiktionary's second
    // gloss for burgemeester is "one of two species of gull".
    if (out.length && g.length > 24) continue
    out.push(g)
    if (out.length === 2) break
  }
  return out
}

const formsWith = (entry, ...required) =>
  (entry.forms ?? []).filter((f) => {
    const t = f.tags ?? []
    return required.every((r) => t.includes(r)) && f.form && !f.form.includes('-')
  })

function tableTag(entry) {
  const t = (entry.forms ?? []).find((f) => (f.tags ?? []).includes('table-tags'))
  return t?.form ?? ''
}

function extractNoun(entry) {
  const genderTags = (entry.senses ?? []).flatMap((s) => s.tags ?? [])
  const neuter = genderTags.includes('neuter')
  const common = genderTags.some((t) => t === 'masculine' || t === 'feminine')
  if (!neuter && !common) return null // no gender data: not worth a noun card
  const plural = formsWith(entry, 'plural')[0]?.form
  return { gender: neuter ? 'het' : 'de', plural }
}

function extractVerb(entry) {
  const table = tableTag(entry)
  const participle = formsWith(entry, 'participle', 'past')[0]?.form
  if (!participle) return null
  const past =
    formsWith(entry, 'past', 'singular', 'first-person').find(
      (f) => !(f.tags ?? []).includes('subordinate-clause'),
    )?.form ?? formsWith(entry, 'past', 'singular')[0]?.form
  if (!past) return null
  return {
    separable: table.includes('separable') || undefined,
    past,
    participle,
    // The extract carries no hebben/zijn information, so we cannot honestly
    // fill this in. Imported verbs get no auxiliary card; hand-written ones
    // keep the auxiliary that was checked by hand.
    auxiliary: 'hebben',
    auxiliaryUnknown: true,
    irregular: table.includes('strong') || undefined,
  }
}

function extractAdj(entry) {
  return {
    comparative: formsWith(entry, 'comparative')[0]?.form,
    superlative: formsWith(entry, 'superlative')[0]?.form,
  }
}

async function loadWiktionary(rank) {
  const byKey = new Map()
  const inflections = new Set()

  const rl = createInterface({
    input: createReadStream(path.join(DATA, 'wiktionary-nl.jsonl'), 'utf8'),
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    if (!line) continue
    let entry
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }
    if (entry.lang_code !== 'nl') continue

    const pos = POS_MAP[entry.pos]
    const word = norm(entry.word ?? '')
    if (!pos || !word || SKIP_WORDS.has(word)) continue
    if (!/^[a-zàâäçéèêëîïôöùûüñ' ]+$/.test(word) || word.length < 2) continue
    if (!rank.has(word)) continue

    const glosses = pickGlosses(entry)
    if (!glosses.length) continue

    let extra = {}
    if (pos === 'noun') {
      const n = extractNoun(entry)
      if (!n) continue
      extra = n
      if (n.plural) inflections.add(norm(n.plural))
    } else if (pos === 'verb') {
      const v = extractVerb(entry)
      if (!v) continue
      extra = v
      inflections.add(norm(v.participle))
      inflections.add(norm(v.past))
    } else if (pos === 'adj') {
      extra = extractAdj(entry)
    }

    const wordRank = rank.get(word)
    // One note per word. Several parts of speech and several etymologies can
    // all claim the same spelling; take the one a learner actually needs and
    // among equals the first, since Wiktionary lists the main sense first.
    const existing = byKey.get(word)
    if (existing && posPriority(existing.pos, wordRank) <= posPriority(pos, wordRank)) continue
    byKey.set(word, { word, pos, glosses, extra, rank: wordRank })
  }

  return { byKey, inflections }
}

// --- 3. sentences ----------------------------------------------------------

const tokenize = (s) =>
  norm(s)
    .replace(/[^a-zàâäçéèêëîïôöùûüñ' ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

async function loadSentences(rank) {
  const raw = await readFile(path.join(DATA, 'nld.txt'), 'utf8')
  const byWord = new Map()

  for (const line of raw.split('\n')) {
    const [en, nl] = line.split('\t')
    if (!en || !nl) continue
    const words = tokenize(nl)
    if (words.length < 3 || words.length > 8) continue
    // Prefer sentences built from words the learner is likely to meet early:
    // score by the rarest word in the sentence.
    let hardest = 0
    for (const w of words) hardest = Math.max(hardest, rank.get(w) ?? 60000)
    const entry = { nl: nl.trim(), en: en.trim(), hardest, length: words.length }
    for (const w of new Set(words)) {
      const list = byWord.get(w)
      if (list) list.push(entry)
      else byWord.set(w, [entry])
    }
  }

  for (const [w, list] of byWord) {
    list.sort((a, b) => a.hardest - b.hardest || a.length - b.length)
    byWord.set(w, list.slice(0, 3))
  }
  return byWord
}

// --- 4. auxiliaries --------------------------------------------------------

/**
 * Motion verbs take zijn only when a destination is named — "ik heb gelopen"
 * but "ik ben naar huis gelopen". Too conditional to put on a flashcard, so
 * we never assert an auxiliary for these.
 */
const CONDITIONAL = new Set([
  'lopen', 'wandelen', 'rennen', 'fietsen', 'rijden', 'varen', 'vliegen',
  'zwemmen', 'springen', 'klimmen', 'kruipen', 'glijden', 'stappen', 'reizen',
  'zeilen', 'schaatsen', 'joggen', 'oversteken', 'volgen', 'passeren',
  'trekken', 'keren', 'verhuizen', 'weglopen', 'ophouden', 'stoppen',
  'veranderen', 'breken', 'herstellen', 'verbeteren', 'trouwen', 'scheiden',
])

/**
 * We only ever *assert* "zijn", never "hebben".
 *
 * The conjugation templates are precise about zijn — if one says zijn, it is
 * zijn — but their silence is not evidence of hebben: the template for
 * weglopen carries no auxiliary at all, though "hij is weggelopen" is the
 * normal form. So a verb we cannot confirm is marked unknown and simply never
 * claims an auxiliary, rather than claiming the more likely one and being
 * confidently wrong a few dozen times.
 */
async function loadAuxiliaries() {
  const { auxiliaries } = JSON.parse(await readFile('src/content/auxiliaries.json', 'utf8'))

  return function auxiliaryFor(verb) {
    if (CONDITIONAL.has(verb)) return { auxiliary: 'both', auxiliaryUnknown: true }
    const aux = auxiliaries[verb]
    if (aux === 'zijn') return { auxiliary: 'zijn' }
    return { auxiliary: aux === 'both' ? 'both' : 'hebben', auxiliaryUnknown: true }
  }
}

// --- 5. assemble -----------------------------------------------------------

const POS_SUFFIX = { noun: 'n', verb: 'v', adj: 'a', adv: 'adv', prep: 'p', num: 'num', phrase: 'x' }

function levelFor(rank) {
  if (rank <= 300) return 'A1'
  if (rank <= 900) return 'A2'
  if (rank <= 2000) return 'B1'
  return 'B2'
}

async function main() {
  console.log('reading frequency list…')
  const rank = await loadFrequency()

  console.log('reading Wiktionary (this takes a minute)…')
  const { byKey, inflections } = await loadWiktionary(rank)
  console.log(`  ${byKey.size} candidate entries`)

  console.log('reading sentences…')
  const sentences = await loadSentences(rank)
  const auxiliaryFor = await loadAuxiliaries()

  // Hand-written notes win: their grammar was checked by a human and they
  // carry auxiliary data the import cannot supply.
  const handWritten = []
  for (const file of ['deck-function.json', 'deck-a1.json']) {
    const deck = JSON.parse(await readFile(path.join('src/content', file), 'utf8'))
    handWritten.push(...deck.notes)
  }
  const takenWords = new Set(handWritten.map((n) => norm(n.nl)))

  for (const n of handWritten) {
    if (n.pos !== 'verb' || !n.verb || n.verb.auxiliaryUnknown) continue
    const fetched = auxiliaryFor(n.nl)
    if (fetched.auxiliary === 'zijn' && n.verb.auxiliary === 'hebben') {
      console.warn(`  ! hand-written "${n.nl}" says hebben, Wiktionary says zijn`)
    }
    if (!fetched.auxiliaryUnknown && fetched.auxiliary !== n.verb.auxiliary) {
      console.warn(`  ! hand-written "${n.nl}": ${n.verb.auxiliary} vs ${fetched.auxiliary}`)
    }
  }

  const notes = handWritten.map((n) => ({
    ...n,
    rank: rank.get(norm(n.nl)) ?? 9999,
    level: levelFor(rank.get(norm(n.nl)) ?? 9999),
  }))

  const candidates = [...byKey.values()].sort((a, b) => a.rank - b.rank)

  for (const c of candidates) {
    if (notes.length >= TARGET_NOTES) break
    // A hand-written note wins outright: if we wrote the word by hand, the
    // import must not add a second note for it under another part of speech.
    if (takenWords.has(c.word)) continue
    // Don't create a note for a word that is just an inflection of another
    // word: "gelopen" is the participle of "lopen", and "was", "weet" and
    // "kan" are verb forms that Wiktionary also happens to list as nouns.
    if (!takenWords.has(c.word) && inflections.has(c.word)) continue

    const { separable, past, participle, irregular, gender, plural, comparative, superlative } =
      c.extra

    const note = {
      id: `nl-${c.word.replace(/[^a-z]/g, '')}-${POS_SUFFIX[c.pos]}`,
      nl: c.word,
      en: c.glosses,
      pos: c.pos,
      level: levelFor(c.rank),
      rank: c.rank,
    }

    if (c.pos === 'noun') {
      note.gender = gender
      if (plural) {
        note.plural = plural
        // Regular plurals are predictable; only drill the surprising ones.
        note.irregularPlural =
          plural !== `${c.word}en` && plural !== `${c.word}s` && plural !== `${c.word}'s`
            ? true
            : undefined
      }
    } else if (c.pos === 'verb') {
      const aux = auxiliaryFor(c.word)
      note.verb = { separable, past, participle, irregular, ...aux }
    } else if (c.pos === 'adj') {
      if (comparative) note.comparative = comparative
      if (superlative) note.superlative = superlative
    }

    const found = sentences.get(c.word)
    if (found?.length) note.examples = found.slice(0, 1).map((s) => ({ nl: s.nl, en: s.en }))

    // Strip undefined so the JSON stays small and readable.
    for (const k of Object.keys(note)) if (note[k] === undefined) delete note[k]
    if (note.verb) for (const k of Object.keys(note.verb)) if (note.verb[k] === undefined) delete note.verb[k]

    notes.push(note)
    takenWords.add(c.word)
  }

  notes.sort((a, b) => (a.rank ?? 9e9) - (b.rank ?? 9e9))

  const deck = {
    id: 'core',
    name: 'Dutch core vocabulary',
    level: 'A1',
    sources: [
      'Frequency: hermitdave/FrequencyWords (OpenSubtitles), MIT',
      'Grammar and glosses: en.wiktionary.org via kaikki.org, CC-BY-SA 4.0',
      'Example sentences: tatoeba.org, CC-BY 2.0 (France)',
    ],
    notes,
  }

  await writeFile('src/content/deck-core.json', JSON.stringify(deck, null, 1), 'utf8')

  const counts = notes.reduce((acc, n) => ((acc[n.pos] = (acc[n.pos] ?? 0) + 1), acc), {})
  const withExample = notes.filter((n) => n.examples?.length).length
  console.log(`\nwrote ${notes.length} notes ->`, counts)
  console.log(`${withExample} have an example sentence`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
