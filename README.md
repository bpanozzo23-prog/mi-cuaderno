# Mi cuaderno

A personal Spanish notebook built around a bundled offline dictionary — a phone-first,
installable web app (PWA). Private tool for one person; the code is public, the data never is.

- **Brief:** [docs/mi-cuaderno-project-brief-v3.md](docs/mi-cuaderno-project-brief-v3.md) (the contract for this build)
- **Prototype (historical):** [docs/mi-cuaderno.jsx](docs/mi-cuaderno.jsx) (pre-build look-and-feel reference; the real app now supersedes it)
- **Decision log:** [DECISIONS.md](DECISIONS.md)
- **Improvement ideas:** [docs/IMPROVEMENT-IDEAS.md](docs/IMPROVEMENT-IDEAS.md) (captured
  possibilities, not an approved roadmap)
- **Agent workflow:** [docs/AGENT-GUIDE.md](docs/AGENT-GUIDE.md) (shared by Claude Code and Codex)

## Status

**Live at <https://bpanozzo23-prog.github.io/mi-cuaderno/>** — installable from Chrome on Android.

- **Phase 0 — done.** Installable PWA shell, auto-deployed on every push to `main`.
- **Phase 0.5 — done, reviewed.** Data pipeline proven end to end on all four sources;
  see [docs/PHASE-0.5-SPIKE-REPORT.md](docs/PHASE-0.5-SPIKE-REPORT.md) and the 20 generated records in
  [pipeline/spike/out/07-review-records.md](pipeline/spike/out/07-review-records.md).
- **Phase 1 — done.** The notebook itself, in four subphases: data foundation and backup (1a),
  words, phrases and pages (1b), search and linking (1c), tracking and Repaso (1d).
- **Phase 2 — done.** The bundled dictionary: 10,278 lemmas with conjugations and examples,
  installed offline in one explicit download, and two-layer search where an inflected form
  finds its lemma. See [docs/PHASE-2-REPORT.md](docs/PHASE-2-REPORT.md).
- **Phase 3 — done.** The Leitner review queue, derived entirely from the event log.
  See [docs/PHASE-3-REPORT.md](docs/PHASE-3-REPORT.md).
- **Phase 4 — ongoing maintenance.** Live-use polish driven only by friction observed in daily use.
  The linking package (4a–4e) and first friction batch (4f–4h) shipped. Structured personal
  meanings (4i) are shipped and browser-verified. Persistent page profiles and the first
  specialized profile, Vocabulary Collection (4j–4o), are shipped and production-verified after
  the complete serial suite plus disposable local and production 375×812 browser flows. The
  migration-free Diario workspace (4p–4s) is shipped after the complete serial suite, a disposable
  local 375×812 closeout, and a successful GitHub Pages deployment check. Typed and explained
  ordinary Connections (4t–4x) are shipped on schema v4 after the complete serial suite, production
  build, and a successful GitHub Pages deployment check; the disposable 375×812 browser closeout
  remains pending because the local browser-control kernel could not initialize. Lexical-side
  **Add to Collection** (4y) is shipped without a schema change after the 501-test serial suite,
  production build, and a successful GitHub Pages deployment check; its disposable phone check is
  pending for the same browser limitation. The dedicated **Pages hub** (4z) is deployed from `main`
  on schema v5 after the 596-test serial suite, production build, and a disposable 375×812 browser
  closeout and a successful GitHub Pages deployment check. Source and Grammar were deferred from this maintenance
  stream and are now shipped as Phase 7; richer stored Journal profiles,
  user-authored templates, and exact term/title link suggestions remain deferred. See
  [docs/PHASE-4-JOURNAL-DIRECTION.md](docs/PHASE-4-JOURNAL-DIRECTION.md) and
  [docs/PHASE-4-REPORT.md](docs/PHASE-4-REPORT.md).
- **Phase 5 — done.** Organizational improvements that do not require real notebook data:
  navigation continuity (5a), organizational derivations (5b), Cuaderno retrieval controls (5c),
  activity navigation (5d), scan-first detail pages (5e), and duplicate guardrails (5f).
  Its planned work is kept separate from Phase 4's friction-only maintenance stream. See
  [docs/PHASE-5-DIRECTION.md](docs/PHASE-5-DIRECTION.md) and
  [docs/PHASE-5-REPORT.md](docs/PHASE-5-REPORT.md).
