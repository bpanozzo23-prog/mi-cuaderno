# Phase 5 — organizational improvements

**This report is cumulative and dated.** Phase 5 is complete; each part retains the verification
performed when that sub-phase finished.

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

---

# Part three — 5c Cuaderno retrieval controls (2026-08-02)

## Status

Sub-phase 5c is **complete**. Cuaderno now exposes 5b's browse orders, maintenance views and
contextual exact-tag counts through phone-sized native controls. Search relevance remains
authoritative, and maintenance views remain personal-notebook views even when the local dictionary
is installed.

`SCHEMA_VERSION` remains **1**. The new choices are component-local React state: they are not added
to Dexie, preferences, backups or any browser-storage format, and they reset when Cuaderno is
unmounted.

## What 5c does

- Cuaderno derives visible personal items in one explicit sequence: maintenance view over the full
  notebook, type filter, contextual tag counts, exact selected-tag filter, then either search
  relevance or the chosen browse order.
- **View** offers all items, missing meaning, missing examples and no links. Link maintenance sees
  backlinks from hidden item types because it is derived before the type filter.
- **Order** offers recently touched, recently added and A–Z while browsing. During search it becomes
  a disabled **Search relevance** control, making the existing ranking contract visible instead of
  implying that a browse sort still applies.
- **Tag** offers exact stored spellings with contextual item counts. Counts respond to View and type
  but not to the search query or the selected tag. If a context change makes the selected exact tag
  impossible, the selection clears rather than hiding every card behind stale state.
- Dictionary results remain available for eligible normal searches. Maintenance views suppress both
  pending and already-resolved dictionary rows, and their empty states do not invite the owner to
  install or search the dictionary for a personal-notebook maintenance problem.
- The controls use native selects, a two-column View/Order row and a full-width tag row so long tags
  remain bounded at the required phone width.

## Files

- `src/components/Cuaderno.jsx` — retrieval-state ownership, derivation sequence, native controls and
  dictionary-result eligibility.
- `src/components/EmptyState.jsx` — dictionary prompts are conditional on the active view being
  dictionary-eligible.
- `src/components/SearchBar.jsx` — an explicit accessible label for the notebook search field.
- `src/components/Cuaderno.test.jsx` — component-level contracts for ordering, maintenance,
  dictionary suppression, exact contextual tags and session-local reset behavior.

## Automated verification

- Focused 5c component tests: **5 passed**.
- Related organization, filter and search suite: **47 passed across 4 files**.
- Full suite: **263 passed across 22 files**.
- Production build: clean; PWA precache **430.05 KiB**.
- Search ordering was proved by temporarily applying alphabetical order to merged search rows; the
  relevance assertion failed and passed again after restoration. Dictionary gating was proved by
  temporarily allowing maintenance views to request dictionary results; the seeded installed
  dictionary row appeared, the assertion failed, and the restored gate passed.
- There is no lint or type-check script in `package.json`.

## Browser verification

Verified in the in-app browser at a **375 × 812 px** viewport with disposable personal entries and
the local 10,278-entry dictionary. This did not use or expose the owner's real browser data.

- Recently added, A–Z and recently touched each produced the expected distinct order after editing an
  older entry. Searching `zorro` kept the exact personal result ahead of a page body match and showed
  the disabled **Search relevance** order.
- Exact tag spellings `Mexico` and `mexico` remained separate with counts of one. Selecting `Mexico`
  showed only its matching entry; changing to the phrase type cleared that now-impossible selection.
  Search text did not alter the contextual tag choices or their counts.
- **No links** correctly excluded a word with a backlink from a page even while pages were hidden by
  the word type filter. Missing-meaning and missing-example views selected their expected personal
  subsets.
- A normal `casa` search showed installed dictionary rows. Switching to a maintenance view while the
  query remained active removed them immediately and they stayed absent after the asynchronous read
  settled; the empty message contained no misleading dictionary prompt.
- Leaving Cuaderno for Ajustes and returning reset View, Order and Tag to their defaults. A deliberately
  long tag remained inside the 375 px viewport. Every checked state had equal document `scrollWidth`
  and `clientWidth`.
- The browser console returned **no warnings or errors** after the complete flow.

---

# Part four — 5d actionable activity and consistent labels (2026-08-02)

## Status

Sub-phase 5d is **complete**. Recent activity now reopens destinations that still exist, handles
dictionary history through the reference-data seam, leaves unavailable history static, and uses
labels that remain true when the personal item is a page.

`SCHEMA_VERSION` remains **1**. No item, event, database, backup, preference, dictionary or
browser-storage shape changed. Dictionary aliases affect only the destination opened from a row;
the append-only historical event keeps the key it originally recorded.

## What 5d does

- A known activity event for a surviving personal item is a full-width button that opens that item
  through `App`'s existing selection path. The destination becomes a root Cuaderno detail with
  **Todo el cuaderno**, preserving 5a's session-only navigation rules.
