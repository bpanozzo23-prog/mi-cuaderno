# Forms Choose — multiple choice with morphological distractors

**Status:** Direction approved by the owner 2026-08-24 after a planning session; implementation
in progress on this direction. Not pushed or deployed until the owner asks.
**Origin:** The owner's 2026-08-24 review of cloze / multiple-choice / transformation drill ideas
against the app. After the Contrasts lane, the next item chosen was *MCQ with morphological
distractors*: asked for one cell of a verb, pick the right form from four forms of the same verb,
so a miss diagnoses agreement confusion or tense/aspect confusion rather than "didn't know it".

## Outcome

The Conjugation Gym's Forms drill gains a third way to answer — **Type / Reveal / Choose**. Choose
shows the usual prompt (verb, mood-qualified tense, person) and four forms of that verb: the
answer, one other person in the same tense, the same person in a confusable tense, and one more
from either family. A tap marks objectively; a miss names the answer and the diagnosis the typed
checker would have given (*wrong person*, *wrong tense*), with no immediate retry and one optional
missed round that repeats the same four forms in a new order.

Every answer is an ordinary Forms `drill_pass` / `drill_fail` event with `mode: "choice"`. The
Gym's **primary accuracy stays typed-only**; Choose gets its own separate figure like Reveal, and
a wrong choice feeds Adaptive targeting the way a Reveal "Missed" does.

No schema, event-type, preference, backup, curated-content or dictionary change;
`SCHEMA_VERSION` stays 10.

## Owner decisions (2026-08-24)

- **A third Forms answer mode, not a lane.** Same verb pool, tense packs, people and
  Quick / Focus / Adaptive; the Answer selector gains "Choose". Type stays the default.
- **Statistics like Reveal.** The Phase 14 rule holds: typed initial attempts are the sole primary
  denominator. Choose is reported separately; Choose misses are Adaptive targeting evidence and
  Choose passes are exposure only — exactly Reveal's existing treatment.
- **Mixed distractors:** one same-tense other-person form, one same-person confusable-tense form,
  one more from either family.

## Distractors — `src/lib/formChoices.js`

`formChoiceOptions(card, forms, { rng, confusables, slots })` is pure and rng-injectable:

1. The pool is the card's flattened table (`forms`, which already includes composed perfects)
   minus the prompt cell, minus any entry whose form string equals the answer (an imperfect whose
   *yo* and *él* coincide must not offer the answer twice), minus collapsed slots (*vosotros*),
   de-duplicated by form string with the first cell winning so a form's label is stable.
2. **P** = same tense, other slot. **T** = same slot, tense taken from the curated
   `RECOGNITION_CONFUSABLES` map in order (Preterite → Imperfect, Present Perfect; …), falling back
   to any other tense in `ALL_GYM_TENSES` order.
3. One from P, one from T (first confusable the table has), one more from the rest of P ∪ T; an
   empty family is filled from the other, then from the whole pool. Fewer than three distinct
   distractors → no options, and the card is dropped from a Choose deck.
4. Answer plus three distractors, shuffled. Accent-only neighbours (*hablo / habló*) are legitimate
   distractors — the accent is the answer (Phase 13). Forms compare as exact strings.

## Session

- `ConjugationDrill` renders four chips under the prompt for `mode: "choice"`; all chips disable
  once answered (the feedback names the answer, so a retry would test nothing — the Phase 17 rule).
- On a tap: `passed = chosen === answer`; on a miss the diagnosis is `diagnoseTypedAnswer(chosen,
  card, forms)` — the existing ladder, unchanged — so a tapped `fuiste` for *él · preterite* records
  `wrong_person` and a tapped `era` records `wrong_tense`.
- Feedback: *Right — «fue».* or *That's «fuiste» — tú, indicative preterite. That form belongs to
  another person.* followed by the answer and the existing Open entry link.
- Stages are `initial | missed`; the missed round reuses the recognition rebuild (same four forms,
  new order). The session summary keeps `passed/answered`; the exact/accents/recoveries line stays
  typed-only; "Needs work" derives from initial outcomes as before.

## The event

The Forms metadata shape is unchanged: `sessionId`, `promptId`, `sessionKind`, `source`,
`curriculum`, `verbKey`, `lemma`, `dictKey`, `tense`, `slot`, `mode: "choice"`, `verdict`
(`exact` on a pass, `wrong` on a miss), `diagnosis` (ladder value or `null`), `stage`, `cardIndex`,
`deckSize` — plus **`chosen`, miss-only**, the recognition precedent. `chosen` is a dictionary form
picked from four offered, not owner-typed text, so the rule that the typed response is never
written is untouched. Typed and Reveal events stay byte-for-byte unchanged.

Consumers: `conjugationStats` reports `choice` beside `reveal` and keeps every typed figure
identical (pinned); Adaptive needs no change (any non-typed initial miss is already targeting
evidence, any initial answer exposure) and gains a pin; Leitner ignores all drill types;
recognition and depth statistics require a `skill` and stay blind.

## Statistics

`conjugationPerformance` returns `choice: { answered, passed, accuracy, diagnoses }` from initial
Choose answers, with `diagnoses` aggregated from the misses. The performance panel shows a "Choose
practice" card beside Reveal: *N of M chosen correctly · wrong person ×a · wrong tense ×b — shown
separately from typed recall.*

## Non-goals

Curated sentences or context around the form (the prompt stays the bare cell, as Type and Reveal
do); cross-verb or semantic distractors; a Choose retry; any Leitner or scheduling effect;
remembering the chosen mode between sessions; a change to the typed-only primary denominator.

## Delivery sequence

1. Direction, `DECISIONS.md`, brief §7 amendment; red-first proof that a `mode: "choice"` Forms
   event is invisible to statistics today, then the separate figure and the "typed figures stay
   identical" and Adaptive pins.
2. `formChoices.js` with tests (four distinct, answer once, both families when available, curated
   confusable preferred, identical-string exclusion, collapsed slot excluded, deterministic under
   injected rng, empty for a two-form table).
3. Choose mode in setup and session with component tests (chips, feedback with diagnosis, no
   retry, exact metadata with miss-only `chosen`, typed/reveal pins untouched, missed round).
4. Performance panel card with test.
5. Closeout: complete serial suite, production build, `git diff --check`, deliberate proofs, and
   the owner's 375 px phone check against the `--host` dev URL (long perfect forms on four chips
   is the layout risk).

## Acceptance

The project standard: focused and complete serial suites green, production build, diff check,
deliberate failure proofs observed red then restored, and the phone check with no horizontal
overflow or console error. Push, README Status and deployment wait for the owner.
