# Improvement ideas

This document captures planning-level product ideas that may be worth discussing later. It is a
handoff aid for future chats, not an approved roadmap or permission to implement anything.

Before acting on an idea, a future coding agent must read `docs/AGENT-GUIDE.md`, confirm the current
project state in `README.md`, inspect the relevant implementation, and read the governing brief and
decision-log entries. The application's design may have changed since an idea was recorded.

## How to use this document

- The document is organized into three bands: **Active ideas** (open captures worth future
  discussion), **Deferred ideas** (owner-declined until a stated condition changes), and
  **Implemented ideas (history)** (compressed summaries of shipped work). Keep entries in their
  band and move them when their status changes.
- Add the date when an idea is first recorded and update **Last reviewed** when new evidence or a
  decision materially changes it.
- Keep **Status** explicit. Suggested values are `Captured`, `Exploring`, `Ready to plan`, `Planned`,
  `Deferred`, `Implemented`, and `Closed`.
- Record the owner's stated disposition in an **Owner interest** line whenever the owner has
  reviewed the idea. It is the difference between "recorded so it is not forgotten", "expects to
  pursue", and "declined unless something changes" — distinctions that would otherwise flatten
  into identical statuses.
- Distinguish an observed problem from a possible future benefit. An idea can be valuable without
  being a current problem.
- Record lightweight and structured options separately. They can have very different storage,
  migration, backup, and interface costs.
- Add real-use evidence before promoting a data-dependent idea into a phase. Synthetic data can
  test capability, but it cannot establish the owner's habits.
- When an idea becomes approved work, link its phase or implementation document here and move the
  entry to the Implemented band. ~~Keep the idea entry as history rather than silently rewriting
  the original reasoning.~~ **Amended 2026-08-12 (owner-approved):** an implemented entry is
  compressed to a summary plus links to its authoritative records (`DECISIONS.md`, the phase
  direction/report), keeping any still-open evidence or questions intact. The original full
  reasoning stays available in this file's git history; the Document history entries below are
  never rewritten.

Useful information to retain for each idea:

- description and current application context;
- potential options;
- expected owner value;
- risks and tradeoffs;
- architecture, storage, backup, or phase dependencies;
- evidence needed before deciding;
- rough timing or sequencing, when known;
- open questions and later decisions.

## Idea index

### Active

| Idea | Date added | Status | Earliest sensible discussion point |
|---|---|---|---|
| Conjugation catalog extensions | 2026-08-12 | Captured | When Phase 21's classifier next reopens; required-cell coverage must be swept before accepting either family |
| Monolingual recall (Spanish usage cues) | 2026-08-12 | Captured | After checking how many real meanings carry a usage cue |
| Retired-word spot checks | 2026-08-12 | Captured | Once a meaningful number of words are Retired; the demotion question needs an owner decision |
| Near-duplicate consolidation view | 2026-08-12 | Captured | Any time; view only — entry merging is a separate, larger decision |
| Dictionary word-family explorer | 2026-08-12 | Captured | When the pipeline next reopens (the English→Spanish index is the natural moment); a coverage pass over the raw dump comes first |
| Select text to look up | 2026-08-12 | Captured | Any time; read-only navigation glue over existing search |
| Paste a vocabulary list | 2026-08-12 | Captured | Needs a design discussion first: parsing, per-row meanings, event honesty |
| PWA app shortcuts | 2026-08-12 | Captured | Any time; manifest-only, recorded so it is not forgotten |
| "Did you mean" search suggestions | 2026-08-12 | Captured | Any time; a suggestion layer that leaves `normalize.js` untouched |
| English→Spanish lookup | 2026-08-12 | Captured | Needs a reference-layer index decision (pipeline and §5 seam) |
| Tag hubs | 2026-08-12 | Captured | Revisit when the owner has more tags and uses them more |
| Review→writing bridge | 2026-08-12 | Captured | Worth considering once Diario AI feedback and review volume coexist |
| Time-boxed mixed session | 2026-08-12 | Captured | After enough real data exists for "weakest" selections to mean something |
| Review forecast | 2026-08-12 | Captured | Low priority per owner; a small derived Estadísticas addition |
| Confusion-pair drills | 2026-08-12 | Captured | Any time; the annotations are already curated (promoted out of Learning depth history) |
| Android share target | 2026-08-11 | Captured | Any time; independent of other work and needs no schema change |
| Dictation cards | 2026-08-11 | Captured | After real use of the picture face settles the face-priority pattern |
| Non-verb grammar drills | 2026-08-11 | Captured | After Diario AI feedback accumulates evidence of which confusions recur |
| Frequency coverage | 2026-08-11 | Captured | Any time; a derived Estadísticas view over existing `freqRank` data |
| Phase 19/20 review nits (edge polish) | 2026-08-10 | Captured | Whenever a related area is next touched; none is urgent |
| Saved views | 2026-08-02 | Captured | Now discussable: Phase 8's lenses have been in daily use, so the owner can name repeated combinations |
| Personal-content provenance | 2026-08-02 | Captured | Before AI-proposed content is designed; the Phase 6 feedback field set a first precedent |

### Deferred

| Idea | Date added | Reopen when |
|---|---|---|
| Accent bar for typed inputs | 2026-08-12 | The owner's keyboard situation changes, or accent entry is observed slowing a typed session |

### Implemented (history)

| Idea | Date added | Implemented as | Full records |
|---|---|---|---|
| Phrase↔word containment links | 2026-08-12 | Phase 22a, deployed | `PHASE-22-DIRECTION.md`, `PHASE-22-REPORT.md` |
| Same-meaning clustering | 2026-08-12 | Phase 22b–22c, deployed | `PHASE-22-DIRECTION.md`, `PHASE-22-REPORT.md` |
| "Conjugates like" verb families | 2026-08-12 | Phase 21, deployed | `PHASE-21-DIRECTION.md`, `PHASE-21-REPORT.md` |
| Global tag management | 2026-08-10 | Phase 20, deployed | `PHASE-20-DIRECTION.md`, `PHASE-20-REPORT.md` |
| Markdown blank-line spacing | 2026-08-10 | Phase 19 increment, deployed | Phase 19 entries in `DECISIONS.md` |
| Explicit Notes callouts | 2026-08-10 | Phase 19 increment, deployed | Phase 19 entries in `DECISIONS.md` |
| Structured Notes outlines | 2026-08-10 | Phase 19 schema-v7 increment, deployed | `PHASE-19-DIRECTION.md`, `PHASE-19-REPORT.md` |
| Grammar guide depth and callouts | 2026-08-10 | Phase 19 first release, deployed | `PHASE-19-DIRECTION.md`, `PHASE-19-REPORT.md` |
| Owner-centric stats | 2026-08-06 | Phase 11, deployed | `PHASE-11-DIRECTION.md`, Phase 11 entries in `DECISIONS.md` |
| Learning depth (cloze, reverse, drill, audio) | 2026-08-06 | Phase 10a–10d, deployed | Phase 10 entries in `DECISIONS.md` |
| Typed or explained relationships | 2026-08-02 | Phase 4t–4x, deployed | Phase 4t–4x entries in `DECISIONS.md` |
| Persistent page profiles | 2026-08-02 | Phase 4j–4o, then composable Phase 7, deployed | `PHASE-7-DIRECTION.md`, `PHASE-7-REPORT.md`, `PHASE-4-JOURNAL-DIRECTION.md` |
| Source-oriented page templates | 2026-08-02 | Phase 7, deployed | `PHASE-7-DIRECTION.md`, `PHASE-7-REPORT.md` |
| Meaning-block presentation | 2026-08-02 | Phase 4i, deployed | Phase 4i entries in `DECISIONS.md` |

---

## Active ideas

### Conjugation catalog extensions

- **Date added:** 2026-08-12
- **Status:** Captured
- **Origin:** Phase 21 post-implementation corpus review
- **Owner interest:** Recorded so the measured observation is not lost; not approved for implementation
- **Potential data impact:** None to personal data; classifier/report changes would require a new
  replaceable dictionary package if later approved

The 28 paradigms still outside Phase 21's bounded catalog include two candidate groups worth a
future required-cell sweep: c→z before o/a behavior among verbs such as *vencer, convencer,
ejercer,* and *torcer*; and i-absorbing behavior among -ñir/-llir verbs such as *teñir, reñir,
ceñir,* and *gruñir*. These are evidence-backed candidates, not accepted families: duplicate
lemma consistency, contrast selection, overlap behavior, member counts, and top-frequency value
must be measured before changing the catalog.

---

### Monolingual recall (Spanish usage cues)

- **Date added:** 2026-08-12
- **Status:** Captured
- **Origin:** Consolidation-themed brainstorm, requested for the list by the owner 2026-08-12
- **Owner interest:** Requested with the rest of the consolidation batch; assessed as the
  deepest learning payoff of the five.
- **Potential data impact:** None expected; a card mode over existing structured-meaning data,
  following the established face/mode precedents

#### Description and current context

Structured meanings already store an optional short **Spanish usage cue**. A card mode asking
term → Spanish cue (or cue → term), skipping English entirely, is the first step toward thinking
in Spanish rather than through translation — the textbook definition of consolidation. Entries
without cues are excluded and explained, the pattern every card surface already uses. A welcome
side effect: it creates a reason to write cues, which are optional today and likely sparse.

#### Risks and tradeoffs

- Cue-recall is self-graded almost by necessity (a cue is free text; exact matching would grade
  phrasing, not understanding) — the reveal/self-grade machinery already exists.
- If cues are sparse, the mode starves; the coverage check below comes first.
- Whether this is a free-practice mode only or may join scheduled review needs the same
  face/grading-fairness discussion recorded under Dictation cards.

#### Evidence needed

