# Phase 19 — Page organization and formatting (report)

The Grammar first release and Structured Notes increment were implemented, verified and deployed
2026-08-10. The complete contract and boundaries remain in
[PHASE-19-DIRECTION.md](PHASE-19-DIRECTION.md), and durable choices are recorded in
`DECISIONS.md` under Phase 19.

## What changed

| Piece | Result |
|---|---|
| Formatted Overview | Grammar section `explanation` remains one string but is now edited as Overview with the notebook's safe Markdown controls. Visible-text search ignores Markdown punctuation |
| Note callout | Grammar Overview blockquotes render as pale, visibly labeled and accessible `role="note"` panels. Ordinary page and lexical blockquotes are unchanged |
| Schema v6 | Every Grammar section now carries `parentId: null | grammar-section:<uuid>`. Existing sections migrate to roots without changing section/example IDs, content, order or references |
| One-level hierarchy | Roots can add subsections; grandchildren, dangling/cross-page parents, cycles and sibling-name collisions are rejected. Root-owned children store in canonical depth-first order |
| Organizer | The existing organizer renames and reorders siblings, promotes/reparents subsections, moves examples to roots or children and blocks invalid parent/deletion operations atomically |
| Phone presentation | Top-level cards stay on a continuous guide spine; children are lightweight nodes with independent disclosure rather than nested cards. A collapsed parent hides its full subtree |
| Page workflows | Starters name subsections, copy-structure remaps every child to fresh copied IDs, counts distinguish roots/children/examples, and contextual targets use `Parent › Child` breadcrumbs |
| Discoverability | A named but otherwise empty starter or copied guide reports its section/subsection counts instead of saying `Empty`; zero count categories are omitted consistently |

## Contracts preserved

- The personal layer still has only lexical entries and Pages. `linkedKeys[]` remains the sole
  authority for Page vocabulary and exact Source-capture references keep their existing shape.
- The hierarchy is exactly one level. There is no general block editor, recursive tree, custom
  Page-kind builder, stored template identity, new event, preference or dictionary dependency.
- Key idea, Pattern and every example field remain plain text. Raw HTML, code, images, tables and
  clickable Markdown links remain unsupported.
- Changed explicit saves write one ordinary Page `edit`; Cancel, no-op organization and automatic
  referential cleanup remain event-free.
- Backup remains the migration boundary. Schemas 1–6 validate deeply, older envelopes upgrade one
  step at a time, and a database below v6 cannot open before its untouched source-schema backup is
  requested and acknowledged.

## Delivery and deliberate failure proofs

The implementation followed the direction in eight implementation commits:

1. `4918e4e` — start Phase 19 page organization.
2. `ce33837` — add formatted Grammar overviews.
3. `e17c344` — style Grammar note callouts.
4. `8aed239` — migrate Grammar sections to schema v6.
5. `db1098b` — add Grammar subsection organization.
6. `87d1aa0` — style the Grammar guide hierarchy.
7. `d12b4d0` — carry Grammar hierarchy across Page workflows.
8. `4f36a4c` — expose empty Grammar guide structure counts.

Four deliberate red/green proofs were observed before restoration:

- Replacing the visible-text Overview projection with raw Markdown made the formatted-search test
  fail; restoring the projection returned the expected visible prose match.
- Removing v5→v6 `parentId: null` injection made the migration tests fail; restoring the pure clone
  and injection returned valid v6 Pages without contaminating the v5 recovery envelope.
- Removing canonical subsection insertion placed a new child after the next root and failed the
  ordering test; restoring depth-first canonicalization put it after its existing siblings.
- Flattening copied `parentId` values made the copy-hierarchy test fail; restoring the two-pass
  fresh-ID remap preserved the child beneath its fresh copied parent.

## Complete automated verification

- Complete serial suite: **1,145/1,145 tests across 99 files** (`npm.cmd test`, 288.00 s).
- Production build: passed (`vite build`, 2,083 modules transformed; PWA generated).
- `git diff --check`: passed.
- Migration, backup and pre-open gate suites cover every database source version 1–5, backup
  schemas 1–6, deep hierarchy validation, exact v6 round-trips and newer-version rejection.
- Focused component/database coverage pins formatted search, accessible callouts, sibling
  uniqueness, canonical mutations, deletion guards, starter/copy behavior, counts and breadcrumbs.

Vite retains its advisory that the main app chunk is over 500 kB after minification. It does not
fail the build, and Phase 19 did not broaden into a code-splitting change.

## Browser closeout

A fresh disposable origin on port 4190 was fixed at 375×812. Through the visible UI it created an
Indicative-versus-Subjunctive comparison guide, formatted an Overview, exercised the Note control,
added a `Speech (S)` child and example, reorganized the child and copied the Page structure. A
separate disposable port-4192 origin began as a raw schema-v5 database solely to exercise the
export-first gate and migration. No owner browser data was available or inspected.

