# Phase 15 direction — Gym correctness, Focus depth and accent semantics

**Approved:** 2026-08-09
**Status:** Implemented locally and verified — not deployed
**Origin:** External review (Codex, 2026-08-09) verified claim-by-claim against the source in a
second review (Claude Code, 2026-08-09). Every item below names the verified problem it fixes.

## Outcome

Make the Gym's measurements trustworthy and its practice actions genuinely usable: Focus sessions
build a real deck around a target instead of collapsing to one question, Adaptive weighs what was
missed *recently* instead of forever, tense-changing accent mistakes stop counting as passes, and a
batch of verified small defects is cleared. Two hand-curated pattern packs extend the curriculum
the same way Core 20/Core 50 already work.

The learning loop is unchanged from Phase 14: **find a weakness → practise it deliberately → retry
it → see whether recent performance improved.** This phase makes each arrow of that loop honest.

## Fixed boundaries (all Phase 14 boundaries persist)

- Still not Leitner: no enrolment, box changes, due dates, background queues or stored mastery.
  Adaptive ordering happens only inside an owner-started Adaptive session.
- `SCHEMA_VERSION` remains 5. No new event types; the one new `diagnosis` value is additive
  metadata on the existing `drill_pass`/`drill_fail` events. All statistics stay derived from the
  append-only log at render.
- Historical events are never rewritten or reinterpreted beyond what their stored fields support.
  The typed answer string was deliberately never persisted, so past accent passes cannot be
  reclassified as collisions; the accent-policy change applies from its ship date forward and the
  seam is acceptable.
- Settings remain per-session and unremembered. New pattern packs are verb pools like Core 20/50:
  reference-only, resolved by exact lemma, never creating or editing a personal item.
- Out of scope, deliberately (see final section): the in-context sentence lane, any session-state
  persistence architecture, the full half-life-regression adaptive model, Saved-pool tag subsets.

## 1 — Maintenance batch (no owner decisions inside; one concern per commit)

Verified defects and stale artifacts, each independently shippable:

- **Adaptive crash on `metadata: null`.** `isInitialAnswer` dereferences `event.metadata.stage`
  unguarded (`src/lib/conjugationGym.js:188`) while the backup validator (`validateEvent`,
  `src/db/backup.js`) never checks `metadata` and `logEvent` defaults it to null. Use optional
  access throughout `historyForAdaptive`; skip events lacking `verbKey`/`tense`/`slot` as it
  already does. Add a test importing a null-metadata drill event.
