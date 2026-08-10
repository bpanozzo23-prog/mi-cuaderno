# Improvement ideas

This document captures planning-level product ideas that may be worth discussing later. It is a
handoff aid for future chats, not an approved roadmap or permission to implement anything.

Before acting on an idea, a future coding agent must read `docs/AGENT-GUIDE.md`, confirm the current
project state in `README.md`, inspect the relevant implementation, and read the governing brief and
decision-log entries. The application's design may have changed since an idea was recorded.

## How to use this document

- Add the date when an idea is first recorded and update **Last reviewed** when new evidence or a
  decision materially changes it.
- Keep **Status** explicit. Suggested values are `Captured`, `Exploring`, `Ready to plan`, `Planned`,
  `Deferred`, `Implemented`, and `Closed`.
- Distinguish an observed problem from a possible future benefit. An idea can be valuable without
  being a current problem.
- Record lightweight and structured options separately. They can have very different storage,
  migration, backup, and interface costs.
- Add real-use evidence before promoting a data-dependent idea into a phase. Synthetic data can
  test capability, but it cannot establish the owner's habits.
- When an idea becomes approved work, link its phase or implementation document here. Keep the idea
  entry as history rather than silently rewriting the original reasoning.

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

| Idea | Date added | Status | Earliest sensible discussion point |
|---|---|---|---|
| Source-oriented page templates | 2026-08-02 | Implemented and deployed | Phase 7 deployed; browser closeout unverified |
| Meaning-block presentation | 2026-08-02 | Implemented and shipped | Phase 4i |
| Typed or explained relationships | 2026-08-02 | Implemented locally | Phase 4t–4x browser closeout pending |
| Saved views | 2026-08-02 | Captured | After observing repeated retrieval/filter patterns — Phase 8 adds lenses that can supply that evidence |
| Persistent page profiles | 2026-08-02 | Implemented and deployed | Phase 7 deployed; browser closeout unverified |
| Personal-content provenance | 2026-08-02 | Captured | Before or alongside Phase 6 AI design; source needs can be studied earlier |
| Learning depth (cloze, reverse, drill, audio) | 2026-08-06 | Implemented locally | Phase 10a–10d; deferred members need real-use evidence |
| Owner-centric stats (streak, calendar, growth, ladder, per-item strip) | 2026-08-06 | Implemented locally | Phase 11; retention, coverage and per-direction breakdowns need real data volume |
| Grammar guide depth and callouts | 2026-08-10 | Implemented locally | Phase 19 first release verified; not deployed |
| Structured Notes outlines | 2026-08-10 | Approved; implementation in progress | Phase 19 increment |
| Global tag management | 2026-08-10 | Implemented locally | Phase 20 verified; not deployed |
| Phase 19/20 review nits (edge polish) | 2026-08-10 | Captured | Whenever a related area is next touched; none is urgent |

---

## Phase 19/20 review nits (edge polish)

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
2. **Note callout announces "Note" twice (Phase 19).** The Grammar callout in
   `src/components/MarkdownText.jsx` has both `aria-label="Note"` on the `role="note"` aside and a
   visible "Note" label div inside it, so some screen readers read "Note" twice. Dropping the
   `aria-label` (the visible label suffices) or wiring `aria-labelledby` would fix it. Cosmetic.
3. **Rename/merge kind seam between preview and transaction (Phase 20).** `TagManagementSheet`
   decides rename-versus-merge from its `items` prop, while `applyGlobalTagChange` re-plans from
   live index queries inside the transaction. If the prop were ever stale, a button labeled
   "Rename tag" could execute what is actually a merge without the merge confirmation. Effectively
   unreachable in a single-owner app whose mutations reload the notebook, and the atomic re-plan
   is the right design; a cheap belt-and-braces option is having the writer compare the caller's
   expected `kind` and abort on mismatch.

---

## Global tag management

- **Date added:** 2026-08-10
- **Status:** Implemented and verified locally as Phase 20; not deployed
- **Origin:** Existing spelling variants and obsolete tags required one edit per affected entry
- **Potential data impact:** None beyond existing item tags, ordinary edit events and the backed-up
  `tagColors` preference; schema remains v6

Ajustes is now the single exact-tag maintenance home. One source can be renamed to a new spelling,
merged into one existing exact destination or removed globally. The timestamp-neutral atomic
transaction, explicit merge/removal confirmations, optional backup and colour-ownership rules are
recorded in `docs/PHASE-20-DIRECTION.md`.

The complete 1,168-test suite, production build, rollback/backup proofs and a disposable 375×812
rename→merge→remove browser flow pass. See `docs/PHASE-20-REPORT.md` for the implementation and
numerical closeout.

### Evidence to watch in real use — 2026-08-10

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

## Structured Notes outlines

- **Date added:** 2026-08-10
- **Status:** Owner-approved as a Phase 19 increment; implementation in progress
- **Origin:** Real-use need to explain a Vocabulary collection and organize a general Notes Page
  beyond one undifferentiated body
- **Potential data impact:** schema v7 adds mandatory `noteSections[]` to every Page

The approved design retains the existing Page body as Notes Overview and adds named top-level
sections plus exactly one subsection level. Notes remain permanently available without an enable
switch, use ordinary safe Markdown, and share hierarchy mechanics with Grammar without introducing
a general block editor. Structure copy preserves names/hierarchy with fresh IDs but clears prose.

A nonempty Notes outline deliberately counts as durable Page organization: a dated outlined record
stays in Pages, while a dated body-only record remains Diario regardless of length. The brief and
`DECISIONS.md` record the asymmetry, the real classification routes and the deliberate leaf-body
deletion rule. The schema-v7 release requires version fencing, pure export-first migration and a
complete sweep of Page/Diario consumers.

---

## Grammar guide depth and callouts

- **Date added:** 2026-08-10
- **Status:** Implemented and verified locally as the first Phase 19 release; not deployed
- **Origin:** Real-use friction while creating an Indicative-versus-Subjunctive comparison guide
- **Potential data impact:** schema v6 adds one-level Grammar section ownership; formatted
  Overviews remain strings

