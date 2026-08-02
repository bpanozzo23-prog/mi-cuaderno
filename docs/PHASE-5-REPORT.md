# Phase 5 — organizational improvements

**This report is cumulative and dated.** Phase 5 is active; each completed sub-phase will add a
part rather than rewriting earlier verification.

---

# Part one — phase setup and 5a navigation continuity (2026-08-02)

## Status

Phase 5 is defined in `docs/PHASE-5-DIRECTION.md`, Phase 4 remains an independent friction-driven
maintenance stream, and the AI assistant is now Phase 6. Sub-phase 5a is **complete**: its
automated checks, production build and required 375 px browser verification all pass.

`SCHEMA_VERSION` remains **1**. Navigation state exists only in React memory. No item, event,
preference, backup, link, dictionary or browser-storage shape changed.

## What 5a does

- `App` holds a trail of deliberately opened detail keys instead of one bare selected key.
- Opening a related personal or dictionary item pushes that key and starts the destination at
  the top of the document.
- A nested detail shows **Atrás** and pops back through the trail. A root detail keeps
  **Todo el cuaderno** and returns to the list.
- The back action remains present while a dictionary entry is loading and when an installed
  dataset no longer contains the requested key.
- Leaving Cuaderno clears the trail, so a path from an earlier visit cannot leak into Repaso or
  Ajustes.
- Notebook reloads caused by views or edits do not reset scroll because neither the tab nor the
  selected key changed.
- Each destination detail is remounted by key, keeping unsaved example/media fields and
  asynchronous dictionary-link resolution scoped to the entry where they began.

This is deliberately not routing: no URLs, browser history, persistence or deep links were
introduced. Returning to the root list starts at the top; preserving a previous list scroll
position is outside this smallest slice. The change also does not claim to preserve an unsaved
notes/page draft if the owner deliberately follows a link away from it.

## Files

- `src/App.jsx` — trail ownership, open/back actions and route-keyed scroll reset.
- `src/components/Cuaderno.jsx` — forwards the trail-aware back action and label and isolates
  destination-local detail state with keyed remounts.
- `src/components/Detail.jsx` and `src/components/DictDetail.jsx` — render the supplied root or
  nested back label; dictionary loading and missing-entry states retain that action.
- `src/App.test.jsx` — integration coverage for a three-detail trail, forward and backward scroll
  reset, tab-exit cleanup, destination-local drafts, and personal/dictionary traversal.
- `src/components/DictDetail.test.jsx` — seeded loading-state and missing-entry back coverage.

## Automated verification

- Focused tests: `src/App.test.jsx` and `src/components/DictDetail.test.jsx` — **6 passed**.
- Full suite: **246 passed across 20 files**.
- Production build: clean; PWA precache **427.08 KiB**.
- The test was proved rather than trusted: removing the scroll reset produced one failure, and
  replacing the push with a single selected key produced two failures. Removing the keyed
  detail remount made the new draft-isolation test fail with the source entry's Spanish example
  still present on its destination. All deliberate breaks were restored and the suite rerun
  green.
- There is no lint or type-check script in `package.json`.

## Browser verification

Verified in the in-app browser at a **375 × 812 px** viewport with disposable data in its
separate profile: one source-like page, one word, one phrase, and the local 10,278-entry
dictionary installation. This did not use or expose the owner's real browser data.

- From the long source page, opening `madrugar` reset scroll from **321.5 px to 0** and showed
  **Atrás**. Opening linked `de repente` reset **524 px to 0**.
- Scrolling the phrase and using **Atrás** returned to `madrugar` at the top; scrolling the word
  and using **Atrás** returned to the source at the top. The root then showed
  **Todo el cuaderno**, which returned to the list at scroll position 0.
- Re-entering the nested word, switching to Repaso, and returning to Cuaderno produced the root
  list with **zero** stale **Atrás** controls.
- A linked personal word opened the installed `casa` dictionary entry at the top with
  **Atrás**, and scrolling that entry before going back returned to the personal word at the
  top. The reference read resolved too quickly to freeze its transient loading frame visually;
  `src/components/DictDetail.test.jsx` separately pins the initial loading render's back action.
- No horizontal overflow was present: document `scrollWidth` equaled `clientWidth` on the
  source, personal detail, dictionary detail, and root list.
- The browser console returned **no warnings or errors** after the complete flow.

The initial browser URL-policy denial was retried after browser access was corrected; the same
development URL then loaded and was fully controllable. The disposable entries and replaceable
dictionary remain only in the in-app browser's test profile.

---

# Part two — 5b organizational derivations (2026-08-02)

## Status

Sub-phase 5b is **complete**. It defines the pure organizational behavior that 5c will expose in
Cuaderno; 5b itself makes no visible application change. `SCHEMA_VERSION` remains **1**, and no
item, event, database, backup, preference, component or browser-storage shape changed.

## What 5b defines

- Browse ordering has three choices: recently touched copies the current `allItems()` order,
  recently added sorts a copy by `createdAt`, and A–Z uses Spanish collation across lexical terms
  and page titles. An untitled page sorts by the same **Untitled page** fallback shown in the UI.
- Every order works on a fresh array. The shared `notebook.items` recency order remains intact for
  the empty-query link picker, and search results remain under brief §8 relevance ordering.
- Maintenance views select lexical items without a meaning, lexical items without personal
  examples, or items without stored links or derived backlinks. They are derived from the full
  notebook before a later type filter so a hidden page's backlink still counts.
- A dictionary key in `linkedKeys[]` is a link. A lexical item's `dictKey` is still the separate
  personal/reference attachment and does not by itself make that item linked.
- Contextual tag counts preserve exact stored spelling, count each item once per tag, and are
  intended to run after type/maintenance filtering but before the selected tag narrows cards.

## Files

- `src/lib/organization.js` — pure browse-order, maintenance-view and contextual tag-count
  derivations.
- `src/lib/organization.test.js` — focused contracts for ordering, immutability, link/backlink
  boundaries, maintenance subsets and exact tag counts.

## Automated verification

- Focused tests: `src/lib/organization.test.js` — **12 passed**.
- Full suite: **258 passed across 21 files**.
- Production build: clean; PWA precache **427.10 KiB**.
- The backlink test was proved rather than trusted: temporarily omitting the derived-backlink
  check made the cross-type case fail by incorrectly including `linked-word`. The implementation
  was restored and the focused and full suites rerun green.
- An independent read-only review found no correctness or architecture gaps.
- There is no lint or type-check script in `package.json`.

## Browser verification

No browser pass applies to 5b: the phase-wide criterion requires seeded 375 px checks for visible
sub-phases, while this slice only adds unreferenced pure helpers and tests. It changes no rendered
component, runtime navigation, storage or browser interaction. The first visible consumer is 5c,
which will receive the full 375 px overflow, interaction and console check.
