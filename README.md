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
- **Phase 6 — first slice deployed.** The AI assistant (brief §9), opened
  with one narrow feature rather than an app-wide assistant: a user-initiated review of a single
  Diario entry, judging whether it is understandable and where it is correct but unnatural. Off by
  default, enabled in Ajustes behind an acknowledged Anthropic spend cap, using the owner's own key
  stored on-device and never exported. The review was originally session-only; the second slice
  (2026-08-11, below) now persists the latest review on its entry. No event is logged either way.
  §9's assistant Q&A over the notebook and its approved proposed entries remain unbuilt. See the
  Phase 6 entries in [DECISIONS.md](DECISIONS.md).
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
- **Phase 10 — deployed.** Learning depth in Repaso, built only from
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

- **Phase 11 — deployed.** Owner-centric stats, spending data the
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
- **Phase 12 — deployed.** An optional **import of meanings from the
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
- **Phase 13 — deployed.** The conjugation drill is **graded and
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
- **Phase 14 — deployed.** The **Conjugation Gym** replaces the single
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
- **Phase 15 — deployed.** Gym correctness and depth: accent-near
  answers now fail when the missing accent changes the tense, performance actions open full
  target-centred Focus decks, and Adaptive uses resolved misses, a 90-day window and rolling
  last-10 accuracy rather than lifetime weakness alone. Stem changers and Irregular preterites
  join the reference-only pools, while the maintenance batch fixes session reset/reload/navigation
  edges, Reveal-only completion wording, labels and action coverage. Schema v5, existing event
  types, owner-started sessions and the no-Leitner boundary remain unchanged. The final serial
  suite passes 1,021/1,021 across 86 files, the production build and `git diff --check` pass, all
  56 unique curated lemmas resolve to shipped tables, and a disposable 375×812 closeout passed
  without horizontal overflow or console warnings/errors. See the approved
  [direction](docs/PHASE-15-DIRECTION.md) and [implementation report](docs/PHASE-15-REPORT.md).
- **Phase 16 — deployed.** Scheduled review now uses the full
  Again/Hard/Good/Easy grade scale, objectively marks typed reverse and cloze answers, offers one
  history-free missed-card recovery round, and chunks queues over 20 into 10/20/All sittings.
  Scheduled review and free practice now share one vocabulary-card engine; hub practice gains
  direction, cloze and typed modes, while Vocabulary pages keep their in-place skim and add
  launchable whole-collection or group-scoped sessions. Only the primary scheduled pass writes
  review events; typed strings, recovery answers and both free-practice surfaces remain transient.
  Schema v5 and the existing event types remain unchanged. The final serial suite passes
  1,044/1,044 across 87 files, the production build and `git diff --check` pass, and a disposable
  375×812 closeout passed without horizontal overflow or console warnings/errors. See the approved
  [direction](docs/PHASE-16-DIRECTION.md) and [implementation report](docs/PHASE-16-REPORT.md).
- **Phase 17 — deployed.** The Gym now has Forms, Tense usage and
  Endings lanes. Usage and Endings use one objective four-choice engine with balanced decks,
  curated confusables, no immediate retry, one reshuffled missed round, and dictionary-backed
  regular/perfect reveals when available. Recognition answers reuse `drill_pass`/`drill_fail`
  through additive metadata while form statistics, Adaptive and Leitner replay explicitly ignore
  them. Performance now shows Usage/Endings accuracy, per-tense recognition beside Forms, and
  directional confusions; matching usage cards derive up to two personal Grammar-guide links.
  Schema v5 and the existing event types remain unchanged. The final serial suite passes
  1,073/1,073 across 93 files, the production build and `git diff --check` pass, two deliberate
  failure proofs reddened as intended, and a disposable 375×812 closeout passed without overflow
  or console warnings/errors. See the approved [direction](docs/PHASE-17-DIRECTION.md) and
  [implementation report](docs/PHASE-17-REPORT.md).
- **Phase 18 — deployed.** Tense usage now supports
  self-graded recall from a tense to all of its curated uses, while Endings adds five-field typed
  production with exact-first accent grading, locked passing fields, one retry and one optional
  de-duplicated missed round. A centralized grouped pool picker adds balanced 18-verb Regular and
  Spelling-change packs, and Saved Forms sessions can target one exact tag or one whole active
  Vocabulary page. Performance keeps choice, recall and typed evidence separate; Forms,
  Adaptive and Leitner consumers remain unchanged. Schema v5 and existing event types remain.
  The final serial suite passes 1,111/1,111 across 98 files, the production build and
  `git diff --check` pass, three deliberate data/isolation failures reddened as intended, and a
  disposable 375×812 closeout passed without horizontal overflow or console warnings/errors.
  See the approved [direction](docs/PHASE-18-DIRECTION.md) and
  [implementation report](docs/PHASE-18-REPORT.md).
- **Phase 19 — deployed.** Grammar guides have safe formatted Overviews, accessible Note callouts
  and schema-v6 one-level subsections. The schema-v7 Structured Notes increment keeps every Page
  body as Notes Overview and adds one level of named Notes sections, shared hierarchy mechanics,
  organization, search, structure-only copying, mixed counts and the approved Pages/Diario rule.
  The final serial suite passes 1,204/1,204 across 103 files, the production build and
  `git diff --check` pass, and a disposable 375×812 integrated flow passed without horizontal
  overflow or console warnings/errors. `main` deployed at `4f73a45`, and the owner confirmed the
  production smoke screen passed. Two follow-up increments are also deployed: Page Notes editors
  keep Block quote and add Note callout,
  `[!NOTE]` markers render as accessible Notes-blue panels and stay out of visible-text consumers,
  and the second adds non-destructive Blank line controls to Page Notes, Grammar
  Overviews and Diario. A 2026-08-16 follow-up brings top-level lexical notes into the same
  explicit Note-callout and Blank-line set. Exact standalone `<br>` markers render as spacing and
  stay out of visible-text consumers; the original combined suite passed 1,214/1,214.
  Phase 19 may group later related owner-approved Page organization/formatting increments, but does
  not pre-approve unknown scope. See the approved [direction](docs/PHASE-19-DIRECTION.md) and
  [implementation report](docs/PHASE-19-REPORT.md).
- **Phase 20 — deployed.** Ajustes now manages every exact
  personal tag globally: rename to an unused spelling, explicitly merge into an existing tag, or
  remove it without deleting entries. One atomic transaction preserves item timestamps, records
  one ordinary `edit` per changed item and applies the approved colour rule; lossy confirmations
  offer an optional, non-gating backup. Schema v6 and the backup format remain unchanged. The
  final serial suite passes 1,168/1,168 across 101 files, the production build and
  `git diff --check` pass, rollback/backup proofs pass, and a disposable 375×812 rename→merge→remove
  closeout passed without horizontal overflow or console warnings/errors. See the approved
  [direction](docs/PHASE-20-DIRECTION.md) and
  [implementation report](docs/PHASE-20-REPORT.md).
