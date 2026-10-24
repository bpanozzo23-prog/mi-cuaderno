# Architecture

**Current architecture contract, owner-approved 2026-10-17.** Together with [PRODUCT](PRODUCT.md),
this replaces [brief v3](mi-cuaderno-project-brief-v3.md), which is frozen unchanged as history.
This describes the implemented architecture and its safeguards; adopting it does not itself
authorize an application change. [Step 3](reviews/2026-10-17/STEP-3.md) records the accepted policy
choices. Exact release, schema and dataset figures belong in [CURRENT](CURRENT.md) and its
linked sources, rather than being copied here.

## Runtime and ownership

The app uses React, Vite, Tailwind and Dexie, deployed as a static PWA on GitHub Pages.
[main.jsx](../src/main.jsx) checks the installed personal database version before loading the
app. [Vite configuration](../vite.config.js) builds the app shell and service worker, excluding
the dictionary from automatic precaching. There is no application backend or account system.

| State | Authority and lifetime |
|---|---|
| Personal content | `items` in the `mi-cuaderno` IndexedDB database |
| Recorded activity and learning history | `events` in that database; review state and statistics are derived |
| Preferences, including local AI configuration | `prefs` in that database; the API key is excluded from exports |
| Downloaded dictionary and indexes | Replaceable reference databases, installed separately |
| Current screen and back stack | Validated shallow routes in browser `history.state`, with transient visit state in memory |
| Loaded notebook, derived maps and search indexes in memory | Disposable caches; reloaded or recalculated from their sources |

Events are not the source of all application state. They are authoritative for recorded
activity, tricky state and review history; content and preferences have their own records.
Disposable caches do not replace those sources with persisted counters or mastery flags.

The [personal database](../src/db/db.js) has only `items`, `events` and `prefs`. It has no lesson
or Attachment store. Most `lib/` helpers derive data, but some access preferences; components
also call named database operations directly. Folder names are not a strict dependency boundary.

## Content identity and pages

[IDs](../src/lib/ids.js) distinguish personal `user:<uuid>` items from namespaced `dict:` keys.
Lexical items own stable `meaning:<uuid>` records, independent of dictionary sense IDs or order.
Their ordered `dictKeys[]` attachments are reversible references, never identity. Personal
meanings remain usable after detachment or dictionary replacement.

The two current item types are lexical items and pages. Words and phrases differ by `form`.
[Page helpers](../src/lib/pageKinds.js) define page focus and independently enabled Vocabulary,
Source and Grammar structures. Notes body is always available; `noteSections[]` provides an
optional outline. Notes and Grammar outlines permit only one subsection level, not arbitrary
nesting. Groups, sections, captures and examples have stable nested IDs. Disabled
populated structures remain stored and valid but are excluded from active presentation and
content projections. `pageProfile` is legacy input/migration vocabulary, not current identity.

Diario membership is derived: a page has a date, no enabled structured capability and an empty
Notes outline. Feedback and Apuntes do not affect that test. Changing membership to an explicit
choice would require separate design and implementation.

## Connections and references

[Item operations](../src/db/items.js) store an ordinary connection once, in the originating
item's `linkedKeys[]`. Backlinks come from the multi-entry index. Do not store reciprocal edges.
Linking and unlinking do not log an `edit` event, though they update `updatedAt` on affected
items. Annotation-only changes and safe alias repairs preserve content timestamps. Content
edits do log an `edit` event. Sparse annotations describe existing edges and cannot create
authority on their own.

Similar-meaning annotations can anchor a pair of personal meaning IDs. Both anchors must be
present together and remain valid; operations must protect anchored meanings from deletion or
merges that would leave a dangling reference.

[Page structure operations](../src/db/pageStructures.js) enforce these additional constraints:

- Group, capture and example vocabulary references may name only personal lexical items with
  an authoritative ordinary page link.
