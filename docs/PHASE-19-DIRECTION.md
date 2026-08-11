# Phase 19 direction — page organization and formatting

**Status:** Grammar hierarchy and Structured Notes increments deployed 2026-08-10; the owner
confirmed the production smoke screen passed.
**Origin:** Real-use friction while building an Indicative-versus-Subjunctive Grammar guide whose
definition, cautions, trigger families and examples required more hierarchy than one flat sequence
of explanation/pattern/example sections could express.

## Outcome

Phase 19 is the durable home for related owner-approved improvements to how Pages are organized
and formatted. Its first release gives Grammar guides formatted section overviews, accessible Note
callouts and exactly one subsection level. A guide can therefore hold top-level concepts such as
Indicative and Subjunctive while keeping SPOCK-style components, trigger lists and their structured
examples beneath the correct concept.

The umbrella is organizational, not blanket approval. A later Page-formatting or organization
increment may join Phase 19 when the owner approves its concrete scope, decisions and verification.
It must still receive any independently required brief amendment, schema migration, export-first
gate and tests. Unrelated Page behavior receives its own scope rather than entering Phase 19 by
label alone.

Phase 19 retains exactly two top-level personal content types, the composable Page model,
authoritative `linkedKeys[]` page vocabulary, exact Source-capture references and event-derived
learning. It adds no general block editor, arbitrary nesting, custom page-kind builder, stored
template identity, new event, preference, dictionary dependency or automatic classification.

The approved second increment extends the same one-level organization to the permanent Notes
foundation on every Page. It keeps existing `page.body` prose as the Notes Overview and introduces
named Notes sections without adding an enable switch or converting prose into blocks.

## 1 — Formatted Grammar overviews and Note callouts

- The existing `grammar.sections[].explanation` string remains the stored field and is relabeled
  **Overview** in the editor. Existing plain text is valid input without conversion.
- Overview editors reuse the notebook Markdown dialect: headings, bold, italic, highlight,
  bulleted and numbered lists, dividers and a Grammar-specific **Note callout** action.
- The Note action stores ordinary Markdown blockquote syntax. In a Grammar overview only, that
  syntax renders as an accessible, visibly labeled `<aside role="note">`; page-body and lexical
  blockquotes remain ordinary quotes.
- Search consumes the existing visible-text projection of an overview, so Markdown punctuation
  and the generated Note label never become searchable content. Disabled Grammar structures remain
  excluded, and every comparison still passes through the normalizer that preserves ñ.
- Key idea, Pattern, Spanish and English example text, and example notes remain plain text. Raw
  HTML, images, tables, code and clickable Markdown links remain unsupported.
- A changed explicit section save writes one ordinary page `edit`; Cancel and no-op Save write
  nothing. The formatting slice was committed independently while schema remained v5, before the
  schema-v6 hierarchy was integrated.

## 2 — Schema-v6 section hierarchy

Schema v6 adds one mandatory field to every Grammar section while retaining the flat ordered
`grammar.sections[]` array:

```js
{
  id: "grammar-section:<uuid>",
  parentId: null | "grammar-section:<uuid>",
  name: string,
  explanation: string,
  pattern: string,
  examples: []
}
```

- `parentId: null` identifies a top-level section. A non-null value identifies a subsection and
  must reference a top-level section on the same page.
- A section cannot parent itself; dangling, cross-page, cyclic and child-of-child references are
  invalid. There is exactly one subsection level.
- Section IDs remain globally unique in a backup. Names are trimmed, nonblank and normalized-unique
  among siblings. The same subsection name may occur under different top-level sections.
- Array position is order among siblings. Mutations save canonical depth-first order, but a valid
  imported backup is not rejected merely because root and child rows are interleaved.
- Top-level and subsection records retain the same Overview, optional Pattern and structured
  examples. Existing sections migrate to top level with `parentId: null`; no existing section or
  example ID changes.

## 3 — Migration and backup durability

