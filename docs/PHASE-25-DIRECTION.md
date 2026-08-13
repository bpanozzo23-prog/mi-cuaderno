# Phase 25 — Word families in the biography

**Status:** Phase 25a approved for implementation 2026-08-13. Phase 25b stopped at its mandatory
quality gate before UI work: shipped r4 `relatedWords` does not distinguish derivations from broad
related terms and does not preserve target-entry identity, so the approved matcher would expose
false family claims. A push to `main` remains a further separate approval.
**Origin:** The owner selected two Historia enrichments — the conjugation family and the
derivational family — from the 2026-08-13 Historia-strengthening discussion, then answered seven
scope-shaping questions in a structured workshop the same day. This document records those
decisions and is written to be self-contained for the implementing agent.

## Outcome

The original workshop proposed two habitat sections for lexical Biography (**Historia**, Phase
23a). After the mandatory gate, Phase 25 implements one and records why the other stopped:

1. **25a — Conjugation family.** The subject word's Phase 21 paradigm family, with the same
   content the wander card's family group already shows: the saved sibling verbs plus the one
   **What to notice** row deep-linking to the dictionary's teaching view.
2. **25b — Derivational family (stopped at gate).** The proposed first reader of dormant r4
   `relatedWords` would have shown the subject word's saved derivational relatives. The required
   pre-UI audit found that the shipped field cannot support that claim safely, so no reader is
   authorized and the field remains dormant.

Everything derives at render from existing personal data and the installed replaceable
dictionary. Personal `SCHEMA_VERSION` stays 8. The phase adds no personal field, preference,
backup shape, event type, stored counter, score, schedule, queue, dictionary package, or
background work. Historia remains display-only: no row offers a write action, and link promotion
from derived rows remains its own future decision, exactly as Phase 23 recorded. The milestone
story and every existing habitat section are untouched.

## The seven workshop decisions

1. **Derivational rows are saved relatives only.** No unsaved dictionary relatives, no marked
   dictionary exits, no count chip. The growth reading — "you almost know three more words" —
   stays with the unapproved Dictionary word-family explorer phase.
2. **The conjugation section mirrors the wander card.** Same content and appearance conditions
   as the wander family group, so the two surfaces share one derivation and its tests: the
   section appears when the subject is an attached verb whose resolved entry's conjugation
   analysis lands in a loaded Phase 21 family; it lists the saved siblings (possibly zero) and
   always includes the What-to-notice teaching row as a marked dictionary exit.
3. **Historia only.** The wander card's v1 edge set is untouched. A derivational wander edge
   remains a later evidence-driven decision, per Phase 23's rule for new edge kinds.
4. **No suppression against Connections.** A relative that is also a typed Connection appears in
   both sections; each section states its own kind of fact and each stays complete.
5. **Words only.** Phrase biographies are unchanged; family facts belong to lemma-attached words.
6. **Attachment required.** Family facts derive only through a resolved, alias-aware `dictKey`
   on **both** endpoints. An unattached word shows neither section. No exact-term fallback
   inference — the family features have never guessed which entry a bare term means, and still
   don't.
7. **Quality gate first.** A disposable audit of the shipped `relatedWords` data runs before any
   25b UI work; a bad verdict reshapes or stops the derivational slice. 25a is independent of
   the gate.

**Dormancy result, stated plainly:** The workshop initially proposed 25b as the only sanctioned
reader of Phase 24's dormant field. The required audit rejected that proposal before code, so the
original dormancy rule remains fully in force: `relatedWords` renders nowhere, the
`CASA_FAMILY_SENTINEL` tests in `src/components/DictDetail.test.jsx` and
`src/db/ref/install.test.js` stay green, and no explorer UI exists.

## 25a — Conjugation family

Derivation reuses the Phase 23 wander machinery: `deriveSavedFamilySiblings` in
`src/lib/wander.js` and the loading sequence in `src/components/Wander.jsx` — resolve the
subject's attachment through the read-only alias path (no write-healing), load its conjugation,
run `analyzeConjugationPatterns`, load the family rows, then intersect family member ids with
saved personal items by canonical key (`previousIds` alias map), preserving notebook order.
Extract the shared sequence rather than duplicating it; where the shared module lands is the
implementer's choice, with the existing wander tests left untouched as the refactor proof (the
Phase 22a `phraseContainment.test.js` pattern).

