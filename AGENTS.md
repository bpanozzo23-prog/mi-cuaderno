# Mi Cuaderno — Codex Project Instructions

## Project purpose

Mi Cuaderno is a personal Spanish dictionary and knowledge-management
notebook. It supports Spanish words, phrases, notes, examples, sources,
and links between related entries.

## Required project context

Before performing substantial work:

1. Read `CLAUDE.md` if it exists.
2. Read `docs/mi-cuaderno-project-brief-v3.md`.
3. Read `README.md`, `DECISIONS.md`, and the current phase documents:
   `docs/PHASE-4-DIRECTION.md` and `docs/PHASE-4-REPORT.md`.
4. Read earlier phase reports when the task touches work delivered in
   those phases.
5. Treat `docs/mi-cuaderno.jsx` as a look-and-feel reference only. Its
   local-storage, linking, state, and AI implementation are intentionally
   superseded by the brief and current application.
6. Inspect the existing architecture and data model before recommending
   or making changes.
7. Treat the project brief and newer project documents as the source of
   truth unless the user explicitly provides newer instructions. Dated
   phase reports may preserve historical counts or open acceptance items;
   use `README.md` and the newest phase report for current status.

## Current project state

- Phases 0, 0.5, 1, 2, and 3 are complete.
- Phase 4 (live-use polish) is in progress. Sub-phases 4a-4h have shipped:
  the linking package, quick-create-and-link, rich grouped link cards,
  tag suggestions, separate word/phrase filters, and multi-line meanings.
- Phase 4 linking requirement 7 (exact term/title suggestions while
  editing) is parked unless real-use friction justifies it.
- The owner's running friction list is the standing input for further
  Phase 4 work. Do not assume the next item is linking-related.
- Phase 5, the AI assistant, has not started.
- `SCHEMA_VERSION` is 1; no personal-data migration has yet been needed.
- Personal data is stored only in the browser in the `mi-cuaderno` Dexie
  database. The downloadable dictionary is stored separately in the
  A/B reference databases so replacing it cannot touch personal data.
- The user's real browser data is not available in Codex's test browser.

## Current architecture invariants

- Personal content has exactly two types: lexical items and pages. Words
  and phrases are both lexical items, distinguished by `form`.
- A dated page is a journal entry. Films, podcasts, books, grammar notes,
  and other sources are ordinary pages; there is no dedicated source type.
- Personal IDs are `user:<uuid>`. Dictionary IDs are namespaced `dict:`
  keys. A lexical item's optional `dictKey` is a reversible attachment,
  not its identity.
- Links are stored once in `linkedKeys[]` and backlinks are derived. Keys
  may point to personal items or dictionary entries; do not store a second
  reciprocal copy.
- Events are the source of truth for lookup counts, tricky state, review
  scheduling, and statistics. Do not add stored counters or a struggling
  flag.
- Dictionary entries are read-only. Personal items remain meaningful and
  usable if a dictionary attachment or link becomes orphaned.
- Personal backups are JSON replace-and-restore backups. The reference
  dictionary is replaceable and excluded from them.

## Working practices

- Preserve the existing architecture unless a broader change is clearly
  justified and explicitly approved.
- Do not alter the persistence format or storage schema without first
  explaining the migration and data-loss risks.
- Do not overwrite or delete browser data.
- Use the package manager indicated by the repository lockfile.
- Inspect existing components and utilities before introducing duplicates.
- Run the relevant available checks after code changes. The current package
  provides `npm test` and `npm run build`; it does not currently define lint
  or type-check scripts.
- Distinguish observed behavior from assumptions and anticipated risks.
- For audits, do not implement recommendations unless explicitly asked.

## Review expectations

When proposing changes, identify:

- the observed problem;
- the expected user value;
- the affected files or components;
- implementation effort and risk;
- whether the change fits the existing architecture;
- dependencies on ongoing Phase 4 work, the personal/reference data seam,
  storage or schema changes, deferred entry structure, or Phase 5 AI work.
