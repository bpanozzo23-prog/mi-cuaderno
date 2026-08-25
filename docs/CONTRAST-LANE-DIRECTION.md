# Contrasts lane — ser/estar and por/para four-choice cloze

**Status:** Implemented and verified locally 2026-08-24 (four commits on `main`); not pushed or
deployed until the owner asks. Direction approved by the owner 2026-08-24 after a planning session.
**Origin:** The owner reviewed a survey of cloze / multiple-choice / transformation drill ideas
against what the app already has and chose *differentiative choice cloze* — a Spanish sentence
with the function word blanked and four options — as the first to build. `docs/IMPROVEMENT-IDEAS.md`
had captured this as **Non-verb grammar drills** (2026-08-11) with the advice to let Diario AI
feedback pick the first pair; the owner chose **ser/estar and por/para** directly instead.

## Outcome

The Conjugation Gym gains a fourth lane, **Contrasts**, beside Forms, Tense usage and Endings. A
session shows a short everyday sentence with one blank and four tappable options; exactly one is
correct. A miss names the right answer and one canonical rule line; there is no immediate retry,
and one optional missed round repeats the misses with the same four options reordered. Every
answer logs an ordinary `drill_pass` / `drill_fail` event with additive metadata, the Phase 17
precedent. Estadísticas reports per-pair accuracy and directional confusions (`es → está`).

No schema change (`SCHEMA_VERSION` stays 10), no new event type, no preference, no schedule, no
Leitner effect, no dictionary dependency. The Gym keeps its name.

## Owner decisions (2026-08-24)

- **Home:** inside the Gym as a lane, not a sibling practice home. Renaming the Gym is a separate
  decision for later, if ever.
- **Ser/estar options are conjugated forms** — `es / está / son / están`, with a few clear past
  cards using `era / estaba / fue / estuvo`. A two-way choice cannot fill the engine's four
  distinct options; forms test the contrast *and* agreement, and the same-person form of the
  other verb is always the first distractor.
- **Level:** A2–B1. Short sentences, textbook-canonical rules, original text only.

## Content rules

Content is curated, original, in-code reference constants with stable ids that are safe to
write into the event log (the Usage/Endings pattern), in `src/lib/contrastContent.js`:

- `CONTRAST_PAIRS` is a small registry: `id`, display label, eyebrow, and the pair's **option
  vocabulary** (every string that may ever appear as an answer or distractor for that pair).
  Ser/estar: present forms of both verbs plus `era / estaba / fue / estuvo`. Por/para: `por`,
  `para` and a few prepositions that fit the syntax but change the meaning (`a`, `de`, `en`,
  `con`).
- A card carries `id` (`contrast:<pair>:<slug>`), `skill: "contrast"`, `pair`, `answer`, `prompt`
  (the Spanish sentence with `___`), `gloss` (English, shown only after answering so the question
  never leaks the rule), `contrast` (the one-line rule shown on a miss), `alsoAcceptable` and
  `confusables`.
- **Exactly one correct option.** A sentence with two defensible answers is cut, not shipped
  fuzzy. Where an alternative is legitimately acceptable it goes in `alsoAcceptable`, which the
  deck builder forbids as a distractor.
- Distractor order: ser/estar — same-person form of the other verb, then another form of the
  answer verb, then a past form; por/para — the other member first, then two other prepositions.
- Each card teaches one canonical rule; roughly a dozen rules per pair, two to three sentences
  each. The list must resist growing into an enumeration of sub-uses.
- A third pair later is a registry entry plus its cards. A generic data-loading layer beyond what
  two pairs need is out of scope.

## Setup and session

- `Contrasts` appears in the Gym's lane selector. Its setup card shows the lane eyebrow and
  explainer, a **Pair** select (Ser / estar, Por / para, Both) in place of the tense pack and
  customize controls, and the existing Prompts 10/20 select. No direction toggle: choice only.
- The deck comes from the shared recognition builder with the pair's option vocabulary as scope:
  balanced by answer, four distinct options, `alsoAcceptable` never offered, consecutive equal
  answers and option sets avoided. "Both" interleaves the two pairs through the same balance rule.
- The shared `RecognitionDrill` runs the session inside `StudySessionFrame`: objective marking,
  no immediate retry, one optional missed round, second-tap confirmation before a Grammar guide
  link ends the session. Contrast options are labelled verbatim (`es`, `por`), never through the
  tense label functions.
- A new `ContrastReveal` shows the gloss, the rule line and up to two derived Grammar guide links.
  Guide terms are **multi-word** (`ser y estar`, `ser vs estar`, `ser/estar`, `por y para`, …) so a
  short term like `para` can never match an unrelated guide title such as *Comparativos*.