- An external Grammar citation to a Source capture requires the Grammar page's outgoing link
  to the Source page. A same-page citation does not require a self-link.
- Removing vocabulary, items, pages or captures cleans dependent nested references in the same
  transaction. It must not invent reciprocal ordinary links.
- Opposing Source citations that cannot both retain ordinary-link authority are refused before
  mutation, preserving backup validity.

[Linked-entry resolution](../src/db/linkedEntries.js) and
[dictionary attachments](../src/lib/dictionaryAttachments.js) bridge personal and reference
identities. Resolution tries the current key and then the dataset's alias map. Safe repairs
preserve personal content and do not log content edits. Conflicting metadata needs explicit
resolution. A dictionary that is not installed is different from an unresolved, orphaned key.

## Writes, loading and recovery

Item creation/update and their required history commit in a database transaction. Quick-create
includes its ordinary link; kept Taller writing includes the page, create event and practice
event. Delete cleans dependent links, nested references and pins, deletes the item, and records
the deletion together. Historical events are retained. Browser persistence is requested after
the outer transaction commits.

[useNotebook](../src/useNotebook.js) loads items and events and derives the current item-state
map. Initial load failure is distinct from an empty notebook; refresh failure preserves the
last committed snapshot. Abandoned reads cannot replace newer results, including results queued
before a newer refresh but not yet committed by React. The stable `reload()` callback returns a
promise fulfilled with `{ status: "loaded" }`, `{ status: "failed", error }`, or
`{ status: "cancelled" }`. Loaded means both reads and derived state have reached a React commit;
it does not promise a browser paint. Refresh failures do not reject, so callers that deliberately
do not wait remain safe and a committed write is never mistaken for a failed save.

Every call requires reads started after that call. Calls in one turn may coalesce; superseded
callers wait for the newest accepted attempt. Its success or failure settles all waiting callers;
unmount settles them as cancelled, and later calls also return cancellation. Waiting does not
update a caller's captured variables: navigation uses the latest committed items to classify a
new destination. Delayed Taller completion navigates only from its originating active visit.

These UI reads are separate from the consistent export snapshot. A committed save and a refreshed
screen are different completion points. Journal/Taller and quick-create report post-save refresh
failure without offering another creation; review grades remain recorded and advance after refresh
settles, with the global retry banner reporting read failure. Editors retain failed write drafts
rather than announcing false success.

## Backup and schema upgrades

[backupSnapshot](../src/db/backupSnapshot.js) reads all personal stores in one transaction for a
consistent export. [backup](../src/db/backup.js) validates the source schema, applies supported
upgrades sequentially and validates the result before replacement. Newer backups are rejected.
Restore revalidates and replaces the personal stores in one transaction; the settings UI owns
the prior safety export and confirmation.

[preupgrade](../src/db/preupgrade.js) inspects the installed version before normal Dexie open.
The [upgrade gate](../src/components/SchemaUpgradeGate.jsx) requires acknowledgment of saving
an untouched, validated legacy export before upgrading. Current code has one schema version
and no classification that bypasses this gate for optional additive fields.

The API-key row is removed before normal export validation or rescue construction, and key
imports are refused. A validation failure can produce a separate `mi-cuaderno-rescue` envelope
of raw records and errors. It is not an importable backup and does not satisfy the upgrade or
restore safety requirement.

The standing rule covers all secrets: keep them out of exports, logs and fixtures. Expanding
backup fields requires an exclusion test proving secret values cannot enter the export; the
current API-key handling is not permission to export another credential under a new name.

Backup validation has version-specific field rules, not a global allowlist of every property.
An unknown optional field surviving one path does not prove compatibility. Future additions
need reader, writer, copy, migration and round-trip analysis. New event kinds/metadata and
absent-valid preferences already have extension paths; new item fields or stores must not be
assumed equally safe. Snapshot and restore currently name the three personal stores explicitly.