- How many real meanings carry a usage cue — a disposable count over a backup export. Sparse
  cues make this a "write cues first" story, which may itself be the feature's first increment
  (a completeness view for missing cues).

---

### Retired-word spot checks

- **Date added:** 2026-08-12
- **Status:** Captured
- **Origin:** Consolidation-themed brainstorm, requested for the list by the owner 2026-08-12
- **Owner interest:** Requested with the rest of the consolidation batch.
- **Potential data impact:** None for a history-free version; a demoting version writes ordinary
  review events and needs its own approved decision

#### Description and current context

Retirement is currently a one-way door: a Retired word never resurfaces, so decay is invisible.
An **owner-started** "spot-check retired words" deck — a handful, sampled oldest-retirement-first
— keeps consolidated knowledge verifiably consolidated. Owner-started with no automatic
re-enrollment keeps it on the right side of §14's scheduling deferral.

#### The one real product decision

What a failed spot check *does* is the whole design: a history-free version (like hub practice)
merely informs the owner, while a demoting version writes a review event that puts the word back
on the Leitner ladder. Demotion is honest but turns a casual check into something with stakes;
history-free is gentle but leaves the decay it found unfixed. This mirrors, in miniature, the
Phase 13 decision that reversed the ungraded drill — worth deciding deliberately, not
defaulting.

#### Evidence needed

- Enough Retired words for sampling to mean anything, and the owner's own sense of whether
  retired words are actually slipping.

---

### Near-duplicate consolidation view

- **Date added:** 2026-08-12
- **Status:** Captured
- **Origin:** Consolidation-themed brainstorm, requested for the list by the owner 2026-08-12
- **Owner interest:** Requested with the rest of the consolidation batch.
- **Potential data impact:** None; a derived maintenance view offering only existing tools.
  Actual entry merging would be a separate, much larger decision

#### Description and current context

Phase 5f's duplicate guardrails act at creation time; nothing finds near-duplicates that
accumulated before them or slipped past — the same normalized term saved twice, or two entries
with heavily overlapping glosses. A derived maintenance view surfacing candidate pairs, offering
the existing tools (link them as `Variant`/`Similar meaning`, or edit one away by hand), fits
the completeness-view pattern the hub already has.

**Deliberately excluded from this idea:** automatic or assisted entry *merging*. Merging two
lexical entries means reconciling meanings, examples, links, Collection memberships and event
history — the same class of stored-inverse-data problem that kept persistent undo out of
Phase 20 (see Global tag management's watch items). The view is the safe first step; merging
would be its own proposal.

#### Evidence needed

- Whether real near-duplicates exist in the notebook at all — pre-guardrail entries are the
  likely population, and a disposable pass over a backup export answers it.

---

### Dictionary word-family explorer

- **Date added:** 2026-08-12
- **Status:** Captured
- **Origin:** Owner suggestion, assessed and requested for the list 2026-08-12
- **Owner interest:** Requested after review of the assessment, including the verified data facts
  below.
- **Potential data impact:** None to personal data; a new dataset version of the replaceable
  dictionary package (`mi-cuaderno-ref-a`/`-b`), with the §5 alias/orphan rules carrying the
  rebuild as usual

#### Description and current context

From *decidir*, explore related shipped lemmas such as *decisión* and *decisivo*, then open or
save them through existing flows. This is a **derivational**-family feature — words sharing a
root across parts of speech — and a vocabulary *growth* feature: it teaches "you almost know
three more words," and pairs naturally with Frequency coverage's "what next?" question.

Once family data ships, a **personal-layer shadow** comes nearly free and is the consolidation
reading of this growth feature: grouping the owner's own saved words by shared family ("you know
3 words from the *decidir* family"). Recorded here as a dependent extension rather than its own
entry — it has no life without the shipped data.

**Sibling idea, deliberately separate:** "Conjugates like" verb families, implemented as Phase
21 (history index above), is the **inflectional** counterpart — verbs sharing a paradigm — and a
*consolidation* feature. It derives from shipped paradigm tables, while this idea needs new source
fields; keeping them separate stops this coverage question from inheriting Phase 21's product
semantics merely because both appear at lookup time.

#### Verified data facts — 2026-08-12

Checked against the repository, not assumed:

- The raw Kaikki dump (`pipeline/raw/kaikki-Spanish.jsonl.gz`) carries the needed fields, per the
  spike's structure inspection (`pipeline/spike/out/02-kaikki-structure.json`, 807,155 records):
  `derived` on 6,189 records at word level and 9,183 at sense level; `related` on 5,241 and
  12,341.
- The build step that shapes shipped entries (`pipeline/build/04-entries.mjs`) never reads either
  field — the pipeline currently discards them.

#### Risks and tradeoffs

- **Coverage among kept lemmas is unknown.** The raw counts span mostly inflected-form records,
  and the pipeline filters lemmas by frequency; what fraction of the shipped 10,278 have a useful
  family needs a targeted pass over the raw dump before this is worth planning — the analogue of
  Phase 21's completed paradigm-count gate.
- **Family members may not be shipped.** Kaikki's `derived`/`related` lists can point at lemmas
  the frequency cut excluded, so the explorer must render "not installed" gracefully — and the
  agent-guide tripwire applies directly: "not installed" is **not** "orphaned".
- Family derivation must come from this data, never from string-stem heuristics — spelling
  similarity produces false relatives, and a wrong family member teaches a false connection.

#### Potential timing

The natural build moment is whenever the pipeline reopens for another reason — the
English→Spanish lookup index (above) is the obvious candidate — so one dataset rebuild carries
both. The coverage pass needs no rebuild and can run any time.

---

### Select text to look up

- **Date added:** 2026-08-12
- **Status:** Captured
- **Origin:** Owner suggestion, assessed and requested for the list 2026-08-12
- **Owner interest:** Requested after review of the assessment.
- **Potential data impact:** None; read-only navigation glue, no storage, no events beyond what
  the destination screens already log

#### Description and current context

Select a Spanish word or phrase inside a rendered Page or Diario entry and send it directly to
the existing dictionary/notebook search. The machinery mostly exists: two-layer search already
resolves inflected forms to their lemmas, and cross-tab Back navigation already retains the route
and search context that led to an entry, so returning to the paragraph after a lookup is solved
behavior. This is the lightweight sibling of the uncaptured assisted-reading idea — one word at
the moment of curiosity rather than annotating a whole text — and shipping it would generate
evidence for or against building assisted reading later. The Android share target (below) is the
same capture instinct pointed at text *outside* the app; this handles text already inside it.

#### Risks and tradeoffs

- The real design question is phone selection UX: Android's own text-selection toolbar competes
  for the same gesture, so the app needs its own quiet lookup affordance when a selection exists
  inside read-mode text, without fighting the system menu.
- Selection over rendered Markdown must yield clean text (selection APIs largely do this), and
  multi-paragraph or very long selections should degrade to something sensible rather than a
  garbage query.

#### Evidence needed

- None beyond real use; the friction (retyping a word you are already looking at) is
  self-evident, and the cost is small.

---

### Paste a vocabulary list

- **Date added:** 2026-08-12
- **Status:** Captured
- **Origin:** Owner suggestion, assessed and requested for the list 2026-08-12; absorbs the
  earlier uncaptured "bulk vocabulary import from a wordlist" brainstorm as its file-based
  variant
- **Owner interest:** Requested after review of the assessment; needs a design discussion before
  any plan.
- **Potential data impact:** New ordinary lexical entries only, created explicitly; no schema,
  backup or event-type change expected

#### Description and current context

Paste several lines copied from a lesson, subtitle list, or notes; preview each line's dictionary
match and duplicate status; then explicitly create only the selected entries as ordinary personal
words and phrases. Today vocabulary enters one entry at a time, which makes a lesson's worth of
words a chore. The project already holds every precedent this needs: the Collection picker's
staged quick-create, Phase 5f's duplicate guardrails, and Phase 12's import sheet — preview rows,
nothing selected by default, explicit confirm — is practically the template.

**Non-goal boundary, stated deliberately:** §13's merge-mode-import non-goal is about merging two
notebook *states* (backup files). This is explicit, previewed creation of new content and sits on
the safe side of that line — but it is near enough that the boundary should be restated in any
approved plan rather than assumed.

#### Potential options

1. **Paste-based (primary).** A textarea accepting one term per line; the simplest and safest
   parse.
2. **Pair parsing.** Split "term — meaning" lines into a prefilled meaning, which is what lesson
   notes actually look like; more useful and more ways to misparse.
3. **File-based variant (the earlier bulk-import brainstorm).** Accept a CSV or an exported list
   from another app through the same preview/confirm core. Same feature, different mouth; only
   worth its extra handling if a real file source exists in the owner's life.

#### Expected owner value

- Turns a lesson, episode, or article's vocabulary into notebook entries in one sitting instead
  of many.
- The preview step doubles as triage: duplicates surface before creation, and dictionary matches
  offer attachment at creation time.

#### Risks and tradeoffs

- **Hollow entries are the real hazard.** A bulk-created entry with no meanings is dead weight —
  card surfaces already exclude and explain meaningless entries. The preview should lean on each
  row's dictionary match to offer Phase 12-style sense import, or the feature manufactures a pile
  of entries the learning surfaces skip.
- **Event honesty.** N creations write N ordinary events into Recent activity and the streak —
  the same deliberate trade-off Phase 20 made for tag batches; its watch-item reasoning applies
  verbatim here.
- Parsing is where scope creeps: separators, duplicate lines within the paste, phrases versus
  words, and leading articles ("la mochila") all need unglamorous decisions.

#### Evidence needed

- Where the owner's lists actually come from (lesson notes, subtitles, another app's export),
  which decides between paste-only and the file variant, and whether pair parsing is worth its
  misparse risk.

