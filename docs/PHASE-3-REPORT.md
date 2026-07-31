# Phase 3 — review queue

**Date:** 2026-07-31

This is the phase gate described in brief §12. The review queue exists: tricky-flagged
and repeatedly-looked-up words feed a daily screen grouped by `localDate`, scheduled
with five Leitner boxes, and every pass or fail is logged as `review_pass` / `review_fail`
carrying a 4-point grade in `metadata`. Read the §12 checklist below, then either close
the phase or tell me what to change.

## Verdict

**Phase 3 is complete.** All three §12 "done when" items are implemented and verified —
two by a pinned test, one by exercising the running app. No schema change was needed;
`SCHEMA_VERSION` stays 1, so §5's migration plan and export-first reminder never
triggered, and a backup test confirms review grades survive an export/import round trip
unchanged.

## What shipped

| Sub-phase | What it does |
|---|---|
| 3a | `src/lib/review.js` — pure derivation of Leitner box, due date and enrollment from the event log; `logReview` in `src/db/events.js` |
| 3b | `src/components/ReviewSession.jsx` — the card flow; Repaso's new "Para hoy" section starts and hosts it |
| 3c | `newLexicalFromEntry` extracted to `src/db/items.js`; Repaso's "You keep looking these up" rail turns repeated dictionary lookups into one-tap enrollment |

`npm test` runs **184 tests** (143 at the end of Phase 2; 41 new). Every decision is in
`DECISIONS.md`, under the Phase 3a/3b/3c headings.

## The §12 checklist

| Required | Status |
|---|---|
| Daily screen grouped by `localDate`, fed by tricky-flagged and repeatedly-looked-up words | ✅ `deriveReviewState` — tricky flag, 3 distinct lookup days in 30, or open review history |
| Leitner boxes | ✅ 5 boxes, intervals 1/2/4/8/16 days, pass moves up and fail resets to box 1 |
| `review_pass` / `review_fail` events with a 4-point grade in metadata | ✅ `logReview` is the only writer; pass→2 (good), fail→0 (again), on the locked 0–3 scale |
| Orphaned events excluded | ✅ `deriveReviewState` filters to surviving lexical items only, as `deriveItemState` already did |
| Queue populates from real usage data | ✅ verified against the dev server (below) |
| Items reviewed successfully come back less often | ✅ `review.test.js`'s simulated month: gaps `[2, 4, 8, 16, 16]`, monotonically non-decreasing |
| Every review event carries a grade | ✅ enforced by construction (one writer) and checked by a backup round-trip test |

## Decisions this phase turned on

Full reasoning is in `DECISIONS.md`; the three load-bearing choices:

1. **Box and due date are derived from the log at render time, never stored.** The
   same approach Phase 1d used for views and tricky state. Consequence: no schema bump,
   no migration, and review history survives backup/restore unchanged — verified with a
   test that pushes grades through a JSON round trip.
2. **Dictionary entries reach the queue only through a one-tap Add.** Reviewing a
   `dict:` key directly was rejected: a dataset rebuild can move or drop that key, and
   §5 says personal data must never break when reference data changes. A "You keep
   looking these up" rail (3+ views in 30 days, unattached) offers the tap instead.
   Once added, dictionary-era lookups under the item's `dictKey` count toward its
   enrollment, so a freshly added word can be due immediately.
3. **The review flow lives inside Repaso.** No fourth tab — *Repaso* means review, and
   starting a session swaps the tab's content the way Cuaderno already swaps in
   `Detail`.

## Verified against the running app

Run with the dev server (`npm run dev`), not just `vitest`:

- A word flagged tricky (seeded directly into IndexedDB, no dictionary needed) appeared
  in **Para hoy**, due immediately, with a Start button and the correct due count.
- A full session: revealed the card (translation, notes, the owner's own example),
  graded "Got it", and the app returned to a session summary (`1/1`, "They come back
  later now"). The database showed exactly one new `review_pass` event with
  `metadata: { grade: 2 }` and the correct `localDate`.
- Back in Repaso: "Nothing left for today. Come back tomorrow," and the activity feed
  showed **Reviewed madrugar** — the label Phase 1d wrote and left waiting for this
  phase.
- With a fixture entry written into a reference database (no full 10k-entry download
  needed for this check) and three seeded dictionary-lookup events: the rail showed
  "You keep looking up **chamba** ×3"; tapping Add created a personal item carrying the
  dictionary's own gloss and attached it; Detail confirmed the attachment. The three
  lookups, fired at the same instant, correctly did **not** enroll the new word for
  review — they are one calendar day, not three, which is the distinct-day rule working
  as designed, not a bug. (The rail's own threshold is raw view count, a nudge; the
  review ladder's threshold is distinct days, an enrollment decision — deliberately
  different measures, per the brief's tricky/lookup enrollment rule.)
- No console errors and no server errors at any point in the above.

## What you need to do

**Use it for real.** The one thing no test or one-session walkthrough can stand in for
is watching the schedule stretch out over actual days of use: highlight or repeatedly
look up a handful of real words, review them daily for a week, and confirm the ones you
keep passing show up less and less while the ones you miss come back tomorrow. That is
the owner's half of the "done when" the simulated-month test only proves in principle.

**Try a fail.** Grade a word "Missed it" and confirm it's back in Para hoy the next day,
at box 1 — not later the same day.

**Watch a word graduate**, if you keep at one long enough: five passes in a row retires
it from the queue. It should quietly disappear rather than pile up forever.

## What was deliberately not built (§14)

No spaced-repetition scheduler beyond Leitner, no 4-button grading UI (the grade is
logged; the buttons stay pass/fail per §7), no pages in the queue, no daily cap, no
suspend/skip button, no review reminders. Reviewing a page and a daily cap are the two
most likely Phase 4 candidates if real use asks for them.

## Where things are

- `src/lib/review.js` — the derivation: constants, `deriveReviewState`,
  `deriveDictSuggestions`; pure, no database import, `today` passed in.
- `src/db/events.js` — `logReview`, the only writer of review events.
- `src/components/ReviewSession.jsx` — the card flow.
- `src/components/Repaso.jsx` — "Para hoy", the dictionary rail, and the session mount.
- `src/db/items.js` — `newLexicalFromEntry`, shared by the rail and `DictDetail`.