The current `Page → Grammar section → examples` hierarchy cannot comfortably represent a concept
such as Indicative, a highlighted caution about speaker belief, the SPOCK trigger family, each
SPOCK component's related phrases and examples, followed by a parallel Subjunctive concept. The
workaround is a long flat run of prefixed section names or splitting related content between Notes
and Grammar.

The approved direction keeps the feature bounded: safe Markdown and accessible Note callouts in
the existing section Overview, plus exactly one subsection level represented by a same-page
`parentId`. It does not introduce arbitrary blocks or recursive page trees. Existing sections
migrate to top level and retain their complete content and identity.

Phase 19 is also the grouping home for later owner-approved Page organization/formatting
increments. That is a bookkeeping choice, not advance scope approval; each later increment still
needs its own concrete decision, tests and any required migration. See
`docs/PHASE-19-DIRECTION.md` for the decision-complete first release.

The complete 1,145-test suite, production build, four deliberate failure proofs and disposable
375×812 creation/copy plus schema-v5 upgrade→restore browser flows pass. See
`docs/PHASE-19-REPORT.md` for the implementation and numerical closeout.

---

## Source-oriented page templates

- **Date added:** 2026-08-02
- **Last reviewed:** 2026-08-04
- **Status:** Implemented locally
- **Origin:** Preliminary information-architecture review and follow-up discussion
- **Potential data impact:** Implemented schema-v5 Source and Grammar structures; no new stores or
  indexes and no stored starter/template identity

### Description and current context

Pages are deliberately general-purpose. A film, podcast, book, article, grammar note, topic page,
or journal entry currently uses the same basic page shape: title, optional date, body, tags, media
links, and links to other items. This preserves flexible capture, but a source page begins as a
blank page and may not consistently prompt for useful context.

A source-oriented template would help initialize a page used to capture a source and the vocabulary
encountered there. A template affects how a page starts; it does not necessarily define what that
page permanently is.

**Phase 4j–4o update (2026-08-03):** the creation gallery now offers Blank page plus four
vocabulary-Collection starting points. Those starters seed editable Collection groups and store no
template identity. They are not Source or Grammar templates. A Source profile, structured source
fields, Grammar profile, richer Journal profile, and user-authored templates remain explicitly
deferred until real use establishes their recurring structure.

### What Phase 4j–4o addressed

- The starting-point gallery established a safe creation-only template pattern: a starter can seed
  editable content without permanently classifying the page or storing a template ID.
- Vocabulary Collection addressed the part of the original source-page idea concerned with making
  linked vocabulary prominent. A Collection leads with ordered vocabulary groups instead of
  presenting lexical links as secondary generic relationships.
- The persistent-profile foundation, General-page compatibility, and reversible conversion provide
  a safe base on which a later Source design could build.

These are enabling pieces, not an implementation of Source-oriented pages themselves.

### Source-specific needs still open

These remain exploratory needs from the page examples, not repeated-use friction established by a
real-source-page audit.

- A book, film, podcast, article, or lesson page still begins as a General page without
  source-specific prompts or structured source identity.
- Passages, notable vocabulary, and personal reflections still share the general body-and-links
  layout; there is no dedicated repeatable structure for those different kinds of material.
- A page link can show that vocabulary is related to a source, but not where it was encountered or
  whether the source supports a particular meaning, example, or reflection.
- A future source page may also need Collection behavior. The current one-profile model does not
  yet answer whether Source should be an exclusive profile, optional metadata layered onto another
  profile, or a composable capability.
- Owners cannot yet create, save, or reuse their own starters.

### Potential options

1. **Text-only starter template.** At page creation, offer optional starters such as Blank, Source,
   Grammar note, or Journal. A Source starter could insert editable labels such as Source,
   Episode/chapter, URL, Summary, Useful expressions, and Questions into the existing body.
2. **Source-specific creation form.** Show optional inputs such as creator, episode, date consumed,
   URL, or Spanish variety, then render them consistently.
3. **Source-focused display.** Give linked words and phrases a prominent “Vocabulary from this
   source” section while retaining an ordinary page record.
4. **Structured source page.** Persist source-specific fields and possibly a page kind. This is a
   larger content-model decision, not merely a template.

### Expected owner value

- Reduces blank-page friction while preserving quick capture.
- Encourages useful source context without requiring the owner to remember a personal format.
- Makes a source page a clearer vocabulary hub.
- Makes it easier to return to where an expression was encountered.
- Could give future AI-assisted drafts a predictable, reviewable starting structure.

### Risks and tradeoffs

- Too many prompts could make quick capture slower.
- A rigid template could imply that every source needs the same metadata.
- Pre-filled labels may create visual clutter when most remain empty.
- Structured fields would require decisions about storage, editing, backup, search, and existing
  pages.
- A template should not silently become a permanent taxonomy.

### Evidence needed

- How many real pages represent films, podcasts, books, articles, lessons, or other sources?
- Which headings or details recur naturally in page bodies?
- How often are source pages linked to several lexical entries?
- Which source details help later retrieval rather than merely feeling thorough during capture?

### Potential timing

~~A text-only template could be prototyped without a schema change once the owner wants to evaluate
the workflow.~~ **Deferred 2026-08-03:** Phase 4j–4o used built-in, creation-only vocabulary
starters and deliberately did not generalize them into Source/Grammar or user-authored templates.
Persistent source fields or a Source profile still require a real-page audit and their own approved
migration/storage plan.

### Questions for a future discussion

- Which source categories and details actually recur in real use?
- Is a creation-only starter sufficient, or does Source need lasting display, capture, validation,
  or retrieval behavior?
- Should source structure be editable headings in `body`, a source-specific form, repeated
  passage/reflection blocks, or a structured submodel?
