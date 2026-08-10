# Mi Cuaderno — Project Brief (v3)

**For:** Coding agents working through Claude Code or Codex. Use the task-sensitive read order in
`docs/AGENT-GUIDE.md`; this brief remains the product contract.
**Owner:** The sole builder and only user of this app.
**Companion file:** `mi-cuaderno.jsx` — a working single-file prototype of the notebook layer. It is the reference for features, interaction patterns, and visual design of **lexical entries**. Pages (§7) do not exist in the prototype and are new in v3. Where this brief contradicts the prototype's *implementation* (ID scheme, search normalization, the `struggling` field, event rules), **this brief wins** — the prototype shows what the app should feel like, not how it must be built.
**Version:** v3 — revised after lock-in review. Product contract last amended
~~August 3, 2026~~ ~~August 4, 2026~~ ~~August 5, 2026~~ **August 9, 2026**; agent-facing framing refreshed August 2, 2026.
**Amendments since v3:** §4 *Conjugations* — 2026-07-31, Phase 2: Jehle demoted from bundled source to build-time validation reference, removing the noncommercial restriction from the dataset. §§3, 9 and 12 — 2026-08-02: organizational improvements became Phase 5 and the AI assistant moved to Phase 6. §12 — 2026-08-02: independently scoped phases may proceed concurrently under explicit coordination rules. §§5, 7, 8, 10, 12 and 14 — 2026-08-02: personal lexical meanings became stable, structured annotations in schema v2 while review remains entry-level and dictionary senses remain replaceable reference data. **§§5, 7, 10, 12 and 14 — 2026-08-03: schema v3 adds durable `general | collection` page profiles and the first specialized profile, Vocabulary Collection, while dated General pages remain Journal entries and richer profiles stay deferred.** **§§5, 7, 10, 12 and 14 — 2026-08-04: schema v4 adds sparse typed and explained ordinary-connection annotations while `linkedKeys[]` remains authoritative for connection existence and Collection membership.** **§§5, 7, 8, 10, 12 and 14 — 2026-08-04: Phase 7 approves schema v5 composable pages with one leading focus, independently enabled Vocabulary, Source and Grammar structures, contextual retrieval, and sequential legacy backup upgrades.** **§§7, 12 and 14 — 2026-08-05: Phase 9 approves filtered, session-only free practice from the Words & phrases hub while Repaso remains the sole scheduled and event-backed review flow.** **§§7, 12 and 14 — 2026-08-07: Phase 14 approves an owner-started, event-backed Conjugation Gym with curated reference-only verb pools, richer derived performance, and optional history-ranked sessions that never create a due date or alter Leitner review.** **§§7, 12 and 14 — 2026-08-09: Phase 16 approves four-grade scheduled review, objective typed vocabulary recall, queue chunking, one event-free recovery pass, a shared vocabulary-card engine and history-free hub/Collection sessions.** Amendments are marked inline with strikethrough plus the replacement, so the original contract stays readable.

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
| Personal content scope | Two types: **lexical** items and **pages**. ~~A dated page is a journal entry; a page can be a grammar topic or a source (film, podcast, book).~~ ~~**Amended 2026-08-03:** every page stores `pageProfile: general \| collection`. Collection wins over `pageDate`; a dated General page remains a Journal entry. Grammar topics and sources remain General pages in this release.~~ **Amended 2026-08-04 (Phase 7):** every page stores one leading `pageFocus: notes \| vocabulary \| source \| grammar` and independently enabled Vocabulary, Source and Grammar structures. Notes remain the permanent body-based foundation. A dated page is a Journal entry only when no structured capability is enabled; dated enhanced pages remain Pages. No third top-level type without a brief amendment |
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

Array order is display order. Source URLs are blank or HTTP(S). Saved Source captures require
nonblank `text`; saved Grammar examples require nonblank Spanish `es`. Grammar section names are
trimmed, nonblank and unique within the guide under the same Unicode NFKC plus case-folding rule as
Collection group names. All nested IDs are stable through editing and reordering.

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
literal. A meaning may override the entry's part of speech with noun, verb, adjective, adverb or
other, and may record transitive, intransitive, reflexive, pronominal or impersonal verb behavior.
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
- **Free-practice event amendment, 2026-08-05:** starting, revealing, answering, repeating or
  finishing a Words & phrases free-practice session writes no event and changes no item timestamp.
  Opening the full entry remains ordinary detail navigation and retains its existing view-event
  rule. Only scheduled Repaso writes `review_pass` / `review_fail` and changes the Leitner replay.

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

## 9. AI assistant policy (~~Phase 5~~ **Phase 6**)

- Off by default; the owner enables it explicitly.
- Before anything is sent, the interface states which categories of notebook data are included in requests (e.g., entries, notes, activity summary). Only deliberately included data is transmitted, and only to the AI provider.
- The API key is entered once and stored on-device. A browser-stored key is readable by code running on the page — an accepted, documented risk for a single-user app, contingent on the spend cap in §3. Log the acceptance in `DECISIONS.md`.
- Proposed entries follow the prototype's pattern: nothing saves without explicit approval.

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
- On first meaningful use, request persistent storage (`navigator.storage.persist()`), surface whether it was granted, and tell the owner plainly that clearing browser data, uninstalling, or losing the device destroys local data — which is why export is one tap away and the settings screen shows "last backup: N days ago".

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

## 13. Non-goals

No accounts, no server, no analytics (yet), no multi-user, no native Android build, no cloud sync (yet), no merge-mode import (yet), no file attachments (yet — model reserved).

Phase 7 adds no third content type, folders, free-form block editor, custom page-kind builder,
stored/user-authored template manager, rich-media catalog, deep provenance graph, reading tracker,
Journal-only schema, or AI behavior. Source content remains text plus URLs; existing media links
remain links only.

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
write no history or schedule.**

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
