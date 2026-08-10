# Phase 15 — Gym correctness, Focus depth and accent semantics (report)

Implemented and verified 2026-08-09 on `main`. **Pushed and deployed later the same day** (the
verification below describes the pre-push closeout). The
approved scope and delivery order are in [PHASE-15-DIRECTION.md](PHASE-15-DIRECTION.md); durable
contract decisions are recorded in `DECISIONS.md` under Phase 15.

## What changed

| Piece | Result |
|---|---|
| Maintenance | Malformed/null drill metadata is ignored safely; every stats handoff resets the whole per-session setup; Reveal completion omits typed-only exact/accent totals; dictionary-library refreshes wait until a live session ends; opening an entry requires a second tap and names the prompts still at risk; superseded drill/stat derivations were removed; Phase 14 deployment status was reconciled; the `-se` imperfect is “alternative / less common”; performance defaults to Everyday and every top-level tense/person row has a practice action |
| Accent semantics | Exact answers still pass. A harmless accent omission such as `comeriamos` for `comeríamos` remains an `accents` pass. If the tidied response is exactly another cell in the same paradigm, such as `hablo` for `habló`, it fails as `accent_collision`, uses the ordinary retry/missed-round paths and appears as “Accent changes the tense” in Error patterns |
| Focus | Pure `buildFocusedGymDeck` ordering starts with an exact target, expands through the same verb+tense, then verb+person, then balanced fill. Verb-, tense- and person-only targets use the same outward rule. Stats handoffs keep Everyday plus every person instead of collapsing the supply; an out-of-pack target tense is temporarily included. Setup shows a visible, clearable target and the unique answerable-form count; a short deck is named but may still start |
| Adaptive | The 40/30/30 missed/weak/exploration structure remains. Misses are unresolved only until a later typed initial pass on that cell, expire after 90 days, and reveal misses still qualify. Weakness uses each cell/tense/person's rolling last 10 typed initial attempts; lifetime exposure and latest-at ordering remain available for exploration |
| Pattern packs | Stem changers (17 approved lemmas) and Irregular preterites (16) are new exact-lemma, reference-only pools. Overlaps with each other and Core 50 de-duplicate to 56 packaged curriculum lemmas. The existing unavailable count, source identity and event path are reused; events keep `source: "core"` and name the pool in `curriculum` |
| Runtime hardening | The browser closeout exposed a React Strict Mode cancellation edge in the new deferred library reload. A load is now marked current only after its active promise finishes; the live full dictionary loads normally while session-time deferral remains intact |

## Contracts preserved

- `SCHEMA_VERSION` remains 5. There is no migration, preference, stored mastery score, stored
  target, new event type or new personal content type.
- The append-only event log remains authoritative. Historical typed strings still do not exist,
  so older accent passes are not reclassified.
- Primary accuracy remains typed initial attempts only. Retry and missed-round results remain
  recovery evidence; Reveal remains separately reported.
- Core and both pattern packs remain read-only dictionary practice. They never create or edit a
  personal item.
- Adaptive still runs only when the owner selects it. No result changes a Leitner box, review date,
  due queue or background schedule.
- Gym settings and Focus targets remain transient per-session state.

## Red/green and focused verification

The implementation followed the approved sequence with one concern per maintenance commit and
focused tests after every slice.

- The accent proof first showed that `hablo` for `habló` still passed through the old normalized
  early return. It now fails as `accent_collision`; the ordinary retry succeeds with `habló`, while
  a non-colliding omission still passes as an accent slip.
- Focus tests cover exact-cell, verb-only, tense-only and person-only ordering, balanced fill, the
  10-card problem-form handoff and a non-blocking short deck.
- Three Adaptive tests were deliberately red against the old lifetime derivation: a resolved cell
  remained first, a four-month-old miss remained first, and a lifetime-weak cell with ten recent
  passes remained weak. All pass with the bounded history.
