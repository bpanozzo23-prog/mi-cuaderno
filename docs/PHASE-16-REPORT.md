# Phase 16 — Review depth and one vocabulary-card engine (report)

Implemented and verified 2026-08-09 on `main`. **Pushed and deployed later the same day** (the
verification below describes the pre-push closeout). The owner
approved §1, §2, §3 and §5 as written; the full approved scope and delivery order are in
[PHASE-16-DIRECTION.md](PHASE-16-DIRECTION.md). Durable policy choices are recorded in
`DECISIONS.md` under Phase 16.

## What changed

| Piece | Result |
|---|---|
| Four scheduled grades | Again resets to box 1, Hard holds, Good climbs one and Easy climbs two capped at box 5. Retirement still requires a pass while already in box 5. Legacy/malformed pass and fail events replay strictly as Good and Again |
| Review writer | `logReview` now requires the grade. Again writes `review_fail`; the other three write `review_pass`; grade metadata cannot be overwritten by caller details |
| Shared card engine | Scheduled review and free practice use the same plain, reverse and cloze faces, reveal/context state, answer rendering, typed marking and grade/mark controls while retaining separate session shells |
| Typed scheduled review | Reverse cards type the term; cloze cards type the gap; plain forward cards still reveal. Wrong grades Again immediately. Exact/accent-near success asks Hard/Good/Easy. Events store mode/verdict, never the typed string |
| Scheduled recovery | Cards graded Again can run once more in a shuffled reveal/typed round. Recovery uses two local outcomes, writes no event, moves no box and reports a separate score |
| Large queues | More than 20 due words offers 10/20/All, default 20, from the current due-order head. Completion waits for writes, re-derives due state and offers the next current chunk |
| Hub free practice | Setup adds forward/reverse/mixed and Reveal/Type. Session preparation adds personal/dictionary cloze material through an optional seam. Typed misses feed the existing local missed round |
| Vocabulary pages | The in-place reveal skim remains. A second play action opens whole-Collection or group-scoped sessions with limits, shuffle/Collection order, direction, typed mode and missed rounds |

## Contracts preserved

- `SCHEMA_VERSION` remains 5. There is no migration, preference, new event type, stored deck,
  stored cursor, reminder, background queue, ease factor or mastery score.
- The append-only log remains the sole authority for scheduled review. Only primary scheduled
  grades write events; scheduled recovery, hub practice and Collection practice write none.
- Pre-Phase-16 gradeless history replays to the same boxes. The strict fallback is Good for a pass
  and Again for a failure.
- The raw typed response is visit-local. Only scheduled typed grades add `mode` and `verdict`
  metadata.
- The dictionary remains optional. Personal examples can make cloze cards alone; failed reference
  or conjugation reads degrade to ordinary cards and never block session launch.
- Free-practice direction, mode, size, order, scope, answers and missed rounds are all transient.
  The persistent Collection practice history/grading/scoring/scheduling deferral remains intact.

## Delivery and deliberate failure proofs

The implementation followed the direction's sequence in seven feature commits:

1. `0ee62c5` — four-grade replay, writer and UI.
2. `e3365cf` — behavior-preserving shared card extraction.
3. `2b06fac` — typed scheduled review.
4. `97c12cc` — history-free scheduled recovery.
5. `778e71d` — due-queue chunking.
6. `46cd981` — shared direction/cloze/typed free practice.
7. `b2738d3` — whole/group Collection sessions alongside the skim.

The grade/replay/writer/UI proof first failed in eight cases. Typed review failed in five, recovery
in two, queue sizing in two, expanded hub practice in five, and the Collection launch in one.
Each failure was caused by the intended missing behavior, not a test harness race; every batch
passed after its slice landed. Existing scheduled/free-practice tests pinned the extraction before
new behavior was added.

## Complete automated verification

- Complete serial suite: **1,044/1,044 tests across 87 files** (`npm.cmd test`, 259.78 s).
- Production build: passed (`vite build`, 2,070 modules transformed).
- `git diff --check`: passed.
- Focused Phase 16 runs passed throughout the sequence, including 68 shared engine/hub/Repaso
  tests and the 24-test Collection/setup closeout.

Vite retains its advisory that the main app chunk is over 500 kB after minification. It does not
fail the build, and Phase 16 did not broaden into a code-splitting change.

## Browser closeout

A disposable schema-v5 backup with 22 lexical items, one Vocabulary page and 21 `tricky_on`
events was restored through the app's validated import flow on a fresh local origin at port 4176.
The dictionary stayed uninstalled to exercise the optional seam. The in-app browser was fixed at
375×812 and driven through visible controls; no owner browser data was available or inspected.

| Check | Numerical/result evidence |
|---|---|
| Queue sizing | Repaso showed 21 due and 10 / 20 / All 21, with 20 selected. Each size target was ~93.3×44 px. The vertically scrolling page measured `scrollWidth === clientWidth === 360` inside `innerWidth === 375` |
| Four grades | The 2×2 strip measured 343×96 px. Again/Hard/Good/Easy were each 167.5×44 px, spanning x=16 through right=359; document width was exactly 375 with zero horizontal overflow |
| Scheduled typed face | Reverse Type opened “How does it seem to you?”, accepted the exact `¿Cómo te parece?`, showed the attempt beside the answer and offered only Hard/Good/Easy after success |
| Collection entry points | Practice skim, Start practice session and Organize were three 44×44 px actions at x=187/239/291, all inside right=335; the underlying document held 360===360 |
| Collection setup | Whole collection reported 4 eligible and one missing; Questions and Daily verbs each reported two. The sheet was 360×796 px from y=16 to 812, with `overflow-y:auto`, 832 px scroll content, 345===345 inner width, and every new radio label/button at least 44 px |
| Group session and recovery | Questions launched in Collection order as a two-card en→es typed session. The card was 343 px wide; input and Check were 301×44 px. A wrong first answer became local Again, completion offered Practice 1 again, and the one-card recovery ended 1/1 |
| Hub setup and cloze | The shorter hub sheet was 360×571.5 px with 572 px content and no horizontal overflow. A search-narrowed `sacar` session produced “Tengo que ___ la basura”, accepted typed `sacar` exactly, then offered Again/Got it |
| Event boundary | Opening the Collection moved the fixture from 21 to 22 events. The Collection session, recovery round and hub cloze session left the count at 22 |
| Console | No warnings or errors |

The browser pane's known frame-compositing limitation means no screenshot was captured; the pass
used DOM state, computed geometry, event-count UI and console output. The generated fixture JSON
and generator were removed, the viewport override reset, the tab finalized and the server stopped.
The disposable IndexedDB state exists only on that stopped port-specific origin.

## Deliberately deferred

Audio question faces, per-direction scheduling, ease/half-life models, persistent free-practice or
recovery history, grade undo, tab badges, automatic queues and Gym/card-engine convergence remain
deferred exactly as written in the direction. Nothing was deployed.