#### Questions for a future discussion

- Does this live in the Words & phrases hub, the Cuaderno add flow, or both?
- Should a row with a dictionary match default to attaching the entry (`dictKey`), matching how
  the Collection picker treats dictionary selections?
- Is there any appetite for the file-based variant now, or does paste cover the real cases?

---

### PWA app shortcuts

- **Date added:** 2026-08-12
- **Status:** Captured
- **Origin:** Brainstorming session, reviewed by the owner 2026-08-12
- **Owner interest:** Recorded so it is not forgotten; the owner may or may not do it.
- **Potential data impact:** None; a manifest-only change

#### Description and current context

The web app manifest's `shortcuts` array puts entries like "New Diario moment", "Repaso" and
"Search" on the installed app icon's long-press menu on Android. No application code changes —
each shortcut is a URL into an existing screen, and the app is already installable. The one
implementation detail is that shortcut URLs must respect the `/mi-cuaderno/` base path.

#### Expected owner value

Shortens the path to the actions done daily. The Android share target idea (below) covers content
coming *into* the app; this covers reaching a chosen screen faster.

#### Evidence needed

None beyond trying it — the cost is low enough that a real-device check of how Chrome on Android
presents the shortcuts is the whole evaluation.

---

### "Did you mean" search suggestions

- **Date added:** 2026-08-12
- **Status:** Captured
- **Origin:** Brainstorming session, reviewed by the owner 2026-08-12
- **Owner interest:** A good potential idea.
- **Potential data impact:** None; a derived suggestion layer over existing search

#### Description and current context

When Cuaderno search returns nothing, offer near matches — a one-letter typo, a transposition, a
missing accent beyond what normalization already forgives. The Cuaderno root already records
misses, so this answers some of them at the moment they happen instead of leaving them in the log.

The critical boundary: `normalize.js` must not change, and suggestions must never widen *matching*.
"año" must never silently match "ano" — but a miss screen may *offer* "did you mean año?" as a
tap-through, because an offer the owner confirms is not a match. The suggestion layer sits
strictly above the search pipeline.

#### Potential options

1. **Personal layer only** — suggest near matches from the owner's own vocabulary, the smallest
   and most personally relevant candidate set.
2. **Both layers** — include dictionary lemmas, which is where a misspelled new word actually
   lives; requires the distance computation to stay fast over 10,278 entries or be indexed.

#### Risks and tradeoffs

- Edit-distance suggestions can surface embarrassing or absurd neighbors; a conservative distance
  threshold matters more than recall.
- The miss log currently records honest misses; if a suggestion is taken, deciding whether the
  original miss still logs affects the meaning of the recorded signal.

#### Evidence needed

- The recorded misses themselves: what fraction of real misses are near-misses of known content
  versus genuinely absent words. That decides whether option 1 suffices.

---

### English→Spanish lookup

- **Date added:** 2026-08-12
- **Status:** Captured
- **Origin:** Brainstorming session, reviewed by the owner 2026-08-12
- **Owner interest:** Wants it on the list.
- **Potential data impact:** None to personal data; likely a new derived index in the reference
  layer, which is rebuildable by design behind the §5 seam

#### Description and current context

Search is Spanish-first: an inflected Spanish form finds its lemma, but "how do I say
*stubborn*?" has no offline answer. The dictionary's English glosses are already shipped
on-device; indexing them for reverse lookup would let the bundled dictionary answer the question
learners ask most while writing — and it feeds naturally into Diario, where the need arises
mid-sentence.

#### Potential options

1. **Runtime gloss search** over existing entries, if fast enough on-device.
2. **A pipeline-built reverse index** shipped with the dataset, keeping runtime cost near zero at
   the price of a dataset rebuild (which the §5 seam and alias map already accommodate).

#### Expected owner value

- Answers the writing-direction question offline, which currently forces a trip to another app —
  precisely the exit the notebook exists to avoid.

#### Risks and tradeoffs

- Gloss text is not a bilingual dictionary: one English word maps to many Spanish entries with
  different registers and regions, so results need enough context (gloss, region labels) to
  choose between candidates rather than presenting a bare list.
- If built in the pipeline, it adds a dataset version consideration; the reference layer's
  replaceability makes this routine but not free.

#### Questions for a future discussion

- Where does reverse lookup live: the existing search field detecting an English query, or an
  explicit direction toggle?
- Do multiword glosses ("to be stubborn") match on the phrase, the head word, or both?

---

### Tag hubs

- **Date added:** 2026-08-12
- **Status:** Captured
- **Origin:** Brainstorming session, reviewed by the owner 2026-08-12
- **Owner interest:** An idea to revisit later, when the owner has more tags and uses tags more.
- **Potential data impact:** None; fully derived, no storage

#### Description and current context

Tags currently filter lists. A tag detail view would aggregate everything carrying an exact tag —
words, phrases, pages, and journal entries via the deliberate-search path — making tags a
browsable dimension rather than only a filter. Phase 20's global tag management keeps the tag
vocabulary tidy enough for hubs to stay trustworthy.

**Overlap to resolve with Saved views (below):** a tag hub is close to a persistent single-tag
view. Whichever idea is planned first should consciously answer whether it subsumes the other —
a hub is tag-only but zero-configuration, while a saved view is broader but needs naming and
maintenance.

#### Evidence needed

- Real tag volume and usage: hubs earn their place when the owner reaches for a tag expecting a
  place, not a filter. The owner has explicitly gated this on their own future tag use — check
  back when tags have grown, not on a date.

#### Questions for a future discussion

- Is a hub a screen of its own or an enriched filter state?
- Do Diario entries appear by default in a tag hub, or only behind the deliberate-search rule?

---

### Review→writing bridge

- **Date added:** 2026-08-12
- **Status:** Captured
- **Origin:** Brainstorming session, reviewed by the owner 2026-08-12
- **Owner interest:** Worth considering.
- **Potential data impact:** None; a transient prompt, nothing stored

#### Description and current context

After a review session with misses, offer a transient Diario prompt: "write a sentence using
*tozudo*." One line of glue between the app's two halves — the words missed in review are
precisely the ones the owner's writing never exercises, and Diario's prompt machinery is already
transient by design (prompts are visit-local and store no ID). This also serves the
active-vocabulary theme recorded in the document history on 2026-08-11.

#### Potential options

1. **A post-session action** ("write with these words") that opens a new Diario moment with the
   missed words available as a visible, unstored prompt.
2. **A Diario-side prompt source** — the existing prompt list occasionally offers "use a word you
   missed recently", derived from review events at render.

#### Risks and tradeoffs

- Must remain an offer, never an obligation: Diario's settled purpose is calm reflection, and a
  homework-shaped prompt could poison that. The existing prompt system's take-it-or-leave-it
  posture is the model.
- Selecting "recent misses" reads the event log at render — cheap and consistent with how
  everything else derives.

#### Evidence needed

- Whether the owner actually wants to write immediately after reviewing, or whether the two
  activities happen at different times of day — which decides between options 1 and 2.

---

### Time-boxed mixed session

- **Date added:** 2026-08-12
- **Status:** Captured
- **Origin:** Brainstorming session, reviewed by the owner 2026-08-12
- **Owner interest:** Should be on the list.
- **Potential data impact:** None expected; composes existing engines and writes only the events
  each engine already writes

#### Description and current context

"Give me five minutes": one owner-started sitting composing due Repaso cards with the Gym's
current weakest forms, sequenced rather than chosen one surface at a time. All the engines,
grading rules and event contracts exist; this is a front door, not new machinery. It stays on
the right side of §14 because nothing is scheduled, reminded or mandatory — the owner starts it,
exactly like every existing session.

#### Potential options

1. **Time-boxed** — fill roughly N minutes using known per-card pacing, ending at the box even
   mid-queue.
2. **Count-boxed** — "10 cards + 5 forms", simpler and more predictable than minutes.
3. **Due-first composition** — always drain due reviews before Gym content, so the scheduled
   queue never loses priority to practice.

#### Risks and tradeoffs

- Mixing surfaces mixes event contracts; the composition must keep each engine writing exactly
  what it writes today (review events from the scheduled pass, drill events from Gym answers)
  with no new session-level record.
- A "weakest forms" selection reuses Adaptive's existing definition rather than inventing a
  second notion of weakness.

#### Evidence needed

- Real data volume: with a small due queue and sparse drill history, a mixed session degenerates
  into whatever exists. The feature makes sense once both queues are routinely nonempty.

---

### Review forecast

- **Date added:** 2026-08-12
- **Status:** Captured
- **Origin:** Brainstorming session, reviewed by the owner 2026-08-12
- **Owner interest:** Can be added, but likely a low priority.
- **Potential data impact:** None; derived at render from the existing Leitner schedule

#### Description and current context

"12 due tomorrow, 40 this week" — the due dates already derive from the event log, so a forecast
is a small aggregation over the same computation Repaso runs today, displayed in Estadísticas'
derived-at-render pattern. It is display, not scheduling: no reminder, no badge, no obligation,
which keeps it clear of §14's deferral of automatic scheduling and reminders. It belongs to the
same family as the Phase 11 stats and their still-open retention/coverage/per-direction
breakdowns (see Owner-centric stats in the Implemented band).

#### Expected owner value

- Answers "what is coming?" so a heavy day is visible before it arrives — useful when deciding
  whether to review tonight or tomorrow.

#### Risks and tradeoffs

- Forecast displays can create quiet pressure; keeping it inside Estadísticas (sought out, not
  pushed) preserves the no-pressure temperament.

---

### Confusion-pair drills

- **Date added:** 2026-08-12 (promoted out of the Learning depth entry's "deliberately not built"
  list, where it had been recorded since 2026-08-06 and was invisible to anyone browsing open
  ideas)
