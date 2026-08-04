# Mi Cuaderno — Project Brief (v3)

**For:** Coding agents working through Claude Code or Codex. Use the task-sensitive read order in
`docs/AGENT-GUIDE.md`; this brief remains the product contract.
**Owner:** The sole builder and only user of this app.
**Companion file:** `mi-cuaderno.jsx` — a working single-file prototype of the notebook layer. It is the reference for features, interaction patterns, and visual design of **lexical entries**. Pages (§7) do not exist in the prototype and are new in v3. Where this brief contradicts the prototype's *implementation* (ID scheme, search normalization, the `struggling` field, event rules), **this brief wins** — the prototype shows what the app should feel like, not how it must be built.
**Version:** v3 — revised after lock-in review. Product contract last amended
~~August 3, 2026~~ **August 4, 2026**; agent-facing framing refreshed August 2, 2026.
**Amendments since v3:** §4 *Conjugations* — 2026-07-31, Phase 2: Jehle demoted from bundled source to build-time validation reference, removing the noncommercial restriction from the dataset. §§3, 9 and 12 — 2026-08-02: organizational improvements became Phase 5 and the AI assistant moved to Phase 6. §12 — 2026-08-02: independently scoped phases may proceed concurrently under explicit coordination rules. §§5, 7, 8, 10, 12 and 14 — 2026-08-02: personal lexical meanings became stable, structured annotations in schema v2 while review remains entry-level and dictionary senses remain replaceable reference data. **§§5, 7, 10, 12 and 14 — 2026-08-03: schema v3 adds durable `general | collection` page profiles and the first specialized profile, Vocabulary Collection, while dated General pages remain Journal entries and richer profiles stay deferred.** **§§5, 7, 10, 12 and 14 — 2026-08-04: schema v4 adds sparse typed and explained ordinary-connection annotations while `linkedKeys[]` remains authoritative for connection existence and Collection membership.** Amendments are marked inline with strikethrough plus the replacement, so the original contract stays readable.

---

## 1. What this is

A personal Spanish notebook built around a bundled dictionary: a mobile-first, installable web app (PWA) combining a reference layer (top ~10,000 lemmas by frequency, Latin American Spanish) with a personal layer of two content types — **lexical entries** (words and phrases with notes, tags, personal examples, media links) and **pages** (freeform notes for grammar topics, sources like films or podcasts, and dated journal entries) — plus event-based learning tracking (lookup history, "tricky" flags, a review queue). A built-in AI assistant comes last.

The bundled dictionary is lemma-focused. User-created lexical items may be single words **or** multiword phrases; both are first-class. Importing phrases/idioms into the reference layer may come later.

It is inspired by the *scope* of SpanishDict but built entirely from open data sources. It is a private tool for one person, not a product. Simplicity and durability beat features.

## 2. The owner, and how to work with them

- Solo personal project. The owner has ~2 years of experience directing AI tools and is comfortable following technical steps, but is not an expert programmer.
- **Always propose a plan before implementing each phase or sub-phase.** Wait for approval.
- Explain choices in plain language. Define jargon the first time it appears.
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
- **Never** scrape, copy, or import content from SpanishDict or any other proprietary dictionary.

## 5. Architecture: two layers, one seam

- **Reference layer (read-only):** imported dictionary entries, conjugations, and stock examples. Produced by the pipeline; versioned; regenerated or upgraded wholesale; never edited in-app.
- ~~**Personal layer (read-write):** everything the owner creates. Rebuilding or replacing reference data must never touch personal data. Any personal-layer schema change requires a migration plan and a reminder to export a backup first.~~
  **Schema-v4 durability amendment, 2026-08-04:** the personal layer remains everything the owner
  creates, and rebuilding or replacing reference data must never touch it. Every personal-layer
  schema change requires a versioned migration and schema bump; an older database must produce an
  untouched, fully validated export and receive explicit saved-file acknowledgement before the new
  schema opens it.