- **Phase 6 — first slice implemented locally; not deployed.** The AI assistant (brief §9), opened
  with one narrow feature rather than an app-wide assistant: a user-initiated review of a single
  Diario entry, judging whether it is understandable and where it is correct but unnatural. Off by
  default, enabled in Ajustes behind an acknowledged Anthropic spend cap, using the owner's own key
  stored on-device and never exported. The review is session-only — nothing is stored, no event is
  logged, and it disappears when you leave the entry. §9's assistant Q&A over the notebook and its
  approved proposed entries remain unbuilt. See the Phase 6 entries in
  [DECISIONS.md](DECISIONS.md).
- **Phase 7 — shipped.** Schema v5 replaces the
  exclusive General/Collection profile with composable Notes, Vocabulary, Source, and Grammar
  behavior while retaining only lexical items and pages. The implementation includes sequential
  legacy migration and backup validation, one unified page workspace, family-first creation,
  Source captures, Grammar guides with exact Source references, and contextual retrieval. The full
  serial suite passes 593/593 tests across 58 files, the Vite production build passes, and
  `git diff --check` passes. The disposable 375×812 browser closeout remains unverified because the
  in-app browser could not bootstrap. The GitHub Pages deployment from `main` completed
  successfully; the phone browser closeout remains explicitly unverified. See
  [docs/PHASE-7-DIRECTION.md](docs/PHASE-7-DIRECTION.md) and
  [docs/PHASE-7-REPORT.md](docs/PHASE-7-REPORT.md).
- **Phase 8 — shipped.** A dedicated **Words & phrases hub**, the lexical
  twin of the Pages hub: one hub for both forms, reached by the `palabras` and `frases` chips that
  now open it rather than filtering in place. It browses by where a word lives (Collection, Source,
  Grammar guide, or no page yet), a read-only learning signal, the completeness views, and an A–Z
  index with pinned vocabulary. Hub search covers personal vocabulary only and hands a miss to
  Cuaderno's mixed list, which is still the one place a search spans both layers. No schema change:
  `SCHEMA_VERSION` stays 5 and the new `pinnedLexicalIds` preference rides the existing generic
  backup path. The Pages hub also stops logging search misses, so the Cuaderno root is now the only
  surface that records one. The full serial suite passes 649/649 across 61 files, the production
  build and `git diff --check` pass, and four deliberate red/green proofs behaved as intended. The 375×812
  closeout passed on a disposable local origin by driving real DOM events and measuring layout
  numerically; **no visual screenshot was captured**, because the in-app browser pane does not
  composite frames. See [docs/PHASE-8-DIRECTION.md](docs/PHASE-8-DIRECTION.md) and
  [docs/PHASE-8-REPORT.md](docs/PHASE-8-REPORT.md).
- **Phase 9 — shipped.** The Words & phrases hub can turn its current
  filters or search into an anytime Spanish-first flashcard deck. A transient preflight chooses
  10, 20 or All cards and shuffled or current hub order; entries without meanings are excluded and
  explained. Again/Got it feedback and missed-only rounds stay in memory and never change Repaso's
  event-backed Leitner schedule. No schema, preference, backup or event change: `SCHEMA_VERSION`
  remains 5. The full serial suite passes 662/662 across 64 files, the production build and diff
  check pass, the missing-meaning red/green proof behaved as intended, and a disposable
  375×812 visual browser flow passed without overflow, warnings or errors. See
  [docs/PHASE-9-DIRECTION.md](docs/PHASE-9-DIRECTION.md) and
  [docs/PHASE-9-REPORT.md](docs/PHASE-9-REPORT.md).