Presentation: one new habitat section. Sibling rows navigate to the sibling's ordinary Detail
through existing routes with the ordinary Back context. The What-to-notice row is a marked exit
into the dictionary teaching view, exactly as on the wander card. Family load failure stays
quiet — the section is simply absent — matching wander's existing behavior.

## 25b — Derivational family (stopped at quality gate)

`relatedWords` on an installed r4 entry is a deduped array of plain lemma strings (entry-level
terms first, sense-level after, the entry's own headword excluded; 7,312 shipped entries carry
it). It has no reader in the app today. The audit below determined that Phase 25 must not add one.

The proposed rule was: a saved word B is a derivational relative of subject word A when both
attachments resolve and either resolved entry's `relatedWords` contains the other lemma under
`normalize.js`. That rule is retained here as historical planning context, not as an authorized
runtime contract. The audit proved that exact matching cannot restore relationship kind, sense,
part of speech, or target-entry identity after r4 flattened them to lemma strings.

No derivational rows or section are implemented in Phase 25. Any future revival requires a new
reference-data proposal and its own plan; it cannot silently reuse the rejected flattened field.

### The quality gate

Before 25b UI work, a disposable repo-side audit runs over the shipped package
(`public/dict/kaikki-es-2026-07-25-r4/chunk-*.json`):

- **resolution rate** — what fraction of listed `relatedWords` terms exactly match a shipped
  lemma (the intersection 25b can ever show);
- **family sanity** — a hand-inspected sample of families, looking for false relatives; and
- **real-notebook preview** — if the owner supplies a backup export, run the saved-relative
  intersection against it and show the actual rows the feature would render.

The disposable shipped-package audit completed 2026-08-13:

- 45,955 listed relation terms produced 8,125 exact normalized shipped-lemma hits: **17.68%**
  mention resolution; 4,187 of 7,312 carrying entries had at least one hit;
- 1,386 resolved mentions (**17.06%**) landed on a normalized lemma represented by more than one
  dictionary entry, while the stored string carries no target part of speech, sense, or id;
- a deterministic 40-pair sample exposed broad relations and false entry claims including
  *caldo* ↔ *cálido*, *ello* ↔ *te*, *jersey* ↔ *traje*, *sí* ↔ *vosotros*, and *salvar* ↔ the
  noun *salvado* (“bran”); and
- requiring reciprocal evidence reduced 7,615 potential undirected pairs to 2,269 but still
  retained pronoun paradigms, homographs, and sense/POS mismatches.

Verdict: **bad for a derivational-family UI.** R4 deliberately merged Kaikki `derived` and broad
`related` rows and retained only their words. Exact, whole-term and bidirectional matching prevent
substring invention but cannot recover provenance already discarded. Phase 25b therefore stops
before UI work, exactly as this gate required; 25a remains independent and approved.

No real-notebook preview ran because no owner backup was supplied. No owner browser data was
available or inspected.

## Exclusions

No unsaved relatives, marked derivational exits, or count chips. No wander-card changes. No link
promotion or any write affordance. No phrase or page family sections. No exact-term attachment
fallback. No dictionary-side explorer UI (that phase remains unapproved). No new events —
Historia's surfaces still write nothing. No dataset rebuild: r4 as shipped is the sole source.
Spanish section labels go through the ordinary build-time visual variant loop.

## Delivery and acceptance

Delivery order after the gate verdict: record the audit and stopped slice, then implement 25a as
one reviewable feature leaving the app usable. The direction/decision records travel first; the
report and status synchronization close the implemented slice.

Phase 25a acceptance requires:

- pure derivation tests for the shared family preparation, with the existing wander sibling tests
  retained unchanged as refactor proof;
- component tests proving the conjugation section renders inside Historia without touching the
  milestone story or existing habitat sections; sibling rows navigate and offer no write action;
  phrase and unattached-word biographies show no section; a family with no saved sibling still
  shows the marked What-to-notice exit; and quiet failure leaves the section absent;
- a deliberate red/green proof that an event-log assertion over a Historia open showing the
  section detects a forbidden write;
- the complete serial suite, production build, and `git diff --check`; and
- a disposable seeded 375×812 browser flow covering an attached verb with saved siblings and the
  teaching row, an unattached word, and a phrase biography, with 44px actions, no horizontal
  overflow, and no console warnings/errors.

A push to `main` is not part of implementation approval. If deployment is later approved, README
Status, this direction, the report, and the affected Improvement Ideas records must describe
deployed reality in the same session.