- **The seam rule:** *personal items always have their own stable ID; attaching one to a dictionary entry is a reversible relationship, not its identity.* ~~Lexical items always store their own `term` (and `translation`, when given) even while attached, so they stay meaningful on their own.~~ **Amended 2026-08-02:** lexical items always store their own `term` and ordered personal `meanings[]` even while attached. Each personal meaning has its own `meaning:<uuid>` identity and never stores or derives its identity from a dictionary sense ID, index or ordering.
- **Page-profile seam amendment, 2026-08-03:** Collection membership can contain only independent
  personal lexical items. A selected dictionary entry must first create or reuse its personal
  attachment through the existing seam; raw `dict:` keys remain Related and never become members.
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
| Personal content scope | Two types: **lexical** items and **pages**. ~~A dated page is a journal entry; a page can be a grammar topic or a source (film, podcast, book).~~ **Amended 2026-08-03:** every page stores `pageProfile: general \| collection`. Collection wins over `pageDate`; a dated General page remains a Journal entry. Grammar topics and sources remain General pages in this release. No third top-level type without a brief amendment |
| Identity | UUIDs for all personal records, independent of dictionary records; namespaced keys per §6 |
| Reference attachment | Optional and reversible (§5 seam rule); orphan-safe |
| Lexical form | `form: word \| phrase` |
| Annotation level | ~~Entry-level only. **Do not add a `senseId` field** — imported sense IDs are not stable across dataset updates; sense-level notes stay deferred until that's solved.~~ **Amended 2026-08-02:** personal lexical entries contain ordered meaning-level annotations with stable, locally generated IDs. Do not add a dictionary `senseId`: personal meaning identity remains independent of replaceable dictionary sense IDs and ordering. Review scheduling and activity remain entry-level. |
| Links | Any personal item can link to any item in either layer |
| Deletion | Confirm first; **hard-delete the record and log a `delete` event** — the append-only event log is the tombstone. No soft-delete flags. Remove links pointing to the deleted item; keep its historical events but exclude them from active queues and statistics |
| Media | `mediaLinks[]` (URLs) only for now. **Reserved:** a separate `Attachment` store for future files. Items will reference attachments by ID; binary data is never embedded in item records; nothing in the schema may assume links are the only media type |
| Review grades | Review events log a 4-point grade in `metadata` (0 again / 1 hard / 2 good / 3 easy) even while the UI shows only pass (→2) / fail (→0), so richer future schedulers have full history |
| Sync-readiness | UUIDs, `createdAt`/`updatedAt` on every personal record, stable event IDs, schema + app versions in backups. No sync built |

### Shapes (adapt details, keep the shape)

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
              review_pass | review_fail | search_miss,
              itemKey?, at, localDate, metadata? }