- **Phase 21 — deployed.** Dictionary verb
  details now lead their Conjugation card with **What to notice**: actual-paradigm lessons,
  contrastive emphasized forms, and pipeline-verified sibling families. Regular verbs keep one
  quiet hablar/comer/vivir anchor; singleton behavior such as *jugar*'s u→ue teaches without a
  false family. The same-source r3 dictionary remains format v1 and adds a fifth replaceable
  primary-key store under reference declaration v2; personal schema stays v8. The final serial
  corrected suite passes 1,310/1,310 across 107 files, package verification passes 34/34, the
  production build and diff check pass, and a disposable real-r3 375×812 flow proves exact
  structural emphasis—including pronoun-bearing *arrepentirse*—plus 44px targets, wrapping,
  navigation, overflow and console checks. Only manifest-selected r3 artifacts remain in the
  public package tree. See the approved
  [direction](docs/PHASE-21-DIRECTION.md) and
  [implementation report](docs/PHASE-21-REPORT.md).
- **Phase 22 — deployed.** Lexical detail now derives
  conjugation-aware whole-token links between saved Words and Phrases, suppressing ambiguous
  inflections and fixed high-noise function words. Conservative personal-gloss overlap can show
  at most three explained **You also know…** proposals; only the owner's explicit action creates
  one ordinary stored-once Similar meaning connection, and v1 deliberately remembers no
  dismissal. Confirmed direct edges feed a separate self-graded Similar-meaning recall deck with
  one missed-only recovery round and an intentional cold start. Personal schema remains v8 and no
  preference, backup field, event type, score, schedule, or dictionary package is added. The final
  serial suite passes 1,343/1,343 across 113 files, the 2,100-module production build and diff
  check pass, and a disposable 375×812 seeded flow verifies `dar` ↔ `me da igual`, ambiguous
  `fui` suppression, explicit confirmation, event-free recall, 44px actions, zero overflow, and
  zero console warnings/errors. See the approved
  [direction](docs/PHASE-22-DIRECTION.md) and
  [implementation report](docs/PHASE-22-REPORT.md).
- **Phase 23 — deployed.** Lexical Detail now
  offers a display-only **Historia** of saved/review/box/tricky/retirement milestones and every
  current habitat, including marker-free owner prose and a disclosed **En tu Diario** section.
  The idle Cuaderno root offers an unweighted **Pasear por mi cuaderno** walk over typed
  Connections and saved Phase 21 family siblings; non-journal Pages may become reduced centers,
  Diario remains an inert count, and Back preserves the transient route trail. Both surfaces are
  derived and add no writer, schema field, preference, backup shape, event type, score, schedule,
  queue, or dictionary package; personal schema remains v8. The serial suite passes 1,372/1,372
  across 118 files, the 2,105-module build and diff check pass, all three deliberate failures red,
  and a disposable 375×812 flow verifies rich prose Biography, a three-hop family/Page walk,
  same-id full-entry opening, 44px actions, zero overflow, and zero console warnings/errors. See
  the approved [direction](docs/PHASE-23-DIRECTION.md) and
  [implementation report](docs/PHASE-23-REPORT.md).
- **Phase 24 — deployed.** The r4 dictionary
  preserves all 10,278 r3 entry IDs while adding sense- and entry-level synonyms/antonyms, topic
  labels, first-sentence etymology, filtered sense-attached examples, dormant derived/related
  family data, and more-specific subsense glosses; IPA and syllable breaks remain excluded. Rich
  entries display the approved metadata without navigation or personal writes, while legacy-shaped
  entries remain unchanged. Personal schema stays v8, dictionary format stays v1, and aliases stay
  empty. The final package passes 45/45 shipment checks at 4.06 MiB gzipped; the serial suite,
  production build, deliberate display failure, and disposable 375×812 rich/plain-entry flow all
  pass. GitHub Pages deployment run 31723115634 succeeded, and the live site serves the r4
  manifest and all 16 chunks. See the approved [direction](docs/PHASE-24-DIRECTION.md) and
  [implementation report](docs/PHASE-24-REPORT.md).
- **Phase 25 — safe slice deployed.** Historia now shows an attached
  word's saved conjugation-family siblings plus a marked What-to-notice dictionary exit through
  one alias-aware, read-only derivation shared with Wander. Both endpoints must be words; phrases,
  unattached words, incomplete reference data, and failed optional reads stay quiet. The proposed
  derivational-family slice stopped at its mandatory pre-UI quality gate because r4's flattened
  `relatedWords` cannot distinguish broad relations or identify the intended entry, so the field
  remains dormant. The serial suite passes 1,404/1,404 across 121 files, the production build and
  diff check pass, and a disposable 375×812 flow verifies 44–56px actions, no overflow or console
  issues, personal/dictionary navigation, and zero fixture rows after cleanup. Deployed from
  `main` at `1432dd1` through Pages run 31749800168; personal schema stays v8. See the
  [direction](docs/PHASE-25-DIRECTION.md) and [implementation report](docs/PHASE-25-REPORT.md).
- **Phase 26 — deployed.** Saved visible Notes,
  enabled Source captures, enabled Grammar explanations/examples, and Diario can now disclose
  personal vocabulary **Mentioned here** without writing until an explicit context-appropriate
  confirmation. Lexical Historia adds read-only **Seen together** neighborhoods from one exact
  named structure or repeated unambiguous prose across pages. Exact case-sensitive trimmed Source
  and Media URLs disclose other personal items inline through **Also from this source**. No schema,
  preference, backup, event type, reference package, background job, score, or automatic link was
  added; personal schema stays v8. The complete serial suite passes 1,464/1,464 across 128 files,
  the 2,116-module production build and diff check pass, the exact-URL negative proof red/greened,
  and a disposable 375×812 flow verified explicit-write boundaries, 44px actions, zero overflow,
  and a clear console before cleanup returned the fixture to zero items/events. Deployed from
  `main` at `6780961` through Pages run 31812821165. See the
  [direction](docs/PHASE-26-DIRECTION.md) and [implementation report](docs/PHASE-26-REPORT.md).