- How should Source and Vocabulary Collection behavior combine on one page?
- Which details matter after capture: creator, episode/chapter, URL, encounter date, Spanish
  variety, or something else?
- Is a linked source page sufficient provenance, or is source information needed on a lexical
  entry, meaning, example, or individual encounter?
- Should owners eventually create reusable starters, and if so, does template identity or
  configuration need to survive backup and later editing?
- How should existing General source pages opt into future behavior without forced classification?

### Approved Phase 7 direction — 2026-08-04

The owner approved the persistent Source workflow and creation approach after reviewing
representative Source, Grammar and Pages-library experiences. The questions above remain as the
history that led to this decision; they are no longer prerequisites for the first release.

- Source becomes an independently enabled page capability, not an exclusive page kind. One page
  may combine Source, Grammar and Vocabulary while retaining exactly one leading display focus.
- The persistent Source structure holds a small optional identity (format, creator, scope, URL and
  context) plus one flat ordered capture stream of passages, reflections, language notes and
  questions. Text and URLs are enough for v1; attachments, source hierarchies, deep provenance and
  reading progress remain outside scope.
- Source starters are built-in, family-first creation recipes for book/written work, podcast/audio,
  film/video and article/lesson. They enable Vocabulary by default but store no recipe or template
  identity.
- **Copy page structure** is the only reuse mechanism: it copies focus, enabled capabilities,
  Collection group names and Grammar section names with fresh IDs, never personal content or Source
  identity. A stored/user-authored template manager remains deferred.
- Vocabulary attached to captures rolls up through the page's existing authoritative outgoing
  personal lexical links. Grammar examples may point to one exact Source capture without expanding
  this into a general provenance model.
- Existing pages opt in manually. Disabling Source hides and preserves its data; hidden Source
  content stays outside role filters, search and contextual summaries until re-enabled.

The decision-complete scope and sequence are recorded in
[PHASE-7-DIRECTION.md](PHASE-7-DIRECTION.md).

### Phase 7 implementation outcome — 2026-08-04

The approved Source capability and built-in Source recipes are deployed as Phase 7. The delivered
workflow includes optional Source identity, four ordered capture types,
capture-level vocabulary enrichment, visit-local filtering and ñ-preserving search, reordering,
and contextual retrieval. Source remains composable with Vocabulary and Grammar, disabling it
preserves but hides its contents, and no starter/template identity is stored. The full 593-test
serial suite, production build, and diff check pass. GitHub Pages deployment completed
successfully; the disposable browser closeout remains unverified. See
[PHASE-7-REPORT.md](PHASE-7-REPORT.md).

---

## Meaning-block presentation

- **Date added:** 2026-08-02
- **Last reviewed:** 2026-08-02
- **Status:** Implemented and shipped
- **Origin:** Preliminary information-architecture review and follow-up discussion
- **Potential data impact:** Low for visual treatment of the existing string; high for structured
  meanings or sense-level examples, notes, and provenance

### Description and current context

A personal lexical item currently stores its English meaning in one `translation` string. The UI
supports one meaning per line and displays those lines in full, but they are not separate records.
Personal examples and notes belong to the whole entry rather than to an individual meaning.

Meaning blocks could make entries with several readings easier to scan without immediately
creating a formal sense model. This differs from dictionary senses: imported sense identifiers are
not stable enough to serve as permanent personal-data identities.

### Potential options

1. **Presentation only.** Render each nonblank translation line as a visually separate row, bullet,
   or numbered block while storing the same string.
2. **Authoring guidance.** Keep the string but provide clearer one-meaning-per-line guidance and
   perhaps simple line reordering.
3. **Lightweight labels in text.** Let the owner manually include labels such as Mexico, informal,
   or figurative without interpreting them as structured data.
4. **Structured meanings.** Replace or supplement the string with `meanings[]`, potentially giving
   each meaning its own gloss, usage note, examples, region, register, and source.

### Expected owner value

- Makes polysemous entries easier to understand at a glance.
- Reduces the chance that several meanings look like one run-on translation.
- Could eventually place examples beside the meanings they illustrate.
- Helps compare closely related readings and review AI-generated proposals one meaning at a time.

### Risks and tradeoffs

- Treating every newline as a semantic boundary may misread formatting the owner intended as prose.
- Structured meanings make entry creation and editing more demanding.
- Existing examples and notes would need rules for assignment or migration.
- Dictionary attachments cannot safely depend on unstable imported sense IDs.
- A structured model would affect storage, backups, import validation, search, review presentation,
  and future AI behavior.

### Evidence needed

- How many real entries use multiline meanings?
- Do personal examples clearly correspond to particular meanings?
- Are region, register, or usage labels repeatedly written beside individual meanings?
- Do notes already contain manual headings that approximate meaning blocks?

### Potential timing

Visual treatment of existing lines can be discussed independently. Structured meanings should wait
for real-entry evidence and may be best coordinated with Phase 6 so AI drafts do not establish a
content shape before the owner has validated it.

### Questions for a future discussion

- Is the goal mainly faster scanning, or attaching notes and examples to individual meanings?
- Should blank lines or numbered text retain special meaning?
- How should personal meanings relate to a replaceable dictionary entry?

### Approved direction — 2026-08-02

The owner approved structured personal meaning blocks after workshopping the polysemous verb
*sacar*. The lexical entry remains the review and scheduling unit. Each ordered meaning has a
stable personal ID independent of dictionary senses, an English gloss, optional short Spanish
usage cue, compact region/usage/grammar labels, and optional note and assigned examples. Entry-wide
notes and general examples remain; example assignment is optional. Reading shows every gloss and
cue with context collapsed, routine editing expands one meaning, and a draft-based organizer owns
add/reorder/neighbor-merge/delete behavior. Schema-v1 multiline translations migrate one nonblank
line at a time without automatically assigning existing notes or examples. The complete storage,
backup, import, search, Repaso and verification decisions are recorded under Phase 4i in
`DECISIONS.md`.

---

## Typed or explained relationships

