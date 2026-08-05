# Phase 4 — live-use polish

**This report is written in dated parts, oldest first**, so the record shows what was known
when rather than being rewritten as the phase went on. Part one is the linking package; part
two is the friction list, which opened afterwards. Figures inside each part are correct as of
its date — the current test count is always the one in the most recent part.

---

# Part one — the linking package (2026-07-31)

Phase 4's core scope was the linking package in `docs/PHASE-4-DIRECTION.md`. Six of its seven
requirements are built, committed and verified; requirement 7 is proposed for deferral, which
the direction file explicitly allows. The friction list was deferred at the owner's direction
at the start of this phase, and is collected in part two below.

## Verdict

**Requirements 1–6 are complete.** `npm test` runs **217 tests** at this point (184 at the end
of Phase 3; 34 new, one moved). `SCHEMA_VERSION` is still **1** — no schema change was needed,
so §5's migration plan and export-first reminder never triggered, exactly as the package was
shaped to ensure. Every decision is in `DECISIONS.md` under the Phase 4a–4e headings.

## What shipped

| Sub-phase | What it does | Requirement |
|---|---|---|
| 4a | `src/lib/links.js` — one pure derivation of both link directions, replacing two | 3 |
| 4b | `src/components/LinkPicker.jsx` — one search box for both layers, replacing the `<select>` and the separate dictionary button | 1 |
| 4c | Quick-create-and-link, plus the project's first component tests | 2 |
| 4d | `LinkCard.jsx`, grouping, and `src/db/linkedEntries.js` — the §5 seam applied to links | 4, 5 |
| 4e | Each screen leads with the group it is for; `DictDetail` shares the cards | 6 |

## The requirements, one by one

| # | Required | Status |
|---|---|---|
| 1 | Autocomplete picker across words, pages and dictionary; type and context shown; already-linked identified | ✅ one box, both layers, "linked ✓" marked rather than hidden. **Matches term, title, translation only** — a test asserts a tag match does not surface |
| 2 | Create-and-link without losing unsaved work | ✅ creates, links, never navigates — pinned by a component test that was confirmed to fail when navigation is reintroduced |
| 3 | Backlinks verified and presented, never stored twice | ✅ verified: stored once, reverse from the `*linkedKeys` index. Two *implementations* existed; now one. Nothing rebuilt |
| 4 | Rich cards: type, term, translation, date, preview, dictionary status; readable on a phone; no tags | ✅ verified at 375 px with no horizontal overflow |
| 5 | Grouping into palabras / páginas / journal entries, fixed order, no sort controls | ✅ a dated page is the journal test (§7); dictionary links join palabras; empty groups unrendered |
| 6 | Every page shows its linked vocabulary; focused related view on item screens | ✅ pages lead with palabras, words and entries lead with páginas |
| 7 | Exact term and title link suggestions | ⏸ **proposed for deferral** — see below |

## Cross-cutting criteria

- **Linking never requires navigating away.** Delivered by requirements 1 and 2 and pinned by a
  test. Verified end to end on a phone viewport: a journal entry with an unsaved draft, a phrase
  created and linked from inside it, and the draft still there afterwards, still unsaved.
- **No "linking mode" on global search.** Not built, deliberately. The picker exists only inside
  detail screens, where "link it to *what*?" already has an answer.
- **No schema change.** Nothing stores a group, an order, a count or a suggestion; all of it is
  derived at render from `linkedKeys` and the event log (§7).

## The one thing that turned out to be broken

Requirement 3 asked me to verify the backlink mechanism rather than rebuild it. Verification
found two things worth reporting:

1. **Two implementations of "both directions".** `Detail` filtered the in-memory items array;
   `relatedItems`/`backlinksFor` did the same job against the database and were called only by
   tests. Both were correct. There is now one (`relatedTo`), and `backlinksFor` remains as the
   indexed reverse lookup that `deleteItem` uses and the Phase 1c tests assert against.

2. **A real §5 hole in linked dictionary keys.** They were resolved with a plain bulk-get that
   silently dropped anything that failed. So a rebuild that *renamed* an entry lost the link
   even though the alias map (§6) knew its new id, and a genuinely dead link vanished with no
   explanation. Attachments have handled this correctly since Phase 2f; links now do too —
   resolve through the alias map, rewrite the key when it answers (no `edit` event: the dataset
   changed, not the owner), and show what nothing could resolve with the choice to forget it
   left to the owner.

## Verified against the running app

Run against the dev server with seeded data and a fixture reference dictionary written directly
into IndexedDB (no 22 MB download needed for these checks):

- **The picker.** "sacar" offers one row, not two — the attached dictionary entry collapses into
  the owner's own item (Phase 2e). "fui" offers *ir*, labelled "form of ir". "take out" finds
  *sacar* from English. "ano" never offers "año". "verbs" offers **nothing at all**, though a
  word is tagged `verbs`.
- **Linking.** The key was stored on the page alone, the target's `linkedKeys` stayed empty, the
  event log gained no `edit`, and the screen never changed.