- **Editable media links — deployed.** A saved media link is no longer open-or-delete only: each
  row carries a pencil that reopens the existing composer prefilled with its URL and label, and
  Save link replaces that row rather than appending, logging one ordinary `edit`. This matters
  most right after a share, since a shared TikTok carries no title and lands labelled only by its
  raw URL. All four surfaces that render media links behave the same way — lexical detail, the
  page Media links section, the page details editor's draft list (written only when the sheet
  saves), and Diario's Más panel — and the lexical delete control became a labelled 44px button to
  match. No schema, backup or event-type change; `{url, label}` already held both fields, and a
  richer per-link note remains a separate decision. See the media-link entries in
  [DECISIONS.md](DECISIONS.md).
- **Collection bulk capture — deployed.** A Vocabulary page's existing
  Add vocabulary panel can now narrow saved entries to Words, Phrases, and an exact existing tag,
  then select every available match together. Existing members remain excluded and the final Add
  still uses the established atomic Collection transaction. No schema, backup, preference or event
  change; the full serial suite passes 976/976 across 83 files, the production build and
  `git diff --check` pass, and a disposable 375×812 browser flow passed without overflow or console
  errors. See the Collection bulk-capture entries in [DECISIONS.md](DECISIONS.md).
- **Vocabulary group collapse — deployed.** Each named group and Not
  grouped yet now collapses independently in page read mode, while its item count and Add
  vocabulary action stay visible. Groups start expanded on each page visit and the display state
  is not stored. No schema, backup, preference or event change; the full serial suite passes
  977/977 across 83 files, the production build and `git diff --check` pass, and a disposable
  375×812 browser flow passed without overflow or console warnings/errors. See the Vocabulary
  group disclosure entries in [DECISIONS.md](DECISIONS.md).
- **Compact page sections — deployed.** Every page section now has a
  visit-local disclosure; populated sections start open, while empty sections and empty nested
  Vocabulary/Grammar groups start compact. Source captures, Grammar sections and Grammar examples
  show one edit icon in read mode, with confirmed deletion inside that editor, and the redundant
  per-Grammar-section position/example line is gone. No schema, backup, preference or event change.
  The full serial suite passes 978/978 across 83 files, the production build and `git diff --check`
  pass, and a disposable 375×812 browser flow passed without page overflow or console warnings/
  errors. See the Page section density entries in [DECISIONS.md](DECISIONS.md).
- **Notebook formatting — deployed.** Page bodies, journal entries and
  top-level word/phrase notes keep their existing plain-text storage and editor, with a compact
  toolbar for headings, bold, italic, highlight, lists, dividers and quotes. Read mode renders that
  deliberately small Markdown subset, while search, previews and AI feedback receive only visible
  text. Raw HTML remains disabled except for the exact standalone `<br>` spacing marker; images,
  tables, code and clickable links are not enabled. No schema, backup,
  preference or event change; the full serial suite passes 991/991 across 86 files, the production
  build and `git diff --check` pass, and a disposable 375×812 browser flow passed without overflow
  or console warnings/errors. See the Notebook Markdown entries in [DECISIONS.md](DECISIONS.md).
- **Page hierarchy and icon actions — deployed.** Top-level page sections
  now use a pale full-width heading band, long section and group names wrap instead of clipping,
  and Vocabulary groups sit visibly beneath their parent section. Practice uses a target icon;
  Vocabulary, Source and Grammar organizers use one list/tree icon; empty Connections and Media
  rows use a plus alone; and inline pencil actions across Pages, Words and Phrases no longer repeat
  an edit label. All icon actions retain contextual accessible names and 44px touch targets. No
  schema, backup, preference, event or navigation change; the full serial suite passes 991/991
  across 86 files, the production build and `git diff --check` pass, and a disposable 375×812
  browser flow passed without overflow or console warnings/errors. See the Page hierarchy entries
  in [DECISIONS.md](DECISIONS.md).
- **Optional Grammar key idea — deployed.** A Grammar guide may omit its
  Key idea, add it later from a compact `+ Key idea` action, or remove it through the existing
  pencil editor's confirmed action. The expanded Grammar header's Add section action is now a
  plus-only 44px icon button. An empty string continues to represent an absent Key idea, so there
  is no schema, backup, event or migration change. The full serial suite passes 992/992 across 86
  files, the production build passes, and a disposable 375×812 browser flow passed without
  overflow or console warnings/errors. See the Optional Grammar key idea entries in
  [DECISIONS.md](DECISIONS.md).
- **Persisted Diario feedback (Phase 6, second slice) — deployed.** The latest AI review of a
  Diario entry is now stored on the entry it judged, reversing the original session-only design:
  acting on feedback meant opening the editor, which destroyed it. Schema v8 adds a `feedback`
  field to every page (`null` when absent); Ask again replaces it back through the §9 disclosure,
  Remove clears it, and saving a review moves no `updatedAt` and logs no event, so recency,
  lookup counts and Repaso evidence never move. Staleness is a content hash of the reviewed text,
  never a timestamp. The editor shows the stored review read-only below the body, and the reader
  keeps a stored review readable even when the AI feature is off. Backups validate the field at
  v8, reject it below, and upgrade v1–v7 envelopes; the export-first gate covers v7 databases,
  and a hotfix strips the AI key from the pre-upgrade export exactly as ordinary backups do. See
  the Phase 6 second-slice entries in [DECISIONS.md](DECISIONS.md).
- **Inline media rendering — deployed.** The safe notebook Markdown dialect now renders
  `![alt](url)` images and `[label](url)` hyperlinks when the URL is https: block-level always,
  height-capped for the phone viewport, lazy and no-referrer, tap opens the source in a new tab,
  and a failed load or non-https URL degrades to readable text. Media-link rows on lexical
  entries, pages and Diario preview image-extension URLs below the unchanged link row, and the
  editor toolbar gains an Image action with the placeholder URL pre-selected. Rendering only —
  stored strings, schema, backups and the plain-text projection are untouched, so search,
  previews, the AI request path and review staleness never see an image. See the inline-media
  entries in [DECISIONS.md](DECISIONS.md).
- **Picture-front flashcards — deployed.** A forward card whose item has a direct-image media
  link shows that picture as the question, in both scheduled Repaso and free practice. The face
  rides the same session-start snapshot as cloze (which it outranks; reverse stays excluded),
  the reveal adds the word beside the picture, and Type mode marks the term through the existing
  checker. Only the URL reaches the card — the link label would usually leak the answer — and a
  failed load degrades to the plain term front so no graded card is ever stranded. Scheduled
  grades log `face: "image"` as additive metadata nothing reads. No schema, preference, backup
  or event-type change. See the picture-front entries in [DECISIONS.md](DECISIONS.md).