- **Date added:** 2026-08-02
- **Last reviewed:** 2026-08-04
- **Status:** Implemented locally — Phase 4t–4x browser closeout pending
- **Origin:** Preliminary information-architecture review and follow-up discussion
- **Potential data impact:** ~~Low for clearer direction labels; high for persisted relationship
  types or explanations~~ **High and approved: schema v4 persists sparse relationship annotations**

### Description and current context

Current links say that two items are connected but do not record why. A link is stored once in the
originating item's `linkedKeys[]`; the reverse direction is derived as a backlink. The detail UI
groups related items by content type, but a dense hub could still become an unexplained list.

Relationship information belongs to the connection between two items, not naturally to either item
alone. Durable annotations therefore do not fit inside the current array of key strings without a
new representation.

### Potential options

1. **Direction-only presentation.** Distinguish “this item links to” from “linked from” without
   storing new data.
2. **Optional explanation.** Attach free text such as “often confused with” or “heard in episode 4.”
3. **Small fixed type list.** Examples might include synonym, contrast, variant, example of,
   grammar pattern, heard in, or source for.
4. **Hybrid relationship.** Store an optional type plus an optional explanation.
5. **Full relationship records.** Model source key, destination key, direction, type, explanation,
   and timestamps separately from item records.

### Expected owner value

- Makes browsing related knowledge understandable rather than merely connected.
- Helps explain contrasts, variants, common confusions, and source context.
- Makes highly connected entries easier to scan.
- Could support focused views such as “commonly confused expressions” or “heard in this source.”

### Risks and tradeoffs

- Free text is flexible but difficult to group or filter.
- Fixed types enable retrieval but create an extra classification decision for every link.
- Symmetric relationships such as synonym differ from directional relationships such as example of.
- Existing links would need a safe default and migration path.
- Deletion cleanup, one-sided storage, dictionary aliases, and orphan handling must remain correct.
- A rich graph system would be disproportionate if only a few links need explanation.

### Evidence needed

- Whether real dense entries are confusing in practice.
- Which relationship explanations recur naturally in notes or page text.
- Whether two or three types cover most useful relationships.
- Whether the owner cares more about explanation while reading or filtering by relationship later.

### Potential timing

Clearer direction labels can be evaluated without stored data. ~~Persistent relationship types or
explanations should follow a real-link audit and require a dedicated schema and migration plan.~~
**Owner-approved direction, 2026-08-04:** the owner expressly waived the real-link audit after
reviewing and approving the hypothetical examples, and approved Phase 4t–4x with a dedicated
schema-v4 migration and backup plan.

### Questions for a future discussion

- Is free explanation sufficient, or must relationships be filterable?
- Which relationships are directional, and which should read the same from both sides?
- Should “heard in source” be a relationship, provenance, or both?

### Approved direction — 2026-08-04

- Use the hybrid option: one fixed type plus one optional shared plain-text note on every ordinary
  connection. Ship all seven types together in this order: Similar meaning, Contrast, Often
  confused, Variant, Explained by/Explains, Found in/Contains, and Related.
- Keep `linkedKeys[]` as the sole authority for whether a connection and Collection membership
  exist. Add mandatory sparse `linkAnnotations[]` to schema-v4 items; an absent annotation derives
  Related with a blank note, and that default is never stored densely.
- Use `subject: owner | target` so directional labels remain correct from either endpoint and are
  independent of which item physically stores the edge. Store no separate relationship records and
  create no reciprocal edge.
- Treat link, unlink, type, and note changes as event-free connection bookkeeping. A relationship
  note explains the connection rather than becoming either item's prose; metadata-only saves also
  leave both items' recency unchanged.
- Preserve legacy self, duplicate, and reciprocal topology during migration. Runtime presentation
  derives one visible connection, mutations prevent new redundancy, and explicit removal cleans all
  redundant physical copies of that conceptual connection.
- Preserve Collection membership and dictionary attachment as separate concepts. Collection
  promotion/restoration carries dormant relationship metadata; dictionary alias rewrites carry the
  annotation, while conflicting explicit old/canonical annotations remain untouched until the owner
  resolves them.
- Keep relationship notes out of search, filters, Repaso, and activity. No relationship hub,
  provenance model, custom/multiple types, or Example of/Part of types belongs to this release.

### Implementation outcome — 2026-08-04

- Schema v4, relationship mutations, lossless dictionary-alias conflict handling, the shared
  phone-first Connections interface, and the Collection, Diario, and dictionary-detail seams are
  implemented.
- A post-implementation review confirmed that relationship-first mixed grouping is intentional on
  standard Detail and Collection screens. The unreachable kind-grouping helpers were retired, and
  legacy self-link editing, disappearing-dictionary conflict resolution, and relationship-only
  dictionary-row refreshes were hardened with regressions.
- The complete serial suite passes 493/493 tests across 49 files, the production build passes, and
  the planned deliberate red/green proofs fail before restoration and pass afterward.
- The disposable schema-v3 375×812 closeout remains unclaimed because Codex's in-app
  browser-control kernel fails before fixture setup with a missing local asset path. No owner data
  was inspected. The GitHub Pages build and deploy jobs subsequently passed for `eb93c90`, and the
  live site served the verified production asset.

---

## Saved views

- **Date added:** 2026-08-02
- **Last reviewed:** 2026-08-02
- **Status:** Captured
- **Origin:** Preliminary information-architecture review and follow-up discussion
- **Potential data impact:** None for additional built-in presets; persistent preference/backup
  contract for owner-created views

### Description and current context

Cuaderno currently offers type, maintenance, tag, and order controls. Those choices are intentionally
component-local and reset after leaving Cuaderno. A saved view would preserve a useful combination
such as “phrases missing examples,” “recently added Mexico vocabulary,” or “unlinked source pages.”

A saved view is a temporary lens over canonical items, not a new category or a copy of the content.

### Potential options

1. **Additional built-in presets.** Add a few fixed, broadly useful combinations without saving
   owner configuration.
