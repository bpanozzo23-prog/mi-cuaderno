# Phase 23 — Contexts and wandering (report)

Implemented and verified locally on `codex/phase-23-contexts-wandering` on 2026-08-12, then
owner-approved and deployed from `main` at `bb292fe` on 2026-08-13. The approved contract remains in
[PHASE-23-DIRECTION.md](PHASE-23-DIRECTION.md); durable choices are under Phase 23 in
`DECISIONS.md`.

## What is implemented

| Slice | Result |
|---|---|
| 23a — prose containment | One shared optional-reference enrichment sequence now serves Phrase containment and owner-prose scanning. Notes, named Note sections, enabled Source captures, enabled Grammar explanations, and Diario bodies project to marker-free visible text; whole-token matching preserves ñ and the existing ambiguity, clitic, and stop-word silences |
| 23a — learning story | The scheduler's one review replay can expose post-review ladder steps without changing `deriveReviewState`. Biography derives saved, first-review, first-reached-box, tricky-episode, and false→true retirement milestones from the current item and log |
| 23a — Historia | A lexical-only **Historia** action locally swaps Detail for a display-only Biography. It shows current learning state and habitat across Collections, Page contexts, Phrases, typed Connections, owner prose, and a disclosed **En tu Diario** section with snippets; closing restores the scan-first Detail layout |
| 23b — derivations | Starts sample uniformly from all personal Words and Phrases. Neighborhoods derive typed bidirectional connections with labels/notes, filter Diario targets, and join saved Phase 21 family siblings through the installed alias map without healing personal data |
| 23b — Wander | **Pasear por mi cuaderno · al azar** appears only on the idle Cuaderno root. Lexical and non-journal Page neighbors become centers on the real session trail; dictionary rows are marked exits, family failure stays quiet, and **En tu Diario · N** is an inert count chip |
| Navigation | Route de-duplication now includes `screen`, so **Open full entry** can leave wander for the same item's ordinary Detail. Back then restores every prior center and finally the Cuaderno root |

Both features are render-time derivations. No personal field, preference, backup shape, event
type, reference package, score, schedule, queue, stored trail, or background job was added.
Neither new surface imports a database writer. `SCHEMA_VERSION` remains 8.

## Deliberate quality boundaries

- Prose containment scans the text projection search already exposes. Markdown markers, images,
  Note callout syntax, and standalone line-break markers cannot become matching evidence.
- Exact personal terms remain available without a dictionary. An inferred form requires the same
  sole matching form-shard lemma as Phase 22; ambiguous *fui* and clitic-attached *dármelo* remain
  accepted silent misses.
- Biography is milestones, not a second grade log. It creates no stored relationship from a
  context row and gives every Diario occurrence its own disclosed section and snippet.
- Wander is curated adjacency, not resurfacing or recommendation. Starts are unweighted, Diario
  never opens from its chip, and there is no trail history, score, dismissal, or Repaso coupling.
- Aliased dictionary links resolve for display without calling the ordinary write-healing reader.
  Conflicting explicit aliases for one canonical target stay silent rather than choosing a note.
- Prose scanning is one document pass for one subject on each open/hop. At personal scale it was
  immediate in the fixture flow; perceived cost remains the main real-use signal to watch.

## Automated and failure-path verification

- Post-review corrected complete serial suite: **1,372/1,372 tests across 118 files**
  (`npm.cmd test`, 327.85 s).
- Production build: passed; Vite transformed **2,105 modules** and generated the PWA.
- `git diff --check`: passed.
- Focused 23a boundary: **112/112 across eight files**, including the untouched
  `phraseContainment.test.js` refactor proof.
- Focused 23b boundary: **43/43 across four files**.

An independent review then exposed that the App-level wander test's mocked random draw depended
on two link writes receiving distinct millisecond `updatedAt` values. The app's uniform sampling
was correct; only the fixture order could fall through to UUID tie-breaking. The fixture now
writes explicit spaced timestamps after its links, the formerly flaky case passes **10/10 in
fresh Vitest processes**, and the combined App/Biography focus passes **23/23**. The same review
also corrected Biography's phrase evidence label to compare the matched surface with the subject
word, so an exact `casa` row no longer says **Matched as casa**; a component assertion pins it.
A focused disposable 375×812 recheck then rendered the exact *mi casa es tu casa* Phrase row once
and the redundant label zero times; both actions measured 44px, document and body widths stayed
375px, and the console had zero warnings/errors. Cleanup returned that origin to zero rows and
reset the viewport, tab, and server.

