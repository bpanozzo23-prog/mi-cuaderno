# Phase 0.5 — data feasibility spike report

**Date:** 2026-07-31 · **Dataset version:** `kaikki-es-2026-07-25` (English Wiktionary dump 2026-07-06)

This is the phase gate described in brief §12. Read this, skim
[`pipeline/spike/out/07-review-records.md`](../pipeline/spike/out/07-review-records.md) (20 generated
records), and either confirm the locked data decisions hold or tell me which to amend.

## Verdict

**The locked data decisions hold. No brief amendments are required.** The pipeline ran end to end on
all four sources, every required test passed, and the full dictionary is far smaller than feared —
**2.8 MB gzipped**, not the tens of megabytes a 1 GB source file suggests.

Four things need a decision or are worth knowing; all are listed under *Decisions for you* below.
Everything else is recorded in [`DECISIONS.md`](../DECISIONS.md).

## What ran

Six scripts under `pipeline/spike/`, each runnable alone. Raw downloads (150 MB) land in
`pipeline/spike/raw/`, which is gitignored; scripts and small outputs are committed.

| Script | What it did |
|---|---|
| `01-download` | Fetched all 6 files; recorded size, sha256 and timestamp per source |
| `02-inspect-kaikki` | Surveyed all 807,155 records to find where glosses, gender, regional labels and forms actually live |
| `03-build-index` | Built the form→lemma index and canonical IDs |
| `04-form-lemma` | Aggregated OpenSubtitles token counts into lemma ranks |
| `05-build-sample` | Built 186 real entries; joined Jehle conjugations |
| `06-join-examples` | Attached 551 Tatoeba examples with full attribution |
| `07-report` | Size estimate, `DATA_SOURCES.md`, the 20 review records |

## The required tests

**Inflected search (§12) — all four pass:**

| Search | Resolves to |
|---|---|
| `fui` | **ir**, **ser** (both, correctly) |
| `tuvimos` | **tener** |
| `casas` | **casa**, casar, Casas |
| `rápidas` | **rápido** |

**Coverage.** 99% of the 1,000 most frequent tokens resolve to a lemma, 91.5% of the top 10,000, and
96.7% of all word occurrences in the corpus. The tokens that fail to resolve are almost entirely
English proper names left in the subtitle data (*john, jack, sam, michael*) — noise we don't want anyway.

**Conjugations.** Jehle covers 637 verbs; 35 of the 37 verbs in the sample matched. The two misses are
instructive and were exactly the case the plan set out to check: **`madrugar`** (a common, fully regular
`-ar` verb) and **`haber`**. Regular verbs like `madrugar` can be generated programmatically — with the
caveat below.

**Examples.** 185 of 186 entries (99.5%) got at least one Spanish↔English pair, 551 in total, and
**every single one carries its Tatoeba sentence ID, contributor name, license and URL** on both sides
of the pair. Nothing is attributed only by a generic thank-you.

**Size.** Measured by compacting and gzipping the real sample, then extrapolating to 10,000 lemmas:

| Part | Gzipped |
|---|---|
| Entries (senses + examples) | 1.34 MB |
| Conjugation tables (~1,985 verbs) | 0.76 MB |
| Search index (form→lemma) | 0.66 MB |
| **Total** | **≈ 2.8 MB** (~5 chunks of 600 KB) |

That is one small download, comfortably offline-able, and it makes the §11 chunked download simple.

## What the data turned out to be

Worth knowing, because these shaped the design:

- **The 1 GB file is mostly inflections, not words.** Of 807,155 records, only 116,333 are real lemmas;
  690,822 are inflected-form stubs pointing back at a lemma. That's a gift: the form→lemma index the
  brief needs is *already in the data*, from two complementary places (`forms[]` on lemmas, and the
  stubs' `form_of`). No guessing at morphology.
- **Regional labels are clean and plentiful.** 2,008 senses tagged `Mexico`, plus `Latin-America`,
  `Chile`, `Rioplatense`, `Colombia`, `Peru`, `Argentina`, `Cuba` and more — so the "Mexico-labeled
  senses first" rule works on real labels, not guesswork. 20 Mexico-flagged entries are in the review set.
- **Gender is available** for nouns, in two places (`head_templates` args and sense tags); 65 of the
  sample's entries carry one.

## Problems found, and what I did

Four real problems surfaced. All are fixed in the scripts; I'm flagging them because two changed a
decision the brief had left open.

**1. Canonical IDs collided — 990 of them.** Using `lemma + part of speech + etymology number` (the
brief's §6 recipe) was *not* unique. Two causes:

- *Case-folding.* Lowercasing the ID conflated proper nouns with common ones (FIFA/fifa). **Fix:** the
  ID now preserves case; case-insensitive matching is search's job, not identity's. Removed 50 collisions.
- *kaikki splits one entry across records.* `gallo` (noun) appears 3× — same word, same part of speech,
  same etymology — just different clusters of senses (*rooster* / *a fish* / *guy, dude*). **Fix:** these
  **merge** into one entry rather than becoming separate IDs, which is also how you'd expect to see
  `gallo` in a dictionary. 940 records merge into 920 entries.

**2. Frequency ranking was badly distorted — this was the important one.** Ranking naively put the
non-existent-to-a-learner verb `perar` at **rank 82** and `asir` at **121**, which would have wasted slots
in the top 10,000 on junk. Two causes:

- *`pero` really is a form of `perar`.* Wiktionary is right, but the token "pero" (the conjunction, one of
  the most common words in Spanish) was being split evenly across all three candidate lemmas, handing a
  rare verb ~790,000 occurrences.
- *Accent-stripping merged distinct words.* The very frequent adverb `así` and `asir`'s form `así` both
  normalize to "asi", so the rare verb inherited the adverb's count.

**Fix:** frequency aggregation now uses an **accent-sensitive** index (search keeps the accent-insensitive
one), and ambiguity is resolved **citation-form-first**: if a token is some lemma's own dictionary form,
only those lemmas score. Results:

| Lemma | Rank before | Rank after |
|---|---|---|
| `perar` (junk) | 87 | 14,462 |
| `asir` (rare) | 131 | 9,574 |
| `pero` (real) | 89 | **53** |
| `así` (real) | 117 | **55** |

The junk fell out of the top 10,000 and the real words moved up. The top 25 now reads like a genuine
Spanish frequency list (*el, estar, de, que, ser, en, un, yo, tener, no…*).

**3. Prose leaked into the index as if it were a word.** A few kaikki entries point at text like
*"deprecated in 1952 by the Royal Spanish Academy"* instead of a lemma. Filtered — narrowly, because
multiword targets are usually *legitimate* idioms (*dar atole con el dedo*, *pensar en la inmortalidad
del cangrejo*), which the brief wants as first-class items.

**4. Conjugation-table metadata was becoming searchable "words".** `es-conj` and `e-ie alternation` were
being indexed as forms of *tener*. Filtered by their tags. Reflexive forms like *me voy* were kept —
those are real, and searching them should work.

## Decisions for you

1. **Ambiguity policy — I recommend citation-form-first** (the table above). The alternative, splitting
   counts evenly, is what produced `perar` at rank 82. It is not perfect: for a token like *suelo*, the
   noun (*floor*) takes the count over the verb *soler*, but both land in the top 10,000 anyway from
   their other forms. Say the word if you'd rather I use a different rule.
2. **kaikki marks our source file "DEPRECATED".** It is still served, still current (extracted 5 days
   before download), and is *the only* kaikki file with Spanish headwords and **English** glosses, which
   §4 requires — the newer path is the Spanish-language Wiktionary, with Spanish glosses, which is not
   interchangeable. My recommendation is to proceed and re-check at the next dataset refresh. Flagging it
   because it's a dependency risk you should know about, not because it blocks anything.
3. **"Regular" verbs still need spelling rules.** `madrugar` is regular, but its preterite is *madrugué*,
   not *madrugé* — the `g→gu` change. Generating conjugations for the ~1,300 verbs Jehle lacks means
   implementing orthographic rules (`-gar`, `-car`, `-zar`, stem changes), not just endings. That's a
   Phase 2 task; I'm noting the scope now rather than discovering it later.
4. **Jehle is noncommercial (CC BY-NC-SA 3.0).** Already locked in the brief, restated here because it
   is the one license that constrains what this app may ever become. It's recorded at the top of
   `DATA_SOURCES.md`.

## What to look at

- **[`pipeline/spike/out/07-review-records.md`](../pipeline/spike/out/07-review-records.md)** — the 20
  records, readable: senses, Mexico labels, examples with attribution, and *ustedes*-first conjugations.
- **[`DATA_SOURCES.md`](../DATA_SOURCES.md)** — every dataset with its exact license, as §4 requires.
- `pipeline/spike/out/` — the machine-readable outputs behind every number above.

To re-run anything: `node pipeline/spike/0X-....mjs`. Scripts 03–07 run in order and take about four
minutes total; `01-download` skips files already present.