2. **Remember last-used controls.** Restore the most recent state without introducing named views.
3. **Named saved views.** Save type, maintenance view, tag, order, and possibly search text under an
   owner-chosen name.
4. **Pinned views.** Give selected views a compact shortcut without making them top-level content.
5. **Rule-based collections.** Combine several criteria and possibly relationship or provenance
   rules.

### Expected owner value

- Turns repeated retrieval and maintenance workflows into one action.
- Lets one item appear in several useful contexts without duplication.
- Makes a larger notebook easier to revisit without remembering filing choices.
- Could support recurring study, enrichment, source, or topic workflows.

### Risks and tradeoffs

- A miniature query builder could be more complex than the notebook warrants.
- Views can become stale when tags disappear or their spelling changes.
- Restoring an active view can make items appear missing unless the UI clearly shows the filter.
- Saved searches may remain useful for less time than saved structural filters.
- Shortcuts can crowd navigation if they are treated like permanent content types.

### Evidence needed

- Which filter combinations the owner repeatedly reconstructs.
- Whether recurring retrieval is based on tags, sources, dates, completeness, or links.
- Whether remembering the last state would solve the problem without named views.
- How many named views would remain useful after several weeks.

### Potential timing

Observe real use of the Phase 5c controls first. A persistent view may fit the existing preferences
store without a new Dexie table, but it still needs a documented preference shape, backup/import
behavior, stale-reference handling, and a separately approved plan.

### Questions for a future discussion

- Is the desired behavior “resume where I left off” or “maintain several named lenses”?
- Should query text ever be saved?
- Where would saved views live without crowding the three primary tabs?

### Phase 8 overlap — 2026-08-04

The Words & phrases hub does **not** implement saved views, and the distinction is worth keeping
clear. Nothing it offers is saved or named: its five controls (where it lives, learning, view,
order, tag) are visit-local and reset on leaving, exactly like Cuaderno's. What changed is the
*vocabulary* of available lenses, not their persistence.

That makes the hub a source of the evidence this idea has been waiting for. Two questions it can now
answer that could not be asked before:

- Which of the five controls the owner reconstructs repeatedly, and in which combinations. A
  recurring pair such as “phrases, not in any page yet” or “words missing examples, tagged Mexico”
  is the concrete case for naming a view; a control that is set once and forgotten is not.
- Whether the pull is really “resume where I left off”. The hub deliberately preserves its
  controls while the session trail is elsewhere but discards them on leaving, so the owner will
  feel both behaviours and can say which one they missed.

If named views are eventually wanted, the hub raises the cost slightly: a saved view would now have
to describe which surface it belongs to, since Cuaderno, Pages and Words & phrases no longer share
one control set. That is an argument for waiting on real use, not for building it sooner.

---

## Persistent page profiles

- **Date added:** 2026-08-02
- **Last reviewed:** 2026-08-04
- **Status:** Implemented locally
- **Origin:** Preliminary information-architecture review and follow-up discussion
- **Potential data impact:** General and Vocabulary Collection shipped in schema v3; Phase 7
  implements schema-v5 composable focus/capabilities without new stores or indexes

### Description and current context

The personal layer still has exactly two top-level content types: lexical items and pages. Words and
phrases are lexical forms. ~~A dated page acts as a journal entry, while sources and grammar notes
are ordinary pages. There is no persistent source, grammar, comparison, or topic-hub subtype.~~
**Phase 4j–4o implemented two stored page profiles: General and Vocabulary Collection.** A dated
General page remains a derived Journal entry, while sources and grammar notes remain General pages.
There is still no stored Source, Grammar, explicit/richer Journal, comparison, or topic-hub profile.

**Phase 7 implementation update (2026-08-04):** schema v5 replaces those exclusive profiles with
one persistent focus plus independently enabled Vocabulary, Source, and Grammar structures. Notes
remain the body-based foundation, and Diario now derives from a date plus no enabled structured
capability. The preceding paragraph is retained as the historical state that motivated the change.

A persistent page kind differs from a creation template because it continues to affect how a page
is labeled, filtered, displayed, or validated after creation.

### Potential options

1. **No persistent kind.** Continue using flexible pages, optional templates, dates, tags, and links.
2. **Conventional tags.** Encourage `source` or `grammar` without changing the item shape.
3. **Optional built-in `pageKind`.** Possible values might include general, source, grammar, journal,
   comparison, or topic hub.
4. **Custom kinds.** Let the owner define names or behavior.
5. **Behavior-specific submodels.** Give source or journal pages their own structured fields while
   retaining `type: page` at the top level.
6. **Selected first release — narrow built-ins.** Store only `general | collection`; keep Journal
   derived from a date and defer every richer profile and custom profile/template mechanism.

### Implementation decision (2026-08-03)

- General preserves the existing page editor and dated-Journal behavior.
- Vocabulary Collection adds durable ordered groups, vocabulary-first Read/Organize/Practice modes,
  Collection placements on lexical entries, page-profile retrieval, and preference-backed pins.
- Every page carries empty or dormant Collection structure so profile switching is reversible.
- No template ID is stored; the built-in starter gallery only seeds editable groups during creation.
- Source, Grammar, richer Journal, custom profiles, and user-authored templates remain Deferred.

### Phase 4y reverse-capture outcome (2026-08-04)

The owner observed that vocabulary could be added while viewing its target Collection, but not
while viewing the word or phrase itself. Phase 4y closes that asymmetry without changing schema v4:

- Lexical details offer one active Collection at a time, default to Not grouped yet, preserve saved
  group order, stay on the entry after Save, and keep move/remove inside Collection Organize.
- Existing incoming typed links remain visible until assignment; the established transaction then
  promotes the edge, reorients its annotation, and preserves that metadata dormantly.
- Active Collections are no longer offered as ordinary Connection targets from a lexical entry;
  General and Diario pages remain available there.