- **Editor writing comfort — deployed.** The shared Markdown editor continues bullets, numbered
  items and quotes when Enter is pressed (numbers increment, an empty item ends the list, and
  predictive-text keystrokes are left to the native newline), gains a toolbar Preview toggle that
  swaps the box for the read-mode render of the draft, and grows every editor textarea with its
  content from each screen's existing minimum height. Manual drag-resize is off because a dragged
  height pins the box. Presentation and interaction only — no stored string, schema, backup or
  event change, and Diario's autosave timing and single-`edit` contract are untouched. See the
  editor-upgrade entries in [DECISIONS.md](DECISIONS.md).
- **Meaning-level interjection override — deployed.** A personal meaning may use `interjection`
  as its part-of-speech override; it describes how that individual meaning functions, so it lives
  in the existing meaning-level selector rather than among Usage labels, and entry-wide parts of
  speech are unchanged. The existing `posOverride` string already stores the value; backup
  validation only widened its closed allowlist, so schema stays v8 with no migration, event or
  preference change. The complete serial suite passed 1,381/1,381 across 119 files with a
  deliberate pre-change failure proof and a disposable 375×812 flow. See the interjection
  classification entries in [DECISIONS.md](DECISIONS.md).
- **Android share target — deployed.** The installed PWA registers in Android's share sheet
  (`share_target` in the manifest, GET). A shared URL — including Chrome's bare-URL-in-text
  shape — takes the URL path (now the destination chooser below); any other shared text lands
  whole in the two-layer search box for the owner
  to trim. Startup consumes the `share_*` params into the ordinary in-memory trail and strips
  them, so no URL router was added and refresh replays nothing; nothing is ever saved implicitly.
  No schema, storage, backup or event change. The complete serial suite passes 1,397/1,397 across
  120 files, the live manifest serves the `share_target` block, and a disposable 375×812 flow
  verified both arrival paths. The share-sheet entry appears once the PWA is (re)installed from
  the deployed site. See the Android share target entries in [DECISIONS.md](DECISIONS.md).
- **Share arrival destination chooser — deployed.** Real TikTok use answered the share target's
  open destination question the day it deployed: always-new-Source-page is too rigid for frequent
  short learning videos. A shared URL now opens a chooser — attach to an existing page or
  word/phrase as a Media link (one ordinary `edit`, then land on the item), start a New Grammar
  guide with the video pre-attached and no sections preselected, or keep the New Source notebook.
  Dismissing writes nothing; the picker lists recent items first, excludes journal entries, and
  searches personal content only. No schema, storage, backup or event-type change. The complete
  serial suite passes 1,409/1,409 across 121 files, the manifest is unchanged, and a disposable
  375×812 flow walked all three destinations with exactly one edit event on attach. See the Share
  arrival destination chooser entries in [DECISIONS.md](DECISIONS.md).
- **Continue-with-this-video — deployed.** One shared video often yields several outputs, so after
  any chooser action an ephemeral pill now keeps the video available above the nav on every
  Cuaderno screen: "Add to another item" reopens the full chooser, "Done" forgets it. The picker
  also gained a create row — the typed query becomes a new word or phrase through the normal
  creation sheet, carrying the video as a Media link from birth (space rule infers phrase;
  dictionary attachment stays the usual later step). The continuation is in-memory only — no
  schema, preference, event, or reload survival; every content write keeps its normal path and
  event. The complete serial suite passes 1,410/1,410 across 121 files, the manifest is unchanged,
  and a disposable 375×812 flow verified the pill's geometry, chooser reopen from a detail screen,
  create-from-picker, Done, and a clean reload. See the Continue-with-this-video entries in
  [DECISIONS.md](DECISIONS.md).
- **New word/phrase share destination — deployed.** Creating a new entry from a share existed only
  as the create row buried at the bottom of the existing-item picker, which real use showed was
  not discoverable. The chooser's second row now opens the normal creation sheet blank — the space
  rule infers word vs phrase as the owner types — with the video attached from creation and the
  continuation pill following; the picker's create row stays for the type-to-search-then-create
  case. No schema, preference, backup or event-type change. The complete serial suite passed
  1,411/1,411 across 121 files at implementation, the manifest is unchanged, and a disposable
  375×812 flow confirmed four chooser rows without overflow. See the Continue-with-this-video
  entries in [DECISIONS.md](DECISIONS.md).
- **Example-to-phrase bridge — deployed.** Every saved personal lexical example can now seed a new
  phrase through the ordinary creation sheet, carrying its Spanish into the editable term and its
  optional English into the editable first meaning. The action appears only after an example is
  saved, preselects Phrase, and creates nothing until the normal confirmation; the source example
  is unchanged, no stored link is invented, and Phase 22's read-only containment derives the
  word↔phrase relationship. No schema, backup, preference, event-type or reference-data change.
  See the Example-to-phrase bridge entries in [DECISIONS.md](DECISIONS.md).
- **Personal twin merge — deployed.** A link made before a personal entry existed kept pointing at
  the raw dictionary key even after the owner attached that entry to their own word — observed in
  the real notebook, the evidence the v3→v4 migration deliberately waited for. Each such
  connection row now offers a prompted, per-row merge: one tap re-points the stored key (and any
  alias raw keys) at the twin, carries the annotation, honors an existing personal edge in either
  physical direction without creating a reciprocal copy, and routes conflicting explicit
  descriptions through a resolver instead of silently picking a survivor. The merge is
  bookkeeping in the alias-repair manner — no edit event, no `updatedAt` — and automatic
  machinery still never rewrites. Offered on Detail, non-vocabulary Collection pages and Diario's
  Más; suppressed where an outgoing lexical link is vocabulary membership. No schema, preference,
  backup or event-type change. The complete serial suite passes 1,442/1,442 across 124 files, and
  a disposable 375×812 flow verified the offer and the re-pointed link by numbers. See the
  Personal twin merge entries in [DECISIONS.md](DECISIONS.md).

