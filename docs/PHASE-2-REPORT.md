# Phase 2 — dictionary pipeline and reference UI

**Date:** 2026-07-31 · **Dataset version:** `kaikki-es-2026-07-25` (English Wiktionary dump 2026-07-06)

This is the phase gate described in brief §12. The dictionary is built, packaged, downloadable,
and wired into search. Read the §12 checklist below, run the two things only you can run — the
20-entry read-through and the on-phone timing — and then either close the phase or tell me what
to change.

## Verdict

**Phase 2 is complete except for the two acceptance items that require your phone.** Everything
in the §12 "done when" list is implemented and verified on desktop; the dataset is 10,278 entries
and 3.3 MB gzipped, under the 3.5 MB budget.

Two things below want a decision from you, and one is a genuine opportunity rather than a problem:
Jehle's noncommercial licence may now be droppable.

## What shipped

| Sub-phase | What it does |
|---|---|
| 2a | The spike scaled up: `pipeline/build/` produces 10,278 entries with senses, gender, region labels and frequency ranks |
| 2b | Conjugations for **99.3%** of verbs, extracted from kaikki and validated cell-by-cell against Jehle |
| 2c | 14 chunks under `public/dict/`, with sha256s, an English index, and a regenerated `DATA_SOURCES.md` |
| 2d | Two reference databases, atomic version swap, resumable §11 download with progress |
| 2e | Search spanning both layers, `DictCard`/`DictDetail`, tier 3 live |
| 2f | Orphan handling, dictionary links, on-device speed measurement |

`npm test` runs **143 tests** (74 at the end of Phase 1). Every decision is in `DECISIONS.md`.

## The §12 checklist

| Required | Status |
|---|---|
| ~10k lemmas via form→lemma aggregation | ✅ 10,278 entries; policy stated in `DECISIONS.md` |
| Merged conjugations and ≤3 examples per entry | ✅ 1,771 tables; 28,210 examples, 95.9% of entries |
| Compact chunked output, §11 download flow | ✅ 14 chunks, 3.3 MB gzipped, atomic and resumable |
| Conjugations ustedes-first, vosotros collapsed | ✅ plus perfect tenses collapsed — 18 tenses at once is a wall |
| Mexico-labeled senses sorted first | ✅ 242 entries carry a Mexico sense |
| Form→lemma search index live | ✅ tier 3, 223,500 forms |
| `fui`, `tuvimos`, `casas`, `rápidas` resolve | ✅ verified in the browser (below) |
| "take out" surfaces *sacar*, labeled English | ✅ ranked first of 18 results |
| Dataset version visible in About | ✅ read from the installed manifest, not hard-coded |
| Every example carries source metadata | ✅ 0 examples missing a contributor or source id |
| Works fully offline after download | ✅ IndexedDB; service worker precaches 404 KB and ignores `dict/**` |
| **20 representative entries read correctly** | ⏳ **needs you** — see below |
| **Startup and search timing on your phone** | ⏳ **needs you** — one tap, see below |

### Verified on the deployed site

Everything below was run against <https://bpanozzo23-prog.github.io/mi-cuaderno/>, not just locally:

- **The download works over the real network:** 3.3 MB in 14 parts, **21 seconds** start to finish.
- **GitHub Pages does gzip the chunks**, which the plan flagged as an unverified assumption.
  Chunk 0 is 1.81 MB on disk and **547 KB on the wire**, `content-encoding: gzip`. This is why
  22.6 MB of JSON costs 3.3 MB to download and no compression code was needed.
- **It works with no network at all.** With `fetch` broken outright, "tuvimos" still resolves to
  *tener* — the dictionary answers from IndexedDB, as §11 requires.
- **Timing on the deployed build:** app ready in 875 ms (cold, over the network), search 25 ms
  median and 33 ms slowest.
- All seven §12 searches return the right lemmas with the right reasons.

### Verified in the browser, against the real dataset

