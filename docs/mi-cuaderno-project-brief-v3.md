# Mi Cuaderno — Project Brief (v3)

**For:** Coding agents working through Claude Code or Codex. Use the task-sensitive read order in
`docs/AGENT-GUIDE.md`; this brief remains the product contract.
**Owner:** The sole builder and only user of this app.
**Companion file:** `mi-cuaderno.jsx` — a working single-file prototype of the notebook layer. It is the reference for features, interaction patterns, and visual design of **lexical entries**. Pages (§7) do not exist in the prototype and are new in v3. Where this brief contradicts the prototype's *implementation* (ID scheme, search normalization, the `struggling` field, event rules), **this brief wins** — the prototype shows what the app should feel like, not how it must be built.
**Version:** v3 — revised after lock-in review. Product contract last amended
~~August 3, 2026~~ ~~August 4, 2026~~ ~~August 5, 2026~~ ~~August 9, 2026~~ ~~August 10, 2026~~ ~~August 12, 2026~~ ~~August 13, 2026~~ ~~August 17, 2026~~ **August 18, 2026**; agent-facing framing refreshed August 2, 2026.
**Amendments since v3:** §4 *Conjugations* — 2026-07-31, Phase 2: Jehle demoted from bundled source to build-time validation reference, removing the noncommercial restriction from the dataset. §§3, 9 and 12 — 2026-08-02: organizational improvements became Phase 5 and the AI assistant moved to Phase 6. §12 — 2026-08-02: independently scoped phases may proceed concurrently under explicit coordination rules. §§5, 7, 8, 10, 12 and 14 — 2026-08-02: personal lexical meanings became stable, structured annotations in schema v2 while review remains entry-level and dictionary senses remain replaceable reference data. **§§5, 7, 10, 12 and 14 — 2026-08-03: schema v3 adds durable `general | collection` page profiles and the first specialized profile, Vocabulary Collection, while dated General pages remain Journal entries and richer profiles stay deferred.** **§§5, 7, 10, 12 and 14 — 2026-08-04: schema v4 adds sparse typed and explained ordinary-connection annotations while `linkedKeys[]` remains authoritative for connection existence and Collection membership.** **§§5, 7, 8, 10, 12 and 14 — 2026-08-04: Phase 7 approves schema v5 composable pages with one leading focus, independently enabled Vocabulary, Source and Grammar structures, contextual retrieval, and sequential legacy backup upgrades.** **§§7, 12 and 14 — 2026-08-05: Phase 9 approves filtered, session-only free practice from the Words & phrases hub while Repaso remains the sole scheduled and event-backed review flow.** **§§7, 12 and 14 — 2026-08-07: Phase 14 approves an owner-started, event-backed Conjugation Gym with curated reference-only verb pools, richer derived performance, and optional history-ranked sessions that never create a due date or alter Leitner review.** **§§7, 12 and 14 — 2026-08-09: Phase 16 approves four-grade scheduled review, objective typed vocabulary recall, queue chunking, one event-free recovery pass, a shared vocabulary-card engine and history-free hub/Collection sessions.** **§§7, 12 and 14 — 2026-08-09: Phase 17 adds owner-started, event-backed Tense usage and Endings recognition lanes whose results remain isolated from form Adaptive, form statistics and Leitner review.** **§§7, 12 and 14 — 2026-08-10: Phase 18 adds the recall/production reverse of those lanes, balanced Regular and Spelling-change packs, exact Saved tag/page targeting and mode-separated depth reporting without changing schema, scheduling or choice evidence.** Amendments are marked inline with strikethrough plus the replacement, so the original contract stays readable.

**Meaning-block amendment, 2026-08-13 — §7:** meaning-level part-of-speech overrides add
interjection without widening entry-wide parts of speech or changing schema.

**Phase 19 amendment, 2026-08-10 — §§5, 7, 8, 10, 12 and 13:** schema v6 adds one-level
Grammar subsections, formatted Grammar overviews and accessible Note callouts while retaining the
two-type composable Page model and excluding a general block editor.

**Phase 19 Structured Notes amendment, 2026-08-10 — §§5, 7, 8, 10, 12 and 13:** schema v7 adds
one-level named Notes outlines while preserving every existing Page body as Overview. A nonempty
outline is durable Page organization for the Pages/Diario boundary; body length remains irrelevant.

**Phase 19 Notes callout amendment, 2026-08-10 — §§7, 8, 12 and 13:** Page Notes Overview and
Notes-section bodies may store explicit `[!NOTE]` Markdown callouts while ordinary blockquotes
remain quotations. This changes rendering and visible-text projection only; schema stays v7.

**Phase 19 callout-variant and inline-action amendment, 2026-08-17 — §§7, 8, 12 and 13:** every
explicit-Notes-callout editor adds `[!TIP]` and `[!OJO]` beside `[!NOTE]`; every Markdown toolbar
adds inline code and an explicit HTTPS Link action. Grammar keeps its fixed blockquote-as-Note
behavior, fenced code remains plain readable text, and schema stays v9.

**Phase 20 amendment, 2026-08-10 — §§7 and 12:** Ajustes gains exact global tag rename, merge and
removal across personal items. Each changed item keeps its timestamp but receives one ordinary
`edit`; item, event and colour-preference writes are atomic and schema v6 remains unchanged.

**Diario feedback amendment, 2026-08-11 — §§5, 7, 9 and 10:** schema v8 persists the latest AI
review on the Diario entry it judged (`feedback` on the page record, `null` when absent),
replacing the Phase 6 session-only decision. One review per entry, replaceable and removable,
stale-flagged by a content hash, exported in backups, and written without a timestamp bump or
event. A field on an existing type — the two-content-type rule stands.

**Phase 22 amendment, 2026-08-12 — §§7, 8, 12 and 14:** lexical details derive whole-token
word↔phrase containment and conservative same-meaning proposals without storing either. Only an
explicit owner action creates an ordinary Similar meaning connection. A history-free hub recall
session reads direct confirmed Similar meaning neighbors without transitive inference, events,
scores, scheduling, preferences, or schema change.

**Phase 23 amendment, 2026-08-12 — §12:** lexical Detail gains a derived biography of learning
milestones and current contexts, including disclosed matches in owner prose, while the idle
Cuaderno root gains event-free neighborhood wandering over ordinary connections and conjugation
families. Both features are render-time views over existing data; schema remains v8.

**Phase 26 amendment, 2026-08-13 — §§7, 8 and 12:** saved Page/Diario prose may derive
owner-confirmable Mentioned-here vocabulary, lexical Historia may derive context neighborhoods,
and exact personal URLs may reveal other items from the same source. Suggestions and neighborhoods
remain render-time evidence; only explicit confirmation uses existing page-vocabulary or ordinary
connection writers. Schema remains v8.

