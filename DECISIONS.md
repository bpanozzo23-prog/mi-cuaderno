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

## Phase 0.5 — data spike (2026-07-31)

- 2026-07-31 — Dictionary source is `kaikki.org/dictionary/Spanish/…jsonl.gz` (English Wiktionary, English glosses), despite kaikki labelling it DEPRECATED. — It is the only kaikki file matching brief §4; the newer `downloads/es/` path is the *Spanish* Wiktionary with Spanish glosses and is not interchangeable. Re-check at each dataset refresh.
- 2026-07-31 — Canonical IDs preserve letter case in the lemma part. — Lowercasing conflated proper nouns with common ones (FIFA/fifa); removed 50 of 990 ID collisions. Case-insensitive matching belongs to search, not identity.
- 2026-07-31 — kaikki records sharing word+pos+etymology are MERGED into one entry, not given distinct IDs. — kaikki splits e.g. `gallo` (noun) across 3 records that are one dictionary entry; merging matches how the entry should read. Resolves the remaining 940 collisions.
- 2026-07-31 — Frequency aggregation uses an accent-SENSITIVE form index; search keeps the accent-insensitive one. — Sharing one index let the frequent adverb `así` credit its count to the rare verb `asir` (rank 121).
- 2026-07-31 — Ambiguity policy for token→lemma frequency is **citation-form-first**: if a token is some lemma's own dictionary form, only those lemmas score it. — Even-splitting handed the conjunction `pero`'s corpus count to the rare verb `perar`, ranking it 82nd. Citation-first drops `perar` to 14,462 and lifts the real `pero` to 53. Owner may override; noted in the spike report.
- 2026-07-31 — Form-index filters: reject `form_of` targets matching /^deprecated in \d{4}/, and forms tagged `inflection-template`, `class`, or `table-tags`. — These are prose and conjugation-table metadata (`es-conj`, `e-ie alternation`), not words. Kept deliberately narrow so real multiword idioms and reflexive forms (`me voy`) survive.
- 2026-07-31 — `unbzip2-stream` added as a dev dependency. — Tatoeba ships `.bz2`, which Node cannot decompress natively; a pure-JS decoder avoids depending on a system `bzip2` binary.
- 2026-07-31 — Full-dictionary size measured, not estimated: ~2.8 MB gzipped for 10k lemmas (entries 1.34 + conjugations 0.76 + search index 0.66). — Confirms the §11 chunked download is straightforward (~5 chunks of 600 KB).
- 2026-07-31 — Phase 2 scope note: generating conjugations for verbs Jehle lacks requires orthographic rules (`-gar`/`-car`/`-zar`, stem changes), not just endings — `madrugar` → `madrugué`. — Recorded now so it is not discovered mid-Phase-2. — All are one dependency chain inside the build tool (`vite-plugin-pwa` → workbox → old `brace-expansion`); build-time only, nothing ships to the app; the offered fix downgrades the PWA plugin.