- **All six link kinds at once**, on one page: two words, a journal entry, a live dictionary
  entry, a renamed key and a dead one. Groups rendered palabras-then-diario with no empty
  páginas heading; the renamed key resolved and was rewritten in IndexedDB; the dead one said so
  quietly and stayed linked until told otherwise; zero `edit` events.
- **The seam, both ways.** *casa*'s dictionary screen shows the page that links it — through the
  rewritten alias key — as the same card, under PÁGINAS.
- **Phone viewport (375 px).** No horizontal overflow; the draft-preservation scenario passes.
- No console errors at any point. `npm run build` is clean (precache 424 KiB).

## Requirement 7 — the deferral I am proposing

Exact term and title suggestions while editing is the package's largest single piece of new
logic: match detection over a page body, longer-phrase preference, common-term noise
suppression, and an approval interface — and the direction file sequences it last precisely so
everything else can ship without it.

My recommendation is to **use requirements 1–6 for a stretch of real days first**, then decide
requirement 7 together with the friction list. Two reasons: the picker may already have removed
most of the friction that suggestions were meant to address, and the friction list is the better
evidence for what "noise suppression" needs to mean for this notebook specifically. If it is
built later, approved suggestions go through the same `linkItems` call and inherit "no `edit`
event" by construction.

## What you need to do

**Use it.** Link a few things the way you actually would — from a journal entry mid-sentence,
from a grammar page to the verbs it is about — and see whether the picker finds what you mean
on the first or second keystroke.

**Watch the groups.** They are fixed, with no controls, on the theory that a list of five links
does not need sorting. If a page ever accumulates enough links that the order stops helping,
that is friction worth writing down.

**Then the friction list.** It is the one input this phase deliberately went without, and it
decides both requirement 7 and whatever Phase 4 does next. *(It opened the next day — part two.)*

---

# Part two — the friction list opens (2026-08-01)

The owner used the app and reported the first three friction items. Two of the three were not
about linking at all, which is itself the most useful thing the list said: the picker appears to
have absorbed the friction requirement 7 was aimed at, and what remains is about capturing
meaning and organising vocabulary.

All three are built, in `4f`–`4h`. `npm test` runs **240 tests**. Still no schema change —
`SCHEMA_VERSION` is 1, and §5 has still never triggered in this project.

| # | The friction | What shipped |
|---|---|---|
| 1 | The word/phrase toggle had no effect on the list — everything landed under *palabras* | **4g** — four tabs: todo / palabras / frases / páginas |
| 2 | A phrase's meaning could only be one running line | **4h** — meanings can hold several lines |
| 3 | Typing a tag gave no hint that a similar one already existed | **4f** — suggestions from the tags already in use |

### What each one turned on

**4f — tag suggestions.** The fix that matters is not the autocomplete, it is that matching goes
through the shared `normalize()` and is therefore **case- and accent-insensitive**. `cleanTags`
dedupes exact strings only, so `expression`, `Expression` and `expresión` genuinely are three
tags today; typing any spelling now surfaces the one already in use. It only ever *suggests* —
what gets stored is exactly what was typed or tapped, because silently rewriting the owner's
spelling is the kind of helpfulness that annoys the third time. One `TagInput` now serves both
the detail screen and the add sheet, retiring the comma-separated field.

**4g — palabras and frases.** Worth being clear that this is **not a third content type**, which
§7 would require a brief amendment for. `form: word | phrase` has been a locked field since
Phase 1b and is already shown as *loc.*; only the filter ignored it. Three things came with it:
dictionary results are suppressed under *frases* (the bundled dictionary is lemma-focused, §1, so
the tab would fill with single words — the same rule Phase 2e applied to *páginas*); the header
count splits three ways, since one "palabras" total quietly including phrases stops being true
the moment they separate; and the add sheet's toggle now follows the term until touched, matching
what quick-create already inferred.

**4h — multi-line meanings.** The important decision here was what *not* to build. A structured
`translations[]` array would have been the project's first schema change, triggering §5 in full,
and edges into the sense-level annotations §7 defers. `translation` was always a plain string, so
newlines already survived storage, backup and import — the only blocker was `<input>`, which
cannot hold a line break. Rendering follows what each screen is for: full on the detail screen
and the review card, clamped to two lines in lists, flattened in the picker. Search flattens
whitespace at that one comparison, never in `normalize()`, which the pipeline imports and which
decides what the shipped dictionary matches.

### Verified

At 375 px, with seeded data and a fixture dictionary: four filter chips fit one row with no
horizontal overflow; each tab shows only what belongs to it; searching "casa" under *frases*
returns nothing where *palabras* returns the dictionary entry; typing "EXPRESION" surfaces the
existing "expresión" and tapping it stores that spelling; a three-line meaning renders in full on
the detail and review screens (72 px and unclipped) and clamps to two lines in the list. No
console errors; production build clean.

### Requirement 7 — still parked

Nothing on the friction list asked for link suggestions, and two of the three items pointed
elsewhere. It stays parked until the list asks for it.

### What happens next

The friction list is a **standing input, not a one-off** — brief §12 calls it "a running list…
collected while using the app daily", and this batch is the first round rather than the whole of
it. Keep using the app; when a few more real items accumulate, they become the next batch,
planned and shipped as their own small sub-phases exactly as `4f`–`4h` were.