- **Practice-action state leak.** `practiceFromStats` (`src/components/ConjugationGym.jsx:164`)
  only overwrites `tensePack`/`customTenses` when the focus carries a tense, and only clears
  `oneVerb` on two of its branches — a previous custom tense or one-verb choice leaks into a later
  action (the Performance screen's "All" source reaches the leaking path). Reset **all** setup
  state — `pool`, `oneVerb`, `mode`, `size`, `tensePack`, `customTenses`, `slots` — to defaults
  first, then apply the focus.
- **Reveal completion line.** The done screen always prints `N exact · N accent slips`
  (`src/components/ConjugationDrill.jsx:181`); both are always 0 for reveal sessions because
  self-grades carry `verdict: "self"`. Omit the line when the session recorded no typed verdicts.
- **Mid-session library reloads.** `onGraded` triggers a notebook reload, the new `items` array
  re-fires the `loadGymLibrary` effect (`src/components/ConjugationGym.jsx:70`), and every Saved
  and Core conjugation table is re-read from IndexedDB after **every answer**. Do not reload the
  library while a session is active; refresh once on return to setup.
- **Session-ending navigation warns first.** "Open saved/dictionary entry" on the answer side
  changes tabs; Repaso is mounted only while its tab is active (`src/App.jsx:336`), so returning
  builds a fresh Gym and the remaining deck is gone. Before calling `onOpen` mid-session, require
  an explicit confirmation in the app's existing confirm idiom, stating plainly that opening the
  entry ends the session and how many prompts remain. (Keeping the session alive across tabs is an
  App-architecture change and is deliberately out of scope.)
- **Dead code.** `buildDrillDeck` (`src/lib/drill.js:157`) and `drillPerformance`
  (`src/lib/stats.js:255`) are referenced only by their own tests. Remove both and their tests.
  Update `drill.js`'s Phase 10c header comment, which still describes the drill as ungraded and
  recordless.
- **Stale status lines.** The Phase 14 closeout commit is an ancestor of `origin/main` and pushes
  to main deploy automatically, so README's "implemented locally; not deployed" is wrong for
  Phase 14 and the features after it. Reconcile README's Status section and the status lines of
  `PHASE-14-DIRECTION.md`/`PHASE-14-REPORT.md` with what `origin/main` actually serves.
- **`-se` imperfect subjunctive label.** The setup list marks it "rare" via `RARE_TENSES`. The RAE
  model paradigm presents `-ra` and `-se` as alternatives; label this one tense
  "alternative/less common" and keep "rare" for Future Subjunctive and the archaic forms.
- **Performance screen defaults and actions.** Default the tense-pack filter to Everyday (the
  All view's 19-tense coverage denominator reads as discouraging, not informative). Add the same
  practice action the weak-verb rows already have to each tense row and person row, passing
  `{ tense }` or `{ slot }` through the existing `onPractice` path.

## 2 — Accent collision semantics (owner grading-policy decision; approving this doc approves it)

**Decision being amended:** DECISIONS.md 2026-08-06 — accent-near answers pass as named slips.
The phone-keyboard rationale stands for genuinely harmless slips; it fails when the unaccented
string is itself another real form, because the drill then marks the wrong tense correct in a
drill whose subject is tense. The Core 50 Everyday grid contains dozens of such collisions
(`hablo`/`habló`, `hable`/`hablé`).

**Policy:**

- Typed verdicts remain `exact | accents | wrong`; the headline stays first-attempt pass rate.
- When `checkTypedAnswer` returns `accents`, check the verb's own `forms` table (already passed to
  `diagnoseTypedAnswer`, `src/lib/drill.js:112`) for a **different** cell whose form exactly
  matches the tidied typed string. No match → today's behaviour: pass, named accent slip.
- A match → **fail** with new diagnosis `accent_collision`, message in the spirit of "The accent
  decides the tense here — without it this is a different form." The normal one-retry and
  missed-round machinery applies; the current early return at `drill.js:114` must move so
  accent-near answers reach diagnosis at all.
- Stats: `accent_collision` joins the Error patterns list; the existing exact/accent-slip split
  keeps reporting exact accuracy alongside. Adaptive needs no special casing — collisions are now
  ordinary failures and select cells through the ordinary buckets.
- Record the amendment in DECISIONS.md with strikethrough-plus-replacement on the affected claim,
  per the brief's amendment convention.

## 3 — Focus produces a real practice set

**Problem:** a Problem-form action configures a one-verb pool, one tense and one person; the deck
builder de-duplicates cells, so "10 prompts" is a one-question session. There is also no preview of
how many forms match before Start.

**Direction:**

- A focus **target** `{ verbKey/itemKey, tense?, slot? }` becomes an input to deck building rather
  than a strict filter. Seed the target cell(s) first, then fill outward in priority order: same
  verb and tense across other selected people; same verb and person across the session's other
  selected tenses; then the existing balanced fill. `balancedSelection` already accepts a
  `seedDeck` parameter (`src/lib/conjugationGym.js:133`) — extend the pure module, keep it
  React-free and deterministic under an injected rng.
- Practice actions stop narrowing the setup to a single tense/person. A cell action keeps the pack
  at Everyday (adding the target tense if it lies outside), keeps all people, and carries the
  target; tense/person/verb actions carry only their dimension. The target is visible on the setup
  screen and clearable.
- The setup screen shows the **available unique-form count** for the current choices before Start,
  and Start warns (not blocks) when fewer unique forms exist than the requested deck size.

## 4 — Adaptive becomes recency-aware (minimal version, deliberately)

**Problem:** "recent misses" is every unresolved historical failure; only a retry or missed-round
pass sharing the original `promptId` resolves one, so a clean initial answer a week later resolves
nothing; cell/tense/slot weakness is a lifetime ratio that responds ever more slowly.

**Direction — three changes, nothing more:**

- A later clean **typed initial** pass on the same cell resolves that cell's earlier failures.
  `promptId` recovery still counts within a session; this adds the between-sessions path.
- The recent-miss bucket considers only unresolved failures from the **last 90 days**, newest
  first (reveal-mode misses still qualify as evidence of a miss, as today).
- Cell, tense and slot accuracy use a **rolling window of the last 10 typed initial attempts** per
  key instead of lifetime totals; `lastAt` and exposure counting stay as they are. The weak
  threshold (≥3 attempts, <80%) applies within the window.

The 40/30/30 bucket structure, the balanced fallback, the owner-started boundary and the pure
`events in → deck out` shape are unchanged. The full multi-feature score (consecutive-recall
streaks, elapsed-time decay, diagnosis-level weakness, exploration shares à la half-life
regression) is explicitly deferred: at this notebook's attempt volume the three changes above
capture most of the value, and the pure module makes a later upgrade cheap if the simple version
still feels wrong.

## 5 — Pattern packs (hand-curated, like Core 20/50)

Two new verb pools beside Saved/Core 20/Core 50, defined as curated lemma lists in
`conjugationGym.js`. No classifier is built: the dictionary ships no irregularity metadata, and
deriving classes by comparing paradigms is real work with ugly edge cases (`buscar/busqué`).
Curated lists reuse the entire existing pool mechanism, including the
"unavailable in this dictionary version" reporting for lemmas a rebuilt dictionary lacks.

- **Stem changers:** pensar, querer, entender, perder, empezar, sentir, preferir, poder, volver,
  encontrar, dormir, morir, pedir, seguir, servir, repetir, jugar.
- **Irregular preterites:** ser, ir, dar, ver, hacer, decir, querer, venir, poner, poder, saber,
  tener, estar, traer, andar, conducir.

Implementation verifies every lemma against the shipped tables and drops absentees at review time
(the lists above are the owner-approved intent, not untouchable data). Further packs — regulars,
spelling changes, reflexives — wait for evidence the first two earn their place.

## Delivery sequence

1. Maintenance batch (§1), one concern per commit, suite green after each.
2. Accent collision semantics (§2) plus its DECISIONS.md amendment.
3. Focus depth (§3): pure-module seeding first with tests, then setup-screen count and target UI.
4. Adaptive recency (§4): pure-module change with red/green proofs that each of the three rules
   can fail (an old resolved failure selected anyway, an out-of-window failure selected, a
   lifetime-weak-but-window-strong cell still marked weak).
5. Pattern packs (§5).
6. Complete serial suite, production build, `git diff --check`, numerical 375×812 browser closeout
   and a Phase 15 report. Nothing is deployed unless separately requested.

## Success

A Problem-form tap starts a full-size session that opens on the exact problem cell and stays in
its neighbourhood; the setup screen says how many forms match before Start. Typing `hablo` for
`habló` fails with a named accent-collision diagnosis and offers the retry, while a harmless slip
still passes as a slip. A cell missed last month and answered cleanly since no longer headlines an
Adaptive deck, and a null-metadata import cannot crash one. Reveal completions no longer report
typed-only measures, mid-session answers stop re-reading conjugation tables, leaving a session for
an entry requires a plain-language confirmation, and README's status matches what `origin/main`
serves. All figures remain reproducible from the raw event log; every surface fits 375px.

## Deferred with intent (not silently dropped)

- **In-context skill lane** (produce the form from a sentence/meaning cue): highest-ceiling idea
  from the review; needs its own direction doc covering cue sourcing from existing personal and
  dictionary examples, scoring separation from the forms lane, and the no-generated-content
  policy. Do not let it ride along with fixes.
- **Session persistence across tabs** (overlay or lifted state): structural App change; the §1
  warning removes the surprise, which is the harm. Revisit only if the warning proves irritating
  in daily use.
- **Saved-pool subsets from tags or Vocabulary pages**, and per-pack coverage views: good later
  ideas, unproven need today.
- **Full adaptive scoring model**: see §4.
