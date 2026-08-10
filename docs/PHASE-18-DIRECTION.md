# Phase 18 direction — Gym depth and targeting

**Status:** Approved by the owner and implementation requested 2026-08-10. Not deployed.
**Origin:** Phase 17 follow-up planning for the reverse side of its recognition lanes, deeper
production practice, broader built-in verb targeting, and exact Saved subsets.

## Outcome

The Gym gains two deliberately separate depth modes: **Usage recall**, which names a tense and
asks the learner to recall at least one curated use, and **Typed endings**, which asks for all five
collapsed-person endings for a tense and class. Forms also gains two balanced 18-verb built-in
packs and session-only Saved targeting by one exact tag or one whole active Vocabulary page.
Performance reports the new modes separately so self-graded recall and typed production can never
change Phase 17's objective choice-recognition figures.

Mixed decks, generated reflexive tables, page-group subsets, persistent Gym settings, per-pack
analytics, Leitner effects, new event types, and a schema change are outside this phase.

## 1 — Usage recall

- Tense usage offers **Identify tense / Recall uses**.
- One stable card is derived per canonical tense by aggregating every curated Phase 17 use for
  that tense. Its front shows the mood-qualified tense name and asks for at least one valid use.
  Its back shows all curated uses, alternatives and nuance, contrast guidance, and matching
  Grammar-guide links.
- The learner self-grades **Couldn't recall / Recalled one**. There is no immediate retry.
- **All selected** is the default length and presents each selected tense once. Lengths 10 and 20
  repeat only in balanced cycles after every selected tense has appeared and avoid consecutive
  repeats where possible.
- The optional missed round repeats each missed tense once, even if that tense was missed more than
  once during the initial repeated session.
- A custom recall scope needs one tense; Phase 17 choice recognition keeps its four-tense minimum.

Recall logs existing `drill_pass`/`drill_fail` events with `skill: "usage"`, `mode: "recall"`, a
stable tense-level `cardId`, canonical `tense`, `verdict: "self"`, and the existing session,
prompt, and stage metadata. It stores no `chosen` value or personal identity.

## 2 — Typed endings

- Endings offers **Choose tense / Type endings**. The prompt shows tense and class, followed by
  vertical fields for yo, tú, él/ella/usted, nosotros, and ustedes/ellos without exposing the
  pattern.
- Every field is required. Each field uses the existing exact-first accent policy: exact passes;
  an accent-only slip passes and is named; an input that exactly equals another curated ending is
  an accent collision and fails.
- A row passes only when all five fields pass. After an initial miss, passing fields remain visible
  and locked, only failed fields clear, and one unrevealed retry is allowed. The complete pattern
  appears after a pass or retry.
- Every initially failed row remains eligible for one optional missed-round attempt. A repeated
  row is included only once.
- Perfect rows ask for the five tense-specific forms of *haber* and reveal the shared participle
  rule. Future and Conditional keep the whole-infinitive cue.
- Sessions remain 10 or 20 and cap honestly at available rows. The dictionary only enriches the
  existing real-verb reveal; production works without it.

Typed Endings logs existing answer events with `skill: "endings"`, `mode: "typed"`, the existing
row `cardId`, canonical `tense`, a row verdict, per-slot verdicts, and `initial | retry | missed`
stage. It stores no typed strings, item or verb identity, singular `slot`, source, or curriculum.

## 3 — Built-in pools

The crowded pool segment becomes a native grouped picker:

- Personal: Saved.
- Built-in: Core 20, Core 50, Regulars, Stem changers, Spelling changes, Irregular preterites.

One curriculum registry drives setup, loading, availability counts, metadata, and Performance
handoffs. Built-in events retain `source: "core"`; the UI calls that source **Built-in**.

Regulars are six verbs per class:

- `-ar`: hablar, trabajar, mirar, escuchar, preguntar, ayudar.
- `-er`: comer, deber, beber, aprender, vender, comprender.
- `-ir`: vivir, recibir, permitir, subir, decidir, compartir.

Spelling changes are three verbs per family:

- `c→qu`: buscar, sacar, practicar.
- `g→gu`: llegar, pagar, apagar.
- `z→c`: cruzar, alcanzar, utilizar.
- `g→j`: escoger, dirigir, proteger.
- `gu` adjustments: distinguir, averiguar, seguir.
- `i→y`: construir, huir, incluir.

All 80 de-duplicated curated lemmas must resolve uniquely with packaged tables. Regulars must
reproduce their class anchor over every supported form, and each spelling-change verb must prove
its declared characteristic shipped cells. Stable curricula are `regulars` and
`spellingChanges`.

## 4 — Saved targeting

When Saved is selected, session-only refinement offers **All saved**, one exact existing tag, or
one active page with `collection.enabled === true`.

- Counts include only currently resolved, conjugable Saved entries. Zero-eligible tags and pages
  are hidden.
- Tags retain exact spelling and case.
- Page membership comes only from authoritative `linkedKeys` through `deriveCollection`; visual
  group placement never adds membership.
- A subset constrains Quick, Focus, Adaptive, the one-verb picker, and availability counts.
- Notebook changes that invalidate a selection outside a live session reset it to All saved.
  Performance-to-Focus handoffs also reset to All saved.
- No subset preference or identity is persisted or written to drill events.

## 5 — Mode-separated Performance

- Phase 17 `recognitionPerformance` keeps its exact return shape and consumes only
  `mode: "choice"` events. Its first-attempt accuracy and confusion figures remain unchanged.
- Usage recall reports first-attempt self-grades and missed-round recovery separately.
- Typed Endings reports first-attempt row accuracy, exact versus accent-assisted rows, immediate
  recovery, and missed-round recovery separately.
- Tense packs filter every skill. Saved/Built-in source filters affect Forms only.
- Form statistics, Adaptive Forms ordering, and Leitner replay ignore every new event.

## Delivery sequence

1. Record this direction and add a red-first choice-mode isolation proof.
2. Add pure Usage recall aggregation/decks, session UI, events, Grammar links, missed round, tests.
3. Add pure Typed Endings grading/decks, five-field UI, retry/reveal/missed behavior, events, tests.
4. Centralize pools, replace the pool control, and ship the Regular pack with derivation proof.
5. Ship the Spelling-change pack with characteristic-cell proofs.
6. Add exact-tag and whole-page Saved subsets across Quick, Focus, and Adaptive.
7. Add mode-separated depth Performance and prove existing Forms/choice figures unchanged.
8. Update current documentation and report; run the complete serial suite, production build,
   `git diff --check`, deliberate failure proofs, and a disposable 375×812 browser pass.

Each completed slice is committed separately. Nothing is pushed or deployed without a separate
owner request.
