# Phase 23 — Contexts and wandering

**Status:** Deployed from `main` at `bb292fe` on 2026-08-13. The complete serial suite,
production build, deliberate failure proofs, diff check, disposable 375×812 browser closeout,
GitHub Pages run 31668643593, and live-bundle check pass; see `PHASE-23-REPORT.md`.
**Origin:** The owner selected two consolidation ideas — the word's biography and neighborhood
browsing — from the post-Phase-22 brainstorm, then answered nine scope-shaping questions in a
structured workshop. This document records those decisions; implementation followed the ordinary
plan-first agreement and its closeout is recorded separately.

## Outcome

Phase 23 gives the notebook two new ways to see what it already knows:

1. **23a — the word's biography.** One derived, chronological view of a lexical item's history
   and habitat: when it was saved, how its learning progressed, and everywhere it lives — pages,
   captures, guides, collections, phrases, and the owner's own Diario prose.
2. **23b — neighborhood browsing.** A "show me something" entry point that lands on a random
   lexical item and shows its immediate, curated surroundings, each neighbor one tap away, so the
   notebook supports wandering and accidental re-encounter, not only directed retrieval.

Everything derives at render from existing personal data, events, links, and the replaceable
dictionary. Personal `SCHEMA_VERSION` stays 8. The phase adds no personal field, preference,
backup shape, event type, stored counter, score, schedule, automatic queue, dictionary package,
or background work. Nothing in either feature writes an event from its own surfaces.

## Shared foundation — prose containment

23a extends Phase 22's containment engine from lexical-to-lexical matching into **prose
scanning**: finding a saved word or phrase inside text the owner wrote. The extension inherits
the Phase 22 matcher whole: Unicode letter-token runs through `normalize.js`, ñ preserved, no
matching inside a longer token, the same fixed high-noise stop-list, exact-term runs before
inflected forms, attached-verb conjugation matching limited to the same tenses cloze uses, and
the same two intentional silences — an ambiguous inflected form (*fui*) matches nothing rather
than guessing, and a clitic-attached token (*dármelo*) does not match its verb. Weakening token
safety to catch these remains out of scope, exactly as recorded for Phase 22.

Scanned prose is the owner's visible text as `plainTextFromMarkdown` already defines it: Diario
entry bodies, page Notes (Overview and sections), Source capture text, and Grammar section
Overviews. Markers, images, and formatting never participate. Scanning is derived at render and
recomputes after the ordinary notebook reload; results may be memoized in memory but are never
cached in personal storage.

## 23a — The word's biography

### Placement

The biography is a sub-view entered from the lexical Detail screen's learning strip — the same
swap pattern Estadísticas uses inside Repaso. Detail itself keeps its Phase 5e scan-first layout
unchanged. Pages do not have biographies in this phase; the view exists for words and phrases.

### The story: milestones, not a log

The timeline narrates milestones derived by replaying the item's events: saved (created), first
review, each Leitner box first reached, tricky episodes (on → off as one episode), retirement,
and the current state (box or Retired, last review, next due — the strip's facts given a
narrative home). Individual grades and routine views are deliberately absent; the existing
per-item strip, activity surfaces, and Estadísticas already serve grade-level detail. The
milestone grammar is the design: a biography reads in seconds or it is a log.

### The habitat: every context, one view

Below the story, the biography aggregates where the word lives:

- **Structural contexts (already derived today, re-presented):** Collections and groups, pages
  whose vocabulary includes it, Grammar examples referencing it, Source captures referencing it,
  and its typed Connections.
- **Phrase containment (Phase 22a):** the phrases built on it, as shipped.
- **Prose contexts (new):** pages whose scanned prose contains it, and — in its own clearly
  labeled **En tu Diario** section — the journal entries containing it, each with a short
  matched-context snippet. The Diario section is deliberate and disclosed, honoring the spirit
  of the deliberate-search rule while serving the owner the data belongs to.

Every row navigates to its context through existing routes; the cross-tab Back context that
already returns a reader to where they came from is the only navigation machinery involved.

