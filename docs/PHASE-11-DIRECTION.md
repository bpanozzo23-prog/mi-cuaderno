# Phase 11 — owner-centric stats (direction)

Approved 2026-08-06. This is the decision-complete scope. Implementation outcomes live in
[PHASE-11-REPORT.md](PHASE-11-REPORT.md); the reasoning lines live in `DECISIONS.md` under Phase 11.

## Why

The brief's Phase 4 candidate list has named "better stats" since v3, and Repaso has been the
derived-stats surface since Phase 1d — but it still shows the three counters it shipped with
(items, opens, tricky), a most-opened list and recent activity. Everything a richer view needs is
already recorded: `localDate` on every event, `createdAt` on every item, and the complete Leitner
picture `deriveReviewState` replays on each render.

Phase 11 spends that existing data on four read-only views. It records nothing new. The point is
to answer three questions the notebook currently cannot: *am I showing up*, *is the vocabulary
growing*, and *how far along is any given word*.

## Owner decisions

1. **The study streak and activity heatmap proceed, amending the deferral in
   `docs/IMPROVEMENT-IDEAS.md`.** That row defers "streaks, completion, trends" over stored
   counters, analytics pressure and overlap with Repaso. Two of those three do not apply here:
   nothing is stored, and these stats live *in* Repaso rather than beside it. The remaining
   concern — a breakable chain that nags — is accepted deliberately: the streak is a number the
   owner can look at, not a goal, reminder, target or notification. Journal-specific streaks,
   completion and trends in Diario remain deferred.
2. **Day-level activity counts every event, including events of items since deleted.** §7 says
   deleted items' events stay in the log but are excluded from active queues and statistics. That
   exclusion protects *item-centric* results — a deleted word must not sit in a queue or a
   most-opened list. The activity calendar is *owner-centric*: studying a word later deleted was
   still studying that day, and thinning past days on delete would make history lie. Encoded as a
   test so it cannot drift back.
3. **Placement is split by frequency of use.** The streak tile and the Leitner box distribution
   are inline on Repaso, seen daily. The heatmap and growth chart sit behind an **Estadísticas**
   sub-view, reached from Repaso and returning to it — the same local swap `ReviewSession` and the
   conjugation drill already use, with no route, tab or back-label plumbing.
4. **Growth is cumulative, weekly, and lexical only.** Total words in the cuaderno over time,
   bucketed by week from each item's `createdAt`. Pages are excluded; deleted items are absent
   from the items table by construction, which satisfies §7 without a filter.
5. **The heatmap is Monday-start, 16 trailing weeks, with fixed intensity buckets.** Monday is the
   Spanish convention; 16 weeks fits 375px at a legible cell size without horizontal scrolling;
   fixed buckets (1/3/6/10 events) keep a quiet week from being recolored by a busy one, which a
   relative scale would do.
6. **This is not the "no analytics" non-goal.** §13 rules out analytics in the telemetry sense —
   measuring the owner for someone else's benefit. These are on-device derived views of the
   owner's own log: nothing is measured, stored, sent or retained beyond the events that already
   exist.

## Experience

- **Repaso** gains a fourth counter — the current streak, in days — and the tile grid becomes 2×2
  so four numbers stay legible on a phone.
- A new **Estadísticas** section shows the review ladder as six bars: boxes 1 through 5 plus
  Retired. It appears only when something is enrolled, and derives from the review state Repaso
  already computes for the daily queue.
- Below it, a tappable **Actividad y crecimiento** row opens the sub-view.
- The **sub-view** leads with the streak, then a 16-week activity calendar coloured by how much
  happened each day, then a cumulative line of how the vocabulary has grown. Back returns to
  Repaso with everything as it was.
- **Every lexical entry** shows a compact strip beneath its heading: when it was added, how many
  times it has been opened, when it was last opened, its review status (box N, retired, or not in
  review), when it was last reviewed and when it is next due.

## Boundaries held

- No new event types, no new metadata, no stored counters, no schema change: `SCHEMA_VERSION`
  stays 5. Every number is derived at render from the log and the items table.
- No goals, targets, reminders, notifications, daily caps or "you missed a day" messaging.
- No journal streak, journal completion or Diario trends — those stay deferred.
- Review scheduling is untouched: Leitner intervals, enrollment rules, grades and the session
  flow behave exactly as before.
- Phase 9's hub deck and Phase 10's session direction, cloze, drill and speech are untouched.
- Per-direction, per-face and per-grade breakdowns stay out; the batch adds no accuracy or
  retention statistics, which need real data volume before they say anything true.
- Nothing leaves the device and nothing is deployed by this phase.

## Verification

Pure derivation tests with injected dates (streak grace, deleted-item counting, week bucketing
across month and year boundaries, box counts excluding unenrolled items), component tests for the
Repaso additions, the Estadísticas sub-view and the Detail strip, unchanged Repaso/Detail
regressions, the complete serial suite, production build, `git diff --check`, three deliberate
red/green proofs, and a disposable 375×812 browser closeout verified numerically — no owner data
inspected, fixtures deleted afterward.
