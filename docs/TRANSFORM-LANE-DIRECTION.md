# Transform lane — typed indicative → present-subjunctive transformation

**Status:** Direction approved by the owner 2026-08-24 after a planning session; implementation
in progress on this direction. Not pushed or deployed until the owner asks.
**Origin:** The owner's 2026-08-24 review of cloze / multiple-choice / transformation drill ideas.
After the Contrasts lane and Forms Choose, the next item chosen was *mood transformation*: show an
indicative sentence and a matrix trigger, type the subjunctive form, graded exactly.

## Outcome

The Conjugation Gym gains a fifth lane, **Transform**, typed only. A card shows an indicative
sentence (*Sé que viene.*) and a frame with a trigger and one blank (*Dudo que ___ mañana.*); the
owner types the present-subjunctive form (*venga*). Grading is the typed checker's exact-first
accent policy: exact passes, a non-colliding accent slip passes and is named, an accent collision
or any other form fails. An initial miss shows the diagnosis (*that form belongs to another tense
— the trigger asks for the subjunctive*) and allows one unrevealed retry; then the reveal shows
the completed sentence, its gloss, the rule, and — when the dictionary is installed — the verb's
present-subjunctive row. One optional de-duplicated missed round. Every answer is an ordinary
`drill_pass` / `drill_fail` with `skill: "transform"`, `mode: "typed"`, reported in its own
Performance block beside Typed Endings.

No schema, event-type, preference, backup or dictionary change; `SCHEMA_VERSION` stays 10. The
lane works without the dictionary installed.

## Owner decisions (2026-08-24)

- **Scope:** present subjunctive only — doubt & denial, emotion, wish & influence, impersonal
  expressions, purpose & time triggers. A2–B1. Imperfect subjunctive and negative commands are
  captured as later sets.
- **Answers are curated in-code** and every one is reproduced from the packaged conjugation
  tables by a shipped-data test; the lane needs no installed dictionary, like Usage and Endings.
  Diagnosis and the paradigm reveal use the verb's table when the dictionary is installed.

Design calls recorded with them:

- **A new lane, not a Contrasts set or a Forms mode.** It is production (typed), so it is not
  recognition; and the prompt is a sentence frame, not a bare cell, so it is not Forms.
- **Scope selector = trigger family** (the Contrasts "Set" precedent) in place of tense packs.
- **Every frame's verb is one of the 80 curated Gym lemmas**, so `library.core` already carries
  its table when the dictionary is installed: no new lookup, no stored `dict:` key, and the §5
  orphan path can never apply. A test pins the membership.
- **The answer is the verb form alone**; the frame carries any tail. The base sentence shows the
  same verb, same person, in the indicative, so the mood change is the only transformation.
- **No accent bar** — the owner declined it (`docs/IMPROVEMENT-IDEAS.md`, Deferred); typed input
  uses the same `lang="es"`, no-autocorrect field as Typed Endings.

## Content — `src/lib/transformContent.js`

`TRANSFORM_FAMILIES` (id, label, example triggers) and `TRANSFORM_CARDS`, each card
`{ id: "transform:<family>:<slug>", skill: "transform", family, lemma, slot, tense:
"Subjunctive/Present", answer, base, frame, gloss, rule }`. Rules: one `___` per frame; `base`
contains the packaged indicative-present form for the same slot; `answer` equals the packaged
present-subjunctive form; lemma ∈ curated Gym lemmas; ids unique; ~8 frames per family mixing
regular, stem-changing, spelling-change and irregular-yo verbs. Guide terms for Grammar links:
`subjuntivo`, `subjunctive`, `presente de subjuntivo` (long or multi-word only).

## Deck

`src/lib/endingsProduction.js`'s balanced builder is generalized with a `keyOf` option and
exported as `buildTypedDeck` / `rebuildMissedTypedDeck`; the Endings functions become thin
wrappers. Transform decks balance by family so a session mixes triggers, cap honestly at the
available frames, never repeat a card, and de-duplicate the missed round by id.

## Setup and session

- **Transform** joins the lane selector. Its setup card shows the explainer, a **Triggers** select
  (All families, then each family) in place of tense scope, and Prompts 10/20.
- `TransformDrill` (modelled on `EndingsProductionDrill`): eyebrow with the family, the base
  sentence, the frame with its blank as one typed field, Check in the dock. Grading through
  `diagnoseTypedAnswer(typed, card, forms)` with `forms` from the library table when present
  (`[]` otherwise, which degrades to exact / accents / wrong). Stages `initial | retry | missed`.
  Reveal: completed sentence, gloss, rule, the present-subjunctive row across the five Gym persons
  when the table is available, and up to two Grammar guides behind the second-tap session-ending
  arm.

## The event

`logDrill(null, passed, { skill: "transform", cardId, tense: "Subjunctive/Present", mode: "typed",
verdict, diagnosis, sessionId, promptId, sessionKind: "recognition", stage, cardIndex, deckSize })`.
No typed string, and no `verbKey`, `slot`, `lemma`, `source` or `curriculum` (Typed Endings'
rule): Adaptive stays blind by structure, Forms statistics by `sessionKind` (and the skill set,
belt and braces), recognition statistics by mode, review by type. `diagnosis` is additive so the
report can say how often the indicative was kept.

## Statistics

`gymDepthPerformance` gains `typedTransform` with the Typed Endings shape (`firstAttempts`
with exact/accent-assisted counts, `immediate`, `missed`) plus `keptIndicative`, the count of
initial misses diagnosed `wrong_tense`. The performance panel adds a "Typed Transform" block
after Typed Endings.

## Non-goals

Imperfect subjunctive and negative-command sets, free-text whole-sentence rewriting, AI grading,
an accent bar, any Leitner or scheduling effect, content outside the curated Gym lemmas.

## Delivery sequence

1. Direction, `DECISIONS.md`, brief §7; transform event added to the Forms-stats, Adaptive and
   review adversarial tests; red-first `gymDepthStats` pin, then the figure.
2. Content and the generalized typed deck builder with tests, including the shipped-data proof.
3. Lane wiring and `TransformDrill` with component tests.
4. Performance block with test.
5. Closeout: complete serial suite, production build, `git diff --check`, deliberate proofs, and
   the owner's 375 px phone check against the `--host` dev URL.

## Acceptance

The project standard: focused and complete serial suites green, production build, diff check,
deliberate failure proofs observed red then restored, and the phone check with no horizontal
overflow or console error. Push, README Status and deployment wait for the owner.