There is no need to wait for a "complete" list. Three real items produced three shipped fixes in
an afternoon, and a short list of things that actually annoyed you is worth more than a long one
imagined in advance. A later round decides what remains of Phase 4 — including whether
requirement 7 is ever worth building — and may well open a phase not yet written down.

---

## Where things are

- At the 4a–4e closeout, `src/lib/links.js` held `relatedTo`, `relatedToKey`, `pickerMatches`,
  `groupRelated`, and `GROUPS`. Phase 4t–4x retired the unused bare-key and kind-grouping exports;
  the module now owns only `relatedTo` and `pickerMatches`, while current grouping lives in
  `src/lib/relationships.js`.
- `src/db/linkedEntries.js` — the §5 seam for linked `dict:` keys (alias rewrite, orphans).
- `src/components/LinkPicker.jsx` — the picker and quick-create.
- `src/components/LinkCard.jsx` — `ItemLinkCard`, `EntryLinkCard`, `OrphanLinkCard`.
- `src/components/Detail.test.jsx` — the first component tests; jsdom is opt-in per file.
- `src/lib/tags.js` + `src/components/TagInput.jsx` — the tag vocabulary and the one control
  that enters tags anywhere.
- `src/lib/filters.js` — the four-way type filter and the rule for when dictionary results
  belong in the list.

---

# Part three — concurrent-phase status (2026-08-02)

Phase 4 remains open as a friction-driven maintenance stream; 4a–4h are complete. Requirement 7
remains deliberately deferred: it was optional in the direction, the shipped picker absorbed the
friction it targeted, and the owner's first live-use list pointed elsewhere. It is a candidate for
real-use friction to reactivate, not current planned work.

Organizational improvements proceed separately as active Phase 5; the AI assistant moves to
Phase 6. Phase 4 and Phase 5 may remain open together because their boundaries are explicit under
the brief's concurrent-work amendment. Overlapping files or behaviours are sequenced. See
`docs/PHASE-5-DIRECTION.md` for the Phase 5 sequence.

**Subsequent closeout, 2026-08-02.** Phase 5 completed through 5f and deployed from `main` at
`079e0fb`. Phase 4 remains open only for observed live-use friction; the earlier “active Phase 5”
status above is retained as a dated record rather than rewritten.

---

# Part four — Phase 4i: structured personal meaning blocks (2026-08-02)

## Status

**Complete and verified.** The automated suite, production build and seeded 375 px in-app browser
acceptance all pass. Codex cannot access the owner's real Chrome data and did not inspect or alter
it; the browser pass used a disposable fixture in the in-app browser's separate profile.

## What changed

- `SCHEMA_VERSION` moved from 1 to 2. The Dexie upgrade converts every trimmed nonblank line of a
  lexical `translation` into an ordered personal meaning, preserves bullets/numbers and punctuation,
  leaves entry notes/examples general, removes only `translation`, and does not touch timestamps,
  pages, links, events or preferences.
- Startup checks the IndexedDB version before rendering the app. A schema-v1 notebook is opened
  through an isolated v1 connection, validated and offered as an untouched JSON download; the owner
  must acknowledge saving it before the v2 Dexie connection is allowed to open.
- Backup validation now understands exactly schemas 1 and 2 and deeply validates structured
  meanings. V1 files upgrade and revalidate in memory before preview/import. Replace-and-restore
  still validates everything first and now pauses after downloading the current validated safety
  backup for explicit confirmation.
- Each personal meaning has `meaning:<uuid>`, English gloss, optional Spanish usage cue, regions,
  fixed usage labels, optional POS override, verb behavior, note and examples. IDs never reference
  dictionary senses. Dictionary addition copies only the first gloss into an independent meaning.
- Detail reading shows all glosses and cues, with context collapsed. One meaning can be edited at a
  time. Organize meanings keeps a local draft for add, arrow reorder, neighboring merge and delete;
  one Save creates one item update/edit event, while Cancel writes nothing. Delete can preserve its
  note/examples at entry level. General and meaning examples can be reassigned.
- Search keeps glosses at tier 4; cues, labels, notes and nested examples participate in tier 6.
  Missing-meaning and missing-example views understand the nested shape. Cards and LinkPicker use
  compact gloss summaries. The shared ñ-preserving normalizer is unchanged.
- Repaso remains entry-level: reveal shows every gloss/cue together, optional meaning context stays
  collapsed, and grading continues to write the lexical item ID only.

## Automated verification

- `npm.cmd test`: **322 passing tests across 33 files**.
- `npm.cmd run build`: clean production build; PWA precache **462.73 KiB**.
- A real fake-IndexedDB Dexie v1→v2 upgrade test proves lexical conversion while pages, events,
  preferences and timestamps remain unchanged.
- Backup tests cover v2 round-trip, v1 in-memory conversion, CRLF/blank lines, marker/punctuation
  preservation, stable personal IDs, nested validation and duplicate meaning IDs.
