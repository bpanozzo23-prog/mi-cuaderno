# Phase 25 — Historia word families (report)

Phase 25a is implemented and verified locally on `codex/phase-25-conjugation-family`; the feature
commit is `8b3c85b`. It is not pushed or deployed. Phase 25b stopped at its mandatory data-quality
gate before UI work. The approved contract and gate details remain in
[PHASE-25-DIRECTION.md](PHASE-25-DIRECTION.md).

## Outcome

| Slice | Result |
|---|---|
| 25a — conjugation family | Implemented in lexical Historia for attached words |
| 25b — derivational family | Rejected before implementation; r4 `relatedWords` remains dormant |
| Personal data | No field, migration, preference, backup, event, counter, or write path; schema stays v8 |
| Reference data | No package, store, index, manifest, or dataset change |

Historia now shows **Familia de conjugación** when an attached word resolves to a dictionary verb
whose conjugation analysis lands in a loaded Phase 21 family. The section lists saved personal
word siblings in notebook order and always keeps the marked **What to notice** dictionary exit,
including when no sibling is saved. Sibling rows open ordinary personal Detail with the existing
Back context; the teaching row opens the canonical dictionary pattern view.

Phrases, Pages, unattached words, unresolved attachments, incomplete family evidence, and failed
optional reference reads show no section. Both the subject and every saved sibling must be words.
The milestone story and existing habitat rows are unchanged, and the family section offers no
write action.

## Shared implementation

- `src/lib/wordFamilies.js` owns the full read-only sequence: alias-aware subject resolution,
  conjugation loading, `analyzeConjugationPatterns`, family-row loading, current-entry evidence,
  alias-aware saved-word intersection, de-duplication, and notebook ordering.
- `src/components/ConjugationFamilyRows.jsx` owns the shared sibling and teaching rows. Wander and
  Historia provide only their surface-specific navigation callbacks.
- `src/lib/wander.js` retains its established helper export as a compatibility seam; Wander's
  existing tests remain the refactor proof.
- Biography prepares the optional family independently from phrase and prose containment. It
  clears stale state on subject changes and treats every reference failure as quiet absence.

The seeded browser pass caught and closed one edge before completion: an attached phrase initially
qualified as a saved sibling through the old Wander helper. The shared boundary and its pure test
now require `form === "word"` on both endpoints, matching the Phase 25 contract.

## Phase 25b quality gate

The disposable audit examined all shipped r4 relation strings before any derivational UI work:

- 7,312 entries carry 45,955 `relatedWords` mentions;
- 8,125 mentions resolve to a normalized shipped lemma: **17.68%**;
- 1,386 resolved mentions (**17.06%**) land on a lemma represented by multiple dictionary entries;
- deterministic samples included broad or false claims such as *caldo* ↔ *cálido*, *ello* ↔
  *te*, *jersey* ↔ *traje*, *sí* ↔ *vosotros*, and *salvar* ↔ noun *salvado* (“bran”); and
- requiring reciprocity reduced 7,615 candidate undirected pairs to 2,269 but retained pronoun
  paradigms, homographs, and sense/POS mismatches.

R4 merged Kaikki `derived` and broad `related` rows and stored only lemma strings. Exact or
bidirectional matching cannot reconstruct relation provenance, target part of speech, sense, or
entry identity. Phase 25b therefore has no reader, and the existing sentinel tests continue to
prove that `relatedWords` renders nowhere. A revival requires a separately planned reference-data
redesign rather than a different UI-side matcher.

No owner backup was supplied for the optional real-notebook preview. No owner browser data was
available or inspected.

## Automated and deliberate verification

- Focused family/Wander/Biography/reference boundary: **45/45 tests across six files**.
- Complete serial suite: **1,403/1,403 tests across 121 files** (`npm.cmd test`).
- Production build: passed; Vite transformed **2,108 modules** and generated the PWA.
- `git diff --check`: passed.

The required negative proof temporarily inserted a `phase25_probe` event write in Biography's
family-load path. The Detail/Historia event snapshot test failed at the intended extra-event
assertion. Removing the probe restored the focused Biography file to 4/4 green; no probe code or
event type remains.

Coverage pins alias-aware preparation, incomplete and failing reference data, overlapping-family
de-duplication, word-only endpoints, zero saved siblings, shared Wander presentation, Historia
rendering, personal and dictionary navigation, unchanged story/habitat content, absent phrase and
unattached-word sections, no write affordance, and an unchanged event log while Historia opens.

## 375×812 browser closeout

A disposable local origin received four personal rows and two reference entries: an alias-attached
*sacar*, saved sibling *buscar*, unattached *casa*, and an attached phrase *sacar la basura*. The
fixture included the real `spelling:c-qu` evidence and family-row shapes. No full dictionary or
owner data was needed.

| Check | Evidence |
|---|---|
| Attached word | *sacar* Historia showed one saved sibling, *buscar*, plus the marked teaching exit; the attached phrase was correctly excluded from the family |
| Personal route | Opening *buscar* produced ordinary Detail with **Atrás**, which returned to *sacar* Detail |
| Dictionary route | **What to notice** opened the canonical *c becomes qu before e* teaching view with its evidence and family row |
| Eligibility | Unattached *casa* and attached phrase *sacar la basura* each had zero **Familia de conjugación** sections |
| Read-only boundary | The event log contained the same single ordinary `view` before and after opening *sacar* Historia |
| Phone geometry | `innerWidth === 375`, `innerHeight === 812`; document scroll/client width was 360/360 on the family view and 375/375 on the phrase view |
| Actions | Sibling and teaching rows measured 56px high; the Historia Back action measured 44px; all resolved `min-height: 44px` |
| Console | Zero warnings or errors across the complete flow |

Cleanup returned the disposable origin to zero personal items, zero events, zero reference entries,
zero family rows, and no active reference pointer. The viewport was reset, the browser tab was
finalized, and the local server was stopped.

## Deployment

No push, merge to `main`, GitHub Pages run, or production verification is claimed. Deployment
remains a separate owner approval. If approved later, the direction, this report, README Status,
Improvement Ideas, and the durable decision record must move to deployed reality together.
