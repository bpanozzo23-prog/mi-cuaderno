# Phase 16 direction — Review depth and one practice engine

**Status:** Proposed — distilled 2026-08-09 from owner-approved recommendations; the grading and
scope policies in §1–§2 and §5 were explicitly chosen by the owner in conversation. Confirm this
written form before implementation begins.
**Origin:** Claude Code review of the Repaso scheduled review, hub free practice (Phase 9),
Vocabulary-page Collection practice, and their relationship to the Gym (2026-08-09).

## Outcome

Deepen what the scheduled review measures and stop the app's practice surfaces from diverging.
Four grades feed the Leitner ladder the event log has reserved for them since Phase 3; typed
answers mark reverse and cloze cards objectively; a missed word gets a same-session second look;
a vacation's worth of due words chunks into sittings; a Vocabulary page can launch a real practice
session over its own collection; and free practice gains the direction, cloze and typed mechanics
that today exist only in scheduled review — all by converging on one shared card engine rather
than four separately maintained ones.

The observed problem, in one line: the ingredients of an excellent learning loop all exist in this
codebase, but no single surface holds more than two of them.

## Fixed boundaries

- **Leitner stays Leitner.** Five boxes, the existing `LEITNER_INTERVALS_DAYS`, box moves only.
  Grades choose the size of the step; there are no ease factors, per-item multipliers, or
  half-life models. This reads §14's deferral of "anything cleverer" as governing the scheduler
  family, and §12 Phase 3's requirement that every review event carry "the 4-point grade in
  metadata" as naming the input that was always meant to arrive. Record that reading in
  DECISIONS.md.
- **`SCHEMA_VERSION` remains 5. No new event types.** `review_pass`/`review_fail` continue;
  `grade` metadata now takes all four values of the existing `GRADES` constants (0 again, 1 hard,
  2 good, 3 easy). Replay reads `metadata.grade` with a strict fallback — a pass without a
  readable grade is `good`, a fail is `again` — so every historical event replays exactly as it
  does today. A red/green proof must pin that fallback.
- **Only scheduled review writes events.** Free practice, the missed round, and Collection
  practice stay event-free; §14's deferral of Collection practice history stands unamended.