- `SCHEMA_VERSION` moves from 5 to 6 without changing Dexie stores or indexes.
- Before any schema-v1 through v5 database opens as v6, the app produces an untouched, fully
  validated source-schema export and requires explicit saved-file acknowledgement.
- Direct database upgrades run every earlier migration in order, followed by a pure v5→v6 step
  that clones each Page Grammar structure and adds `parentId: null` to existing sections.
- Backup schemas 1 through 6 are accepted, upgraded one version at a time and deeply validated
  after every step before any write. Versions newer than 6 remain blocked; current v6 exports
  round-trip exactly.
- The migration preserves IDs, prose and Markdown source, patterns, examples, contextual
  vocabulary, Source references, hidden structures, order, links, annotations, timestamps, events
  and preferences byte-for-byte apart from the new mandatory null field.

## 4 — Editing, organization and deletion

- The Grammar header adds top-level sections. An expanded top-level section offers
  **+ Subsection**; a subsection never offers another nesting action.
- A new subsection is inserted after its parent's existing children rather than after a later
  top-level section.
- The organizer can add and rename sections/subsections, reorder siblings, promote a subsection,
  move it beneath another top-level section, and move examples between any section or subsection.
- A top-level section that owns children cannot become a subsection until those children move.
  Every organizer save contains every current section and example exactly once and is stored in
  canonical depth-first order.
- A section cannot be deleted while it owns examples or subsections. The confirmed delete remains
  inside its editor and explains what must move first.
- Changed section, example and organizer saves write one page `edit`; Cancel and no-op Save write
  none. Referential cleanup caused only by another record remains timestamp- and event-neutral.

## 5 — Phone-first presentation

The owner selected **continuous guide spine** treatment A on 2026-08-10.

- Top-level sections remain collapsible Grammar cards. Lightweight subsection nodes continue the
  guide's vertical spine beneath their parent instead of nesting a second padded card.
- Collapsing a top-level section hides its mounted child subtree without discarding editors or
  child disclosure state. Children collapse independently when the parent is open.
- A root containing populated children counts as populated and starts open. Empty child sections
  retain the existing compact default.
- Long names wrap, new controls keep 44 px touch targets, and the hierarchy consumes no additional
  large phone-width indent.
- Context labels and example-move targets identify children as `Parent › Child`.

## 6 — Creation, copying, counts and retrieval

- Compare forms continues to seed three top-level sections: Form A, Form B and Choosing between
  them. Grammar starter wording now names formatted overviews, subsections and example pairs.
- Copy page structure creates every fresh section ID first, then remaps copied child `parentId`
  values to those fresh parents. It copies names and hierarchy only; overview, pattern, examples,
  vocabulary, Source content and template identity remain cleared.
- Shared Grammar counts distinguish top-level sections, subsections and examples. Zero parts are
  omitted consistently across the guide disclosure, Page cards and Customize Page.
- Grammar search includes visible Overview text from roots and children. Active lexical context
  identifies a child example with its `Parent › Child` breadcrumb.
- Existing flat cleanup loops continue to prune vocabulary and exact Source references from child
  examples. `linkedKeys[]` remains the sole page-vocabulary authority.

## 7 — Structured Notes increment (schema v7)

Every schema-v7 Page adds one mandatory flat array while retaining `body` as its Notes Overview:

```js
noteSections: [{
  id: "note-section:<uuid>",
  parentId: null | "note-section:<uuid>",
  name: string,
  body: string
}]
```

- Null identifies a top-level Notes section; a non-null parent must identify a top-level Notes
  section on the same Page. Self, dangling, cross-page, cyclic and child-of-child parents are
  invalid, and names are trimmed, nonblank and normalized-unique among siblings.
- Notes and Grammar use one parameterized one-level hierarchy engine for reading, canonical
  depth-first writes, counts, breadcrumbs, sibling movement, reparenting and validation. Shared
  organizer rows own those structural controls; Grammar-specific example movement remains an
  extension rather than becoming a general block editor.
