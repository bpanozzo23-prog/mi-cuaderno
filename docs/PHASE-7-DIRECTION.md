# Phase 7 direction — composable pages, Source notebooks and Grammar guides

**Status:** implemented locally on 2026-08-04; the 593-test serial suite, production build, and
diff check pass. The disposable browser closeout is unverified; release approval and deployment
remain pending.

This document is the decision-complete implementation direction for Phase 7. The governing product
rules remain in `docs/mi-cuaderno-project-brief-v3.md`, and the reasons for the choices below are
recorded in `DECISIONS.md`. The earlier exploration remains in `docs/IMPROVEMENT-IDEAS.md`.

## Purpose and owner value

The existing Vocabulary Collection proved that a page becomes more useful when its primary content
matches its purpose. It also exposed the limit of one exclusive profile: a book page may need
passages, reflections, vocabulary and a linked grammar explanation at the same time.

Phase 7 keeps the notebook's two durable top-level types — lexical items and pages — and makes page
behavior composable. It should make Pages easier to create, scan, organize and retrieve while
turning Source and Grammar pages into dependable vocabulary hubs. Diario remains a separate calm
reflection workspace rather than becoming another capability to configure.

## Release boundary

Every page has:

- one persistent leading focus: Notes, Vocabulary, Source or Grammar;
- permanent body-based Notes behavior;
- independently enabled Vocabulary, Source and Grammar structures;
- reversible configuration, so disabling a populated structure hides rather than deletes it; and
- all existing common page fields: title, body, optional date, tags, media links, connections,
  annotations, IDs and timestamps.

Phase 7 includes schema-v5 migration and backup durability, the shared composable Page detail,
overlapping Pages-library roles, family-first creation and copy-empty-structure, Source capture,
Grammar guides, exact Source-capture references and contextual retrieval.

It does not include a third content type, folders, a free-form block editor, custom page kinds, a
stored or user-authored template manager, file attachments, rich-media cataloging, Source
parent/child hierarchies, deep provenance, reading progress, a richer Journal schema, Collection
grading/scheduling, or AI behavior. Phase 6 may remain unstarted while this independently scoped
phase proceeds.

Schema v5 and all user-facing capabilities deploy together only after final approval. No partially
implemented Source or Grammar toggle is exposed in production.

## Schema-v5 page contract

`pageProfile` is removed. Common and lexical item fields remain unchanged. Every page stores:

```js
{
  type: "page",
  pageFocus: "notes" | "vocabulary" | "source" | "grammar",

  collection: {
    enabled: boolean,
    groups: [{ id, name, itemKeys: [] }]
  },

  source: {
    enabled: boolean,
    format: "" | "book" | "audio" | "video" | "article_lesson" | "other",
    creator: string,
    scope: string,
    url: string,
    context: string,
    captures: [{
      id: "source-capture:<uuid>",
      type: "passage" | "reflection" | "language_note" | "question",
      text: string,
      location: string,
      reflection: string,
      itemKeys: []
    }]
  },

  grammar: {
    enabled: boolean,
    keyIdea: string,
    sections: [{
      id: "grammar-section:<uuid>",
      name: string,
      explanation: string,
      pattern: string,
      examples: [{
        id: "grammar-example:<uuid>",
        es: string,
        en: string,
        note: string,
        itemKeys: [],
        sourceCaptureRef: null | { pageId, captureId }
      }]
    }]
  }
}
```

### Validation and identity

- Notes focus is always valid. Vocabulary, Source and Grammar focus is valid only while the
  corresponding structure is enabled.
- A disabled structure may be populated. Its complete contents and order remain valid and backed
  up, but it is hidden from normal presentation, role filters, search and contextual summaries.
- Array order is display order. Nested IDs use their named prefixes, remain stable through editing
  and reordering, and are unique within their owning page/array where references require it.
- Collection group names and Grammar section names are trimmed, nonblank and unique within their
  owner under Unicode NFKC normalization plus case folding.
- `source.format` uses only the fixed values above. A Source URL is blank or a valid HTTP(S) URL.
- A saved Source capture requires nonblank `text`. A saved Grammar example requires nonblank `es`;
  English and its explanatory note are optional.
- A Grammar example has at most one `sourceCaptureRef`. Its `pageId` must resolve to a personal page
  and its `captureId` must resolve to a capture on that page, including hidden preserved Source
  content.

### Authority and cleanup

- `linkedKeys[]` remains authoritative for ordinary connections and page vocabulary membership.
  Only an outgoing page link to a personal lexical item is a vocabulary member.