```

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

**Page-profile amendment, 2026-08-03.** Every page has both `pageProfile` and `collection`, so
temporarily switching a Collection back to General never destroys its layout. Group array order
and each group's `itemKeys` order are display order. Group names are trimmed, nonblank, and unique
within the page under Unicode NFKC normalization plus case folding. A personal lexical item may
belong to several Collection pages, but to at most one group in any one page.

~~`linkedKeys[]` remains the sole relationship and Collection-membership authority.~~
**Schema-v4 relationship-authority amendment, 2026-08-04:** `linkedKeys[]` remains the sole
connection-existence and Collection-membership authority; annotations describe but never create a
connection. Only an outgoing page link resolving to a personal lexical item is a member; group
`itemKeys` are layout references to those members. **Not grouped yet** is derived from outgoing
members absent from every group, in `linkedKeys` order. Active Collection membership hides any
ordinary-link annotation but preserves it dormant; returning the Collection page to General
restores it.
Promoting an incoming lexical connection moves the stored edge to page→lexical and flips
directional `subject`; a raw dictionary selection first creates or reuses an independent personal
lexical entry. Unlinking or deleting an item prunes annotations plus active and dormant group
references. `pinnedPageIds` is a backed-up UI preference, not page content; pinning changes no page
timestamp and writes no event.

### Event rules

- **Events are the single source of truth for state and statistics.** No running counters, and no stored `struggling` flag: current tricky state derives from the most recent `tricky_on` / `tricky_off` event.
- **View events:** one `view` when an item's detail screen is intentionally opened, at most one per item within a session window (named constant, default 30 minutes). Rerenders, edit toggles, and bouncing between linked items must not inflate counts.
- `search_miss` (no `itemKey`; query text in `metadata`) is logged when a search returns nothing — it feeds a future "words I couldn't find" list.
- `localDate` (owner's local calendar day) is stored on every event; daily queues and streaks group by it, not UTC.
- New event types may be added freely later; all consumers must ignore unknown types.
- **Page-profile event amendment, 2026-08-03:** profile changes and changed Organizer saves write
  one page `edit`. New pages and newly materialized lexical entries keep their existing `create`
  events. Migration, pinning, card expansion, mode changes, Practice, ordinary membership
  add/remove, Organizer Cancel, and no-op Save write no events. ~~Existing link/unlink event behavior
  is unchanged.~~ **Relationship-event amendment, 2026-08-04:** ordinary link creation, removal,
  type changes, note changes, alias rewrites, and alias-conflict resolution write no activity
  events. A relationship note annotates the connection rather than becoming either item's prose.
  Metadata-only relationship and conflict-resolution saves also preserve both endpoints'
  `updatedAt`; link creation and removal keep their existing timestamp behavior.

## 8. Search rules

- Case-insensitive. Normalization strips acute accents and diaeresis (á→a, é→e, í→i, ó→o, ú→u, ü→u) but **preserves ñ as a distinct letter** — "año" must never match a search for "ano". (The prototype's `normalize()` strips ñ; fix this when porting.)
- One results list spans both layers and both content types. Ranking, high to low:
  1. Exact Spanish term
  2. Accent-normalized Spanish term
  3. Inflected-form alias (reference layer: form→lemma index from kaikki forms + conjugation tables, so "fui" resolves to *ir* and *ser*, "tuvimos" to *tener*, "casas" to *casa*, "rápidas" to *rápido*)
  4. ~~English gloss or personal translation~~ **English dictionary gloss or personal meaning gloss — English→Spanish lookup is first-class**
  5. Tags
  6. Notes, personal examples, personal meaning cues and labels, page titles and page bodies
- Each result shows *why* it matched (e.g., "form of ir", "English meaning", "in your notes").

## 9. AI assistant policy (~~Phase 5~~ **Phase 6**)

- Off by default; the owner enables it explicitly.
- Before anything is sent, the interface states which categories of notebook data are included in requests (e.g., entries, notes, activity summary). Only deliberately included data is transmitted, and only to the AI provider.
- The API key is entered once and stored on-device. A browser-stored key is readable by code running on the page — an accepted, documented risk for a single-user app, contingent on the spend cap in §3. Log the acceptance in `DECISIONS.md`.
- Proposed entries follow the prototype's pattern: nothing saves without explicit approval.

## 10. Backup and durability

Backup envelope:

~~Through schema v3, the current envelope stored `"schemaVersion": 3`.~~
**Schema-v4 replacement, 2026-08-04:**

```json
{
  "format": "mi-cuaderno-backup",
  "schemaVersion": 4,
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
  upgraded sequentially in memory, and deeply validated as v4 before any write; versions newer
  than 4 remain blocked. V4 validation requires the annotation array and validates target keys,
  fixed types, `subject`, string notes, matching physical edges, dangling personal targets, and one
  annotation per conceptual personal pair. It continues to accept untouched redundant legacy
  topology, installed dictionary orphans with annotations, and unresolved old/canonical alias
  conflicts. Current v4 exports round-trip exactly.
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

**Phase 4 — Live-use polish.** Driven by a running list of friction the owner collects while using the app daily. Candidates: a journal view (dated pages, newest first), YouTube links opening at a timestamp, ~~richer linking,~~ **typed and explained ordinary connections, now approved as Phase 4t–4x,** better stats, a "words I couldn't find" list from `search_miss` events.

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

**Amended 2026-08-04 — Phase 4t–4x: typed and explained link relationships (approved;
implementation in progress).** Add one fixed relationship type and one optional shared note to each
ordinary connection while keeping `linkedKeys[]` authoritative for connection existence and
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

## 13. Non-goals

No accounts, no server, no analytics, no multi-user, no native Android build, no cloud sync (yet), no merge-mode import (yet), no file attachments (yet — model reserved), and no content from proprietary dictionaries.

## 14. Deferred decisions — do not solve early

Whether and when to build the Attachment model; cross-device sync; review scheduling beyond Leitner; ~~sense-level annotations;~~ **dictionary-sense attachment or synchronization (personal meaning annotations are now built independently);** importing multiword expressions into the reference layer; merge-mode import; Source, Grammar, or explicit/richer Journal page profiles; passages/reflections or source-identity structures; user-authored page templates; ~~typed relationships;~~ **typed and explained ordinary connections are approved as Phase 4t–4x;** Collection practice history, grading, scoring, or scheduling.

## 15. How to use this brief now

~~Read this brief and `mi-cuaderno.jsx`, then propose, in plain language and before writing any
code: a Phase 0 plan (file layout, dependency list with one-line justifications, deploy setup)
and a Phase 0.5 spike plan (data samples to pull, what you'll verify, what you'll show the
owner). Remember that pages are not in the prototype — plan their minimal UI fresh, matching the
prototype's visual style.~~

**Superseded August 2, 2026.** That was the bootstrap instruction before any application code
existed; Phases 0 and 0.5 are complete. For current work, follow `docs/AGENT-GUIDE.md`: establish
the current phase from `README.md` and its linked report, load the contract and decision history
relevant to the request, inspect the current implementation, and address the owner's approved
scope. The prototype remains a visual reference, not the current application or a work queue.
