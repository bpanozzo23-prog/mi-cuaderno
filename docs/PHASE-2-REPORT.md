# Phase 2 — dictionary pipeline and reference UI

**Date:** 2026-07-31 · **Dataset version:** `kaikki-es-2026-07-25` (English Wiktionary dump 2026-07-06)

This is the phase gate described in brief §12. The dictionary is built, packaged, downloadable,
and wired into search. Read the §12 checklist below, run the two things only you can run — the
20-entry read-through and the on-phone timing — and then either close the phase or tell me what
to change.

## Verdict

**Phase 2 is complete except for one acceptance item: reading 20 entries and judging that they
read well.** Everything else in the §12 "done when" list is implemented and verified, including
the on-phone timing. The dataset is 10,278 entries and 3.3 MB gzipped, under the 3.5 MB budget.

The licensing question raised here is now **resolved**: Jehle is out of the shipped data and the
dictionary carries no noncommercial restriction. Details below.

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
| Startup and search timing on the owner's phone | ✅ **28 ms to ready, 88 ms first paint, 7 ms median search, 9 ms slowest** |

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

### 1. ~~Jehle may now be droppable~~ — RESOLVED: Jehle dropped, noncommercial restriction gone

**Decided 2026-07-31. Dataset `kaikki-es-2026-07-25-r2` ships every conjugation table extracted
from kaikki. The whole bundle is now CC BY-SA / CC BY, with no noncommercial restriction** — the
one licence the spike report called "the one license that constrains what this app may ever become".

Measured before deciding, so the choice rested on facts rather than preference:

| | |
|---|---|
| Verbs Jehle covered that would lose their table | **0** of 546 |
| Cells that would be lost | **0** |
| Coverage before / after | 1,795 tables — identical |

And removing it **improved** the data. Jehle was primary for the verbs it covered, so its errors
were the ones on the phone:

| Verb | Was (Jehle) | Now (kaikki) | |
|---|---|---|---|
| `freír` | frió | **frio** | 2010 RAE spelling reform, which Jehle predates |
| `criar` | criáis | **criais** | same |
| `graduar` | gradúéis | **graduéis** | two accents, which Spanish orthography forbids |
| `arrepentirse` | arrepentáis | **arrepintáis** | missed stem change |

Jehle is retained as a **build-time validation reference only** — the extractor is still compared
against it cell by cell (99.83% across 57,580 cells, gate at 99.5%), which is the one real benefit
it offered and does not require shipping any of its content. The CSV is never committed, and the
build still runs without it, saying loudly that the tables are unchecked.

Brief §4 is amended inline to match, with the original text struck through rather than deleted.

*One correction to an earlier claim of mine:* I described all 98 disagreeing cells as shipped
differences. They were not — 61 are perfect tenses, composed from *haber* for both sources, so
Jehle's versions (including `cepillar`'s corrupt "cepillía cepillado") never shipped. The real
delta was ~37 simple-tense cells across 19 verbs. Same conclusion, smaller number.

### 2. kaikki still marks the source file DEPRECATED

Unchanged since the spike, re-checked at this build. It is still served and still the only kaikki
file with Spanish headwords and English glosses that §4 requires. Recommendation is unchanged:
proceed, re-check at every refresh.

## What you need to do

**Read 20 entries.** Open the app and look up a mix — everyday words, a few Mexico-flagged ones
(`chamba`, `güey`, `torta`, `chido`, `órale`, `antojito` are all in), some verbs, some nouns.
Check the senses read sensibly, verbs show conjugations, examples make sense. This is the one
acceptance item no test can stand in for.

~~**Tap "Test speed on this device."**~~ **Done — and comfortably fast.** On the owner's phone:
app ready in **28 ms**, first paint **88 ms**, search **7 ms median / 9 ms slowest**. Better than
the deployed desktop figures (875 ms / 25 ms / 33 ms), which carried a cold network load. The §12
timing criterion is met.

**Take the r2 update on the phone.** Ajustes → Dictionary will offer it. The swap is atomic: it
downloads into the unused slot and flips only when every chunk has verified, so an interruption
leaves the working dictionary intact. Worth interrupting deliberately once — that is the §11
guarantee that matters most on a phone.

## Numbers, for the record

| | |
|---|---|
| Dataset version | `kaikki-es-2026-07-25-r2` |
| Licence of everything distributed | CC BY-SA / CC BY — **no noncommercial restriction** |
| Entries | 10,278 (21,680 senses, 2.11 per entry) |
| With a gender | 6,420 |
| With a Mexico-labeled sense | 242 |
| Verbs / with a conjugation table | 1,807 / 1,795 (99.3%), all kaikki-derived |
| Conjugation validation vs Jehle (build-time only) | 99.83% of 57,580 cells, 546 verbs |
| Examples | 28,210 across 9,854 entries (95.9%); 83.5% show the citation form |
| Examples missing attribution | **0** |
| Searchable forms / English words | 223,500 / 16,063 |
| Download | 3.3 MB gzipped (22.7 MB raw) in 15 chunks |
| Phone: ready / search | 28 ms / 7 ms median |
| Tests · package checks | 143 · 24 |

## Where things are

- `pipeline/build/` — scripts 01–08, each runnable alone; `check.mjs` and `verify-package.mjs`
  assert the §12 behaviour at full scale and against the shipped chunks.
- `pipeline/spike/` — untouched, the historical record of Phase 0.5.
- `public/dict/` — the manifest and the 15 chunks that actually ship.
- `src/db/ref/` — the reference layer: A/B databases, installer, reads, search.
- `DATA_SOURCES.md` — regenerated; every dataset with its exact licence, as §4 requires.