- **Status:** Captured
- **Origin:** Phase 10 planning; dropped from that batch for scope only, and described there as
  attractive
- **Potential data impact:** None expected; the source data already exists as owner-curated
  `often_confused` and `contrast` relationship annotations

#### Description and current context

A drill built from the owner's own `often_confused` and `contrast` connection annotations: the
pairs the owner has personally marked as confusable are exactly the ones worth deliberate
practice. Since Phase 10 dropped it for scope, the machinery has matured — Phase 17's four-choice
recognition engine with curated confusables is close to what this drill needs, with the decks
drawn from personal annotations instead of shipped reference data.

**Sibling idea:** Non-verb grammar drills (below) practices *grammar* confusions from curated
reference data; this practices *vocabulary* confusions from the owner's own annotations. They
could share an engine but differ in data source and in what "curation" means.

#### Expected owner value

- Deliberate practice for precisely the confusions the owner has already caught themselves
  making — the highest-signal practice data in the notebook.

#### Risks and tradeoffs

- Needs enough annotated pairs to fill a session; with few pairs, the drill repeats itself
  immediately.
- A pair is two personal items; the drill must handle one side lacking meanings the same way
  existing card surfaces exclude and explain such entries.

#### Evidence needed

- How many `often_confused`/`contrast` annotations actually exist in the real notebook — the
  feature starts mattering at perhaps a dozen pairs.

---

### Android share target

- **Date added:** 2026-08-11
- **Status:** Captured
- **Origin:** Brainstorming session on unconsidered possibilities; not yet requested from real friction
- **Potential data impact:** None; a manifest and routing change only, no schema, storage or backup change

#### Description and current context

An installed PWA can register as an Android share target (`share_target` in the web app manifest).
Text or a URL highlighted in any other app — a browser article, a subtitle, a chat message — could
be shared straight into Mi Cuaderno instead of retyped. Today every encounter made away from the
app must be remembered and re-entered by hand, which is exactly where capture is most likely to be
lost. This moves capture to where encounters actually happen.

#### Potential options

1. **Shared text → lookup.** A shared word or phrase lands in the existing two-layer search
   (dictionary plus personal), from which the normal save/attach flows already exist.
2. **Shared URL → Source page.** A shared link prefills Source-page creation (URL into the existing
   Source identity field), using the established family-first creation flow.
3. **Both, dispatched by content.** A URL routes to Source creation, anything else to lookup, with
   a small chooser when ambiguous.

#### Expected owner value

- Removes the retype-it-later step for vocabulary met outside the app, where most new Spanish is
  actually encountered.
- Makes Source pages cheaper to start at the moment of consumption rather than after.

#### Risks and tradeoffs

- Android/Chrome-specific behavior; the share sheet entry exists only while the PWA is installed.
- The app is served under `/mi-cuaderno/`, so the share-target action URL and service-worker
  routing must respect the base path.
- A share arrives with no context; the receiving screen must degrade gracefully when the shared
  text is long prose rather than a word or phrase.
- Nothing may be saved implicitly: a share opens a screen, and every write stays behind the
  existing explicit save actions.

#### Evidence needed

- How often encounters currently die between another app and the notebook — the owner's sense of
  lost captures is sufficient; this does not need instrumentation.
- Whether shared content is mostly single words, phrases, or article URLs, which decides how much
  dispatch logic option 3 needs.

#### Questions for a future discussion

- Should a shared URL ever land anywhere other than Source creation (e.g., a Media link on an
  existing page)?
- What should long shared prose do — open lookup with the first word, or offer a picker?

---

### Dictation cards

- **Date added:** 2026-08-11
- **Status:** Captured
- **Origin:** Brainstorming session on unconsidered possibilities; not yet requested from real friction
- **Potential data impact:** None expected; additive `face` metadata on existing review events,
  following the cloze and image precedents

#### Description and current context

The browser's Spanish TTS voice (Phase 10d) speaks the term; the owner types what they heard. This
trains listening and spelling together — including accents, which the Phase 13 exact-first checker
already grades correctly (`hablo` vs `habló`). The card engine now has four question faces (term,
reverse, cloze, image) with an established priority rule and session-start snapshotting; a
dictation face would follow the same pattern. Everything runs on-device; TTS sends nothing
anywhere, and the existing rule that TTS-dependent surfaces hide entirely where the device has no
Spanish voice would govern availability.

#### Potential options

1. **A fifth question face** in the shared card engine, available in scheduled Repaso and free
   practice wherever Type mode is active, with a position in the face-priority order.
2. **A free-practice-only mode** first, keeping the scheduled queue unchanged until the face
   proves itself.
3. **A Gym lane** instead, treating dictation as a drill over a chosen pool rather than a face on
   vocabulary cards.

#### Expected owner value

- Trains the one skill pairing (listening + spelling) no current surface touches.
- Reuses the accent-aware checker, so a missing accent is a named near miss rather than a silent
  pass — the same reason the conjugation drill grades exactly first.

#### Risks and tradeoffs

- TTS quality varies by device; a mispronounced word grades the owner on the voice's error, not
  their listening. A per-card way to fall back to the plain face may be necessary.
- Spanish homophones and near-homophones (b/v, ll/y, silent h) make some words ungradable from
  audio alone; the checker or the card selection must account for words whose spelling cannot be
  recovered from sound.
- Scheduled grades from a new face affect the one Leitner ladder; the cloze/image precedent
  (additive metadata nothing reads) covers this, but the grading-fairness question is real.

#### Evidence needed

- Real use of the picture face: whether always-when-available face substitution feels right or
  needs owner control, before adding a fifth face to the same rule.
- Whether the device's Spanish voice is good enough to grade against — the existing pronunciation
  button provides this evidence passively.

#### Questions for a future discussion

- Where does dictation sit in the face-priority order relative to image and cloze?
- Should homophone-risk words be excluded automatically, accept either spelling, or be graded
  with a named near miss?

---

### Non-verb grammar drills

- **Date added:** 2026-08-11
- **Status:** Captured
- **Origin:** Brainstorming session on unconsidered possibilities; not yet requested from real friction
- **Potential data impact:** None expected; curated reference data plus existing
  `drill_pass`/`drill_fail` events with additive metadata, following the Usage/Endings precedent

#### Description and current context

The Gym's lane structure and engines generalize past conjugation: the four-choice recognition
engine (Phase 17) and typed production with exact-first grading (Phase 18) could drive drills for
*ser/estar*, *por/para*, preposition choice, and gender/article agreement. Each lane needs what
Usage needed: a curated item set with confusables and explanations. This is content work more than
engineering — the machinery is built.

**Sibling idea:** Confusion-pair drills (above) is the vocabulary-side counterpart, drawing decks
from the owner's own `often_confused`/`contrast` annotations rather than curated reference data.
A shared engine serving both is plausible; the data sources and curation burden differ.

#### Potential options

1. **One lane first.** Ship the single highest-value confusion (likely *ser/estar* or *por/para*)
   as one new lane with a curated deck, and let real use decide whether more follow.
2. **A generic confusable-pair lane** fed by curated data files, so later pairs are data additions
   rather than new lanes.
3. **Gender/article drills** driven by the dictionary's own entry data rather than hand curation,
   if the shipped entries carry reliable gender.

#### Expected owner value

- Extends deliberate practice to the errors that most persist for English speakers, which
  conjugation drills cannot touch.
- Reuses the Gym's session anatomy, missed rounds and performance reporting without new concepts.

#### Risks and tradeoffs

- Curation is the real cost: each item needs a correct answer, plausible distractors and an
  explanation, and a wrong or ambiguous curated item teaches the error it exists to prevent.
- Context-dependent items (*ser/estar* especially) can have two defensible answers; items must be
  chosen so the deck is objectively gradable, the same bar the Usage lane set.
- Every existing consumer of `drill_pass`/`drill_fail` (form statistics, Adaptive, Leitner replay)
  must explicitly ignore the new metadata kinds, as they already do for recognition answers.

#### Evidence needed

- Which confusions actually recur in the owner's own Spanish — Diario AI feedback is accumulating
  exactly this evidence, and it should pick the first lane rather than guessing from a textbook's
  priorities.
- Whether the dictionary's entry data carries gender reliably enough for option 3.

#### Questions for a future discussion

- First lane: *ser/estar*, *por/para*, or whatever the Diario feedback names most often?
- Do these belong inside the Conjugation Gym (renaming it), or as a sibling practice home?

---

### Frequency coverage

- **Date added:** 2026-08-11
- **Status:** Captured
- **Origin:** Brainstorming session on unconsidered possibilities; not yet requested from real friction
- **Potential data impact:** None; derived at render from existing `freqRank` reference data and
  the personal layer, in the Phase 11 pattern

#### Description and current context

The dictionary carries `freqRank`, and no stat uses it. Joining it against the personal layer
yields "you know N of the 1,000 most common Spanish words" — an absolute progress measure that
streaks and the Leitner ladder (which only measure activity and scheduling) cannot give. The same
computation inverted gives a browse view of high-frequency dictionary words not yet in the
notebook, a principled answer to "what should I learn next?" that the miss log cannot provide
(a search miss has no entry and therefore no rank).

**Not the same idea as the rejected "frequency weighting".** Phase 10 planning considered and
rejected weighting dictionary *suggestions* by `freqRank` (see Learning depth in the Implemented
band) — that rejection was about suggestion ranking and does not cover this, which is a display
statistic and a deliberate browse view. Neither re-litigates the other.

#### Potential options

1. **A single Estadísticas tile**: coverage of the top 1,000, perhaps with a small band breakdown
   (top 100 / 500 / 1,000 / 5,000).
2. **Coverage plus a browse view** of unsaved high-frequency words, feeding the existing
   save-from-dictionary flow.
