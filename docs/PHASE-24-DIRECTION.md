# Phase 24 — Dictionary enrichment (dataset r4)

**Status:** Approved, implemented, verified, and deployed from `main` at `da547fd` on 2026-08-13.
GitHub Pages run 31723115634 completed successfully. The dataset scope was owner-decided in the
field-selection workshop recorded in `DECISIONS.md`, and handing this document to the implementing
agent approved its proposed implementation details. Results are in
[PHASE-24-REPORT.md](PHASE-24-REPORT.md).
**Origin:** A measured census over the raw Kaikki dump, restricted to the shipped lemma set,
priced every field the pipeline currently drops (Improvement Ideas: "Unused dictionary fields
(shipped-lemma census)"). The owner then answered four scope questions choosing what ships.
**Implementer note:** Follow the ordinary read order (`AGENTS.md` / `CLAUDE.md` →
`docs/AGENT-GUIDE.md` → `README.md` Status) and re-verify this document's factual claims against
the repository before coding. Found a conflict? Raise it; do not deviate quietly.

## Outcome

One dataset rebuild (`kaikki-es-2026-07-25-r3` → `-r4`) enriches the shipped dictionary from the
same already-downloaded, already-attributed CC BY-SA sources — no new download, no new license:

1. **Sense-level synonyms and antonyms** on ~44% of entries, plus the rarer entry-level lists.
2. **Sense topic labels** (medicine, sports, nautical, …) rendered like existing label chips.
3. **First-sentence etymology** on ~89% of entries ("Inherited from Old Spanish *pie*, from
   Latin *pedem*.").
4. **Wiktionary sense-attached examples** on ~24% of entries — the one example type attached to
   a specific meaning, complementing the entry-level Tatoeba pairs.
5. **Dormant derived/related family data** (~70% of entries) with **no UI**, so the unapproved
   word-family explorer phase finds its data installed.
6. **Subsense gloss fix:** 175 nested senses currently ship the generic parent gloss
   (*teléfono*'s "rotary dial telephone" and "mobile phone" subsenses both ship as identical
   "telephone (…)"); ship the most specific gloss instead.

Owner-decided exclusions: **IPA and syllable breaks do not ship** (they may rejoin a later
rebuild). Measured expectation: ~+660 KB gzipped, total bundle ≈ 3.9–4.0 MB — knowingly past the
plan-era ~3.5 MB guideline, which the brief never fixed.

The personal layer is untouched: `SCHEMA_VERSION` stays 8; no new event type, preference, backup
shape, store, or index. The dictionary package remains replaceable per §5.

## Identity and the §5 seam

The rebuild reads the same raw dump with the same merge keys, so canonical entry ids are
unchanged — this is additive enrichment, not a refresh. Consequences to preserve and assert:

- The manifest's `previousIds` alias map stays empty, and personal `dictKey` attachments keep
  resolving. `check.mjs` must assert id stability (entry count 10,278 and spot-check known ids,
  e.g. *sacar*, against the current `public/dict/manifest.json` before it is overwritten).
- Synonyms, antonyms, and family words ship as **plain strings, never dict keys**. Nothing new
  references an entry id, so no orphan machinery, alias handling, or "not installed" state is
  created anywhere in this phase.

## What ships in the data

All field names below are **(proposed)**; absent fields are omitted from rows, matching the
existing compact-entry convention in `07-package.mjs`.

| Where | Field | Source in the Kaikki record | Shaping |
|---|---|---|---|
| entry | `etymology` | `etymology_text` | Trimmed to first sentence; see trim rule |
| entry | `synonyms` / `antonyms` | `synonyms[].word` / `antonyms[].word` | Entry-level lists (46 / 81 records) — rare but high-value (*trabajar* → *chambear, currar, faenar, jalar*); deduped strings |
| entry | `relatedWords` | `derived[].word` + `related[].word`, entry **and** sense level | Deduped union, entry-level first, lemma itself excluded; **no reader in the app** |
| sense | `synonyms` / `antonyms` | `senses[].synonyms[].word` / `.antonyms[].word` | Deduped strings, source order kept |
| sense | `topics` | `senses[].topics` | Deduped, source order kept |
| sense | `examples` | `senses[].examples[]` | Filter below; shipped compact as `[es, en?]` pairs |
| sense | `gloss` (fix) | `glosses[]` | Most specific gloss (last element) instead of `glosses[0]` |

**Etymology trim rule** (measured at 144 KB / 9,025 entries): if the text begins with an
"Etymology tree" block, drop lines until the first prose line (starts with *Inherited /
Borrowed / From / Unadapted / Learned / Compound / Doublet / …*); collapse whitespace; keep the
first sentence (up to the first `.` followed by whitespace or end); skip the field if nothing
survives. Refine edge cases at implementation, but two properties are acceptance-checked: no
shipped etymology contains "Etymology tree", and *gratis* ships exactly "From Latin grātīs.".

**Sense-example filter** (measured at ~230 KB with the ≤2 cap): keep examples with nonempty
`text` ≤ 200 characters, drop any equal to the bare lemma, sort translated (`english` present)
first, keep at most 2 per sense. Citation metadata (`ref`) is not shipped. These inherit the
dump's Wiktionary attribution (already rendered in Ajustes); they need no per-example contributor
line, unlike Tatoeba's.

**English index unchanged:** gloss tokens only. Sense-example text, synonyms, and etymology stay
out of `englishShards` — widening reverse lookup is not in scope.

## Display (proposed)

All rendering is read-only inside the existing entry screen (`src/components/DictDetail.jsx`),
guarded so entries without the new fields — including an installed r3 dataset — render exactly as
today. Everything is **non-interactive text in v1**: no taps, no navigation, no events, matching
the display-only-v1 pattern Phase 23 set. A "tap a synonym to look it up" increment is recorded
as future work, not built now.

Inside each sense block (the `entry.senses.map` region, near the existing region/label chips):

- **Topics** join the existing chip row as visually quieter chips (a muted variant token — no
  new hardcoded hex; add a token if one is missing).
- **Sinónimos:** / **Antónimos:** one muted line each, words separated by " · ".
- **Sense examples** render under the sense in the established example styling (Spanish, then
  English when present), with a small "Wiktionary" source note distinguishing them from the
  Tatoeba rows.

At entry level:

- **Entry-level Sinónimos / Antónimos** render as the same muted line style, placed after the
  senses list (they are not sense-specific; folding them into a sense would claim precision the
  source does not have).
- **Origen:** one muted serif line below the senses/entry-level relations and above the Ejemplos
  section.
- **`relatedWords` renders nowhere.** Dormant by owner decision until the word-family explorer
  phase designs its surface.

Phone-first: verify at 375 px with a synonym-heavy entry and a long etymology; lines wrap, no
horizontal overflow.

## Implementation shape

Pipeline (`pipeline/build/`):

- `sources.json`: bump `datasetVersion` to `kaikki-es-2026-07-25-r4`. Raw files are already
  present in `pipeline/raw/` (gitignored); `01-download.mjs` skips existing files.
- `04-entries.mjs`: the gloss fix plus all extraction/shaping above.
- `05`, `06`, `06b`: rerun unchanged (they consume step 4's output).
- `07-package.mjs`: extend `shipEntry` with the new optional fields; everything else (sharding,
  english index, chunking) unchanged. Extend `verify-package.mjs` if it validates entry shape.
- `08-report.mjs` / `sources.json` `provides`: note the new field kinds so `DATA_SOURCES.md`
  regenerates accurately.
- `check.mjs`: new acceptance assertions (below). Run order and heap flags per
  `pipeline/README.md`.

App (`src/`):

- `src/db/ref/entries.js`: pass the new fields through to consumers (attribution helpers
  unchanged).
- `DictDetail.jsx`: the display above. `src/test/dictFixture.js`: extend fixtures with the new
  fields so component tests can cover presence and absence.
- No `refdb.js` store or index change — the fields ride existing entry rows through the existing
  install/verify flow.

## Exclusions

IPA and syllable breaks (owner-decided out); any family/related-words UI; monolingual
definitions; english-index widening; tap-to-look-up navigation from synonyms; carrying a sense
example into Phase 12 meaning imports (natural later increment — it writes personal data and
needs its own decisions); any personal-layer or schema change.

## Delivery and acceptance

- `check.mjs` asserts, at minimum: entry count 10,278 with spot-checked stable ids against the
  previous manifest; *trabajar* carries entry-level synonym *chambear* and *gratis* carries
  sense-level synonym *gratuito*; *gratis* etymology is exactly "From Latin grātīs." and no
  shipped etymology contains "Etymology tree"; *teléfono*'s subsense glosses are distinct; every
  sense example obeys the ≤2-per-sense and ≤200-character rules; total gzipped bundle stays
  under 4.3 MB (expected ≈ 3.9–4.0 MB).
- The complete serial suite and production build pass; at least one new display test is proven
  by deliberately breaking the behavior it guards (the project's red/green habit).
- A disposable 375×812 fixture check shows each new section on a seeded rich entry, an entry
  without the fields rendering exactly as today, and no horizontal overflow; verify by computed
  styles and measurements, not screenshots.
- `public/dict/` ships the `-r4` directory in place of `-r3` (repository precedent keeps only
  the newest), the manifest points at r4 with empty `previousIds`, and `DATA_SOURCES.md` is
  regenerated — not hand-edited.
- Meaningful decisions get `DECISIONS.md` lines; deployment needs separate owner approval, and
  the same session that pushes to `main` updates `README.md` Status and moves the census idea
  entry to Implemented history (the 2026-08-11 rule).
