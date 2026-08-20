# Taller — Diario writing practice

**Status:** Direction approved by the owner 2026-08-20 after a multi-round workshop; not yet
planned or implemented. The implementing session (any tool) must follow `docs/AGENT-GUIDE.md` in
full: read the current project state first, propose its implementation plan in plain language, and
wait for approval before writing code. This document is the behavioral contract that plan
implements; where it defers a choice, it says so explicitly.
**Origin:** After the 2026-08-19 skill-focused prompt categories deployed (`7ed9aca`), the owner
declared a classroom direction for the Diario (2026-08-20 `DECISIONS.md` entry): serious
journaling happens outside the app in English, so the Diario is more likely to be used — and used
more — as a space for deliberately working on Spanish skills, alongside continued reflective
entries. Every decision below was made by the owner across four structured question rounds plus a
follow-on interests discussion.

## Outcome

The Diario keeps "Write today" untouched and gains a second door, **Taller** — a short
skill-directed writing drill: a grammar-targeted prompt, an optional owner-interest *tema*, a
transient scaffold with live dictionary conjugation help, sometimes 2–3 of the owner's own words
to work in, a short write in the ordinary editor, then an explicit **keep or discard**. Kept text
becomes an ordinary dated Diario entry; discarded text vanishes. Either way, one new
**practice event** records what was practiced — the first deliberate storage of prompt usage,
under a narrow amendment of the 2026-08-03 rule.

V1 records but barely displays: streaks, per-skill history, and a coverage map are explicitly
deferred until real practice data exists. No AI participates in v1.

## Governing rule amendments

Two standing rules are amended, narrowly, and each amendment gets its own `DECISIONS.md` line at
implementation:

1. **The 2026-08-03 visit-local prompt rule.** Prompt selection in the ordinary "Need a prompt?"
   flow remains visit-local guidance, never stored. The amendment is specific to Taller drills:
   a drill logs one practice event carrying skill category, prompt id, kept/discarded, and any
   offered word ids. Ordinary reflective entries stay unclassified; no page gains a stored
   practice field.
2. **"Never automatic body text."** Keeping a drill offers one tap — **default off** — to include
   the prompt text at the top of the kept entry. Nothing is ever inserted without that tap, and
   the ordinary prompt flow is unchanged.

## The Taller door

- Lives on the Diario screen beside "Write today", in the same quiet visual register — the door
  itself never shows counts, suggestions, or pressure (the Cuidar landing-door precedent).
- Opening it proposes **one skill** with the full category list one tap away. Before practice
  data exists, the proposal rotates through the three skill categories (Narrate, Imagine,
  Connect); the reflective four remain reachable through the list. Once events accumulate, the
  proposal may prefer stale or weak skills — that upgrade is deferred with the display work.
- Taller is **writing practice only** in v1. The owner deliberately left its larger scope
  undecided: avoid layout and naming choices that would make a later gathering of other practice
  surfaces (Conjugation Gym, hub decks) under Taller awkward, but build none of that now.

## The drill flow

- The drill uses the **normal JournalEditor** — one writing surface to maintain — with the drill
  header above it: the prompt, its **easier / harder** tier toggle, the tema chip, the scaffold
  disclosure, and any offered words.
- **Tiers:** each skill prompt gains a gentler and a harder variant behind a small toggle. This is
  prompt data, not new machinery; where only one variant exists the toggle hides.
- **Tema:** each drill proposes one tema from the owner's list with a small shuffle to redraw.
  A tema is a nudge, never a constraint — it is presented beside the prompt, never spliced into
  the Spanish sentence (no templating; gender/preposition grammar stays intact). Writing off-tema
  is fine and nothing checks.
- **Offered words:** vocabulary-integrated prompts show 2–3 of the owner's own lexical items as
  chips — a mixed pool the app samples (due in Repaso, recently added, long-untouched) without
  explaining which is which. Offering creates **no link and no event against the word**; if the
  owner keeps the entry and links a word through the editor's existing affordances, that ordinary
  mechanism is the word's whole record of it. No Leitner effect anywhere.
- **Keep or discard** replaces the ordinary save flow for drills. Keep writes one ordinary dated
  Journal page (plus the optional prompt inclusion); discard writes no page and loses the text.
  Both outcomes log the practice event.

## The tema layer

- A small owner-edited list of interests ("escalada, cocina, mi perro…"), stored as a preference
  riding the existing generic preference/backup path (the `pinnedLexicalIds` precedent) — private
  personal data, never in the repo.
