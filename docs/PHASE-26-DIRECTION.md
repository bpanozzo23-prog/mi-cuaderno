# Phase 26 — Derived context connections

**Status:** Approved for implementation 2026-08-13; implementation in progress on
`codex/phase-26-derived-context-connections`. This approval does not include a push or deployment.
**Origin:** The owner asked how the notebook could derive more connections, selected the first
three recommendations for implementation, chose the conservative defaults in a six-question
workshop, and asked that the remaining four recommendations be retained in Improvement Ideas.

## Outcome

Phase 26 makes three kinds of existing evidence easier to use without adding hidden authority:

1. **Mentioned here** finds saved personal vocabulary in visible Page and Diario prose and offers
   an explicit context-appropriate confirmation action.
2. **Seen together** derives read-only lexical neighborhoods from exact shared structures or
   repeated prose co-occurrence.
3. **Also from this source** groups personal items carrying the same exact URL.

Personal `SCHEMA_VERSION` stays 8. The phase adds no personal field, preference, backup shape,
event type, stored counter, score, schedule, queue, reference-data field, package rebuild, or
background job. Matches and neighborhoods are prepared only while a relevant saved surface is
open. Rendering, expanding, navigating, or abandoning them writes nothing. Only a visible owner
confirmation calls an existing writer.

## 26a — Context index and Mentioned here

### Context projection

One shared visit-local index projects these saved visible-text contexts with stable derived IDs:

- Notes Overview and named Notes-section bodies;
- enabled Source capture `text`;
- enabled Grammar-section explanations and Spanish example `es` text; and
- Diario bodies.

Page titles, section names, Source details/location/reflection, Grammar key ideas/patterns,
example English/notes, editor drafts, and disabled populated Source/Grammar structures stay out.
The existing Phase 23 `proseDocumentsFor` contract remains unchanged; Phase 26 owns a sibling
projection so Grammar examples do not silently alter Historia's deployed prose rows.

### Matching contract

Matching keeps the Phase 22/23 safety boundary: Unicode whole-token runs through `normalize.js`,
accent folding with ñ preserved, the fixed containment stop list, exact terms before optional
simple/gerund/participle forms, reference-wide ambiguity suppression, and exact-only fallback when
optional dictionary reads fail. Phrases match exactly; only attached words may gain inflections.
Clitic-attached forms remain intentionally silent.

The shared matcher returns all occurrences so presentation and neighborhoods can distinguish a
component word wholly contained by a phrase from another independent occurrence. Mentioned here
may show both a phrase and its component word because both can be useful attachments, but phrase
rows rank first and longest-first. Exact words follow, then verified inflections. A differing
surface is disclosed as **Matched as …**.

If several personal entries match one normalized surface, the UI groups them and shows their
headings/glosses rather than presenting indistinguishable actions. The owner may choose one, but
that ambiguous surface cannot create prose-neighborhood evidence by itself.

Each context tokenizes once. Optional attachment/conjugation/form reads batch once per prepared
notebook snapshot rather than once per item or card. Completed async work is discarded when the
snapshot or destination changes.

### Presentation and confirmation authority

Every nonempty saved context gets a collapsed **Mentioned here · N** disclosure beside its prose.
It shows five rows before a visit-local **Show all**, keeps Open and confirmation as sibling
controls, stays absent while loading or empty, and retains a failed row with an inline error.
Successful confirmation reloads the notebook; the proposal then disappears into existing
vocabulary or Connections presentation.

Confirmation follows the data model rather than pretending every prose slot owns nested metadata:

- Source capture and Grammar example: `commitPageVocabularyAdd` with that exact context;
- Notes or Grammar Overview on a Vocabulary-enabled Page: membership-only
  `commitPageVocabularyAdd`, landing in **Not grouped yet**;
- Notes/Grammar prose on a Page without Vocabulary, and Diario: `linkItems` from the prose Page to
  the lexical item with `found_in` and `subject: "target"`, so lexical reads **Found in** and the
  Page reads **Contains**.

An item already attached to the exact capture/example is excluded there. A Page/Diario proposal is
excluded when any conceptual connection already exists; Phase 26 never retypes one automatically.
An owner-confirmed attachment remains authoritative if the prose later changes and is never
auto-removed.

## 26b — Seen together

A lexical neighbor qualifies when the pair shares at least one active exact structure — one named
Collection group, Source capture attachment, or Grammar example attachment — or is matched
unambiguously in at least two distinct Phase-26 prose contexts. Diario participates in the repeated
threshold. **Not grouped yet**, broad shared tags, same-Page presence across different contexts,
one prose coincidence, and graph transitivity never qualify.

Two matches whose only occurrences overlap as phrase/component evidence do not count as prose
co-occurrence. A separate non-overlapping occurrence restores that context. Exact structural
membership remains sufficient even when the prose has since changed.

Historia gains one read-only **Seen together** Habitat section after **Phrases** and before
**Connections**. Each neighbor appears once with real context evidence, sorted by explicit shared
context count, then total distinct context count, then notebook order. Five render initially with
visit-local **Show all**. Rows navigate to ordinary Detail and expose no Link, relationship editor,
or remove action. A direct Connection may also appear because semantic relationship and contextual
proximity state different facts.

## 26c — Also from this source

The exact-URL index reads every personal item's `mediaLinks[].url` and `source.url` only from an
enabled Source notebook. Values are trimmed and compared case-sensitively as stored. Redirects,
fragments, query/tracking parameters, trailing slashes, protocol changes, short links, and host
variants are never canonicalized. Invalid values are ignored defensively. Repeated copies on one
item, including Source URL plus Media duplication, count once.

Every unique current-item URL with another matching personal item gets a collapsed
**Also from this source · N** disclosure inline below that URL. The count and rows exclude the
current item. Words, phrases, Pages, and Diario all participate; rows keep notebook order, name
their item kind/Page role/date, and open ordinary Detail through the existing session trail. There
is no new route or Source hub, and external-link/removal controls stay unchanged.

## Delivery and acceptance

Delivery order is 26a, 26b, then 26c, one reviewable feature commit each. The direction, brief,
decision records, and four future-idea records travel with 26a; the report and current-status
synchronization close the verified phase.

Acceptance requires pure matching/index coverage, component and database writer proofs, deliberate
red/green checks for no automatic writes, ñ safety, and exact-URL non-canonicalization, the complete
serial suite, production build, `git diff --check`, and one disposable seeded 375×812 browser flow.
The browser flow must snapshot items/events before read-only exploration, prove only explicit
confirmations mutate, measure 44px actions and zero horizontal overflow, and leave no console
warnings/errors. No owner browser data or backup is available to Codex; all verification uses
seeded fixtures and is cleaned afterward.