- The complete serial suite passes 501/501 tests across 49 files and the production build passes.
  The disposable phone check remains unclaimed because browser control still fails before fixture
  setup with the recorded missing local asset path.

### Follow-up Diario decision (2026-08-03)

The owner approved, implemented and shipped a separate Diario workspace over the existing derived
dated-General behavior; see
[PHASE-4-JOURNAL-DIRECTION.md](PHASE-4-JOURNAL-DIRECTION.md). Phase 4p–4s improves creation,
retrieval, writing and rereading without storing an explicit Journal profile or adding journal-only
fields. The richer-profile question remains deferred until real use demonstrates a need for durable
structured metadata beyond the existing page shape.

The purpose settled during brainstorming is **regular reflection in Spanish**, not task tracking or
another system to maintain. Diario should make a short moment fast to begin, calm to write, pleasant
to reread, and naturally connected to vocabulary and earlier thoughts. Cuaderno remains the place
for durable notes and Vocabulary Collections.

#### Implemented Diario outcome

- Diario is a separate primary tab while each entry remains a dated General page underneath. The
  workspace distinction therefore required no schema migration or third personal-content type.
- Today opens the earliest-created entry for the local day, New moment permits several entries on
  the same day, and Continue returns to the most recently touched non-Today entry.
- The home screen provides journal-only title/body/tag search, a newest-first current-year timeline,
  an earlier-year archive, and a nearby memory from the most recent prior year with a candidate.
- The focused editor requires a date, treats title as optional and body as primary, visibly
  autosaves, and does not create a blank record when the owner merely opens or titles a fresh draft.
- Twenty-four optional Spanish prompts help the owner begin without storing a prompt ID or copying
  prompt text into the entry automatically.
- The clean reader supports personal-vocabulary links, related journal moments and separate linked
  reflections. Más retains the useful page tools: tags, media URLs, nonjournal page relations,
  activity, tricky state, two-step deletion, and Move to Pages.
- Ordinary Cuaderno browsing and page totals exclude journal entries, but deliberate global search
  can still find them. Cross-tab Back navigation retains the route and search context that led to an
  entry.

#### Boundaries intentionally retained

- A journal is still derived from `pageDate`; there is no stored Journal profile, journal-only
  field, count, completion flag, streak, mood, weather, prompt ID or new relationship type.
- Prompts and the selected reflection prompt are visit-local. Opening, selecting a prompt, linking,
  and navigating do not create edit history.
- Vocabulary capture selects existing personal words and phrases. It does not silently turn a
  dictionary result into personal content.
- Reflection creates another current-day journal entry linked to its source; it never overwrites or
  nests content inside the earlier entry.
- Diario has no pin, direct Collection conversion or scheduled review flow. Media remains URL-based;
  file attachments, sync and analytics are still project non-goals.

#### Potential future work and feasibility

Future changes should answer observed journal friction rather than add structure because a diary app
could have it.

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

#### Evidence to collect from real use

- Whether the separate tab actually increases writing and rereading without making Diario feel like
  another obligation.
- Whether entries are usually short moments, longer essays, or several moments per day, and whether
  the date/title/body defaults suit those patterns.
- Which retrieval path is used in practice: Today, Continue, scrolling, archive, search or memory.
- Whether prompts help the owner write in Spanish, which categories recur, and whether an unselected
  prompt should remain entirely ephemeral.
- How often vocabulary, page links, reflections, tags and media add value versus becoming
  maintenance work.
- Whether moving entries back to Pages is rare cleanup or evidence that the Journal boundary is
  unclear.
- Which desired behavior, if any, truly requires durable journal-only fields rather than text, tags,
  links, events or derived presentation.

### Problems addressed by Phase 4j–4o

The first row is the owner's reported friction. The remaining rows are product limitations and
durability needs that had to be solved to make that workflow dependable.

| Problem | Implemented response |
|---|---|
| A “thinking and opinions” page still looked like a generic note, leaving its linked phrases as secondary content. | Vocabulary Collection makes outgoing personal lexical links the primary content, organized into groups with expandable vocabulary cards; other links are separated as Related. |
| Pages had no durable identity that could change their display or retrieval. | Schema v3 stores `general | collection`; General retains existing behavior, dated General remains Journal, and Collections receive their own display, summaries, and filter. |
| A vocabulary hub could not preserve meaningful sections or manual order. | Durable ordered groups, ordered members, a derived Not grouped yet bucket, visible empty groups, and the draft Organizer preserve the owner's structure. |
| Adding several related words or phrases through the generic single-select linker was cumbersome. | A dedicated Collection picker keeps multi-selection across searches, supports personal and dictionary results plus staged quick-create, and commits the final selection atomically. |
| A word or phrase could show its Collection placements but could not add itself to another Collection. | Phase 4y adds a lexical-side assignment form using the same atomic membership transaction, including group choice and lossless reverse-link promotion. |
| Dictionary results could be linked but were not editable personal Collection members. | Adding a dictionary selection creates or reuses an independent personal lexical entry before adding membership. |
| Experimenting with a specialized format risked losing organization or disrupting existing pages. | Every page retains dormant Collection metadata, conversion is reversible, and migrated pages safely default to General without changing their existing content. |
| Topic vocabulary had no lightweight, in-context review path. | Collection Practice preserves group and item order, reveals answers independently, excludes Related, and prompts for missing meanings without creating review history. |
| Important vocabulary hubs and their item placements were difficult to rediscover. | Page pins, profile filters, Collection card counts, and Collection placements on lexical details expose both the hubs and where each item belongs. |
| A persistent page schema could endanger existing notebooks and backups. | Export-first v1/v2 startup gating, sequential v1→v2→v3 migration, deep schema-1/2/3 backup validation, transactional writes, and layout cleanup protect existing data. |

### Expected owner value from the implemented release

- Makes a page useful as an organized vocabulary hub rather than just a note with links attached.
- Speeds up capture of several related entries while keeping dictionary material independent and
  editable.
