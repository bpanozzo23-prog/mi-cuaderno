# Phase 20 — Global tag management

**Status:** Implemented and verified locally 2026-08-10; not pushed or deployed. See
[PHASE-20-REPORT.md](PHASE-20-REPORT.md).
**Origin:** The existing tag suggestions prevent some new spelling variants, but the notebook has
no way to repair an existing typo, consolidate two exact tags or remove an obsolete tag without
editing every affected item separately.

## Outcome

Ajustes becomes the one global tag-management surface. The owner can rename one exact tag across
the personal notebook, merge it into one exact existing tag, or remove it everywhere. Every
operation covers lexical entries and Pages, including pages currently derived as Diario entries,
and leaves dictionary data, links, Page structure, review scheduling and Gym history untouched.

Tags remain strings stored directly in each item's `tags[]`. There is no tag registry, alias map,
stable tag identity or schema migration. `SCHEMA_VERSION` remains 6.

## 1 — Exact rename, merge and removal

- The selected source is one exact stored string. Case, acute accents, diaeresis and ñ remain part
  of tag identity; normalized lookalikes may be suggested but never mutate together automatically.
- A trimmed, nonblank destination unused anywhere in the notebook is a **rename**.
- A destination already used with that exact spelling is a **merge** and requires an explicit
  confirmation. Mechanically, the source becomes the destination and exact duplicates collapse.
- A rename preserves the source's position in each item's tag order. During a merge, an item that
  already carries the destination keeps that destination's original position and loses the source.
- **Remove everywhere** removes only the selected tag. It never deletes an item or changes any
  unrelated field.
- Only occurrences of the selected source and destination are normalized by the operation.
  Unrelated malformed strings from a hand-edited or legacy backup are not silently cleaned.
- Blank destinations, the unchanged exact source and a source no longer in use are no-ops.

## 2 — Persistence, history and colours

The item rewrites, one event per changed item and the colour-preference rewrite share one Dexie
transaction over `items`, `events` and `prefs`. A failure rolls back the whole operation; a partly
renamed notebook is never a valid outcome.

- Global tag maintenance is **timestamp-neutral**. It changes `tags[]` without changing any
  affected item's `updatedAt`, so Recently touched order and Diario's Continue choice do not move.
- Tags remain content, so every actually changed item receives one ordinary `edit` event. Those
  events retain the existing Recent activity, calendar and streak behavior. There is no new event
  type, batch id or metadata, and review/Gym derivations continue to ignore ordinary edits.
- Rename to an unused destination carries the source's visible colour exactly, including Plain;
  any dormant destination colour is replaced.
- Merge keeps the destination's current colour, including Plain, and removes the source colour.
- Removal permanently deletes the source colour key so recreating that spelling later starts Plain.
- Existing JSON backups already contain items, events and preferences. The backup format stays at
  schema 6 and current exports round-trip the completed operation without special handling.

## 3 — Ajustes interaction

The current **Tag colors** section becomes **Tags**. Every exact tag row keeps its chip, use count
and eight-colour palette, and gains one 44 px Manage action. That action opens the established
phone-width bottom sheet.

- The sheet names the exact source and affected-entry count.
- The rename field offers matching existing tags as suggestions. Choosing is always explicit.
- An unused destination shows a rename summary and one Rename action.
- An existing destination changes the action to Merge and previews source count, destination
  count, overlap and final destination count before a second confirmation.
- Removal is worded **Remove tag from N entries**, explicitly says the entries remain, and requires
  a second confirmation.
- Merge and removal offer **Export backup first** through the existing validated export flow. The
  download is optional and never unlocks or gates confirmation.
- Saving disables competing controls. A failed transaction leaves the sheet open with an inline
  problem; success closes it and reports the actual completed count.
- Long tags wrap, the sheet scrolls within the viewport and every action retains a 44 px target at
  375 px.

## 4 — Derived consumers

One notebook reload after a successful commit re-derives every consumer from canonical items.
Search sees the new text; Cuaderno, Pages, Words & phrases and Collection capture widen an invalid
exact filter to All tags; Saved Gym targeting derives the replacement and resets an invalid setup
selection outside a live session. An already-started practice or Gym deck remains its existing
snapshot. No persistent filter, saved view or Gym subset preference exists to rewrite.

## Deliberately deferred

Multi-source merge, bulk selection, aliases, stable tag IDs, a stored tag registry, persistent
undo, batch-event grouping, saved tag views and automatic normalized cleanup remain outside Phase
20. A future saved-view feature must define its own stale-tag-reference behavior.

## Delivery sequence

1. Record this approved contract and the timestamp/event distinction.
2. Add one pure preview/transformation model with exact and order-preserving tests.
3. Add the atomic item/event/preference transaction with rollback, timestamp and backup proofs.
4. Add the Ajustes row action, management sheet, confirmations, optional export and reload wiring.
5. Verify derived filter/Gym behavior without adding stored references.
6. Run focused suites, deliberate failure proofs, the complete serial suite, production build,
   `git diff --check` and a disposable 375×812 browser closeout.
7. Update the report and current-state documentation. Nothing is pushed or deployed without a
   separate owner request.

Each completed feature slice receives its own commit. Subjective visual changes, if any become
necessary beyond reuse of the existing sheet pattern, remain separate from behavior.
