# Phase 17 direction — Gym recognition lanes: tense usage and endings

**Status:** Proposed — drafted 2026-08-09 from the owner's request for two new drill methods.
Approving this doc approves the mechanics, boundaries and delivery sequence. The two content
tables (§2's endings, §3's usage cards) are **drafts for the owner's line-by-line correction**:
individual rows may be reworded, added or cut during review without re-approving the doc.
**Origin:** Owner request 2026-08-09: (1) given an English usage description, identify the tense
it describes; (2) given a list of conjugation endings, identify the tense and verb class. The §3
card list was revised 2026-08-09 against an external language review the owner supplied: sharper
Future/Conditional/Present Perfect wording, a como-si card, both perfect-subjunctive tenses, and
four added confusable pairs. Its imperative-key rename was declined — keys are persisted identity;
the labels already read "Affirmative/Negative command".

## Outcome

The Gym gains a **recognition lane** beside its production drill: multiple-choice cards that ask
"which tense is this?" from two kinds of evidence — what the tense is *for* (usage cards) and what
it *looks like* (endings cards). The goal is faster recall of rules like "preterite is for
completed past actions" and instant recognition of paradigm shapes, with per-tense recognition
accuracy reported beside the existing production accuracy so the owner can see "I can produce
preterite forms but can't yet say when to use them" — or the reverse.

Both drills share one new mechanic and differ only in content, so they ship as one phase.

## Fixed boundaries

- **`SCHEMA_VERSION` remains 5. No new event types.** Recognition answers log the existing
  `drill_pass`/`drill_fail` with additive metadata (§4). They carry no `verbKey` or `slot`, which
  existing consumers already require — a red/green proof must show form statistics and Adaptive
  ignore recognition events entirely.
- **Owner-started, no Leitner effect, no queue, no schedule** — the Gym's standing rules.
- **Content is curated, original, in-code reference constants**, the `CORE_20` pattern: the
  endings table and usage cards live in a pure module, in English/Spanish text written for this
  project. Nothing is scraped, generated per-session, or taken from proprietary sources.
- **Recognition cards have no verb pool.** Setup shows a drill selector — **Forms / Tense usage /
  Endings** — and hides the pool, person and Type/Reveal controls for the recognition lanes.
- **No immediate retry on recognition cards.** A wrong tap's feedback names the right answer, so
  an immediate retry would test nothing; the optional missed round re-asks with reshuffled
  options instead. (This deliberately differs from the typed form drill, where retrying still
  requires production.)
- Tense identity remains the full persisted `Mood/Tense` key; displays use `qualifiedTenseLabel`.
- Rare tenses stay out of v1 content; the `-se` imperfect subjunctive stays labelled alternative
  and is deferred content, not a different rule.

## 1 — The multiple-choice mechanic (shared)

- A card shows its prompt (a usage description, or an endings list) and **four tense options** as
  tappable chips: the canonical answer plus three distractors. Distractors are drawn first from
  the card's curated **confusable set** (§2/§3), then filled from the session's tense scope, and
  **never** from the card's also-acceptable list (§3) — so exactly one offered option is ever
  correct.
- Marking is objective: chosen === answer. A wrong choice shows a diagnosis line that teaches the
  contrast ("That's the imperfect — ongoing past. The preterite is for actions that finished."),
  drawn from the card's curated feedback text where present, else a generic correct-answer line.
- Session flow reuses the Gym's shell: balanced deck (no consecutive same-answer cards, spread
  across tenses via the existing balanced-selection helper keyed on tense), 10 or 20 prompts,
  completion tally, one optional missed round with re-shuffled options, and the session-ending
  confirmation on any navigation away.
- Setup for a recognition session: drill selector, prompt count, and a tense scope (Everyday pack
  default; customize offers only tenses that have cards in that lane). Options for a card are
  labelled with `qualifiedTenseLabel`; option order is shuffled per ask.

## 2 — Endings drill (deterministic content, proof-tested)

