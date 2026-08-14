# Phase 26 — Derived context connections (report)

Phase 26 was implemented and verified locally on
`codex/phase-26-derived-context-connections` on 2026-08-14. Push and deployment remain pending
owner approval. The approved contract remains in
[PHASE-26-DIRECTION.md](PHASE-26-DIRECTION.md).

## Outcome

| Slice | Result |
|---|---|
| 26a — Mentioned here | Saved visible prose derives personal-vocabulary proposals; only an explicit Add uses the context's existing writer |
| 26b — Seen together | Historia derives read-only lexical neighborhoods from exact structure or repeated cross-page prose evidence |
| 26c — Also from this source | Exact case-sensitive trimmed personal URLs disclose peers inline without a new route or write |
| Personal data | No field, migration, preference, backup shape, event type, counter, score, queue, or background job; schema stays v8 |
| Reference data | No package, store, index, manifest, or dataset change; optional reads fall back exact-only |

The three features share evidence without turning it into hidden authority. Mention detection never
links automatically. Context neighborhoods state proximity rather than a semantic relationship.
URL equality creates navigation only. Confirmed stored-once Connections and page-vocabulary
references remain the sole authorities they were before this phase.

## 26a — Context index and Mentioned here

`src/lib/contextConnections.js` owns one lazy index per notebook snapshot. It projects Notes
Overview/section bodies, enabled Source capture text, enabled Grammar explanations and Spanish
examples, and Diario bodies. Titles, labels, drafts, Source metadata/reflections, Grammar key
ideas/patterns/English/notes, and disabled Source/Grammar structures stay out. The existing Phase
23 prose projection remains unchanged.

The matcher tokenizes each context once per derivation, preserves ñ through the existing
`normalize.js`, uses whole Unicode token runs and the fixed stop list, prefers exact matches, and
enriches only attached words with safe conjugation forms. Optional reference failure reruns
exact-only. Reference-wide ambiguous inferred forms stay silent; duplicate personal entries with
the same normalized surface remain visible with glosses for manual choice but cannot supply prose
neighborhood evidence.

`MentionedHere.jsx` is collapsed, absent while loading/empty, shows five proposals before Show all,
and keeps Open and Add as separate 44px controls. Phrases rank first and differing surfaces disclose
**Matched as …**. A failed Add retains only that row's inline problem.

Confirmation follows existing authority:

- Source capture and Grammar example use `commitPageVocabularyAdd` with the exact target;
- Notes/Grammar overview on a Vocabulary Page becomes ungrouped page vocabulary; and
- other Page/Diario prose uses the Page-owned directional `found_in` connection.

An existing conceptual Page/Diario edge suppresses a page-level proposal without retyping it. An
already attached capture/example suppresses only that exact context, so page membership does not
hide a useful attachment proposal. Later prose changes never auto-remove confirmed placement.

## 26b — Seen together

Historia prepares neighborhoods from the same context index. One active named Collection group,
Source capture attachment, or Grammar example attachment qualifies immediately. Prose requires
unambiguous non-overlapping occurrences on at least two distinct Pages; multiple contexts on only
one Page, one coincidence, phrase/component overlap, tags, Not grouped yet, and transitive paths do
not qualify.

**Seen together** appears after **Phrases** and before **Connections**, shows five rows before Show
all, sorts explicit evidence before total distinct context count and notebook order, and names the
real supporting contexts. Rows navigate to ordinary Detail and expose no link, relationship, or
remove action. A direct Connection may also appear because semantic relation and contextual
proximity are intentionally different facts.

## 26c — Also from this source

`src/lib/sharedSources.js` indexes valid HTTP(S) values from every personal `mediaLinks` array and
from `source.url` only while Source is enabled. Identity is the exact saved string after trimming
outer whitespace. Case, query, fragment, slash, protocol, redirect, host, and short-link variants
remain distinct. Repeated copies on one item—including Source plus Media—collapse into one indexed
row and the current item never counts as its own peer.

