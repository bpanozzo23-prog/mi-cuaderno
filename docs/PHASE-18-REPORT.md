# Phase 18 — Gym depth and targeting (report)

Implemented and verified locally 2026-08-10 on `main`; **not pushed or deployed**. The owner asked
for the approved plan to be implemented in its written delivery sequence. The complete contract
and boundaries remain in [PHASE-18-DIRECTION.md](PHASE-18-DIRECTION.md), and durable choices are
recorded in `DECISIONS.md` under Phase 18.

## What changed

| Piece | Result |
|---|---|
| Usage recall | Tense usage now switches between Identify tense and Recall uses. One stable card aggregates every curated use for a canonical tense; the reveal includes nuance, contrasts and derived Grammar links. All selected is unique by default, while 10/20 repeat in balanced cycles and the missed round repeats each missed tense once |
| Typed Endings | Endings now switches between Choose tense and Type endings. Five required vertical fields use exact-first accent grading; passing fields lock after an initial miss, failed fields alone clear, one unrevealed retry remains, and initially missed rows stay eligible for one de-duplicated missed round |
| Perfect production | Perfect rows ask for five tense-specific forms of *haber* and reveal the shared participle rule. Future and Conditional keep the whole-infinitive cue. Dictionary tables enrich the existing real-verb reveal but are never required |
| Pool registry | One curriculum registry drives setup, loading, counts, event metadata and Performance handoffs. The phone-safe native picker groups Saved under Personal and six curricula under Built-in |
| New packs | Regulars adds six verified verbs per infinitive class. Spelling changes adds three verified verbs in each of six orthographic families. Their union expands the de-duplicated curated lookup from 56 to 80 lemmas |
| Saved targeting | Saved can be narrowed for the current setup to one exact tag or one active Vocabulary page. Counts include only resolved conjugable entries; page membership comes from authoritative `linkedKeys` through `deriveCollection`; invalid selections reset safely |
| Performance | Phase 17 choice recognition remains choice-only and shape-compatible. New sections derive Usage recall first attempts/missed recovery and Typed Endings first attempts, exact/accent-assisted rows, immediate recovery and missed recovery |

## Contracts preserved

- `SCHEMA_VERSION` remains 5. Existing event types, owner-started sessions and the no-Leitner
  boundary remain unchanged.
- Usage recall stores no chosen answer or personal identity. Typed Endings stores per-slot verdicts
  but no typed strings, verb/item identity, singular slot, source or curriculum.
- Saved refinement is session-only. Exact tag spelling/case remains distinct, visual page groups
  cannot manufacture membership, and neither preferences nor drill events retain the subset.
- Forms Performance, Adaptive Forms ordering and scheduled review replay ignore recall and typed
  events. Tense packs filter every skill; Saved/Built-in filters still affect Forms only.

## Delivery and deliberate failure proofs

The implementation followed the direction in seven feature commits:

1. `e5649e6` — start Phase 18 with mode-isolated Gym statistics.
2. `c88588c` — add tense-usage recall sessions.
3. `0893aa3` — add typed endings production sessions.
4. `bf4a075` — centralize Gym pools and add Regulars.
5. `c08f521` — add the verified spelling-change verb pack.
6. `53f2dd4` — add Saved Gym subsets.
7. `10ca9e8` — add mode-separated Gym depth Performance.

Three deliberate red/green proofs were observed before restoration:

- Before the choice-mode guard, an adversarial recall/typed event changed Phase 17 recognition
  figures. Filtering `recognitionPerformance` to `mode: "choice"` restored byte-for-byte equality.
- Corrupting Regular `trabajar`'s expected gerund to `trabajandox` failed against shipped
  `trabajando` at the exact derivation assertion.
- Corrupting spelling-change `buscar` to expect `buscé` failed against the shipped characteristic
  cell `busqué`.

## Complete automated verification

- Complete serial suite: **1,111/1,111 tests across 98 files** (`npm.cmd test`, 262.91 s).
- Production build: passed (`vite build`, 2,082 modules transformed; PWA generated).
- `git diff --check`: passed.
- Shipped-data gates prove all 80 curated lemmas resolve uniquely, every Regular reproduces its
  hablar/comer/vivir class anchor across supported forms, and every spelling family contains its
  declared characteristic cells.
- Adversarial isolation tests keep Phase 17 choice figures, Forms Performance, Adaptive Forms
  decks and Leitner replay byte-for-byte unchanged when recall/typed events are added.

Vite retains its advisory that the main app chunk is over 500 kB after minification. It does not
fail the build, and Phase 18 did not broaden into a code-splitting change.

## Browser closeout

A fresh local origin at port 4178 was fixed at 375×812. The dictionary and two disposable notebook
items were created only on that isolated origin through the visible UI: saved verb **hablar** with
exact tag **Gym**, and active Vocabulary page **Gym page** with authoritative linked membership.
No owner browser data was available or inspected.

| Check | Numerical/result evidence |
|---|---|
| Grouped pools | The native Verb pool select exposed Saved under Personal and Core 20/Core 50/Regulars/Stem changers/Spelling changes/Irregular preterites under Built-in |
| Saved subsets | All saved resolved one verb; One exact tag offered `Gym · 1`; One Vocabulary page offered `Gym page · 1`; each retained 30 available forms for the same resolved verb |
| Usage recall | Everyday default reported six tenses and ran 1/6 through 6/6 to a 6/6 summary. Selecting 10 started a repeated 1/10 session from the same six-tense scope |
| Typed Endings | An Indicative-present `-ar` row locked four exact fields, cleared only the failed fifth field, accepted its retry and revealed the complete hablar pattern |
| Perfect production | A one-card Indicative-present-perfect scope prompted for five forms of *haber*, accepted `he/has/ha/hemos/han`, and revealed the shared `-ado`/`-ido` participle rule |
| Performance | Usage recall reported 100% (6/6) independently. Typed Endings reported its 0/1 initial row and 1/1 immediate recovery separately; Choice recognition remained empty |
| Layout and console | At `innerWidth === 375`, document `scrollWidth === clientWidth === 360`; zero elements crossed the document edge and browser logs contained no warnings or errors |

The viewport override was reset, the disposable tab closed and the isolated server stopped.

## Deliberately deferred

Mixed recognition/form decks, generated reflexive tables, page-group subsets, persistent Gym
settings and per-pack analytics remain outside Phase 18. Nothing was pushed or deployed.
