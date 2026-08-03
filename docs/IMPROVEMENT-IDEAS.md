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
| Source-oriented page templates | 2026-08-02 | Captured | Can discuss now; validate permanent structure with real pages |
| Meaning-block presentation | 2026-08-02 | Captured | Visual options can be discussed now; structured meanings need real data |
| Typed or explained relationships | 2026-08-02 | Captured | After observing real links and dense hubs |
| Saved views | 2026-08-02 | Captured | After observing repeated retrieval/filter patterns |
| Persistent page kinds | 2026-08-02 | Captured | After reviewing how real pages cluster and overlap |
| Personal-content provenance | 2026-08-02 | Captured | Before or alongside Phase 6 AI design; source needs can be studied earlier |

---

## Source-oriented page templates

- **Date added:** 2026-08-02
- **Last reviewed:** 2026-08-02
- **Status:** Captured
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

A text-only template could be prototyped without a schema change once the owner wants to evaluate
the workflow. Persistent fields or source kinds should wait for a real-page audit and a separate
migration/storage discussion.

### Questions for a future discussion

- Which two or three source categories actually recur?
- Should a template only insert prompts, or should it affect later display?
- Is a linked source page sufficient provenance for a word, or is more detail needed?

---

## Meaning-block presentation

- **Date added:** 2026-08-02
- **Last reviewed:** 2026-08-02
- **Status:** Captured
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

## Persistent page kinds

- **Date added:** 2026-08-02
- **Last reviewed:** 2026-08-02
- **Status:** Captured
- **Origin:** Preliminary information-architecture review and follow-up discussion
- **Potential data impact:** Personal-item shape change; may require indexing, migration, backup, and
  brief decisions

### Description and current context

The personal layer has exactly two top-level content types: lexical items and pages. Words and
phrases are lexical forms; a dated page acts as a journal entry, while sources and grammar notes are
ordinary pages. There is no persistent source, grammar, comparison, or topic-hub subtype.

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

### Expected owner value

- Makes creation and labeling more predictable.
- Enables clear page-kind filters and kind-specific empty states.
- Could prioritize dates for journals, linked vocabulary for sources, or patterns for grammar pages.
- Reduces dependence on remembering an exact tag spelling.

### Risks and tradeoffs

- Many pages could fit more than one kind.
- Capture gains an additional filing decision.
- Existing pages need classification or a safe general default.
- Fixed kinds can become restrictive; custom kinds can recreate tag inconsistency under another name.
- Filtering at scale may require an indexed field and therefore a Dexie schema version change.
- A subtype must not accidentally become a forbidden third top-level content type.

### Evidence needed

- Whether real pages form stable, behaviorally meaningful clusters.
- How many pages are ambiguous or combine source, grammar, and journal purposes.
- Which existing tags are already acting like kinds.
- Whether each proposed kind actually needs different display or retrieval behavior.

### Potential timing

Defer persistence until a real-page audit demonstrates stable categories and benefits beyond initial
prompts. If a distinction only changes the starter text, use a template instead of a stored kind.

### Questions for a future discussion

- What ongoing behavior would each kind change?
- Can one page have multiple kinds, or is that a sign the distinction should be a tag?
- How should existing pages be classified without forcing unnecessary cleanup?

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
