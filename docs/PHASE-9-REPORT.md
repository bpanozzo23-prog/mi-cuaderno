# Phase 9 — filtered free-practice flashcards (report)

Implemented 2026-08-05 on `codex/phase-9-free-practice`. **Local only; not pushed or deployed.**
The approved scope is in [PHASE-9-DIRECTION.md](PHASE-9-DIRECTION.md); the reasoning lines are in
`DECISIONS.md`.

## What shipped

The Words & phrases hub now turns its current filtered or searched result set into a transient
Spanish-first flashcard deck. Repaso remains the only scheduled and event-backed review flow.

| Piece | Where |
|---|---|
| Eligibility, limits, stable current order and injectable Fisher-Yates shuffle | `src/lib/practice.js` |
| 10 / 20 / All and Shuffled / Hub order preflight | `src/components/PracticeSetupSheet.jsx` |
| Reveal, Again/Got it, summaries and missed-only rounds | `src/components/PracticeSession.jsx` |
| Shared meanings, cues and optional context presentation | `src/components/LexicalAnswer.jsx` |
| Current-view count, incomplete-entry explanation and session ownership | `src/components/LexicalHub.jsx` |

### Boundaries preserved

- No schema, database, preference, backup or timestamp change; `SCHEMA_VERSION` stays 5.
- Free practice imports no event writer and writes no review or practice event.
- Opening the full entry remains normal navigation and retains the existing detail `view` rule.
- Scheduled Repaso still writes pass/fail grades and exclusively controls the Leitner schedule.
- Vocabulary-page Practice remains reveal-only and follows saved page/group order.
- Raw dictionary entries, pages and entries without a personal meaning never become cards.

## Automated verification

- `npm.cmd test -- --no-file-parallelism` — **662 passed / 662, 64 files**, 272.76s.
- `npm.cmd run build` — passed, 1,873 modules transformed in 2.88s.
- `git diff --check` — clean.
- Focused implementation and regression set — **55 passed / 55, 7 files**, including scheduled
  ReviewSession and Vocabulary-page Collection Practice.

### Deliberate red/green proof

`isPracticeEligible` was deliberately weakened to accept every lexical entry. Four tests failed:
the pure blank/missing-meaning eligibility and post-filter limit tests, plus the hub's omitted count
and disabled zero-answer state. Restoring the meaning requirement returned the complete suite to
green. This proves the guardrail can detect the exact failure that would create answerless cards.

## Browser closeout — 375×812, disposable local origin

**Passed, including visual screenshots.** The first local origin exposed a pre-existing schema-4
upgrade gate, so it was left untouched immediately. Verification moved to a fresh port-specific
origin, seeded three lexical entries entirely through the visible UI: one word and one phrase with
meanings, plus one word without a meaning. No owner data was inspected or changed; the disposable
tab was closed and both local servers were stopped afterward.

Confirmed:

- Entering through `palabras` kept the Words filter active and reported **1 answerable card · 1
  needs a meaning**; the phrase stayed outside the candidate set.
- The Practice control measured 44px high and the preflight defaulted to **20** plus **Shuffled**,
  while honestly reporting the capped result as **Practice 1 of 1 eligible card**.
- Hub order started *sacar*. The Spanish prompt revealed *take out* plus *sacar la basura*; no
  answerless card appeared.
- Opening the full entry and returning through **Words & phrases** restored the same revealed card.
- Again produced a 0/1 summary and a one-card retry; round 2 showed only *sacar*, and Got it produced
  a 1/1 completion with no further retry action.
- Again/Got it measured 44px high. At every checked state `scrollWidth === clientWidth` with
  `window.innerWidth === 375`; there was no horizontal overflow.
- Repaso still said **Nothing in review yet**, showed no due-word count and offered no Start action.
- The browser console contained no warnings or errors.

## Not done

- Saved decks, persistent scores/history, reverse direction, exact-page or
  part-of-speech filter, or scheduling beyond the existing Leitner review.
