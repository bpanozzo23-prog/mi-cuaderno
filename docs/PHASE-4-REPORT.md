# Phase 4 — the linking package

**Date:** 2026-07-31

Phase 4's core scope was the linking package in `docs/PHASE-4-DIRECTION.md`. Six of its seven
requirements are built, committed and verified; requirement 7 is proposed for deferral, which
the direction file explicitly allows. The friction list was deferred at the owner's direction
and is still to be collected.

## Verdict

**Requirements 1–6 are complete.** `npm test` runs **217 tests** (184 at the end of Phase 3;
34 new, one moved). `SCHEMA_VERSION` is still **1** — no schema change was needed, so §5's
migration plan and export-first reminder never triggered, exactly as the package was shaped to
ensure. Every decision is in `DECISIONS.md` under the Phase 4a–4e headings.

## What shipped

| Sub-phase | What it does | Requirement |
|---|---|---|
| 4a | `src/lib/links.js` — one pure derivation of both link directions, replacing two | 3 |
| 4b | `src/components/LinkPicker.jsx` — one search box for both layers, replacing the `<select>` and the separate dictionary button | 1 |
| 4c | Quick-create-and-link, plus the project's first component tests | 2 |
| 4d | `LinkCard.jsx`, grouping, and `src/db/linkedEntries.js` — the §5 seam applied to links | 4, 5 |
| 4e | Each screen leads with the group it is for; `DictDetail` shares the cards | 6 |

## The requirements, one by one

| # | Required | Status |
|---|---|---|
| 1 | Autocomplete picker across words, pages and dictionary; type and context shown; already-linked identified | ✅ one box, both layers, "linked ✓" marked rather than hidden. **Matches term, title, translation only** — a test asserts a tag match does not surface |
| 2 | Create-and-link without losing unsaved work | ✅ creates, links, never navigates — pinned by a component test that was confirmed to fail when navigation is reintroduced |
| 3 | Backlinks verified and presented, never stored twice | ✅ verified: stored once, reverse from the `*linkedKeys` index. Two *implementations* existed; now one. Nothing rebuilt |
| 4 | Rich cards: type, term, translation, date, preview, dictionary status; readable on a phone; no tags | ✅ verified at 375 px with no horizontal overflow |
| 5 | Grouping into palabras / páginas / journal entries, fixed order, no sort controls | ✅ a dated page is the journal test (§7); dictionary links join palabras; empty groups unrendered |
| 6 | Every page shows its linked vocabulary; focused related view on item screens | ✅ pages lead with palabras, words and entries lead with páginas |
| 7 | Exact term and title link suggestions | ⏸ **proposed for deferral** — see below |

## Cross-cutting criteria

- **Linking never requires navigating away.** Delivered by requirements 1 and 2 and pinned by a
  test. Verified end to end on a phone viewport: a journal entry with an unsaved draft, a phrase
  created and linked from inside it, and the draft still there afterwards, still unsaved.
- **No "linking mode" on global search.** Not built, deliberately. The picker exists only inside
  detail screens, where "link it to *what*?" already has an answer.
- **No schema change.** Nothing stores a group, an order, a count or a suggestion; all of it is
  derived at render from `linkedKeys` and the event log (§7).

## The one thing that turned out to be broken

Requirement 3 asked me to verify the backlink mechanism rather than rebuild it. Verification
found two things worth reporting:

1. **Two implementations of "both directions".** `Detail` filtered the in-memory items array;
   `relatedItems`/`backlinksFor` did the same job against the database and were called only by
   tests. Both were correct. There is now one (`relatedTo`), and `backlinksFor` remains as the
   indexed reverse lookup that `deleteItem` uses and the Phase 1c tests assert against.

2. **A real §5 hole in linked dictionary keys.** They were resolved with a plain bulk-get that
   silently dropped anything that failed. So a rebuild that *renamed* an entry lost the link
   even though the alias map (§6) knew its new id, and a genuinely dead link vanished with no
   explanation. Attachments have handled this correctly since Phase 2f; links now do too —
   resolve through the alias map, rewrite the key when it answers (no `edit` event: the dataset
   changed, not the owner), and show what nothing could resolve with the choice to forget it
   left to the owner.

## Verified against the running app

Run against the dev server with seeded data and a fixture reference dictionary written directly
into IndexedDB (no 22 MB download needed for these checks):

- **The picker.** "sacar" offers one row, not two — the attached dictionary entry collapses into
  the owner's own item (Phase 2e). "fui" offers *ir*, labelled "form of ir". "take out" finds
  *sacar* from English. "ano" never offers "año". "verbs" offers **nothing at all**, though a
  word is tagged `verbs`.
- **Linking.** The key was stored on the page alone, the target's `linkedKeys` stayed empty, the
  event log gained no `edit`, and the screen never changed.
- **All six link kinds at once**, on one page: two words, a journal entry, a live dictionary
  entry, a renamed key and a dead one. Groups rendered palabras-then-diario with no empty
  páginas heading; the renamed key resolved and was rewritten in IndexedDB; the dead one said so
  quietly and stayed linked until told otherwise; zero `edit` events.
- **The seam, both ways.** *casa*'s dictionary screen shows the page that links it — through the
  rewritten alias key — as the same card, under PÁGINAS.