A curated `TENSE_ENDINGS` table, one row per tense × verb class over the collapsed slots
(yo, tú, él/ella/usted, nosotros, ustedes/ellos). **Draft for correction:**

| Tense | Class | Endings |
|---|---|---|
| Indicative/Present | -ar | o, as, a, amos, an |
| Indicative/Present | -er | o, es, e, emos, en |
| Indicative/Present | -ir | o, es, e, imos, en |
| Indicative/Imperfect | -ar | aba, abas, aba, ábamos, aban |
| Indicative/Imperfect | -er/-ir | ía, ías, ía, íamos, ían |
| Indicative/Preterite | -ar | é, aste, ó, amos, aron |
| Indicative/Preterite | -er/-ir | í, iste, ió, imos, ieron |
| Indicative/Future | all, on the infinitive | é, ás, á, emos, án |
| Indicative/Conditional | all, on the infinitive | ía, ías, ía, íamos, ían |
| Subjunctive/Present | -ar | e, es, e, emos, en |
| Subjunctive/Present | -er/-ir | a, as, a, amos, an |
| Subjunctive/Imperfect | -ar | ara, aras, ara, áramos, aran |
| Subjunctive/Imperfect | -er/-ir | iera, ieras, iera, iéramos, ieran |

Perfect-tense cards use the existing `PERFECT_TENSES` map's insight — each perfect is a tense of
*haber* plus the participle — and show the haber paradigm as the pattern:

| Tense | Pattern |
|---|---|
| Indicative/Present Perfect | he, has, ha, hemos, han + -ado/-ido |
| Indicative/Past Perfect | había, habías, había, habíamos, habían + participle |
| Indicative/Future Perfect | habré, habrás, habrá, habremos, habrán + participle |
| Indicative/Conditional Perfect | habría, habrías, habría, habríamos, habrían + participle |
| Subjunctive/Present Perfect | haya, hayas, haya, hayamos, hayan + participle |
| Subjunctive/Past Perfect | hubiera, hubieras, hubiera, hubiéramos, hubieran + participle |

Rules that make the cards honest:

- **The infinitive-attachment cue is part of the prompt** for Future and Conditional ("added to
  the whole infinitive: …"), because the Conditional's list is otherwise identical to the -er/-ir
  Imperfect. With the cue shown, every card is self-disambiguating.
- **Curated confusable sets** drive distractors: Present -er ↔ -ir (one cell differs), Preterite
  -ar ↔ -er/-ir, Imperfect -er/-ir ↔ Conditional, Present indicative ↔ Present subjunctive
  (crossed endings), and each perfect ↔ its haber tense's simple form.
- **A derivation proof pins the table to shipped data:** a test stem-strips hablar, comer and
  vivir's tables (and their infinitives for Future/Conditional, and haber's paradigm for the
  perfects) and asserts equality with every curated row. The table cannot silently drift from the
  dictionary the same way curated lemmas cannot silently stop resolving.
- The reveal side shows a real verb wearing the endings — one of hablar/comer/vivir resolved from
  the installed dictionary, or plain text when it is not installed.
- Excluded from v1 content: `-se` imperfect subjunctive, future subjunctives, the archaic
  preterite, and both imperatives (no full five-slot paradigm).

## 3 — Usage drill (authored content, owner-reviewed)

A curated usage-card module: each card is `{ id, prompt, answer, alsoAcceptable?, contrast? }`
where `answer` is a tense key, `alsoAcceptable` lists tenses that must never appear as
distractors, and `contrast` is the teaching line shown on a miss. **Draft card list for
correction** (prompt → answer; ~acceptable in brackets):

**Indicative/Present** — "A habitual action or routine — what someone does in general." ·
"A state or fact that is true in the present (Vivo en Chicago)." · "A scheduled or
already-decided future event stated in the present (Salgo mañana; El tren sale a las ocho).
[also: Future]"