**Apuntes amendment, 2026-08-14 — §§7, 8, 9 and 10:** schema v9 adds `apuntes` to the page record
(`null` when absent): one optional free-markdown box of owner notes kept beside a Diario entry and
out of its body — outside feedback (e.g. another AI tool's review) and notes to self. A field on
an existing type — the two-content-type rule stands. Only Diario surfaces it, collapsible in
editor and reader. Saving it is an ordinary owner edit (timestamp bump, one `edit` event per
visit). It is searchable in global and Diario search, rides in backups like any other item field,
and is never part of an AI request or the stored review's staleness hash, which cover only title
and body.

---

## 1. What this is

A personal Spanish notebook built around a bundled dictionary: a mobile-first, installable web app (PWA) combining a reference layer (top ~10,000 lemmas by frequency, Latin American Spanish) with a personal layer of two content types — **lexical entries** (words and phrases with notes, tags, personal examples, media links) and **pages** (freeform notes for grammar topics, sources like films or podcasts, and dated journal entries) — plus event-based learning tracking (lookup history, "tricky" flags, a review queue). A built-in AI assistant comes last.

The bundled dictionary is lemma-focused. User-created lexical items may be single words **or** multiword phrases; both are first-class. Importing phrases/idioms into the reference layer may come later.

It is inspired by the *scope* of SpanishDict. It is a private tool for one person, not a product.

## 2. The owner, and how to work with them

- Solo personal project. The owner has ~2 years of experience directing AI tools and is comfortable following technical steps, but is not an expert programmer. Owner is trying to learn more about software development.
- **Always propose a plan before implementing each phase or sub-phase.** Wait for approval.
- Explain choices in plain language. Define jargon the first time it appears.
- When planning or brainstorming, ask the owner questions to get more information if needed. The owner likes to brainstorm by proposing an idea and getting feedback to refine the idea. The owner values a detailed, well thought out planning and brainstorming.
- Work in small, verifiable steps. After each change, state exactly how the owner can see or test it.
- Commit per completed feature with clear messages, so anything can be undone.
- Maintain a `DECISIONS.md` log: every meaningful choice, one line, with date and reason.
- Where this brief specifies exact behavior (IDs, search rules, import semantics, event rules), implement it as specified. If you discover a conflict or a better approach mid-build, stop and raise it — don't silently deviate.

## 3. Locked decisions

| Decision | Choice |
|---|---|
| Form | Web app, installable PWA, designed phone-first (phone is the primary device) |
| Hosting | Free static hosting (GitHub Pages by default). The *code* may be public; personal *data* is not |
| Personal data | ~~On-device only through Phase 4. In Phase 5, only data the owner deliberately includes in an AI request leaves the device.~~ **Amended 2026-08-02:** on-device only through Phase 5. In Phase 6, only data the owner deliberately includes in an AI request leaves the device — see §9 |
| Backup | JSON export **and** import from Phase 1 onward. Backup is the primary disaster-recovery mechanism, not a convenience — see §10 |
| Dictionary | Top ~10,000 lemmas by frequency, fully offline after an explicit in-app download — see §11 |
| Spanish variety | Latin American. Prefer Mexico-labeled senses where sources distinguish them. Conjugation display is ustedes-first; vosotros forms kept but collapsed |
| Media | Links only for now. A direct Attachment model is **reserved** in the schema (§7) so file attachments (audio recordings, screenshots) can be added later without a data migration; building it is a deferred decision |
| Sync | Deferred. Single device for now; the data model stays sync-ready (§7) but no sync is built |
| AI access (~~Phase 5~~ **Phase 6**) | Owner's own Anthropic API key, entered once, stored on-device. Accepted risk for a single-user app, on the condition that a **hard monthly spend cap** is set in the Anthropic console before the feature is enabled. A small serverless proxy is the named upgrade path if circumstances change |
| Stack | React + Vite + Tailwind, Dexie (IndexedDB wrapper), vite-plugin-pwa. Sensible substitutes allowed if justified in the plan |

## 4. Data sources and licensing

The app code and the bundled reference data are licensed separately. Reference-data licenses are recorded exactly, not summarized.

- **Dictionary entries:** Spanish-language entries extracted from **English** Wiktionary (Spanish headwords with English glosses), via the machine-readable extracts at kaikki.org. Wiktionary-derived data is dual-licensed (CC BY-SA and GFDL); record the exact license text and version stated by the source at download time.
- **Conjugations:** ~~Fred Jehle's database of 600+ fully conjugated Spanish verbs, licensed **CC BY-NC-SA 3.0** (noncommercial, share-alike). Compatible with a free, noncommercial personal app, but a real restriction: record it deliberately and keep this dataset clearly separated from the app-code license. Generate conjugations programmatically for regular verbs outside the database.~~
  **Amended 2026-07-31 (owner's decision, Phase 2).** Conjugation tables are extracted from the kaikki/Wiktionary `forms[]` data already covered by the dictionary-entries license above, so conjugations carry **no separate license**. Fred Jehle's database is retained as a **build-time validation reference only**: the extractor is compared against it cell by cell (99.83% agreement across 57,580 cells) and the build fails below a 99.5% gate. No Jehle content is distributed and the CSV is never committed, so its CC BY-NC-SA **noncommercial** terms do not attach to the bundle.
  *Why:* measured before amending — kaikki produces a table for all 546 verbs Jehle covered, losing zero cells, and is the more accurate source where they differ (`criáis`→`criais` and `frió`→`frio` are the 2010 RAE spelling reform Jehle predates; `gradúéis` carried two accents; `arrepentáis` missed a stem change). Keeping Jehle was costing accuracy and a noncommercial restriction while buying nothing. The programmatic generator this clause originally called for was never needed.
- **Example sentences:** Tatoeba es↔en pairs, default license **CC BY 2.0 FR**. Attribution is per-sentence: every imported example carries its Tatoeba sentence ID, contributor identifier when available, license, and source URL. A general thank-you on the About screen is not sufficient on its own.
- **Frequency ranking:** the FrequencyWords project (OpenSubtitles-derived). Generated lists are **CC BY-SA 4.0** (repo code is MIT). These are *token* frequencies, not lemma ranks — see §12, Phase 0.5 and Phase 2.
- **Required output:** the pipeline generates a `DATA_SOURCES.md` recording, for every dataset: name, version or download date, source URL, exact license and version, required attribution, transformations applied, and the pipeline script that produced the distributed output. The app's About screen shows the dataset version and renders or links this attribution.


## 5. Architecture: two layers, one seam

- **Reference layer (read-only):** imported dictionary entries, conjugations, and stock examples. Produced by the pipeline; versioned; regenerated or upgraded wholesale; never edited in-app.
- ~~**Personal layer (read-write):** everything the owner creates. Rebuilding or replacing reference data must never touch personal data. Any personal-layer schema change requires a migration plan and a reminder to export a backup first.~~
  **Schema-v4 durability amendment, 2026-08-04:** the personal layer remains everything the owner
  creates, and rebuilding or replacing reference data must never touch it. Every personal-layer
  schema change requires a versioned migration and schema bump; an older database must produce an
  untouched, fully validated export and receive explicit saved-file acknowledgement before the new
  schema opens it.
- **Schema-v6 hierarchy amendment, 2026-08-10:** adding one-level Grammar subsection ownership is
  a personal-layer shape change even though stores and indexes stay fixed. Schema-v1 through v5
  databases therefore pass through the same untouched export-first gate before v6 opens.
- **Schema-v7 Notes-outline amendment, 2026-08-10:** every Page gains mandatory
  `noteSections[]`; stores and indexes remain fixed. Schema-v1 through v6 databases pass through
  the untouched export-first gate before v7 opens, and earlier schemas must reject the field.
- **The seam rule:** *personal items always have their own stable ID; attaching one to a dictionary entry is a reversible relationship, not its identity.* ~~Lexical items always store their own `term` (and `translation`, when given) even while attached, so they stay meaningful on their own.~~ **Amended 2026-08-02:** lexical items always store their own `term` and ordered personal `meanings[]` even while attached. Each personal meaning has its own `meaning:<uuid>` identity and never stores or derives its identity from a dictionary sense ID, index or ordering.
- ~~**Page-profile seam amendment, 2026-08-03:** Collection membership can contain only independent
  personal lexical items. A selected dictionary entry must first create or reuse its personal
  attachment through the existing seam; raw `dict:` keys remain Related and never become members.~~
  **Composable-page seam replacement, 2026-08-04:** Vocabulary membership can contain only
  independent personal lexical items, whether the item is placed in a Collection group or attached
  to a Source capture or Grammar example. A selected dictionary entry must first create or reuse its
  personal attachment through the existing seam; raw `dict:` keys remain ordinary Connections and
  never become contextual vocabulary.
- **Relationship-annotation seam amendment, 2026-08-04:** an ordinary typed dictionary connection
  stays separate from a lexical item's reversible `dictKey` attachment. Alias resolution rewrites
  an ordinary linked key and its annotation together only when that rewrite is unambiguous. If old
  and canonical keys carry conflicting explicit annotations, neither key nor annotation is changed
  until a resolver shows both values and the owner chooses or edits the survivor. An installed
  orphan retains its type and note; an uninstalled dictionary remains hidden rather than being
  described as orphaned.
- **Orphan behavior:** if a dataset update removes a referenced dictionary entry and the alias map (§6) cannot resolve it, the personal item keeps working as a standalone lexical item, is subtly marked "reference unlinked," and can be re-attached later. Personal data never breaks because reference data changed.

## 6. Identity and keys

- All keys are **namespaced**: `dict:wiktionary-es:<canonical-id>` for reference entries, `user:<uuid>` for personal items (both lexical items and pages).
- `<canonical-id>` derives from the source entry's identity (lemma + part of speech + the source's own entry/etymology identifier), never from display spelling alone. Homographs and multi-POS words get distinct IDs.
- The pipeline emits `datasetVersion`, each entry's `sourceId`, and a `previousIds[]` alias map so a future rebuild can migrate existing personal references.
- `linkedKeys[]` may point to any item in either layer: word↔word, page↔word, page↔page.

## 7. Data model

### Foundational data decisions

| Area | Decision |
|---|---|
| Personal content scope | Two types: **lexical** items and **pages**. ~~A dated page is a journal entry; a page can be a grammar topic or a source (film, podcast, book).~~ ~~**Amended 2026-08-03:** every page stores `pageProfile: general \| collection`. Collection wins over `pageDate`; a dated General page remains a Journal entry. Grammar topics and sources remain General pages in this release.~~ ~~**Amended 2026-08-04 (Phase 7):** every page stores one leading `pageFocus: notes \| vocabulary \| source \| grammar` and independently enabled Vocabulary, Source and Grammar structures. Notes remain the permanent body-based foundation. A dated page is a Journal entry only when no structured capability is enabled; dated enhanced pages remain Pages.~~ **Amended 2026-08-10 (Phase 19 Structured Notes):** Notes remain the permanent body-based foundation and gain optional named organization through mandatory `noteSections[]` storage. A dated page is Diario only when Vocabulary, Source and Grammar are disabled and `noteSections` is empty; body length never decides. A nonempty outline is durable Page organization, so dated outlined Pages remain Pages. No third top-level type without a brief amendment |
| Identity | UUIDs for all personal records, independent of dictionary records; namespaced keys per §6 |
| Reference attachment | Optional and reversible (§5 seam rule); orphan-safe |
| Lexical form | `form: word \| phrase` |
| Annotation level | ~~Entry-level only. **Do not add a `senseId` field** — imported sense IDs are not stable across dataset updates; sense-level notes stay deferred until that's solved.~~ **Amended 2026-08-02:** personal lexical entries contain ordered meaning-level annotations with stable, locally generated IDs. Do not add a dictionary `senseId`: personal meaning identity remains independent of replaceable dictionary sense IDs and ordering. Review scheduling and activity remain entry-level. |
| Links | Any personal item can link to any item in either layer |
| Deletion | Confirm first; **hard-delete the record and log a `delete` event** — the append-only event log is the tombstone. No soft-delete flags. Remove links pointing to the deleted item. ~~Keep its historical events but exclude them from active queues and statistics.~~ **Amended 2026-08-07 (Phase 14): keep historical events; exclude a deleted record from active queues, current-item statistics, current-pool coverage and action targets. Owner-centric activity and aggregate conjugation-skill history may retain interpretable events, but must never reconstruct or act on deleted personal content.** |
| Media | `mediaLinks[]` (URLs) only for now. **Reserved:** a separate `Attachment` store for future files. Items will reference attachments by ID; binary data is never embedded in item records; nothing in the schema may assume links are the only media type |
| Review grades | ~~Review events log a 4-point grade in `metadata` (0 again / 1 hard / 2 good / 3 easy) even while the UI shows only pass (→2) / fail (→0).~~ **Amended 2026-08-09 (Phase 16): scheduled review exposes Again / Hard / Good / Easy. Again resets to box 1, Hard holds, Good climbs one and Easy climbs two capped at box 5; retirement ~~still requires a pass~~ **requires a Good or Easy pass — ruled later on 2026-08-09: Hard at box 5 holds rather than retires —** while already in box 5. Historical gradeless pass/fail events replay strictly as Good/Again.** |
| Sync-readiness | UUIDs, `createdAt`/`updatedAt` on every personal record, stable event IDs, schema + app versions in backups. No sync built |

### Shapes through schema v4 (historical)

```
DictEntry   { id, sourceId, lemma, normalizedLemma, searchForms[], pos,
              senses[{ gloss, regionLabels[] }], gender?, conjugationId?,
              freqRank?, examples[{ es, en, sourceId, contributor?, license }],
              datasetVersion }
Conjugation { id, forms{...} }

UserItem    { id, type: lexical | page,
              tags[], linkedKeys[], mediaLinks[{ url, label }],
              linkAnnotations[{ targetKey,
                                type: related | similar_meaning | contrast |
                                      often_confused | variant | found_in | explained_by,
                                subject: owner | target, note }],
              createdAt, updatedAt,
              // lexical only:
              dictKey?, form: word | phrase, term, pos?,
              meanings[{ id, gloss, usageCue, regions[], usageLabels[],
                         posOverride?, verbBehavior[], note,
                         examples[{ es, en }] }],
              notes, myExamples[{ es, en }],
              // page only:
              title, body, pageDate?, pageProfile: general | collection,
              collection{ groups[{ id: page-group:<uuid>, name, itemKeys[] }] } }

Attachment  { id, mime, filename, size, createdAt, blobRef }   // RESERVED — do not build

Event       { id, type: view | create | edit | delete | tricky_on | tricky_off |
              review_pass | review_fail | search_miss | drill_pass | drill_fail,
              itemKey?, at, localDate, metadata? }
```

~~Through schema v4, the page fragment above ended with exclusive `pageProfile: general |
collection` plus dormant Collection groups.~~ **Schema-v5 page-shape replacement, 2026-08-04:**
`pageProfile` is removed. The common `UserItem` fields and lexical shape remain unchanged; every
page instead carries this composable fragment:

```
// page only:
title, body, pageDate?, pageFocus: notes | vocabulary | source | grammar,
collection{
  enabled,
  groups[{ id: page-group:<uuid>, name, itemKeys[] }]
},
source{
  enabled,
  format: "" | book | audio | video | article_lesson | other,
  creator, scope, url, context,
  captures[{
    id: source-capture:<uuid>,
    type: passage | reflection | language_note | question,
    text, location, reflection, itemKeys[]
  }]
},
grammar{
  enabled, keyIdea,
  sections[{
    id: grammar-section:<uuid>, name, explanation, pattern,
    examples[{
      id: grammar-example:<uuid>, es, en, note, itemKeys[],
      sourceCaptureRef: null | { pageId, captureId }
    }]
  }]
}
```

~~Through schema v5, Grammar sections had no parent field and their names were unique across the
whole guide.~~ **Schema-v6 Grammar-section replacement, 2026-08-10:** every section additionally
stores `parentId: null | "grammar-section:<uuid>"`. Null identifies a top-level section; a non-null
value must reference a top-level section on the same page. Self, dangling, cross-page, cyclic and
child-of-child parents are invalid, so the hierarchy has exactly one subsection level. Names are
trimmed, nonblank and Unicode-NFKC/case-fold unique among siblings; identical names under different
top-level parents are allowed. Existing schema-v5 sections migrate to `parentId: null` without an
ID, content or order change.

**Schema-v7 Notes-outline addition, 2026-08-10:** every Page additionally stores:

```
noteSections[{
  id: note-section:<uuid>,
  parentId: null | note-section:<uuid>,
  name, body
}]
```

`body` on the Page itself remains the Notes Overview and is never moved or parsed into sections.
Notes parents obey the same exactly-one-level, same-page, no-cycle and sibling-name rules as
Grammar, through one shared parameterized hierarchy engine. ~~The Notes body strings use the safe
Page Markdown dialect and ordinary blockquotes.~~ ~~**Phase 19 Notes-callout amendment:** Notes body
strings retain the safe Page Markdown dialect and ordinary unmarked blockquotes; a blockquote whose
first line is exactly `[!NOTE]` renders as a visibly labeled accessible Note callout. The marker is
formatting rather than visible prose and is excluded from search, previews and AI-visible text.~~
**Phase 19 callout-variant replacement, 2026-08-17:** Notes body strings retain the safe Page
Markdown dialect and ordinary unmarked blockquotes; a blockquote whose first line is exactly
`[!NOTE]`, `[!TIP]` or `[!OJO]` renders as the matching visibly labeled accessible callout. All
three markers are formatting rather than visible prose and are excluded from search, previews and
AI-visible text. A
schema-v6 Page migrates by receiving only `noteSections: []`.

**Inline-media amendment, 2026-08-11.** Everywhere the safe dialect renders, it additionally
renders `![alt](url)` images and `[label](url)` hyperlinks when the URL is https; any other URL
falls back to readable text. Images are always block-level regardless of placement, are height-
capped for the phone viewport, open their source in a new tab on tap, and degrade to their alt
text when they cannot load. Images remain excluded from search, previews and AI-visible text —
so an image-only edit does not stale a stored Diario review — while link labels remain visible
prose. Raw HTML stays discarded. This changes rendering only: the stored string is unchanged, no
binary data enters any record, the §7 Media row still governs `mediaLinks[]` (which now preview
image-extension URLs inline with the same fallback), and the Attachment store remains reserved.

Array order is display order among siblings. Source URLs are blank or HTTP(S). Saved Source
captures require nonblank `text`; saved Grammar examples require nonblank Spanish `es`. All nested
IDs are stable through editing and reordering.

~~Through schema v3, `linkedKeys[]` was the complete stored shape for an ordinary link.~~
**Relationship-shape amendment, 2026-08-04:** every schema-v4 `UserItem` has a mandatory
`linkAnnotations[]` array in addition to `linkedKeys[]`. The array is sparse: no annotation for a
pair derives **Related** with a blank note, and an explicit Related-with-blank-note annotation is
removed during normalization. Notes are trimmed plain text with no arbitrary application storage
limit. Each annotation target must occur in that row's `linkedKeys[]`; an annotation never creates
a connection. At most one annotation may describe an unordered personal-item pair even when
legacy data contains redundant physical edges.

`subject` says which endpoint receives the forward directional label independently of which row
physically stores the edge; `owner` is the row that stores it and `target` is its `targetKey`. For
`found_in`, the subject reads **Found in** and the other endpoint reads **Contains**; for
`explained_by`, the subject reads **Explained by** and the other endpoint reads **Explains**.
Symmetric types normalize `subject` to `owner`. Fixed display order is **Similar meaning**,
**Contrast**, **Often confused**, **Variant**, **Explained by/Explains**, **Found in/Contains**, then
**Related**. Relationship notes remain outside search, filters, Repaso, and the event-derived
learning model.

**Meaning-block amendment, 2026-08-02.** `meanings[]` is the owner's small personal vocabulary,
not a copy of the dictionary's taxonomy. `gloss` is the English meaning and `usageCue` is an
optional short Spanish cue. Regions are owner-written labels; usage labels are limited to formal,
informal, colloquial, slang, vulgar, offensive, dated, archaic, rare, humorous, figurative and
literal. ~~A meaning may override the entry's part of speech with noun, verb, adjective, adverb or
other.~~ **Amended 2026-08-13:** a meaning may override it with noun, verb, adjective, adverb,
interjection or other. A meaning may record transitive, intransitive, reflexive, pronominal or
impersonal verb behavior.
Entry-wide notes and unassigned examples remain valid. An entry may have no meanings; a saved
meaning must have a nonblank gloss. Meaning IDs survive editing and reordering, while merging two
neighboring meanings keeps the upper meaning's ID.

~~**Page-profile amendment, 2026-08-03.** Every page has both `pageProfile` and `collection`, so
temporarily switching a Collection back to General never destroys its layout. Group array order
and each group's `itemKeys` order are display order. Group names are trimmed, nonblank, and unique
within the page under Unicode NFKC normalization plus case folding. A personal lexical item may
belong to several Collection pages, but to at most one group in any one page.~~

**Composable-page amendment, 2026-08-04.** `pageFocus` controls section order and presentation,
not page identity. Notes are always available through the existing body; Vocabulary, Source and
Grammar enable independently and may coexist. Vocabulary, Source or Grammar focus is valid only
while its matching structure is enabled. Disabling a populated structure hides it without deleting
its fields, order or references; re-enabling restores it. Hidden structures do not participate in
role filters, search or contextual summaries. Existing pages adopt Source or Grammar only through
an explicit owner action; title, body, tags, dates and links never classify them automatically.

Collection group rules remain unchanged. Source captures form one flat manually ordered stream.
Grammar contains manually ordered named sections and examples. A Grammar example may attach at
most one exact Source capture. A reference to another Source page requires an ordinary connection
between the two pages; a reference to a capture on the same composable page requires no illegal
self-link.

**Grammar-depth amendment, 2026-08-10.** A top-level Grammar section and its subsections use the
same Overview, optional Pattern and structured examples. `explanation` remains a string but may
contain the existing safe notebook Markdown dialect; only that field receives formatting in this
release. Grammar blockquotes render as accessible labeled Note callouts, while Key idea, Pattern,
example language and example notes stay plain. This is a bounded Grammar hierarchy, not the
free-form block editor excluded by §13.

~~`linkedKeys[]` remains the sole relationship and Collection-membership authority.~~
~~**Schema-v4 relationship-authority amendment, 2026-08-04:** `linkedKeys[]` remains the sole
connection-existence and Collection-membership authority; annotations describe but never create a
connection. Only an outgoing page link resolving to a personal lexical item is a member; group
`itemKeys` are layout references to those members. **Not grouped yet** is derived from outgoing
members absent from every group, in `linkedKeys` order. Active Collection membership hides any
ordinary-link annotation but preserves it dormant; returning the Collection page to General
restores it.~~
**Schema-v5 relationship-authority replacement, 2026-08-04:** `linkedKeys[]` remains the sole
connection-existence and page-vocabulary-membership authority; annotations describe but never
create a connection. Only an outgoing page link resolving to a personal lexical item is vocabulary
membership. Collection group, Source-capture and Grammar-example `itemKeys` are layout/context
references to those members. **Not grouped yet** is still derived from outgoing members absent from
every group, in `linkedKeys` order. Active Vocabulary membership hides any ordinary-link annotation
but preserves it dormant; disabling Vocabulary restores that ordinary Connection presentation.
Promoting an incoming lexical connection moves the stored edge to page→lexical and flips
directional `subject`; a raw dictionary selection first creates or reuses an independent personal
lexical entry. Unlinking or deleting an item prunes annotations plus active and dormant group
and contextual references. Removing an item from a capture or example retains page membership;
removing it from the page clears every active or hidden placement/attachment after an impact
confirmation. Deleting a Source capture clears exact Grammar references to it without removing
ordinary page connections. `pinnedPageIds` is a backed-up UI preference, not page content; pinning
changes no page timestamp and writes no event.

**Phase-22 derived-knowledge clarification, 2026-08-12:** phrase containment and same-meaning
proposals are render-time evidence, not ordinary connections, and create no authority. Containment
compares personal Words with personal Phrases through the shared ñ-preserving whole-token matcher;
an attached verb may add unambiguous simple/gerund/participle forms from the optional dictionary.
Ambiguous inflections and clitic-attached tokens are intentionally omitted rather than guessed or
substring-matched. Gloss proposals compare individual personal meanings conservatively and are
limited to three; sparse POS metadata rejects only a known mismatch. Proposals have no durable
dismissal state and may reappear. Only an explicit owner action calls the existing stored-once
writer with `similar_meaning`; an already connected pair is never proposed.

**Phase-26 contextual-knowledge clarification, 2026-08-13:** visible saved Notes, enabled Source
capture text, enabled Grammar overview/example Spanish, and Diario prose may be matched against
saved personal vocabulary through the same conservative token/form rules. A match is not a link or
page-vocabulary reference. Explicit confirmation attaches Source/Grammar example vocabulary through
the existing contextual writer, adds ungrouped Page vocabulary when Vocabulary is enabled, or
creates a directional Found-in ordinary link for non-Vocabulary Page/Diario prose. Repeated
co-occurrence and exact shared structures may derive a read-only Historia neighborhood but never a
semantic relationship. Exact identical stored URLs may derive navigation rows and create no
authority.

### Event rules

- **Events are the single source of truth for state and statistics.** No running counters, and no stored `struggling` flag: current tricky state derives from the most recent `tricky_on` / `tricky_off` event.
- **View events:** one `view` when an item's detail screen is intentionally opened, at most one per item within a session window (named constant, default 30 minutes). Rerenders, edit toggles, and bouncing between linked items must not inflate counts.
- `search_miss` (no `itemKey`; query text in `metadata`) is logged when a search returns nothing — it feeds a future "words I couldn't find" list.
- `localDate` (owner's local calendar day) is stored on every event; daily queues and streaks group by it, not UTC.
- New event types may be added freely later; all consumers must ignore unknown types.
- ~~**Page-profile event amendment, 2026-08-03:** profile changes and changed Organizer saves write
  one page `edit`. New pages and newly materialized lexical entries keep their existing `create`
  events. Migration, pinning, card expansion, mode changes, Practice, ordinary membership
  add/remove, Organizer Cancel, and no-op Save write no events. Existing link/unlink event behavior
  is unchanged.~~
- **Relationship-event amendment, 2026-08-04:** ordinary link creation, removal, type changes, note
  changes, alias rewrites, and alias-conflict resolution write no activity events. A relationship
  note annotates the connection rather than becoming either item's prose. Metadata-only
  relationship and conflict-resolution saves also preserve both endpoints' `updatedAt`; link
  creation and removal keep their existing timestamp behavior.
- **Composable-page event replacement, 2026-08-04:** a changed page-configuration save, persisted
  focus change, Source-capture save, Grammar-guide save, or changed organizer save writes one page
  `edit`; a new page or newly materialized lexical item keeps its existing single `create` event.
  Migration, pinning, expansion, local mode/filter/search changes, Practice, membership-only
  bookkeeping, automatic dependent-reference cleanup, Cancel and no-op Save write no events.
  Explicit saves update the owning page normally; cleanup performed only because another item or
  nested record changed is timestamp-neutral on the dependent page.
- **Phase-19 event clarification, 2026-08-10:** subsection creation/editing and changed hierarchy
  organization are Grammar-guide content saves and write one page `edit`. Cancel and no-op Save
  remain event-free; automatic reference cleanup remains timestamp- and event-neutral.
- **Phase-20 tag-maintenance clarification, 2026-08-10:** an exact global tag rename, merge or
  removal writes one ordinary `edit` for every actually changed personal item while preserving
  every item's `updatedAt`. The events retain their existing owner-activity behavior; the operation
  adds no event type or metadata. All item, event and tag-colour writes succeed or roll back
  together.
- **Free-practice event amendment, 2026-08-05:** starting, revealing, answering, repeating or
  finishing a Words & phrases free-practice session writes no event and changes no item timestamp.
  Opening the full entry remains ordinary detail navigation and retains its existing view-event
  rule. Only scheduled Repaso writes `review_pass` / `review_fail` and changes the Leitner replay.
- **Recognition event amendment, 2026-08-09 (Phase 17):** Tense usage and Endings answers reuse
  `drill_pass` / `drill_fail` with additive `skill`, stable `cardId`, canonical `tense`,
  `mode: "choice"`, session/prompt/stage fields and miss-only `chosen`. They carry no `itemKey`,
  `verbKey`, `slot` or response text. Form statistics and Adaptive ordering explicitly ignore
  them; every review derivation continues to ignore all drill types. Missed-round answers remain
  separately identifiable and never rewrite first-attempt evidence.
- **Phase-22 recall clarification, 2026-08-12:** Similar-meaning recall is an owner-started,
  history-free session over direct confirmed Similar meaning neighbors. Starting, revealing,
  self-grading, repeating misses, finishing, or leaving writes no event or timestamp and changes no
  Repaso, Gym, due date, preference, score, or schedule.

## 8. Search rules

- Case-insensitive. Normalization strips acute accents and diaeresis (á→a, é→e, í→i, ó→o, ú→u, ü→u) but **preserves ñ as a distinct letter** — "año" must never match a search for "ano". (The prototype's `normalize()` strips ñ; fix this when porting.)
- One results list spans both layers and both content types. Ranking, high to low:
  1. Exact Spanish term
  2. Accent-normalized Spanish term
  3. Inflected-form alias (reference layer: form→lemma index from kaikki forms + conjugation tables, so "fui" resolves to *ir* and *ser*, "tuvimos" to *tener*, "casas" to *casa*, "rápidas" to *rápido*)
  4. ~~English gloss or personal translation~~ **English dictionary gloss or personal meaning gloss — English→Spanish lookup is first-class**
  5. Tags
  6. ~~Notes, personal examples, personal meaning cues and labels, page titles and page bodies~~
     **Notes, personal examples, personal meaning cues and labels, page titles and bodies, plus
     active Source metadata/captures and Grammar key ideas/sections/examples**
- Each result shows *why* it matched (e.g., "form of ir", "English meaning", "in your notes").
- **Composable-page search amendment, 2026-08-04:** Pages-only search may also match the Spanish
  heading or personal-meaning gloss of vocabulary contained by the page and returns that page once
  with its best contextual reason. Global search does not create extra page results from contained
  vocabulary; the lexical result instead summarizes up to two active page contexts plus a remaining
  count, while lexical detail shows the full active context list (Collection group, Source
  capture/location, or Grammar section/example). Disabled structures contribute no search text or
  context. Relationship notes remain outside search. Every new comparison uses the existing
  normalization that preserves ñ.
- **Phase-19 search clarification, 2026-08-10:** Grammar Overview Markdown contributes only its
  visible-text projection, never markers or the generated Note label. A subsection example's
  lexical context identifies both levels as `Parent › Child`; roots retain their ordinary name.
- **Phase-19 Structured Notes search clarification, 2026-08-10:** Notes section names and the
  visible-text projection of each section body match at Tier 6 with reason **in a Notes section**.
  Page-body matches retain their existing earlier check and reason.

## 9. AI assistant policy (~~Phase 5~~ **Phase 6**)

- Off by default; the owner enables it explicitly.
- Before anything is sent, the interface states which categories of notebook data are included in requests (e.g., entries, notes, activity summary). Only deliberately included data is transmitted, and only to the AI provider.
- The API key is entered once and stored on-device. A browser-stored key is readable by code running on the page — an accepted, documented risk for a single-user app, contingent on the spend cap in §3. Log the acceptance in `DECISIONS.md`.
- Proposed entries follow the prototype's pattern: nothing saves without explicit approval.
- **Amended 2026-08-11:** the latest Diario review is persisted on the entry it judged, as schema v8's `feedback` field on the page record — a field on an existing type, not a third content type, so §7 stands. One review per entry; asking again replaces it, and the owner can remove it. A stored content hash of the reviewed text marks the review stale after later edits. The review rides in backups like any other item field, but saving it moves no timestamp and logs no event: requesting feedback is neither opening nor editing the entry.
- **Amended 2026-08-14:** an entry's `apuntes` (schema v9) is never included in an AI request and never enters the staleness hash — both cover exactly the title and body. Outside feedback filed there cannot be re-reviewed as if it were the owner's writing, and filing it never marks the stored review stale.

## 10. Backup and durability

Backup envelope:

~~Through schema v3, the current envelope stored `"schemaVersion": 3`.~~
~~**Schema-v4 replacement, 2026-08-04:** the current envelope stores `"schemaVersion": 4`.~~
**Schema-v5 replacement, 2026-08-04:**

```json
{
  "format": "mi-cuaderno-backup",
  "schemaVersion": 5,
  "exportedAt": "ISO timestamp",
  "appVersion": "version",
  "userItems": [],
  "events": [],
  "preferences": {}
}
```

- Contains all personal-layer data, events, and preferences. **Excludes** the reference dictionary (replaceable) and the API key (never exported).
- If attachments are ever built, the backup upgrades to an archive (zip: this JSON envelope + attachment files) with a `schemaVersion` bump; until then it stays a single JSON file.
- Import validates the entire file before touching the database, runs in a transaction, and its first supported mode is **replace-and-restore** — no merge mode in v1. Duplicate event IDs are skipped. The owner sees a summary and confirms before anything is written, and the existing database is auto-exported first so the pre-import state is recoverable.
- **Schema-v2 amendment, 2026-08-02:** the first personal-data migration converts each nonblank line
  of a v1 lexical `translation` into an ordered personal meaning and leaves existing entry notes and
  examples unassigned. The upgraded app must offer and require a validated v1 export before it opens
  the database for migration. A v2 app accepts v1 backups by validating them, upgrading them in
  memory, validating the resulting v2 envelope, and only then offering replace-and-restore.
- **Schema-v3 amendment, 2026-08-03:** every existing page migrates to General with empty dormant
  Collection groups; stores and indexes do not change. Before v3 opens, both v1 and v2 databases
  require an untouched validated export and explicit saved-file acknowledgement. Direct v1→v3
  upgrades run the meanings migration before the page-profile migration. Backup schemas 1, 2, and
  3 are accepted, upgraded sequentially in memory, and deeply validated as v3 before any write;
  ~~versions newer than 3 remain blocked.~~ Validation includes profiles, group IDs/names/order,
  one-group-per-page placement, membership/link consistency, dangling references, and
  `pinnedPageIds` preference shape.
- **Schema-v4 amendment, 2026-08-04:** every item gains mandatory `linkAnnotations: []`; stores and
  indexes do not change. The v3→v4 migration adds only that empty array and preserves every ID,
  field, link, timestamp, event, preference, meaning order, Collection layout, and legacy self,
  duplicate, or reciprocal edge exactly as stored. Before v4 opens, schema-v1, v2, and v3 owners
  must save and acknowledge an untouched validated export. Direct upgrades run meanings, page
  profiles, then relationship annotations in order. Backup schemas 1, 2, 3, and 4 are accepted,
  upgraded sequentially in memory, and deeply validated as v4 before any write; ~~versions newer
  than 4 remain blocked.~~ V4 validation requires the annotation array and validates target keys,
  fixed types, `subject`, string notes, matching physical edges, dangling personal targets, and one
  annotation per conceptual personal pair. It continues to accept untouched redundant legacy
  topology, installed dictionary orphans with annotations, and unresolved old/canonical alias
  conflicts. Current v4 exports round-trip exactly.
- **Schema-v5 amendment, 2026-08-04:** stores and indexes remain unchanged. V4 Collection pages
  migrate to `pageFocus: vocabulary` with `collection.enabled: true`; every other page migrates to
  Notes focus with `collection.enabled: false`, retaining any dormant groups and links. Every page
  receives empty disabled Source and Grammar structures, and obsolete `pageProfile` is removed.
  Existing dated Collections remain Pages and dated General pages remain Diario entries. Every ID,
  common field, link, annotation, event, preference, timestamp, meaning and Collection order is
  preserved. Before v5 opens, schema-v1 through v4 owners must save and acknowledge an untouched
  validated export; direct legacy upgrades run all intervening migrations in order. Backup schemas
  1 through 5 are accepted, upgraded sequentially in memory, and deeply validated as v5 before any
  write; versions newer than 5 remain blocked. V5 validation covers focus/capability consistency,
  enabled and hidden populated structures, fixed enums, HTTP(S) Source URLs, stable unique nested
  IDs, ordered unique Grammar sections, vocabulary membership authority, dangling contextual
  references, and exact same-page or externally linked Source-capture references. Current v5
  exports round-trip exactly.
- **Schema-v6 amendment, 2026-08-10:** stores and indexes remain unchanged. Every existing Grammar
  section receives mandatory `parentId: null`; all other page and notebook data remains exact.
  Before v6 opens, schema-v1 through v5 owners must save and acknowledge an untouched, deeply
  validated source-schema export. Direct upgrades run all earlier migrations followed by the pure
  v5→v6 addition. Backup schemas 1 through 6 upgrade sequentially and validate completely before
  any write; versions newer than 6 remain blocked. V6 validation requires same-page one-level
  parent references, rejects self/dangling/cyclic/grandchild parents, and applies section-name
  uniqueness among siblings. Current v6 exports round-trip exactly.
- **Schema-v7 amendment, 2026-08-10:** stores and indexes remain unchanged. Every Page receives
  mandatory `noteSections: []`; all schema-v6 nested data remains untouched. Schemas 1 through 6
  require an untouched validated export before v7 opens and upgrade sequentially in memory or
  Dexie. Source schemas through v6 reject a premature `noteSections` field; v7 requires it and
  validates globally unique IDs, same-page one-level parents, cycles and sibling names. Current v7
  exports round-trip exactly and newer versions remain blocked.
- On first meaningful use, request persistent storage (`navigator.storage.persist()`), surface whether it was granted, and tell the owner plainly that clearing browser data, uninstalling, or losing the device destroys local data — which is why export is one tap away and the settings screen shows "last backup: N days ago".

## Secrets

API keys and other secrets must never be written into exported/backup payloads, logs, or fixtures. When adding fields to the backup envelope, add an explicit test asserting no secret keys are present.

## 11. Reference-data delivery and caching

- The app shell and the full notebook work immediately after install; the dictionary is an explicit, versioned, chunked **"Download dictionary for offline use"** action with visible progress.
- Version swaps are atomic: a new dataset version is fully downloaded before it replaces the old one; a failed or interrupted download leaves the previous version intact and usable.
- When an app update ships a new `datasetVersion`, the app offers the update; the About screen always shows the installed dataset version.

## 12. Phases and acceptance criteria

~~Each phase ends with the app fully usable. Do not start a phase before the previous one's "done when" holds.~~

**Amended August 2, 2026.** Each phase still ends with the app fully usable, and sequential work
remains the default. The owner may approve concurrent work on independently scoped phases when
their boundaries, dependencies and integration order are documented first. Parallel work uses
separate branches or worktrees; overlapping files or behaviours must be sequenced rather than
edited independently at the same time. Each integrated sub-phase must leave the app usable and
pass its relevant verification before dependent work is merged.

**Phase 0 — Skeleton and deploy.** Repo, scaffold, PWA config, automatic deploy on push.
*Done when:* the empty app installs to an Android home screen as an icon that opens full-screen, and a pushed change appears at the public URL without manual steps.

**Phase 0.5 — Data feasibility spike (no UI; may run alongside Phase 0).** Prove the pipeline end-to-end on 100–200 records: download and parse the kaikki extract; inspect its real fields and regional labels; join a frequency sample **including a form→lemma aggregation test**; attach conjugations and Tatoeba examples with full per-example metadata; estimate full-dataset size; generate a draft `DATA_SOURCES.md`.
*Done when:* the owner has reviewed ~20 generated records and the size estimate, and either confirms the locked data decisions hold or this brief is amended before the notebook is built on wrong assumptions.

**Phase 1 — Notebook core.** Port the prototype into the real project, as four independently committed and tested subphases:
1a. *Data foundation:* Dexie schema and migrations, persistent-storage request, backup export/import round-trip.
1b. *Items CRUD:* lexical items (word | phrase) with notes, tags, personal examples, media links — plus **minimal pages** (title, body, optional date, tags, links to words). Pages need only a basic editor; their value is capturing grammar notes, sources, and journal entries from day one.
1c. *Search and linking:* §8 normalization and ranking over the personal layer, `linkedKeys` both directions, deletion cleanup.
1d. *Tracking and Repaso:* event rules from §7, derived tricky state with highlighter styling, derived stats screen.
*Done when:* a word added on the phone survives a full browser restart; typing "saco" finds "sacó" with exact "saco" ranked first; "año" never matches "ano"; a grammar page linking two words is findable by its title and body text, and its links navigate both directions; deleting an item logs a `delete` event and leaves no dangling links; export → wipe → import restores everything; repeatedly opening the same item within the session window records one view.

**Phase 2 — Dictionary pipeline and reference UI.** Scale the spike into the real pipeline under `/pipeline`: frequency ranking via form→lemma aggregation (or a lemmatized source — state the choice in `DECISIONS.md`); top ~10k lemmas; merged conjugations and up to 3 examples per entry; compact chunked output; §11 download flow; conjugation tables ustedes-first with vosotros collapsed; Mexico-labeled senses sorted first; form→lemma search index live.
*Done when:* 20 representative entries (everyday vocabulary plus several Mexico-flagged terms, mixed parts of speech) resolve correctly — all show senses, verbs show conjugations, examples appear where an acceptably licensed pair exists; a defined list of inflected searches (at minimum: fui, tuvimos, casas, rápidas) resolves to the correct lemmas; a search for "take out" surfaces *sacar*, labeled as an English-meaning match; the dataset version is visible in About and every example carries its source metadata; startup and search timing are measured on the owner's phone and acceptable; the dictionary works fully offline once the download completes.

**Phase 3 — Review queue.** Tricky-flagged and repeatedly-looked-up words feed a daily review screen grouped by `localDate`. Start with Leitner boxes; record `review_pass` / `review_fail` events **with the 4-point grade in metadata**; orphaned events are excluded.
*Done when:* the queue populates from real usage data; items reviewed successfully come back less often; and every review event in the log carries a grade.

**Phase 4 — Live-use polish.** Driven by a running list of friction the owner collects while using the app daily. Candidates: a journal view (dated pages, newest first), YouTube links opening at a timestamp, ~~richer linking,~~ **typed and explained ordinary connections, now approved as Phase 4t–4x,** ~~better stats,~~ **owner-centric stats — streak, activity heatmap, growth chart, box distribution and a per-item review strip — now approved as Phase 11,** a "words I couldn't find" list from `search_miss` events.

**Amended 2026-08-02 — Phase 4i: structured personal meaning blocks.** Replace the flat personal
translation string with ordered meaning blocks whose IDs are independent of dictionary senses.
Meanings may carry a Spanish usage cue, compact descriptive labels, a note and assigned examples;
entry-wide notes and general examples remain. This is the first personal schema migration, so
schema-v1 data and backups receive an export-first, validated upgrade path. Repaso remains entry-
level and reveals all glosses and cues together. The approved direction is recorded in
`docs/IMPROVEMENT-IDEAS.md` and `DECISIONS.md`.
*Done when:* schema-v1 personal data and backups upgrade losslessly; structured meanings can be
created, read, edited, reordered, merged and deleted with explicit preservation choices; every
personal-data consumer uses the new model; entry-level search and review remain correct; and the
seeded schema-v1 `sacar` fixture passes the full 375 px browser flow without overflow or errors.

**Amended 2026-08-03 — Phase 4j–4o: persistent page profiles and Vocabulary Collections.** Keep
the two top-level item types and add only the stored General and Collection profiles. General keeps
the existing page behavior; a dated General page derives as Journal. Collection pages keep an
overview plus manually ordered, named vocabulary groups; membership remains outgoing personal
lexical links, with ungrouped vocabulary and Related content derived at render. Ship a creation
starter gallery, transactional multi-select vocabulary capture, explicit-draft organization,
lightweight reveal-only Practice, lexical Collection placements, Pages-only profile filters, and
preference-backed pins. Source, Grammar, richer Journal profiles, user-authored templates, typed
relationships, practice history, scoring, scheduling, and AI assistance remain outside this release.
*Done when:* v1/v2 databases and schema 1/2/3 backups reach deeply validated v3 through the
export-first gate; General-page behavior, search, linking, navigation, Repaso, events, and backup
semantics remain intact; Collection creation/read/capture/organize/practice and cleanup rules hold;
pin and profile retrieval behavior is correct; and the disposable schema-v2 phone fixture completes
migration plus export→wipe→import at 375×812 without overflow, console errors, or warnings.

**Amended 2026-08-04 — Phase 4t–4x: typed and explained link relationships (~~approved;
implementation in progress~~ implemented locally; disposable browser closeout pending).** Add one
fixed relationship type and one optional shared note to each ordinary connection while keeping
`linkedKeys[]` authoritative for connection existence and
Collection membership. Phase 4t introduces schema v4 and its export-first durability path; 4u owns
the relationship domain and mutations; 4v protects dictionary aliases, conflicts, and orphans; 4w
adds the shared phone-first Connections interface; and 4x integrates Collections, Diario, and
dictionary detail before closeout. The initial fixed display order is Similar meaning, Contrast,
Often confused, Variant, Explained by/Explains, Found in/Contains, and Related. The owner expressly
waived the earlier real-link audit and approved all seven types together.
*Done when:* schema-v1, v2, and v3 databases and schema 1–4 backups reach deeply validated v4
without changing existing IDs, content, events, timestamps, preferences, Collection layout, or
legacy link topology; ordinary connections derive Related when unannotated and can be typed,
explained, grouped, edited, and removed from either personal endpoint without reciprocal writes,
activity events, or metadata-only recency changes; Collection promotion/restoration, dictionary
alias conflicts/orphans, and Journal/dictionary specialized surfaces preserve their documented
seams; and the complete serial suite, production build, and disposable schema-v3 375×812
export→wipe→import flow pass without overflow, warnings, or console errors.

**Closeout status, 2026-08-04:** implementation, the complete 493-test serial suite, the production
build, and deliberate migration/domain/seam plus review-follow-up failure proofs pass. The in-app
browser-control kernel still fails before fixture setup with a missing local asset path, so the
disposable schema-v3 375×812 condition above is not yet claimed; no owner browser data was read or
changed.

~~**Phase 5 — AI assistant.** Implement per §9.~~

**Amended 2026-08-02 — Phase 5: organizational improvements.** Improve navigation continuity,
retrieval and maintenance views, tag/list control, detail-page scanability, activity navigation,
and duplicate guardrails. Keep all first-pass state derived in memory from the existing item and
event shapes; no personal-layer schema change, stored taxonomy, or real-data-dependent content
model is part of this phase. The detailed sequence lives in `docs/PHASE-5-DIRECTION.md`.
*Done when:* linked-entry traversal has a predictable back path and opens each destination at
the top; existing fields support useful browse sorting and neutral maintenance views; the tag
vocabulary remains manageable on a phone; long and sparse detail pages are easier to scan;
active recent activity can reopen its item; exact personal matches receive duplicate warnings;
and all of this ships with `SCHEMA_VERSION` still 1.

**Amended 2026-08-18 — Phase 5a navigation-continuity reversal.** The original in-memory-only,
reset-on-tab-switch rule was appropriate for the smaller Phase 5 app but is now superseded.
Navigation uses shallow browser history with one remembered stack for each primary tab. Browser
Back, Forward and visible Back actions traverse the same chronological history; changing tabs
restores that tab's last major destination, selecting the active tab pushes its root, and
cross-tab item navigation retains the originating snapshot. A validated v1
`history.state.mcNavigation` snapshot may contain only the active tab, depth, allowlisted stable
routes, item ids, visit keys and fixed Back-label metadata. Search handoffs, share payloads,
editor seeds and drafts, filters, study progress and scroll offsets remain visit-only memory.
Refresh restores stable hubs, major screens and valid items, while payload-only search, a new
unsaved editor and an active study session fall back to their safe launchers. Missing personal
destinations fall back to the nearest valid route. No URL routes, router dependency, durable
browser storage, preference, event, backup or schema change is introduced; `SCHEMA_VERSION`
remains 9.
*Done when:* Android/browser Back, Forward and visible Back controls agree; per-tab stacks and
Back labels restore the actual origin; Repaso drill-down filters survive an item round trip;
Diario leave guards and study Finish semantics remain safe; refresh sanitizes transient work;
and seeded 375×812 checks show no overflow or console errors.

**Phase 6 — AI assistant.** Implement per §9.
*Done when:* the spend cap is set and the disclosure is visible before first send; the assistant correctly answers a question about the owner's tricky words; and a proposed entry lands in the notebook only after the approve tap.

**Amended 2026-08-04 — Phase 7: composable pages, Source notebooks and Grammar guides.** Replace
the exclusive General/Collection profile with one leading page focus plus independently enabled
Vocabulary, Source and Grammar structures while retaining exactly two top-level item types. Notes
remain the permanent body-based foundation; disabling a populated structure hides and preserves it.
Diario remains a separate workspace derived from dated pages that have no enabled structured
capability. Deliver this as 7a contract/schema-v5 durability, 7b composable-page foundation, 7c
Pages library and creation, 7d Source notebook, 7e Grammar guide with exact Source-capture
references, 7f contextual retrieval, and 7g integration/verification. Built-in creation recipes and
copy-empty-structure store no template identity. The approved direction and first-release
boundaries live in `docs/PHASE-7-DIRECTION.md`. This independently scoped phase may proceed while
Phase 6 remains unstarted under the concurrency rules at the start of §12.
*Done when:* schema-v1 through v4 databases and schema 1–5 backups reach deeply validated v5
through the export-first gate; existing General, Journal and Collection content migrates without
loss; focus changes, reversible capability configuration, overlapping Pages filters, role-aware
creation/copying, Source capture, Grammar organization, vocabulary authority and exact Source
references obey §§5 and 7; contextual Pages/global search obeys §8; disabled structures remain
recoverable but invisible to retrieval; the complete serial suite and production build pass; and a
disposable seeded 375×812 flow verifies migration, creation, organization, search and backup
without horizontal overflow, warnings or console errors. If browser control still cannot
initialize, that closeout remains explicitly unclaimed and no owner browser data is inspected.

**Amended 2026-08-05 — Phase 9: filtered free-practice flashcards.** The Words & phrases hub's
current form, context, learning, completeness, tag and search narrowing defines a personal lexical
practice deck. Exclude entries without a personal meaning; preflight 10, 20 or All plus shuffled or
current order; snapshot the chosen deck; reveal all entry-level meanings and cues with optional
context; and support session-only Again/Got it plus missed-only follow-up rounds. ~~Repaso remains
the only scheduled and event-backed review flow.~~ **Amended 2026-08-07 (Phase 14): Leitner Repaso
remains the only scheduled review flow. Hub and Collection free practice remain history-free;
Conjugation Gym is a distinct event-backed skill-practice flow whose results never affect review
scheduling.** ~~Collection Practice remains reveal-only and ordered by its page.~~ **Amended
2026-08-09 (Phase 16): its in-place reveal list remains for quick skims, and a separate transient
session can practise the whole Collection or one group with limits, shuffle/page order, direction,
cloze, typed marking and missed-only rounds.** No schema,
preference, backup, event, timestamp, saved deck, history, score or schedule is
added; `SCHEMA_VERSION` remains 5.
*Done when:* every active hub narrowing produces the matching answerable candidates; size and order
choices are deterministic under test; incomplete entries are honestly counted and excluded; a
session survives full-entry navigation, can finish early and repeat only missed cards; no free-
practice action changes the event log or derived Repaso state; existing Repaso and Collection
Practice behavior remains correct; and the complete serial suite, production build and disposable
375×812 flow pass without horizontal overflow, warnings or console errors.

**Amended 2026-08-07 — Phase 14: Conjugation Gym.** Repaso gains an owner-started Gym with Quick,
Focus and explicitly Adaptive sessions. Session-only controls choose saved verbs or fixed Core
20/Core 50 lemma curricula, Type or Reveal, 10 or 20 questions, exact tense and person filters, and
Everyday, Commands, Subjunctive, Perfect or custom tense sets. Core practice creates no personal
item. The current installed dictionary is resolved by exact lemma through the reference indexes;
reference ids remain replaceable. Typed matching preserves Phase 13's exact-before-normalized rule,
then diagnoses a missing negative, missing reflexive pronoun, wrong person, wrong tense or another
recognisable form before generic failure. An initial failure is recorded before one unrevealed
retry; an optional end round repeats initial misses. Every attempt remains an event, but primary
accuracy uses only typed initial attempts. Stats merge Saved and Core practice by an exact
NFC-lowercased lemma identity, preserve their source filter, retain interpretable aggregate skill
history after personal deletion, and remove deleted content from current coverage and actions.
Adaptive sessions transparently mix recent misses, qualifying weak areas and under-practised cells.
They create no background schedule, due date, reminder, stored mastery counter or Leitner change;
`SCHEMA_VERSION` remains 5.
*Done when:* the Gym remains reachable with no saved verb or no installed dictionary; Core lookup
is exact, rebuild-safe and package-verified; Quick and Focus decks balance real non-vosotros cells;
all diagnostic and retry stages persist once and refresh the notebook snapshot; recent typed,
lifetime, reveal, recovery, tense, person, verb, error and coverage figures independently recount
from the log; every actionable weak row opens the matching setup; Adaptive selection follows its
documented evidence rules; existing review derivation ignores every drill event; the complete
serial suite, production build and diff check pass; and a disposable 375×812 numerical closeout
finds no horizontal overflow or console error.

**Amended 2026-08-09 — Phase 16: review depth and one vocabulary-card engine.** Scheduled Repaso
uses all four existing grades: Again resets to box 1; Hard logs a pass and holds the box; Good
climbs one; Easy climbs two, capped at box 5. A word retires only after a ~~pass~~ **Good or Easy
pass (ruled later on 2026-08-09: Hard at box 5 holds rather than retires)** while already in box
5. Malformed or absent legacy grades replay as Good for `review_pass` and Again for `review_fail`.
Session-only Type mode objectively marks reverse-term and cloze-gap answers through the shared
exact/accent-aware vocabulary checker; a wrong answer immediately grades Again, while a correct
one still asks Hard/Good/Easy. Raw typed strings are never stored. After the event-backed primary
pass, missed cards may run once more as an event-free recovery round. Queues over 20 offer
10/20/All, default 20, from the existing most-overdue-first order and re-derive the next chunk.

Scheduled review and free practice share one card engine for plain, reverse and cloze faces,
reveal/context, typed marking and grade/mark controls. Hub practice gains transient direction,
cloze and typed options. A Vocabulary page keeps its existing in-place skim and adds a whole-
Collection or group-scoped session with the same limits, ordering and free-practice recovery.
Only scheduled primary grades write events. Free practice, Collection sessions and both recovery
rounds write no history or schedule. The optional dictionary may enrich cloze preparation but can
never prevent a session from starting. No preference, new event type, background queue or schema
change is introduced; `SCHEMA_VERSION` remains 5.
*Done when:* four-grade replay and strict legacy fallback are pinned; typed success/failure writes
only mode/verdict metadata on scheduled grades; recovery repeats do not double-move a box; forty
due words default to a 20-card head chunk and offer the rest; hub and group-scoped Collection
sessions exercise direction, cloze, typed marking and missed-only rounds without changing the
event log; the complete serial suite, production build and diff check pass; and a disposable
375×812 numerical closeout finds no horizontal overflow or console warning/error.

**Picture-front amendment, 2026-08-11.** The shared card engine gains a fourth question face:
a forward card whose item carries a direct-image media link (https, image extension) always
shows that picture as the question, in both scheduled review and free practice. The reveal adds
the word beside the picture; Type mode marks the term through the existing checker. The face is
excluded on reverse cards and outranks cloze; only the URL reaches the card — the link label
never appears on the question side. A picture that fails to load degrades to the plain term
front. Scheduled grades log `face: "image"` as additive metadata that no replay or statistic
reads. The prompt image is not a link and never leaves the session. No schema, preference,
event type, scheduling or backup change; the owner opts a word in or out by keeping or removing
its image link.

**Amended 2026-08-09 — Phase 17: Gym recognition lanes.** Conjugation Gym adds two owner-started
multiple-choice lanes beside Forms: Tense usage asks which tense fits a short canonical use, and
Endings asks which tense matches a five-slot regular or perfect pattern. Both use curated original
in-code content with stable card ids, four distinct options, curated confusables, balanced 10/20
card decks, no immediate retry, one reshuffled missed round and session-ending confirmation on
navigation. Endings may reveal hablar/comer/vivir through the optional reference seam; without an
installed dictionary the complete plain-text pattern remains usable. Usage may derive up to two
matching active Grammar-focused pages by normalized title; it stores no personal mapping.

Objective answers reuse `drill_pass` / `drill_fail` with additive choice metadata and no verb or
slot identity. Recognition never changes form accuracy, Adaptive form ordering, Leitner state,
due dates or scheduling. Performance derives per-lane and per-tense first-attempt accuracy,
directional chosen-vs-canonical confusions and separate missed-round recovery from the raw log.
`SCHEMA_VERSION` remains 5; no event type, preference, stored counter, queue or schedule is added.
*Done when:* shipped hablar/comer/vivir/haber tables reproduce every curated endings row; choice
decks are deterministic under injected rng and never offer an also-acceptable answer; recognition
events leave form Performance, Adaptive and review replay unchanged; Usage/Endings statistics and
confusions reconcile with the log; a matching personal Grammar guide derives and opens through
the session-ending guard; and the complete serial suite, production build, diff check and a
disposable 375×812 numerical closeout pass without horizontal overflow or console warning/error.

**Amended 2026-08-10 — Phase 18: Gym depth and targeting.** Tense usage adds a self-graded
reverse direction: one mood-qualified tense asks for at least one valid use, then reveals the
complete curated set, nuance, contrasts and any derived Grammar-guide links. Its default session
shows each selected tense once; 10/20-card sessions repeat only through balanced cycles and a
missed round de-duplicates repeated misses. Endings adds five-field production with required
collapsed-person rows, exact-first accent grading, locked passing fields, one unrevealed retry and
one optional de-duplicated missed round. Perfect rows produce *haber* and reveal the shared
participle rule; Future and Conditional retain the whole-infinitive cue.

Forms uses one grouped curriculum registry and gains balanced 18-verb Regular and Spelling-change
packs. Saved sessions may be narrowed transiently to one exact existing tag or one active
Vocabulary page whose membership comes from authoritative `linkedKeys` through
`deriveCollection`; the same resolved subset constrains Quick, Focus, Adaptive, counts and the
one-verb picker. Performance derives Usage recall and Typed Endings separately while Phase 17
choice results keep their exact shape and Forms/Adaptive/Leitner consumers ignore the new modes.
No typed strings or subset identities enter events. `SCHEMA_VERSION` remains 5; there is no new
event type, stored preference, schedule or mastery state.
*Done when:* all 80 curated lemmas resolve uniquely; Regular anchors and every declared spelling
cell match shipped tables; recall/production decks and grading are deterministic and isolated;
tag/page subsets use exact and authoritative membership across all three session kinds; raw events
reconcile with each depth figure while prior choice/Form results remain byte-for-byte unchanged;
and the complete serial suite, production build, diff check and disposable 375×812 closeout pass
without horizontal overflow or console warning/error.

**Amended 2026-08-10 — Phase 19: Page organization and formatting.** Phase 19 is the umbrella for
related owner-approved improvements to how Pages are organized and formatted; that grouping does
not pre-approve unknown future behavior or waive its decisions, tests or any required migration.
The first release formats Grammar section Overviews with the existing safe Markdown dialect and an
accessible Note callout, then introduces schema-v6 `parentId` ownership for exactly one Grammar
subsection level. Existing sections migrate to roots; sibling names are unique within their parent;
organizing, copying, counts, search and lexical contexts preserve the hierarchy. No general block
editor, deeper nesting, new content type, event, preference, dictionary dependency or template
identity is introduced. The approved contract and delivery order live in
`docs/PHASE-19-DIRECTION.md`.

**Amended 2026-08-10 — Phase 19 Notes callouts; revised 2026-08-16.** ~~Page creation,
Page-details editing, Notes Overview editing and Notes section/subsection editing expose both Block
quote and Note callout. The Note action writes `> [!NOTE]` plus quoted prose; only that explicit
marker receives the Notes-blue labeled callout treatment.~~ **Revised 2026-08-17:** Page creation,
Page-details editing, Notes Overview and Notes section/subsection editors expose Block quote plus
Note, Tip and ¡Ojo! callouts. Their exact first-line markers are `[!NOTE]`, `[!TIP]` and the
owner-chosen Spanish `[!OJO]`; read mode labels them Note, Tip and ¡Ojo! with distinct treatments.
Grammar retains its existing Grammar-colored callouts and
~~ordinary lexical notes and Diario keep their existing Block quote control~~ **top-level lexical
notes expose both Block quote and the same explicit Note callout as Page Notes, while Diario keeps
its existing Block quote control**; under the 2026-08-17 revision those top-level lexical-note
editors receive all three explicit callout actions. ~~The marker stays outside search and
previews.~~ **All three markers stay outside search and previews.** No schema, backup, event,
preference or content-type change is introduced.

**Amended 2026-08-17 — Phase 19 inline actions.** Every Markdown toolbar exposes **Inline code**
and **Link**. Inline code wraps selected text in backticks and renders as a compact monospace span;
fenced blocks stay unsupported and degrade to readable plain text. Link writes `[text](https://)`
with the URL placeholder selected, using the existing rule that only HTTPS destinations become
clickable. Bare URLs, autolinks, footnotes, tables, strikethrough, task lists and raw HTML remain
outside the dialect.

**Amended 2026-08-10 — Phase 19 Markdown blank lines; revised 2026-08-16.** Page Notes editors,
Grammar Overview editors, ~~and Diario~~ **Diario and top-level lexical-note editors** expose a
**Blank line** action. The action preserves selected prose and writes
one top-level standalone `<br>` line after the current line or selected lines; each exact marker
renders as one unlabeled, noninteractive vertical spacer, so repeated markers intentionally create
repeated spacing. Inline `<br>`, ~~lexical notes and every other raw-HTML form~~ **meaning-level
notes and every other raw-HTML form** retain the prior unsupported behavior. The marker is
formatting rather than visible prose and is excluded from search, previews and AI-visible text.
Existing strings, backups, events and schema v7 remain unchanged.
*Done when:* schema-v1 through v5 databases and backup schemas 1–6 reach deeply validated v6
through the untouched export-first gate; existing page content and references remain lossless;
formatted Overviews search by visible text; root/subsection creation, editing, organization,
deletion protection and structure copying obey the one-level contract; counts and breadcrumbs are
consistent; and the complete serial suite, production build, diff check, deliberate failure proofs
and a disposable schema-v5 375×812 export→upgrade→restore flow pass without overflow, warnings or
console errors.

**Phase 19 Structured Notes increment, approved 2026-08-10.** Preserve `page.body` as Overview and
add schema-v7 one-level Notes outlines to every Page. Grammar and Notes share hierarchy machinery,
while their content fields and readers remain domain-specific. Notes outlines support read/edit,
organization, copy-empty-structure, counts and visible-text search. A nonempty outline keeps a
dated record in Pages; Diario remains the body-only workspace and exposes no outline editor.
*Done when:* schemas 1–6 cross the untouched export-first gate into deeply validated v7; existing
data remains exact; every constructor and backup path carries the mandatory array; Notes roots and
children create/edit/reorder/reparent/delete according to the contract; search, copying, counts and
all Page/Diario consumers agree; and the full suite, build, diff check, failure proofs and seeded
375×812 v6 export→upgrade→edit→export→wipe→restore flow pass without overflow or console errors.

**Amended 2026-08-10 — Phase 20: global tag management.** Ajustes can rename one exact stored tag
across every personal item, merge it into one exact existing destination, or remove it everywhere.
Normalized lookalikes are suggestions only. Rename preserves tag position; overlap keeps the
destination's existing position. Rename carries the source colour, merge keeps the destination
colour, and removal deletes the old colour key. Merge and removal require explicit confirmation
and offer an optional backup export. The mutation is one transaction over items, events and
preferences; every changed item receives one ordinary `edit` while `updatedAt` remains unchanged.
No tag registry, alias, persistent undo, batch event, preference shape, backup format or schema
change is introduced; `SCHEMA_VERSION` remains 6. The approved contract lives in
`docs/PHASE-20-DIRECTION.md`.
*Done when:* exact rename/merge/removal and colour/order rules hold for lexical items and Pages;
failure rolls the whole batch back; timestamps remain byte-for-byte unchanged while edit events
retain existing activity behavior; every derived search/filter/Gym consumer refreshes safely; a
current schema-v6 backup round-trips the result; and the complete serial suite, production build,
diff check, deliberate failure proofs and a disposable 375×812 flow pass without overflow,
warnings or console errors.

**Amended 2026-08-12 — Phase 22: knowledge consolidation.** Lexical detail derives two visibly
non-authoritative signals from current notebook data. A personal Word shows saved Phrases containing
its exact normalized term or one unambiguous cloze-safe attached-verb form; a Phrase shows the same
relationship from the other side. Fixed high-noise function words are excluded, dictionary absence
falls back to exact term matching, and ambiguous or clitic-attached forms stay silent. Personal
meaning pairs whose normalized English content tokens overlap conservatively may appear as at most
three **You also know…** proposals. A proposal stores nothing, has no remembered dismissal, and
becomes a Similar meaning connection only after an explicit owner action through the existing
ordinary-link writer.

The Words & phrases hub separately offers history-free Similar-meaning recall once at least one
confirmed edge exists. One prompt asks for a direct neighbor of its focal lexical item, reveals
only direct confirmed neighbors and self-grades Again/Got it with one missed round. Raw proposals
and transitive graph neighbors never become answers. `SCHEMA_VERSION` remains 8; no personal field,
preference, backup shape, event type, reference package, score, schedule, or automatic queue is
added. The approved contract lives in `docs/PHASE-22-DIRECTION.md`.
*Done when:* containment, ambiguity, optional-dictionary fallback, gloss scoring, sparse-POS,
existing-edge exclusion, explicit confirmation, direct-edge recall and no-event boundaries are
pinned by pure/database/component tests; deliberate failure proofs redden; the complete serial
suite, production build and diff check pass; and a disposable seeded 375×812 flow verifies all
three slices without overflow, warnings, console errors, or owner data access.

**Amended 2026-08-12 — Phase 23: contexts and wandering.** A lexical item's **Historia** sub-view
replays saved, first-review, first-box, tricky-episode and retirement milestones and gathers its
current Collections, active page placements, phrase containment, ordinary Connections and
whole-token prose contexts. Diario matches stay in their own disclosed section with snippets.
The idle Cuaderno root separately starts an unweighted random walk on any personal Word or Phrase.
Each transient neighborhood shows typed links in both physical directions, saved conjugation-
family siblings, one dictionary teaching exit and an unopened Diario count; personal and
non-journal Page neighbors hop, while full-entry exits use ordinary Detail behavior. Both surfaces
are read-only derivations: no field, preference, backup shape, event type, stored trail, score,
schedule, queue, reference package or background job is added, and `SCHEMA_VERSION` remains 8.
*Done when:* prose scans retain the shared ñ-safe whole-token, stop-list, ambiguity, clitic,
Markdown-projection and optional-reference rules; milestone replay cannot drift from Leitner;
uniform sampling, family aliases and journal filtering are pure and pinned; component tests prove
the biography swap, disclosed Diario snippets, inert wander stub, silent hops and real route-trail
Back behavior; the required deliberate failures redden; the complete serial suite, production
build and diff check pass; and a disposable seeded 375×812 flow proves a rich biography plus a
three-hop family walk without overflow, console warnings/errors, or owner-data access.

**Amended 2026-08-13 — Phase 26: derived context connections.** A lazy visit-local context index
matches saved personal vocabulary in visible saved Page and Diario prose. **Mentioned here** keeps
matches non-authoritative until the owner explicitly attaches vocabulary to a Source capture or
Grammar example, adds it to an enabled Page Vocabulary section, or confirms a directional Found-in
ordinary link for other Page/Diario prose. Historia's read-only **Seen together** section derives
neighbors from one exact named group/capture/example or at least two distinct prose contexts,
including Diario, without inferring a semantic type. Exact identical stored Source/Media URLs may
show other personal Words, Phrases, Pages and Diario entries inline. Every result is evidence, not
stored authority; schema stays v8 and no preference, backup shape, event type, reference package,
score, schedule, queue or background job is added.
*Done when:* token matching preserves the ñ/whole-token/stop-list/ambiguity/clitic/optional-
reference contract; each confirmation follows existing page-vocabulary/link authority and event
rules; neighborhoods disclose qualifying contexts and write nothing; URL rows use exact
case-sensitive trimmed equality; deliberate failure proofs redden; the complete serial suite,
production build and diff check pass; and a seeded 375×812 flow proves all three slices without
overflow, console warnings/errors, automatic writes or owner-data access.

## 13. Non-goals

No accounts, no server, no analytics (yet), no multi-user, no native Android build, no cloud sync (yet), no merge-mode import (yet), no file attachments (yet — model reserved).

Phase 7 adds no third content type, folders, free-form block editor, custom page-kind builder,
stored/user-authored template manager, rich-media catalog, deep provenance graph, reading tracker,
Journal-only schema, or AI behavior. Source content remains text plus URLs; existing media links
remain links only.

Phase 19 does not relax that boundary. Grammar Overview and the Page Notes Overview remain strings
in the existing safe Markdown dialect. Grammar and Notes each permit exactly one subsection level
through shared hierarchy machinery rather than arbitrary blocks, custom fields or recursive
nesting. Diario receives no separate schema or outline editor.

## 14. Deferred decisions — do not solve early

Whether and when to build the Attachment model; cross-device sync; ~~review scheduling beyond
Leitner;~~ **automatic due-date, reminder or mandatory-queue scheduling beyond Leitner remains
deferred. Phase 14 approves only owner-started, history-ranked Conjugation Gym sessions; they never
change a review date or box. Stored mastery scores and automatic Gym sessions remain deferred;**
~~sense-level annotations;~~ **dictionary-sense attachment or synchronization (personal meaning
annotations are now built independently);** importing multiword expressions into the reference
layer; merge-mode import; ~~Source, Grammar, or explicit/richer Journal page profiles;
passages/reflections or source-identity structures; user-authored page templates;~~ **Source and
Grammar structures, Source captures, and built-in creation/copy-structure recipes are approved as
Phase 7; an explicit/richer Journal schema, Source parent/child hierarchies, deep provenance,
reading tracking, custom page kinds, and stored/user-authored template management remain
deferred;** ~~typed relationships;~~ **typed and explained ordinary connections are approved as
Phase 4t–4x;** ~~Collection practice history, grading, scoring, or scheduling.~~ **Persistent
Collection Practice history, grading, scoring or scheduling remain deferred. Phase 9 separately
approves transient Again/Got it feedback and missed-only rounds for hub free practice; Phase 16
extends the same history-free boundary to direction/cloze/typed hub sessions and launchable
whole-Collection or group sessions while preserving the in-place Collection skim. Those actions
write no history or schedule. Phase 22 extends the same history-free boundary to owner-started
Similar-meaning recall over direct confirmed connections. Durable suggestion-dismissal memory,
automatic synonym authority, transitive synonym clusters, persistent semantic-recall history,
scores, grading, or scheduling remain deferred.**

## 15. How to use this brief now

~~Read this brief and `mi-cuaderno.jsx`, then propose, in plain language and before writing any
code: a Phase 0 plan (file layout, dependency list with one-line justifications, deploy setup)
and a Phase 0.5 spike plan (data samples to pull, what you'll verify, what you'll show the
owner). Remember that pages are not in the prototype — plan their minimal UI fresh, matching the
prototype's visual style.~~

**Superseded August 2, 2026.** That was the bootstrap instruction before any application code
existed; Phases 0 and 0.5 are complete. For current work, follow `docs/AGENT-GUIDE.md`: establish
the current phase from `README.md`(note that phases may be added and phase numbers may change as the project progresses) and its linked report, load the contract and decision history
relevant to the request, inspect the current implementation, and address the owner's approved
scope. The prototype remains a visual reference, not the current application or a work queue.
