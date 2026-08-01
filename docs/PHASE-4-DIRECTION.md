# Phase 4 — direction: linking

**Authored by the owner, 2026-07-31.** Brief §12 leaves Phase 4 open — "driven by a
running list of friction the owner collects while using the app daily" — and names
*richer linking* among its candidates. The owner has chosen linking as the phase's
core scope and settled the requirements below. This file sits under the brief, not
beside it: every §5/§7 rule still binds, and nothing here amends the contract.

**The friction list is still to be collected.** Before proposing a plan, ask the owner
for it. Items on it may join, reorder, or displace parts of this package.

The package stays inside the existing item-level linking architecture (`linkedKeys[]`,
§6/§7). No graph database, no new link entity, and no graph visualization this phase.

---

## Requirements

Listed in roughly the order they should be built: each one is usable on its own, and
the later ones lean on the earlier.

1. **Autocomplete link picker.** Search across personal lexical items, pages, and
   installed dictionary entries. Show item type and enough context to tell similar
   results apart. Clearly identify what is already linked.
   *Match on term, title and translation only — not tags.* A picker's job is "find the
   one item I mean", and tag matches are noise there: typing "verb" would surface
   everything tagged `verbs`. (The tag-filter chips on the Cuaderno screen are a
   different feature and stay as they are.)

2. **Quick-create-and-link.** When no suitable personal item exists, let the owner
   create one and connect it immediately, without losing unsaved work on the
   originating page or item.

3. **Backlinks — verify and present.** Every personal item shows the other active items
   that link to it. *This mechanism already exists* (Phase 1c: links are stored once and
   the reverse direction is derived from the `*linkedKeys` index; `Detail.jsx` already
   renders a merged both-directions list). The work here is confirming it holds and
   presenting it well through requirements 4 and 5 — **not** rebuilding it, and never
   storing a second copy.

4. **Rich link cards and previews.** Show what helps the owner recognise an item: type,
   term or title, translation, date, a notes preview, dictionary-link status. Keep it
   readable on a phone — *no tags on these cards*; the space is better spent, and tags
   are the least useful field for "is this the one I meant".

5. **Link grouping.** Group an item's links by what the data already knows —
   **palabras** (lexical items), **páginas**, and **journal entries** (a page with a
   date, per §7). One fixed sensible order within each group, most recently updated
   first; no user-facing sort controls, which are desktop thinking for a list of five
   links.
   *No "sources" category this phase.* Nothing in the data distinguishes a film or
   podcast page from a grammar page, so that category would force either a tag
   convention or the project's first schema field. Deferred until real use asks for it.

6. **Specialized linked-item views.** **Every page** shows its linked vocabulary
   automatically — a grammar page listing six verbs benefits as much as a film page
   would, which is what makes deferring the "source" concept free. Item detail screens
   get a focused related-items view built from direct links and backlinks together.

7. **Exact term and title link suggestions.** *(Last, and deferrable to a later phase.)*
   While editing a page, detect terms, phrases and page titles matching existing
   personal items. Show them for approval — **never link automatically**. Prefer longer
   phrase matches and suppress noise from very common terms. Exact matching only in v1:
   no inflected forms, and personal items only, not the 10,278-entry dictionary.
   This is the largest single piece of new logic in the package; sequencing it last
   means everything else can ship without it.

## Cross-cutting acceptance criteria

- **Linking never requires navigating away from what the owner is doing.** This is the
  test the package as a whole has to pass, not a separate feature — requirements 1 and 2
  are what deliver it. Deliberately *not* built: a "linking mode" on the global search
  screen. It is the one piece of new UI state machinery this package would otherwise
  need (linking from a search result raises "link it to *what*?"), and cutting it is the
  largest simplification available.
- **The phase should not need a schema change.** `SCHEMA_VERSION` is 1 and has never
  moved. Requirements 5 and 6 were shaped specifically to avoid forcing a field. If a
  planning session concludes one is genuinely needed, raise it with the owner rather
  than proceeding: §5 requires a migration plan, an export-first reminder, a version
  bump, and matching backup validation.

---

## Facts to verify against the files before planning

- **Links are stored once, on the item where the link was made** (Phase 1c); the reverse
  is computed from the `*linkedKeys` multi-entry index — `backlinksFor` and
  `relatedItems` in `src/db/items.js`. A dictionary entry cannot hold a reciprocal link,
  which is why the design is one-sided; the owner never sees which side stores it.
- **Linking and unlinking log no `edit` event** (Phase 1c): the activity feed records
  content the owner changed, not bookkeeping. Approved suggestions from requirement 7 go
  through the same `linkItems` call and inherit this.
- **Unsaved-work preservation (requirement 2) has a concrete mechanism to respect:**
  `Detail.jsx` resets its body draft only when `item.id` changes. Quick-create-and-link
  must not remount or re-key the originating item mid-edit. Worth pinning with a test.
- **Matching must reuse `src/lib/normalize.js`** — the ñ-preserving normalizer both
  layers already share. "año" must never match "ano", anywhere new.
- **The picker (requirement 1) replaces** the `<select>`-based picker in `Detail.jsx` and
  folds in what `DictPicker` (`src/components/DictAttachment.jsx`) already does for
  dictionary entries. `linkedKeys[]` may point at either layer (§6).
- **`dict:` keys can go stale** across a dataset rebuild. Anything new that renders one
  needs the orphan behaviour `DictAttachment` and the Repaso rail already implement.
- **Everything derives at render time** (§7). No stored counters, no cached groupings.
- **Size:** seven requirements plus the friction list is several committed sub-phases.
  Sequence them small (working agreement §2), and it is acceptable to propose deferring
  requirement 7.