```
fui       → ser (#1), ir (#27)        both "form of …"
tuvimos   → tener (#14)               "form of tener"
rápidas   → rápido (#651)             "form of rápido"
take out  → sacar (#299) first        "English meaning"
ano       → ano, anoche, anotar…      año is NOT among them
año       → año, añorar               ano is NOT among them
madrugué  → your own note on madrugar "form of madrugar"
```

That last line is the seam working. *madrugar* is a verb Jehle does not have, its preterite
`madrugué` carries the `g→gu` spelling change the spike flagged as the hard case, and because
your notebook item is attached to the dictionary entry, searching an inflected form the personal
layer knows nothing about surfaces **your note** rather than a duplicate dictionary card.

## Two things for you

### 1. Jehle may now be droppable — and that would remove the noncommercial restriction

The spike report flagged Jehle's CC BY-NC-SA licence as "the one license that constrains what
this app may ever become". Phase 2b changed the facts:

- kaikki's own conjugation tables cover **1,795 of 1,807** verbs; Jehle covers 554.
- Validated cell by cell on the 554 both sources have: **99.83% agreement across 57,580 cells**.
- Where they disagree, **kaikki is right**. `criáis`→`criais` and `frió`→`frio` are the 2010 RAE
  spelling reform, which Jehle predates. Jehle's `gradúéis` carries two accents, which Spanish
  orthography does not permit. `doler`'s negative imperatives are the literal string `"no "`.

So Jehle is now technically redundant. Dropping it would leave the dataset CC BY-SA throughout
and lift the noncommercial restriction from the whole app. I have **not** done it: §4 names Jehle
explicitly, and this is a licensing decision, not a technical one. Say the word either way.

### 2. kaikki still marks the source file DEPRECATED

Unchanged since the spike, re-checked at this build. It is still served and still the only kaikki
file with Spanish headwords and English glosses that §4 requires. Recommendation is unchanged:
proceed, re-check at every refresh.

## What you need to do

**Read 20 entries.** Open the app and look up a mix — everyday words, a few Mexico-flagged ones
(`chamba`, `güey`, `torta`, `chido`, `órale`, `antojito` are all in), some verbs, some nouns.
Check the senses read sensibly, verbs show conjugations, examples make sense. This is the one
acceptance item no test can stand in for.

**Tap "Test speed on this device"** in Ajustes → Dictionary. It reports startup time and the
median and slowest of six searches. For comparison: 875 ms startup and 25 ms median search on the
deployed site from a desktop browser. A phone will be slower — if it is in the same neighbourhood
the timing criterion is met; if it is much worse, send me the numbers and I will find where the
time goes.

**Download it on the phone.** 3.3 MB in 14 parts; it took 21 seconds here on a desktop
connection. Interrupting it mid-way should leave the app working and offer to resume — worth
trying deliberately, since that is the §11 guarantee that matters most on a phone.

## Numbers, for the record

| | |
|---|---|
| Entries | 10,278 (21,680 senses, 2.11 per entry) |
| With a gender | 6,420 |
| With a Mexico-labeled sense | 242 |
| Verbs / with a conjugation table | 1,807 / 1,795 (99.3%) |
| Conjugation validation vs Jehle | 99.83% of 57,580 cells |
| Examples | 28,210 across 9,854 entries (95.9%); 83.5% show the citation form |
| Examples missing attribution | **0** |
| Searchable forms / English words | 223,500 / 16,063 |
| Download | 3.3 MB gzipped (23.7 MB raw) in 14 chunks |
| Tests | 143 |

## Where things are

- `pipeline/build/` — scripts 01–08, each runnable alone; `check.mjs` and `verify-package.mjs`
  assert the §12 behaviour at full scale and against the shipped chunks.
- `pipeline/spike/` — untouched, the historical record of Phase 0.5.
- `public/dict/` — the manifest and the 14 chunks that actually ship.
- `src/db/ref/` — the reference layer: A/B databases, installer, reads, search.
- `DATA_SOURCES.md` — regenerated; every dataset with its exact licence, as §4 requires.
