# Phase 9 — filtered free-practice flashcards (direction)

Approved 2026-08-05. This is the decision-complete scope. Implementation outcomes live in
[PHASE-9-REPORT.md](PHASE-9-REPORT.md); the reasoning lines live in `DECISIONS.md` under Phase 9.

## Why

Phase 8 made the Words & phrases hub the one place that can narrow personal vocabulary by form,
page context, learning state, completeness, tag and search. Repaso already supplies scheduled,
event-backed Leitner review, while a Vocabulary page supplies lightweight reveal-only Practice in
its own saved order. Neither answers the separate need to practice any useful subset immediately.

Phase 9 turns the hub's current result set into an in-memory flashcard deck without creating a
second scheduler or changing the meaning of review history.

## Owner decisions

1. **Free practice, not filtered Repaso.** Any currently matching personal words and phrases can
   be practiced; Repaso remains the only scheduled review flow.
2. **The hub is the deck builder.** The existing filters and active search define the candidates.
   There is no separate filter system, exact-page picker, part-of-speech filter or saved deck.
3. **Feedback is session-only.** Again/Got it supports a missed-only follow-up round but writes no
   review event, history, score, preference or schedule change.
4. **Spanish comes first.** One lexical entry is one card and reveals every personal meaning and
   usage cue together, with notes and examples optional.

## Experience

- A prominent **Practice this view** card reports the answerable count and how many matching
  entries need a personal meaning. Practice is disabled when none are answerable.
- The preflight offers 10, 20 (default), or All cards and Shuffled (default) or current hub order.
  It reports the actual selected count after the available-card cap.
- Starting snapshots the deck's entries and order. The session can be finished at any time, and
  opening a full entry then returning preserves the card and reveal state.
- Again and Got it advance through one pass. Its summary can start another shuffled pass containing
  only the cards marked Again, or return to the hub with all visit-local controls intact.

## Boundaries held

- Personal lexical entries only; no raw dictionary entries and no pages.
- Entries without personal meanings are excluded rather than shown as broken cards.
- No event, database, backup, preference, item timestamp or schema change; `SCHEMA_VERSION` stays 5.
- Scheduled `ReviewSession` keeps its pass/fail event writer and Leitner behavior unchanged.
- Vocabulary-page Practice keeps its reveal-only, saved-order behavior unchanged.
- No reverse or mixed direction, daily cap, reminder, persistent result, streak, score, saved deck,
  practice history or scheduling beyond the existing Repaso Leitner model.

## Verification

Pure deck-selection tests, component tests for the setup and multi-round session, unchanged Repaso
and Collection Practice regressions, the complete serial suite, production build, `git diff
--check`, deliberate red/green proofs, and a disposable 375×812 browser flow that inspects no owner
data.