- Recent dictionary keys resolve asynchronously through the existing installed/alias/orphan seam.
  Direct and aliased entries show their lemma and open the current canonical entry. An installed
  orphan says **reference unavailable**; a reference on a device without the dictionary remains a
  neutral **dictionary entry**. Neither state is called deleted or rendered as a broken button.
- Search misses and history belonging to deleted personal items remain visible and non-actionable.
- Unknown event types are ignored before selecting the twelve newest recognized events, so a future
  event neither leaks an internal label nor crowds known activity out of the feed.
- Mixed personal-item view language is now **opened/opens**, **Most opened**, and **Highlighted
  items**. Detail metadata uses the same language. Word-specific review scheduling and dictionary
  suggestions retain their accurate lexical-only wording.

## Files

- `src/components/Repaso.jsx` — activity filtering, dictionary resolution, actionable/static row
  rendering, canonical navigation and mixed-item labels.
- `src/components/Repaso.test.jsx` — focused personal, deleted, search-miss, direct dictionary,
  alias, orphan, not-installed and unknown-event contracts.
- `src/components/Detail.jsx` and `src/components/Detail.test.jsx` — page-safe open-count wording and
  its component check.

## Automated verification

- Focused activity/detail tests: **10 passed across 2 files**.
- Full suite: **269 passed across 23 files**.
- Production build: clean; PWA precache **431.00 KiB**.
- The alias-navigation test was proved rather than trusted: temporarily navigating with the stale
  event key made the test fail with `dict:wiktionary-es:casa:noun:old`; restoring canonical-key
  navigation returned the focused and full suites to green.
- An initial full-suite run was made concurrently with the production build; an unrelated 5c
  asynchronous test exceeded its five-second limit under that CPU contention. Rerunning the full
  suite by itself passed all 269 tests, and the build then passed separately.
- There is no lint or type-check script in `package.json`.

## Browser verification

Verified in the in-app browser at a **375 × 812 px** viewport with disposable fixture data in its
separate profile. This did not use or expose the owner's real browser data.

- Existing page and lexical activity rows reopened **Aardvark source** and **zorro** as root
  Cuaderno details; each showed **Todo el cuaderno** and the generalized **opened N×** metadata.
- Seeded direct and aliased dictionary events both rendered as **Opened casa**. Opening the newer
  aliased row reached the canonical `casa` dictionary detail. A seeded missing key rendered
  **Opened (reference unavailable)** without a chevron or button, and a seeded unknown event did
  not appear.
- The existing **Couldn't find “casa”** search miss remained a static row while active destinations
  showed chevrons and responded to taps.
- The Repaso feed and dictionary detail had no horizontal overflow: document `scrollWidth` equaled
  `clientWidth` in both checked states at the phone viewport.
- The browser console returned **no warnings or errors** after the complete flow.

---

# Part five — 5e scan-first detail pages (2026-08-02)

## Status

Sub-phase 5e is **complete**. Personal detail screens now lead with saved reading content and keep
blank optional forms behind deliberate actions, while every existing field and save path remains
available.

`SCHEMA_VERSION` remains **1**. The new modes are local React presentation state; no item, event,
database, backup, preference, link, dictionary or browser-storage shape changed.

## What 5e does

- Saved lexical notes and page bodies render as ordinary text with their line breaks preserved and
  long tokens bounded to the phone width. Empty content is a compact **Add note** or **Write page**
  state rather than a blank textarea.
- **Edit note** and **Edit page** reveal the existing prefilled editor. Save writes the same raw
  field through the existing explicit-save path and returns to reading; Cancel restores the saved
  value without writing or logging an event.
- Existing personal examples and media links stay visible. Their blank composers start collapsed,
  focus their first field when opened, keep invalid drafts open, and clear and collapse after
  Cancel or a successful Add.
- Example and media additions retain their existing validation, trimming, array shapes and one
  `edit` event. Pages still offer media but not personal examples.
- The new state resets for a different item but survives same-item notebook reloads, preserving the
  Phase 4 quick-create draft contract and Phase 5a's destination-local isolation.
- Conditional fields and controls have specific accessible names and disclosure state; the header
  pencil now distinguishes entry details from the note/page edit action.

## Files

- `src/components/Detail.jsx` — reading/editor presentation and optional-form disclosures.
- `src/components/Detail.test.jsx` — body, event, validation, disclosure and draft-preservation
  contracts.
- `src/App.test.jsx` — the existing cross-entry optional-draft isolation check now opens the
  collapsed composer explicitly.

## Automated verification

- Focused detail/navigation tests: **15 passed across 2 files**.
- Full suite: **275 passed across 23 files**.
- Production build: clean; PWA precache **432.78 KiB**.
- The tests were proved rather than trusted: temporarily forcing the body editor and example
  composer open produced **6 focused failures**, including the read-first, compact-empty,
  collapsed-composer and quick-create contracts. The defaults were restored and the focused and
  full suites rerun green.
- There is no lint or type-check script in `package.json`.

## Browser verification