3. **A "known" threshold choice**: saved at all, versus reviewed to some Leitner box, versus
   retired — each tells a different story.

#### Expected owner value

- An honest, motivating absolute measure of progress against the language rather than against
  the owner's own past activity.
- A ranked next-words list grounded in corpus frequency rather than whim.

#### Risks and tradeoffs

- Corpus frequency is not personal relevance; the words the owner needs for their life may rank
  low. The view must inform, not nag — no goal-setting, no pressure mechanics, per the project's
  no-analytics temperament.
- "Known" is genuinely ambiguous (option 3), and the tile is only honest if its definition is
  stated on the surface.
- Multiword phrases have no rank; coverage is a words-only statistic and should say so.

#### Evidence needed

- Whether `freqRank` coverage across the 10,278 shipped lemmas is dense enough for stable band
  percentages (what fraction of shipped entries carry a rank at all).

#### Questions for a future discussion

- Which "known" definition matches what the owner wants the number to mean?
- Does the browse view belong in Estadísticas, the dictionary surface, or the Words & phrases hub?

---

### Phase 19/20 review nits (edge polish)

- **Date added:** 2026-08-10
- **Status:** Captured
- **Origin:** Independent code review of the committed Phase 19 and Phase 20 branches found no
  correctness bugs. Three minor observations were deliberately left unfixed (per the working
  agreement, reviews do not implement) and are recorded here so they are not lost.
- **Potential data impact:** None; each would be a small behavior or accessibility refinement.

Verify each against the current code before acting — any of these may already have been fixed or
made obsolete by later phases.

1. **Interleaved-order organizer save writes an event (Phase 19).** In `saveGrammarOrganization`
   (`src/db/pageStructures.js`), the no-op signature is computed from the *stored* section order
   but compared after depth-first canonicalization. If a valid interleaved backup was imported, a
   save-without-changes in the Grammar organizer canonicalizes the stored order and logs one
   `edit`, slightly bending "no-op organization is event-free". Only reachable after importing an
   interleaved backup, and canonicalizing storage is arguably a real change; fix or formally
   accept.
2. **Resolved 2026-08-10 — Note callout announced "Note" twice (Phase 19).** The explicit Notes
   callout increment replaced the Grammar aside's duplicate `aria-label` with `aria-labelledby`
   wired to the one visible label, and the shared renderer applies the same accessible name to
   Notes-family callouts.
3. **Rename/merge kind seam between preview and transaction (Phase 20).** `TagManagementSheet`
   decides rename-versus-merge from its `items` prop, while `applyGlobalTagChange` re-plans from
   live index queries inside the transaction. If the prop were ever stale, a button labeled
   "Rename tag" could execute what is actually a merge without the merge confirmation. Effectively
   unreachable in a single-owner app whose mutations reload the notebook, and the atomic re-plan
   is the right design; a cheap belt-and-braces option is having the writer compare the caller's
   expected `kind` and abort on mismatch.

---

### Saved views

- **Date added:** 2026-08-02
- **Last reviewed:** 2026-08-12
- **Status:** Captured
- **Origin:** Preliminary information-architecture review and follow-up discussion
- **Potential data impact:** None for additional built-in presets; persistent preference/backup
  contract for owner-created views

#### Description and current context

Cuaderno currently offers type, maintenance, tag, and order controls. Those choices are intentionally
component-local and reset after leaving Cuaderno. A saved view would preserve a useful combination
such as "phrases missing examples," "recently added Mexico vocabulary," or "unlinked source pages."

A saved view is a temporary lens over canonical items, not a new category or a copy of the content.

**Overlap to resolve with Tag hubs (above):** a tag hub is close to a persistent single-tag view.
Whichever idea is planned first should consciously answer whether it subsumes the other.

#### Potential options

1. **Additional built-in presets.** Add a few fixed, broadly useful combinations without saving
   owner configuration.
2. **Remember last-used controls.** Restore the most recent state without introducing named views.
3. **Named saved views.** Save type, maintenance view, tag, order, and possibly search text under an
   owner-chosen name.
4. **Pinned views.** Give selected views a compact shortcut without making them top-level content.
5. **Rule-based collections.** Combine several criteria and possibly relationship or provenance
   rules.

#### Expected owner value

- Turns repeated retrieval and maintenance workflows into one action.
- Lets one item appear in several useful contexts without duplication.
- Makes a larger notebook easier to revisit without remembering filing choices.
- Could support recurring study, enrichment, source, or topic workflows.

#### Risks and tradeoffs

- A miniature query builder could be more complex than the notebook warrants.
- Views can become stale when tags disappear or their spelling changes.
- Restoring an active view can make items appear missing unless the UI clearly shows the filter.
- Saved searches may remain useful for less time than saved structural filters.
- Shortcuts can crowd navigation if they are treated like permanent content types.

#### Evidence needed

- Which filter combinations the owner repeatedly reconstructs.
- Whether recurring retrieval is based on tags, sources, dates, completeness, or links.
- Whether remembering the last state would solve the problem without named views.
- How many named views would remain useful after several weeks.

#### Potential timing

Observe real use of the Phase 5c controls first. A persistent view may fit the existing preferences
store without a new Dexie table, but it still needs a documented preference shape, backup/import
behavior, stale-reference handling, and a separately approved plan.

#### Questions for a future discussion

- Is the desired behavior "resume where I left off" or "maintain several named lenses"?
- Should query text ever be saved?
- Where would saved views live without crowding the three primary tabs?

#### Phase 8 overlap — 2026-08-04

The Words & phrases hub does **not** implement saved views, and the distinction is worth keeping
clear. Nothing it offers is saved or named: its five controls (where it lives, learning, view,
order, tag) are visit-local and reset on leaving, exactly like Cuaderno's. What changed is the
*vocabulary* of available lenses, not their persistence.

That makes the hub a source of the evidence this idea has been waiting for. Two questions it can now
answer that could not be asked before:

- Which of the five controls the owner reconstructs repeatedly, and in which combinations. A
  recurring pair such as "phrases, not in any page yet" or "words missing examples, tagged Mexico"
  is the concrete case for naming a view; a control that is set once and forgotten is not.
- Whether the pull is really "resume where I left off". The hub deliberately preserves its
  controls while the session trail is elsewhere but discards them on leaving, so the owner will
  feel both behaviours and can say which one they missed.

If named views are eventually wanted, the hub raises the cost slightly: a saved view would now have
to describe which surface it belongs to, since Cuaderno, Pages and Words & phrases no longer share
one control set. That is an argument for waiting on real use, not for building it sooner.

#### Evidence window open — 2026-08-12

Phase 8 deployed on 2026-08-04 and its lenses have been in daily use since. The evidence this
idea was parked on is now collectable: the next step is simply asking the owner which control
combinations they repeatedly reconstruct, and whether they miss "resume where I left off" when
returning to a hub. No instrumentation is needed or wanted.

---

### Personal-content provenance

- **Date added:** 2026-08-02
- **Last reviewed:** 2026-08-12
- **Status:** Captured
- **Origin:** Preliminary information-architecture review and follow-up discussion
- **Potential data impact:** Medium at entry level; high at meaning/field level; intersects links,
  events, backup, dictionary boundaries, and Phase 6 AI policy

#### Description and current context

Provenance answers where information came from or how it was produced. The replaceable reference
dictionary already records source IDs, dataset versions, licensing, and stock-example attribution.
Personal items do not have a comparable structured provenance model. A personal item may link to a
source page, retain a dictionary attachment, or describe its origin in notes, but those mechanisms
do not state exactly which content came from which source.

Several questions are currently grouped under "provenance": where an expression was encountered,
which source supports a meaning, whether content was personal/imported/AI-assisted, and whether
generated content was later edited. They may require different solutions.

#### Phase 6 second-slice precedent — 2026-08-12

The persisted Diario feedback field (schema v8, 2026-08-11) is the first live AI-provenance
decision, made by architecture rather than by a provenance model: AI-produced content is stored
in its own dedicated field on the entry it judged, never mingled with the owner's prose, one per
entry with replace/remove semantics, excluded from events and recency, and staleness-checked by a
content hash of what was reviewed. That answers "how is AI *commentary* kept distinguishable" —
by structural separation.

