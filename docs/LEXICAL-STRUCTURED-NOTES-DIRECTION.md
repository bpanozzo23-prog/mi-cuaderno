# Lexical Structured Notes direction

**Status:** Implemented and verified locally 2026-08-21; not pushed or deployed.
**Origin:** The single top-level Notes box on Words and Phrases cannot separate distinct kinds of
entry-wide prose, such as a mnemonic, register guidance and usage cautions.

## Outcome

Words and Phrases gain the same bounded one-level Notes organization already proven on Pages.
The existing lexical `notes` string remains the permanent **General note** and is never parsed,
moved or rewritten. Schema v10 adds one mandatory `noteSections[]` array to every lexical item:

```js
noteSections: [{
  id: "note-section:<uuid>",
  parentId: null | "note-section:<uuid>",
  name: string,
  body: string
}]
```

A null parent is a section; a non-null parent is a subsection of one top-level section on the same
entry. Self, dangling, cyclic and child-of-child parents are invalid. Names are trimmed, nonblank
and normalized-unique among siblings. Array position is display order among siblings and explicit
writes store canonical depth-first order.

## Durability

- `SCHEMA_VERSION` moves from 9 to 10 without changing stores or indexes.
- The pure v9→v10 migration adds `noteSections: []` to lexical items only. Existing `notes`, IDs,
  meanings, examples, links, tags, media, timestamps, events, preferences and every Page field
  remain exact.
- Schemas 1–9 require an untouched validated export and acknowledgement before v10 opens. Backup
  schemas 1–10 upgrade sequentially and validate after every step; current v10 exports round-trip
  exactly and newer versions remain blocked.
- Schemas 1–9 reject a premature lexical `noteSections` field. Schema v10 requires it and validates
  Notes section IDs globally across Pages and lexical items.

## Editing and presentation

- Creation keeps one optional General note field. Named organization is added after the entry is
  saved, matching Page creation's simple first step.
- Lexical Detail shows General note first, then independently collapsible sections and lightweight
  one-level subsection nodes. It supports create, edit, confirmed leaf deletion and explicit
  organization: rename, reorder, promote and reparent.
- A section with children cannot be deleted or demoted until its children move. Deleting a leaf
  deletes its own Markdown body after confirmation.
- Every body uses the complete safe lexical Markdown dialect, including Block quote, Note, Tip,
  ¡Ojo!, Blank line, inline code, HTTPS links and HTTPS images.
- Changed section or organizer saves update the entry and write one ordinary `edit`. Cancel,
  disclosure changes and no-op saves write nothing. The organizer compares canonical structure so
  a valid interleaved import does not create a false edit merely by being opened and saved.

## Retrieval and learning surfaces

- Global search includes section names and visible Markdown body text at the existing lexical
  Notes tier with reason **in your notes**. Formatting markers never become searchable.
- One shared lexical-Notes projection supplies compact previews in canonical order: General note
  first, then named sections/subsections. Meaning-note precedence remains unchanged where a surface
  intentionally prefers meaning-specific context.
- Scheduled review and free practice keep the General note visible as today. Named sections stay
  behind a compact count disclosure so a long outline cannot crowd the grading controls.

## Boundaries

Meaning-level notes remain plain and meaning-specific. Examples, Media, tags, Collections,
Connections, Historia and Page contexts keep their existing semantic homes and never become Notes
children. This increment adds no provenance, section-specific links/tags, templates, persistent
collapse state, automatic Markdown-heading conversion, arbitrary blocks, recursive nesting, new
event type, preference, dictionary dependency or content type.

## Verification

Done when schema 1–9 databases and backup schemas 1–10 reach deeply validated v10 through the
export-first gate; existing lexical notes remain exact; every constructor carries the mandatory
array; section mutations, organization, deletion, search, previews and study disclosure agree; a
deliberate migration or retrieval break turns a new test red; the complete serial suite, production
build and `git diff --check` pass; and a disposable 375×812 entry with long root/subsection names
has 44px actions, a contained Markdown toolbar, no horizontal overflow and no console warnings or
errors.

## Closeout

- The schema-v10 migration and backup schemas 1–10 are covered through the untouched export gate,
  exact legacy-note preservation, current exact round-trip, deep hierarchy validation and global
  Page/lexical note-section ID collision checks.
- Focused feature coverage passes 256/256 across 13 files. The complete serial suite passes
  1,661/1,661 across 140 files; the production build transforms 2,136 modules; and
  `git diff --check` passes.
- A disposable seeded 375×812 origin exercised General note, one long root, one long subsection,
  the full Markdown toolbar, organizer and section-name/body search. The Notes region measured
  328px client/scroll width, the document stayed inside the 375px viewport, every visible Notes
  action met 44px, no third-level add action appeared, and the console had no warnings or errors.
- Closeout found and corrected two adjacent issues: shared Notes header icons were 33px before
  receiving the 44px minimum, and Taller's daily proposal ignored JournalHome's supplied local
  date. The latter now receives the same derived date used by the surrounding Today card.
