# Phase 8 — Words & phrases hub (report)

Implemented locally 2026-08-04 on `claude/phase-8-lexical-hub`. **Not deployed.** The approved scope
is in [PHASE-8-DIRECTION.md](PHASE-8-DIRECTION.md); the reasoning lines are in `DECISIONS.md`.

## What shipped

A dedicated Words & phrases hub, reached by the `palabras` and `frases` chips that now open it
rather than filtering in place. Everything it organizes by is derived at render.

| Piece | Where |
|---|---|
| Context, learning and A–Z derivations; the pin preference key | `src/lib/lexicalViews.js` |
| The hub surface | `src/components/LexicalHub.jsx` |
| The card, with its learning badge | `src/components/LexicalHubCard.jsx` |
| Page-context block, extracted so both cards share one copy | `src/components/PageContextSummary.jsx` |
| Pinned vocabulary read/write | `src/db/items.js` |
| Pin validation for backups | `src/db/backup.js` |
| Chip navigation and the hand-off query | `src/components/Cuaderno.jsx`, `src/App.jsx` |

### Decisions worth knowing

- **No schema change.** `SCHEMA_VERSION` stays 5. `pinnedLexicalIds` rides the existing generic
  preference path in backups, and its validator is `hasOwnProperty`-guarded so older backups still
  validate. `deleteItem` now cleans both pin lists in one transaction — a stale id would make the
  backup validator *reject the export*, which is a sharper failure than a phantom card.
- **Neither hub logs a `search_miss`.** §7 says a query the dictionary answers must not become a
  miss, and a hub that never consults the dictionary cannot tell. `SearchBar` gained `logMisses`
  (default `true`); the genuine miss is recorded by the root list after the hand-off. On the
  owner's decision this was extended to the **Pages hub**, which had inherited the logging from
  Phase 4z without it ever being considered — see below.
- **`wantsDictionary` simplified** to "todo, and no tag". With three chips now doors, the `palabras`
  branch had become unreachable from the root.
- **The hub's heavy derivations are gated behind `active`.** It stays mounted so its visit-local
  controls survive a detail hop, which would otherwise mean replaying the Leitner log and rebuilding
  the page-context index on every unrelated notebook change.
- **A–Z headings group but do not stick.** Sticky letters under an already-sticky focused header
  need a hard-coded offset that breaks if the header wraps; phone-width safety won.

### The Pages hub stopped logging misses too

Building the lexical hub surfaced the same flaw in the shipped Pages hub. Investigated and put to
the owner before touching it; approved and changed.

- **It was never a decision.** The Phase 4z entries cover roles, pins, Refine and card derivation
  and say nothing about misses, and `PageHub.test.jsx` had no coverage. `onMissLogged={reload}`
  came along with the rest of the SearchBar wiring.
- **The event cannot carry the distinction.** `search_miss` stores only `{query}` — no scope — and
  `Repaso.jsx:133` pools every miss into one "Searched for, not found" list. A chip reading
  `subjuntivo` could mean "add this word" or "make this page", and nothing tells them apart.
- **The harm is permanent.** Searching *casa* in the Pages hub logged "Couldn't find casa" into the
  append-only log while the bundled dictionary held it the whole time. The false-positive rate is
  not marginal: it covers every word the owner has that is not placed in a page.

The rule now is that **only a search whose scope is everything may log a miss** — after Phase 8
that is exactly one surface, the Cuaderno root. The change is one line in `PageHub.jsx`, plus the
first test that path has ever had.

### One existing test was rewritten, not patched

`Cuaderno.test.jsx`'s "counts contextual exact tags…" used the `palabras`/`frases` chips as filters
— a premise Phase 8 removes. It now exercises the same two behaviours (tag counts describe the
context, not the selection; an impossible tag clears itself) through the View control, which is the
root list's remaining context dimension.

## Automated verification

- `npm test -- --no-file-parallelism` — **649 passed / 649, 61 files**, 247.21s.
- `npm run build` — passed, built in 8.40s.
- `git diff --check` — clean.

### Deliberate red/green proofs

The project's habit: a test that passes should be able to fail. Three were broken on purpose,
watched go red, and restored.

| Broken | Test that went red |
|---|---|
| `matchesContextFilter`'s `none` case (`=== 0` → `>= 0`) | "matches each active structure and anywhere" |
| The lexical pin type check (dropped `type !== "lexical"`) | "refuses to pin a page or a missing item through the lexical setter" |
| Sorted pins to the top of hub search results | "never reorders search results, so §8 relevance stays authoritative" |
| Restored `onMissLogged` on the Pages hub | "logs no search miss, though the same settled query would log one from a full-scope search" |

The Pages-hub test carries its own positive control: after asserting the hub logged nothing, it
renders a bare `SearchBar` through the same mock and settle and asserts that one *does* log. Without
it, the absence assertion would keep passing if the logging path itself ever broke.

The third proof came from noticing that the original version of that test could *not* have failed:
it asserted the Pinned region was absent while searching, which is true structurally because the
pinned split reads an empty list during search. It was rewritten to assert real DOM order, using a
pinned word that ranks second by relevance.

## Browser closeout — 375×812, disposable local origin

**Passed, with one explicit gap: no visual screenshot was captured.** The in-app browser pane did
not composite frames, so `computer` clicks and screenshots time out — the same limitation recorded
for Phases 4t–4x, 4y and 7. Verification instead drove real DOM events and measured layout
numerically, which checks overflow and tap targets more precisely than eyeballing but proves
nothing about paint.

Fixture: 11 lexical items and 3 pages written straight into the local `mi-cuaderno` Dexie database,
never the owner's. Cleared afterwards; the dev server was stopped.

Confirmed:

- The focused header replaces the app header (`Spanish notebook` absent); the other two Cuaderno
  panes are genuinely `display: none`, not merely stacked.
- Form chips measure **44px** tall; the tapped chip arrives pre-selected.
- All four context filters resolve exactly: `vocabulary` → *nomás*, `source` → *órale*,
  `grammar` → *ándale*, `none` → the remaining eight. The Refine badge counts to `(1)`.
- Learning lens: highlighted → *madrugar*; due and in review → *nube* and *madrugar*; retired →
  empty. Both due cards carry a **Due today** badge. No session control exists in the hub.
- Completeness views: missing meaning → *arbolito*; no connections → the eight unlinked.
- A–Z index: `A D M N Ñ O Z #` — accents folded (*ándale*, *arbolito* under A; *órale* under O),
  **Ñ its own letter after N**, and `#` forced last for *1er*.
- Pinning separates a Pinned section and writes `pinnedLexicalIds: ["user:madrugar"]`, confirmed by
  reading IndexedDB directly.
- Meaning search matches with the reason "English meaning".
- The hand-off: `casa` finds nothing in the hub, the button reads *Search the dictionary for
  "casa"*, and Cuaderno takes over with `casa` already in its search box and the app header back.
- Detail return through the **Words & phrases** back label restores the hub with its chip and pin
  intact.
- `scrollWidth === clientWidth === 375` at every step — **no horizontal overflow**.
- No console warnings or errors.

### Observed, and left alone

Returning to the hub preserves its search query, so tapping `palabras` can land on a hub still
narrowed by an earlier search. This is the Pages hub's behaviour too and matches 4z's stated intent
that visit-local state survives. Recorded here rather than changed.

## Not done

- **Not deployed.** No push; `main` is untouched.
- No visual screenshot, per the pane limitation above.
- Relationship-type filtering, an orphan badge, saved views, and any grading in the hub remain out
  of scope by decision.
