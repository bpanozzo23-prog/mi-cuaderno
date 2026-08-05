# Mi cuaderno

A personal Spanish notebook built around a bundled offline dictionary — a phone-first,
installable web app (PWA). Private tool for one person; the code is public, the data never is.

- **Brief:** [docs/mi-cuaderno-project-brief-v3.md](docs/mi-cuaderno-project-brief-v3.md) (the contract for this build)
- **Prototype:** [docs/mi-cuaderno.jsx](docs/mi-cuaderno.jsx) (look-and-feel reference for the notebook layer)
- **Decision log:** [DECISIONS.md](DECISIONS.md)
- **Improvement ideas:** [docs/IMPROVEMENT-IDEAS.md](docs/IMPROVEMENT-IDEAS.md) (captured
  possibilities, not an approved roadmap)
- **Agent workflow:** [docs/AGENT-GUIDE.md](docs/AGENT-GUIDE.md) (shared by Claude Code and Codex)

## Status

**Live at <https://bpanozzo23-prog.github.io/mi-cuaderno/>** — installable from Chrome on Android.

- **Phase 0 — done.** Installable PWA shell, auto-deployed on every push to `main`.
- **Phase 0.5 — done, reviewed.** Data pipeline proven end to end on all four sources;
  see [docs/PHASE-0.5-SPIKE-REPORT.md](docs/PHASE-0.5-SPIKE-REPORT.md) and the 20 generated records in
  [pipeline/spike/out/07-review-records.md](pipeline/spike/out/07-review-records.md).
- **Phase 1 — done.** The notebook itself, in four subphases: data foundation and backup (1a),
  words, phrases and pages (1b), search and linking (1c), tracking and Repaso (1d).
- **Phase 2 — done.** The bundled dictionary: 10,278 lemmas with conjugations and examples,
  installed offline in one explicit download, and two-layer search where an inflected form
  finds its lemma. See [docs/PHASE-2-REPORT.md](docs/PHASE-2-REPORT.md).
- **Phase 3 — done.** The Leitner review queue, derived entirely from the event log.
  See [docs/PHASE-3-REPORT.md](docs/PHASE-3-REPORT.md).
- **Phase 4 — ongoing maintenance.** Live-use polish driven only by friction observed in daily use.
  The linking package (4a–4e) and first friction batch (4f–4h) shipped. Structured personal
  meanings (4i) are shipped and browser-verified. Persistent page profiles and the first
  specialized profile, Vocabulary Collection (4j–4o), are shipped and production-verified after
  the complete serial suite plus disposable local and production 375×812 browser flows. The
  migration-free Diario workspace (4p–4s) is shipped after the complete serial suite, a disposable
  local 375×812 closeout, and a successful GitHub Pages deployment check. Typed and explained
  ordinary Connections (4t–4x) are shipped on schema v4 after the complete serial suite, production
  build, and a successful GitHub Pages deployment check; the disposable 375×812 browser closeout
  remains pending because the local browser-control kernel could not initialize. Lexical-side
  **Add to Collection** (4y) is shipped without a schema change after the 501-test serial suite,
  production build, and a successful GitHub Pages deployment check; its disposable phone check is
  pending for the same browser limitation. Source and Grammar were deferred from this maintenance
  stream and are now implemented locally as Phase 7; richer stored Journal profiles,
  user-authored templates, and exact term/title link suggestions remain deferred. See
  [docs/PHASE-4-JOURNAL-DIRECTION.md](docs/PHASE-4-JOURNAL-DIRECTION.md) and
  [docs/PHASE-4-REPORT.md](docs/PHASE-4-REPORT.md).
- **Phase 5 — done.** Organizational improvements that do not require real notebook data:
  navigation continuity (5a), organizational derivations (5b), Cuaderno retrieval controls (5c),
  activity navigation (5d), scan-first detail pages (5e), and duplicate guardrails (5f).
  Its planned work is kept separate from Phase 4's friction-only maintenance stream. See
  [docs/PHASE-5-DIRECTION.md](docs/PHASE-5-DIRECTION.md) and
  [docs/PHASE-5-REPORT.md](docs/PHASE-5-REPORT.md).
- **Phase 6 — not started.** The AI assistant (brief §9).
- **Phase 7 — implemented locally; automated verification passed.** Schema v5 replaces the
  exclusive General/Collection profile with composable Notes, Vocabulary, Source, and Grammar
  behavior while retaining only lexical items and pages. The implementation includes sequential
  legacy migration and backup validation, one unified page workspace, family-first creation,
  Source captures, Grammar guides with exact Source references, and contextual retrieval. The full
  serial suite passes 593/593 tests across 58 files, the Vite production build passes, and
  `git diff --check` passes. The disposable 375×812 browser closeout remains unverified because the
  in-app browser could not bootstrap. Phase 7 has not been pushed or deployed. See
  [docs/PHASE-7-DIRECTION.md](docs/PHASE-7-DIRECTION.md) and
  [docs/PHASE-7-REPORT.md](docs/PHASE-7-REPORT.md).

`SCHEMA_VERSION` is **5**. Before Dexie opens v5, schema-v1 through schema-v4 owners must save and
acknowledge an untouched validated export. Direct legacy upgrades run meanings, page-profile,
relationship, and composable-page migrations in order. Backup schemas 1 through 5 are accepted,
upgraded sequentially in memory, deeply validated as v5, and only then offered for
replace-and-restore; newer versions remain blocked.

## Testing

```
npm test        # Vitest over the data layer, UI navigation, search, review, linking and the pipeline
```

The database tests run the real Dexie code against an in-memory IndexedDB
(`fake-indexeddb`), so they exercise what ships rather than a mock. The pipeline is tested too,
because its conjugation extractor decides what ~1,250 verbs conjugate like. A handful of
component tests opt into `jsdom` per file; everything else runs in plain Node.

## Development

```
npm install     # once
npm run dev     # local preview
npm run build   # production build into dist/
```

Pushing to `main` builds and deploys automatically to GitHub Pages via
[.github/workflows/deploy.yml](.github/workflows/deploy.yml).

## Data

Reference-layer data (dictionary, conjugations, examples, frequency) comes from open sources,
each with its exact license recorded in `DATA_SOURCES.md` (generated by the pipeline from
Phase 0.5 onward). Personal notebook data lives only on-device and is never committed.