**Indicative/Preterite** — "A completed past action with a clear beginning or end." · "A sequence
of events in the past, each happening once." · "The action that interrupted something already in
progress."

**Indicative/Imperfect** — "An ongoing or habitual past action — what used to happen." ·
"Background description in a story: weather, scenery, feelings." · "Telling time, age or dates in
the past." · "What was already happening when something else occurred."

**Indicative/Future** — "A prediction, promise, or statement about what will happen (Lloverá
mañana; Te llamaré esta noche)." · "A guess or probability about what is true now (¿Quién será?
— who could it be?)."

**Indicative/Conditional** — "What would happen under a hypothetical condition (si tuviera
dinero, viajaría más)." · "A polite request or softened statement (¿Podrías…?)." · "Speculation
about the past (Serían las dos)."

**Subjunctive/Present** — "After wanting or requesting that someone else do something (quiero
que…)." · "After doubt or denial (no creo que…)." · "After emotion or a value judgment (me alegra
que…, es importante que…)." · "After ojalá." · "In purpose clauses (para que…)." · "Describing
someone or something that may not exist (busco a alguien que…)."

**Subjunctive/Imperfect** — "A subjunctive trigger whose main clause is in the past (quería
que…)." · "A contrary-to-fact si clause (si tuviera…)." · "A very polite wish (quisiera…)." ·
"After como si, describing something unreal (habla como si supiera todo)."

**Indicative/Present Perfect** — "A completed past action connected to the present, especially
within a time period still ongoing (hoy, esta semana, este año). [also: Preterite]" · "Life
experience up to now (¿Has estado alguna vez…?). [also: Preterite]"

**Indicative/Past Perfect** — "A past action completed before another past action."

**Indicative/Future Perfect** — "Something that will already be completed by a future point
(Para mañana, habré terminado)."

**Indicative/Conditional Perfect** — "What would have happened under a different past condition
(Habría ido, pero estaba enfermo)."

**Subjunctive/Present Perfect** — "A completed action connected to the present, after a
subjunctive trigger (me alegra que hayas venido)." · "A subjunctive action that may already have
happened (dudo que haya terminado)."

**Subjunctive/Past Perfect** — "An unreal past condition — something that did not happen (si
hubiera sabido…)."

**Imperative Affirmative/Present** — "Telling someone directly to do something."

**Imperative Negative/Present** — "Telling someone not to do something."

Design rules: one canonical answer per card, enforced-distinct options via `alsoAcceptable`;
descriptions are textbook-canonical and deliberately short; a card whose wording cannot be made
unambiguous is cut rather than shipped fuzzy. **Cards teach a small set of mental models, not an
enumeration of textbook sub-uses** — age, weather and time in the past are the imperfect's one
model seen from different angles, not separate cards; the list must resist growing into forty
tiny rules. The two Present Perfect cards carry `[also: Preterite]` deliberately: this notebook
targets Mexican Spanish (§3 of the brief), where the preterite is fully natural in many contexts
Spain reserves for the present perfect, so the preterite must never appear as a distractor there.
Contrast lines may teach pairings across cards — si `tuviera` (Imperfect Subjunctive) with
`viajaría` (Conditional), and si `hubiera sabido` (Past Perfect Subjunctive) with `habría venido`
(Conditional Perfect) — the two clause-halves of the same sentences.

Confusable sets: Preterite ↔ Imperfect (both ways), Present ↔ Present Subjunctive, Future ↔
Conditional, Preterite ↔ Present Perfect, Present Subjunctive ↔ Imperfect Subjunctive (quiero que
venga / quería que viniera — the main-clause tense drives the subjunctive tense), Conditional ↔
Conditional Perfect, Past Perfect ↔ Subjunctive Past Perfect, and Future ↔ Present on the
future-reference cards.

A terminology note that stays a display concern: the persisted imperative keys
(`Imperative Affirmative/Present`, `Imperative Negative/Present`) are identity in the shipped
dictionary and in every logged event and must not be renamed; `qualifiedTenseLabel` already
renders them as "Affirmative command" and "Negative command", so no card ever shows a learner the
misleading "/Present".

