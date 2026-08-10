# Phase 20 — Global tag management (report)

Implemented and verified locally 2026-08-10 on
`codex/phase-20-global-tag-management`; **not pushed or deployed**. The complete contract and
boundaries remain in [PHASE-20-DIRECTION.md](PHASE-20-DIRECTION.md), and durable choices are
recorded in `DECISIONS.md` under Phase 20.

## What changed

| Piece | Result |
|---|---|
| Exact maintenance | Ajustes can rename one exact tag, merge it into one exact existing tag or remove it from every lexical entry and Page, including Diario entries |
| Shared preview | One pure plan computes the operation kind, source/destination/overlap/final counts and order-preserving item updates. Normalized lookalikes remain untouched suggestions |
| Atomic persistence | Item tag rewrites, the colour-preference rewrite and one ordinary `edit` per changed item share one Dexie transaction over `items`, `events` and `prefs` |
| Timestamp neutrality | The transaction writes only each affected `tags[]`; `updatedAt`, Recently touched order and Diario's Continue ordering do not move |
| Colour ownership | Rename carries the source appearance, merge keeps the destination appearance including Plain, and removal deletes the source colour key |
| Settings interaction | **Tag colors** is now **Tags**. Each exact row retains its use count and eight swatches and adds a visible 44 px Manage action that opens a phone-width bottom sheet |
| Confirmation | New spellings rename directly. Existing destinations preview source, destination, overlap and final counts before a second confirmation. Removal says entries remain and also confirms twice |
| Backup and recovery | Merge/removal offer the existing export as an optional, non-gating action. Current schema-v6 exports round-trip completed mutations without a format change |
| Derived consumers | One notebook reload updates search and tag vocabularies; invalid exact Cuaderno/hub/Collection filters and Saved Gym setup selections use their existing safe-reset behavior |

## Contracts preserved

- Tags remain exact strings directly on personal-item `tags[]`; there is no registry, alias,
  stable tag ID, saved view, batch event or schema migration.
- Search/suggestion normalization does not become mutation identity. Case, acute accents,
  diaeresis and ñ remain exact during rename, merge and removal.
- Items and unrelated fields remain intact. Merge collapses only the chosen source/destination
  pair, and malformed unrelated duplicates from a legacy or hand-edited backup are not cleaned.
- Ordinary `edit` events retain the existing activity/calendar/streak consequences while review,
  Gym and Leitner derivations continue to ignore them.
- `SCHEMA_VERSION` remains 6. Dictionary records, links, Page structure, scheduling and Gym history
  are never part of the transaction.

## Delivery and deliberate failure proofs

The implementation followed the direction in four feature commits:

1. `5eef7bf` — plan global tag management.
2. `792903a` — define global tag change semantics.
3. `92ee439` — add atomic global tag mutations.
4. `ae390c2` — add global tag management UI.

The red/green and failure-path proofs were explicit:

- The pure tag suite first failed because `planGlobalTagChange` did not exist; adding the exact,
  order-preserving planner made rename, overlap merge, removal, malformed-row and no-op cases pass.
- The sheet suite first failed module resolution before `TagManagementSheet.jsx` existed; the
  completed interaction made direct rename, two-stage merge/removal, optional backup, disabled
  saving controls and inline transaction errors pass.
- The database suite deliberately throws on the second event-store add. Dexie rejects the action
  and restores both source-tag arrays, the zero-event baseline and the original colour map, proving
  that a partly renamed notebook is not a possible committed state.

The current-backup proof applies a completed mutation, validates its schema-v6 envelope, wipes the
test database, imports the envelope and recovers the rewritten tags, carried colour, two edits and
byte-for-byte original timestamps.

## Complete automated verification

- Complete serial suite: **1,168/1,168 tests across 101 files** (`npm.cmd test`, 279.93 s).
- Production build: passed (`vite build`, 2,085 modules transformed; PWA generated).
- `git diff --check`: passed.
- Focused pure/database coverage includes exact variants, all personal item forms, order,
  destination overlap, Plain and dormant colours, JavaScript-special tag keys, no-op writes,
  rollback, timestamps and backup restore.
- Component/full-App coverage includes suggestions, real merge/removal confirmation, optional
  backup, locked saving state, inline failure, colour refresh, final-tag success copy and stale
  Cuaderno-filter widening.
- Existing Conjugation Gym coverage continues to prove that an invalid exact Saved-tag setup
  selection resets to All saved outside a live session; started decks remain snapshots.

Vite retains its advisory that the main app chunk is over 500 kB after minification. It does not
fail the build, and Phase 20 did not broaden into a code-splitting change.

## Browser closeout

A verified-empty local origin on port 5196 was fixed at 375×812. Through visible controls it
created disposable words **hablar** and **comer** with source tag `legacy-verbs`, placed destination
tag `grammar` on hablar and a disposable **Grammar notes** Page, and chose source Red/destination
Green. No owner browser data was available or inspected.

| Check | Numerical/result evidence |
|---|---|
| Settings rows | `grammar · 2` and `legacy-verbs · 2` each kept all eight colour actions plus a visible Manage action. Source Red and destination Green were independently pressed |
| Rename | `legacy-verbs` renamed on two entries to `verbs-with-a-deliberately-long-name-that-must-wrap-on-a-375-pixel-phone`; the source row disappeared, Red carried and Settings events moved 6→8 |
| Long-tag phone fit | The long destination chip wrapped to 302×38 px. The sheet stayed 360 px wide with zero overflowing descendants; Rename and every other action measured 44 px high |
| Search/filter refresh | Cuaderno offered the renamed exact tag with count 2 and filtered to the two words. The filtered document measured `scrollWidth === clientWidth === innerWidth === 375` |
| Merge preview | The live preview reported 2 source entries, 2 destination entries, 1 overlap and 3 final entries. A second Confirm merge state exposed **Export backup first**, but confirmation was enabled without using it |
| Merge result | Both source carriers changed, the destination became `grammar · 3`, Green won, events moved 8→10 and the now-invalid long-tag filter widened to All tags |
| Removal | The second confirmation said entries remain, offered the same optional backup and removed `grammar` from 3 entries. Events moved 10→13 while totals remained 2 words and 1 Page |
| Colour deletion | Recreating exact `grammar` on hablar started Plain (`aria-pressed=true`); the former Green choice stayed unpressed |
| Layout and console | Short pages measured 375/375; vertically scrolling Settings/sheets measured `scrollWidth === clientWidth === 360` inside `innerWidth === 375`. Browser logs contained no warnings or errors |

The recreated tag and all three fixture records were deleted through visible controls, returning the
origin to 0 words, 0 phrases and 0 Pages. The temporary viewport was reset, the disposable tab was
closed and the isolated server was stopped. The in-app pane's documented frame-compositing limit
means this was a DOM/computed-geometry closeout rather than a screenshot claim.

## Deliberately deferred

Multi-source merge, bulk selection, aliases, stable tag IDs, a stored tag registry, persistent
undo, grouped batch history, saved tag views and automatic normalized cleanup remain outside this
release. A future saved-view feature must define its own stale-reference behavior. Nothing was
pushed or deployed.
