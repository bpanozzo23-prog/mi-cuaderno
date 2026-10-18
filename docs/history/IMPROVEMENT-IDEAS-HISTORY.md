# Improvement ideas — historical records

Archived 2026-10-17 from the ideas file at `b48a948` (with archive-path repairs).
These are dated records, including superseded statuses and original evidence requirements.
[Open ideas and their continuing context](../IMPROVEMENT-IDEAS.md) remain together in one file;
[CURRENT](../CURRENT.md) owns deployment status and pending verification. Taller and Contrasts
have shipped; Historia 25a shipped while 25b stopped at its data-quality gate.

## Graduated during the reset

### Diario skill-practice prompting suite

- **Date added:** 2026-08-20
- **Last reviewed:** 2026-08-20 — workshopped into an approved direction the same day. A
  multi-round owner workshop settled the full v1 design (the **Taller** door, drills in the
  ordinary editor with keep-or-discard, rich practice events, a tema interest layer, static plus
  dictionary-powered scaffolds, tiers, quiet derived timeline badges, no AI, record-don't-display
  tracking). The contract is `docs/history/phases/DIARIO-TALLER-DIRECTION.md`; own-voice recycling was ranked
  below the three chosen features and stays captured here rather than entering v1.
- **Status:** Ready to plan — direction approved
- **Origin:** Owner direction after the 2026-08-19 skill-focused prompt categories deployed
  (`7ed9aca`); recorded from the follow-up prompting-directions discussion, 2026-08-20
- **Owner interest:** Expects to pursue. The owner explicitly opened the door to amending the
  2026-08-03 "visit-local guidance, never stored metadata" prompt rule: serious diary/journaling
  work happens outside the app in English, so the Diario is more likely to be used — and used
  more — as a space for deliberately working on Spanish skills, while still receiving some
  reflection-style entries.
- **Potential data impact:** Splits by option. The derived-only options need no storage at all;
  prompt-usage memory or per-skill tracking would need a new event, preference, or field and
  therefore §5 in full plus an explicit amendment of the 2026-08-03 rule in `DECISIONS.md`.

#### Description and current context

The prompt library (42 bilingual prompts, seven categories, `src/lib/journalPrompts.js`) is
static and anonymous: nothing knows which prompts are used, and prompts know nothing about the
notebook. The captured options deepen the classroom character in rough order of cost:

- **Vocabulary-integrated prompts** — a prompt variant that samples 2–3 of the owner's own items
  (due in Repaso, or recently created) and shows them as chips to work into the entry. Fully
  derived at render, in the same style as the Cuidar hub's per-visit samples.
- **Weakness-aware grammar prompts** — bias Narrate-style prompts toward the owner's weakest
  tenses using the Conjugation Gym's existing derivations (`conjugationStats.js`). Derived only.
- **Own-voice recycling** — prompts that point at the timeline: retell an old entry in another
  tense, rewrite three past sentences with new connectors. Needs no data support at all.
- **Micro-scaffolds** — a transient word bank under a chosen skill prompt (connectors, time
  markers, subjunctive triggers). Data-only addition to the prompt records.
- **Difficulty tiers** — two variants per skill category, mixed in or behind a subtle toggle.
- **AI review with a declared focus** — the Phase 6 entry review accepts an optional focus chosen
  at review time ("attend to preterite vs. imperfect"). Grows the workshopped, test-pinned
  review prompt, so it needs its own small direction discussion; §9 disclosure posture governs.
- **Prompt-usage memory / per-skill tracking** — no-repeat windows, "which skills have I practiced
  lately", per-category streaks. Each requires storing prompt usage, i.e. the rule amendment and
  a real storage decision; weigh against the app's anti-tracking ethos (Cuidar's no-counters
  design) before choosing this over the derived alternatives.

#### Considerations recorded at capture

