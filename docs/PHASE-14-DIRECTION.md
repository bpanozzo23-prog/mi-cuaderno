# Phase 14 direction — Conjugation Gym

**Approved:** 2026-08-07  
**Status:** Deployed from `main`; live status reverified 2026-08-09

## Outcome

Replace Repaso's single conjugation drill launcher with one owner-started Gym. It supports Quick,
Focus and explicitly adaptive sessions over saved verbs or fixed Core 20/Core 50 curricula; expands
the tense range through named presets; diagnoses typed mistakes; gives one immediate retry and an
optional missed-form round; and turns performance into direct practice actions.

The learning loop is: **find a weakness → practise it deliberately → retry it → see whether recent
performance improved.** Typed first attempts are the primary measurement. Reveal remains available
for lighter practice but its self-grades are reported separately.

## Fixed boundaries

- The Gym is not Leitner. It never enrols a word, changes a box, assigns a review date, creates a
  mandatory queue or stores a mastery counter.
- Adaptive ordering happens only after the owner chooses an Adaptive session. No background or
  automatic schedule is introduced.
- `SCHEMA_VERSION` remains 5. Existing `drill_pass` / `drill_fail` events gain additive metadata;
  all statistics remain derived from the append-only log.
- Core verbs are reference-only practice material. Practising one never creates or edits a personal
  lexical item. The curriculum stores lemmas, resolves the current dictionary by exact lemma and
  records a lemma-level learning identity independent of replaceable dictionary ids.
- Saved and Core attempts for the same exact lemma form one conjugation-skill history. Their source
  remains filterable.
- Deleting a saved verb removes it from active practice, Saved coverage and action targets, but does
  not rewrite aggregate tense, pronoun or overall skill history.
- Tense identity remains the full shipped `Mood/Tense` key; person identity remains the exact
  `SLOTS` string. Flat Gym surfaces use mood-qualified labels so Present and perfect tenses do not
  collide.
- Settings are per-session and not remembered. Type, Saved verbs, Everyday tenses and 10 questions
  are the defaults. Core 20 and Core 50 are always selectable; neither is locked.

## Delivery sequence

1. Contract, identity, curated curriculum, exact-lemma reference lookup, qualified labels and pure
   deck builders.
2. Always-visible Gym entry, lazy pool loading, shared setup and balanced Quick/Focus sessions.
3. Diagnostic typed feedback, one immediate retry, missed-form round and enriched attempt events.
4. Dedicated performance screen plus a compact link from general Estadísticas.
5. Transparent Adaptive selection: recent misses, qualifying weak areas and under-practised cells.
6. Complete serial suite, build, diff check, deliberate failure proofs, numerical 375×812 browser
   closeout and a Phase 14 report. Nothing is deployed unless separately requested.

## Core curricula

**Core 20:** ser, estar, tener, haber, poder, ir, hacer, querer, decir, ver, saber, dar, venir,
poner, salir, hablar, comer, vivir, pedir, dormir.

**Core 50 adds:** creer, deber, dejar, pensar, necesitar, llevar, pasar, volver, parecer, gustar,
esperar, encontrar, llamar, sentir, conocer, seguir, quedar, tomar, llegar, morir, ayudar, mirar,
entender, trabajar, buscar, escuchar, preguntar, perder, empezar, traer.

## Tense presets

- **Everyday:** Indicative Present, Preterite, Imperfect, Future and Conditional; Subjunctive
  Present.
- **Commands:** affirmative and negative imperative.
- **Subjunctive:** Present and common `-ra` Imperfect.
- **Perfect:** Indicative Present, Past, Future and Conditional Perfect; Subjunctive Present and
  Past Perfect.
- **Customize:** every supported tense, with the `-se` Imperfect Subjunctive, Future Subjunctive,
  archaic Indicative Preterite Perfect and Future Subjunctive Perfect marked rare.

## Success

The owner can start useful Core practice with zero saved verbs, inspect history without an installed
dictionary, focus directly from a weak tense/person/verb row, complete a diagnosed retry loop and
see first-attempt performance unchanged by retries. Existing drill history remains readable; all
new and old drill events remain outside Leitner derivation. Every surface fits a 375px viewport and
the raw event log independently reproduces the displayed figures.