- Component tests cover creation with zero/multiple meanings, collapsed reading, one-meaning edit,
  organizer Cancel/Save, reorder, merge, delete-preserve, all-meaning Repaso reveal and entry-level
  grading.
- Deliberate failure proof temporarily truncated multiline migration, graded a meaning ID, and made
  organizer Cancel write. Four targeted tests failed for those breaks; after restoration all 11
  targeted tests and the full suite passed.

## Browser acceptance

Verified in the in-app browser at **375 × 812 px** with a disposable schema-v1 `sacar` fixture in
its separate profile. This did not use or expose the owner's real browser data.

- Startup stopped at the export-first gate while IndexedDB remained at Dexie schema v1 (raw
  IndexedDB version 10). The downloaded, parsed recovery file was a valid schema-v1 envelope with
  the untouched three-line `translation`, no `meanings`, all three seeded events and the seeded
  preference. Only after the explicit saved-file acknowledgement did IndexedDB advance to schema
  v2 (raw version 20).
- The migrated row retained its item ID, timestamps, entry note, general example, events and
  preference; removed `translation`; and produced three ordered, independent `meaning:<uuid>`
  records with the exact nonblank source lines.
- Reading displayed every gloss and cue with context collapsed. Editing saved a cue, labels, POS
  override, verb behavior, note and bilingual example. The organizer then reordered, merged and
  deleted meanings through its local draft and one explicit Save.
- Searching a nested example (`mochila`) returned the item as an examples match; searching a gloss
  (`withdraw`) returned it as an English-meaning match. Missing-examples correctly excluded the
  item after its meaning example was saved, while No-links included it.
- Repaso enrolled the lexical entry from three distinct lookup days, kept meaning context behind
  its disclosure, and wrote the review event against `user:sacar-fixture` with grade 2 — never
  against a meaning ID.
- A parsed schema-v2 export contained the surviving personal meaning and all nested fields. Import
  validation showed the correct preview, required and downloaded a valid `before-import` safety
  backup, restored one item and seven events, and preserved the meaning ID and entry-level review
  key in the restored IndexedDB row.
- List, detail, expanded context, editor, organizer and settings states all had equal document
  `scrollWidth` and `clientWidth` (375 px without a scrollbar, 360 px where the vertical scrollbar
  occupied the remaining 15 px). The browser console returned **no warnings or errors**.

The disposable database was removed afterwards, the temporary viewport override was reset, and the
test tab and development server were closed.

## Deployment closeout

Commit `7b25b01` was fast-forwarded to `main` and deployed successfully by GitHub Pages workflow
[30783910196](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/30783910196). A production
smoke test at the public site used a **375 × 812 px** viewport in the in-app browser's separate
profile: the app loaded normally, Ajustes reported **data schema v2**, document `scrollWidth`
equaled `clientWidth`, and the console returned no warnings or errors.

---

# Part five — Phase 4j–4o: persistent page profiles and Vocabulary Collections (2026-08-03)

## Status

**Complete, deployed, and production-verified.** The schema, domain, creation, Collection
Read/Add/Organize/Practice interfaces, placements, retrieval filters, pins, migration/import safety,
and General-page compatibility are integrated. The final serial suite, production build,
deliberate failure proofs, disposable acceptance flow, deployment workflow, and production
375×812 smoke test all pass.

## Release boundary

The personal layer still has exactly two top-level types: lexical items and pages. Pages now store
only two profiles, `general | collection`. Collection is the first specialized profile; General
preserves the old page behavior, and a dated General page remains a derived Journal entry.
Collection wins over a date. Source, Grammar, richer Journal, custom profiles, and user-authored
templates are not part of this release.

Every page stores dormant Collection layout so switching profile never destroys organization. A
group has `page-group:<uuid>`, a Unicode-normalized case-insensitively unique nonblank name, and
ordered personal lexical `itemKeys`. `linkedKeys[]` remains the sole relationship and membership
authority; groups only arrange outgoing personal lexical members.

## What changed

| Sub-phase | Implemented |
|---|---|
| 4j — contract and durability | Schema v3 with unchanged Dexie stores/indexes; v2→v3 page migration and direct sequential v1→v3; untouched export-first gate for v1/v2; backup schemas 1/2/3 upgrade and deep v3 validation |
| 4k — domain and General parity | Effective General/Collection/Journal derivation; group, membership, ordering, placement, pin, profile, transaction and cleanup helpers; page rendering delegated without changing App's detail trail or scroll ownership |
| 4l — creation and reading | Five creation starting points; editable group seeds with no stored template ID; Collection Read mode, overview, ordered/empty groups, independent card expansion, Related separation, lexical placement backlinks, and reversible profile conversion |
| 4m — vocabulary capture | Dedicated personal/dictionary lexical search, query-persistent multi-selection tray, disabled existing members, incoming-edge promotion, dictionary materialization/reuse, staged quick-create, and one atomic final Add |
| 4n — organization | Deep local draft; add/rename/reorder/delete groups; item up/down and Move to; populated-group deletion to Not grouped; membership removal without lexical deletion; explicit Save/Cancel and no-op detection |
| 4o — practice and retrieval | Ordered reveal-only Practice with missing-meaning prompts and no history; Pages-only profile filters; stable preference-backed pin partition while browsing; Collection card summaries and page/detail pin controls |