- The implementing plan chooses where the list is edited (a small manager inside Taller, or
  Ajustes); inside Taller is suggested so the feature is self-contained.
- Notebook-derived temas (sampled from tags, collection names, saved words) are a captured future
  variant, not v1.

## Scaffolds

- **Static word banks** per skill category: connectors, time markers, subjunctive triggers,
  sentence starters — data shipped with the prompt library.
- **Live conjugation help** from the shipped dictionary: the target tense's regular -ar/-er/-ir
  endings always visible for tense-targeted prompts, plus a small lookup that pulls any shipped
  verb's exact forms from the packaged tables. Read-only, resolved through the existing
  reference-layer seams; the §5 orphan behavior applies to anything that renders a `dict:` key.
- Scaffolds are transient drill furniture: nothing about them is stored on the page or the event
  beyond the prompt id.

## Notebook-aware prompt selection

- **Weakness-aware:** tense-targeted prompts may be preferred when the Conjugation Gym's existing
  derivations (`conjugationStats.js`) show that tense weak. Gym stats are conjugation-only; the
  mapping therefore needs optional prompt-side metadata (e.g. a `tense` or target tag on relevant
  prompts) — a data-only addition to `journalPrompts.js` records.
- **Prompt data growth** (tiers, tense tags, scaffold banks, per-prompt word-offer eligibility)
  stays in the shipped static library: auditable, offline, versioned. Personalized prompts are
  produced by ad hoc owner-directed AI workshop sessions and ship as ordinary data changes; a
  private personal prompt store is a captured follow-on if prompts ever get too personal for the
  public repo, not v1.

## The practice event

- One new event type (name chosen at planning; `practice_write` suggested) logged once per drill
  at keep/discard time, carrying: skill category, prompt id, kept or discarded, offered word ids
  (possibly empty), and the tier used. Recording the tema was not owner-decided; the plan may
  include the tema string or omit it, and must say which and why.
- Discarded drills log the event too — **writing happened**; the Phase 13 precedent (a drill-only
  day holds the streak) extends to future streak semantics.
- No drill text is ever stored on discard. No counters, no flags: every future view (skill
  history, streaks, coverage map) derives at render from these events, per the event-log tripwire.
- A discarded drill's event references no page. The plan must confirm the event store accepts a
  subject-less event cleanly (Phase 13's `drill_pass`/`drill_fail` against personal item ids is
  the nearest precedent) and that backup validation accepts the new type — Phase 13 added event
  types with no schema bump, but whether deep validation enumerates event types must be verified
  against `src/db/` before assuming `SCHEMA_VERSION` stays 9. **If a schema bump proves
  necessary, stop and raise it (§5 in full).**

## Timeline presentation

Kept practice entries get a **quiet derived badge** in the Diario timeline — the skill name in
muted text, derived at render from the practice event, nothing stored on the page. Entries whose
events are gone (or that predate Taller) simply show no badge. No filter, no separate timeline;
the contingent separate classroom space stays a captured idea gated on real mixed use chafing.

## Explicit non-goals for v1

- No AI anywhere in the drill flow — the owner's external feedback round-trip (Gemini → Apuntes)
  remains the loop until the habit is proven. In-app AI prompt drafting and the Phase 6
  focused-review extension are captured ideas, not scope.
- No streak/coverage/history display; record only.
- No automatic linking of offered words, no Leitner movement, no per-word practice logging.
- No separate practice hub, route, or navigation change beyond the one door.
- No notebook-derived temas, no personal prompt store, no own-voice recycling prompts (captured;
  the owner ranked them below the three chosen features).

## Delivery and acceptance

Delivery may split into reviewable commits (suggested: prompt-data growth; door + drill flow +
events; tema layer + scaffolds), each meeting the working agreement — plan first, one commit per
completed feature, a `DECISIONS.md` line per meaningful decision including both rule amendments.

Acceptance follows the project standard: unit and component coverage including deliberate
red/green proofs (at minimum: discard writes no page but logs the event; keep-without-tap includes
no prompt text; offered words create no links), the complete serial suite, production build,
`git diff --check`, and a disposable seeded 375×812 browser closeout measuring touch targets,
zero horizontal overflow, and a clean console. Push and deployment wait for owner approval, with
README Status and `DECISIONS.md` synchronized in the release session.