What it deliberately does not answer is the harder half of option 5 below: provenance for AI
content that becomes *owner content* — an AI-proposed word, meaning or example the owner approves
into the notebook, where structural separation is no longer possible because the content joins
the owner's own records. That decision is still needed **before** any AI-proposes-content design
(brief §9's approved proposed entries), and this precedent suggests the shape of the question:
either approved content carries an origin marker, or approval is defined as adoption and the
provenance is deliberately dropped. Phase 12's dictionary-import precedent is relevant too:
imported meanings deliberately carry no link back to their source senses.

#### Potential options

1. **Informal provenance.** Continue using linked source pages, media URLs, and notes.
2. **Entry-level origin.** Record an origin type, linked source item or URL, and capture date for the
   whole entry.
3. **Multiple source references.** Allow an entry to cite several encounters or supporting sources.
4. **Field- or meaning-level provenance.** Attach origin information to a particular meaning,
   example, or note.
5. **AI-specific provenance.** Record which content was proposed by AI, what was approved, and
   whether it was later edited.
6. **Content-history model.** Preserve a fuller record of imported, generated, and personal changes.

#### Expected owner value

- Makes it easy to return to the original learning context.
- Helps assess the trust and personal relevance of a meaning or example.
- Keeps personal writing, open-reference content, source-derived notes, and future AI drafts
  distinguishable.
- Supports source-based vocabulary browsing and review.
- Prevents AI-assisted content from becoming indistinguishable from verified personal observations.

#### Risks and tradeoffs

- One entry may combine information from several sources, making one origin misleading.
- Field-level provenance can make editing visually and conceptually heavy.
- "Heard in a podcast" could be stored both as a relationship and provenance, creating duplication.
- AI model metadata may age quickly and is not itself proof of correctness.
- A content-history system would be a major expansion; current edit events do not store field values
  or act as version history.
- Personal source context may contain private information and must remain on-device under current
  policy unless deliberately included in a future AI request.

#### Evidence needed

- How often the owner currently records sources in notes, media links, or linked pages.
- Whether provenance is needed mainly for rediscovery, trust, citation, or AI transparency.
- Whether entries commonly combine multiple sources.
- Which content units need provenance: whole entry, meaning, example, note, or individual edit.

#### Potential timing

Source-encounter needs can be studied during a real-data audit. AI provenance must be decided
before AI-proposed content is designed, so generated content does not establish an implicit
provenance model by accident — the feedback-field precedent above covers commentary only. A
durable implementation requires its own storage and backup plan.

#### Questions for a future discussion

- Is the primary question "where did I hear this?" or "who produced this content?"
- Is a typed link to a source page sufficient for common cases?
- Must AI provenance survive later manual edits, and at what level of detail?

---

## Deferred ideas

### Accent bar for typed inputs

- **Date added:** 2026-08-12
- **Status:** Deferred — owner-declined for now
- **Origin:** Brainstorming session, reviewed by the owner 2026-08-12
- **Owner interest:** The owner thinks this could be a good feature but is not interested in
  pursuing it unless something changes: their current keyboard makes adding accents low-friction,
  so the problem this solves does not exist for them today. Revisit only if the keyboard situation
  changes or typed-input friction is actually observed.
- **Potential data impact:** None; a reusable input-adornment component

#### Description and current context

A row of `á é í ó ú ñ ü` buttons above every typed input (conjugation drills, typed review modes,
any future dictation face) for phones whose keyboards make accents slow. The app deliberately
grades accents (exact-first, named near miss), so keyboard friction would otherwise grade the
keyboard rather than the owner's knowledge. One small component reused everywhere Type mode
exists.

#### Why it is deferred rather than captured

The value depends entirely on a friction the owner does not have. Recording it keeps the option
visible without implying work; the evidence that would reopen it is the owner noticing accent
entry slowing them down in a typed session.

---

## Implemented ideas (history)

Compressed summaries. The authoritative records are `DECISIONS.md` and each phase's
direction/report documents; each entry's original full reasoning is preserved in this file's git
history. Still-open evidence and questions are kept here in full.

### Phrase↔word containment links

- **Date added:** 2026-08-12 — **Status:** Implemented — Phase 22a, deployed
- **Records:** `PHASE-22-DIRECTION.md`, `PHASE-22-REPORT.md`, Phase 22 entries in `DECISIONS.md`

Lexical detail derives a read-only, bidirectional Word↔Phrase network through exact whole-token
terms and unambiguous cloze-safe attached-verb forms. A fixed function-word stop list, reference-
wide ambiguity suppression, exact-only reference failure fallback, preserved ñ, and explicit
clitic/ambiguous silent misses keep it conservative. No link, event, preference, schema field, or
dictionary package is created.

---

### Same-meaning clustering

- **Date added:** 2026-08-12 — **Status:** Implemented — Phase 22b–22c, deployed
- **Records:** `PHASE-22-DIRECTION.md`, `PHASE-22-REPORT.md`, Phase 22 entries in `DECISIONS.md`

At most three explained pairwise gloss-overlap proposals may appear outside Connections; sparse
POS only rejects known conflicts, and v1 deliberately stores no dismissal. Explicit confirmation
alone creates an ordinary stored-once Similar meaning edge. Direct confirmed edges—not raw
proposals or transitive neighbors—feed a shuffled, self-graded, event-free hub recall deck with
one missed-only round and an intentional cold start.

Real-notebook suggestion precision remains evidence to watch after deployment; a noisy recurring
proposal is not permission to add hidden dismissal storage or loosen whole-token matching.

---

### Global tag management

- **Date added:** 2026-08-10 — **Status:** Implemented — Phase 20, deployed
- **Records:** `PHASE-20-DIRECTION.md`, `PHASE-20-REPORT.md`, Phase 20 entries in `DECISIONS.md`

Ajustes is the single exact-tag maintenance home: rename to an unused spelling, explicit merge
into one existing tag, or global removal, in one timestamp-neutral atomic transaction with one
ordinary `edit` per changed item and an optional non-gating pre-change backup. Schema stayed v6.

#### Evidence to watch in real use — 2026-08-10

Recorded at review time so the deliberate Phase 20 trade-offs are re-examined against real usage
rather than rediscovered. None of these is a defect; each names the evidence that would justify a
follow-up product decision.

1. **Multi-variant consolidation friction.** The phase's origin problem was consolidating spelling
   variants, but merge is deliberately single-source: collapsing three variants into one takes two
   sequential merges, each with its own preview and confirmation. If the owner's real tag clusters
   are trios rather than pairs — repeated back-to-back merges of related spellings in practice —
   that is the evidence for promoting the deferred multi-source merge.
2. **Merge irreversibility rests on an opt-in backup.** The event log records that items changed,
   not their previous tag values, so after a merge nothing in the app can reconstruct which entries
   carried the old spelling. The safety net is the optional, non-gating **Export backup first**
   action. If a merge is ever regretted without a fresh export on hand, that is the evidence for
   revisiting persistent undo (which was excluded because it needs stored inverse data — a separate
   product decision, per `DECISIONS.md`).
3. **Batch maintenance inflates activity honestly.** One rename touching N entries writes N
   ordinary `edit` events into Recent activity, the calendar and the streak — chosen deliberately
   over a batch event type. If a large cleanup ever makes the stats screens feel dishonest or
   noisy, that is the evidence for reopening the grouped-batch-history deferral rather than
   filtering events after the fact.

---

### Markdown blank-line spacing

- **Date added:** 2026-08-10 — **Status:** Implemented — Phase 19 increment, deployed
- **Records:** Phase 19 blank-line entries in `DECISIONS.md`

A non-destructive Blank line action in Page Notes, Grammar Overview and Diario writes one exact
top-level standalone `<br>` per press, rendered as an unlabeled spacer and omitted from
visible-text consumers. Lexical notes unchanged; no schema, storage or backup change.

---

### Explicit Notes callouts

- **Date added:** 2026-08-10 — **Status:** Implemented — Phase 19 increment, deployed
- **Records:** Phase 19 callout entries in `DECISIONS.md`

Page Notes editors offer a Note callout beside Block quote; only a blockquote beginning with
`[!NOTE]` becomes a labeled accessible Notes-blue callout, and the marker stays out of search,
previews and AI-visible text. Ordinary blockquotes remain quotations; schema stayed v7.

---

### Structured Notes outlines

- **Date added:** 2026-08-10 — **Status:** Implemented — Phase 19 schema-v7 increment, deployed
- **Records:** `PHASE-19-DIRECTION.md`, `PHASE-19-REPORT.md`, Phase 19 entries in `DECISIONS.md`

Schema v7 keeps every Page body as Notes Overview and adds named top-level Notes sections plus
exactly one subsection level, sharing hierarchy mechanics with Grammar without a general block
editor. A nonempty outline deliberately counts as durable Page organization for the Pages/Diario
boundary; the brief records the asymmetry and the leaf-body deletion rule.

---

### Grammar guide depth and callouts

- **Date added:** 2026-08-10 — **Status:** Implemented — Phase 19 first release, deployed
- **Records:** `PHASE-19-DIRECTION.md`, `PHASE-19-REPORT.md`

Grammar sections gained safe formatted Overviews, accessible Note callouts and schema-v6 one-level
subsections, bounded deliberately short of arbitrary blocks or recursive page trees. Phase 19
remains the grouping home for later owner-approved Page organization/formatting increments — a
bookkeeping choice, not advance scope approval.

---

### Owner-centric stats

- **Date added:** 2026-08-06 — **Status:** Implemented — Phase 11, deployed
- **Records:** `PHASE-11-DIRECTION.md`, Phase 11 entries in `DECISIONS.md`

Study streak, 16-week activity calendar, cumulative growth line, Leitner ladder and per-item
learning strip, every number derived at render with no stored counters. Two owner decisions are
recorded in the direction doc: the streak amends the journal-streak deferral (journal-side streaks
stay deferred), and day-level activity counts events of since-deleted items. This entry previously
existed only as an index row; the section was added 2026-08-12 for completeness.

**Still open:** retention, coverage and per-direction breakdowns were deliberately excluded until
real data volume exists. The recorded `direction` metadata on review events is what a
per-direction answer would be built from, and the Review forecast idea (Active band) belongs to
this family.

---

### Learning depth (cloze, reverse, drill, audio)

- **Date added:** 2026-08-06 — **Status:** Implemented — Phase 10a–10d, deployed
- **Records:** Phase 10 entries in `DECISIONS.md`

Session direction (es→en / en→es / mixed), cloze cards from the entry's own examples with
conjugation-aware matching, an ungraded conjugation drill, and browser-TTS pronunciation — all
derived from existing data with no schema change. Several of its recorded open questions have
since been answered by later phases: the drill's ungraded/recordless design was reversed by
Phase 13 at the owner's request and expanded into the Conjugation Gym (Phases 14–18), and the
drilled-tense set grew accordingly.

**Deliberately not built then, and where those threads live now:**

- **Confusion-pair drills** — dropped for scope only; now promoted to its own Active entry
  (2026-08-12).
- **Frequency weighting** of dictionary suggestions — rejected as the weakest candidate, partly
  because a search miss has no entry and therefore no rank. The Active **Frequency coverage**
  idea is a different proposal (a display statistic, not suggestion ranking) and is not covered
  by this rejection.
- **Per-direction scheduling** — still deferred by §14; the `direction` metadata recorded since
  Phase 10 is what a future answer would be built from.

**Still-open evidence:** whether cloze fires often enough to be worth it; whether reverse/mixed
stay used once the novelty passes; whether one Leitner ladder across both directions stays
believable; and whether cloze should ever draw on Diario writing — the owner's own Spanish in
context (see also the active-vocabulary theme, document history 2026-08-11).

---

### Typed or explained relationships

- **Date added:** 2026-08-02 — **Status:** Implemented — Phase 4t–4x, deployed 2026-08-04
- **Records:** Phase 4t–4x entries in `DECISIONS.md`; approval and outcome entries in this file's
  document history

The approved hybrid shipped on schema v4: one fixed type (seven types, Similar meaning through
Related) plus one optional shared note per ordinary connection, stored as mandatory sparse
`linkAnnotations[]` with `subject: owner | target` for direction, while `linkedKeys[]` remained
the sole authority for existence. Link/unlink/type/note changes stay event-free bookkeeping;
relationship notes stay out of search, filters, Repaso and activity. The owner expressly waived
the real-link audit before approval. The disposable 375×812 browser closeout was never claimed
(the browser-control kernel could not initialize); the deployment itself was verified.

---

### Persistent page profiles

- **Date added:** 2026-08-02 — **Status:** Implemented — Phase 4j–4o (schema v3), evolved into
  composable pages as Phase 7 (schema v5), deployed
- **Records:** `PHASE-7-DIRECTION.md`, `PHASE-7-REPORT.md`, `PHASE-4-JOURNAL-DIRECTION.md`,
  Phase 4j–4o/4p–4s/4y and Phase 7 entries in `DECISIONS.md`

Phase 4j–4o stored two exclusive profiles (General, Vocabulary Collection) with durable ordered
groups, the Collection picker, reversible conversion and pins. Phase 7 replaced the exclusive
model: one `pageFocus` plus independently enabled Vocabulary, Source and Grammar structures,
Notes as the permanent foundation, and Diario derived from a date plus no enabled structure.
Phase 4p–4s built the separate Diario workspace over dated General pages without a stored Journal
profile; Phase 4y added lexical-side Add to Collection; Phase 9 added hub free practice without
expanding in-place Collection Practice. The richer-profile question stays evidence-gated: an
explicit Journal schema, custom page kinds and user-authored templates remain deferred (§14).

#### Diario: possible future directions and feasibility (still open)

Future changes should answer observed journal friction rather than add structure because a diary
app could have it.

| Possible direction | Feasibility in the current architecture | Evidence or decision needed first |
|---|---|---|
| Refine, replace or regroup prompts; add a session-only random prompt | Low effort and no schema change while prompt state remains transient | Which prompts the owner actually uses, skips or finds repetitive |
| Add calendar/month navigation, year summaries, or more journal-only filters | Low-to-medium effort; all can be derived from dated General pages | Whether timeline, archive and search fail to retrieve real entries efficiently |
| Adjust Today, Continue or prior-year memory selection | Low-to-medium effort with focused domain-test changes | Concrete cases where the current earliest-today, latest-other, or ±7-day rules feel surprising |
| Improve vocabulary capture from Diario | Medium effort using existing personal-entry and dictionary seams | Whether selecting only existing personal vocabulary interrupts writing; any dictionary path must make personal creation explicit and retain orphan handling |
| Add a journal-specific export or print view | Medium effort without changing stored entries | A real need beyond whole-notebook backup, plus a privacy-safe output format |
| Add structured mood, theme, gratitude, location, weather or stored prompt fields | High effort and a likely future schema migration with export-first and backup work | Repeated use showing that text, tags and links cannot support the desired retrieval or reflection |
| Add streaks, completion, trends or scheduled journal review | Medium-to-high product risk even if some results are event-derived | A clear learning/reflection outcome; avoid stored counters, analytics pressure and overlap with Repaso. **Amended 2026-08-06:** a study streak and activity heatmap are approved as Phase 11 (owner decision) — derived at render with no stored counters, and placed *in* Repaso rather than overlapping it. Journal-specific streaks, completion and trends in Diario remain deferred on this row's original terms |
| Introduce an explicit/richer Journal profile | High architectural cost and migration risk | Durable behavior that cannot be expressed by the separate workspace over a dated General page, including how it composes with Collection or future Source behavior |

#### Evidence still worth collecting from real use

- Whether the separate Diario tab increases writing and rereading without feeling like an
  obligation; which retrieval path (Today, Continue, scrolling, archive, search, memory) is
  actually used; whether prompts help and which categories recur.
- Whether Collections solve the vocabulary-hub use cases without excessive organizing work; which
  group structures recur; whether manual ordering stays useful as Collections grow.
- How often one page genuinely needs several specialized behaviors at once, and which desired
  behavior, if any, truly requires durable journal-only fields rather than text, tags, links,
  events or derived presentation.

---

### Source-oriented page templates

- **Date added:** 2026-08-02 — **Status:** Implemented — Phase 7, deployed
- **Records:** `PHASE-7-DIRECTION.md`, `PHASE-7-REPORT.md`, Phase 7 entries in `DECISIONS.md`

The original idea (reduce blank-page friction when capturing a film, podcast, book or article)
resolved into Phase 7's Source capability: optional source identity (format, creator, scope, URL,
context) plus one flat ordered capture stream, enabled independently rather than as an exclusive
page kind, with built-in family-first creation recipes that store no template identity. **Copy
page structure** is the only reuse mechanism. User-authored/stored template management, source
hierarchies, deep provenance and reading tracking remain deferred (§14). The Phase 4j–4o starter
gallery was the enabling precedent: creation-only seeding without permanent classification.

