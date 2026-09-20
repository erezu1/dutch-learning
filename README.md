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

`src/content/deck-a1.json` — 131 A1 words. Add words by appending notes; give
each one a permanent `id` and never change it afterwards.

## Deploying

Pushing to `main` builds and publishes to GitHub Pages. The workflow sets
`VITE_BASE` so the app works from the `/<repo>/` sub-path.
