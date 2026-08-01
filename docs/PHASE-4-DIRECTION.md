# Phase 4 — direction: linking

**Authored by the owner, 2026-07-31.** Brief §12 leaves Phase 4 open — "driven by a
running list of friction the owner collects while using the app daily" — and names
*richer linking* among its candidates. The owner has chosen linking as the phase's
core scope and written the requirements below. This file sits under the brief, not
beside it: every §5/§7 rule still binds, and nothing here amends the contract.

**The friction list is still to be collected.** Before proposing a plan, ask the owner
for it. Items on it may join, reorder, or displace parts of this package.

---

## The linking package (owner's requirements)

1. **Autocomplete link picker**
   - Search across personal lexical items, pages, and installed dictionary entries.
   - Show item type and enough context to distinguish similar results.
   - Clearly identify already-linked items.
2. **Quick link actions**
   - Allow linking from appropriate search results and item menus.
   - Avoid requiring unnecessary navigation away from the current task.
3. **Quick-create-and-link**
   - When no suitable personal item exists, allow the user to create one and
     immediately connect it.
   - Preserve any unsaved work on the originating page or item.
4. **Backlinks**
   - Every personal item displays other active items that link to it.
   - Backlinks are derived from existing links rather than stored as a second
     independent copy.
5. **Rich link cards and previews**
   - Display relevant information such as item type, translation, tags, date, notes
     preview, or dictionary-link status.
   - Keep the presentation usable on a phone.
6. **Link sorting and grouping**
   - Group linked items by useful categories such as lexical items, pages, sources,
     and journal entries.
   - Allow sensible sorting, such as title, date, or recently updated.
7. **Exact term and title link suggestions**
   - When editing a page, detect terms, phrases, or page titles that match existing
     items.
   - Show suggestions for approval; do not create links automatically.
   - Prefer longer phrase matches and suppress excessive suggestions for very common
     terms.
8. **Specialized linked-item views**
   - Source pages display their linked vocabulary automatically.
   - Item detail screens provide a focused related-items view using direct links and
     backlinks.
   - Do not build a full graph visualization in this phase.

This wording is deliberate: the package stays within the existing item-level linking
architecture (`linkedKeys[]`, §6/§7). No graph database, no new link entity.

---

## Facts and open questions for the plan — verify each against the files

- **Requirement 4 is substantially built already.** Phase 1c stores each link once and
  derives the reverse direction from the `*linkedKeys` multi-entry index
  (`backlinksFor` and `relatedItems` in `src/db/items.js`); `Detail.jsx` and
  `DictDetail.jsx` already show a merged both-directions "Linked" list. The work here
  is verifying and *presenting* backlinks (requirements 5 and 6), not building them.
  Do not re-propose the mechanism.
- **"Sources" and "journal entries" are not schema types.** §7: a journal entry is a
  dated page (`pageDate` set — derivable); but nothing in the data distinguishes a
  source page (film, podcast, book) from a grammar-topic page. Requirements 6 and 8
  therefore need a deliberate decision: a tag convention, or the project's **first
  personal-layer schema field** (e.g., `pageKind`) — the latter triggers §5 in full
  (migration plan, export-first reminder, `SCHEMA_VERSION` bump, backup validation
  update in `src/db/backup.js`). Decide it explicitly in the plan; do not let it
  happen as a side effect.
- **A link has a "from" side.** Requirement 2's link-from-search-results needs the
  plan to define where the origin item comes from when the owner is not on a detail
  screen. Links are stored on the item where the link was made (Phase 1c decision) —
  whatever the UI offers must resolve to that.
- **Unsaved-work preservation (requirement 3) has a concrete mechanism to respect:**
  `Detail.jsx` resets its body draft only when `item.id` changes. Quick-create-and-link
  must not remount or re-key the originating item mid-edit. Pin it with a test.
- **Linking is not an edit.** Phase 1c: `linkItems`/`unlinkItems` log no `edit` event,
  so the activity feed records content changes, not bookkeeping. Requirement 7's
  approved suggestions go through the same calls and inherit this.
- **Matching (requirement 7) must reuse `src/lib/normalize.js`** — the ñ-preserving
  normalizer both layers already share. "Exact" is the deliberate v1 boundary: no
  inflected-form matching, and suggestions draw on personal items only, not the
  10,278-entry dictionary.
- **The picker (requirement 1) folds in what `DictPicker` already does** for
  dictionary entries (`src/components/DictAttachment.jsx`), and `linkedKeys[]` may
  point at either layer (§6) — the current `<select>`-based picker in `Detail.jsx` is
  what it replaces.
- **Size:** eight requirements plus the friction list is several committed sub-phases.
  Sequence them small (working agreement §2), and it is acceptable to propose
  deferring the tail — requirement 7 is the largest single item.