---

### Meaning-block presentation

- **Date added:** 2026-08-02 — **Status:** Implemented — Phase 4i, deployed
- **Records:** Phase 4i entries in `DECISIONS.md`

The one `translation` string became structured `meanings[]`: each ordered meaning has a stable
personal `meaning:<uuid>` independent of dictionary senses, an English gloss, optional Spanish
usage cue, compact region/usage/grammar labels, and optional note and assigned examples. The
entry remains the review and scheduling unit; schema-v1 multiline translations migrated one
nonblank line at a time. Approved after workshopping the polysemous verb *sacar*. Phase 12 later
added optional import of dictionary senses as ordinary meaning records with no link back.

---

## Document history

- **2026-08-12 — Phase 22 deployed.** The verified four-commit fast-forward reached `main` at
  `022e1b6`, and GitHub Pages run 31661654898 completed successfully. The two implemented idea
  statuses now describe deployed reality; the earlier local-only history remains as the state at
  that time.
- **2026-08-12 — Phase 22 implemented and verified locally; not deployed.** The three slices now
  pass 1,341/1,341 serial tests, the production build, diff check, deliberate red/green proofs and
  a disposable 375×812 flow covering containment, ambiguity suppression, explicit stored-once
  confirmation and direct-link recall. The two idea entries move to Implemented history; their
  only still-open evidence is real-notebook suggestion precision after a future deployment.

- **2026-08-12 — Phrase↔word containment, same-meaning proposals, and confirmed-link recall are
  approved as Phase 22.** The three-slice direction deliberately accepts reappearing false-positive
  suggestions instead of adding a backed-up dismissal preference, treats sparse POS as a
  best-effort guard, records ambiguous and clitic-attached containment as silent v1 misses, keeps
  derived rows visibly outside ordinary Connections, and sequences recall last because it has no
  honest deck before the owner confirms at least one Similar meaning edge. Deployment closeout must
  synchronize README Status under the 2026-08-11 rule.

- **2026-08-12 — Five consolidation-themed ideas captured: phrase↔word containment links,
  same-meaning clustering, monolingual recall over Spanish usage cues, retired-word spot checks,
  and the near-duplicate consolidation view.** All five came from a brainstorm on consolidation —
  strengthening the network between things the owner already knows, as distinct from acquisition
  and maintenance — and were requested for the list together. Each stays inside existing
  boundaries: containment and clustering are derived display/suggestion layers that touch no link
  authority, monolingual recall reuses the excluded-and-explained card pattern, spot checks are
  owner-started per §14 with the demotion question named as the one real product decision, and
  the duplicate view deliberately excludes entry merging (the Phase 20 stored-inverse-data
  reasoning). The word-family explorer entry also gained its dependent personal-layer extension.
  Captured concurrently with Phase 21's own doc updates, which this pass merged around rather
  than disturbing. None is approved work.

- **2026-08-12 — Dictionary word-family explorer captured as its own entry, deliberately
  separate from "Conjugates like" verb families.** The two share the family-at-lookup pattern
  but differ in kind (derivational vs. inflectional) and in cost: conjugation families derive
  from shipped paradigm tables today, while derivational families need a dataset rebuild. The
  entry records repository-verified facts — the raw Kaikki dump carries `derived`/`related`
  fields that `pipeline/build/04-entries.mjs` currently discards — plus the two honest caveats
  (coverage among the shipped 10,278 lemmas is unmeasured; family members may not be shipped,
  invoking the "not installed" ≠ "orphaned" tripwire) and the timing note that the
  English→Spanish index rebuild is the natural moment to carry both.

- **2026-08-12 — Two owner-suggested ideas captured: Select text to look up and Paste a
  vocabulary list.** Both were owner suggestions assessed in discussion and requested for the
  list. The paste entry absorbs the earlier uncaptured "bulk vocabulary import from a wordlist"
  brainstorm as its file-based variant, and deliberately restates the §13 merge-mode-import
  boundary it sits beside: merging notebook states remains a non-goal, while explicit previewed
  creation of new entries is on the safe side of that line. A third suggestion from the same
  discussion, reading the owner's writing aloud through the existing on-device voice, was
  assessed favorably but not requested for capture. Neither captured idea is approved work.