All three required broken-on-purpose proofs failed at the intended assertion and returned green
after the source was restored:

1. Adding `logView` to Wander made its immutable event-log assertion receive one extra `view`
   event (1/2 component tests failed); the restored surface passed 2/2.
2. Skipping shared ambiguity marking leaked *fui* as an inflected prose row (1/9 prose tests
   failed); the restored oracle passed 9/9.
3. Turning the Diario chip into a navigating button failed its `closest("button") === null`
   assertion (1/2 component tests failed); the restored inert chip passed 2/2.

Coverage pins visible-text projection and source gating, whole-token/accent/ñ behavior, stop
words, ambiguity and clitic silences, exact-only fallback, snippets and journal order; every
milestone kind, box skips, open/multiple tricky episodes, re-retirement, and ordering; uniform
sampling, Page exclusion, alias-aware family siblings, typed notes and Diario filtering; local
Detail swap/restore, row navigation without write affordances, zero Wander item/event mutation,
idle-only launch, reduced Page centers, same-id full-entry opening, and the complete Back trail.

## 375×812 browser closeout

A fresh port-specific local origin was seeded with three personal lexical fixtures, one
non-journal Page, one Diario entry, controlled review/tricky history, and an eight-entry disposable
reference dictionary with one two-member Phase 21 family. The development-only seed/cleanup hook
was removed before the committed app was reloaded and exercised. This was a DOM and computed-
geometry check; no screenshot is claimed because the in-app pane does not composite frames. No
owner data was available or inspected.

| Check | Evidence |
|---|---|
| Rich Biography | *sacar* showed eight ordered milestones through box 5 and retirement, one closed tricky stretch, current **Retired** state, Collection and Source-capture contexts, *sacar adelante*, an owner-noted Connection, the Source snippet *Siempre saco tiempo para caminar.*, and a separately labeled Diario row containing *Ayer saqué la basura…* through inflected matching |
| Context navigation | The Diario snippet opened the ordinary Diario reader; Back restored the still-open Biography. Closing Historia restored Meanings and Phase 22 Phrase containment on the original scan-first Detail |
| Idle entry | The launcher measured 44px, disappeared while `sacar` was in the root search box, and returned after the explicit clear action |
| Three-hop trail | The sampled start was *sacar*. The walk followed family edge *sacar → buscar*, typed Page edge *buscar → Field notes: action verbs*, then Page edge back to *sacar*. The Page center showed only title, typed Connections, and full-entry exit |
| Exit and Back | The initial and third *sacar* centers showed **En tu Diario · 1** as a role-less `SPAN` outside any button, a marked **What to notice** dictionary exit, and a working same-id **Open full entry**. Back restored Detail → third *sacar* → Page → *buscar* → starting *sacar* → root |
| Phone geometry | `innerWidth === 375`, `innerHeight === 812`, and the document measured 360px wide. New actions measured 44–82.75px; `scrollWidth` and `body.scrollWidth` stayed 360 on every checked surface, so no horizontal overflow occurred |
| Console | Zero warnings or errors |

Cleanup removed all personal rows, events, preferences, reference rows, and the active reference
pointer. The committed app reloaded at `0 palabras · 0 frases · 0 páginas`; the viewport was reset,
the tab was closed, and the isolated server stopped.

## Deployment

The owner approved the verified branch and its current **Historia** / **Pasear por mi cuaderno ·
al azar** presentation for release on 2026-08-13. `main` fast-forwarded through the direction and
four Phase 23 implementation, closeout, and review-fix commits to `bb292fe`; GitHub Pages run
31668643593 completed successfully. The live site returned HTTP 200 from
`assets/index-Co28F1Il.js`, which loaded `assets/App-BUFmyMtH.js`; that application chunk contains
**Historia**, **Pasear por mi cuaderno**, **En tu Diario**, and **Open full entry**. README Status,
the direction/report, both affected Improvement Ideas statuses, and the Phase 23 decision record
are synchronized to deployed reality by this closeout. Personal schema remains v8.
