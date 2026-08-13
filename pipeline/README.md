# pipeline

Builds the bundled reference dictionary (brief §11, §12 Phase 2) from four open sources.
Nothing here runs in the app or ships to the phone — it produces the chunk files under
`public/dict/` that the app downloads on request.

## Layout

| Path | What it is |
|---|---|
| `build/` | the real pipeline, one numbered script per step |
| `lib/` | shared code: streaming IO, CSV, identity + normalization |
| `sources.json` | the source registry — URLs, licenses, exact license quotes, re-checks |
| `raw/` | downloads and large intermediates — **gitignored**, rebuildable |
| `out/` | small stats and reports — committed, the record of what each run produced |
| `spike/` | the Phase 0.5 feasibility spike, left as the historical record |

`normalize()` is imported from `src/lib/normalize.js` rather than copied: the pipeline
builds the index the app searches, so a second copy would eventually disagree about ñ.

## Running it

Scripts run in order and are individually re-runnable. Steps 02–05 need more than Node's
default heap:

```bash
node pipeline/build/01-download.mjs
node --max-old-space-size=6144 pipeline/build/02-build-index.mjs
node --max-old-space-size=6144 pipeline/build/03-frequency.mjs
node --max-old-space-size=6144 pipeline/build/04-entries.mjs
node --max-old-space-size=6144 pipeline/build/05-examples.mjs
node --max-old-space-size=6144 pipeline/build/06-conjugate.mjs
node --max-old-space-size=6144 pipeline/build/06b-conjugation-patterns.mjs
node --max-old-space-size=6144 pipeline/build/check.mjs
node --max-old-space-size=6144 pipeline/build/07-package.mjs
node --max-old-space-size=6144 pipeline/build/verify-package.mjs
node --max-old-space-size=6144 pipeline/build/check.mjs
node --max-old-space-size=6144 pipeline/build/08-report.mjs
```

| Step | Does |
|---|---|
| `01-download` | Fetches all six sources; records size, sha256, download date; runs the standing source re-checks (is the kaikki file still served, still marked DEPRECATED?) |
| `02-build-index` | Pass 1 over kaikki: the form→lemma index in two flavours (normalized for search, accent-sensitive for frequency) plus the inventory of real lemmas |
| `03-frequency` | Turns OpenSubtitles token counts into lemma ranks — citation-form-first, then ambiguous inflected tokens allocated by unambiguous evidence |
| `04-entries` | Pass 2 over kaikki: builds the ~10k DictEntry records, Mexico-first senses and optional r4 enrichment fields |
| `05-examples` | Attaches ≤3 Tatoeba es↔en pairs per entry with full per-side attribution |
| `06-conjugate` | Extracts kaikki conjugation tables and optionally validates them against Jehle without shipping Jehle data |
| `06b-conjugation-patterns` | Verifies teaching-pattern coverage and builds the reverse family rows used by verb detail |
| `check` | Asserts the brief and current-dataset acceptance list against intermediates and, after packaging, the size/alias gates |
| `07-package` | Compacts and shards the five reference stores, with an r3→r4 exact-ID gate before replacing the manifest |
| `verify-package` | Reassembles the actual chunks, checks hashes, searches, conjugations, patterns, attribution and r4 enrichment |
| `08-report` | Regenerates `DATA_SOURCES.md` and representative review records |

`01-download` skips files already present, so a rebuild costs about two minutes.

## Licensing

Every dataset's exact license is recorded in `sources.json` and rendered into the repo's
`DATA_SOURCES.md`. The Jehle conjugation database is **noncommercial** (CC BY-NC-SA 3.0), so it is
an optional build-time validation reference only: no Jehle row ships in the dictionary and its
license does not attach to the bundle — see brief §4.