### Display-only in v1

Derived prose rows are informative only. They offer no "link this" promotion, no relationship
type, no note, and no remove action — derived facts stay derived, and the biography touches no
write path. Link promotion from discovered contexts is a possible later increment and requires
its own decision.

## 23b — Neighborhood browsing

### Entry and start

A quiet card on the Cuaderno root — present at the idle moment when wandering actually happens —
starts a session on one **uniformly random** personal lexical item (words and phrases; pages are
never the starting point). No weighting, no lens chooser: pure random is the honest v1, and any
bias toward tricky/stale/context-poor items is a separate later decision. The card's Spanish
label and look go through the ordinary visual variant loop at build time.

### The neighborhood card

The card shows the item compactly (term, first gloss) and its neighbors grouped by edge kind:

- **Connections** — the item's confirmed typed links in either physical direction, each row
  carrying its relationship type and the owner's relationship note as the edge label. Linked
  non-journal pages appear here like any connection.
- **Conjugation family** — for an attached verb in a Phase 21 family: the *saved* sibling verbs
  (personal items whose attached lemmas share the family), plus one row deep-linking to the
  dictionary entry's What-to-notice teaching view.
- **En tu Diario** — an unopened stub only: a count chip ("En tu Diario · 3") that never expands
  and never navigates within the wander view. Presence without exposure; the full list lives in
  the biography's disclosed section.

Derived adjacency beyond these — shared tags, page co-membership, prose containment, gloss
overlap — is deliberately out of the v1 edge set and may be added later as toggles with
evidence.

### Hops, trails, and honesty

Tapping a neighbor hops: the card re-renders centered on the neighbor. Back walks the trail
through the existing navigation context; no trail is stored. An explicit **open full entry**
action leaves the wander surface into the ordinary Detail screen.

**The wander surface writes no events.** Starting, hopping, and leaving are silent — wandering
is browsing, not looking up, and the review queue must never reshape because the owner was
curious (the same reasoning that keeps Diario prompt taps event-free). Leaving into the real
Detail screen is ordinary navigation, and Detail keeps its existing behavior unchanged; the
boundary is stated so the rule is honest rather than hidden.

Link creation, editing, and every other write stay on the ordinary screens; the wander card
offers navigation only in v1.

## Exclusions

No global graph visualization. No weighted or lens-based sampling. No stored trail, wander
history, or dismissal memory. No link promotion from derived rows. No page biographies. No new
events, and no change to which surfaces log views today. No AI involvement. No Repaso, Leitner,
or Gym coupling of any kind.

## Delivery and acceptance

Delivery order is 23a then 23b, each slice one reviewable commit leaving the app usable; the
prose-scanning extension lands inside 23a. The direction/brief/decision records travel with the
first slice; the report and status synchronization close the phase.

Acceptance requires:

- pure derivation tests for prose scanning (whole-token, ñ, stop-list, ambiguity and clitic
  silences carried over, Markdown-marker exclusion), milestone extraction (including tricky
  episodes and box-first-reached), family-sibling derivation, and uniform sampling over the
  eligible population;
- component tests proving the biography sub-view swap leaves Detail's scan-first layout intact,
  the Diario section is labeled and disclosed, derived rows navigate but offer no write action,
  the wander card renders all three edge groups, the Diario stub never expands, and Back walks
  the trail;
- deliberate red/green proofs that the wander surface writes no event (break the guard, watch it
  red), that ambiguous forms stay silent in prose scanning, and that the Diario stub cannot
  navigate;
- the complete serial suite, production build, and `git diff --check`; and
- a disposable seeded 375×812 browser flow covering a word with a rich biography (milestones,
  collection, capture, phrase, Diario snippet), a wander session of at least three hops
  including a family edge and a stub, Back through the trail, 44px actions, no horizontal
  overflow, and no console warnings/errors.

A push to `main` is not part of implementation approval. If deployment is later approved, README
Status, this direction/report, and the two Improvement Ideas statuses must describe deployed
reality in the same session.
