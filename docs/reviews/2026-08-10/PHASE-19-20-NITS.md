# Phase 19/20 review nits (edge polish)

Dated polish observations, captured 2026-08-10; not an approved work order. Preserve resolved notes and confirm remaining findings against current code before planning.

### Phase 19/20 review nits (edge polish)

- **Date added:** 2026-08-10
- **Status:** Captured
- **Origin:** Independent code review of the committed Phase 19 and Phase 20 branches found no
  correctness bugs. Three minor observations were deliberately left unfixed (per the working
  agreement, reviews do not implement) and are recorded here so they are not lost.
- **Potential data impact:** None; each would be a small behavior or accessibility refinement.

Verify each against the current code before acting — any of these may already have been fixed or
made obsolete by later phases.

1. **Interleaved-order organizer save writes an event (Phase 19).** In `saveGrammarOrganization`
   (`src/db/pageStructures.js`), the no-op signature is computed from the *stored* section order
   but compared after depth-first canonicalization. If a valid interleaved backup was imported, a
   save-without-changes in the Grammar organizer canonicalizes the stored order and logs one
   `edit`, slightly bending "no-op organization is event-free". Only reachable after importing an
   interleaved backup, and canonicalizing storage is arguably a real change; fix or formally
   accept.
2. **Resolved 2026-08-10 — Note callout announced "Note" twice (Phase 19).** The explicit Notes
   callout increment replaced the Grammar aside's duplicate `aria-label` with `aria-labelledby`
   wired to the one visible label, and the shared renderer applies the same accessible name to
   Notes-family callouts.
3. **Rename/merge kind seam between preview and transaction (Phase 20).** `TagManagementSheet`
   decides rename-versus-merge from its `items` prop, while `applyGlobalTagChange` re-plans from
   live index queries inside the transaction. If the prop were ever stale, a button labeled
   "Rename tag" could execute what is actually a merge without the merge confirmation. Effectively
   unreachable in a single-owner app whose mutations reload the notebook, and the atomic re-plan
   is the right design; a cheap belt-and-braces option is having the writer compare the caller's
   expected `kind` and abort on mismatch.

---
