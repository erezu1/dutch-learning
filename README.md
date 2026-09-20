# Nederlands

A small spaced-repetition app for learning Dutch. Personal use, two phones,
no server, no cost.

See [ROADMAP.md](ROADMAP.md) for the plan and the reasoning behind it.

## Run it

```bash
npm install
npm run dev
```

## How it's put together

The important thing about the layout is the seam between **logic** and
**presentation**, because the UI is going to be rewritten (Phase 3) and the
scheduling must not be disturbed when it is.

```
src/
  content/       the Dutch language data — plain JSON, shipped with the build
  core/          pure logic. No React, no DOM.
    types.ts       what we know about a word (the source of truth)
    cards.ts       one note -> several cards
    scheduler.ts   the only file that talks to ts-fsrs
    queue.ts       what to study now, and what's still locked
    db.ts          progress storage (IndexedDB) — never leaves the phone
    speech.ts      Dutch text-to-speech
  session/
    prompts.ts     card -> a Prompt: everything needed to ask a question,
                   with nothing about how it looks
    useSession.ts  all session state and behaviour, headless
  ui/            rendering only. Reads Prompts, calls session callbacks.
```

Rules that keep it that way:

- Nothing in `core/` or `session/` may import from `ui/`.
- The UI never imports `ts-fsrs` or Dexie directly.
- A new way to answer a question (swipe, typing, drag-to-order) is a new
  `PromptShape` plus a renderer — not a change to the scheduler.

## Data model in one paragraph

A **Note** is a dictionary entry: the Dutch word, its meaning, and its grammar
as *structured fields* (`gender`, `plural`, `verb.participle`, …). Every filled
field is a question we can ask, so one note generates several **Cards** —
nl→en, en→nl, de/het, plural, past participle. Card ids are derived from the
note id and never change, so editing content never disturbs saved progress.
Progress is a **CardState** per card plus an append-only **Review** log.

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

**We only ever assert "zijn", never "hebben."** The templates are precise
about zijn, but their silence is not evidence of hebben — the template for
*weglopen* carries no auxiliary although *hij is weggelopen* is the normal
form. So a verb we cannot confirm never claims an auxiliary at all. Motion
verbs (`CONDITIONAL` in the build script) take zijn only with a destination —
*ik heb gelopen* but *ik ben naar huis gelopen* — which is too conditional for
a flashcard, so they are never asserted either.

The build cross-checks the hand-written verbs against the fetched data and
warns on disagreement.

### Known limits of the imported data
- **First gloss wins.** A word with several senses shows the most prominent
  one. Occasionally that isn't the sense you'd meet first.
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