## 4 — Events and recognition statistics

- Every answer logs `drill_pass`/`drill_fail` with additive metadata: `skill: "usage" |
  "endings"`, `cardId`, `tense` (the canonical answer's key), `mode: "choice"`, and — on a miss —
  `chosen` (the tense key tapped). Session/prompt/stage fields mirror the form drill. No
  `verbKey`, no `slot`, no typed string (none exists).
- **Existing consumers must ignore these events**, and a deliberate proof shows it: Adaptive's
  derivation already skips events without `verbKey`/`tense`/`slot`; the form-drill statistics
  must be checked and guarded the same way before the first recognition event is ever written.
- The Performance screen gains a **Recognition** section: per-lane accuracy, per-tense rows
  (filterable by the existing tense packs), and a **confusion list** derived from `chosen` vs
  `tense` — "Preterite answered as Imperfect ×6" is precisely the insight this lane exists for.
  Missed-round answers are reported separately from first attempts, as everywhere else.

## 5 — Grammar-guide links on usage cards

The reveal side of a usage card may offer **"Open your guide"** links to the owner's own Grammar
pages, derived at render with no stored mapping: a Grammar-focused page qualifies when its title
contains the card tense's label (matched through the shared `normalize`, so accents fold and ñ
stays a letter). At most two links show; none shows when nothing matches; nothing is ever
auto-created. Opening one routes through the existing `onOpen` path, which already requires the
Phase 15 session-ending confirmation. This keeps reference content (the card) and personal
content (the guide) linked by derivation only — reference constants can never hold a personal id.

## Delivery sequence

1. Pure content modules and the multiple-choice deck builder (balanced by tense, injectable rng),
   plus the §2 derivation proof test — red first against a deliberately wrong endings row.
2. The multiple-choice card and session flow in the Gym, wired to the drill selector, with events
   per §4 and the consumer-isolation proof.
3. Endings lane complete (simple + perfect cards, real-verb reveal).
4. Usage lane complete with the owner-corrected card list.
5. Recognition statistics and the confusion list.
6. Grammar-guide links on usage reveals.
7. Complete serial suite, production build, `git diff --check`, deliberate failure proofs,
   numerical 375×812 browser closeout, DECISIONS.md entries, Phase 17 report. Nothing is deployed
   unless separately requested.

## Success

A ten-card endings session never shows two identical option sets in a row, marks objectively, and
its Conditional card names the infinitive cue. Tapping Imperfect for a "completed past action"
card fails with a contrast line and the card returns in the missed round with reshuffled options.
The derivation test reddens when an endings row is deliberately corrupted. Recognition events
change no form-drill statistic, no Adaptive deck, and no Leitner state — proven, not assumed. The
Performance screen can show production accuracy and recognition accuracy for the same tense side
by side, plus which tense the owner confuses it with. A usage card for the preterite offers the
owner's own "Pretérito" Grammar guide when one exists and stays silent when none does. Every
surface fits 375px and every figure is reproducible from the raw event log.

## Deferred with intent (not silently dropped)

- **Flip-side usage flashcards** (given the tense, recall its uses; self-graded) — same content,
  later slice.
- **Typed endings production** (given tense + class, type the endings) — the harder direction of
  §2; wait for evidence recognition is not enough.
- **Adaptive cross-pollination** (usage/endings misses weighting the form drill's weak-tense
  dimension) — a v2 decision once real recognition data exists.
- **Mixing recognition cards into form decks** (interleaved practice) — pedagogically attractive,
  but lanes stay separate until both are proven alone.
- **`-se` imperfect subjunctive and future subjunctive content** — add rows/cards later if wanted;
  the mechanic needs no change.
- **The in-context production lane** (produce the form from a sentence cue) — still its own
  future phase; recognition lanes neither replace nor depend on it.