- Collection-group, Source-capture and Grammar-example `itemKeys` are placement/context references
  to those authoritative members. They never create membership independently and never contain raw
  dictionary keys.
- Adding a dictionary selection first creates or reuses its independent personal lexical
  attachment. Incoming lexical connections are promoted to the page-owned direction with any
  directional relationship annotation reoriented as already established for Collections.
- Attaching vocabulary to a capture or example also establishes page membership in the same atomic
  transaction. Detaching it from that capture/example keeps page membership.
- Removing vocabulary from the page calculates and displays the number of active and hidden
  group/capture/example references that will be cleared, then requires confirmation before one
  atomic write.
- Deleting a Source capture removes exact references to it from Grammar examples on this or other
  pages but keeps ordinary page connections and page vocabulary membership.
- Deleting a lexical item prunes all active and hidden group/capture/example references. Deleting a
  page prunes incoming exact Source references as well as the established ordinary links and
  annotations. No dangling nested reference may survive import, mutation or deletion.
- An external exact Source reference requires one ordinary connection between the Grammar and
  Source pages. Creating the exact reference creates or promotes that connection with implicit
  Related semantics unless existing relationship metadata must be preserved. A same-page reference
  requires no self-link.

### Journal derivation

- A page is a Diario entry only when `pageDate` is present and Vocabulary, Source and Grammar are
  all disabled.
- A dated enhanced page remains in Pages. Existing dated Collections therefore remain Pages after
  migration; existing dated General pages remain Diario entries.
- Customize Page is unavailable inside Diario. The established Move to Pages action clears the
  date first. If a dated enhanced page disables its final capability, the configuration action is
  labeled **Save and move to Diario**.

## Migration, backup and event rules

### Schema migration

- Bump `SCHEMA_VERSION` from 4 to 5 without changing stores or indexes.
- V4 Collection pages migrate to Vocabulary focus with `collection.enabled: true`.
- Every other page migrates to Notes focus with `collection.enabled: false`; any dormant Collection
  groups and every existing link remain intact.
- Add an empty disabled Source structure and an empty disabled Grammar structure to every page.
- Remove `pageProfile` after deriving the v5 values so no competing identity remains.
- Preserve IDs, dates, body, tags, media, links, annotations, meanings, events, preferences,
  timestamps, Collection group/item order and legacy topology exactly.

### Export-first gate and backups

- Before v5 opens, schema-v1, v2, v3 and v4 databases must produce an untouched fully validated
  export and receive explicit saved-file acknowledgement.
- Direct legacy upgrades run v1→v2 meanings, v2→v3 page profiles, v3→v4 annotations and v4→v5
  composable pages in order.
- Backup schemas 1 through 5 are accepted and upgraded sequentially in memory; the complete v5
  envelope is deeply validated before replace-and-restore is offered. Newer versions are blocked.
- V5 validation includes the nested shape, prefixes, duplicate IDs, fixed enums, URLs, section-name
  uniqueness, focus/capability consistency, hidden populated structures, membership authority,
  dangling references and external/same-page Source-reference rules.
- Current v5 exports round-trip exactly. Import still replaces the personal layer only and never
  includes the reference dictionary or API key.
- Update migration-gate language to describe composable pages and Source/Grammar structures rather
  than relationship metadata.

### Mutations, timestamps and events

- Provide atomic domain operations for page configuration, persisted focus, Source capture saves,
  Grammar guide saves, exact Source references, structure copying, membership impact calculation
  and removal cleanup.
- Extract the existing personal/dictionary/new-vocabulary resolution into one shared transaction
  path used by Collections, Source captures and Grammar examples.
- A changed configuration save, persisted focus tap, Source-capture save, Grammar-guide save or
  changed organizer save writes exactly one page `edit`. New pages and newly materialized lexical
  items retain their existing single `create` event.
- Migration, pinning, card expansion, visit-local modes/filters/search, Practice, membership-only
  bookkeeping, automatic dependent cleanup, Cancel and no-op Save write no events.
- Explicit saves update the owning page normally. Cleanup performed only because another item,
  page or capture changed preserves the dependent page's `updatedAt`.

## Page presentation and configuration

One shared nonjournal Page shell owns focus and composes reusable Notes, Vocabulary, Source and
Grammar sections. The existing App detail trail and scroll ownership remain intact.

- Notes focus: full body, Source, Grammar, Vocabulary.
- Source focus: four-line expandable body overview, Source, Vocabulary, Grammar.
- Grammar focus: four-line expandable body overview, Grammar, Vocabulary, Source.
- Vocabulary focus: four-line expandable body overview, Vocabulary, Source, Grammar.
- Disabled sections do not render. Empty enabled sections render their useful starting actions.
- Vocabulary retains the established Collection Read, Organize and Practice behavior whenever it
  is enabled, even when another focus leads.
