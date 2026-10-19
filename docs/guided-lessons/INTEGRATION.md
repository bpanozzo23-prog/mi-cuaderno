# Guided lessons — proposed integration and durability

**Increment B and later integration remain unapproved.** The [A1 preview](chapters/1917/REVIEW.md)
uses no personal storage or notebook startup. [PLAN](PLAN.md) owns delivery status and
[SCOPE](SCOPE.md) owns the learning experience. Supporting records are allowed by the current
contract; no particular lesson store or migration is approved.

## 4. Where it lives and how it connects

Recommend a **Lecciones** door from the Cuaderno home, leading to a small library and reader.
Avoid another bottom-navigation tab initially. “Historia” already names a vocabulary item's
learning biography in this app; using it again would be confusing.

Authored lessons are read-only reference content, not automatically created personal Pages.
They can offer explicit notebook actions using existing structures:

- Save a useful word or phrase through the existing lexical-entry flow, with context and an
  opportunity to reuse an existing entry.
- Save a passage, question, or reflection to a Source page; the existing format already includes
  “Article or lesson.” Let the owner choose or create the destination.
- Continue a longer response in Diario. Distinguish an ordinary autosaved entry from Taller's
  current temporary-until-Keep workflow.

No notebook items are created just by opening a lesson. Saved text belongs to the owner and is
not overwritten by future lesson revisions. Initially retain human-readable chapter/version/
passage attribution and supported source links; do not insert a new `lesson:` namespace into
`linkedKeys[]` without a separately approved relationship contract.

Keep dictionary lookup optional: essential glosses and all lesson text must work without an
installed dictionary. A lookup round trip should return to the exact lesson context.

## 5. Technical shape and durability

### Small reusable player, authored content packages

Use a limited set of trusted components: narrative, image/map, source excerpt, optional
investigation, objective check, response, and recap. Lesson generation means drafting and
reviewing content during development, not running an AI service on every visit.

The approved A1 groups content, pure validation, player and a thin preview under
`src/features/lessons/`, keeping them within existing lint/test discovery. A later library
wrapper and revision compatibility belong here too when approved; no separate content package
or application is needed. A1 uses the shared player without importing notebook startup.

Follow the existing separation of curated content in `recognitionContent.js` and
`journalPrompts.js`. Use plain text or the supported safe formatting subset inside structured
records, not arbitrary generated HTML, scripts, or remote executable lesson packages.

Assign stable lesson, episode, step, passage, activity, and source IDs immediately. Store content
version separately from identity. Inserting a page must not move a saved answer to another
question. Missing or revised passages need a safe fallback and an explanation, not deletion of
owner work. Do not build the reference's entire event/person/place/claim graph now.

### Explicit approval needed: resume and unfinished writing

The app's current browser-history snapshot deliberately excludes drafts and study progress.
Its backup currently covers items, events, and preferences. A new lesson database would not
automatically be backed up. Long lessons should not inherit the old prototype's temporary state.

Recommended first usable release:

- Save the current lesson/episode/step and content version as operational resume state.
- Preserve in-player writing as owner drafts, with stable activity IDs and clear saved/error
  status. A failed save must not look successful or silently discard text on navigation.
- Preserve a small snapshot of the question/prompt alongside the writing, not just IDs and a
  version number. A draft restored from backup must remain understandable even if the original
  activity is no longer distributed. Do not require the entire old media pack to read it.
- Keep quiz attempts temporary initially; no persistent scores or mastery model.
- “Start again” changes location without silently erasing writing. Deleting drafts is a separate,
  explicit action. Removing downloaded content never removes personal work.

Prefer a narrowly defined lesson-work store in the personal database over unbounded draft data
hidden in preferences or disposable content caches. The accepted product contract permits
supporting records; this particular store remains **proposed storage work**, not an assertion
that schema 12 contains it. Before implementation, specify its shape and ownership, its
distinction from notebook content, and operational resume/draft state versus event-derived
learning statistics. Any later completion or learning history needs its own event semantics;
do not store a parallel mastery counter.

This requires approval of the storage design, a schema migration and version bump,
untouched export-first protection, strict backup validation, atomic restore, and preservation
of all older supported backups. Use the next available schema version at implementation time.
Do not quietly proceed if this design conflicts with the product contract.

Lower-scope alternative, if the owner wants to avoid that migration: a small validated bookmark
preference plus writing directly in existing Diario/Source pages. That would deliberately omit
durable in-player drafts, and still needs an explicit navigation/preference contract. It is not
equivalent to the recommended experience.

### Media and offline behavior

Keep text small; load chapter images and narration as separate files. The current PWA config
precaches PNG/SVG and application assets, excluding only the dictionary directory. A growing
lesson library therefore needs explicit asset/cache boundaries before integration.

Offer per-episode offline packs with visible size, progress, retry, and removal. Mark a pack
available offline only after its required files are verified; an interrupted replacement must
leave the prior version usable. Missing media has a readable fallback. Do not silently download
the whole season or embed every image and audio file into one HTML file.

Authored media is replaceable reference material, not the deferred personal Attachment feature.
Record this distinction in the approved lesson integration design. Personal backups retain
writing, location and reference/version information; media can be downloaded again. No server, account, sync,
analytics, recording upload, or new runtime AI dependency is implied.

## Verification for the first integrated release

- Content checks: unique/stable IDs, valid branch destinations, reachable ending, no broken
  citations or asset paths, explicit source/translation labels, usable fallback text.
- Historical/language checks: consequential claims and exact excerpts checked against selected
  sources; review captions, translations, and natural Mexican-Spanish phrasing. Record who or
  what reviewed them; automated checking is not historian or native-speaker approval.
- Player checks: keyboard access, meaningful focus after navigation, in-place help, no exercise
  gate, branches returning correctly, expected browser Back and notebook round trips.
- Durability checks: reload/restart, interrupted and failed saves, content reorder/removal,
  explicit draft deletion, legacy migration, backup round trip, and no secret-bearing exports.
- Isolation checks: opening/studying creates no personal items, scheduled review grades, Gym
  statistics, or AI requests. Dictionary absence does not block the lesson.
- Media checks: initial download stays bounded; optional packs handle interruption, version
  change, offline use and removal without touching personal work.
- Project acceptance: focused tests, complete serial suite, production build and diff check;
  disposable 375 px browser verification, no horizontal overflow or console errors. Follow
  [browser verification](../agents/BROWSER-VERIFICATION.md); distinguish inspected screenshots
  from the owner's phone check and record any unavailable evidence.