Personal-schema changes normally require an approved migration plan, version bump, export-first
safety and matching backup validation. The owner allows consideration of a lighter process for
a truly optional addition that does not rewrite existing data, but only after a specific review
demonstrates compatibility across old and new readers, creation/edit/copy paths, exports,
restores and supported upgrades. Record the evidence and obtain approval for that exception
before implementation. Optionality alone is not an exception, and none is granted here.

The implemented gate remains in force until separately approved code changes it. Browser
storage protection is checked with browser APIs; an imported preference is not evidence that
the new browser protects its storage.

## Reference installation and search

[Reference storage](../src/db/ref/refdb.js) uses `mi-cuaderno-ref-a` and `mi-cuaderno-ref-b`.
The localStorage key `mc-ref-active` selects the live database. An explicit
[install](../src/db/ref/install.js) writes verified chunks to the inactive slot; only a complete
install switches the pointer. Reference entries, conjugations and search shards are replaceable
and excluded from personal backups. Rebuilds must preserve the identity/alias seam without
touching personal data. Attribution follows the installed manifest.

[Global search](../src/lib/search.js) merges personal and reference results by match tier,
including Spanish exact/normalized/form matches, English meanings and personal tags or content.
It explains matches; attached personal entries replace matching reference rows. Scoped hubs
search their own content. Contained-vocabulary context adds page matches in Pages search, not
duplicate global results.

[Normalization](../src/lib/normalize.js) is shared with the pipeline and preserves ñ.
[Reference search](../src/db/ref/search.js) shares English token/stopword rules with packaging
and intersects indexed words. Personal content remains searchable without the reference layer.
Page text projection excludes disabled structures; Markdown matching uses visible content,
not hidden formatting or link destinations. Rendering restricts unsafe markup and URLs.

## Activity, review and practice

[Events](../src/db/events.js) record an ID, time, local calendar date, type, optional item key
and metadata. Consumers ignore unfamiliar types. Some events use dictionary keys or a null
item key; events do not all belong to a surviving personal item.

[Review derivation](../src/lib/review.js) computes tricky state, lookup counts, review boxes and
due dates. Scheduled Repaso records Again/Hard/Good/Easy grades; legacy pass/fail history remains
interpretable. [Local-day updates](../src/useLocalDay.js) refresh the queue at midnight and when
focus/visibility returns. Current-item queues exclude deleted items; activity statistics can
retain their history. [Statistics](../src/lib/stats.js) define which event types count.

Free-practice answers and session progress from hubs/collections and Similar-meaning recall are
event-free; opening a full entry retains ordinary view-event behavior. Gym records
separate drill events, using metadata for skill, mode and attempt stage, without changing
Leitner scheduling or saving typed responses. Taller uses `practice_write`: keep creates a
Diario page, discard retains no writing text. `practice_write` itself currently does not feed
the general streak; keeping writing can count through its separate create event.

## Navigation and optional AI

[App](../src/App.jsx) has four tabs, plus Pregunta while AI is ready. [Navigation](../src/lib/navigation.js) validates shallow
route stacks in `history.state`; visit-specific drafts, filters, study payloads and scroll
positions remain transient. Editor and study handlers protect save and exit flows.
A tab choice waiting for a Journal save/refresh applies only while it remains the newest tab
request and its originating visit is active. Back/Forward and App unmount cancel pending tab
choices; materializing a saved entry within the same visit does not.
Delayed Back/Forward guards share request ownership with tab choices and cannot apply an old
destination or recovery traversal after newer navigation. Refused departures restore the editor's
browser position; new destinations wait for an already-requested recovery to finish. History
entries carry a separate `mcHistoryPosition` because navigation depth is capped; older entries
fall back to their existing depth. Saving a new Journal entry while Back waits updates its visit
in memory without rewriting the popped target, and Forward resolves that visit to the saved ID.
These navigation fields and visit mappings do not enter personal stores or backups.
[Share-target parsing](../src/lib/shareTarget.js) consumes shared URL/text parameters into an
explicit flow. Opening a route or receiving shared text never itself authorizes a content save.