## The event

One `drill_pass` / `drill_fail` per answer, `itemKey: null`, with `skill: "contrast"`, stable
`cardId`, `pair`, `answer`, `mode: "choice"`, session/prompt/stage fields and miss-only `chosen`.
**Contrast events carry no `tense`**, so nothing downstream can mistake `"es"` for a tense key,
and no `verbKey`, `slot` or response text. Usage and Endings metadata stay byte-for-byte unchanged.

Consumers: form Performance gains a structural guard (any recognition-kind event, or any
recognition skill, is excluded — the old two-name blacklist would have let a third skill leak
into Forms figures); Adaptive and Leitner already ignore by structure and gain the contrast case
in their adversarial tests; streak and calendar statistics count the answers as activity like
every other drill event.

## Statistics

`recognitionPerformance` admits `skill: "contrast"` choice events, keys rows by `tense ?? answer`,
applies the tense-pack filter only to rows that have a tense, aggregates contrast rows by `pair`
with first-attempt accuracy, and lists confusions as `answer → chosen`. The performance panel adds
a Contrasts block under Choice recognition with one row per pair and its confusions; contrast rows
never appear in the per-tense rows. Missed-round answers stay separate from first attempts.

## Non-goals

Typed production for contrasts, a gender/article lane, a generic pair data loader, renaming the
Gym, sentences derived from Diario writing or the notebook, AI generation of items, any schema or
event-type change. The Confusion-pair drills idea (owner-annotated vocabulary pairs) stays captured.

## Delivery sequence

1. Direction, `DECISIONS.md`, brief §7 amendment, idea status; red-first proof that a
   `skill: "contrast"` choice event would leak into Forms performance, then the structural guard.
2. Content and engine generalization with deck tests (stable unique ids, answers and confusables
   inside the pair vocabulary, one correct option offered, `alsoAcceptable` never offered, balanced
   decks under injected rng, missed rebuild keeps the option set).
3. Gym lane, Pair select, `ContrastReveal`, `RecognitionDrill` labelling and metadata, with
   component tests including the unchanged Usage/Endings metadata and the guide-term negative.
4. Statistics derivation and panel with tests.
5. Closeout: complete serial suite, production build, `git diff --check`, deliberate red/green
   proofs, and the owner's 375 px phone check against the Tailscale dev URL (this checkout has no
   browser pane).

## Acceptance

The project standard: focused and complete serial suites green, production build, diff check,
at least two deliberate failure proofs observed red then restored, and the phone check with no
horizontal overflow or console error. Push, README Status and deployment wait for the owner.

## Follow-on — Connectors (2026-08-24)

The owner asked whether the lane covered syntactic-function distractors for *conjunctions*; it
did not, and the owner asked for connectors as a follow-on. Decisions:

- **A third set inside the lane, not a new lane.** Same engine, same event shape
  (`pair: "connectors"`), same per-set statistics block. The setup select is relabelled **Set**
  (Ser / estar, Por / para, Connectors, All sets); the persisted metadata key stays `pair` and the
  registry stays `CONTRAST_PAIRS` — persisted keys are never renamed for display reasons.
- **Vocabulary:** `pero, aunque, sin embargo, porque, por eso, así que, además, en cambio,
  mientras, entonces`. Multi-word options render as ordinary chips.
- **Forcing devices.** Connectors are far more interchangeable than por/para, so each sentence is
  framed to admit one connector in its slot: a question–answer frame for `porque`; a semicolon for
  `por eso` / `así que` (each `alsoAcceptable` where the other is the answer, with `entonces`);
  sentence-initial position for `aunque`; a full stop plus comma for `sin embargo`; a second
  subject for `en cambio`; `y, ___,` for `además`. Where a second connector is still defensible it
  is `alsoAcceptable`, never a distractor.
- **Distractor #1** is the opposite direction of the same relation (`porque` ↔ `por eso`,
  `aunque` ↔ `pero`, `sin embargo` → `pero`, `mientras` ↔ `entonces`) unless that connector is
  itself acceptable on the card — the confusion an English speaker actually makes.
- **26 cards**, deliberately fewer than the 32 of the pairs: the one-correct-answer rule cuts
  harder here, and 26 clean cards beat 32 with two defensible answers.
- Guide terms for the set are `conectores`, `connectors`, `palabras de enlace`, `marcadores del
  discurso`, `pero y aunque`, `porque y por eso`; the multi-word rule now also admits a single
  word of eight or more letters, which keeps its purpose (no bare `para`) intact.

No component logic, statistics, event or schema change: the reveal, drill and performance panel
key off the registry.