- **Apuntes — deployed.** Each Diario entry gains one optional collapsible
  free-markdown **Apuntes** box (schema v9's `apuntes` field, `null` when absent) for outside
  feedback and notes to self, kept out of the entry body so AI review requests, the stored
  review's staleness hash, and body-derived surfaces never see it. Editable in the journal
  editor's collapsible box on the normal autosave path (ordinary `edit` event), readable behind a
  collapsed disclosure in the reader, and searchable in global ("in the Apuntes") and Diario
  search. The reader also presents a stored AI review as a dated "Feedback · date" disclosure.
  The complete serial suite passes 1,484/1,484 across 129 files, the production build passes, the
  deliberately broken migration failed exactly its pinning tests before restore, and a disposable
  375×812 flow proved the v8→v9 export-first gate (keyless envelope), editor autosave, reader
  disclosure and both search surfaces before cleanup returned the origin to zero items. Deployed
  from `main` at `29c3840` through Pages run 31835260852. See the Apuntes entries in
  [DECISIONS.md](DECISIONS.md).
- **Attach-later for unattached words — deployed.** The §5 seam always defined dictionary
  attachment as optional and reversible, but a word created without its entry had no path to
  attach one afterwards: `DictAttachment`'s never-attached state rendered nothing, so the picker
  the orphan Re-attach flow uses was unreachable (found through the owner's real *razonar*). The
  unattached Detail card now shows a quiet dashed "Attach dictionary entry" control opening that
  same picker pre-filled with the term; picking attaches with no edit event, and "not installed"
  still renders nothing. Once attached, the personal-twin merge offer lights up anywhere the
  entry is ordinarily linked. The same commit carries Historia's containment-title fix — the
  phrase↔word section is named from the subject's own side ("Built on" on a phrase, "Phrases" on
  a word). The complete serial suite passes 1,485/1,485 across 129 files, and a disposable
  375×812 flow verified the control, the pre-filled picker, the stored attachment and the
  attached row by numbers. See the Attach-later entries in [DECISIONS.md](DECISIONS.md).
- **Backup pos validation widened — deployed.** The v8→v9 export-first gate failed closed on the
  owner's real notebook: four words carried the dictionary's own part-of-speech codes (pron,
  prep, intj, …), which `newLexicalFromEntry` has always copied onto items and the display layer
  has always rendered — but backup validation checked the pos editor's six-value list. Entry-level
  `pos` now validates as any string (non-strings still fail); the meaning-level `posOverride`
  allowlist and the editor selectors are unchanged, and no stored data was rewritten — the
  affected items were always correct. The complete serial suite passes 1,486/1,486 across 129
  files. See the Backup pos validation entries in [DECISIONS.md](DECISIONS.md).
- **Creation-time dictionary suggestions — deployed.** The ordinary New word or phrase sheet now
  offers compact Spanish-side suggestions from the installed offline dictionary, including when
  creation starts from a shared video. Choosing a row explicitly selects a reversible attachment,
  canonicalizes the draft term, and copies only the first gloss and a compatible part of speech
  into still-blank fields; existing draft content and seeded Media links remain untouched. With no
  installed dictionary, creation stays unchanged. No schema, backup, preference, manifest or
  event-type change. See the creation-time dictionary entries in [DECISIONS.md](DECISIONS.md).
- **Meaning-example reading polish — deployed.** Meaning-assigned examples now place Move and
  Add-as-phrase behind one quiet 44px ellipsis action, with only one popover open at a time; a
  conditional hairline separates a meaning note from its examples. General examples retain their
  existing controls. Presentation and interaction only — no write path, schema, backup, event or
  reference-data change. See the Meaning-example reading polish entries in
  [DECISIONS.md](DECISIONS.md).
- **Additional Refine views — deployed.** Todo now offers rolling **Added in the last 7 days** and
  **Added in the last 30 days** lenses plus **With media links** across words, phrases and Pages.
  Words & phrases gains an exact **Specific Page** refinement whose contextual counts, tag choices
  and Practice source compose with the existing lenses; Words also offers **No dictionary
  attachment** when the offline dictionary is installed. These are derived display subsets only:
  no schema, storage, backup, preference, event or reference-package change. The combined current
  tree passes 1,501/1,501 serial tests across 130 files and the production build; a disposable
  375×812 pass verified the new visible views, 44px controls, zero horizontal overflow and no
  console warnings/errors. Deployed from `main` at `c97ed20` through Pages run 31897874543, with
  the live site serving `assets/index-B9Y8-EU6.js`. See the Additional Refine views entries in
  [DECISIONS.md](DECISIONS.md).
- **Suppressed-containment confirmation — deployed.** Inflected phrase↔word matches the Phase 22
  ambiguity oracle deliberately hides (*Creo que* never asserted *creer*, because `creo` is also
  *crear*'s first person) are now offered in Detail's **From your cuaderno** card as explicit
  proposals with their competing-lemma evidence; one tap writes the ordinary stored-once
  **Found in** connection with no event, and the row joins the existing Connections groups
  everywhere they render. The oracle, matcher, stop-list and clitic silences are untouched, a
  candidate requires a form posting naming the attached lemma among others, stop-word surfaces
  never propose, and there is no dismissal memory, matching Phase 22. Sized by a diagnostic over
  the owner's real export: 48 suppressed rows, ~16 of them genuine misses. No schema, preference,
  backup, event-type or reference change. The complete serial suite passes 1,510/1,510 across 130
  files and the production build passes; a disposable 375×812 origin proved the seeded
  creer/*Creo que sí.* confirmation end to end. Deployed from `main` at `39c0e90` through Pages
  run 31917078425, with the live site serving `assets/index-BywqOKI0.js`. See the
  Suppressed-containment confirmation tier entries in [DECISIONS.md](DECISIONS.md).
- **Broader parts of speech — deployed.** The entry and per-meaning part-of-speech lists are now
  one list, extended with **pronoun, preposition, conjunction and interjection**; they had been
  separate and unequal, so a word could carry a part of speech its own meanings could not restate.
  The dataset's determiner, article, numeral, contraction and particle fold into `other` as
  grammarian categories rather than shelves to browse, and `phrase` maps to nothing because `form`
  already tells a phrase from a word. This is what lets a word the dictionary splits by part of
  speech (*como* as adverb, preposition and conjunction) stay **one** item whose meanings carry the
  roles, with separate items reserved for true homographs. Words & phrases gains a **Part of
  speech** refinement matching the item's own `pos` OR any meaning's override — matching only the
  entry level would push the owner into splitting entries to stay findable — with counts describing
  the narrowed view in option order and an impossible selection clearing itself. Seeding from a
  dictionary entry now translates every tag through one table at the seam; it had handled only
  `adj` and `adv`, so saving *como* as a preposition silently lost the part of speech. Two stale
  copies of the old five-value list now read from the option list: the abbreviation map, which
  showed a card reading "preposition" beside one reading "adv.", and the same-meaning proposal
  guard, where an unrecognized value reads as *not recorded* and lets a mismatched pair through.
  No storage, event, backup or schema change; `SCHEMA_VERSION` stays 9 and `item.pos` remains
  deliberately un-enumerated in backup validation. The complete serial suite passes 1,529/1,529
  across 130 files, the production build passes, a deliberate break of the meaning-override match
  red/greened its four tests, and a disposable 375×812 origin proved a single *como* returned under
  both `preposition` and `conjunction`. Deployed from `main` at `0de63dd` through Pages run
  31918541094, with the live site serving `assets/index-Cz-JKOsP.js`. See the Broader
  part-of-speech vocabulary entries in [DECISIONS.md](DECISIONS.md).
- **Lexical-note Markdown parity and meaning-example editing — deployed.** Top-level Word and
  Phrase notes now expose the same Block quote, explicit Note callout and Blank line actions as
  Page Notes during creation and later editing; their readers, review answers, search and previews
  interpret those markers consistently. A meaning-assigned example's existing ellipsis menu now
  adds **Edit example…** beside Move and Add as phrase, opening a prefilled inline Spanish/English
  editor that replaces the example in place without changing its meaning assignment or order.
  Cancel writes nothing and Save logs one ordinary `edit`. No storage, backup, preference,
  event-type or schema change; `SCHEMA_VERSION` stays 9. The complete serial suite passes
  1,534/1,534 across 130 files, the production build and `git diff --check` pass, and a disposable
  375×812 origin proved exact formatting markers, the saved in-place edit, 44px actions, zero
  horizontal overflow and a clear console. Deployed from `main` at `de89791` through Pages run
  31972144810, with the live site serving `assets/index-BRnsFnkg.js`. See the 2026-08-16 entries in
  [DECISIONS.md](DECISIONS.md).
- **General-example reading polish and editing — deployed.** Every saved General example now keeps
  Edit, Assign to meaning, Add as phrase and Delete inside one 44px ellipsis menu, leaving only the
  Spanish, optional English and speaker visible while reading. Edit opens the shared prefilled
  inline Spanish/English editor, replaces the example in the same array position, and logs one
  ordinary `edit`; Cancel writes nothing. No storage, backup, preference, event-type or schema
  change; `SCHEMA_VERSION` stays 9. The complete serial suite passes 1,536/1,536 across 130 files,
  the production build and `git diff --check` pass, and a disposable 375×812 origin verified the
  collapsed actions, in-place edit, 44px menu rows, zero horizontal overflow and a clear console.
  Deployed from `main` at `b77d809` through Pages run 31993261452, with the live site serving
  `assets/index-boXJd412.js` and `assets/App-CqkQitpZ.js`. See the General-example reading polish
  and editing entries in [DECISIONS.md](DECISIONS.md).
- **Typography: Literata entry face — deployed.** The owner picked the "diccionario de bolsillo"
  direction from a three-way scratchpad comparison: self-hosted Literata (latin 400/400i/600/700
  via `@fontsource/literata`) now leads `SERIF` and the note-heading stack, and browsing glosses in
  `ItemCard`/`LexicalHubCard` render in the entry face. Visual-only; no storage, event, backup or
  schema change (`SCHEMA_VERSION` stays 9). The production build passes and the 375×812 dev origin
  showed the loaded faces with zero horizontal overflow. Deployed from `main` at `d459d64` through
  Pages run 31995019703, with the live CSS serving all four `literata-latin-*.woff2` files. See the
  Typography direction entry in [DECISIONS.md](DECISIONS.md).
- **Typography: small-caps grammar labels — deployed.** The abbreviation beside a headword — "v.",
  "n. · m." — is now set in small caps in the entry face, upright, replacing the sans italic it had
  always worn; a new `PosSuffix` in `ItemCard.jsx` owns the treatment while each caller keeps its
  own size and margin, replacing the same styling spelled out six times with three margins and
  three sizes. Applied at the six headword surfaces; the three picker rows that disambiguate rather
  than label keep the sans italic. Visual-only; `SCHEMA_VERSION` stays 9. The complete serial suite
  passes 1,536/1,536 across 130 files (unchanged count), the production build and `git diff --check`
  pass, and a disposable 375×812 origin measured the treatment at both type scales with zero
  horizontal overflow and a clear console. No test asserts the styling itself. Deployed from `main`
  at `51f21c3` through Pages run 32049318652, with the live `assets/App-D4BdW6sp.js` carrying the
  rule. See the 2026-08-17 entries in [DECISIONS.md](DECISIONS.md).
- **Markdown callout variants and inline actions — deployed.** Every explicit-callout editor now
  offers Note, Tip and ¡Ojo!, while every Markdown toolbar adds Inline code and HTTPS Link. The
  shared reader/search/preview path recognizes the exact `[!NOTE]`, `[!TIP]` and `[!OJO]` markers;
  ordinary blockquotes remain quotations, fenced code stays readable plain text, and Tip/¡Ojo! use
  the owner-picked sage and saffron palette. No storage, backup, event, preference or schema change;
  `SCHEMA_VERSION` stays 9. The complete serial suite passes 1,549/1,549 across 130 files, the
  production build transforms 2,122 modules, and a 375×812 browser flow verified the accessible
  callouts, exact colours, contained toolbar and clear console. Deployed from `main` at `1869593`
  through Pages run 32081320262. See the 2026-08-17 entries in
  [DECISIONS.md](DECISIONS.md).
- **Cuaderno landing foyer — deployed.** Cuaderno now opens as the owner-picked notebook-specific
  library foyer instead of rendering the complete notebook list: global search shows up to five
  immediate results, illustrated Words & phrases and Pages doors lead to their dedicated hubs, a
  three-item Recent row resumes work, and quieter Browse all and Wander exits preserve full access.
  Browse all keeps the existing refinement controls and reveals long results in 30-item increments;
  the floating Add button remains. No storage, backup, event, preference or schema change;
  `SCHEMA_VERSION` stays 9. The complete serial suite passes 1,551/1,551 across 130 files, the
  production build transforms 2,126 modules, and the 375×812 fixture verified search, Browse all,
  hub navigation, zero horizontal overflow and a clear console; design QA against the selected
  mock also passes. Deployed from `main` at `65200bf` through Pages run 32194741780, with the live
  site serving `assets/index-BtkD3Yn0.js` and `assets/App-Bxg2YwU1.js`. See the 2026-08-18 entries
  in [DECISIONS.md](DECISIONS.md).
- **Repaso search-miss display removal — deployed.** Repaso no longer shows stored `search_miss`
  events in either its standalone card or Recent activity; Cuaderno's global search still records
  genuine misses, and existing history remains untouched. This is presentation-only, with no
  schema, backup or event-storage change. See the 2026-08-18 entry in
  [DECISIONS.md](DECISIONS.md).
- **Compact tag settings and duplicate review — deployed.** Ajustes keeps tag palettes collapsed,
  opens at most one eleven-swatch palette, and derives a neutral review for strict case-only tag
  variants. Every merge still uses the existing preview, confirmation, optional-backup and atomic
  transaction path; nothing merges automatically. No schema, preference, backup or event change.
  See the 2026-08-18 entries in [DECISIONS.md](DECISIONS.md).
- **Browser-backed navigation continuity — deployed.** A validated shallow `history.state`
  snapshot now gives Cuaderno, Diario, Repaso and Ajustes one remembered stack each, keeps visited
  tabs mounted for task-local filters, and aligns browser/hardware Back, Forward and visible Back
  controls. Refresh restores stable major destinations while drafts, filters and study progress
  remain transient and return safely to launchers. No router, URL route, durable-storage, schema,
  backup or event change. The complete current-tree suite passes 1,576/1,576 across 132 files, the
  production build transforms 2,127 modules, and the disposable 375×812 flow passed. These three
  increments deployed together from `main` at `3b4e717` through Pages run
  [32208156024](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/32208156024), with the live
  root returning HTTP 200 and serving `assets/index-CeP41uet.js`. See the 2026-08-18 entries in
  [DECISIONS.md](DECISIONS.md).
- **Cuidar mi cuaderno hub — deployed.** A quiet, always-static landing door above Pasear opens an
  optional tending hub with four render-derived invitation categories: Conectar (unlinked entries),
  Completar (missing meaning), Dar ejemplos (missing examples) and Etiquetas gemelas (case-only tag
  twins shared with Ajustes' Possible-duplicates review). Each visit samples up to three concrete
  items per category; a 7-day grace window shields new entries from Conectar and Dar ejemplos, and
  "Ver las N" hands the matching maintenance view to Browse all through a transient visit payload.
  Etiquetas gemelas lands on Ajustes with the duplicates review expanded. No dismissal state,
  counters, preferences, events, backup or schema change; `SCHEMA_VERSION` stays 9. The complete
  serial suite passes 1,593/1,593 across 134 files, the production build transforms 2,129 modules,
  and a disposable 375×812 fixture verified all category derivations, the grace window, Journal
  exclusion and every navigation flow by numbers with zero horizontal overflow and a clear console.
  Deployed from `main` at `f6f5f04` through Pages run
  [32213861769](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/32213861769), with the
  live root returning HTTP 200 and serving `assets/index-DCw9BCWv.js`; the deployed
  `assets/App-DVjQswaH.js` carries the hub's markers. Hub empty-state copy remains the plain
  placeholder pending the owner's voice-variant pick. See the 2026-08-18 entries in
  [DECISIONS.md](DECISIONS.md).
- **Compact Cuidar and Pasear landing doors — deployed.** Each optional foyer exit now contains
  only its original leading icon and the single-word label **Cuidar** or **Pasear**; the longer
  “mi cuaderno” copy, subtitles and trailing chevrons are gone. The full-width 58px buttons retain
  their existing colors, behavior and accessible touch targets. Focused Cuaderno/App coverage
  passes 62/62, the production build transforms 2,129 modules, and an isolated 375×812 check
  measured no horizontal overflow or console warnings/errors. Deployed from `main` at `3dc1ecf`
  through Pages run
  [32215040409](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/32215040409). See the
  2026-08-18/19 entries in [DECISIONS.md](DECISIONS.md).
- **Global-search creation bridge — deployed.** After Cuaderno's full personal-plus-dictionary
  search settles, its result list offers the exact query to the ordinary **New word or phrase**
  sheet even when approximate matches exist. The trimmed term is prefilled; the existing
  word/phrase inference, duplicate warning and explicit dictionary-selection flow remain in
  charge, and nothing writes until confirmation. No storage, backup, preference, event-type,
  reference-package or schema change; `SCHEMA_VERSION` stays 9. The complete serial suite passes
  1,595/1,595 across 134 files, the production build and `git diff --check` pass, and a disposable
  375×812 flow verified the 48px action, prefill, ordinary creation, zero horizontal overflow and
  a clear console. Deployed from `main` at `4968878` through Pages run
  [32279564126](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/32279564126). See the
  2026-08-19 entries in [DECISIONS.md](DECISIONS.md).
- **Share page-kind chooser — deployed.** A shared URL's **New page** route now opens an explicit
  Notes/Vocabulary/Grammar/Source chooser, Notes first as the simple default, instead of treating
  every new page as a Source notebook. Shared Notes, Vocabulary and Grammar pages carry the URL as
  an ordinary Media link; a shared Source notebook keeps it only as its Primary URL. A
  sender-provided Android share title prefills the editable title; a bare TikTok URL leaves it
  blank rather than fetched or invented. No schema, backup, preference, manifest, navigation or
  event-type change; `SCHEMA_VERSION` stays 9. Focused share coverage passes 62/62, the complete
  serial suite passes 1,600/1,600 across 134 files, the production build and `git diff --check`
  pass, and an isolated 375×812 origin verified all four choices fit without overflow. See the
  2026-08-19 entries in [DECISIONS.md](DECISIONS.md).
- **Diario skill-focused prompts — deployed.** The optional prompt library grows from 24 to 42
  prompts with three grammar-skill categories beside the original four: **Narrate**
  (preterite/imperfect, reflexive routine, sequencing), **Imagine** (subjunctive, future,
  conditional, si-clauses) and **Connect** (ser/estar description, discourse connectors, por/para,
  object pronouns, comparisons). Each prompt embeds its structural constraint in its own text, so
  selection stays visit-local guidance and never stored metadata. Data-only change to
  `journalPrompts.js`; `SCHEMA_VERSION` stays 9. Focused coverage passes 19/19 and the complete
  serial suite 1,600/1,600, and a 375×812 dev-server flow confirmed each new category renders its
  six prompts with no horizontal overflow and a clear console. Both increments deployed from
  `main` at `7ed9aca` through Pages run
  [32292697167](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/32292697167). See the
  2026-08-19 entries in [DECISIONS.md](DECISIONS.md).
- **Pasear random continuation — deployed.** Pasear offers **Otra al azar** directly below its
  current center, sampling uniformly from every other saved Word or Phrase, so a dead-end
  neighborhood no longer requires returning to Cuaderno to draw again. The current lexical center
  is excluded so the action always moves somewhere new; the action hides when no alternative
  exists, and each draw is an ordinary transient Wander hop — Back preserves the route trail and
  the no-event, no-storage boundary stands. No schema, backup, preference or event-type change;
  `SCHEMA_VERSION` stays 9. Focused coverage passes 56/56, the complete serial suite passes
  1,602/1,602 across 134 files, the production build and `git diff --check` pass, and a disposable
  375×812 origin verified the 44px action, the move, Back restoring the prior center, and no
  horizontal overflow. Deployed from `main` at `976d9c0` through Pages run
  [32420448459](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/32420448459). See the
  2026-08-19/20 entries in [DECISIONS.md](DECISIONS.md).

- **Taller — Diario writing practice — deployed.** The Diario keeps "Write today" untouched and
  gains a quiet **Taller** door: a panel proposes one skill (the least-recently-practiced of
  Narrate/Imagine/Connect, rotating by local day before any practice data exists) with all seven
  prompt categories one tap away and an owner-edited **Mis temas** interest list (new
  `tallerTemas` preference riding the generic backup path, narrowly validated). A drill runs in
  the ordinary journal editor with every persistence path suppressed: the prompt at an optional
  easier/harder tier, a shuffleable tema nudge never spliced into the Spanish, always-visible
  regular endings for tense-targeted prompts, a word bank and a read-only live verb lookup from
  the installed dictionary (absent when none is installed), and sometimes 2–3 of the owner's own
  words as unlabeled chips that create no link and no event. **Keep or discard** replaces the
  save flow: keep writes one ordinary dated Journal entry — with one default-off tap to include
  the prompt as a quote block — and lands on its reader; discard confirms in two steps and keeps
  no text. Either way one `practice_write` event records skill, prompt id, tier, kept/discarded,
  offered word ids and tema — the first deliberate storage of prompt usage, under two narrow
  owner-approved amendments of the 2026-08-03 visit-local prompt rule and the never-automatic-
  body-text rule. Kept entries show a muted derived skill badge in the timeline; streak, history
  and coverage displays stay deferred until real practice data exists, and no AI participates.
  `SCHEMA_VERSION` stays 9: backup validation enumerates no event types, and the subject-less
  discarded-drill event round-trips, pinned by test. Weakness-aware prompt draws softly prefer
  tenses the Conjugation Gym's derivations mark weak. The complete serial suite passes
  1,640/1,640 across 137 files (run twice, around a shared `Card` rest-prop fix the closeout
  caught), the production build and `git diff --check` pass, three deliberate red/green proofs
  reddened as intended, and a disposable 375×812 closeout walked the door, panel, temas, tiers,
  scaffolds, a live r4 `sacar` lookup, keep-with-prompt, the timeline badge and the discard path
  by the numbers with zero horizontal overflow and a clean console. Deployed from `main` at
  `6d7dd34` through Pages run
  [32437421316](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/32437421316). See
  [docs/DIARIO-TALLER-DIRECTION.md](docs/DIARIO-TALLER-DIRECTION.md) and the Taller v1 entries
  in [DECISIONS.md](DECISIONS.md).

- **Lexical Structured Notes — deployed.** (Pushed 2026-08-21 as `2b8fabd` with the spacing
  follow-up `6195ee8`; both GitHub Pages runs completed successfully.) Schema
  v10 preserves every existing Word/Phrase `notes` string as its permanent **General note** and
  adds a mandatory one-level `noteSections[]` outline. Lexical Detail now supports multiple named
  Markdown sections and one subsection level with stable IDs, confirmed leaf deletion, and an
  explicit organizer for rename/reorder/promote/reparent; real saves log one ordinary `edit`, while
  cancel, disclosure and no-op saves log nothing. Search covers section names and visible Markdown
  body text with **in your notes**; connection/picker/Collection previews share General-first
  canonical order; review and free practice keep named sections behind a count disclosure. The
  v9→v10 migration adds only `noteSections: []` to lexical items, backup schemas 1–10 validate
  sequentially, and Page/lexical Notes IDs share global collision validation. The closeout also
  made the shared Notes header icons 44px and fixed Taller's daily proposal to use JournalHome's
  already-derived local date instead of silently consulting the wall clock. The complete serial
  suite passes 1,661/1,661 across 140 files; the production build transforms 2,136 modules; and
  `git diff --check` passes. A disposable seeded 375×812 origin exercised General note, a long
  root and subsection, full Markdown editor, organizer and name/body search: Notes stayed 328/328px,
  the document stayed within the 375px viewport, every visible Notes action met 44px, third-level
  nesting stayed absent, and the console was clean. See
  [docs/LEXICAL-STRUCTURED-NOTES-DIRECTION.md](docs/LEXICAL-STRUCTURED-NOTES-DIRECTION.md) and the
  2026-08-21 entries in [DECISIONS.md](DECISIONS.md).
- **Recent list expansion — deployed.** The Cuaderno landing's Recent card shows five items
  (was three) with a "Show more" toggle revealing up to ten; the expanded state is in-memory
  only and "Browse all" remains the full-list door. No schema, preference, event or backup
  change. The complete serial suite passes 1,659/1,661 across 140 files on the XPS: the two
  failures (`TallerDrill.test.jsx` keep-flow, `JournalEditor.test.jsx` prompt leak) predate this
  change on a clean checkout and look date-sensitive — recorded here so the next run is not read
  as a regression of this feature. The production build passes. No browser closeout: shipped from
  the headless XPS on test and build evidence only. See the 2026-08-23 entry in
  [DECISIONS.md](DECISIONS.md).
- **Contrasts lane — deployed.** The Conjugation Gym gains a fourth lane, Contrasts: four-choice
  cloze over curated original sentences in three sets — ser/estar (32 cards, conjugated-form
  options), por/para (32) and Connectors (26: pero, aunque, sin embargo, porque, por eso, así que,
  además, en cambio, mientras, entonces) — with a Set select, no immediate retry, one missed
  round, a reveal with the completed sentence, gloss and Grammar-guide links, and a "By pair"
  block with directional confusions in performance. Answers reuse `drill_pass` / `drill_fail`
  with `skill: "contrast"`, `pair`, `answer` and no `tense`; Forms performance now excludes
  recognition events structurally. `SCHEMA_VERSION` stays 10; no event type, preference or
  backup change. The complete serial suite passes 1,682/1,682 across 142 files on the XPS, the
  production build transforms 2,138 modules, `git diff --check` passes, and four deliberate
  failure proofs reddened as intended. No agent browser closeout: shipped from the headless XPS
  on test and build evidence plus the owner's phone check against the `--host` dev URL. Pushed
  2026-08-24 as `bc5c053`. See [docs/CONTRAST-LANE-DIRECTION.md](docs/CONTRAST-LANE-DIRECTION.md)
  and the "Contrasts lane" entries in [DECISIONS.md](DECISIONS.md).

`SCHEMA_VERSION` is **10**. Before Dexie opens v10, schema-v1 through schema-v9 owners must save and
acknowledge an untouched validated export. Direct legacy upgrades run meanings, page-profile,
relationship, composable-page, Grammar-hierarchy, Structured-Notes, entry-feedback and Apuntes
migrations, followed by Lexical Structured Notes, in order. Backup schemas 1 through 10 are
accepted, upgraded sequentially in memory, deeply validated as v10, and only then offered for
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