`SharedSourceDisclosure.jsx` renders inline beneath the first unique lexical/Page/Diario media URL
or the Page's primary Source URL. A Page media copy of its primary Source URL does not duplicate the
disclosure. Rows retain notebook order, identify Word/Phrase/Page/Diario plus Page role/date and URL
origin, and use the existing open/back trail.

## Automated and deliberate verification

- Phase 26a focused gate: **77/77 tests across seven files**.
- Phase 26b focused gate: **13/13 tests across two files**.
- Phase 26c focused gate: **82/82 tests across six files**.
- Complete serial suite at the Phase 26 feature commits: **1,464/1,464 tests across 128 files** in
  340.25 seconds (`npm.cmd test`). The output contained only the repository's existing jsdom
  `scrollTo` notices.
- Production build: passed; Vite transformed **2,116 modules** and generated the PWA.
- `git diff --check`: passed for the Phase 26 commits.

The deliberate negative proof temporarily lowercased canonical URL identity. The dedicated test
failed at the intended `Watch` versus `watch` assertion; restoring exact identity returned the file
to 3/3 green. No probe code remains.

Pure and component coverage pins context projection exclusions, whole-token/ñ behavior, exact-first
matching, safe and ambiguous inflections, exact-only fallback, duplicate-surface choice,
page-versus-context suppression, phrase overlap, cross-page thresholds, structural evidence,
ranking, disclosure limits, failure retention, all four personal item kinds, URL
non-canonicalization/deduplication, and ordinary navigation. Database-backed component proofs cover
Notes, Vocabulary-enabled Pages, Source captures, Grammar examples, Diario, lexical media, Page
media, primary Source URLs, and Diario Más.

## 375×812 browser closeout

The Codex test origin first contained an old disposable schema-4 fixture; it was deleted without
inspection and replaced by a fresh schema-8 fixture. No owner browser data or backup was available.
The new fixture contained two Words, one Phrase, three non-journal Pages, one Diario entry, seven
ordinary create events, active Source/Grammar prose, repeated cross-page prose, one exact shared
URL, one current-item Source/Media duplicate, and one case-variant control. No dictionary was
installed.

| Check | Evidence |
|---|---|
| Mentioned here | Notes, Source capture, Grammar explanation/example, and Diario all disclosed saved candidates; phrase rows appeared first with glosses |
| Read-only boundary | After the ordinary Page view, expanding Notes/capture proposals and the source bundle kept item/link/context snapshots byte-equivalent and events at 8/8 |
| Page confirmation | Adding *sacar* from Notes created only the Page-owned `found_in:target` annotation; events remained 8 |
| Exact attachment | The same already-linked *sacar* remained available in its Source capture; confirming it changed only that capture's `itemKeys` and logged the established single edit event, while Grammar remained untouched |
| Seen together | *basura* showed five real contexts; measured label order was Phrases (top 589), Seen together (683), Connections (805). Its 72px row opened ordinary *basura* Detail; links stayed unchanged while the ordinary navigation added one view event |
| Exact URL | Source and Diario each showed **Also from this source · 4** for the four other exact peers. The current Page's duplicate Media copy rendered no second disclosure, and `Lesson-26` stayed out of the lowercase `lesson-26` bundle |
| Phone geometry | `innerWidth === 375`, `innerHeight === 812`; document scroll/client width stayed 360/360 on Page, Historia, and Diario surfaces |
| Actions | Every visible Mentioned-here, Also-from-this-source, and Add control measured exactly 44px high |
| Console | Zero warnings or errors across the complete flow |

The in-app browser's known frame-compositing limitation precluded a useful screenshot, so layout
was verified through DOM state and computed geometry as the project guide prescribes. Cleanup
returned the disposable origin to zero personal items and zero events, cleared its local pointer,
reset the viewport, finalized the tab, and left no local server listening.

## Commits and deployment boundary

- `a456096` — direction, brief amendment, decisions, and four retained improvement ideas;
- `d1b731d` — shared context index and explicit Mentioned-here confirmations;
- `fd17282` — evidence-backed Seen-together Historia section; and
- `e0cd205` — exact shared-source index and inline disclosures.

This report and status synchronization are the local closeout only. Nothing was pushed, merged to
`main`, deployed, or production-verified. Those actions require separate owner approval.