- Notes are always available. The Notes disclosure shows the existing `body` as Overview, then
  collapsible roots and continuous-spine child nodes. Roots add one subsection level; the organizer
  adds, renames, reorders, promotes and reparents sections. Section bodies use the existing safe
  Page Markdown reader and ordinary blockquotes, not Grammar's labeled Note callout.
- A root with children cannot be demoted or deleted. Confirmed deletion of a leaf removes its own
  Markdown body because that prose belongs to the section itself; Grammar examples remain protected
  structured children that must move or be deleted independently.
- A nonempty Notes outline counts as durable Page organization. A dated record is Diario only when
  Vocabulary, Source and Grammar are disabled and `noteSections` is empty; body length remains
  irrelevant. Dating or importing an outlined Page keeps it in Pages, while deleting the final
  outline section warns before the otherwise unstructured dated record moves to Diario. Diario
  exposes no outline editor in this increment.
- Search gives section names and the visible-text projection of each section body the existing
  Tier-6 Page treatment with reason **in a Notes section**. Copy Page structure remaps fresh IDs and
  hierarchy while clearing the Overview and all section bodies. Mixed Page-card counts explicitly
  say guide section/subsection versus note section/subsection and may wrap safely at 375 px.
- Schema v7 changes no stores or indexes. The pure v6→v7 migration adds `noteSections: []` to every
  Page. Schemas 1–6 must reject a premature field, v7 requires and deeply validates it, legacy
  backups upgrade sequentially, and the range-aware export-first gate describes every migration
  the source database will cross.

## Delivery sequence

1. Record the approved contract, the Phase 19 umbrella boundary and visual treatment A.
2. Ship schema-v5 Grammar Overview Markdown and accessible Note callouts with visible-text search.
3. Add the pure schema-v6 migration, export-first gate, sequential backup upgrades and deep
   hierarchy validation without exposing subsections.
4. Add subsection domain mutations, deletion protection and canonical organization.
5. Add the continuous-spine read/edit interface, independent disclosures and phone-safe actions.
6. Integrate starters, copy-structure remapping, shared counts, search and contextual breadcrumbs.
7. Run focused suites after each slice, deliberate high-risk failure proofs, the complete serial
   suite, production build, `git diff --check`, and a disposable schema-v5 375×812
   export→upgrade→edit→export→wipe→import flow.
8. Update the report and current-state documentation. Nothing is pushed or deployed without a
   separate owner request.

The Structured Notes increment then proceeds in independently verifiable slices: record its brief
and Diario amendment; characterize and extract the shared hierarchy engine without changing
Grammar; add schema-v7 migration/fencing; add Notes mutations; add the Notes reader/editor and
organizer; integrate search, copy, counts and every Journal-classification consumer; then run the
complete durability, phone and restore closeout before updating the report.

Each completed feature or subphase receives its own commit. Logic and subjective visual styling
remain separate commits so either can be reverted independently.

## Structured Notes implementation closeout

The schema-v7 Structured Notes increment is implemented locally on 2026-08-10. The complete
serial suite passes 1,204/1,204 tests across 103 files, the production build transforms 2,088
modules, and `git diff --check` passes. A disposable 375×812 visible-browser flow verified Notes
Overview editing; root, subsection and organizer changes; Markdown search; structure-only copy;
Vocabulary/Notes composition; final-outline Diario movement; and the longest mixed Page-card count.
That count wrapped to two lines without truncation or horizontal overflow. Browser review exposed
38 px text actions in the new Notes interface; they were raised to the required 44 px and rechecked.
The browser logged no warnings or errors, all fixtures were deleted through the visible interface,
the isolated origin returned to an empty notebook, and no owner browser data was available or
inspected. The closeout itself made no deployment claim; `main` subsequently deployed at
`4f73a45`, and the owner confirmed the production smoke screen passed.
