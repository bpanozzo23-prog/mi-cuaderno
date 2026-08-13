# Phase 24 — Dictionary enrichment (report)

Implemented and verified locally on `codex/phase-24-dictionary-enrichment` on 2026-08-13. It has
not been pushed or deployed. The approved contract remains in
[PHASE-24-DIRECTION.md](PHASE-24-DIRECTION.md); durable choices are recorded under Phase 24 in
`DECISIONS.md`.

## What is implemented

| Area | Result |
|---|---|
| Dataset | Rebuilt `kaikki-es-2026-07-25-r3` as r4 while preserving the exact 10,278-entry ID surface and an empty alias map |
| Meanings | Each sense uses its most-specific nonblank gloss and may carry compact topics, synonyms, antonyms, and up to two short Wiktionary examples |
| Entry metadata | Optional entry synonyms/antonyms and one cleaned first-sentence etymology ship alongside dormant de-duplicated derived/related words |
| Display | Topic chips and sense relations/examples stay with their meaning; entry relations follow all senses; **Origin** precedes the existing Tatoeba examples |
| Compatibility | Optional fields pass through the existing entry rows. R3-shaped entries render without empty enrichment labels, and personal meaning import ignores the new fields |

No personal writer, field, preference, backup shape, event, search tier, schema migration, or
reference-store/index change was added. `SCHEMA_VERSION` remains 8, reference DB declaration
version remains 2, and dictionary manifest format remains 1.

## Data shaping and boundaries

- Relation words are plain NFC strings, whitespace-trimmed, de-duplicated in source order, and
  stripped of the entry headword at both entry and sense level. Dormant `relatedWords` combines
  Kaikki derived/related rows but is not rendered or treated as a dictionary key.
- Sense examples keep at most two rows, each at most 200 characters. Rows with an English
  translation sort first; a bare lemma is discarded. Their compact package shape is `[es]` or
  `[es, en]` and attribution remains visibly Wiktionary-derived.
- Etymology drops tree-only blocks, collapses whitespace, and stops after the first prose sentence
  without splitting at periods inside parentheses/brackets or common abbreviations.
- IPA and syllable breaks remain excluded. Synonyms and antonyms are noninteractive text; there is
  no word-family UI, relation navigation, English-index widening, or copying of Wiktionary examples
  into personal meanings.

## Package verification

The final package has 16 chunks totaling **4,262,074 bytes (4.06 MiB) gzipped**, below the approved
4.3 MiB ceiling. It contains:

- 10,278 entries and 21,680 senses;
- 4,100 Wiktionary sense examples and 28,210 existing Tatoeba entry examples;
- 9,144 etymologies and 7,312 entries with dormant related words;
- 1,771 conjugation tables, 223,500 searchable forms, 16,138 English index words, and 30 pattern
  families.

Before replacing r3, the package step reassembled its manifest-selected chunks and compared every
entry ID exactly. The final intermediate acceptance passes **40/40**, and the reassembled shipped
package passes **45/45** checks covering hashes, counts, lookups, attribution, conjugations,
patterns, r4 shape, target records, self-relation removal, identity, aliases, and size. Only the
manifest-selected r4 directory remains in `public/dict/`; r3 remains recoverable from Git history.

## Automated and deliberate verification

- Complete serial suite: **1,379/1,379 tests across 119 files** (`npm.cmd test`).
- Production build: passed; Vite transformed **2,105 modules** and generated the PWA.
- Focused pipeline/install/display/import boundary: 50/50 tests across four files.
- `git diff --check`: passed.

The required broken-on-purpose proof changed the visible **Origen:** label to **Origin:**. The rich
dictionary-detail test failed at the intended missing-label assertion, then passed again after the
Spanish label was restored. Pure shaping tests separately pin last-gloss selection, relation
de-duplication/self-removal, abbreviation-safe etymology trimming, and sense-example filtering.

## 375×812 browser closeout

A disposable local origin installed the real r4 package through Ajustes and exercised rich and
legacy-shaped dictionary entries. No owner browser data was available or inspected.

| Check | Evidence |
|---|---|
| Rich entry | *bicicleta* showed topic chips, sense examples, entry relations, and Origin; a dormant `relatedWords` sentinel did not render |
| Dense entry | *poner* showed 10 topic chips, 4 antonym lines, 8 synonym lines, 28 Wiktionary example-source labels, and Origin without horizontal overflow |
| Plain entry | *sabes* exposed none of the enrichment headings and retained its ordinary meaning display |
| Interaction boundary | Rich enrichment text contained zero buttons, links, or rich-text controls; relation and Origin rows wrapped within their 302px content width |
| Phone geometry | `innerWidth === 375`, `innerHeight === 812`, document/body scroll width stayed 360px, and the widest rendered right edge was 360px |
| Styling and console | Topic chips reused the neutral-band/muted palette with a solid border; the console contained zero warnings or errors |

Cleanup removed the installed dictionary and left the disposable origin at zero personal items and
zero events. The viewport was reset, browser tabs finalized, and the isolated development server
stopped. The final self-relation filter only shortens already-measured text rows; the package and
automated shipment checks were regenerated afterward.

## Deployment

Deployment requires a separate owner instruction. This branch is ready for review and remains
local; no push, merge to `main`, workflow run, or production smoke check is claimed.