Verified in the in-app browser with a **375 × 812 px** viewport override and disposable fixture
data in its separate profile. This did not use or expose the owner's real browser data.

- A long page opened as reading text with no textarea. Editing autofocuses the existing body,
  saving multiline text returned to reading, reopening showed the saved value, and Cancel discarded
  a replacement draft.
- A sparse lexical item showed compact **Add note**, **Add an example** and **Add a media link**
  actions. Saving a multiline note returned to **Edit note**; adding a bilingual personal example
  displayed the row and collapsed the composer again.
- A blank example and an invalid media URL left their composers open without adding a row. A valid
  media URL and label saved on the page and restored the collapsed action.
- A deliberately long unbroken token wrapped without horizontal overflow. In read, edit and
  expanded-composer states, document `scrollWidth` equaled `clientWidth` (360 px inside the browser's
  375 px viewport override).
- The browser console returned **no warnings or errors** after the complete flow.

---

# Part six — 5f duplicate guardrails (2026-08-02)

## Status

Sub-phase 5f and Phase 5 are **complete**. Add Sheet and quick-create now warn about exact
personal-heading duplicates without blocking intentional homographs or hiding personal creation
beside dictionary results.

`SCHEMA_VERSION` remains **1**. Duplicate detection derives from the personal items already in
memory; no item, event, link, dictionary, backup, preference or browser-storage shape changed.

## What 5f does

- A shared comparison normalizes headings to NFC, trims their ends, collapses internal whitespace
  and compares with Spanish case folding. It deliberately preserves accents and punctuation, so
  `si`/`sí`, `el`/`él`, `tu`/`tú` and `verguenza`/`vergüenza` remain distinct.
- Word and phrase headings share one lexical comparison group because the same spelling may be
  legitimately stored under either form. Pages compare only with page titles. Blank headings,
  dictionary rows and unknown item shapes do not warn.
- Add Sheet and both quick-create choices show the same advisory status message when their proposed
  personal heading matches. Their create buttons remain enabled; the warning never prevents an
  intentional duplicate.
- Dictionary search remains independent. A dictionary-only match still leaves the relevant
  personal word/phrase create action visible and enabled.
- Personal lexical labels consistently say **word** or **phrase** in Add Sheet, link pickers,
  notebook/link cards, detail screens and review cards. Dictionary abbreviations such as `s.` and
  `loc.` remain dictionary terminology.
- Quick-create still creates and one-sidedly links in place, preserves unsaved source drafts, logs
  the existing events and does not navigate. Search ordering and matching are unchanged.

## Files

- `src/lib/duplicateGuard.js` and `src/lib/duplicateGuard.test.js` — pure personal-heading
  normalization, comparison and edge-case contracts.
- `src/components/DuplicateWarning.jsx` — shared accessible advisory message.
- `src/components/AddSheet.jsx` and `src/components/AddSheet.test.jsx` — duplicate feedback while
  preserving ordinary creation and detail navigation.
- `src/components/LinkPicker.jsx` and `src/components/LinkPicker.test.jsx` — independent lexical and
  page warnings, dictionary-only creation, and quick-create draft/navigation/link contracts.
- `src/components/ItemCard.jsx`, `LinkCard.jsx`, `Detail.jsx`, `ReviewSession.jsx`,
  `PersonalTerminology.test.jsx` and `Detail.test.jsx` — consistent personal word/phrase wording.

## Automated verification

- Focused guardrail/component tests: **31 passed across 5 files**.
- Related component tests: **95 passed across 7 files**.
- Full suite: **295 passed across 27 files**.
- Production build: clean; PWA precache **433.79 KiB**.
- The accent rule was proved rather than trusted: temporarily using accent-folding normalization
  produced four intended failures covering `si`/`sí`, `el`/`él`, `tu`/`tú` and
  `verguenza`/`vergüenza`. The accent-sensitive comparator was restored and rerun green.
- The dictionary-only rule was also proved: temporarily hiding personal creation whenever picker
  results existed made the seeded `casa` dictionary-only test fail. The independent create action
  was restored and rerun green.
- There is no lint or type-check script in `package.json`.

## Browser verification

Verified in the in-app browser with a **375 × 812 px** viewport override and seeded fixture data in
its disposable separate profile. This did not inspect or overwrite the owner's real browser data.

- Add Sheet warned for a whitespace- and case-varied `tener ganas de`, did not warn for unaccented
  `si` beside personal `sí`, and did not cross-match the page title `Roma`. The warned phrase still
  created and opened normally.
- Quick-create warned for `tener ganas de`, kept its create action enabled, created and linked the
  duplicate without navigating away from the source page, and preserved the source's unsaved body
  draft.
- Searching the fixture dictionary for `casa` showed its dictionary row, no personal-duplicate
  warning, and an enabled **Create word “casa” and link it** action.
- Personal phrase rows consistently exposed the `phrase` label. Document `scrollWidth` (360 px)
  equaled `clientWidth` inside the 375 px viewport, and the console returned **no warnings or
  errors**.
