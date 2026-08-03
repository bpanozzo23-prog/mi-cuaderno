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
| Source-oriented page templates | 2026-08-02 | Deferred | Source/Grammar profiles and user-authored templates remain outside Phase 4j–4o |
| Meaning-block presentation | 2026-08-02 | Implemented and shipped | Phase 4i |
| Typed or explained relationships | 2026-08-02 | Captured | After observing real links and dense hubs |
| Saved views | 2026-08-02 | Captured | After observing repeated retrieval/filter patterns |
| Persistent page profiles | 2026-08-02 | Implemented and shipped | General and Vocabulary Collection in Phase 4j–4o; richer profiles deferred |
| Personal-content provenance | 2026-08-02 | Captured | Before or alongside Phase 6 AI design; source needs can be studied earlier |

---

## Source-oriented page templates

- **Date added:** 2026-08-02
- **Last reviewed:** 2026-08-03
- **Status:** Deferred
- **Origin:** Preliminary information-architecture review and follow-up discussion
- **Potential data impact:** None for a text-only template; potentially significant for structured
  source fields or a persistent page kind

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
- **Last reviewed:** 2026-08-02
- **Status:** Captured
- **Origin:** Preliminary information-architecture review and follow-up discussion
- **Potential data impact:** Low for clearer direction labels; high for persisted relationship
  types or explanations

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

Clearer direction labels can be evaluated without stored data. Persistent relationship types or
explanations should follow a real-link audit and require a dedicated schema and migration plan.

### Questions for a future discussion

- Is free explanation sufficient, or must relationships be filterable?
- Which relationships are directional, and which should read the same from both sides?
- Should “heard in source” be a relationship, provenance, or both?

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

---

## Persistent page profiles

- **Date added:** 2026-08-02
- **Last reviewed:** 2026-08-03
- **Status:** Implemented and shipped
- **Origin:** Preliminary information-architecture review and follow-up discussion
- **Potential data impact:** Implemented as schema v3 without new stores or indexes; migration,
  export-first gating, backup upgrading, and brief decisions are shipped

### Description and current context

The personal layer still has exactly two top-level content types: lexical items and pages. Words and
phrases are lexical forms. ~~A dated page acts as a journal entry, while sources and grammar notes
are ordinary pages. There is no persistent source, grammar, comparison, or topic-hub subtype.~~
**Phase 4j–4o implemented two stored page profiles: General and Vocabulary Collection.** A dated
General page remains a derived Journal entry, while sources and grammar notes remain General pages.
There is still no stored Source, Grammar, explicit/richer Journal, comparison, or topic-hub profile.

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

### Problems addressed by Phase 4j–4o

The first row is the owner's reported friction. The remaining rows are product limitations and
durability needs that had to be solved to make that workflow dependable.

| Problem | Implemented response |
|---|---|
| A “thinking and opinions” page still looked like a generic note, leaving its linked phrases as secondary content. | Vocabulary Collection makes outgoing personal lexical links the primary content, organized into groups with expandable vocabulary cards; other links are separated as Related. |
| Pages had no durable identity that could change their display or retrieval. | Schema v3 stores `general | collection`; General retains existing behavior, dated General remains Journal, and Collections receive their own display, summaries, and filter. |
| A vocabulary hub could not preserve meaningful sections or manual order. | Durable ordered groups, ordered members, a derived Not grouped yet bucket, visible empty groups, and the draft Organizer preserve the owner's structure. |
| Adding several related words or phrases through the generic single-select linker was cumbersome. | A dedicated Collection picker keeps multi-selection across searches, supports personal and dictionary results plus staged quick-create, and commits the final selection atomically. |
| Dictionary results could be linked but were not editable personal Collection members. | Adding a dictionary selection creates or reuses an independent personal lexical entry before adding membership. |
| Experimenting with a specialized format risked losing organization or disrupting existing pages. | Every page retains dormant Collection metadata, conversion is reversible, and migrated pages safely default to General without changing their existing content. |
| Topic vocabulary had no lightweight, in-context review path. | Collection Practice preserves group and item order, reveals answers independently, excludes Related, and prompts for missing meanings without creating review history. |
| Important vocabulary hubs and their item placements were difficult to rediscover. | Page pins, profile filters, Collection card counts, and Collection placements on lexical details expose both the hubs and where each item belongs. |
| A persistent page schema could endanger existing notebooks and backups. | Export-first v1/v2 startup gating, sequential v1→v2→v3 migration, deep schema-1/2/3 backup validation, transactional writes, and layout cleanup protect existing data. |

### Expected owner value from the implemented release

- Makes a page useful as an organized vocabulary hub rather than just a note with links attached.
- Speeds up capture of several related entries while keeping dictionary material independent and
  editable.
- Makes Collections easier to scan, practice, filter, pin, and revisit from either the page or a
  lexical entry.
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
- Which General pages repeatedly need source, grammar, or richer-journal behavior rather than only a
  starter, date, tag, or body convention.
- How often one page genuinely needs several specialized behaviors at once.

### Potential timing

~~Defer persistence until a real-page audit demonstrates stable categories and benefits beyond
initial prompts.~~ **Partially superseded 2026-08-03:** the owner approved General plus Vocabulary
Collection because Collection has distinct lasting organization, capture, retrieval, and Practice
behavior. The evidence requirement still applies to Source, Grammar, richer Journal, custom
profiles, and user-authored templates; creation-only distinctions should remain starters.

### Questions for a future discussion

- Which future candidates have enough lasting behavior to justify persistence: Source, Grammar,
  explicit/richer Journal, comparison, or something else?
- What exact creation, display, validation, and retrieval behavior would distinguish each from a
  General page with a starter or tag?
- Should specialized behaviors remain mutually exclusive profiles, or should capabilities such as
  source metadata and vocabulary grouping compose on the same page?
- Should Journal remain a date-derived General page, or would richer reflection and practice
  tracking eventually justify explicit fields or profile behavior?
- Should existing General pages always convert only by owner choice when a future profile is added?
- Would user-authored starters or custom profiles support recurring workflows, or mostly recreate
  inconsistent tags and extra setup?
- Does real Collection use justify any of the deliberately deferred Practice features: shuffle,
  grading, history, scheduling, or Repaso integration?

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

## Document history

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
