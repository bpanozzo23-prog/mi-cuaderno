# Phase 21 — What to notice and conjugation families (report)

Implemented and verified on `codex/phase-21-conjugation-patterns`, then fast-forwarded to `main`
and deployed 2026-08-12. The approved behavior and
boundaries remain in [PHASE-21-DIRECTION.md](PHASE-21-DIRECTION.md), and durable choices are in
`DECISIONS.md` under Phase 21.

## What shipped in the repository

| Piece | Result |
|---|---|
| Shared analysis | One browser-safe analyzer compares shipped paradigms with regular baselines and returns stable IDs, prioritized lessons, exact emphasis spans, and the three regular anchors |
| Evidence gate | A durable corpus report covers all 1,795 conjugable entry rows / 1,771 distinct lemmas before packaging |
| r3 package | `kaikki-es-2026-07-25-r3` keeps format v1, stores verified non-indexed pattern IDs on entries, and includes 30 discoverable `patternFamilies` rows |
| Reference v2 | A fifth primary-key store preserves the no-multi-entry-index rule; reads bulk-get only the current notices' rows and members |
| Atomic health | Every declared physical store count is checked before the A/B pointer flips, and a same-version r3 family-store mismatch offers an explicit repair |
| Teaching UI | **What to notice** leads the existing Conjugation card: two notices initially, exact non-color-only emphasis, four siblings initially, at most 20 after expansion, and an honest remainder |
| Personal context | Direct and `previousIds`-aliased cuaderno matches stable-partition first and receive a badge without rewriting personal data |
| Navigation | Sibling buttons use ordinary dictionary detail navigation, scroll to the top, log one deduplicated view per distinct entry, and leave the original one Atrás away |
| Package cleanup | Only the manifest-selected r3 directory remains under `public/dict`; 22.7 MiB of unreachable r2 chunks no longer copy into the Pages artifact |

Regular verbs show exactly one quiet hablar/comer/vivir anchor and never load a regular family.
Singleton lessons, including the measured u→ue behavior of *jugar*, teach without advertising
siblings. An r2 install still derives lessons from its tables while family rows remain silently
absent. Personal `SCHEMA_VERSION` remains 8; backups, preferences, personal records, and event
types are unchanged.

## Corpus and package proof

The corrected sweep passed with 1,151 exact regular lemmas, 592 noticed lemmas, 28 lower-frequency
unclassified lemmas, zero conflicting duplicate paradigms, and complete top-100 teaching output
(47 regular summaries plus 53 concrete notices). Thirty catalog patterns have at least two
members and became discoverable family rows; teaching-only and unused definitions did not.

The independent package verifier passed **34/34** checks over all 15 chunks: byte length and hash,
all five store counts, every entry assignment versus recomputation, known IDs, valid non-vosotros
evidence, every stem/gerund emphasis span at its analyzed replacement position, exact bidirectional
family equality, deterministic members, resolvable conjugable rows, top-100 output, and existing
search/licensing invariants. The package contains 10,278 entries,
1,771 conjugation tables, 30 family rows, 223,500 form postings, and 16,063 English words; it is
3.3 MB gzipped.

## Automated and failure-path verification

- Complete corrected final-tree serial suite: **1,310/1,310 tests across 107 files**
  (`npm.cmd test`, 293.99 s).
- Production build: passed; Vite transformed 2,094 modules and generated the PWA.
- Package verifier: **34/34 passed**.
- `git diff --check`: passed.
- Focused tests cover analyzer overlaps/deceptions, the three named regular anchors, pedir's one
  merged e→i lesson, exact structural stem/gerund positions, pronominal regular and irregular
  teaching, no collapsed evidence, top-100 output, singleton omission, r2 fallback,
  v1→v2 opening, five-store swaps and cleanup, interrupted install, same-version repair, notice
  and family disclosures, familiar/alias ordering, cross-notice deduplication, and App navigation.

Two required deliberate failures were demonstrated and restored:

1. Disabling the c→qu classifier made the verifier reject entry assignments, the reverse family,
   and top-100 teaching for *buscar*, *sacar*, *significar*, and *tocar*.
2. Reversing the familiar/unfamiliar partition made the named family-ordering test show ordinary
   members before both the direct and aliased cuaderno members.
3. During the correction pass, shifting the structural replacement index by one made the exact
   *pedir* test and the independent full-corpus position invariant fail before restoration.

The first complete suite then exposed that the richer Phase 21 `sacar` fixture had widened two
older Gym prompt pools. The added subjunctive row was isolated into a Phase 21-specific fixture;
the formerly failing Gym file passed 20/20, the affected Phase 21/App/database batch passed 52/52,
and the original complete suite then passed 1,306/1,306.

## Post-closeout correctness audit

An external review found that the first release candidate's valid, styled emphasis ranges could
still point at a repeated vowel in an ending. A complete corpus audit reproduced the exact failure:
128 of 620 stem/gerund evidence rows were misplaced, including `pid[i]eron`, `volvem[o]s`, and
`dic[i]endo`. The implementation now carries the replacement index already computed by the
analyzer into evidence construction instead of searching the rendered word. Range-exact examples,
a full-corpus invariant, and package verification independently protect that semantic position.

The same pass normalized the five shipped pronominal paradigms for structural comparison while
retaining their original display forms. *Personarse, quejarse,* and *entrometerse* now receive
regular anchors; *arrepentirse* joins `stem:e-ie_then_e-i`; *escabullirse* remains in the deferred
i-absorbing candidate set. r3 was regenerated and reverified because these assignments change the
package reverse mapping. The unreachable r2 public directory was removed.

## 375×812 browser closeout

A verified-empty disposable origin installed the real r3 package and exercised dictionary details
through visible controls at 375×812. No owner browser data was available or inspected.

| Check | Numerical/result evidence |
|---|---|
| Teaching depth | *tener* showed four lessons; the first two were initially visible, then all four expanded locally |
| Family cap | Its yo-go family expanded from 4 to exactly 20 visible siblings and reported 28 more |
| Phone targets | All 25 visible sibling buttons measured 44 px high; both visible disclosure controls measured 44 px |
| Evidence | The correction recheck showed `p[i]dieron` at its structural stem position; *arrepentirse* showed `me arrep[ie]nto · nos arrep[e]ntimos · se arrep[i]ntieron`. Every checked span was bold and underlined; no teaching strip contained `vosotros` |
| Layout | `innerWidth` was 375 and the scrolling document measured `scrollWidth === clientWidth === 360`; zero measured notice, evidence, family, or disclosure elements overflowed |
| Familiar ordering | After saving *bendecir* through the ordinary flow, it moved to the first yo-go sibling and displayed **In your cuaderno** |
| Navigation | *tener* → *hacer* opened at `scrollY === 0`; Atrás returned to *tener* at `scrollY === 0` |
| Boundaries | *hablar* and pronominal *quejarse* showed only their regular -ar anchor; *jugar* showed the u→ue lesson with zero siblings |
| Console | No warnings or errors were captured |

The corrected build was reinstalled on a fresh disposable origin at 375×812. Its visible evidence
had 44 px controls, `scrollWidth === clientWidth === 360`, zero measured overflow, and no console
warnings or errors. The disposable dictionary was removed through its two-step visible control,
the viewport was reset, the browser tab was closed, and the isolated local server was stopped.
This was a DOM/computed-geometry closeout rather than a screenshot claim.

## Deliberately deferred

Personal-entry notices, a standalone family browser, derivational word families, Gym integration,
stored pattern mastery, and learning scheduling remain outside Phase 21.
