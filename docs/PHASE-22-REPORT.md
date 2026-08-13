# Phase 22 — Knowledge consolidation (report)

Implemented and verified locally on `codex/phase-22-knowledge-consolidation` on 2026-08-12. It has
not been pushed or deployed. The approved contract and accepted v1 trade-offs remain in
[PHASE-22-DIRECTION.md](PHASE-22-DIRECTION.md); durable choices are under Phase 22 in
`DECISIONS.md`.

## What is implemented

| Slice | Result |
|---|---|
| 22a — containment | Word detail lists saved Phrases containing its exact term or an unambiguous cloze-safe attached-verb form; Phrase detail derives the same rows in reverse and shows a differing surface such as `dar · da` |
| Shared matching | Cloze and containment use one exact-first Unicode token matcher with original offsets, accent folding, preserved ñ, whole-token safety, simple tenses, gerund, and participle |
| Optional reference seam | Attached entries resolve aliases read-only, conjugations load in one batch, and only observed form-shard postings are read to reject reference-wide ambiguity; any absent/orphaned/failed reference read falls back to exact personal terms |
| 22b — proposals | Individual personal meaning rows compare conservative English content-token sets; known POS conflicts reject, exact set equality and evidence rank at most three proposals, and every existing connection suppresses the pair |
| Confirmation | **You also know…** sits in **From your cuaderno** before and outside **Connections**. A proposal stores nothing; **Link as Similar meaning** alone calls the existing stored-once writer and the ordinary confirmed row replaces it after reload |
| 22c — recall | The Words & phrases hub shows a separate action only when a confirmed direct-edge prompt exists. Setup offers non-redundant 10/20/All sizes, always shuffles, then uses think → reveal → Again/Got it and at most one missed-only round |

No personal record shape, preference, backup envelope, event type, reference package, score,
schedule, automatic queue, or background job was added. `SCHEMA_VERSION` remains 8.

## Deliberate quality boundaries

- Containment never uses substring matching. Fixed high-noise function words stay out.
- Exact personal terms remain confident, but ambiguous inflections such as *fui* stay silent even
  when that omits a true *ir* relationship. Clitic-attached forms such as *dármelo* also stay
  silent. These are accepted v1 misses, not bugs to “fix” by matching inside tokens.
- Gloss overlap is a proposal heuristic, never synonym authority. Meanings are compared row by
  row; exact tokens only, Jaccard at least 0.5, no stemming, fuzziness, pooling, or transitive
  cluster inference.
- POS is deliberately sparse and best-effort: only two known, different values reject a pair.
- Phase 22 remembers no dismissal. A false *bank*-style proposal may return until content,
  ranking, or connectivity changes; adding durable rejection memory remains a separate backup and
  preference decision.
- Recall reveals only direct confirmed neighbors. It labels them **confirmed connections**, not
  exhaustive answers, and self-grades because an unrecorded answer may still be valid.

## Automated and failure-path verification

- Complete review-corrected serial suite: **1,343/1,343 tests across 113 files** (`npm.cmd test`,
  355.56 s).
- Production build: passed; Vite transformed **2,100 modules** and generated the PWA.
- `git diff --check`: passed.
- Focused 22a containment/cloze/reference/detail boundary: 98 tests across six files passed before
  its commit; its first required run failed because the new containment module did not exist.
- Focused 22b suggestion/relationship boundary: **64/64 across five files**; the authority test
  first failed because no **You also know…** surface existed.
- Focused 22c graph/hub/setup/session boundary: **50/50 across five files**; the direct-edge test
  first failed because the recall module did not exist.

The first complete run reached 1,340 passes and one failure in an untouched AiCard async UI
assertion after its preference write had already succeeded. AiCard passed 8/8 immediately in
isolation, and the review-corrected complete suite then passed 1,343/1,343. No unrelated timing
change was smuggled into this phase.

Tests pin exact/case/accent/punctuation matching, ñ, multiword runs, whole-token rejection,
conjugation forms, helpers/clitics/perfect auxiliaries, vosotros, stop words, ambiguous, empty, and
mismatched postings, optional-reference fallback, both containment directions and async
cancellation; gloss
tokenization, per-meaning isolation, the *bank* trap, sparse POS, ranking, caps, immutability, every
exclusion and explicit stored-once confirmation; and direct-only graph symmetry, cold start,
session snapshot, setup sizes, reveal, early finish, one missed round, and event-free completion.

## 375×812 browser closeout

A fresh port-specific local origin was verified empty, then seeded directly with seven personal
lexical fixtures and a three-entry disposable reference dictionary. This was a DOM and computed-
geometry check; no screenshot is claimed. No owner data was available or inspected.

| Check | Evidence |
|---|---|
| Containment | `dar` detail showed **Appears in 1 of your phrases** with *me da igual*; its Phrase detail showed **Built on words you know** and `dar · da` |
| Ambiguity | *me fui de casa* rendered no **From your cuaderno** section and no *ir*/*ser* assertion while the `fui` posting named both lemmas |
| Proposal placement | *enojado* showed *molesto*, gloss *angry*, and **Shared meaning: angry** at y=724.5 before Connections at y=922 |
| Authority | Before confirmation, both endpoints had no link and the log held four ordinary detail `view` events. After confirmation, only *enojado* owned one `linkedKeys` row plus one `similar_meaning` annotation; *molesto* owned no reciprocal copy, the proposal disappeared, and the event log remained the same four views |
| Recall launch | After confirmation the Words view offered **Similar-meaning recall · 2 prompts**. Its small setup offered only **All 2**, not redundant 10/20 choices; the unconfirmed cold start is pinned by the hub component test |
| Direct self-grading | The first prompt revealed only its confirmed neighbor and gloss. Again on one of two prompts produced `1/2`, then **Practice 1 missed prompt**; the missed pass completed `1/1` and offered no further recovery round |
| Focus and event boundary | One fixed study frame replaced app navigation. Start, reveal, both grades, recovery, finish, and return added no event; the final log still contained only the same four detail views |
| Phone geometry | The detail and hub documents measured 360px inside `innerWidth === 375`; study frames measured 375/375. Proposal, recall-launch, reveal, grade, close, size, recovery, and back actions measured 44–48px; no checked surface overflowed horizontally |
| Console | Zero warnings or errors |

All personal rows, events, preferences, reference rows, and the active reference pointer were
cleared afterward. Reload showed `0 palabras · 0 frases · 0 páginas`; the viewport was reset, tab
closed, and isolated server stopped.

## Still outside Phase 22

Dismissed-pair memory, morphological or AI synonym inference, ambiguity labels, clitic splitting,
transitive cluster answers, stored recall history/scores, automatic review insertion, and real-
notebook usefulness claims remain deliberately outside this release. Matching quality is moderate
risk and should be judged in owner use; durability risk stays low because every unconfirmed signal
is derived and disposable.

## Deployment

The owner approved the verified branch for release on 2026-08-12. `main` fast-forwarded through
the three Phase 22 slices and the review-fix commit to `022e1b6`; GitHub Pages run 31661654898
completed successfully. README Status and both affected Improvement Ideas statuses were then
synchronized to deployed reality.