- Considered and set aside at capture: AI-generated prompts (the static bilingual list is
  auditable, offline, and free; generation adds spend and provenance questions for marginal
  variety) and unprompted prompt display on the Diario landing (the pull-model "Need a prompt?"
  matches the app's no-nagging character).
- The 2026-08-03 rule amendment, when made, should say precisely what becomes storable (prompt
  ids used? skill categories? dates?) rather than dropping the rule wholesale — most captured
  options need no storage, and the rule's anti-classification instinct still protects ordinary
  reflective entries.

### Historia word families

- **Date added:** 2026-08-13
- **Status:** Split 2026-08-13 — Phase 25a implemented and deployed at `1432dd1`; Phase 25b
  stopped at its mandatory r4 quality gate before UI work
- **Origin:** Owner selection from the 2026-08-13 Historia-strengthening discussion, scoped the
  same day in a seven-question workshop
- **Records:** `PHASE-25-DIRECTION.md`, `PHASE-25-REPORT.md`, Phase 25 entries in `DECISIONS.md`
- **Potential data impact:** None; render-time derivation over existing personal data and the
  installed r4 dictionary. Schema stays 8; no event, preference, or package change

#### Description and current context

Historia's habitat now shows **25a — conjugation family** on the live site, mirroring the wander
card's family group (saved Phase 21 paradigm siblings plus the What-to-notice teaching exit)
through one shared, word-only derivation — a rule that also narrowed the wander card's own family
edge for attached phrases, recorded in the direction's Wander boundary amendment. The proposed
**25b — derivational family** stopped
at its required pre-UI audit:
only 17.68% of r4's listed relation terms resolve to shipped lemmas, and the flattened field mixes
genuine derivations with broad relations while discarding target entry identity. Exact matching
therefore cannot prevent false family claims. `relatedWords` remains dormant; any revival needs a
separately approved reference-data redesign. The unsaved-relative growth reading remains with the
separate Dictionary word-family explorer idea below.

---

## Implemented ideas (history)

### Non-verb grammar drills

- **Date added:** 2026-08-11 — **Status:** Implemented — Contrasts Gym lane, verified locally
  2026-08-24; not yet pushed or deployed
- **Records:** `docs/history/phases/CONTRAST-LANE-DIRECTION.md`; "Contrasts lane" entries in `DECISIONS.md`
- **Owner interest:** Chose ser/estar and por/para directly on 2026-08-24 while reviewing
  cloze/MCQ drill ideas, rather than waiting for Diario AI feedback to name the first pair.

Option 1 of the capture ("one lane first") shipped as a fourth Gym lane: 32 ser/estar cards with
conjugated-form options and 32 por/para cards, four-choice cloze through the Phase 17 engine,
`drill_pass`/`drill_fail` with `skill: "contrast"`, `pair`, `answer` and no `tense`, per-pair
statistics with directional confusions, and Grammar guide links on multi-word terms. Form
Performance's recognition guard became structural in the process. The Gym keeps its name; the
sibling-practice-home question stays open.

A same-day follow-on added **Connectors** as a third set in the lane (26 cards: `pero`, `aunque`,
`sin embargo`, `porque`, `por eso`, `así que`, `además`, `en cambio`, `mientras`, `entonces`).

**Still open:** preposition choice beyond por/para and gender/article agreement (option 3) remain
unbuilt; the capture's advice to let Diario AI feedback name the *next* set still applies. The
vocabulary-side sibling, Confusion-pair drills, stays captured.

---

Compressed summaries. The authoritative records are `DECISIONS.md` and each phase's
direction/report documents; each entry's original full reasoning is preserved in this file's git
history. Still-open evidence and questions are kept here in full.

### Suppressed-containment confirmation

- **Date added:** 2026-08-15 — **Status:** Implemented — same-day increment, deployed
- **Records:** "Suppressed-containment confirmation tier" entries in `DECISIONS.md`

Realizes the link-promotion increment `PHASE-23-DIRECTION.md` anticipated, scoped to the matches
the Phase 22 ambiguity oracle deliberately hides. Detail's "From your cuaderno" card now proposes
a suppressed inflected match (*Creo que* → *creer*, evidence shown: `also a form of crear`) with
one explicit accept that writes the ordinary stored-once `found_in` edge — no event, no dismissal
memory, oracle and matcher untouched. Candidates require a form posting naming the attached lemma
among others; stop-word surfaces (the 28-row *dé* → `de` → *dar* artifact) never propose.

Evidence that sized it: a diagnostic over the owner's real 2026-08-15 export found 48 suppressed
rows against 83 shown — 28 artifact, ~16 genuine misses, ~4 correct suppressions. Real-use
evidence to watch: whether wrong proposals (*al vino, vino* → *venir*) recur annoyingly enough to
justify a dismissed-pairs durability decision, and whether prose-containment candidates (a
different product question, Historia-side) become worth their own discussion.

---

### Android share target

- **Date added:** 2026-08-11 — **Status:** Implemented — 2026-08-13 increment, deployed
- **Records:** 2026-08-13 entries in `DECISIONS.md`

The installed PWA registers as an Android share target (`share_target` in the manifest, GET).
Dispatch is by content (owner-chosen option 3): a shared URL — including text that is exactly one
URL, Chrome's sharing shape — opens New Source notebook creation with the link and shared title
prefilled and no format preselected; any other shared text, long prose included, lands whole in
the two-layer search box for the owner to trim. The app still has no URL router: startup consumes
the `share_*` params into the ordinary in-memory trail, then strips them from the address bar so
refresh replays nothing. Nothing is saved implicitly; every write stays behind the existing
explicit create actions.

Still-open evidence: the real-device check — how Chrome on Android presents the share-sheet entry
— is now possible on the deployed site once the installed PWA updates. Whether
shared content is mostly words, phrases, or URLs (the doc's original question) can now be answered
by real use. ~~A shared URL landing anywhere other than Source creation (e.g., a Media link on an
existing page) remains a later owner decision.~~ **Answered 2026-08-13, same day:** real TikTok
use (short learning videos, several a week) made always-new-Source-page too rigid; a URL share now
opens a destination chooser — existing page or word/phrase (media link), new Grammar guide with
the video attached, or new Source notebook. See the Share arrival destination chooser entries in
`DECISIONS.md`. **Extended 2026-08-13:** an ephemeral continuation pill now keeps the video
available after each action ("Add to another item" / "Done"), and the picker gained a create row
for a new word or phrase carrying the video from birth — in-memory only, no schema or event
change. **Extended 2026-08-14:** "New word or phrase" became a visible fourth chooser destination
(owner-requested — the picker's create row alone was not discoverable). Which targeted
post-attach quick actions (add meaning, add capture…) deserve promotion
onto the pill is the remaining real-use question. See the Continue-with-this-video entries in
`DECISIONS.md`.

---

### The word's biography

- **Date added:** 2026-08-12 — **Status:** Implemented — Phase 23a, deployed
- **Records:** `PHASE-23-DIRECTION.md`, `PHASE-23-REPORT.md`, Phase 23 entries in `DECISIONS.md`

Lexical Detail's display-only **Historia** derives milestone history and current state from the
existing item/event log, then shows its current Collections, Page contexts, Phrases, typed
Connections, visible owner prose, and a separately disclosed **En tu Diario** section with
snippets. Prose uses Phase 22's shared exact-first, ñ-preserving matcher and conservative
ambiguity/clitic silences. No row promotes a link or writes an event, field, preference, or cache.

Real-use evidence to watch: one subject scans each current visible-text document on open. The
disposable fixture was immediate, but a materially larger notebook—not synthetic timing—should
decide whether any future memoization work is warranted. A later thin-biography lens remains a
separate product decision.

---

### Neighborhood browsing

- **Date added:** 2026-08-12 — **Status:** Implemented — Phase 23b, deployed
- **Records:** `PHASE-23-DIRECTION.md`, `PHASE-23-REPORT.md`, Phase 23 entries in `DECISIONS.md`

The idle Cuaderno root now starts an unweighted walk from any personal Word or Phrase. Each
transient center derives bidirectional typed Connections with owner notes, saved Phase 21 family
siblings, and an inert Diario count; non-journal Pages can be reduced centers, while dictionary
rows are marked exits. Hops use the ordinary session trail, write no event, and store no history.

Real-use evidence to watch: sparse notebooks may produce quiet or repetitive neighborhoods. That
is not permission to add hidden weighting, derived adjacency, stored dismissal, or global graph
scope; each remains a later owner decision if actual use supplies a problem.

---

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

### English→Spanish lookup

- **Date added:** 2026-08-12 — **Status:** Implemented — Phase 2e, deployed (predated the capture)
- **Records:** `PHASE-2-REPORT.md`, the 2026-07-31 english-index entries in `DECISIONS.md`,
  brief §8's amended tier list

Captured 2026-08-12 without noticing the capability already existed: Phase 2e shipped a
pipeline-built english index (`englishShards`, gloss word → entry ids, sharded like the form
index), and search tier 4 answers "take out" → *sacar* by intersecting per-word postings,
labeled as an English-meaning match. The capture's two open questions were already settled in
shipped code — the one search field serves the English path (no direction toggle), and multiword
queries intersect their words with whole-phrase glosses sorting first. Moved to history
2026-08-13 as a correction, not an implementation.

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

A non-destructive Blank line action in Page Notes, Grammar Overview, Diario and top-level lexical
notes writes one exact top-level standalone `<br>` per press, rendered as an unlabeled spacer and
omitted from visible-text consumers. Lexical notes joined the deployed set in the 2026-08-16
follow-up; no schema, storage or backup change.

---

### Explicit Notes callouts

- **Date added:** 2026-08-10 — **Status:** Implemented — Phase 19 increment, deployed
- **Records:** Phase 19 callout entries in `DECISIONS.md`

Page Notes and top-level lexical-note editors offer a Note callout beside Block quote; only a
blockquote beginning with `[!NOTE]` becomes a labeled accessible Notes-blue callout, and the
marker stays out of search, previews and AI-visible text. Lexical notes joined the deployed set in
the 2026-08-16 follow-up. Ordinary blockquotes remain quotations; schema stayed v7 at the original
increment and remains v9 after the no-schema follow-up.

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

- **2026-08-24 — Non-verb grammar drills planned as the Contrasts Gym lane.** The owner reviewed
  a survey of cloze, multiple-choice and transformation drill ideas against the app and chose the
  differentiative choice cloze first, naming ser/estar and por/para as the pairs. The direction is
  `docs/history/phases/CONTRAST-LANE-DIRECTION.md`; the entry moves to Planned. Confusion-pair drills stays
  captured as the vocabulary-side sibling.
- **2026-08-20 — Taller direction workshopped and approved; two follow-on ideas captured.** A
  multi-round owner workshop turned the prompting-suite capture into an approved v1 direction,
  `docs/history/phases/DIARIO-TALLER-DIRECTION.md`: the Taller door on the Diario, drills with keep-or-discard,
  rich practice events under a narrow amendment of the 2026-08-03 rule, an owner-edited tema
  list, dictionary-powered scaffolds, tiers, and record-don't-display tracking; no AI in v1.
  In-app AI prompt drafting and a Personal prompt store were captured as new Active entries; the
  separate-space idea stays captured after the owner chose one-Diario-two-doors for v1.

- **2026-08-20 — Classroom-diario direction captured as a two-entry batch.** After the 2026-08-19
  skill-focused prompt categories deployed, the owner declared a direction shift: the Diario
  should also be a space for deliberately working on skills, and the 2026-08-03 visit-local
  prompt rule may be amended to support it. The prompting-suite options (vocabulary-integrated,
  weakness-aware, own-voice recycling, scaffolds, tiers, AI review focus, usage tracking) and
  the contingent separate-space idea were recorded; AI-generated prompts and unprompted landing
  display were considered and set aside at capture.

- **2026-08-15 — Suppressed-containment confirmation deployed.** The owner-approved push
  (`39c0e90`) went out through a successful Pages run and the live site serves the new bundle.
  The remaining real-use evidence: whether wrong proposals recur annoyingly enough to justify a
  dismissed-pairs decision, and whether the owner's ~16 genuine misses convert into confirmed
  Found in links in practice.

- **2026-08-15 — Suppressed-containment confirmation added directly to Implemented.** The owner
  noticed *Creo que* missing *creer*, a diagnostic over their real export sized the suppressed
  class (48 rows: 28 artifact, ~16 genuine, ~4 correct), and the confirm tier was planned and
  implemented the same day. Recorded straight into history with its still-open evidence
  questions; not yet deployed.

- **2026-08-13 — Phase 26 connection roadmap split into implementation and retained ideas.** The
  owner approved Mentioned here, Seen together, and exact-URL source bundles for Phase 26, and
  asked that the remaining four steps stay visible for later. Added evidence-backed
  synonym/antonym proposals, evidence-backed Page-to-Page proposals, and optional AI connection
  review; amended the existing Connection cluster browsing family in place rather than creating a
  duplicate graph entry. None of those four retained ideas is implementation approval.

- **2026-08-14 — "New word or phrase" promoted to a top-level share destination.** Owner-requested
  after real use: creating a new entry from a share was reachable only through the picker's
  buried create row. The chooser's second row now opens the blank creation sheet through the
  existing `onCreateLexical` path, video attached from birth, pill following; the picker row
  stays for the type-then-create case. Not yet deployed.

- **2026-08-14 — Continue-with-this-video flow deployed.** The owner-approved push (`31f344a`)
  went out through a successful Pages run and the live site serves the new bundle. The remaining
  real-use questions: one TikTok processed into several outputs without resharing on the real
  device, and which targeted post-attach quick actions deserve promotion onto the pill.

- **2026-08-13 — Continue-with-this-video flow implemented locally.** After any chooser action an
  ephemeral pill keeps the shared video available ("Add to another item" reopens the full
  chooser; "Done" forgets it), and the existing-item picker gained a create row that makes a new
  word or phrase through the normal AddSheet with the video attached from birth. Owner chose the
  minimal pill over targeted per-type quick actions — real use decides which shortcuts deserve
  promotion. In-memory only: no schema, preference, event, or reload survival. Not yet deployed.

- **2026-08-13 — Share arrival destination chooser deployed.** The owner-approved push
  (`f94c79a`) went out through a successful Pages run and the live site serves the new bundle.
  The three-destination chooser is live; the owner's real-device TikTok walk-through of each
  destination is the remaining evidence.

- **2026-08-13 — Share arrival destination chooser implemented locally; the share target's open
  destination question is answered.** The owner's real workflow (frequent short learning TikToks)
  arrived the day the share target deployed and showed always-new-Source-page too rigid. A URL
  share now opens a chooser: attach to an existing page or word/phrase as a media link, start a
  Grammar guide with the video pre-attached, or keep the new Source notebook. Owner decisions:
  three destinations, pages + lexical targets, long-prose handling unchanged. Implemented-entry
  question struck through with the answer in place; not yet deployed.

- **2026-08-13 — Phase 25a implemented and verified locally; Phase 25b remains stopped.** The
  conjugation-family habitat now shares one alias-aware, word-only preparation and row component
  with Wander, preserves notebook order, navigates personal siblings and the marked teaching
  exit, stays quiet on optional-reference failure, and writes no event. The 1,403-test serial
  suite, build, deliberate no-event failure/recovery, and disposable 375×812 flow pass. The r4
  audit verdict is also carried into the Dictionary word-family explorer: flattened strings are
  not a sanctioned source for either an explorer or saved-family shadow. Deployment remains a
  separate approval; full evidence is in `PHASE-25-REPORT.md`.

- **2026-08-13 — Historia word families planned as Phase 25a/25b after a seven-question
  workshop.** The owner picked the conjugation-family and derivational-family enrichments from
  the Historia-strengthening discussion and answered seven scope questions: saved derivational
  relatives only; the conjugation section mirrors the wander card (siblings plus the
  What-to-notice exit); Historia only, no wander-edge changes; no suppression of rows already in
  Connections; words only; attachment required on both endpoints; and a `relatedWords` quality
  audit gates 25b before UI work. The full contract is `PHASE-25-DIRECTION.md`; the Dictionary
  word-family explorer entry was updated in place to hand its personal-layer shadow to Phase 25b
  while keeping the unsaved-relative explorer unapproved. Planning is not implementation
  approval; the §2 plan-first agreement still applies.
- **2026-08-13 — Six connection-visualization ideas captured from an owner brainstorm.** With
  Phases 22–23 deployed, every connection surface shows derived edges as labeled list rows; the
  owner asked what showing connections and groups *better* could look like, explicitly without a
  settled aim, and requested the whole batch for the list. Captured as separate entries so each
  can be judged alone: Edge-kind visual vocabulary, Wander constellation (one-hop map),
  Connection cluster browsing, Graph texture in Estadísticas, Moment-of-learning micro-visuals,
  and Global graph visualization. The sequencing recorded in the entries — vocabulary first,
  Estadísticas texture as the evidence gatherer, constellation as the first spatial step, the
  global graph gated on all of it — is a starting position, not a decision. Cluster browsing
  joins the existing Tag hubs / Saved views overlap question, updated in place. None of the six
  is approved work.

- **2026-08-13 — Android share target deployed.** The owner-approved push (`d0ceb27`, carrying
  the interjection-override increment too) deployed through a successful Pages run, and the live
  manifest serves the `share_target` block. The index row and entry now read "deployed"; the
  real-device share-sheet check is open to the owner once the installed PWA updates.

- **2026-08-13 — Android share target implemented and verified locally; moves to Implemented
  history.** The owner approved dispatch-by-content (option 3) with long prose landing whole in
  the search box. Manifest `share_target` (GET), a pure dispatch lib, and startup consumption of
  the params into the in-memory trail; the entry is compressed here with `DECISIONS.md` as the
  authoritative record. Deploy and the real-device share-sheet check remain open, so the index row
  reads "awaiting deploy". Both cross-references (Select text to look up, PWA app shortcuts) now
  point at the implementation instead of "below".

- **2026-08-13 — Phase 24 deployed; the unused-field census moves to Implemented history.** The
  owner-approved push deployed r4 at `da547fd` through successful Pages run 31723115634. The live
  manifest and first chunk returned HTTP 200 with the expected r4 identity, counts, and byte length.
  The census is compressed into the Implemented index with its direction/report as authoritative
  records; the separate word-family explorer remains Captured, now with its dormant data deployed.

- **2026-08-13 — Phase 24 implemented and verified locally.** The r4 rebuild and dictionary
  display close the census implementation questions with exact r3 identity preservation, 45/45
  shipment checks, a 4.06 MiB bundle, the complete serial suite/build, and a disposable 375×812
  rich/plain-entry flow. Per the phase contract, the census entry stays Active until an
  owner-approved push moves it to Implemented history; the word-family explorer itself remains
  unapproved even though its source data now ships dormant in r4.

- **2026-08-13 — Correction: English→Spanish lookup moves from Active to Implemented history.**
  The 2026-08-12 capture recorded a capability Phase 2e had already shipped: the bundled
  `englishShards` index and search tier 4 ("take out" → *sacar*) have been live since the
  Phase 2 deployment, per the 2026-07-31 `DECISIONS.md` entries and brief §8's amended tier
  list. The entry is compressed per the implemented-band convention; no code changed.

- **2026-08-13 — Unused dictionary fields moves to Ready to plan: the owner decided the
  next-rebuild field selection in a four-question workshop.** In: sense-level synonyms and
  antonyms, topic labels, first-sentence etymology (measured at ~144 KB), filtered sense-attached
  examples, and dormant derived/related data for the word-family explorer. Out: IPA and syllable
  breaks. The selections total ~+660 KB gzipped (~3.96 MB bundle), knowingly past the plan-era
  ~3.5 MB guideline the brief never fixed. Recorded in `DECISIONS.md`; display design and the
  rebuild itself still require a plan under the working agreement. The word-family explorer's
  timing question closes with the same decision (its data ships dormant; the phase stays
  unapproved).

- **2026-08-13 — Two data-layer surveys captured: Unused dictionary fields (shipped-lemma census)
  and Candidate future data sources.** Both came from owner questions about the reference layer
  and were requested for the list after reviewing the assessments. The census entry records
  measured coverage and real gzip cost for every Kaikki field the pipeline currently drops
  (sense-level synonyms, IPA, syllables, etymology, sense-attached examples, topics, antonyms),
  the measured dead ends (audio, translations), a 175-sense parent-gloss data-quality nit in
  `04-entries.mjs`, and the size arithmetic against the ~3.5 MB guideline. The sources entry
  surveys candidate additions (the es.wiktionary extract, word and sentence audio, relations
  data, curated-content seeds), names the gaps with no cleanly licensed source, and records the
  wiktextract contingency — under the standing rules that licenses are re-verified at adoption
  and noncommercial sources stay build-time only. The same census supplied survey-level evidence
  to the Dictionary word-family explorer entry (~70% raw coverage, ~230 KB gzipped), whose
  coverage risk is updated in place. Neither new entry is approved work.

- **2026-08-13 — Phase 23 deployed.** The owner approved the verified branch and current visual
  treatment; `main` fast-forwarded through the direction plus four Phase 23 commits to `bb292fe`.
  GitHub Pages run 31668643593 completed successfully, and the live HTTP-200 application bundle
  contains the Historia, Cuaderno wander, Diario-stub, and full-entry surfaces. README Status,
  both implemented-idea summaries, the direction/report, and the durable decision record move to
  deployed reality; personal schema remains v8.

- **2026-08-12 — Phase 23 implemented and verified locally; not deployed.** Historia, shared
  owner-prose containment, milestone replay, unweighted neighborhood starts, alias-safe typed
  edges, Phase 21 family hops, inert Diario counts, reduced Page centers, and screen-aware Back
  trails pass 1,372/1,372 serial tests, the 2,105-module production build, diff check, all three
  deliberate red/green proofs, and a disposable 375×812 closeout. Both ideas move from Active to
  Implemented history; real-notebook prose-scan cost and neighborhood usefulness remain evidence
  to watch. No push or deployment is claimed.

- **2026-08-12 — The word's biography and Neighborhood browsing enter as Planned: Phase 23a/23b,
  direction approved through an owner decision workshop.** After a detailed two-idea breakdown
  (use and value, implementation tiers, scope-shaping decisions, extension paths), the owner
  answered nine workshop questions plus two scope questions; the decision-complete record is
  `PHASE-23-DIRECTION.md`. Headline decisions: biography as a sub-view off Detail's learning
  strip, milestones-only narrative, display-only derived rows, Diario as a disclosed section;
  wandering over typed links + conjugation families with a pure-random start, no events from its
  own surfaces, Diario as unopened stubs, entered from a Cuaderno root card; one phase, 23a then
  23b, with Phase 22's containment matcher extended to prose inside 23a. Implementation has not
  started and still follows the plan-first agreement.

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
  was promoted; Saved views remains Captured. See [PHASE-8-DIRECTION.md](phases/PHASE-8-DIRECTION.md) and
  [PHASE-8-REPORT.md](phases/PHASE-8-REPORT.md).

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
