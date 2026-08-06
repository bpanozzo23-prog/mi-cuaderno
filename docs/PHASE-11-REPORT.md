# Phase 11 — owner-centric stats (report)

Implemented 2026-08-06 on `main`. **Local only; not pushed or deployed.** The approved scope is in
[PHASE-11-DIRECTION.md](PHASE-11-DIRECTION.md); the reasoning lines are in `DECISIONS.md` under
Phase 11.

## What shipped

Four read-only views over data the notebook already holds. Nothing new is recorded: every number
is a replay of the event log and the items table at render time, so deleting these screens would
lose no data.

| Piece | Where |
|---|---|
| `activityByDay`, `streakFrom`, `heatLevel`, `heatmapWeeks`, `cumulativeWordsByWeek`, `boxDistribution` | `src/lib/stats.js` |
| `mondayWeekStart` — the week unit both calendars bucket by | `src/lib/dates.js` |
| Streak tile, 2×2 tile grid, Leitner ladder bars, sub-view entry row | `src/components/Repaso.jsx` |
| Activity calendar, growth line, streak headline | `src/components/Estadisticas.jsx` |
| Five-step intensity ramp | `src/index.css`, `src/theme.jsx` (`HEAT`) |
| Per-item added / box / last reviewed / next due strip | `src/components/Detail.jsx` |
| Gated review derivation feeding the strip | `src/components/Cuaderno.jsx` |

### Boundaries preserved

- No schema, event-type, metadata, preference, backup or timestamp change; `SCHEMA_VERSION` stays 5.
- No stored counters. `stats.js` imports nothing from `db/`, so none of it can write.
- No goals, targets, reminders, notifications, daily caps or missed-day messaging.
- Review scheduling is untouched: intervals, enrollment, grades and the session flow are unchanged.
- Phase 9's hub deck and Phase 10's direction, cloze, drill and speech are untouched.
- Journal-side streaks, completion and trends remain deferred on their original terms.

## Two decisions that changed the shape of the work

**`boxDistribution` had to count retired words despite their enrollment being cleared.**
`deriveReviewState` drops `enrolled` on graduation — that is precisely what retiring a word does —
so the first implementation, which read enrollment alone, had a Retired rung that could never show
anything. A component test walking a word up all five boxes caught it; the returned total is now
named `tracked` rather than `enrolled` because it no longer means "in the queue".

**Day-level activity counts events of since-deleted items** (owner decision). §7 excludes deleted
items' events from statistics to protect item-centric results such as queues and most-opened. The
activity calendar is owner-centric, and thinning past days on delete would make the history lie.
A test encodes this so the exclusion cannot creep back in.

## Automated verification

The complete serial suite passes **827/827 across 73 files** (762/71 at the start of the phase),
run at every commit, plus the production build and `git diff --check`.

Three deliberate red/green proofs each reddened exactly one test and no others:

1. Dropping the streak's yesterday grace → "stays alive on a day the owner has not opened the app
   yet" failed.
2. Filtering deleted items out of `activityByDay` → "counts an event whose item has since been
   deleted" failed, proving the owner's §7 clarification is genuinely test-enforced.
3. Removing the lexical filter from `cumulativeWordsByWeek` → "leaves pages out" failed.

One full-suite run reported a single failure whose identity was not captured, between two clean
runs. `App.test.jsx` — recorded in `DECISIONS.md` since Phase 10 as intermittently timing out under
full-suite load — passes 15/15 in isolation. Flagged rather than assumed to be the same cause.

## Browser closeout

A disposable 375×812 origin, seeded directly into Dexie with 24 words spread over ten weeks and
107 events across many days, including several under a deleted item's key. Screenshots do not
composite in this environment, so every check is numeric.

| Check | Result |
|---|---|
| Horizontal overflow, every new surface | `documentElement.scrollWidth` 375 = viewport |
| Streak tile | 24, matching an independent recount of the seeded log whose first quiet day was 24 days back |
| Tile grid | four tiles at 168px |
| Ladder | 4 / 0 / 1 / 1 / 1 with one retired; fills resolving to `C.pen` and `C.green` |
| Calendar | 112 cells, 109 labelled, three future days blank |
| Calendar colours | 0→heat-0, 1–2→heat-1, 3–5→heat-2, 6–7→heat-3, matching the 1/3/6/10 thresholds |
| Calendar width | grid 254px, no inner scroll |
| Growth line | SVG 317px inside a 341px card, reporting 24 words |
| Sub-view entry row | 44px tall |
| Detail strip | wrapped to two lines inside a 341px card: "box 1 · reviewed 1d ago · due today" for a missed word, "retired" with no due segment for a finished one |

No seeded day reached ten events, so `heat-4` rests on its unit test rather than a browser
measurement. Fixtures were deleted afterward; no owner data was inspected and nothing was deployed.

## Not done

Retention rates, per-box accuracy, leech detection, frequency-band coverage against the bundled
dictionary, per-direction or per-grade breakdowns, notebook-health views, and any export or print
of statistics. Most need real data volume before they would say anything true; they are recorded
in `docs/IMPROVEMENT-IDEAS.md` rather than built.