[App](../src/App.jsx) shows a fifth tab, Pregunta, only while AI is ready (enabled with a key).
Readiness starts unknown and reads are latest-wins; a restored or popped visit on Pregunta is left
alone while unknown, and when readiness resolves false (turned off, or a restore without the key)
App replaces the visit with Cuaderno without adding a history entry. Navigation snapshots always
carry a Pregunta stack, so older snapshots stay valid.

[The request layer](../src/lib/aiRequest.js) is a raw `fetch` with the browser-access header,
shared by every AI request: error mapping (including spend limits), cancel passthrough,
stop-reason checks, text-only extraction and a transient cost estimate. [Diario
review](../src/lib/diarioReview.js) uses it through [AI feedback](../src/lib/aiFeedback.js) with
its own model and no refusal fallback. [Pregunta](../src/lib/aiAsk.js) and
[Keep](../src/lib/aiKeep.js) use `claude-opus-5-5` with the server-side refusal fallback;
thinking is never configured, and Pregunta echoes each earlier assistant content array unchanged
so history stays append-only. [Preferences](../src/lib/aiPrefs.js) hold the flag and key.

[The feedback component](../src/components/DiarioFeedback.jsx) persists the latest response and
reviewed-text hash without a content edit/timestamp change. A hash mismatch marks stale feedback.
A paid response can remain onscreen when saving fails; receiving a response does not prove it
was persisted.

[Pregunta's screen](../src/components/Pregunta.jsx) keeps its conversation in component state
only; turning AI off unmounts it and aborts any request. "Ask about this" attachments wait in a
small in-memory queue in App (Pregunta may not be mounted, and Repaso's "Ask later" must not
navigate out of a study session); an `arrival` counter tells Pregunta to act once per addition,
and only while idle (no answer in flight, no Keep review open). At Ask, [askContext](../src/lib/askContext.js)
builds each snapshot from the current notebook by allowlist, scrubbing links, image syntax and
internal keys from the owner's own text and capping it at 6,000 characters; the sent message is
frozen on the turn as `userContent` and echoed byte for byte, and Keep serializes those frozen
messages, never the device-side item IDs. Attached words and phrases lead Keep's candidates. AI-written Markdown renders without
remote images, so an answer cannot trigger another network request. Keep finds related entries
on the device with [keepCandidates](../src/lib/keepCandidates.js) (whole-token runs through
`normalize`, ñ preserved), and sends them under opaque `c#` references, never `user:` IDs.
[keepProposals](../src/lib/keepProposals.js) normalizes the structured response (drops
unexportable examples, reuses owner tag spellings, adds `ia`, flags notebook and in-batch
duplicates, keeps one link per pair with at least one new end) and turns ticks into writes.
[`createItemsWithLinks`](../src/db/items.js) applies them in one items+events transaction:
each item logs `create`; each connection is stored once on a new item through `linkItems`,
reoriented when the suggestion started from an existing entry, with no `edit` event. A link whose
existing end was deleted meanwhile is skipped and reported; any other failure rolls back the
whole batch. [The review](../src/components/KeepReview.jsx) marks a batch committed before
refreshing, so a failed refresh offers only Refresh, and opens new entries only after a load.

## Changing this architecture

Use the [guide](AGENT-GUIDE.md) for approval, verification and deployment procedures. Preserve
existing behavior outside the approved scope; a historical acceptance criterion's omission
from this shorter contract is not permission to change it. Consult the linked implementation,
tests and [decision-log index](../DECISIONS.md#reading-this-log) for exact affected behavior and
rationale. Keep these documents current when approved work changes their guarantees; retain
old reasoning in the decision log rather than accumulating strikethrough amendments here.
New tooling, migrations, refactors and features remain separately scoped work.
