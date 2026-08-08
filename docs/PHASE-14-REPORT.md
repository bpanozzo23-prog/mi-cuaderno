# Phase 14 — Conjugation Gym (report)

Implemented 2026-08-07 on `main`. **Local only; not pushed or deployed.** The approved scope is in
[PHASE-14-DIRECTION.md](PHASE-14-DIRECTION.md); the contract amendments and reasoning are in
`DECISIONS.md` under Phase 14.

## What shipped

| Piece | Result |
|---|---|
| Gym entry and setup | Always discoverable from Repaso, including with zero saved verbs or no installed dictionary; Quick, Focus and Adaptive; Saved, Core 20 and Core 50; Type or Reveal; 10 or 20 prompts; optional one-verb focus |
| Curriculum | Exact-lemma Core 20/Core 50 resolution; package-time uniqueness/table check; lazy batch table loading only after the Gym opens |
| Tenses and people | Everyday, Commands, Subjunctive, Perfect and Customize presets over all 19 supported tense keys; rare forms marked; mood-qualified labels; exact persisted slot strings; nonexistent imperative `yo` cells omitted by the existing cell builder |
| Decks | Pure balanced builder for Quick/Focus and an opt-in Adaptive builder weighting recent misses, weak dimensions and under-practised cells |
| Typed loop | Exact-first checking retained; accent, missing `no`, missing reflexive pronoun, wrong person, wrong tense and other-form diagnosis; one unrevealed retry; every initial miss offered once in an optional missed round |
| Event contract | Additive metadata on existing `drill_pass` / `drill_fail`; initial failure persists before retry; no typed response is stored; every persisted answer refreshes the app event snapshot |
| Performance | Last-50 and lifetime typed-first-attempt accuracy, prior-window comparison, reveal results, filters, tense/person/verb/problem-form rows, diagnostics, recovery and coverage; rows hand directly back to prefilled Focus practice |
| Navigation | Dedicated Gym stats, compact general-Estadísticas summary and direct sibling-view handoff through one Repaso view state |

## Contracts preserved

- `SCHEMA_VERSION` stays 5. There is no preference, stored counter, new personal content type or
  backup migration.
- Every new answer records a `lemma:<NFC-lowercase>` learning key. A Core answer attaches a
  personal `itemKey` only when exactly one surviving item points at that dictionary entry;
  otherwise the key is `null` and the write still goes only through `logDrill`.
- Saved/Core history for one lemma is one skill history. The source remains filterable and the
  All-coverage denominator de-duplicates their overlap, preferring Saved as the action target.
- Deleted verbs continue to inform aggregate skill history but leave Saved coverage, active verb
  rows and action targets. Uninterpretable deleted legacy events can contribute only to aggregates.
- Primary accuracy uses typed `stage: "initial"` events only. Retries and missed-round attempts
  are recovery evidence; reveal self-grades are a separate measure.
- No drill event enrols a word, changes a Leitner box, changes a review date, creates a due item or
  creates a background queue. Adaptive ordering exists only after the owner chooses Adaptive.

## Automated verification

The complete serial suite passes **975/975 across 83 files**, plus the production build and
`git diff --check`. Focused suites were run throughout each subphase. The shipped reference package
also resolves all 50 curated lemmas uniquely to verbs with conjugation tables.

Three deliberate red/green proofs were added before their implementation. Each failed for the
intended missing contract, then passed with the final derivation:

1. Retry inflation: `stats.recent` produced `expected undefined to match object { answered: 1,
   passed: 0, ... }` for an initial miss followed by retry and missed-round passes.
2. Deleted history: `stats.lifetime` produced `expected undefined to match object { answered: 3,
   passed: 2 }` while the test also required deleted verbs to stay out of actionable rows.
3. Saved/Core overlap: `stats.coverage` produced `expected undefined to match object { available:
   true, verbs: 2, practised: 1, total: 2 }`, including Saved-target preference for the shared lemma.

During development, one full run timed out in `CollectionPage` and another reported an `AiCard`
async assertion. Each passed immediately in isolation, and a fresh complete run passed all 975;
neither file is touched by Phase 14.

## Browser closeout

A disposable local origin at 375×812 was seeded with a small dictionary, one saved `sacar` and
nine drill events. The browser pane cannot composite screenshots, so the checks were numerical and
semantic.

| Check | Result |
|---|---|
| Setup | Quick was the default; Focus exposed exact tense/person controls; Adaptive explained its history weighting and no-Leitner boundary; the partial fixture reported 2/20 Core verbs without hiding the pool |
| Typed diagnosis | `saqué` for preterite `tú` immediately wrote one initial `drill_fail`, diagnosed `wrong_person`, cleared the field and kept the answer hidden |
| Retry | `sacaste` passed exactly on the one retry; the stored events contained stage and diagnosis metadata but no typed response |
| Independent score recount | Raw log: five typed initial attempts, two passes = 40%; two retry events and one missed-round event excluded. UI: 40%, 2/5, with recovery shown separately |
| Details and actions | Mood-qualified tense and exact-person rows expanded; `Practice next` reopened Focus with Saved + `sacar` + Indicative Preterite + `yo`; general Estadísticas opened the same dedicated screen directly |
| Layout | Short surfaces measured `scrollWidth === clientWidth === 375`; vertically scrolling setup/stats measured 360 === 360 after the browser scrollbar; zero elements crossed either horizontal edge |
| Console | No warnings or errors |

The fixture lives only on that disposable port-specific browser origin; its dev server was stopped.
No owner data was available, inspected or changed, and nothing was deployed.

## Deliberately not done

The Gym has no daily goal, reminder, due queue, mastery label, spaced schedule, automatic Core-to-
notebook promotion or stored learner model. It also does not prune or compact drill events; the
accepted personal-scale append-only model remains in force, with the higher retry event volume
called out in `DECISIONS.md`.