- **The typed string is never persisted** (the Gym's rule, kept).
- **Direction, mode, and sizing controls are per-session and unremembered**, like every session
  control before them.
- **The Vocabulary page keeps both practice modes** (owner decision 2026-08-09): the in-place
  reveal list for quick skims, plus the launchable session.
- No notifications, tab badges, background queues, or automatic scheduling changes of any kind.

## 1 — Four-grade review (owner policy, decided 2026-08-09)

**Problem:** brief §7 locked a 4-point scale and `logReview` writes a grade on every event, but
the UI only ever writes 0 or 2. A word barely dredged up and a word known instantly march up the
ladder identically.

**Policy:**

- The two grade buttons in scheduled review become four: **Again / Hard / Good / Easy**.
- Box mapping: **Again → box 1. Hard → hold the current box** (a pass for streak and tally, but
  the word repeats its current interval). **Good → up one box. Easy → up two boxes, capped at
  box 5.** Retirement still requires a pass logged while already in box 5 — Easy from box 4 lands
  in box 5 rather than retiring, so no word retires without surviving the longest interval.
- Event shape: `again` logs `review_fail`, the other three log `review_pass`; the difference lives
  in `metadata.grade`. `logReview` takes an explicit grade and keeps the existing spread-last rule
  so no detail can overwrite it.
- `replayReviews` in `src/lib/review.js` implements the mapping. Red/green proofs: Hard holding a
  box, Easy capping at 5, Easy-at-4 not retiring, and a legacy gradeless pass replaying as Good.
- This applies to scheduled review only. Free practice and the missed round keep their two-button
  self-assessment — a grade without a schedule has nothing to choose.
- Four buttons must fit 375px with 44px targets; one row with short labels or a 2×2 grid is the
  implementer's call, verified in the closeout.

## 2 — Typed marking for reverse and cloze cards (owner policy, decided 2026-08-09)

**Problem:** scheduled review is the only surface that moves boxes and the only graded surface
with no objective marking. The Gym exists because self-grading invites overruling the marker; its
checker and accent policy are sitting in `src/lib/drill.js`, pure and importable.

**Policy:**

- A session-level **Type / Reveal** control joins the direction control on the Para hoy card,
  defaulting to Reveal (the scheduled session's familiar mode), unremembered like its neighbours.
- In a typed session, cards with a deterministic answer take a typed attempt: **reverse cards**
  (answer: the term) and **cloze cards** (answer: the blanked form). Plain forward cards
  (term → meaning) stay reveal-and-grade in both modes — a free-text meaning cannot be
  auto-marked.
- Marking reuses `checkTypedAnswer` — exact first, accent-near passes as a named slip, ñ stays a
  letter. The Gym's paradigm-collision failure is deliberately **not** imported here: it needs the
  full forms table and its subject (tense identity) is the Gym's, not vocabulary recall. If accent
  slips prove misleading in review, Phase 15's collision design is the template — note this in
  the code where the checker is called.
- **A wrong typed answer grades Again automatically** — the marker is final on failure, the Gym's
  precedent. **A correct one still asks Hard / Good / Easy**: correctness is objective, effort is
  the owner's to judge. The typed attempt and its verdict are shown beside the answer, and the
  typed string is discarded.
- Review events on typed cards additively record `mode: "typed"` and the verdict, exactly as
  Phase 10a recorded `direction`: it cannot be reconstructed afterwards. Reveal-mode events are
  unchanged.

## 3 — Missed round in scheduled review

After the graded pass completes, the completion screen offers **"Practice N missed again"** — a
session-only, shuffled second pass over the cards graded Again, using reveal-and-grade (or typed,
in a typed session) purely for the recovery experience. **It writes no events and moves no
boxes**: logging it would either double-move the ladder or force stage-aware filtering into
`replayReviews`, and the Gym already proved the learning value is in the immediate second attempt,
not in recording it. The round reports its recovery count and ends. Record the no-event choice in
DECISIONS.md.

## 4 — Session sizing

When more than 20 words are due, the Para hoy card offers a chunk choice — **10 / 20 / All** —
defaulting to 20; at 20 or fewer the control stays hidden and Start behaves exactly as today.
The chunk takes the head of the existing most-overdue-first order. Nothing is stored: finishing a
chunk re-derives due state and the completion screen offers "Start next N" while words remain.

## 5 — Vocabulary page practice session (owner decision: keep both modes)

The current in-place reveal list stays as the quick skim it is. Alongside it, the page gains a
launchable **real practice session** — the Phase 9 engine with rounds, missed-repeat, shuffle and
limits — scoped to the whole collection or one chosen group. Setup mirrors the hub's sheet
(count, shuffled / collection order); members without a meaning are excluded with the existing
"needs a meaning" messaging; the session is in-memory and writes nothing, so §14's Collection
deferral is untouched. DECISIONS.md's Phase 10 note that merging Phase 9's deck with other
practice "should be a deliberate decision rather than a drift" — this is that decision, made
deliberately. Entry-point layout (where the launch action sits relative to the existing practice
icon) is the implementer's call within the 375px rule.

## 6 — One card engine

Extract the shared card experience into components/hooks used by both ReviewSession and
PracticeSession: the three question faces (plain term, reverse gloss list, cloze gap), the reveal
flow, `LexicalAnswer`, the grade/mark strip, the typed input, and the missed-round loop. The
session shells stay separate — scheduled review writes events and shows box/reason chips; free
practice never writes — but the card between them becomes one implementation.

With the engine shared, free practice gains what it always lacked at near-zero marginal cost:
the **direction control** (forward / reverse / mixed via `cardDirection`), **cloze faces**
(loading example material at session start through Repaso's existing optional-dictionary pattern —
no dictionary, no cloze, never a failed start), and **typed marking** under the same rules as §2,
marked locally and never persisted.

The extraction itself must be behaviour-preserving: existing component tests pin both sessions
before any new capability lands on the shared engine.

## Delivery sequence

1. **Grades, pure first:** `replayReviews` mapping + fallback with its red/green proofs, then
   `logReview`'s grade parameter, then the four-button strip.
2. **Engine extraction, behaviour-preserving:** shared faces/answer/grade components; both
   sessions render as before; tests pin it.
3. **Typed marking in scheduled review** (§2), with mode/verdict metadata.
4. **Missed round** (§3).
5. **Session sizing** (§4).
6. **Free practice gains direction, cloze, typed** through the engine (§6).
7. **Vocabulary page session launch** with group scoping (§5).
8. Complete serial suite, production build, `git diff --check`, deliberate failure proofs,
   numerical 375×812 browser closeout, Phase 16 report, and DECISIONS.md entries for every policy
   above. Nothing is deployed unless separately requested.

Each step leaves the app fully usable; steps 3–7 are independently shippable behind step 2.

## Success

Grading a word Hard repeats its interval without climbing; Easy climbs two boxes and can never
retire a word below box 5; a pre-Phase-16 export replays to identical boxes before and after. In
a typed session, `té` typed for `te` marks and grades without hand-grading a failure, and a plain
forward card still reveals normally. A word graded Again reappears once before the session ends
and its box moves exactly once. Forty due words offer a 20-card sitting whose completion offers
the rest. A Vocabulary page group runs as a shuffled session with a missed-cards round, writing
zero events. Free practice can ask en→es with cloze sentences and typed answers, still writing
zero events. Every figure remains reproducible from the raw event log; every surface fits 375px.

## Deferred with intent (not silently dropped)

- **Audio question face** (hear the word, recall the meaning): natural, zero new data, but not in
  the approved set — a candidate for a later slice once the engine exists.
- **Per-direction scheduling, ease factors, half-life models**: §14 territory, untouched.
- **Recording missed-round or free-practice history**: deliberately event-free today; revisit
  only with evidence the loss of that history hurts.
- **Undo for a mis-tapped grade**: the append-only log has no cheap correction path; acknowledged
  cost, not addressed here.
- **Tab badges or due-count nudges outside Repaso**: conflicts with the owner-started ethos; not
  planned.
- **Gym convergence** (this engine and the Gym's drill shell): a later deliberate decision, after
  this phase proves the shared engine.