- **Phone viewport (375 px).** No horizontal overflow; the draft-preservation scenario passes.
- No console errors at any point. `npm run build` is clean (precache 424 KiB).

## Requirement 7 — the deferral I am proposing

Exact term and title suggestions while editing is the package's largest single piece of new
logic: match detection over a page body, longer-phrase preference, common-term noise
suppression, and an approval interface — and the direction file sequences it last precisely so
everything else can ship without it.

My recommendation is to **use requirements 1–6 for a stretch of real days first**, then decide
requirement 7 together with the friction list. Two reasons: the picker may already have removed
most of the friction that suggestions were meant to address, and the friction list is the better
evidence for what "noise suppression" needs to mean for this notebook specifically. If it is
built later, approved suggestions go through the same `linkItems` call and inherit "no `edit`
event" by construction.

## What you need to do

**Use it.** Link a few things the way you actually would — from a journal entry mid-sentence,
from a grammar page to the verbs it is about — and see whether the picker finds what you mean
on the first or second keystroke.

**Watch the groups.** They are fixed, with no controls, on the theory that a list of five links
does not need sorting. If a page ever accumulates enough links that the order stops helping,
that is friction worth writing down.

**Then the friction list.** It is the one input this phase deliberately went without, and it
decides both requirement 7 and whatever Phase 4 does next.

---

# The friction list opens (2026-08-01)

The owner used the app and reported the first three friction items. Two of the three were not
about linking at all, which is itself the most useful thing the list said: the picker appears to
have absorbed the friction requirement 7 was aimed at, and what remains is about capturing
meaning and organising vocabulary.

All three are built, in `4f`–`4h`. `npm test` runs **240 tests**. Still no schema change —
`SCHEMA_VERSION` is 1, and §5 has still never triggered in this project.

| # | The friction | What shipped |
|---|---|---|
| 1 | The word/phrase toggle had no effect on the list — everything landed under *palabras* | **4g** — four tabs: todo / palabras / frases / páginas |
| 2 | A phrase's meaning could only be one running line | **4h** — meanings can hold several lines |
| 3 | Typing a tag gave no hint that a similar one already existed | **4f** — suggestions from the tags already in use |

### What each one turned on

**4f — tag suggestions.** The fix that matters is not the autocomplete, it is that matching goes
through the shared `normalize()` and is therefore **case- and accent-insensitive**. `cleanTags`
dedupes exact strings only, so `expression`, `Expression` and `expresión` genuinely are three
tags today; typing any spelling now surfaces the one already in use. It only ever *suggests* —
what gets stored is exactly what was typed or tapped, because silently rewriting the owner's
spelling is the kind of helpfulness that annoys the third time. One `TagInput` now serves both
the detail screen and the add sheet, retiring the comma-separated field.

**4g — palabras and frases.** Worth being clear that this is **not a third content type**, which
§7 would require a brief amendment for. `form: word | phrase` has been a locked field since
Phase 1b and is already shown as *loc.*; only the filter ignored it. Three things came with it:
dictionary results are suppressed under *frases* (the bundled dictionary is lemma-focused, §1, so
the tab would fill with single words — the same rule Phase 2e applied to *páginas*); the header
count splits three ways, since one "palabras" total quietly including phrases stops being true
the moment they separate; and the add sheet's toggle now follows the term until touched, matching
what quick-create already inferred.

**4h — multi-line meanings.** The important decision here was what *not* to build. A structured
`translations[]` array would have been the project's first schema change, triggering §5 in full,
and edges into the sense-level annotations §7 defers. `translation` was always a plain string, so
newlines already survived storage, backup and import — the only blocker was `<input>`, which
cannot hold a line break. Rendering follows what each screen is for: full on the detail screen
and the review card, clamped to two lines in lists, flattened in the picker. Search flattens
whitespace at that one comparison, never in `normalize()`, which the pipeline imports and which
decides what the shipped dictionary matches.

### Verified

At 375 px, with seeded data and a fixture dictionary: four filter chips fit one row with no
horizontal overflow; each tab shows only what belongs to it; searching "casa" under *frases*
returns nothing where *palabras* returns the dictionary entry; typing "EXPRESION" surfaces the
existing "expresión" and tapping it stores that spelling; a three-line meaning renders in full on
the detail and review screens (72 px and unclipped) and clamps to two lines in the list. No
console errors; production build clean.

### Requirement 7 — still parked

Nothing on the friction list asked for link suggestions, and two of the three items pointed
elsewhere. It stays parked until the list asks for it.

---

## Where things are

- `src/lib/links.js` — `relatedTo`, `relatedToKey`, `pickerMatches`, `groupRelated`, `GROUPS`.
  Pure, database-free, `today`-free; tested in `src/lib/links.test.js`.
- `src/db/linkedEntries.js` — the §5 seam for linked `dict:` keys (alias rewrite, orphans).
- `src/components/LinkPicker.jsx` — the picker and quick-create.
- `src/components/LinkCard.jsx` — `ItemLinkCard`, `EntryLinkCard`, `OrphanLinkCard`.
- `src/components/Detail.test.jsx` — the first component tests; jsdom is opt-in per file.
- `src/lib/tags.js` + `src/components/TagInput.jsx` — the tag vocabulary and the one control
  that enters tags anywhere.
- `src/lib/filters.js` — the four-way type filter and the rule for when dictionary results
  belong in the list.