## Relationship, order, and event behavior

- Outgoing page→personal-lexical links are Collection members. Incoming lexical backlinks, page
  links, and dictionary links remain Related. Selecting an incoming lexical item moves the single
  stored edge; selecting a dictionary row creates or reuses a personal lexical entry first.
- Saved group order and item order drive Read and Practice. Not grouped yet derives from member
  links absent from groups. Organizer Save can reorder those member slots while preserving
  nonmember link order. Unlink and delete prune active or dormant layout references.
- New pages and newly materialized lexical rows keep their existing `create` events. Profile
  changes and changed Organizer saves write one page `edit`. Migration, pins, expansion, mode
  changes, Practice, ordinary member add/remove, Cancel, and no-op Save write no events.
- Pins live in the backed-up `pinnedPageIds` preference. They do not touch page timestamps, affect
  only empty-query Pages browsing, preserve the selected order within pinned/unpinned partitions,
  and never boost search relevance.

## Verification status

- `npm.cmd test -- --maxWorkers=1` passed **393/393 tests across 39 files**. Focused schema,
  migration, backup, Collection-domain and component suites also passed throughout implementation.
- `npm.cmd run build` passed after the final source change; the generated PWA precache contains 13
  entries (about 520 KiB).
- Real fake-IndexedDB tests cover v2→v3 and direct sequential v1→v3 upgrades, untouched
  export-first gating for both legacy schemas, schema 1/2/3 backup upgrades, deep v3 rejection,
  group/member ordering, alias-aware dictionary reuse, pins, cleanup and exact event behavior.
- Deliberate red/green failure proof was demonstrated for the v2 export-first gate, backup group
  order, unlink/delete layout cleanup, and Practice event suppression. Each altered behavior made
  its focused test fail, and each test passed again after restoring the implementation.
- In the in-app browser's separate data profile, a **375×812** pass began at a real schema-v1 gate,
  requested its untouched backup, upgraded to v3, and preserved the existing notebook. Automated
  coverage independently exercises the approved schema-v2 “Thinking and opinions” migration
  fixture.
- The browser pass created “Thinking and opinions” from the Conversational function starter,
  edited its groups, staged two quick-created phrases across different searches, committed them
  together, kept multiple cards expanded, moved and renamed groups in Organizer, revealed one
  Practice answer independently, and verified pins, page-profile filtering and lexical Collection
  placements.
- Profile conversion Collection→General→Collection restored dormant group names, order and
  placements. A schema-v3 safety import then replaced the disposable notebook and restored a
  pinned two-group Collection in saved order, including an orphan dictionary link shown as Related.