- Focus chips persist immediately and write one page edit. Selecting an unavailable structured
  focus is impossible.
- Customize Page offers one focus choice, three structure toggles, counts of content that will be
  preserved while hidden and a live section-order preview. Disabling the current focus selects
  Notes before save.

## Pages library and creation

### Overlapping retrieval

Replace the exclusive General/Collection selector with one single-choice role filter:

- **All** — every nonjournal page;
- **Sources** — Source enabled;
- **Grammar** — Grammar enabled;
- **Collections** — Vocabulary enabled; and
- **Notes** — saved focus is Notes.

A page may appear in several capability filters. Cards show the leading focus badge first, then
other enabled-role badges, along with relevant counts: captures; sections/examples; and vocabulary
members/groups. Existing pins stable-partition only empty-query browsing and never boost search.

### Family-first creation

Creation chooses a family first, then an optional built-in recipe. Recipes seed editable empty
structure and store no recipe/template identity.

- **Notes:** Blank.
- **Vocabulary:** Blank; Conversational function; Situation/context; Register/usage.
- **Source:** Book/written work; Podcast/audio; Film/video; Article/lesson. Each seeds its matching
  Source format and enables Vocabulary by default.
- **Grammar:** Rule/construction; Compare forms; Example bank. Each enables Vocabulary by default.
- **Copy page structure:** choose an existing nonjournal page.

Grammar recipes seed editable section names:

- Rule/construction: Formation; When to use it; Exceptions and contrasts.
- Compare forms: Form A; Form B; Choosing between them.
- Example bank: Examples.

Copy page structure creates fresh nested IDs and copies only focus, enabled structures, Collection
group names and Grammar section names. It clears body, date, tags, media, links, Source metadata and
captures, Grammar key idea, explanations, patterns and examples. No source page ID or template ID
is retained. Existing pages are never inferred or automatically converted from their content.

## Source notebook

Source focus leads with its optional identity and page overview, then the capture stream.

- A single Capture menu offers Passage, Reflection, Language note and Question.
- Quick Capture creates no stored record until nonblank text is saved; Cancel and blank text leave
  no capture or event.
- Creation and editing may enrich a capture with optional location, reflection/context and
  vocabulary. Capture vocabulary is de-duplicated in the page rollup.
- The capture stream is flat and follows saved order. It provides visit-local type filters and
  normalized local search, long-text previews with expansion, edit/delete actions, and a draft
  organizer with phone-safe up/down controls and explicit Save/Cancel.
- The complete reusable Vocabulary groups, Not grouped yet rollup, Add, Organize and Practice appear
  below captures when Vocabulary is enabled, with a top jump to Vocabulary.
- Manually added page vocabulary and capture-attached vocabulary share one de-duplicated rollup.
  Removing a capture attachment leaves the item in that rollup until the owner removes page
  membership explicitly.
- Related Grammar guides, Diario moments and other pages remain ordinary Connections. Source
  parent/child relationships and attachments are not introduced.

## Grammar guide

Grammar focus leads with the key idea and ordered guide sections.

- Each section has an editable name, explanation and pattern plus flexible example pairs.
- Each example stores required Spanish, optional English, an optional explanatory note, optional
  vocabulary attachments and at most one Source-capture reference.
- Explicit editors create and edit sections/examples. A draft organizer supports section rename and
  order, example order, moving examples between sections and adding sections, all with phone-safe
  controls and explicit Save/Cancel.
- A nonempty section cannot be deleted until its examples are moved or deleted.
- The Source picker offers captures from enabled Source structures, including the current page.
  Hidden Source content cannot be newly selected.
- If an already referenced Source structure becomes hidden, Grammar shows the related page and a
  clear “Source structure hidden” state without exposing the capture text; re-enabling Source
  restores the exact context.
- When Vocabulary is enabled, the same de-duplicated vocabulary rollup and Collection tools appear
  below the guide. Vocabulary focus may lead the same page later without changing its contents.

## Contextual retrieval

- Preserve existing title ranking. Active Source identity/capture text and active Grammar key
  ideas, section names, explanations, patterns and examples join page context at tier 6 with an
  explicit match reason.
- In Pages-only search, a page may also match the Spanish term or personal-meaning gloss of its
  contained vocabulary. Return the page only once with its best match/context reason; the search
  implementation receives the full item set even though candidate results are pages.
