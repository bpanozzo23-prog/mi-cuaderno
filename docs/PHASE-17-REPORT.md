# Phase 17 — Gym recognition lanes (report)

Implemented and verified locally 2026-08-09 on `main`; **pushed and deployed later the same day**
with the post-implementation review's content corrections (the verification below describes the
pre-push closeout). The owner requested the
approved direction be implemented in its written delivery sequence. The complete scope and
boundaries remain in [PHASE-17-DIRECTION.md](PHASE-17-DIRECTION.md), and durable choices are
recorded in `DECISIONS.md` under Phase 17.

## What changed

| Piece | Result |
|---|---|
| Gym setup | A Forms / Tense usage / Endings selector keeps the existing Forms path intact. Recognition setup needs only 10/20 prompts and an Everyday or custom tense scope; verb pool, people and Type/Reveal controls stay hidden |
| Shared choice engine | Every card has one canonical tense and three distinct distractors. Decks spread answers across tenses, avoid consecutive equal answers/option sets where possible, accept an injectable rng, and reshuffle the same options in one optional missed round |
| Endings | Nineteen simple/perfect rows cover the approved five Latin-American slots. Future and Conditional name the whole-infinitive cue. Reveal uses resolved hablar/comer/vivir tables, including composed perfects, or retains the full plain-text pattern without a dictionary |
| Tense usage | Thirty-five approved prompts include como si, both perfect subjunctives, stable command keys, curated contrast feedback, and Mexican-Spanish Present Perfect notes that keep Preterite out of the offered distractors |
| Events | Objective taps write existing `drill_pass` / `drill_fail` types with `skill`, stable card id, canonical tense, choice mode, session/prompt/stage fields and miss-only `chosen`; no item, verb, slot or typed text is invented |
| Performance | Recognition shows Usage and Endings accuracy, per-tense first-attempt results beside Forms, directional confusion counts, and missed-round recovery separately. Existing tense packs filter it; Saved/Core does not pretend recognition has a verb source |
| Grammar guides | Usage reveals derive at most two active Grammar-focused pages by normalized title, including natural Spanish terms such as “Pretérito.” Nothing is stored or auto-created, and opening requires a second session-ending tap |

## Contracts preserved

- `SCHEMA_VERSION` remains 5. There is no migration, preference, stored deck, queue, schedule,
  reminder, mastery counter or new event type.
- Recognition is owner-started and cannot change Leitner boxes, due dates, form accuracy or
  Adaptive form ordering. Three focused isolation tests pin those boundaries.
- Recognition card constants contain no personal ids. Grammar links are derived from the current
  items snapshot at render and disappear when no title qualifies.
- The dictionary remains optional. It enriches Endings reveal only; every prompt, answer and
  plain-text pattern remains usable without installation.
- Persisted tense identity remains the full Mood/Tense key. Commands display through
  `qualifiedTenseLabel` and never expose the misleading persisted `/Present` suffix.

## Delivery and deliberate failure proofs

The implementation followed the direction in six feature commits:

1. `c324e8a` — curated content, deterministic choice builder and shipped-data derivation proof.
2. `61e6b5f` — recognition setup/session/events and consumer isolation.
3. `ff3d6f8` — complete Endings reveals and no-dictionary fallback.
4. `d918367` — complete Usage content/reveal nuance.
5. `f77be90` — recognition statistics and confusion reporting.
6. `7407544` — derived Grammar-guide links and session-ending confirmation.

Two final-tree proofs were deliberately broken before restoration:

- Changing Present `-ar` `amos` to `emos` failed the packaged hablar derivation with the exact
  differing cell.
- Removing the recognition-skill guard from form Performance admitted an adversarial recognition
  miss into lifetime, recent, tense, diagnosis and recovery figures; restoring the guard returned
  the comparison to byte-for-byte equality.

## Complete automated verification

- Complete serial suite: **1,073/1,073 tests across 93 files** (`npm.cmd test`, 257.83 s).
- Production build: passed (`vite build`, 2,077 modules transformed; PWA generated).
- `git diff --check`: passed.
- Focused runs throughout the sequence covered content derivation, option uniqueness, objective
  marking, events, missed rounds, all three consumer boundaries, simple/perfect reveals, Usage
  special cases, statistics, normalized guide matching and the two-tap navigation guard.

Vite retains its advisory that the main app chunk is over 500 kB after minification. It does not
fail the build, and Phase 17 did not broaden into a code-splitting change.

## Browser closeout

A fresh local origin at port 4177 was fixed at 375×812. The dictionary stayed uninstalled to
exercise the optional seam. One disposable Grammar guide titled **Pretérito** was created through
the visible UI and deleted afterward. No owner browser data was available or inspected.

| Check | Numerical/result evidence |
|---|---|
| Setup | Usage setup showed 21 Everyday cards with no form-only controls; document `scrollWidth === clientWidth === 360` inside `innerWidth === 375`, with zero overflowing elements |
| Choice card | Four option chips each measured 301×44 px and ended at x=338; the card document measured exactly 375 px wide |
| Objective session | A wrong Indicative-present tap on a Subjunctive-present prompt immediately named both tenses and offered Next, not an immediate retry. The ten-card pass completed 1/10 and offered nine missed cards |
| Missed round | The first missed card's same four options changed from Subjunctive/Present/Imperfect/Future to Present/Subjunctive/Future/Imperfect; one correct recovery appeared separately as 1/1 in Performance |
| Endings | A Conditional card displayed “Added to the whole infinitive” before the answer and repeated the complete pattern in its no-dictionary reveal; all four choices remained 44 px |
| Performance | Usage read 10% / 10, six tense rows reconciled to the raw first attempts, nine directional confusion rows rendered, and missed recovery read 1/1 separately. No form attempt was manufactured |
| Grammar guide | The preterite sequence card offered `Open your guide · Pretérito`; the first tap warned that eight prompts remained and the second opened the page |
| Layout and console | Every checked setup/card/stat/guide surface had zero horizontal overflow. Browser logs contained no warnings or errors |

The guide fixture was deleted through the UI (its append-only create/view/delete events correctly
remain on that disposable origin), the viewport override was reset, the tab finalized, and the
isolated server stopped.

## Deliberately deferred

Flip-side usage recall, typed endings production, Adaptive cross-pollination, mixed recognition/
form decks, `-se` and future-subjunctive content, and the in-context production lane remain
deferred exactly as written in the direction. Nothing was deployed.