- Makes Collections easier to scan, practice, filter, pin, add to, and revisit from either the page
  or a lexical entry.
- Adds specialized behavior without changing the two top-level item types or taking flexibility
  away from General pages.
- Preserves the owner's ability to experiment by making profile conversion nondestructive.

### Remaining risks and tradeoffs

- One exclusive profile may not compose well when a page is simultaneously a source, grammar topic,
  journal reflection, and vocabulary collection.
- Collection groups add maintenance; real use may show that some pages need less structure or that
  large Collections need different organization controls.
- Additional fixed profiles can become restrictive, while custom profiles can recreate tag
  inconsistency and configuration work under another name.
- Any future stored fields still require migration, export-first safety, backup validation, and
  compatibility with the two-item-type architecture.
- Lightweight Collection Practice is intentionally separate from Repaso; expanding it could blur
  the distinction between browsing a topic and scheduled study.

### Evidence to collect from real use

- Whether Collections solve the thinking/opinions, situation, register, slang, and similar
  vocabulary-hub use cases without creating too much organizing work.
- Which group structures recur, how often Not grouped yet remains populated, and whether manual
  ordering stays useful as Collections grow.
- Whether reveal-only Practice is sufficient or produces real demand for shuffle, grading, history,
  scheduling, or Repaso integration.
- Which General pages repeatedly need source or grammar behavior, and which journal needs cannot be
  met by the separate date-derived Diario workspace.
- How often one page genuinely needs several specialized behaviors at once.

### Potential timing

~~Defer persistence until a real-page audit demonstrates stable categories and benefits beyond
initial prompts.~~ **Partially superseded 2026-08-03:** the owner approved General plus Vocabulary
Collection because Collection has distinct lasting organization, capture, retrieval, and Practice
behavior. The evidence requirement still applies to Source, Grammar, richer Journal, custom
profiles, and user-authored templates; creation-only distinctions should remain starters.

### Questions for a future discussion

- Which future candidates have enough lasting behavior to justify persistence: Source, Grammar,
  comparison, or a richer Journal only if the workspace evidence above supports it?
- What exact creation, display, validation, and retrieval behavior would distinguish each from a
  General page with a starter or tag?
- Should specialized behaviors remain mutually exclusive profiles, or should capabilities such as
  source metadata and vocabulary grouping compose on the same page?
- Journal now remains a date-derived General page behind its own workspace. What repeated unmet need,
  if any, would justify revisiting that boundary with explicit fields or profile behavior?
- Should existing General pages always convert only by owner choice when a future profile is added?
- Would user-authored starters or custom profiles support recurring workflows, or mostly recreate
  inconsistent tags and extra setup?
- Does real Collection use justify any of the deliberately deferred Practice features: shuffle,
  grading, history, scheduling, or Repaso integration?

### Approved Phase 7 evolution — 2026-08-04

General and Vocabulary Collection remain shipped history, but the owner approved replacing their
exclusive `pageProfile` model with composable pages in schema v5:

- Every page has one leading `pageFocus: notes | vocabulary | source | grammar`. Notes remain the
  permanent body-based foundation; Vocabulary, Source and Grammar enable independently and may
  coexist. Focus changes ordering and presentation rather than identity.
- `pageProfile` is removed. Existing Collections migrate to Vocabulary focus with Vocabulary
  enabled; every other page migrates to Notes focus with Vocabulary disabled, while dormant groups,
  links, IDs, timestamps and content remain intact. Empty disabled Source and Grammar structures
  are added without changing Dexie stores or indexes.
- Disabling a populated structure hides rather than deletes it. Hidden content does not participate
  in filters, search or contextual summaries, and existing pages gain new capabilities only by an
  explicit owner action.
- Diario stays separate and derived: only a dated page with no enabled structured capability is a
  journal entry. A dated Source, Grammar or Vocabulary page remains in Pages.
- The Pages library uses overlapping role filters (Sources, Grammar, Collections and Notes), while
  one saved focus keeps reading order predictable. Notes filtering means Notes-led pages.
- Built-in creation recipes and Copy page structure remain creation-only; there is no stored
  template identity, custom page-kind builder or template manager.
- Source and Grammar receive the durable behavior validated during brainstorming. Thinking and
  opinions, situations, register, slang and profanity remain Vocabulary starter recipes rather
  than new persistent subtypes.

Phase 7 is staged from contract/schema durability through shared page foundations, creation,
Source, Grammar, contextual retrieval and integration. See
[PHASE-7-DIRECTION.md](PHASE-7-DIRECTION.md). The earlier questions and Phase 4j–4o outcomes above
remain the historical rationale for this evolution.

### Phase 7 implementation outcome — 2026-08-04

The composable page model, schema-v5 migration and backup validation, shared page workspace,
overlapping library roles, family-first creation, structure copying, Source notebooks, Grammar
guides with exact Source-capture references, and active contextual retrieval are deployed from
`main`. The retained legacy profile APIs are compatibility adapters only; current identity
comes from `pageFocus` and enabled structures. The full 593-test serial suite, production build,
and diff check pass. GitHub Pages deployment completed successfully; the disposable browser
closeout remains unverified. See
[PHASE-7-REPORT.md](PHASE-7-REPORT.md).

### Phase 9 free-practice outcome — 2026-08-05

The owner approved a separate filtered free-practice flow in the Words & phrases hub. It uses the
hub's current result set, a transient 10/20/All and shuffle/current-order preflight, entry-level
Spanish-first cards, and session-only Again/Got it feedback with optional missed-only rounds. This
does **not** expand Vocabulary-page Practice: Collection order, reveal-only behavior and lack of
history remain unchanged. It also does not integrate with scheduled Repaso or persist a grade,
score, deck, history or schedule. See [PHASE-9-DIRECTION.md](PHASE-9-DIRECTION.md).

---

## Personal-content provenance