| Check | Numerical/result evidence |
|---|---|
| Overview and callout | The toolbar exposed `Note callout`; its marker rendered as `NOTE` in an accessible Note region while the heading and prose remained readable and searchable |
| Hierarchy and disclosure | The guide reported `3 sections · 1 subsection · 1 example`; collapsing Indicative hid `Speech (S)`, while collapsing the child alone hid its example and left the parent Note visible |
| Organizer | `Speech (S)` moved under Subjunctive, promoted to a root, then returned beneath Indicative. Invalid root-with-child parenting stayed disabled |
| Copy structure | The copied guide retained four section records and the child relationship but no content. All four copied IDs were disjoint from the source, and the child pointed to the fresh copied Indicative ID |
| Counts and search | Named empty copied structure reported `3 sections · 1 subsection`; searching `objective and/or certain` returned only the populated source Page with reason `in the grammar guide` |
| Schema-v5 gate | IndexedDB v50 showed `personal data schema 5 → 6`; the upgrade stayed gated until backup request and explicit acknowledgement. Opening v6 produced IndexedDB v60, retained `Belief`, prose and Pattern, and added `parentId: null` |
| Edit/export/restore | After migration, `Evidence` saved beneath `Belief`. A validated v6 export represented 1 Page and 2 events; after the disposable wipe, replace-and-restore reported `Restored 1 items and 2 events` and returned `1 section · 1 subsection` |
| Layout and console | At `innerWidth === 375`, document and body `scrollWidth === clientWidth === 360`; zero elements crossed the edge and both browser flows logged no warnings or errors |

The temporary viewport was reset, fixture records and the temporary restore file were removed,
browser tabs were closed and all isolated servers were stopped.

## Deliberately deferred

Deeper nesting, arbitrary custom blocks or fields, a general Page builder, stored user templates,
rich media, new content types and automatic grammar classification remain outside this release.
Future related owner-approved Page organization/formatting increments may stay under Phase 19, but
each still requires its own scope, decisions, tests and any independently required migration.
The first-release closeout above originally made no push or deployment claim; it was subsequently
included in the deployed schema-v7 Phase 19 build.

## Structured Notes increment and deployment

The second Phase 19 increment keeps `page.body` as Notes Overview and adds mandatory schema-v7
`noteSections[]` with exactly one subsection level. Grammar and Notes share the parameterized
hierarchy engine and organizer controls, while Notes retain their own Markdown bodies and deletion
semantics. Search, fresh-ID structure copying, mixed counts and every Pages/Diario consumer carry
the outline consistently.

The final complete serial suite passes **1,204/1,204 tests across 103 files**. The production build
transforms 2,088 modules, `git diff --check` passes, and a disposable 375×812 visible flow covered
Overview and section editing, hierarchy changes, Markdown search, structure copy, Vocabulary/Notes
composition and final-outline Diario movement without overflow or console warnings/errors. The
longest mixed count wrapped safely, and a browser-found 38 px action-height issue was corrected so
every new Notes action measures 44 px.

Local `main` and `origin/main` matched at `4f73a45` after the fast-forward push. The resulting
GitHub Pages deployment completed, and the owner confirmed the production smoke screen passed.

## Explicit Notes callouts — local follow-up

The owner-approved follow-up adds a separate **Note callout** beside **Block quote** in Page
creation, Page-details, Notes Overview and Notes section/subsection editors. It stores explicit
`> [!NOTE]` Markdown, so ordinary blockquotes retain their meaning and existing content does not
change. The shared Markdown projection removes the marker only in Page Notes contexts; search and
previews keep the prose, while lexical notes and Diario retain their prior behavior. Grammar keeps
its purple all-blockquote callouts but now shares the corrected single accessible label.

Five tests failed across three focused files before implementation and returned to green with
the parser, reader and toolbar behavior. The final serial suite passes **1,208/1,208 tests across
103 files**; the 2,088-module production build and `git diff --check` pass.

At 375×812, the visible Page-creation and named-section flow inserted both exact marker strings,
rendered two Notes-blue `ASIDE` Note regions, preserved one ordinary `BLOCKQUOTE`, kept all nine
formatting actions at 44×44 px, returned Page/Notes-section search hits for callout prose and no hit
for `[!NOTE]`, and held 360 px document content width without overflow or console warnings/errors.
The disposable Page was deleted through the UI and the origin returned to zero items. No owner data
was available or inspected. This follow-up remains local and is not pushed or deployed.

## Markdown blank lines — local follow-up

The owner-approved follow-up adds a non-destructive **Blank line** action to Page creation,
Page-details Notes, Notes Overview, Notes section/subsection, Grammar Overview and Diario editors;
lexical notes remain unchanged. The action writes an exact top-level standalone `<br>` after the
current line or selected lines without replacing prose. Each marker renders as one unlabeled
`aria-hidden` vertical spacer, while inline `<br>` and every other raw-HTML form remain discarded.
Search, previews and AI-visible text omit the marker, and schema remains v7.

Four deliberate reader/toolbar tests failed before implementation and returned to green. Nine
focused files pass 111/111 tests; the complete serial suite passes **1,214/1,214 tests across 103
files**; the 2,088-module production build and `git diff --check` pass.

At 375×812, a visible Notes Page and Diario entry each round-tripped two consecutive markers and a
Grammar Overview round-tripped one. Every marker produced exactly one hidden spacer, every enabled
action measured 44×44 px, no marker appeared in read mode or previews, and the document remained
375 px wide without horizontal overflow or console warnings/errors. The three records were deleted
through the UI, the origin returned to zero words, phrases and pages, the viewport was reset, the
browser tab was finalized and the isolated server stopped. No owner data was available or
inspected. This follow-up remains local and is not pushed or deployed.
