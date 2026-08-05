# Phase 7 implementation report — composable pages, Source notebooks and Grammar guides

**Implementation status:** assembled locally on `phase-7-composable-pages` on 2026-08-04.

**Release status:** automated verification passed locally; not pushed or deployed. The disposable
375×812 browser closeout remains unverified because the in-app browser could not bootstrap. Final
approval and deployment remain pending. This report must not be read as a production claim.

The approved contract is in [PHASE-7-DIRECTION.md](PHASE-7-DIRECTION.md). This report records the
implementation now present on the feature branch, its durability boundaries, the evidence already
observed, and the checks still required before release.

## Outcome

Phase 7 retains the two-item architecture—lexical items and pages—and replaces the exclusive
General/Vocabulary Collection profile with a composable page model. Every page has one leading
focus, the existing body remains its permanent Notes capability, and Vocabulary, Source, and
Grammar structures can be enabled independently. A page can therefore be a Source notebook,
Grammar guide, and vocabulary hub at the same time without becoming a third content type.

Existing content remains ordinary page data: IDs, body, date, tags, media links, connections,
relationship annotations, events, preferences, and timestamps keep their established meaning.
Phase 6 AI behavior was not changed.

## Delivered implementation

### Schema v5 and durability

- `SCHEMA_VERSION` is 5 with no Dexie store or index change. Every current page stores
  `pageFocus`, a complete `collection`, a complete `source`, and a complete `grammar` structure;
  schema-v5 pages do not store `pageProfile`.
- Stable `source-capture:`, `grammar-section:`, and `grammar-example:` UUIDs join the existing
  stable page-group IDs. Array order remains display order.
- V4 Collections migrate to Vocabulary focus with Vocabulary enabled. Other pages migrate to Notes
  focus with Vocabulary disabled, preserving dormant groups and existing links. Every migrated
  page receives empty disabled Source and Grammar structures.
- Direct v1, v2, v3, and v4 upgrades run the earlier migrations and v4→v5 conversion in order.
  The startup gate requires an untouched validated pre-upgrade export for schemas 1–4.
- Backup schemas 1–5 upgrade sequentially in memory and are fully validated before replacement.
  Validation covers the complete nested shape, stable/unique IDs, fixed enums, HTTP(S) Source
  URLs, nonblank unique section names, required capture and Spanish-example text, focus/capability
  consistency, active and hidden populated structures, personal lexical membership authority, and
  exact Source-capture references. Newer backups remain blocked.
- Journal routing is now derived from a date plus no enabled structured capability. A dated Source,
  Grammar, or Vocabulary page remains in Pages; a dated Notes-only page belongs to Diario.

### One composable page workspace

- The page detail experience now uses one shared shell for Notes, Vocabulary, Source, and Grammar.
  Its focus chips persist immediately, and enabled structures follow the approved focus-specific
  section order.
- Notes-led pages show the body in full. Specialized focus keeps the Notes body available as a
  compact expandable overview while the focused structure leads.
- Customize Page selects focus, toggles each optional structure, reports preserved-content counts,
  and previews the resulting order. Turning off the current structured focus falls back to Notes;
  turning the last capability off on a dated page communicates its move to Diario.
- Vocabulary Read, Organize, and Practice remain available whenever Vocabulary is enabled,
  regardless of which capability leads the page.
- The Pages library uses overlapping All, Sources, Grammar, Collections, and Notes role filters.
  Notes means Notes-led; the other roles follow enabled structures. Cards show focus first, active
  role badges, and role-aware counts while preserving empty-query pin priority.

### Creation and copying

- Page creation is family-first: Notes, Vocabulary, Source, Grammar, or Copy page structure.
- Vocabulary recipes cover Blank, Conversational function, Situation/context, and Register/usage.
  Source recipes cover book/written work, podcast/audio, film/video, and article/lesson. Grammar
  recipes cover rule/construction, compare forms, and example bank. Source and Grammar recipes
  enable Vocabulary by default.
- Grammar recipes seed the approved editable section names. No recipe or starter identity is
  stored.
- Copy page structure copies focus, enabled capabilities, Collection group names, and Grammar
  section names with fresh IDs. It clears prose, dates, tags, media, links, Source identity and
  captures, Grammar key idea and section contents, and all examples.

### Source notebooks

- Source provides optional format, creator, scope, HTTP(S) URL, and context fields plus a prominent
  overview.
- Passage, Reflection, Language note, and Question captures share one ordered stream. A capture is
  not created until nonblank text is saved; canceling a blank quick-capture draft writes nothing.
- Captures support optional location, reflection/context, and capture-level vocabulary enrichment.
  The stream has type filters, visit-local normalized search, expandable long passages, edit/delete
  controls, and phone-safe up/down organization.
- Source vocabulary uses the page's authoritative membership, de-duplicates rollups, and continues
  to expose the full Vocabulary groups and Practice when Vocabulary is enabled.

### Grammar guides and exact Source references

- Grammar provides a page-level key idea and ordered named sections with explanation, pattern, and
  ordered Spanish/English examples. Editors support section/example creation and changes plus
  draft reordering, section renaming, adding sections, and moving examples between sections.
