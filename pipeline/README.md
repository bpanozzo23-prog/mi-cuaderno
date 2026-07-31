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
node --max-old-space-size=6144 pipeline/build/check.mjs
```

| Step | Does |
|---|---|
| `01-download` | Fetches all six sources; records size, sha256, download date; runs the standing source re-checks (is the kaikki file still served, still marked DEPRECATED?) |
| `02-build-index` | Pass 1 over kaikki: the form→lemma index in two flavours (normalized for search, accent-sensitive for frequency) plus the inventory of real lemmas |
| `03-frequency` | Turns OpenSubtitles token counts into lemma ranks — citation-form-first, then ambiguous inflected tokens allocated by unambiguous evidence |
| `04-entries` | Pass 2 over kaikki: builds the ~10k DictEntry records, Mexico-first senses, joins Jehle conjugations |
| `05-examples` | Attaches ≤3 Tatoeba es↔en pairs per entry with full per-side attribution |
| `check` | Asserts the brief §12 acceptance list against the built data; exits non-zero on failure |

`01-download` skips files already present, so a rebuild costs about two minutes.

## Licensing

Every dataset's exact license is recorded in `sources.json` and rendered into the repo's
`DATA_SOURCES.md`. The Jehle conjugation database is **noncommercial** (CC BY-NC-SA 3.0)
and must never be relicensed together with the app code — see brief §4.
