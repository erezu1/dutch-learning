# Dutch Learning App — Roadmap

Personal spaced-repetition app for Dutch. Two users (me + partner), separate phones,
separate progress. Zero hosting cost. Anki's brain, Quizlet's approachability,
TikTok/Tinder's feel.

---

## 1. The big decision: don't fork AnkiDroid

Short version: **take the algorithm, not the codebase.**

Reasons to not fork [ankidroid/Anki-Android](https://github.com/ankidroid/Anki-Android):

| Issue | Detail |
|---|---|
| **Licence** | AnkiDroid is GPL-3.0, and the Rust backend it depends on (`rsdroid` / Anki core) is AGPL-3.0. A fork is a derivative work: your repo must stay GPL/AGPL. Fine for personal use, but it's a permanent constraint you'd inherit for no benefit. |
| **Size & age** | ~15 years of Java→Kotlin, hundreds of thousands of lines, a huge test suite, and a build that links a Rust backend. You'd spend weeks getting it to compile before changing one pixel. |
| **Architecture fights you** | AnkiDroid renders cards in a **WebView** running Anki's card-template engine (HTML/CSS/JS templates, `{{Front}}` syntax, note types). The "TikTok card deck" UI you want is not a theme change — it's replacing the entire presentation layer, which is the majority of the app. |
| **Distribution friction** | Android app = Android Studio, Gradle, keystore signing, and getting APKs onto two phones on every change. A web app is a `git push`. |
| **The valuable part is extractable** | The genuinely hard, genuinely good thing in Anki is the **scheduler**. It's already available standalone as an MIT-licensed TypeScript library. |

### What to actually take from Anki

1. **FSRS scheduling algorithm** → use [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) (MIT, pure TypeScript, from the same Open Spaced Repetition group that wrote the FSRS used inside modern Anki). This is a plain npm dependency — no fork, no licence contamination. It gives you difficulty/stability/retrievability modelling that is measurably better than the SM-2 algorithm Quizlet-likes use.

2. **The Note / Card / Review-log split** (copy the *idea*, write your own schema). Anki's best design decision, and the thing every Quizlet clone gets wrong:
   - A **Note** is one fact: `{ nl: "hond", en: "dog", gender: "de", plural: "honden" }`
   - **Cards** are generated *views* of that note: NL→EN, EN→NL, "de or het?", plural form
   - A **Review log** is append-only history, separate from card state
   
   Why it matters: you edit a typo once on the note and all four cards fix themselves; each direction gets its own independent scheduling; and your review history survives any future change to the scheduler.

3. **Deck import** (Phase 2, as a one-off offline script — not a runtime dependency). `.apkg` files are zip archives containing a SQLite collection. Parsing one lets you bootstrap from the existing free Dutch decks on AnkiWeb instead of typing 1000 words by hand.

4. **Queue behaviour**: daily new-card limit, review-cards-first ordering, "learning steps" for brand-new cards. Copy the *behaviour*; it's roughly 150 lines of your own code.

**Do not take:** the sync protocol, card-template HTML engine, note-type editor UI, statistics screens, add-on system, filtered decks. All of it is complexity you don't need for two people.

---

## 2. Platform: installable PWA, hosted on GitHub Pages

| | PWA (recommended) | Native Android |
|---|---|---|
| Cost | €0 — GitHub Pages | €0 to build, but Play Store is a one-off $25 (avoidable by sideloading) |
| Deploy to both phones | `git push` → live in ~60s | Rebuild APK, transfer, install, every time |
| Offline | Yes — service worker + IndexedDB | Yes |
| Home-screen icon, fullscreen | Yes (installed PWA) | Yes |
| Dutch text-to-speech | Yes — Web Speech API, on-device, free | Yes |
| Swipe gestures, haptics | Yes | Yes |
| **Scheduled local notifications** | **No** (the one real gap) | Yes |
| Dev loop | Instant hot reload in a desktop browser | Emulator / device, slow |

**Verdict: PWA.** The only genuine loss is "remind me at 20:00 to study", and there's a clean escape hatch below.

### The escape hatch (keep this in your back pocket)

If daily reminders or a home-screen widget turn out to matter, wrap the *same* PWA codebase in [Capacitor](https://capacitorjs.com/) → produces a real APK with native local notifications → have GitHub Actions build it and attach it to a GitHub Release → install on both phones. Still €0, still one codebase, and it's a Phase-5 decision, not a Phase-0 one. **Deciding PWA now does not lock you out of Android later.**

---

## 3. Data & storage model

Split by what changes and who owns it:

- **Content (decks)** → JSON files committed in the repo, bundled into the build.
  - Version-controlled, diffable, editable in your editor or by a script.
  - Both phones get identical content automatically on deploy.
- **Progress (card states + review log)** → IndexedDB on each phone, via [Dexie](https://dexie.org/).
  - You and your partner each have your own progress and never collide. **No sync server needed** — this is the single biggest simplification available to you, and it falls directly out of "personal use only".
- **Backup** → an "Export progress" button writing a JSON file (to Dropbox/Drive), plus import. Ten lines of code, saves you from the one real risk: browser storage eviction.
  - Installed PWAs on Android normally get persistent storage — call `navigator.storage.persist()` at startup — but back up anyway.

Only if you later want your phone and laptop in sync: add a free tier of Cloudflare D1, Supabase, or a private GitHub repo as a JSON store. **Explicitly out of scope until Phase 4** — sync is where hobby projects go to die.

---

## 4. Stack

```
Vite + React + TypeScript      # fast dev loop, deploys as static files
Tailwind CSS                   # styling
ts-fsrs                        # scheduling (MIT)
Dexie                          # IndexedDB wrapper
framer-motion                  # swipe/drag gestures and card transitions
vite-plugin-pwa                # service worker, manifest, offline
GitHub Actions → GitHub Pages  # deploy on push to main
```

**On Material Design:** use M3 *design tokens* (the colour roles, elevation, type scale, motion curves) as Tailwind theme values rather than pulling in MUI. MUI is heavy and makes everything look like MUI — which fights the TikTok/Tinder direction. Tokens give you the M3 feel with total control over the card UI.

---

## 5. What makes this *Dutch*, not a generic flashcard app

This is where the app earns its existence versus just using Anki. Build these in as **first-class card types**, not free-text cards:

- **de / het** — the single biggest recurring pain in Dutch. Gender as a structured field on the note, and its own drill mode.
- **Irregular plurals** — `-en` vs `-s`, vowel lengthening (`schip → schepen`).
- **Separable verbs** — `opbellen` → `ik bel je op`. Needs a sentence card, not a word card.
- **Past tense + auxiliary** — `gewerkt`, and whether it takes *hebben* or *zijn*.
- **Word order / V2 inversion** — drag-the-words-into-order card type. Nothing else teaches this well.
- **Audio** — Web Speech API with an `nl-NL` voice: on-device, free, no audio files to host. **Test this on your actual Android phone in Phase 0** — voice availability is the one thing that varies by device, and it's better to learn that on day one.

---

## 6. Phases

### Phase 0 — Prove the pipe ✅ done
- `git init`, push to a new GitHub repo, scaffold Vite+React+TS
- GitHub Actions workflow → Pages
- Add the PWA manifest and **install it on both phones before writing any real code**
- Ship a page that just says "Hallo" and speaks one Dutch word aloud

*Goal: validate the entire delivery path — build, deploy, install, offline, TTS — while there is nothing to debug. This is deliberately the first phase.*

### Phase 1 — The core loop ✅ done, with one item never built
- Note/Card/ReviewLog schema in Dexie ✅
- `ts-fsrs` wired to card state; daily queue with new/review limits ✅
- ~100 hand-picked words as a JSON deck ✅ *(now 2000 — see Phase 2)*
- One review screen: show prompt → reveal → grade ✅ *(two buttons, not four:
  a finer judgement on every card invites dishonest grading)*
- **Export/import progress button — ❌ never built.** See Phase 4; this is the
  only thing on the whole roadmap whose absence can lose data.

*Goal: start actually studying daily. Everything after this is improvement on a working thing.*

### Phase 2 — Content ✅ done
- Import script for `.apkg` or CSV/frequency lists → your JSON format
- **Add a frequency rank per word.** We track how hard a word is *for you*
  (FSRS difficulty + lapses), but nothing about how common or hard it is in
  general, so new words currently arrive in the order they were typed rather
  than most-useful-first. A frequency list fixes that and is the main reason
  to do the import properly.
- Auto-generate cards from notes (one note → 2–4 cards)
- Grow to 1000+ words with gender and plural filled in
- Deck/level organisation (A1, A2, …, thematic)
- Level is chosen in the app and sets where new words *start* in the frequency
  list. It used to be a filter, which meant starting at Confident put a
  permanent hole where the fifteen hundred commonest words should be; it now
  defers rather than excludes, so the deck works forward from your starting
  point and comes back afterwards for whatever the head start skipped.
  Progression needs no button as a result: the chip on the home screen shows
  the level you have *reached*, from the words you actually know, and it moves
  on its own.

**Gap-fill is built** — 1827 of the 2000 words generate one, using the word's
own example sentence with the word blanked out. The card belongs to that word,
so it is scheduled alongside its other cards and unlocks once the word is
known.

**Still outstanding:** the word-order card. It needs sentences split into
meaningful chunks rather than single words, and it has to accept several
correct orders — *Morgen ga ik naar de stad* and *Ik ga morgen naar de stad*
are both right — so it cannot simply compare against one stored answer.

### Phase 3 — The UI pass (most of it done; the gestures are not)

**Done:**
- Elevation scale, motion vocabulary, name, mark and icon
- Seven colour schemes, each with a dark mode, plus light/dark/system
- Typography: three roles, one rule *(see README)*
- Daily goal ring, points, and a "that's today" screen
- A ground that moves — two slow lights, masked at the edges of the screen
- Settings: auto-continue, appearance, start over

**Done but never on this list**, because they came from using the thing:
points instead of card counts, the score burst, undo, "another round?", the
day's intake actually being daily, the reset, and the week strip under the
button — seven dots and a line about them, which is the streak this list
asked for without the thing a streak does when you break it.

**Not started — and this is the part that motivated the project:**
- Full-bleed vertical cards, one per screen, TikTok-style
- **Swipe to grade**: left = Again, right = Good — Tinder mechanics on the
  two ratings the app actually uses
- Haptics

Dark mode is a *mode* rather than a scheme, which is better than the "M3 dark
theme as the default" this list originally asked for: you keep your colour.

### Phase 4 — Durability ← **the next thing to build**
- **Export / import progress.** Everything lives in one browser's IndexedDB on
  one phone. `navigator.storage.persist()` is asked for, and it makes eviction
  unlikely rather than impossible — a phone that dies, a browser reinstall, or
  a mis-tapped "Start over" takes the lot. The review log is append-only and
  small (~100 bytes an answer), so a whole history is a file you can mail to
  yourself. This is the one gap that can lose something that can't be rebuilt.
- Automatic periodic backup export
- Undo last review ✅ done
- Optional real sync, only if you find you actually want it

### Phase 5 — Extras, by whatever you're missing most
- Typing mode (spelling matters a lot in Dutch)
- Cloze sentences from real Dutch text
- Capacitor APK for daily reminder notifications
- Leech detection (cards you keep failing) and a "hard words" session
- **Speaking practice.** Considered Whisper for this. Two problems: running it
  in the browser means a 40–150 MB model download and slow on-device inference,
  which breaks the lightweight-PWA story; and Whisper is built to transcribe
  *robustly*, correcting for accents on purpose, so it will happily write
  "hond" when you mispronounced it — a weak judge of pronunciation quality.
  The browser's own `SpeechRecognition` API is free and needs no download but
  has the same leniency problem. The honest cheap version: record yourself,
  play it back next to the TTS, judge it by ear.

---

---

## 6b. Where it actually stands

| | state |
|---|---|
| Delivery: build → Pages → installed, offline | working |
| Scheduler, queue, daily budget | working |
| 2000 words, frequency-ranked | working |
| Card types | 7 of 8 — word order missing |
| UI | built, minus the gestures |
| **Backup** | **none** |
| Dutch audio | code works; needs a voice installed on the phone |

Card types built: recognise, recall, de/het, plural, past participle,
hebben/zijn, gap-fill. The deck carries gender on 1209 words, an irregular
plural on 397, verb forms on 261, and an example sentence on 1869.

**The three things worth doing next, in this order:**

1. **Export / import.** Phase 4. Nothing else on the list can lose data.
2. **Swipe to grade.** Phase 3, and the reason the project exists — the app is
   currently a very polished set of buttons.
3. **Word order.** The Phase 2 leftover, and the most Dutch thing still
   unbuilt. (Level progression is done — it happens by itself now.)

One non-code item: the Dutch voice. The app no longer reports its absence on
the home screen — Settings says what to do about it instead (Settings → System
→ Languages & input → Text-to-speech → install Nederlands). Until that is
installed every speaker button is silent, which is a real hole in a language
app and costs nothing to close.

---

## 7. Open questions

1. **Your current level** — absolute beginner, or already at A2/B1? Changes whether Phase 2 starts from a frequency list or from thematic/grammar decks.
2. **Scope of skills** — vocabulary + grammar only, or do you want listening and speaking practice too?
3. **Existing material** — do you already have Anki decks, a school word list, or Duolingo/Babbel vocab you want imported? If yes, that becomes Phase 2's input and may be worth doing earlier.
4. **Same content for both of you, or separate?** Assumed same content, separate progress — simplest, and almost certainly right.
