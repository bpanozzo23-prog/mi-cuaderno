# Architecture

**Draft for the Step 3 contract reset, 2026-10-17.** This describes the app at the deployed
baseline named in [CURRENT](CURRENT.md), checked against the working tree. It does not approve
implementation changes or yet supersede [brief v3](mi-cuaderno-project-brief-v3.md).
[PRODUCT](PRODUCT.md) covers owner-facing promises; [Step 3](reviews/2026-10-17/STEP-3.md) tracks
the unresolved contract choices. Exact release, schema and dataset figures belong in CURRENT
and its linked sources, rather than being copied here.

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
last snapshot. Abandoned reads cannot replace newer results. Its `reload()` currently bumps a
React epoch and returns before loading finishes: it is **not awaitable**. These UI reads are
separate from the consistent export snapshot. A committed save and a refreshed screen are
different completion points; editors retain failed drafts rather than announcing false success.

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

[App](../src/App.jsx) has four tabs. [Navigation](../src/lib/navigation.js) validates shallow
route stacks in `history.state`; visit-specific drafts, filters, study payloads and scroll
positions remain transient. Editor and study handlers protect save and exit flows.
[Share-target parsing](../src/lib/shareTarget.js) consumes shared URL/text parameters into an
explicit flow. Opening a route or receiving shared text never itself authorizes a content save.

[AI feedback](../src/lib/aiFeedback.js), [preferences](../src/lib/aiPrefs.js) and
[Diario review](../src/lib/diarioReview.js) implement one explicit Diario request, not a general
notebook assistant. The browser sends title and visible body text directly to Anthropic,
excluding Apuntes and broader context; the local API key is transmitted as authentication.
[The feedback component](../src/components/DiarioFeedback.jsx) persists the latest response and
reviewed-text hash without a content edit/timestamp change. A hash mismatch marks stale feedback.
A paid response can remain onscreen when saving fails; receiving a response does not prove it
was persisted.

## Changing this architecture

Use the [guide](AGENT-GUIDE.md) for approval, verification and deployment procedures. Product
policy choices are tracked in [Step 3](reviews/2026-10-17/STEP-3.md); this factual description
does not settle them. Current behavior and historical rationale remain accessible through the
code links above and the [decision-log index](../DECISIONS.md#reading-this-log). New tests,
refactors, tooling, migrations and features are separate work from this documentation reset.