- In global search, contained vocabulary does not create extra page results. The lexical result
  instead shows up to two active page contexts and **+N more**.
- Lexical detail lists every active context: Vocabulary group, Source capture type/location, or
  Grammar section/example. Disabled structures contribute no context or searchable text.
- Relationship notes remain outside search. All matching and uniqueness comparisons use the
  established normalizer that preserves ñ.

## Staged implementation

Use one feature branch and one commit per completed sub-phase. Each slice must leave its covered
contracts verified; do not push or deploy until the owner explicitly approves the complete release.

### 7a — contract and schema durability

- Amend the brief, decision log and improvement record; create this direction document.
- Implement schema-v5 constructors, nested IDs/validation, v4→v5 migration, direct legacy chains,
  export-first gating, backup schemas 1–5 and deep reference validation.
- Prove migration preserves every legacy field and that corruption/rollback cases fail safely.

### 7b — composable-page foundation

- Replace profile helpers with focus, capability-role and Journal derivations.
- Introduce the shared Page shell and reusable Notes/Vocabulary sections while retaining Collection
  Read/Organize/Practice and navigation behavior.
- Add persisted focus and Customize Page with reversible hide/preserve behavior.

### 7c — Pages library and creation

- Add overlapping role filters, focus-first badges, role-aware counts and updated card summaries.
- Implement family-first starters and copy-empty-structure with fresh IDs and no stored identity.
- Preserve current empty-query pin and deliberate-search behavior.

### 7d — Source notebook

- Implement Source identity, all four capture types, quick capture, editors, stream filters/search,
  draft organization, contextual vocabulary and the full Vocabulary section.
- Add atomic capture/membership mutations and cleanup tests.

### 7e — Grammar guide and exact Source references

- Implement key idea, sections, examples, editing/organization, vocabulary attachments and section
  deletion protection.
- Add enabled-Source picking, same-page references, external link promotion/preservation and hidden
  target behavior.

### 7f — contextual retrieval

- Search active Source/Grammar content and contained vocabulary on the Pages surface.
- Add global lexical context summaries and the complete lexical-detail context list.
- Verify ranking, reasons, de-duplication, hidden-content exclusion and ñ preservation.

### 7g — integration, verification and release record

- Run focused suites after every slice, then the complete serial suite and production build.
- Complete the direction/report/README/decision closeout only after implementation evidence exists.
- Attempt the full disposable seeded 375×812 migration and workflow pass. If browser control cannot
  initialize, report that condition as unverified and never inspect the owner's browser data.
- Deploy the complete v5 release only after explicit owner approval.

## Acceptance and failure-proof matrix

High-risk migration, cleanup and search tests must be observed failing against a deliberate defect
before their passing result is accepted.

- **Shape and migration:** constructors, required nested arrays, IDs, enums, URL rules, unique
  section names, focus validity, disabled populated structures and exact v4→v5 mappings.
- **Legacy durability:** direct v1, v2, v3 and v4 database upgrades; schema 1–5 backup imports;
  export acknowledgement; newer-version rejection; exact v5 round-trip; preservation of IDs,
  timestamps, events, preferences, links, annotations and Collection order.
- **Reference authority:** atomic dictionary/personal/new vocabulary resolution; incoming-edge
  promotion; contextual attachment/detachment; active and hidden cleanup; source-reference link
  requirements; same-page references; deletion of lexical items, captures and pages; rollback on
  every invalid final state.
- **Journal routing:** dated Notes-only pages, dated enhanced pages, last-capability disabling,
  restored structures and the established Move to Pages path.
- **Existing behavior:** Collection capture/organization/Practice, pins, annotations, alias and
  orphan handling, lexical-side assignment, navigation, Diario, Repaso and event history.
- **Representative Source flow:** migrate an audio Source fixture; capture all four types; attach
  existing, dictionary and new vocabulary; reorder, search, hide and restore; export and re-import.
- **Representative Grammar flow:** create a Compare forms guide; edit and reorganize sections;
  attach vocabulary; connect an external and same-page exact Source capture; hide/restore Source;
  remove referenced records safely.
- **Retrieval:** overlapping roles, Notes-led filtering, structure copying, active structured-text
  matches, contained-vocabulary Pages matches, global lexical summaries, full detail contexts,
  reasons, de-duplication and hidden-content exclusion.
- **Phone acceptance at 375×812:** four focus chips, multiple badges, long passages, editors,
  organizers, dialogs, pickers, keyboard use, minimum touch targets and no horizontal overflow,
  warnings or console errors, using disposable seeded data only.