- Pattern-pack tests first failed in four seams—the constants, reference loader, setup UI and
  stats curriculum inference—then passed after the shared curated union was wired through them.
- The browser-discovered Strict Mode test reproduced the permanent “Loading conjugation tables…”
  state against the old effect, then passed after the load-completion marker moved.
- The seven focused Gym files passed 78/78 after the pattern slice; the final component file passed
  11/11 after the Strict Mode correction.

A direct check against `pipeline/raw/_entries-final.json` and `_conjugations.json` verified all 17
Stem changers, all 16 Irregular preterites and all 56 unique curated lemmas. Each resolves to
exactly one conjugable verb entry and a present table. The packaging step now enforces the same
condition on future dictionary builds.

## Complete automated verification

- Complete serial suite: **1,021/1,021 tests across 86 files**.
- Production build: passed (`vite build`, 2,068 modules transformed).
- `git diff --check`: passed.

One pre-fix full run reported an unrelated timing miss in `AiCard.test.jsx` after passing
1,019/1,020 tests. That file passed 8/8 immediately in isolation, the next complete run passed
1,020/1,020, and the final post-browser-fix run passed 1,021/1,021. No AI code was changed.

Vite retains its existing advisory that the main app chunk is over 500 kB after minification. It
does not fail the build and Phase 15 did not broaden into a code-splitting change.

## Browser closeout

A fresh disposable local origin on port 5195 was exercised at 375×812. The shipped dictionary was
installed through the visible UI—10,278 entries and 1,771 verb tables—then the Gym was driven
through visible controls. No owner browser data was available or inspected.

| Check | Result |
|---|---|
| Full-dictionary load | The first pass exposed the Strict Mode cancellation bug despite direct reads returning all 56 verbs in about 283 ms. After the correction and reload, setup appeared immediately with 20/20 Core verbs |
| Pattern setup | Saved, Core 20, Core 50, Stem changers and Irregular preterites all fit in one segmented row. Stem changers showed 17/17 available; every button measured about 64.2×48 px and no label overflowed its control |
| Typed loop and navigation | A Stem-changer Quick session started at 1/10. An initial miss followed by exact retry; the first Open dictionary entry tap changed to an explicit red warning that opening would end the session with 10 prompts remaining |
| Focus handoff | Three misses produced the `repetir · Indicative imperfect · ustedes/ellos` Problem form. Practice next reopened Focus on the Stem-changer pool with that visible, clearable target, Everyday and all people; Start produced a 10-card deck whose first prompt was the exact cell |
| Accent collision | A Focus deck opened on `hablar · Indicative preterite · él/ella/usted`. `hablo` failed with the tense-collision explanation, `habló` passed on retry, and stats showed “Accent changes the tense” |
| Adaptive | Setup named unresolved misses from the last 90 days, recent-10 weak spots and under-practised exploration while repeating the no-Leitner boundary. The deck opened on the unresolved recent `repetir` cell |
| Performance | Everyday was selected by default. Top-level actions were present for both observed tenses, both observed people and the weak verb; Coverage de-duplicated the combined library to 56 verbs |
| Layout | Short setup/session surfaces measured `scrollWidth === clientWidth === 375`. The vertically scrolling stats view measured 360 === 360 inside the 375 px viewport. No element crossed either horizontal edge |
| Console | No warnings or errors |

The browser pane's known frame-compositing limitation means no screenshot was captured; the pass
used DOM state, computed geometry and console output. The disposable personal events, dictionary
databases and local storage were cleared through the app's own data modules, the origin was
reloaded to an empty/not-installed state, the viewport override was reset, the tab was closed and
the server was stopped.

## Deliberately deferred

The in-context sentence/meaning cue lane, cross-tab session persistence, Saved-pool tag or page
subsets, per-pack coverage views and a full half-life-regression adaptive model remain deferred as
written in the direction. Phase 15 adds no daily goal, reminder, automatic curriculum promotion or
stored learner model.