- **Date added:** 2026-08-02
- **Last reviewed:** 2026-08-02
- **Status:** Captured
- **Origin:** Preliminary information-architecture review and follow-up discussion
- **Potential data impact:** Medium at entry level; high at meaning/field level; intersects links,
  events, backup, dictionary boundaries, and Phase 6 AI policy

### Description and current context

Provenance answers where information came from or how it was produced. The replaceable reference
dictionary already records source IDs, dataset versions, licensing, and stock-example attribution.
Personal items do not have a comparable structured provenance model. A personal item may link to a
source page, retain a dictionary attachment, or describe its origin in notes, but those mechanisms
do not state exactly which content came from which source.

Several questions are currently grouped under “provenance”: where an expression was encountered,
which source supports a meaning, whether content was personal/imported/AI-assisted, and whether
generated content was later edited. They may require different solutions.

### Potential options

1. **Informal provenance.** Continue using linked source pages, media URLs, and notes.
2. **Entry-level origin.** Record an origin type, linked source item or URL, and capture date for the
   whole entry.
3. **Multiple source references.** Allow an entry to cite several encounters or supporting sources.
4. **Field- or meaning-level provenance.** Attach origin information to a particular meaning,
   example, or note.
5. **AI-specific provenance.** Record which content was proposed by AI, what was approved, and
   whether it was later edited.
6. **Content-history model.** Preserve a fuller record of imported, generated, and personal changes.

### Expected owner value

- Makes it easy to return to the original learning context.
- Helps assess the trust and personal relevance of a meaning or example.
- Keeps personal writing, open-reference content, source-derived notes, and future AI drafts
  distinguishable.
- Supports source-based vocabulary browsing and review.
- Prevents AI-assisted content from becoming indistinguishable from verified personal observations.

### Risks and tradeoffs

- One entry may combine information from several sources, making one origin misleading.
- Field-level provenance can make editing visually and conceptually heavy.
- “Heard in a podcast” could be stored both as a relationship and provenance, creating duplication.
- AI model metadata may age quickly and is not itself proof of correctness.
- A content-history system would be a major expansion; current edit events do not store field values
  or act as version history.
- Personal source context may contain private information and must remain on-device under current
  policy unless deliberately included in a future AI request.

### Evidence needed

- How often the owner currently records sources in notes, media links, or linked pages.
- Whether provenance is needed mainly for rediscovery, trust, citation, or AI transparency.
- Whether entries commonly combine multiple sources.
- Which content units need provenance: whole entry, meaning, example, note, or individual edit.

### Potential timing

Source-encounter needs can be studied during a real-data audit. AI provenance should be decided
before or alongside Phase 6 entry-generation design so generated content does not establish an
implicit provenance model by accident. A durable implementation requires its own storage and
backup plan.

### Questions for a future discussion

- Is the primary question “where did I hear this?” or “who produced this content?”
- Is a typed link to a source page sufficient for common cases?
- Must AI provenance survive later manual edits, and at what level of detail?

---

## Learning depth (cloze, reverse, drill, audio)

- **Date added:** 2026-08-06
- **Last reviewed:** 2026-08-06
- **Status:** Implemented locally — Phase 10a–10d, not deployed
- **Origin:** Owner asked what additional learning features the app could support
- **Potential data impact:** None. No schema change, no new event types, no stored counters;
  `SCHEMA_VERSION` stays 4 and backups are untouched

### Description and current context

Repaso trained exactly one task: see the Spanish term, recall the English meaning. Meanwhile the
notebook already stored material no learning surface used — per-meaning and entry examples,
dictionary stock examples, and full paradigms for around 1,250 verbs.

An audit of that gap produced a longer candidate list, sorted by architectural cost. The four
cheapest — all derivable from existing data — were approved together as Phase 7.

### What shipped locally

- **10a — session direction.** es→en, en→es or mixed, chosen at session start and fixed per card
  at snapshot. Reverse withholds the term, its suffix and every Spanish usage cue until reveal.
  A card with no gloss always faces forward. Review events now record `direction` and `face`
  beside the grade.
- **10b — cloze cards.** The word blanked out of one of its own example sentences. The owner's
  sentences are preferred over the dictionary's; verbs match through their conjugation table, so
  a personal example in the preterite still works for the lemma. The gap is a real empty span,
  not the answer hidden by colour.
- **10c — conjugation drill.** An ungraded pass over six everyday tenses, launched from Repaso.
  Writes no events at all — not even a `view`.
- **10d — pronunciation.** A speaker button using the browser's own voices. Zero storage, nothing
  sent anywhere; renders nothing where the device has no Spanish voice.

### Deliberately not built

- **Confusion-pair drills** from `often_confused` / `contrast` annotations. The data is already
  curated and the idea remains attractive; it was dropped from this batch for scope.
- **Frequency weighting** of dictionary suggestions using `freqRank`. Judged the weakest of the
  candidates: it cannot apply to "searched for, not found" at all, because a miss means the
  dictionary had no entry and therefore no rank.
- **Per-direction scheduling**, drill grading or history, TTS on dictionary pages, and persisting
  the direction choice. The first two are §14 territory; the others lacked a reason.

### Evidence to collect from real use

- Whether cloze fires often enough to be worth it, or whether too few entries carry examples.
- Whether reverse cards feel productive or merely harder, and whether mixed is the one that gets
  used once the novelty passes.
- Whether one Leitner ladder across both directions stays believable, or whether a word known one
  way and not the other starts to feel mis-scheduled. The recorded `direction` metadata is what a
  future answer would be built from.
- Whether the ungraded drill gets used at all, and whether its lack of history becomes a real
  frustration rather than a principled boundary.
- Whether the six drilled tenses are the right six.
- Whether the device's Spanish voice is good enough to be worth tapping.

### Questions for a future discussion

- Does real use justify revisiting §14 on per-direction scheduling, and what evidence would settle it?
- Should the confusion-pair drill be built next, given the annotations already exist?
- Should cloze ever draw on Diario writing, which is the owner's own Spanish in context?

---

## Document history

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
