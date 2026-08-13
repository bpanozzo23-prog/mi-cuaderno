# Phase 25 — Word families in the biography

**Status:** Planned 2026-08-13; implementation has not started and still requires its own §2
plan-first approval. A push to `main` is a further separate approval.
**Origin:** The owner selected two Historia enrichments — the conjugation family and the
derivational family — from the 2026-08-13 Historia-strengthening discussion, then answered seven
scope-shaping questions in a structured workshop the same day. This document records those
decisions and is written to be self-contained for the implementing agent.

## Outcome

The lexical Biography (**Historia**, Phase 23a) gains two habitat sections for words:

1. **25a — Conjugation family.** The subject word's Phase 21 paradigm family, with the same
   content the wander card's family group already shows: the saved sibling verbs plus the one
   **What to notice** row deep-linking to the dictionary's teaching view.
2. **25b — Derivational family.** The first reader of the dormant r4 `relatedWords` data: the
   subject word's **saved** derivational relatives (*decidir* → *decisión*), and only saved ones.

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

**Dormancy supersession, stated plainly:** Phase 24 recorded that dormant `relatedWords` never
renders, pending a display decision. This workshop is that decision, narrowly: 25b's
saved-relative biography rows become its only sanctioned reader. Everything else about the
dormancy rule stands — `DictDetail` still never renders it (the `CASA_FAMILY_SENTINEL` tests in
`src/components/DictDetail.test.jsx` and `src/db/ref/install.test.js` must stay green), and no
explorer UI exists.

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

## 25b — Derivational family

`relatedWords` on an installed r4 entry is a deduped array of plain lemma strings (entry-level
terms first, sense-level after, the entry's own headword excluded; 7,312 shipped entries carry
it). It has no reader in the app today; this slice adds the first.

A saved word B is a derivational relative of subject word A when both attachments resolve
(alias-aware, read-only) and **either** resolved entry's `relatedWords` contains the **other**
resolved entry's lemma, compared as exact normalized whole terms through `normalize.js` (ñ
preserved, accents folded per the existing rules). The union is bidirectional because the source
data is asymmetric. No stemming, no substring or prefix matching, no string-similarity
heuristic — the recorded guardrail applies: spelling similarity produces false relatives, and a
wrong family member teaches a false connection.

Rows show the relative's term and first gloss and navigate to its ordinary Detail. The section
is absent when the subject is unattached, the dictionary is not installed ("not installed" is
**not** "orphaned"), the resolved entry carries no `relatedWords`, or no saved relative matches.

### The quality gate

Before 25b UI work, a disposable repo-side audit runs over the shipped package
(`public/dict/kaikki-es-2026-07-25-r4/chunk-*.json`):

- **resolution rate** — what fraction of listed `relatedWords` terms exactly match a shipped
  lemma (the intersection 25b can ever show);
- **family sanity** — a hand-inspected sample of families, looking for false relatives; and
- **real-notebook preview** — if the owner supplies a backup export, run the saved-relative
  intersection against it and show the actual rows the feature would render.

The audit's numbers and verdict are recorded in the phase report and `DECISIONS.md`. A bad
verdict stops or reshapes 25b before it is built; it does not gate 25a.

## Exclusions

No unsaved relatives, marked derivational exits, or count chips. No wander-card changes. No link
promotion or any write affordance. No phrase or page family sections. No exact-term attachment
fallback. No dictionary-side explorer UI (that phase remains unapproved). No new events —
Historia's surfaces still write nothing. No dataset rebuild: r4 as shipped is the sole source.
Spanish section labels go through the ordinary build-time visual variant loop.

## Delivery and acceptance

Delivery order: the 25b quality audit first, then 25a, then 25b — each implementation slice one
reviewable commit leaving the app usable. The direction/decision records travel with the first
commit; the report and status synchronization close the phase.

Acceptance requires:

- pure derivation tests: the shared family-sibling extraction proven by untouched wander tests;
  `relatedWords` matching (exact whole-term, ñ, accent folding, bidirectional union, attachment
  gating on both endpoints, alias resolution, and every absent-data silence);
- component tests proving both sections render inside Historia without touching the milestone
  story or existing habitat sections; rows navigate and offer no write action; phrase
  biographies show neither section; an unattached word shows neither section; a relative also
  present in Connections appears in both; the What-to-notice exit is marked; quiet failure
  leaves sections absent; and the Phase 24 `DictDetail` sentinel still never renders;
- deliberate red/green proofs: (1) weakening the relative matcher to substring matching leaks a
  false relative from a *casa*/*casada*-style fixture, and the restored matcher stays silent;
  (2) removing attachment gating gives an unattached word a family section, reddening its test;
  (3) an event-log assertion over a Historia open showing both sections proves zero writes, and
  goes red when a logging call is inserted;
- the complete serial suite, production build, and `git diff --check`; and
- a disposable seeded 375×812 browser flow covering an attached verb with saved siblings and the
  teaching row, a word with saved derivational relatives in both directions of the union, the
  Connections-overlap case, an unattached word showing neither section, and a phrase biography,
  with 44px actions, no horizontal overflow, and no console warnings/errors.

A push to `main` is not part of implementation approval. If deployment is later approved, README
Status, this direction, the report, and the affected Improvement Ideas records must describe
deployed reality in the same session.
