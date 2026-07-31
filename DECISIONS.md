# Decisions log

One line per meaningful choice: date — decision — reason.

- 2026-07-30 — Adopted brief v3 (`docs/mi-cuaderno-project-brief-v3.md`) as the contract; Phase 0 + 0.5 plan approved before any code. — §2 working agreement.
- 2026-07-30 — Repo is public, named `mi-cuaderno`. — GitHub Pages is free on public repos; personal data never enters the repo (it lives only in the device's browser storage).
- 2026-07-30 — Brief and prototype committed under `docs/`. — They contain no personal data and are the project's reference documentation.
- 2026-07-30 — Node.js 24 LTS installed via winget; single toolchain for both the app and the data pipeline. — One language (JS) everywhere; no Python dependency.
- 2026-07-30 — Tailwind v4 via the `@tailwindcss/vite` plugin. — Current stable major; no PostCSS config file needed.
- 2026-07-30 — PWA service worker uses `autoUpdate`. — App shell updates silently on redeploy; notebook data is unaffected because it lives in browser storage, not in the app files.
- 2026-07-30 — Manifest `theme_color`/`background_color` = paper `#FAF9F4`; icons are generated placeholders (blue tile, serif M, highlighter swipe). — Matches prototype design tokens; icons swappable later without config changes.
- 2026-07-30 — App-code license: deferred (repo currently has no LICENSE file). — Data licenses are the urgent part (§4); code license decision can wait for the owner.
- 2026-07-30 — `npm audit`'s 8 "high" findings left unfixed. — All are one dependency chain inside the build tool (`vite-plugin-pwa` → workbox → old `brace-expansion`); build-time only, nothing ships to the app; the offered fix downgrades the PWA plugin.

- 2026-07-31 — GitHub Pages had to be enabled once by hand (`gh api --method POST /repos/.../pages -f build_type=workflow`); the workflow's `configure-pages` with `enablement: true` cannot create the Pages site itself. — The built-in `GITHUB_TOKEN` lacks that permission, so the first deploy failed with "Resource not accessible by integration". Subsequent pushes deploy automatically; `enablement: true` is kept because it succeeds once the site exists. Repo: `bpanozzo23-prog/mi-cuaderno`.

## Phase 0.5 — data spike (2026-07-31)

- 2026-07-31 — Dictionary source is `kaikki.org/dictionary/Spanish/…jsonl.gz` (English Wiktionary, English glosses), despite kaikki labelling it DEPRECATED. — It is the only kaikki file matching brief §4; the newer `downloads/es/` path is the *Spanish* Wiktionary with Spanish glosses and is not interchangeable. Re-check at each dataset refresh.
- 2026-07-31 — Canonical IDs preserve letter case in the lemma part. — Lowercasing conflated proper nouns with common ones (FIFA/fifa); removed 50 of 990 ID collisions. Case-insensitive matching belongs to search, not identity.
- 2026-07-31 — kaikki records sharing word+pos+etymology are MERGED into one entry, not given distinct IDs. — kaikki splits e.g. `gallo` (noun) across 3 records that are one dictionary entry; merging matches how the entry should read. Resolves the remaining 940 collisions.
- 2026-07-31 — Frequency aggregation uses an accent-SENSITIVE form index; search keeps the accent-insensitive one. — Sharing one index let the frequent adverb `así` credit its count to the rare verb `asir` (rank 121).
- 2026-07-31 — Ambiguity policy for token→lemma frequency is **citation-form-first**: if a token is some lemma's own dictionary form, only those lemmas score it. — Even-splitting handed the conjunction `pero`'s corpus count to the rare verb `perar`, ranking it 82nd. Citation-first drops `perar` to 14,462 and lifts the real `pero` to 53. Owner may override; noted in the spike report.
- 2026-07-31 — Form-index filters: reject `form_of` targets matching /^deprecated in \d{4}/, and forms tagged `inflection-template`, `class`, or `table-tags`. — These are prose and conjugation-table metadata (`es-conj`, `e-ie alternation`), not words. Kept deliberately narrow so real multiword idioms and reflexive forms (`me voy`) survive.
- 2026-07-31 — `unbzip2-stream` added as a dev dependency. — Tatoeba ships `.bz2`, which Node cannot decompress natively; a pure-JS decoder avoids depending on a system `bzip2` binary.
- 2026-07-31 — Full-dictionary size measured, not estimated: ~2.8 MB gzipped for 10k lemmas (entries 1.34 + conjugations 0.76 + search index 0.66). — Confirms the §11 chunked download is straightforward (~5 chunks of 600 KB).
## Phase 1a — data foundation (2026-07-31)

- 2026-07-31 — Dexie schema v1: `items (id, type, term, title, updatedAt, *tags, *linkedKeys)`, `events (id, at, localDate, itemKey, type)`, `prefs (key)`. — Multi-entry indexes on `tags` and `linkedKeys` make "items with tag T" and "items linking to key K" single indexed lookups instead of full scans; the latter is what computes backlinks and cleans up on delete.
- 2026-07-31 — Personal-layer timestamps are ISO-8601 strings, not epoch numbers. — They sort correctly as strings and are readable inside a backup file, which is the format the owner may one day have to repair by hand.
- 2026-07-31 — Reference-layer tables are deliberately absent from schema v1; Phase 2 adds them as separate stores. — Enforces the §5 rule that rebuilding the dictionary can never touch personal data.
- 2026-07-31 — Backup validation rejects an envelope whose `schemaVersion` is newer than the app's. — A newer file may contain fields this version would silently drop on import; better to ask the owner to update the app.
- 2026-07-31 — Duplicate *item* ids in a backup are a hard error; duplicate *event* ids are skipped. — §10 specifies skipping for events; for items there is no safe choice between two records claiming the same identity, so the import stops rather than guess.
- 2026-07-31 — Ajustes (settings) occupies the third tab until Phase 5, when Asistente joins. — Backup is the disaster-recovery mechanism (§10); it needs a permanent home from day one, not a menu.
- 2026-07-31 — Vitest + fake-indexeddb for tests (`npm test`). — fake-indexeddb runs the real Dexie code in Node, so the database tests exercise what ships rather than a mock.
- 2026-07-31 — `vite.config.js` dev server honours `process.env.PORT`. — Lets tooling assign a free port when the default 5173 is already taken.

## Phase 1c — search and linking (2026-07-31)

- 2026-07-31 — Links are stored once, on the item where the link was made; the reverse direction is computed from the `*linkedKeys` index. — The prototype wrote both sides, which cannot work in Phase 2: links will point at read-only dictionary entries that cannot store a reciprocal link. One mechanism has to serve both, so it is built that way now. The owner never sees which side stores it — both detail screens show one "Linked" list.
- 2026-07-31 — Search ranking reserves tier 3 for the Phase 2 inflected-form index, unused in Phase 1. — Keeps the tier numbers identical to brief §8, so personal and dictionary results interleave correctly when the reference layer arrives, with no renumbering.
- 2026-07-31 — An exactly typed accent outranks an accent-blind match (`sacó` typed in full ranks `sacó` above `saco`). — §8 orders exact above accent-normalized; comparing the raw strings before normalizing is what makes that distinction possible.
- 2026-07-31 — `search_miss` is logged only after typing settles (1.5 s) and stays unlogged for a query already recorded this page session. — §7 wants "words I couldn't find", not a keystroke log: typing "chamarra" letter by letter must produce one miss, not eight.
- 2026-07-31 — Searching ranks within the active type/tag filters rather than ignoring them. — A visible filter that search silently overrode would look broken.
- 2026-07-31 — Linking and unlinking do not log an `edit` event. — `edit` marks content the owner changed; links are bookkeeping, and logging them would inflate the activity feed.
- 2026-07-31 — `.gitignore` covers `mi-cuaderno-backup-*.json` and `before-import-*.json`. — Exports land in the working directory by default and contain the entire notebook; the repo is public.

## Phase 1d — tracking and Repaso (2026-07-31)

- 2026-07-31 — `SESSION_WINDOW_MINUTES = 30`, and the check-then-write in `logView` runs inside one Dexie transaction. — Without the transaction, two calls arriving together (React re-invoking the effect in development, or a double-tap) both read "no view yet" and both write one — the exact inflated count the window exists to prevent. Found in the browser, now pinned by a test.
- 2026-07-31 — `logEvent` takes the timestamp as an argument rather than reading the clock itself. — `logView` compares elapsed time against an injected clock; if the write then stamped a different clock, the two disagreed. A test caught it.
- 2026-07-31 — Repaso derives every number at render time from the event log; nothing is cached or counted incrementally. — §7 makes the log the single source of truth. A personal notebook is small enough that recomputing is free, and one code path means the screen can never disagree with the log.
- 2026-07-31 — Events belonging to deleted items stay in the log but are excluded from stats by filtering against the surviving item keys. — §7: keep the history, exclude it from active queues and statistics.
- 2026-07-31 — Repaso shows a "searched for, not found" list from `search_miss` events already in Phase 1d, ahead of its Phase 4 slot. — The events were being logged from 1c onward; surfacing them cost a few lines and made the log visible to the owner rather than invisible until Phase 4.

- 2026-07-31 — Phase 2 scope note: generating conjugations for verbs Jehle lacks requires orthographic rules (`-gar`/`-car`/`-zar`, stem changes), not just endings — `madrugar` → `madrugué`. — Recorded now so it is not discovered mid-Phase-2. — All are one dependency chain inside the build tool (`vite-plugin-pwa` → workbox → old `brace-expansion`); build-time only, nothing ships to the app; the offered fix downgrades the PWA plugin.