- The phone-width document and body widths matched the viewport content width (360 px after the
  browser's scrollbar allowance), touch controls remained usable, and a clean final tab reported
  **no console warnings or errors**. The pass also caught and fixed an older dictionary-metadata
  count assumption in Settings and removed an unnecessary Show-more control from short overviews.

## Deployment closeout

Feature head `df8a454` was fast-forwarded to `main` and deployed successfully by GitHub Pages
workflow [30859248672](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/30859248672).
The workflow's clean install, production build, artifact upload and Pages deployment all passed.

The production smoke test used the in-app browser's separate empty profile at **375×812**; it did
not inspect or alter the owner's real browser data. Because that profile still held the prior v2
service worker, its first request rendered the previous cached shell. One reload activated the
newly deployed asset, which correctly stopped at the untouched-backup gate and identified
**personal data schema 2 → 3**. After the disposable empty notebook requested its backup and
continued, Ajustes reported **data schema v3**. The document and body widths matched the 360 px
content width within the 375 px viewport, and the console reported **no warnings or errors**.

## Explicitly deferred

Source, Grammar, explicit/richer Journal and custom page profiles; source/passage/reflection
submodels; source identity and provenance; user-authored templates; typed relationships; practice
history, grading, scoring, scheduling or Repaso integration; and AI assistance remain future work.

---

# Part six — Phase 4p: Diario foundation (2026-08-03)

The owner approved the migration-free Diario workspace recorded in
`docs/PHASE-4-JOURNAL-DIRECTION.md`. Its first slice is complete; 4q–4s remain in progress.

## What changed

- Diario is a fourth primary tab between Cuaderno and Repaso. Dated General pages are canonical
  there; dated Collections remain in Cuaderno.
- Ordinary Cuaderno browsing, its Pages profile control, contextual tags and header page total no
  longer include journals. A typed whole-notebook query still finds them and opens them in Diario.
- App now owns one session route trail across surfaces. Cuaderno remains mounted during a linked
  journal visit, so Back returns to the same local query and filters; manual tab changes still begin
  that tab at its root.
- General-page creation no longer offers a date or journal copy. Diario is the single new-entry
  path, while existing dated pages require no migration or rewrite.
- The pure `isJournalEntry` boundary centralizes the dated-General rule for every surface.

## Verification at this slice

- The focused domain, App, Cuaderno and Add Sheet suites pass **21/21 tests across four files**.
  Coverage includes dated-Collection exclusion, tab order, adjusted page totals, hidden browse,
  intentional search, and Cuaderno-search → Diario → Back state continuity.
- `npm.cmd run build` passes; the generated PWA precache contains 13 entries (about 523 KiB).
- Schema remains v3 and no item, event, preference, backup or reference-data shape changed.

## 4q follow-up — home, retrieval and memory

The second Diario slice is complete. Its home leads with a stable Today action, permits another
same-day moment, offers the latest distinct entry as Continue, and presents current-year writing as
a newest-first timeline. Earlier years stay behind Archive rather than lengthening the everyday
screen.

Journal-only search covers title, body and tags through the shared ñ-preserving normalizer but does
not use Cuaderno's `SearchBar`, so an empty memory search cannot create a vocabulary `search_miss`.
Around this time shows at most one closest ±7-day memory from the most recent prior year containing
a candidate; its month/day distance also works across December/January.

The home and pure-domain focused suites, together with App navigation coverage, pass **14/14 tests
across three files**. Schema and stored shapes remain unchanged.

## 4r follow-up — focused autosave and prompts

The explicit interim Save action has been replaced by a focused editor with required date, optional
title, a large body surface and visible autosave status. A new draft remains entirely in React until
its body becomes nonblank. Its first persistence writes the normal page plus one `create`; later
autosaves in that same mounted visit write no `edit`. An existing entry's first changed autosave
writes one `edit`, and every later autosave in the visit suppresses another. Back awaits a pending
valid save, while an unmount flush cannot pull navigation back from a tab the owner already chose.

The 24 optional bilingual prompts are evenly divided among Notice, Reflect, Spanish and Grow. A
selection is shown beside the body for the current visit only: neither its ID nor its text enters the
stored page unless the owner independently writes it.

The prompt, editor and App integration suites pass **15/15 tests across three files**, and the
production build passes with a 13-entry PWA precache (about 542 KiB). A deliberate failure proof
changed the edit guard to log every autosave; the focused test failed with three edit events instead
of one, then passed after the guard was restored.

## 4s follow-up — reading, connections and Más

The journal reader now leads with the entry's calendar date, optional title and whitespace-preserved
body. Personal vocabulary and existing dictionary links follow, then a chronological list of linked
journal moments. Edit opens the focused autosave visit; Reflect opens a separate current-day draft
with one ordinary link back and an ephemeral bilingual prompt.

The journal vocabulary picker searches only personal words and phrases. Existing direct dictionary
links still resolve through the installed dataset's alias map, and an unresolved key is reported
rather than dropped. Más contains tags, validated media links, nonjournal page relations, derived
activity, event-derived tricky state, two-step delete and a confirmed Move to Pages. The latter
clears only the date; canonical routing moves the same page to Cuaderno and leaves Diario as Back.
There is no pin or direct Vocabulary Collection action in Diario.

The complete focused journal boundary—domain, prompts, home, editor, reader, App navigation,
Cuaderno separation and Add Sheet—passes **45/45 tests across eight files**. The production build
passes with a 13-entry PWA precache (about 555 KiB). Schema remains v3 and no personal/reference
store, index, backup, item or preference shape changed.

## Diario closeout verification

- `npm.cmd test -- --maxWorkers=1` passes **422/422 tests across 44 files**. The journal-focused
  boundary passes 46 tests after adding the browser-found StrictMode case.
- `npm.cmd run build` passes after the final source change; the generated PWA precache contains 13
  entries (about 555 KiB).
- A disposable in-app-browser profile at **375×812** verified title-only abandonment, prompt-assisted
  creation, visible autosave, clean reading, personal-vocabulary linking, journal→phrase→Back,
  separate linked reflection, tags, nonjournal page relations, Move to Pages, adjusted page totals,
  journal-only search, intentional Cuaderno search and exact search-origin Back continuity.
- That browser pass caught one real development-mode defect: StrictMode's effect replay left the
  editor's mounted ref false, so the write completed but status stayed at Saving and route
  materialization was skipped. Effect setup now restores the flag; the new StrictMode component
  test fails without that line and passes with it. The browser then reached **Saved** normally.
- At the ordinary phone screen, document/body scroll width exactly matched 375 px. On the long Más
  screen, its 360 px scrollbar-adjusted client width exactly matched scroll width. The full-page
  tools layout remained usable and the console contained **no warnings or errors**.
- Browser work used only disposable fixture data in Codex's separate profile; it did not inspect or
  change the owner's real browser notebook. No push or production deployment was performed.

## Diario post-review autosave hardening

A follow-up review found one additional data-loss path: after clearing the required date, autosave
and Back correctly refused to proceed, but the always-visible tab bar replaced the editor route.
The unmount flush also required a date, so it discarded every title/body change since the last save.

The editor now remembers the most recently selected nonblank date during the visit. Only its quiet
unmount flush uses that fallback when the visible field is blank; normal autosave remains paused and
explicit Back still asks for a date. A full-App regression test selects a new valid date, clears it,
types more text, switches to Cuaderno, and verifies that both the writing and the latest valid date
reach IndexedDB. The test failed against the original guard and passes after the fix.

The same verification run exposed a pre-existing race in the journal deletion test: it observed the
row disappearing before the async click handler called Back. The assertion now waits for that
handler completion signal before checking the committed deletion. The complete serial suite passes
**423/423 tests across 44 files**, and the production build passes with a 13-entry PWA precache
(about 555 KiB). A fresh browser rerun was attempted, but the local browser-control kernel could not
initialize; no new browser result is claimed for this follow-up.

## Diario production deployment

The seven journal commits from 4p through the post-review autosave fix were pushed to `main` on
2026-08-03. GitHub Actions run 30873311990 completed both its clean Node 24 build and GitHub Pages
deployment successfully. The Pages deployment record identifies the journal release commit
`820897d`, and the public application returned HTTP 200 with its app root after publication.

This deployment changes no schema or personal data. The production interaction check is limited to
the deployment record and live response because the browser-control kernel remained unavailable;
the earlier disposable 375×812 local closeout and the full-App tab-exit regression remain the
user-flow evidence for this release.

## Phase 4t–4x — typed and explained link relationships

Phase 4t–4x adds one fixed relationship type and one optional shared note to every ordinary
connection through schema v4. Mandatory sparse `linkAnnotations[]` describe existing edges while
`linkedKeys[]` remains authoritative for connection existence and Collection membership. Existing
unannotated edges therefore derive as Related without dense backfill, and the v3→v4 migration adds
only an empty annotation array to every item.

The relationship domain centralizes the seven-type order, directional inverse labels, perspective
conversion, sparse normalization and mixed-target grouping. Owners can create or edit a connection
from either personal endpoint without creating reciprocal storage; metadata-only edits change
neither timestamps nor activity. Explicit unlink and item deletion clean all physical legacy copies
and their annotations. Collection promotion carries relationship metadata with the edge and flips
directional subjects when physical ownership reverses.

Dictionary alias rewrites now carry annotations when unambiguous. Conflicting explicit alias and
canonical values remain lossless and exportable until the owner chooses or edits the survivor;
installed orphans retain their type and note. Dictionary attachment remains separate from an
ordinary typed dictionary connection.

The shared phone-first UI calls ordinary links Connections, offers the relationship selector during
linking, groups mixed personal and dictionary targets by relationship, and provides bounded notes
plus inline editing and removal from personal cards. Collection membership, Diario's established
sections, and dictionary attachments remain separate; their ordinary connections gain the same
grouping while dictionary detail stays read-only.

That relationship-first grouping intentionally supersedes Phase 4d–4e's kind-first headings on
standard Detail and Collection Connection lists. Existing unannotated connections therefore appear
together under Related rather than being split into palabras, páginas, and diario. Diario retains
its task-specific sections and groups by relationship within each; the difference is deliberate,
not two screens implementing the same rule differently.

A final independent integration review hardened the seams before closeout. Resolver-provided
metadata now survives the render between an alias rewrite and the parent's refreshed item props;
the mutation API blocks canonical or alternate-alias duplicates even over an unresolved conflict;
dictionary detail shows both conflicting values without editing either; Collection removal cleans
reciprocal legacy copies; and Diario retains its body-first moment headings and human-readable
dates while acknowledging dictionary connections that still need resolution.

A post-implementation review then clarified and hardened four more edges. Relationship-first mixed
grouping is now explicit as the standard Detail/Collection contract, and the unreachable
`relatedToKey`, `groupRelated`, and `GROUPS` implementation and tests were retired. Physical-edge
candidate discovery deduplicates a preserved legacy self-link before an annotation save; the alias
resolver treats a dictionary disappearing during Save as an inline failure without discarding the
owner's draft; and dictionary-resolution effects now depend explicitly on `linkAnnotations` so a
relationship-only edit refreshes their rows.

### Phase 4t–4x verification

- `npm.cmd test -- --no-file-parallelism` passes **493/493 tests across 49 files**.
- `npm.cmd run build` passes with a 13-entry PWA precache (about 579 KiB).
- Deliberate red/green proofs covered an inverse-label break, a missing mandatory v4 annotation
  array, reciprocal creation during reverse editing, a missing Collection subject flip, an alias
  rewrite that stranded its annotation, rejection of an unresolved alias conflict during backup
  round-trip, stale annotation cleanup in `deleteItem`, and quick-create navigation. Each targeted
  test failed with the defect and passed after restoration.
- Review-follow-up red/green proofs additionally covered editing a preserved legacy self-link only
  once and refreshing dictionary rows when `linkAnnotations` changes while `linkedKeys` retains
  the same identity.
- A disposable schema-v3 fixture at **375×812** was attempted, but Codex's in-app browser-control
  kernel failed before fixture setup with `failed to write kernel assets: The system cannot find the
  path specified`. No phone-layout, console, or export→wipe→import browser result is claimed for this
  phase. The failure did not touch the owner's real browser data.
- `main` was fast-forwarded and pushed at `eb93c90`. GitHub Pages
  [workflow run 30949552774](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/30949552774)
  completed both build and deploy jobs successfully, and the live site returned HTTP 200 with the
  verified build's `index-BhBJ0bH7.js` asset.

The implementation, automated/build acceptance, and production deployment are complete. The
brief's disposable browser condition remains open until the browser-control runtime can initialize.

---

## Phase 4y — Add to Collection from a word or phrase

### Observed problem and boundary

The owner could add vocabulary while viewing a Collection and could see existing Collection
placements from a lexical detail, but could not create membership from the word or phrase itself.
Phase 4y adds that reverse capture path for active Vocabulary Collections only. General and Diario
pages remain ordinary Connections; creating Collections, multi-Collection saves, and moving or
removing placements from the lexical screen remain outside this slice.

### Implemented behavior

- A lexical detail derives active nonmember Collections in deterministic title order and shows
  **Add to Collection** alongside existing placement cards.
- One available destination is selected automatically; several require a choice. Not grouped yet
  is the default, followed by named groups in their saved order. Save remains on the entry, while
  existing placement cards continue to navigate without exposing move/remove controls.
- The flow reuses `commitCollectionAdd` as the sole membership writer. An older lexical→Collection
  link is promoted atomically to page-owned membership, with directional annotation reorientation
  and dormant metadata preservation unchanged.
- Active Collections are excluded from a lexical entry's generic Connections picker so new
  membership cannot accidentally become an incoming ordinary link. General and Diario pages are
  unaffected.
- Deleted groups, profile changes, and deleted Collections fail inline, retain the form choices,
  and leave no partial write. Schema v4, stores, indexes, backups, timestamps, and event rules are
  unchanged.

### Verification

- The destination-helper test was observed red before implementation and green after restoration;
  the first reverse-assignment component test followed the same deliberate red/green proof.
- Focused Collection domain/detail suites pass **59/59 tests across four files**.
- `npm.cmd test -- --no-file-parallelism` passes **501/501 tests across 49 files**.
- `npm.cmd run build` passes with a 13-entry PWA precache (about 582 KiB).
- The disposable 375×812 attempt remains unclaimed because the browser-control connection again
  failed before fixture setup with `failed to write kernel assets: The system cannot find the path
  specified`. No owner browser data was inspected or changed.
- No push or deployment was performed.

### Deployment closeout

The owner subsequently approved publishing Phase 4y. `main` was fast-forwarded to `c716e9d` and
pushed. GitHub Pages workflow run 30955868049 completed both build and deploy jobs successfully,
and the public site returned HTTP 200 while referencing the verified `index-BpNcWMY7.js` asset.
The disposable 375×812 browser check remains the only pending Phase 4y verification item.

---

## Phase 4z — dedicated Pages hub

### Observed problem and boundary

Phase 7 supplied composable page roles, contextual retrieval, pinning and family-first creation, but
Pages still appeared inside Cuaderno's general-purpose filter/control grid. The owner requested the
focused page-library mockup as a real hub. This slice changes presentation and session navigation
only: schema v5, page records, search normalization, event rules, backup shapes and the four-tab
information architecture remain unchanged.

### Implemented behavior

- Tapping **páginas** pushes one session-only Pages route with a focused **‹ Cuaderno / Pages / +**
  header. Cuaderno and the hub stay mounted across hub/detail traversal, detail Back returns to
  Pages, and the existing bottom tabs still reset to their normal surface homes.
- The hub exposes overlapping All, Sources, Grammar, Collections and Notes chips. Diario entries
  stay outside both hub browsing and contextual hub search; intentional global Cuaderno search
  remains unchanged.
- Empty-query browsing separates matching pinned cards without duplicating them. Search produces
  one relevance-ordered list where pins provide no boost. App owns the existing preference-backed
  pin state so hub, global-card and detail controls update together.
- Search expands on demand and reuses active Source/Grammar and contained-vocabulary retrieval.
  **Refine** progressively reveals All pages/No connections, browse order and contextual tags, with
  an active-filter count when the panel is closed. No-connections derivation still examines the
  complete notebook before selecting Pages, so incoming lexical links count.
- Hub cards show focus first, all active roles and only stored facts: Source format/creator/captures,
  Grammar sections/examples, Vocabulary items/groups, tags and Notes excerpts. Recipe names remain
  transient. The header plus button opens the existing family-first gallery directly.

### Verification

- Focused PageHub tests pass **4/4**; the combined App, Cuaderno and PageHub component snapshot
  passes **24/24**.
- A deliberate route break changed the hub destination back to Cuaderno list; the focused App test
  failed because **Your pages** never appeared, then passed after the Pages route was restored.
- `npm.cmd test -- --no-file-parallelism` passes **596/596 tests across 59 files** in 212.89s on
  the final touch-target code.
- `npm.cmd run build` passes after processing 1,865 modules with a 13-entry PWA precache of about
  689 KiB, and `git diff --check` passes.
- A disposable fixture created through the visible UI at **375×812** verified focused-header
  replacement, overlapping roles, 44px role-filter targets, pinned/all separation, Grammar search
  in relevance mode, progressive Refine controls, detail return, and no horizontal overflow,
  console warnings or console errors. No owner browser data was inspected or changed.
- No deployment was performed.
