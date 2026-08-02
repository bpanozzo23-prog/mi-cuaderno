# Phase 5 — organizational improvements

**Approved by the owner, 2026-08-02.** Phase 5 turns the preliminary information-architecture
review into small, schema-v1 improvements that can be designed and verified without inspecting
the owner's real notebook. The AI assistant moves to Phase 6.

**Closeout update, 2026-08-02.** All six approved sub-phases, 5a–5f, are complete and deployed
from `main` at commit `079e0fb`. Phase 5 is now in real-use observation rather than active planned
development. The prospective language below is retained as the plan that governed the work; any
later Phase 5 addition will be scoped from the owner's live-use evidence and approved separately.
See `docs/PHASE-5-REPORT.md` for the implementation and verification record.

Phase 4 remains open as a friction-driven maintenance stream; 4a–4h are complete and its
exact-term/title link suggestions remain a deferred candidate, not Phase 5 scope. Phase 5 is the
active planned build. The two may stay open under brief §12's coordination rule because their
boundaries are explicit: Phase 4 reacts to observed daily-use friction, while Phase 5 delivers
the approved organizational sequence below. Overlapping files or behaviours are handled
sequentially rather than edited independently.

This phase preserves the current architecture: two personal content types, the event log as the
source of truth, one-sided `linkedKeys[]`, the personal/reference seam, transactional backup, and
the separate replaceable dictionary. `SCHEMA_VERSION` remains 1.

---

## Sequence

Each sub-phase is independently testable and committed. Later sub-phases may be adjusted when an
earlier one produces evidence, but nothing below requires real notebook data.

### 5a — navigation continuity

- Keep an in-memory trail when the owner deliberately opens related personal or dictionary
  entries.
- A linked destination opens at the top. **Atrás** returns through that trail; a root detail
  retains **Todo el cuaderno**.
- Leaving Cuaderno clears the trail so an old linked path cannot leak into another tab.
- Keep this state session-only. Do not add a router, URLs, browser-history integration, storage,
  or schema fields.
- Preserve Phase 4's quick-create contract: creating and linking inside the picker still does not
  navigate or discard the originating draft.

### 5b — organizational derivations

- Add pure, database-free helpers for browse ordering, contextual tag counts and neutral
  maintenance views.
- Initial browse orders: recently touched (the current order), recently added, and A–Z.
- Initial maintenance views: lexical items without a meaning, lexical items without personal
  examples, and items without links. “Without links” includes both stored links and derived
  backlinks.
- Keep search results ordered by §8 relevance. Never sort the shared `notebook.items` array,
  whose recency order also feeds the link picker.

### 5c — Cuaderno retrieval controls

- Expose 5b's browse order and maintenance views without persisting preferences in v1.
- Maintenance views are personal-only, so dictionary results stay out while one is active.
- Derive tag choices and counts from the active type/maintenance set before applying the chosen
  tag. Clear a tag if another filter makes it impossible.
- Replace the unbounded tag strip with a compact disclosure suitable for a 375 px viewport.
- Suggest and count existing tags; never normalize or rewrite stored spelling.

### 5d — actionable activity and consistent labels

- Active personal-item activity rows reopen that item. Deleted items and search misses remain
  non-actionable.
- Dictionary activity uses the existing alias/orphan seam and is never mislabeled “deleted”
  merely because it is not a personal item.
- Keep unknown event types harmless.
- Use labels that remain true for both lexical items and pages.

### 5e — scan-first detail pages

- Present saved notes and page bodies for reading first, with an explicit edit action.
- Keep empty example and media forms collapsed until the owner chooses to add something.
- Preserve every existing field and save behavior; this is presentation, not a content model.

### 5f — duplicate guardrails

- Warn when AddSheet or quick-create sees an exact existing personal heading of the same content
  type; do not hard-block legitimate homographs.
- Strong duplicate equality is case-insensitive and whitespace-cleaned but accent-sensitive:
  `si`/`sí`, `el`/`él`, and `tu`/`tú` may be distinct entries.
- A dictionary-only match never removes the option to create a personal item.
- Keep word/phrase terminology consistent across cards and pickers.

---

## Phase-wide acceptance criteria

- No personal data migration, backup-envelope change, new content type, stored counter, saved
  view, taxonomy, source subtype, structured sense, or typed link.
- Search ranking, event rules, link storage, quick-create draft preservation and dictionary
  orphan handling remain intact.
- Each visible sub-phase is verified with focused tests, the full test suite, a production build,
  and seeded browser checks at 375 px with no horizontal overflow or console errors.
- New behavioral tests are deliberately broken once to confirm that they can fail.
- Real-data-dependent decisions remain deferred: permanent source/page kinds, structured senses,
  relationship types, stored tag normalization, provenance and saved-view schemas.

## First implementation

Phase 5 starts with **5a only**. Its small navigation state is the prerequisite for later activity
links and gives the owner a complete, independently reversible improvement before list and detail
controls change.