- **Phase 10 — implemented locally; not deployed.** Learning depth in Repaso, built only from
  data the notebook already holds: **session direction** (10a — es→en, en→es or mixed, chosen
  per session and fixed per card, with reverse withholding the term and its Spanish usage cue),
  **cloze cards** (10b — the word blanked out of one of its own example sentences, matching
  conjugated forms through the dictionary's tables, preferring the owner's sentences over stock
  ones), an **ungraded conjugation drill** (10c — six everyday tenses over the shipped paradigms,
  writing no events at all), and **pronunciation** through the browser's own voices (10d — zero
  storage, nothing sent, hidden entirely where the device has no Spanish voice). No schema,
  preference, backup or event-type change: `SCHEMA_VERSION` remains 5, and review events gain
  only additive `direction`/`face` metadata beside the existing grade. Distinct from Phase 9's
  hub deck, which is an anytime deck over hub filters; this is the scheduled Leitner queue. The
  full serial suite passes 762/762 across 71 files, the production build passes, four deliberate
  red/green proofs behaved as intended, and a disposable 375×812 browser closeout drove all
  three session directions and the drill. See the Phase 10 entries in [DECISIONS.md](DECISIONS.md).

- **Phase 11 — implemented locally; not deployed.** Owner-centric stats, spending data the
  notebook already keeps rather than recording anything new: a **study streak** and a 16-week
  **activity calendar** from each event's `localDate`, a cumulative **growth line** from lexical
  items' `createdAt`, the **Leitner ladder** as boxes 1–5 plus Retired, and a **per-item strip**
  on every lexical entry giving its added date, box or retired status, last review and next due
  date. The streak tile and ladder sit on Repaso; the calendar and growth line sit behind an
  Estadísticas sub-view, swapped in the way a review session already is. No schema, event-type,
  metadata, preference or backup change: `SCHEMA_VERSION` remains 5, and every number is derived
  at render, so deleting these screens would lose no data. Two owner decisions are recorded in
  [docs/PHASE-11-DIRECTION.md](docs/PHASE-11-DIRECTION.md): the streak amends the deferral in
  `docs/IMPROVEMENT-IDEAS.md` (journal-side streaks stay deferred), and day-level activity counts
  events of since-deleted items, since §7's exclusion protects item-centric results rather than
  the owner's own calendar. The full serial suite passes 827/827 across 73 files, the production
  build passes, three deliberate red/green proofs behaved as intended, and a disposable 375×812
  closeout verified every surface numerically. See the Phase 11 entries in
  [DECISIONS.md](DECISIONS.md).
- **Phase 12 — implemented locally; not deployed.** An optional **import of meanings from the
  attached dictionary entry**. A lexical item whose `dictKey` resolves offers a sheet listing that
  entry's senses; each is previewed as the meaning row it would become, nothing is selected by
  default, and confirming appends the chosen ones to the item's own `meanings[]`. Regions and the
  labels the closed personal list has a word for cross over; the rest are named as *not carried
  across* rather than approximated, and examples stay behind with their Tatoeba attribution (§4).
  Imported rows are ordinary `meaning:<uuid>` records — no sense id, no ordering, no link back — so
  they are edited by the existing controls and a later dataset rebuild cannot reach them; §14's
  deferred dictionary-sense attachment or synchronization stays deferred. Existing meanings are
  never overwritten, and a sense already held is shown disabled. No schema, preference, backup or
  event-type change: `SCHEMA_VERSION` remains 5 and an import logs one ordinary `edit`. The full
  serial suite passes 889/889 across 77 files, the production build and `git diff --check` pass,
  five deliberate red/green proofs behaved as intended — two of them by exposing a racing absence
  in the new tests, which were fixed — and a disposable 375×812 closeout verified the sheet, the
  append and the follow-up edit numerically. See the Phase 12 entries in
  [DECISIONS.md](DECISIONS.md).
