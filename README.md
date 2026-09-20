# Doei

A small spaced-repetition app for learning Dutch. Personal use, two phones,
no server, no cost.

The interface is light and warm, and the design tokens in `src/index.css` are
where almost all of its appearance lives. Colour schemes are blocks of the
same tokens selected by `data-theme` on `<html>` — no component knows which
one is active.

**Three type roles, defined in `src/ui/type.ts`.**

| role | used for |
|---|---|
| `FOCUS` (serif) | the thing being taught right now: the word being asked about, the answer once revealed, the Dutch example sentence |
| `TITLE` (sans, bold, tight) | the app's name and screen headings |
| default (sans) | everything else: instructions, parts of speech, options, translations, buttons |

The serif marks **what you are meant to be looking at**, not what language it
is in. That is why the options are set in the sans even on a recall card where
they are Dutch words — they are choices, not the subject — and why an English
answer is set in the serif once revealed.

If you are adding text, take its role from `type.ts` rather than writing
`font-display` again. The rule was spread across four conditionals once and had
already drifted without anyone noticing.

## Content

`src/content/deck-core.json` is what the app ships — **2000 words ordered by
how common they are in Dutch**. It is generated, so don't edit it by hand.

It is built from two hand-written decks plus three open datasets:

| Input | Role |
|---|---|
| `src/content/deck-function.json` | 91 function words, hand-written |
| `src/content/deck-a1.json` | 131 everyday words, hand-written |
| OpenSubtitles frequency list | the order words are introduced in |
| Wiktionary via kaikki.org | gender, plurals, past tenses, participles |
| Tatoeba | example sentences |

Hand-written notes always win: where a word exists in both, the checked
version is kept and the import is skipped for that word entirely.

To rebuild (the raw data is ~254 MB and lives outside the repo):

```bash
node scripts/build-deck.mjs <data-dir>
```

### Why two decks are written by hand

The automated import is good at content words and bad at grammar words.
Dictionaries describe *ik* as "first-person singular subjective personal
pronoun" rather than translating it as "I", and list obscure homographs that
outrank the real sense — Wiktionary's primary gloss for *mijn* is "shaft dug
by an insect larva". Those ~90 words are the most frequent in the language, so
they are written and checked by hand instead.

### hebben or zijn

`scripts/fetch-auxiliaries.mjs` fetches this from English Wiktionary's
`{{nl-conj-*}}` conjugation templates, which carry `aux=zijn` and
`trans=unacc` even though the kaikki extract drops them. It asks only for the
verbs in the deck, so it is a few hundred API calls rather than a bulk
download.

Wiktionary marks zijn explicitly but leaves hebben blank, so its silence is
not evidence — the template for *weglopen* carries no auxiliary although *hij
is weggelopen* is the normal form. A second source fixes that: the build
counts, across the 85,000 sentence corpus, how often each participle appears
with a form of *zijn* versus a form of *hebben*.

Validated against verbs whose auxiliary is known, the two separate cleanly:
zijn verbs score 1.00, hebben verbs 0.00–0.21. The stray zijn-votes on hebben
verbs are passives (*het is gemaakt*), which is why the thresholds leave a wide
gap rather than splitting at half: ≥0.85 means zijn, ≤0.25 means hebben, and
anything between is left unclaimed.

**An auxiliary is asserted only where a source positively supports it.** Where
neither source is decisive the card shows the participle alone rather than
guessing. Motion verbs (`CONDITIONAL` in the build script) take zijn only with
a destination — *ik heb gelopen* but *ik ben naar huis gelopen* — so they are
never asserted either.

The build cross-checks the hand-written verbs against the fetched data and
warns on disagreement.

### Known limits of the imported data
- **First gloss wins.** A word with several senses shows the most prominent
  one. Occasionally that isn't the sense you'd meet first.
- **A gloss identical to the Dutch word is kept.** Dutch and English share a
  lot of vocabulary — week, land, hotel, ring, test, partner, camera. Filtering
  those out removed 137 real words. For nouns the identical gloss also carries
  the de/het card, which is the part you actually have to learn.
- **Glosses are one term per sense.** Dictionaries pile up near-synonyms
  ("to lead, to take the lead, to guide"), which turns a flashcard answer into
  a list. Commas are only split on when the parts are alternatives — all verbs
  or all single words — because they also separate modifiers sharing one head
  noun, as in *brand*: "destructive, catastrophic fire", where taking the
  first part would leave "destructive" and lose the meaning.
- **`SKIP_WORDS` in the build script** lists verb stems whose noun sense is
  marginal (*weet*, *kom*, *kijk*). This can't be a blanket rule: *huis*,
  *geld*, *werk*, *water* and *school* are all real nouns that happen to match
  a verb stem, because Dutch derives verbs from nouns constantly.

### Attribution

Word data from [Wiktionary](https://en.wiktionary.org) via
[kaikki.org](https://kaikki.org) (CC BY-SA 4.0), example sentences from
[Tatoeba](https://tatoeba.org) (CC BY 2.0 FR), frequency ordering from
[hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords).

## Deploying

Pushing to `main` builds and publishes to GitHub Pages. The workflow sets
`VITE_BASE` so the app works from the `/<repo>/` sub-path.