- **2026-08-12 — Owner-approved restructure: three bands, compressed history, and convention
  updates.** The document reorganized into Active / Deferred / Implemented (history) bands with a
  banded index, and the eleven implemented entries compressed to summary-plus-links per an
  owner-approved amendment to the keep-as-history rule (full original reasoning remains in git
  history; still-open evidence and questions were kept in place). In the same pass: an
  Owner-centric stats section was added for the index row that previously pointed nowhere;
  Personal-content provenance was re-reviewed to record the Phase 6 feedback-field precedent;
  Saved views was re-reviewed to note its Phase 8 evidence window is open; Confusion-pair drills
  was promoted out of Learning depth's "deliberately not built" list into its own Active entry;
  cross-references were added between Frequency coverage and the rejected frequency weighting,
  between the two drill siblings, and between Tag hubs and Saved views; and the how-to now
  documents the Owner interest convention and the banding. No idea changed approval state.

- **2026-08-12 — Nine ideas recorded from the second brainstorming pass, each with the owner's
  stated interest level.** Eight are Captured: PWA app shortcuts (so it is not forgotten),
  "did you mean" search suggestions, English→Spanish lookup, "conjugates like" verb families
  (owner expects to pursue), tag hubs (revisit when tags are used more), the review→writing
  bridge (worth considering), the time-boxed mixed session, and the review forecast (low
  priority). One is Deferred at the owner's direction: the accent bar for typed inputs, a
  feature the owner considers good but declines while their keyboard keeps accent entry
  low-friction. Owner-interest lines distinguish these dispositions from ordinary captures;
  none is approved work.

- **2026-08-11 — Four ideas captured from a brainstorming session: Android share target,
  dictation cards, non-verb grammar drills, and frequency coverage.** All four are Captured, not
  approved: they came from a discussion of unconsidered possibilities rather than observed
  friction, and each records the evidence that would justify promotion. None changes schema,
  storage or backup as described. Two adjacent ideas from the same session were deliberately not
  captured: assisted reading (large enough to deserve its own discussion first) and active
  vocabulary detection (worth capturing once Diario volume makes it testable).

- **2026-08-11 — Status sweep: stale "implemented locally; not deployed" claims synced to
  deployed reality.** Local `main` and `origin/main` both sit at `9503f96`, and the GitHub Pages
  runs for the recent pushes (through the picture-front commit) completed successfully, so
  Phases 10, 11, 4t–4x, 7, the Phase 19 callout/blank-line increments and Phase 20 are all live.
  Index rows and section Status lines were updated, and a missing index row was added for
  Markdown blank-line spacing. `README.md` was synced in the same pass: `SCHEMA_VERSION` corrected
  to 8, and bullets added for the three deployed 2026-08-11 increments (persisted Diario feedback,
  inline media rendering, picture-front flashcards). Document-history entries below keep their
  original wording as history. No idea changed approval state.

- **2026-08-06 — Phase 10a–10d implemented locally.** Recorded the learning-depth batch: session
  direction, cloze cards, the ungraded conjugation drill and browser pronunciation, all without a
  schema change or a new event type. The complete serial suite passes 762/762 across 71 files,
  the production build passes, four deliberate red/green proofs hold, and a disposable 375×812
  browser closeout covered all three directions, the drill and the speaker controls. That closeout
  found a real defect the unit tests could not have caught — cloze preferred the owner's examples
  in name only — which is fixed and now covered by a test that fails against the old behaviour.
  No push or deployment is claimed.

- **2026-08-04 — Phase 8 implemented locally; not deployed.** Recorded the Words & phrases hub's
  overlap with Saved views under that idea: the hub adds organizing lenses but keeps every control
  visit-local, so it supplies evidence for the saved-view question rather than answering it. No idea
  was promoted; Saved views remains Captured. See [PHASE-8-DIRECTION.md](PHASE-8-DIRECTION.md) and
  [PHASE-8-REPORT.md](PHASE-8-REPORT.md).

- **2026-08-04 — Phase 7 deployed from `main`.** The approved `phase-7-composable-pages`
  fast-forwarded into `main` at `982bae5`; GitHub Pages workflow run
  [30966093217](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/30966093217)
  completed successfully. The disposable 375×812 browser closeout remains unverified because the
  in-app browser could not initialize; no owner browser data was inspected.

- **2026-08-04 — Phase 7 automated closeout passed; browser closeout unverified.**
  `npm.cmd test -- --no-file-parallelism` passed 58 files / 593 tests in 229.90s,
  `npm.cmd run build` passed after Vite processed 1,863 modules in 4.49s, and
  `git diff --check` passed. The in-app browser failed before fixture setup with
  `failed to write kernel assets: The system cannot find the path specified. (os error 3)`, so the
  disposable 375×812 flow remains unverified. No owner data was inspected, and no push or
  deployment is claimed.

- **2026-08-04 — Phase 7 implemented locally; release verification pending.** Promoted
  Source-oriented page templates and the composable evolution of persistent page profiles from
  Planned to Implemented locally. Schema v5, the unified page workspace, creation recipes, Source,
  Grammar, exact Source references, and contextual retrieval are present on the feature branch.
  The final serial suite, production build, disposable 375×812 browser closeout, push, and
  deployment are not claimed.

- **2026-08-04 — Phase 7 approved for implementation.** Promoted Source-oriented page templates
  and the composable evolution of persistent page profiles to Planned. The approved schema-v5
  direction replaces exclusive page profiles with one focus plus independently enabled Vocabulary,
  Source and Grammar structures; retains derived Diario; adds built-in creation recipes and
  copy-empty-structure without template identity; and records contextual retrieval, migration,
  backup and first-release exclusions in `PHASE-7-DIRECTION.md`. This is an approval record, not an
  implementation or deployment claim.

- **2026-08-04 — Phase 4y deployed.** Fast-forwarded and pushed `main` at `c716e9d`; GitHub Pages
  workflow run 30955868049 passed both jobs, and the live site returned HTTP 200 with the verified
  `index-BpNcWMY7.js` asset. The disposable phone-width browser check remains pending.

- **2026-08-04 — Phase 4y implemented locally.** Recorded the owner-observed reverse-capture gap,
  the schema-free Add to Collection flow, ordinary-picker guard, lossless promotion behavior,
  501-test serial suite and production build. Phone-width browser verification remains pending;
  no push or deployment is claimed.

- **2026-08-04 — Phase 4t–4x deployed.** Fast-forwarded and pushed `main` at `eb93c90`; GitHub
  Pages workflow run 30949552774 passed both jobs, and the live site returned HTTP 200 with the
  verified build asset. The disposable phone-width browser closeout remains pending.

- **2026-08-04 — Phase 4t–4x implemented locally.** Promoted typed and explained relationships from
  Planned to Implemented locally after the 493-test serial suite, production build, and deliberate
  failure proofs passed. The disposable phone-width browser closeout remains pending because the
  browser-control runtime could not initialize; no deployment is claimed.

- **2026-08-04 — Typed and explained relationships approved.** Promoted the idea from Captured to
  Planned as Phase 4t–4x, recorded the owner's real-link-audit waiver and seven-type decision, and
  locked schema-v4 sparse annotations, event/recency behavior, seam constraints, and first-release
  exclusions. Implementation is in progress; this entry does not claim the phase has shipped.

- **2026-08-02 — Created.** Established the planning-record format and added the first six ideas
  from the preliminary information-architecture discussion. No idea was approved for implementation.
- **2026-08-02 — Meaning blocks approved.** Promoted meaning-block presentation from Captured to
  Planned after the owner selected the structured option and approved the implementation plan.
- **2026-08-02 — Phase 4i implemented locally.** Schema v2, export-first migration, v1 backup
  upgrading, structured creation/detail/organization, search, maintenance and entry-level Repaso
  are implemented and automated tests/build pass. Final seeded 375 px browser acceptance remains.
- **2026-08-03 — Phase 4j–4o implemented and accepted locally.** Promoted persistent page profiles
  for General and Vocabulary Collection, and marked Source/Grammar, richer Journal,
  custom/user-authored templates, and richer structured submodels Deferred. The final serial suite
  passed 393/393, the production build passed, and the disposable 375×812 browser flow covered
  upgrade, creation, capture, organization, Practice, conversion, retrieval and backup restore.
  Production deployment remains pending.
- **2026-08-03 — Phase 4j–4o implementation-idea follow-up.** Recorded the concrete problems the
  first profile release addressed, separated the still-unresolved Source use case, and narrowed
  future questions to composable page behavior, richer profiles, reusable starters, provenance,
  and possible Practice expansion. The accepted commits are pushed on
  `codex/page-profiles-collections`; production deployment remains pending.
- **2026-08-03 — Phase 4j–4o shipped.** Fast-forwarded General and Vocabulary Collection to
  `main`; GitHub Pages deployment and the production 375×812 schema-v3 smoke test passed. The
  original Collection problem is closed, while the Source-specific and composable-profile
  questions above remain deliberate future work.
- **2026-08-03 — Phase 4p–4s Diario implemented locally.** Recorded the separate workspace's
  reflection-first purpose, completed creation/retrieval/writing/reading behavior, deliberate
  migration-free boundaries, and evidence-gated future possibilities. The complete 422-test suite,
  production build and disposable 375×812 closeout passed; push and deployment remain pending.
- **2026-08-03 — Phase 4p–4s Diario shipped.** The final post-review autosave guard passes the
  complete 423-test suite and production build. `main` deployed successfully through GitHub Pages,
  the deployment points at the journal release commit, and the live application responds normally.
  The richer-profile possibilities above remain evidence-gated future work.