- **Phase 13 — implemented locally; not deployed.** The conjugation drill is **graded and
  recorded**, and asks one of two ways. A launch-card control chooses **reveal** (see the form,
  then Got it / Missed it) or **type it** (write the form and be marked); the choice is not
  remembered, like the session-direction control beside it. Typed answers are compared exactly
  first and only then through `normalize.js`, because in a conjugation the accent *is* the answer
  — `hablo` is present where `habló` is preterite — so a missing accent passes as a named near
  miss rather than as a silent match, while ñ stays a letter and `ano` for `año` stays wrong.
  Each answer writes one `drill_pass` / `drill_fail` against the **personal** item id, carrying
  its tense, slot, mode and verdict; the drill still logs no `view`, and no drill result moves a
  Leitner box. Estadísticas gains a **Conjugaciones** section — overall accuracy and a row per
  tense, weakest first — and a drill-only day now holds the streak. This reverses Phase 10c's
  ungraded, recordless drill at the owner's request, and reads §14's deferral as naming
  Collection Practice; scheduling stays deferred either way. No schema, preference or backup
  change: `SCHEMA_VERSION` remains 5. The full serial suite passes 924/924 across 77 files, the
  production build and `git diff --check` pass, and three deliberate red/green proofs behaved as
  intended — one of them by exposing a genuinely racing test that had been passing by luck, since
  fixed. See the Phase 13 entries in [DECISIONS.md](DECISIONS.md).
- **Phase 14 — implemented locally; not deployed.** The **Conjugation Gym** replaces the single
  random drill with balanced Quick and Focus sessions, an explicitly chosen Adaptive option,
  Saved/Core 20/Core 50 verb pools, all shipped tenses, diagnosed typed retries, one optional
  missed-form round and actionable performance. Typed first attempts remain the primary score;
  reveal self-grades, retries and missed-round answers are reported separately. Core practice
  creates no notebook item, while Saved and Core results merge by stable lemma-level skill and
  remain source-filterable. The full serial suite passes 975/975 across 83 files, the production
  build and `git diff --check` pass, three deliberate failure proofs reddened as intended, and a
  seeded 375×812 closeout independently reproduced the displayed score from the raw event log.
  It introduces no schema change, due date, automatic queue or Leitner effect. See the approved
  [direction](docs/PHASE-14-DIRECTION.md) and [implementation report](docs/PHASE-14-REPORT.md).
- **Collection bulk capture — implemented locally; not deployed.** A Vocabulary page's existing
  Add vocabulary panel can now narrow saved entries to Words, Phrases, and an exact existing tag,
  then select every available match together. Existing members remain excluded and the final Add
  still uses the established atomic Collection transaction. No schema, backup, preference or event
  change; the full serial suite passes 976/976 across 83 files, the production build and
  `git diff --check` pass, and a disposable 375×812 browser flow passed without overflow or console
  errors. See the Collection bulk-capture entries in [DECISIONS.md](DECISIONS.md).
- **Vocabulary group collapse — implemented locally; not deployed.** Each named group and Not
  grouped yet now collapses independently in page read mode, while its item count and Add
  vocabulary action stay visible. Groups start expanded on each page visit and the display state
  is not stored. No schema, backup, preference or event change; the full serial suite passes
  977/977 across 83 files, the production build and `git diff --check` pass, and a disposable
  375×812 browser flow passed without overflow or console warnings/errors. See the Vocabulary
  group disclosure entries in [DECISIONS.md](DECISIONS.md).

`SCHEMA_VERSION` is **5**. Before Dexie opens v5, schema-v1 through schema-v4 owners must save and
acknowledge an untouched validated export. Direct legacy upgrades run meanings, page-profile,
relationship, and composable-page migrations in order. Backup schemas 1 through 5 are accepted,
upgraded sequentially in memory, deeply validated as v5, and only then offered for
replace-and-restore; newer versions remain blocked.

## Testing

```
npm test        # Vitest over the data layer, UI navigation, search, review, linking and the pipeline
```

The database tests run the real Dexie code against an in-memory IndexedDB
(`fake-indexeddb`), so they exercise what ships rather than a mock. The pipeline is tested too,
because its conjugation extractor decides what ~1,250 verbs conjugate like. A handful of
component tests opt into `jsdom` per file; everything else runs in plain Node.

## Development

```
npm install     # once
npm run dev     # local preview
npm run build   # production build into dist/
```

Pushing to `main` builds and deploys automatically to GitHub Pages via
[.github/workflows/deploy.yml](.github/workflows/deploy.yml).

## Data

Reference-layer data (dictionary, conjugations, examples, frequency) comes from open sources,
each with its exact license recorded in `DATA_SOURCES.md` (generated by the pipeline from
Phase 0.5 onward). Personal notebook data lives only on-device and is never committed.