- Nonempty sections cannot be deleted until their examples are moved or removed. Section names are
  trimmed, required, and normalized-unique within the guide; saved examples require Spanish text.
- Each example can attach page vocabulary and at most one exact Source capture. The picker includes
  enabled Source structures on this page and other pages.
- External exact references create or promote one outgoing ordinary page link while preserving
  existing relationship annotation meaning. Same-page references create no illegal self-link.
  If a referenced Source structure is later hidden, Grammar identifies the related page without
  exposing the hidden capture until Source is re-enabled.

### Authority, cleanup, events, and retrieval

- One atomic page-vocabulary transaction now resolves existing personal entries, dictionary
  entries, and new lexical drafts for Collection groups, Source captures, and Grammar examples.
  Dictionary choices materialize or reuse personal lexical items before contextual attachment.
- `linkedKeys[]` remains authoritative for page vocabulary and ordinary connections. Nested
  `itemKeys` only describe placement/context, and an external exact Source reference requires its
  ordinary outgoing page link. Incoming-edge promotion preserves relationship orientation and
  annotations.
- Detaching an item from one capture or example keeps page membership. Removing page vocabulary
  reports and clears every group/capture/example placement, including hidden ones. Deleting a
  capture clears exact references without removing ordinary page connections; deleting an item or
  page performs transactional nested cleanup.
- Explicit configuration, focus, Source, Grammar, and organizer saves follow the approved one-edit
  boundary. Membership-only bookkeeping and dependent-reference cleanup remain event-free, and
  automatic cleanup does not touch the dependent page's timestamp.
- Pages-only search adds active Source/Grammar structured text and contained vocabulary while
  returning each page once with its best reason. Global search keeps lexical results primary and
  shows up to two active page contexts plus an overflow count; lexical detail exposes the complete
  active context list. Disabled structures and relationship notes stay outside retrieval. All new
  comparisons continue through the normalizer that distinguishes `año` from `ano`.

## Verification record

The implementation contains focused tests for constructors, nested validation, migration,
backup/restore, startup gating, transaction rollback, exact-reference authority and cleanup,
Journal routing, creation/copying, Source, Grammar, customization, library filters, cards,
navigation, contextual retrieval, and existing Collection/relationship behavior.

Implementation-time focused snapshots already observed include:

- 6/6 Source-section component tests;
- 17/17 creation/starter tests;
- 39/39 focused contextual-retrieval/card tests;
- 59/59 focused mutation, exact-reference, dependent-cleanup, and transaction-rollback tests;
- 162/162 tests in the composable-page compatibility and legacy-profile-removal regression matrix;
- 25/25 post-audit Source UI and page-mutation tests;
- 28/28 post-audit Grammar UI and page-mutation tests; and
- 27/27 post-audit customization, routing, composed-page, and retrieval integration tests.

These are independent focused snapshots and may overlap; they are not presented as one additive
phase-wide test total.

Four deliberate red/green proofs established that the high-risk tests could detect their targeted
regressions before the correct implementations were restored:

- Breaking the Source stream's shared normalization made its `año`/`ano` visit-local search test
  fail; restoring normalized comparison returned the Source suite to green.
- Forcing the v4 Collection migration's `vocabularyEnabled` mapping to `false` produced two
  migration-test failures; restoring the mapping returned that focused suite to 4/4 green.
- Omitting the deleted capture ID from exact Source-reference cleanup produced three
  page-structure-test failures; restoring exact dependent cleanup returned that suite to 13/13
  green.
- Reversing contained-vocabulary heading-versus-meaning offsets produced one search-test failure;
  restoring Spanish-heading priority returned that suite to 34/34 green.

These focused snapshots do not replace the release gates below.

| Release gate | Status on this report snapshot |
|---|---|
| Complete serial Vitest suite | Passed: `npm.cmd test -- --no-file-parallelism`, 58 files / 593 tests in 229.90s |
| Production build | Passed: `npm.cmd run build`, Vite built 1,863 modules in 4.49s |
| Working-tree whitespace check | Passed: `git diff --check` |
| Planned deliberate high-risk failure proofs | Passed: migration mapping, exact Source cleanup, contained-vocabulary priority, and Source ñ normalization each failed under a deliberate break and passed after restoration |
| Disposable seeded 375×812 browser flow | Unverified: bootstrap failed with `failed to write kernel assets: The system cannot find the path specified. (os error 3)`; no owner data inspected |
| Subphase commit/release ledger | Passed locally: 7a `eab42e0`; 7b `6d7bb82`; 7c `2c9eaa5`; 7d `5f683a9`; 7e `6da4493`; 7f `6a12be8`; this report and final records form the staged 7g commit |
| Push and deployment | Not performed; requires explicit approval |

## Explicit exclusions retained

Phase 7 does not add a third content type, folders, a free-form block editor, custom page kinds, a
user-authored template manager, file attachments, rich-media cataloging, deep provenance, Source
parent/child hierarchies, reading progress, a richer Journal schema, Collection grading or
scheduling, sync/accounts/server behavior, or AI features. Built-in recipes remain creation-only,
Source/Grammar structure is added to an existing page only by owner customization, and the complete
schema-v5 interface must release together rather than exposing partial toggles.
