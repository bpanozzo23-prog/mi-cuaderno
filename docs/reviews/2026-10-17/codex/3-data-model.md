# Codex review — data model, schema and dictionary pipeline

> Independent read-only review by Codex (OpenAI Codex CLI), run on the XPS on 2026-10-17 against `main` at `35cda8e`, as one of four inputs to [the reassessment](../REASSESSMENT.md). The text below is the review verbatim, except that absolute file links were rewritten as repository-relative links and trailing whitespace was normalized. Its findings were spot-checked by Claude Code before use; see the reassessment for which were confirmed. It describes the code as it was at `35cda8e`.

**Mi Cuaderno’s basic data architecture should be preserved, but its safety mechanisms need a targeted consolidation.** The most consequential problems are interactions between otherwise sensible rules: a valid editing sequence can violate backup invariants; validation can prevent rescuing readable data; and generic content writes are less atomic than newer specialized operations.

I audited checkout `35cda8e` dated 2026-10-17, containing 472 commits. This was entirely read-only: no tests, builds, pipeline execution, browser-data operations, or repository changes. I did not inspect private data, backup JSON files, or the stale worktree. Findings described as defects below are supported by static code paths, not runtime reproductions or evidence that the owner has encountered them.

**1. A concrete conflict between page-reference rules can prevent normal backup export**

**Finding: high confidence; occurrence in the owner’s notebook unknown.**

Two pages may each enable Source and Grammar. The Grammar editor offers captures from every Source-enabled page, including another composable page. There is no restriction preventing mutual references. See [GrammarSection.jsx:154](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/GrammarSection.jsx#L154).

The following sequence exposes a conflict:

1. Page A’s Grammar example references a capture on page B. The command establishes A→B.
2. Page B’s Grammar example references a capture on page A. The command establishes B→A and removes A→B.
3. A’s original exact reference remains, although its required outgoing connection has disappeared.

The implementation validates the target capture, then invokes `ensureOutgoingPageConnection`. That helper removes the reverse connection and annotation without checking whether the other page’s Grammar examples depend on it. The saved page receives structural validation, which does not establish the validity of the other affected page’s references. See [pageStructures.js:427](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/pageStructures.js#L427), [the connection promotion helper:87](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/pageStructures.js#L87), and [the save validator:71](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/pageStructures.js#L71).

Backup validation subsequently rejects A’s reference because an external `sourceCaptureRef` requires an outgoing link. `buildBackup` refuses to return an export when validation fails. Thus, **two permitted saves can leave readable personal content unable to produce a normal backup**. The underlying captures and prose remain stored. See [backup.js:521](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/backup.js#L521) and [backup construction:54](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/backup.js#L54).

This reveals a model conflict, not merely a missing cleanup call. “One physical connection per pair” and “each exact reference requires its owner’s outgoing connection” cannot both support mutual references.

**Recommendation:** First prevent connection promotion from invalidating an existing dependent reference. Then amend the narrow Source-reference rule so an ordinary page connection in either physical direction can authorize an exact capture reference. Collection membership can retain its outgoing-link rule; membership and source citation need not have identical authority semantics. Preserve both exact references rather than silently clearing the first one.

Add a regression that performs both saves and then builds a backup. Existing tests cover promotion, reciprocal legacy edges, annotation orientation, and rollback, but the important acceptance condition here is validity of the entire resulting notebook. See [pageStructures.test.js:484](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/pageStructures.test.js#L484).

**Effort:** approximately 1–2 days for a guard; 2–4 days for the semantic adjustment and verification. **Risk:** low for the guard, moderate for the rule change. It needs an explicit brief/compatibility decision, although it does not require restructuring stored content.

**2. Recovery must remain possible when validation fails**

The normal restore path has substantial strengths: it validates before writing, shows a summary, requires a current safety export and acknowledgement, and replaces all three personal stores in one transaction. These are appropriate safeguards for a destructive restore. See [Ajustes.jsx:280](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/Ajustes.jsx#L280), [restore confirmation:382](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/Ajustes.jsx#L382), and [backup.js:924](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/backup.js#L924).

However, the same validator is also a prerequisite for:

- Ordinary export.
- The safety export required before restore.
- The export required before opening an older database with the current application.

Consequently, a malformed record—or a validator that incorrectly rejects legitimate historical data—can block export, upgrade, and the UI’s restore route simultaneously. See [backup.js:73](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/backup.js#L73), [preupgrade.js:103](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/preupgrade.js#L103), and [Ajustes.jsx:298](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/Ajustes.jsx#L298).

This is not merely hypothetical. Commit `5fcfd8e` fixed the owner’s actual v8→v9 gate failure: four dictionary-created words contained legitimate parts of speech that the backup validator’s narrower enum rejected. The incident is recorded explicitly in [DECISIONS.md:1096](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/DECISIONS.md#L1096). Commit `f345f58` separately fixed the pre-upgrade export’s failure to strip the AI key.

**Recommendation:** Separate “safe to import automatically” from “possible to rescue.”

Provide an emergency export of the readable personal stores, retaining the existing explicit secret exclusion, accompanied by validation diagnostics. Clearly distinguish it from a validated, directly restorable backup. A failed validation should still prevent unsafe import or migration; it should not prevent obtaining the surviving data.

Both regular and pre-upgrade exports also read items, events, and preferences through separate operations. Put those reads inside one read-only transaction so the export has a coherent snapshot boundary. This matters especially alongside the separate content/event writes discussed below. See [backup.js:54](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/backup.js#L54) and [preupgrade.js:83](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/preupgrade.js#L83).

The remaining weakness is operational. The backup-age display lives in Ajustes, while export records “backup taken” immediately after requesting a browser download. The helper clicks a download link; it does not verify that a file was retained or copied off the phone. The upgrade gate’s wording—“Backup requested. Check…”—is more accurate than the regular export’s “Backup downloaded.” See [Ajustes.jsx:246](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/Ajustes.jsx#L246), [backup-age display:342](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/Ajustes.jsx#L342), and [file.js:3](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/file.js#L3).

Add a quiet overdue-backup reminder on a regularly visited surface and establish an occasional restore rehearsal on a disposable origin. A downloaded file still on the same phone does not address losing that phone. This does not require accounts or synchronization.

One smaller portability defect belongs in this work: `storagePersisted` is restored with preferences, but `requestPersistence` trusts a previously stored `true` without checking the current browser grant. A restored preference is not evidence about the new device. See [persistence.js:10](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/persistence.js#L10) and [backup.js:928](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/backup.js#L928).

**Effort:** 2–4 days for rescue export, coherent snapshots, status wording, and reminder behavior. **Risk:** low to moderate; emergency recovery must remain visibly distinct from validated restore. The off-device backup habit can start immediately.

**3. Generic content writes and their events should be atomic**

**Finding: high confidence; failure frequency unknown.**

`createItem` commits the item and then writes its `create` event separately. `updateItem` similarly updates content before writing its `edit` event. Its checks protecting meaning-specific connections also happen outside a transaction encompassing the eventual write. See [items.js:210](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/items.js#L210) and [items.js:230](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/items.js#L230).

There is a concrete consequence beyond inaccurate statistics. Diario records a newly created page’s identity only after `createItem` resolves. If the item write succeeds but the event write fails, the editor reports “Couldn’t save.” Retrying can generate a second page while the first survives. See [JournalEditor.jsx:114](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/JournalEditor.jsx#L114) and [its error path:151](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/JournalEditor.jsx#L151).

The repository already demonstrates the better pattern: dictionary-meaning import, deletion, and page-structure commands combine their content and event changes transactionally. See [items.js:273](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/items.js#L273), [deletion:302](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/items.js#L302), and [pageStructures.js:134](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/pageStructures.js#L134).

**Recommendation:** Make fresh reads, applicable reference checks, content changes, and corresponding events one transaction in generic create/update too. Keep the browser persistence request outside it. Limit generic patches so structural changes go through their domain commands.

**Effort:** 1–2 days. **Risk:** low to moderate because some callers already run inside broader transactions; preserve compatible transaction scopes. Existing deletion rollback tests provide a useful failure-injection pattern: [items.test.js:455](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/items.test.js#L455).

**4. Schema version 12 is reasonable; the surrounding compatibility machinery is becoming expensive**

The number 12 is not evidence of a bad schema. All versions use the same three stores and indexes. Several migrations add only defaults: `noteSections: []`, `feedback: null`, or `apuntes: null`. Version 11 permits optional meaning anchors without rewriting rows. See [db.js:15](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/db.js#L15), [default additions:162](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/db.js#L162), and [v11 declaration:257](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/db.js#L257).

Migration implementation has an important strength: database upgrades and backup conversion reuse the same item-transform functions. Historical backups are upgraded sequentially, and the source envelope remains untouched. That is worth retaining.

The maintenance cost is nevertheless visible:

- `backup.js` is 938 lines, combining envelope handling, current validation, historical rules, cross-record checks, and conversion.
- The sequential upgrade path repeats almost identical orchestration for every version.
- Schema declarations are repeated in migration tests.
- Some historical fixtures are synthesized by removing fields from current factories, making them vulnerable to changes in those factories.

See [backup upgrade orchestration:798](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/backup.js#L798), [migration.test.js:52](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/migration.test.js#L52), and [backup.test.js:15](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/backup.test.js#L15). These sizes indicate coordination burden, not inherently poor code.

The policy also became stricter than the original brief. The original requirement was a migration plan and export reminder; the amended requirement mandates a fully validated export and acknowledgement before every older schema opens. That change is explicit in [brief §5:155](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/mi-cuaderno-project-brief-v3.md#L155), so this should be reassessed as a documented policy decision rather than blamed on agents silently ignoring the brief.

**Recommendation:**

- Create one small migration registry containing version transitions and pure transformations, used by database declaration and backup upgrading.
- Separate historical compatibility adapters from current record and graph validators.
- Add frozen, synthetic historical envelopes with independently specified expected results. Retain tests that exercise the actual database upgrade path.
- Freeze historical acceptance rules sufficiently to avoid applying today’s editor restrictions retroactively.
- Reconsider mandatory materialization and an interrupting upgrade ceremony for every optional additive feature. Define which changes need transformation, which can use absent-field defaults, and which require explicit recovery acknowledgement.

I would **not** remove versions 1–11 from backup support merely because the owner uses v12. One user means a small deployment population; it does not mean old recovery files stop mattering. Nor would I introduce a separate version system for every nested object now.

Validation is also uneven: nested page and meaning structures receive extensive checking, while event timestamps need only be strings and event metadata receives no corresponding shape validation. See [backup.js:743](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/backup.js#L743). Known event shapes should have shared decoders and diagnostics, preserving the intentional handling of unknown types and historical missing grades. Tightening validation indiscriminately would repeat the previous gate failure.

**Effort:** 3–5 days in small increments. **Risk:** moderate because compatibility is sensitive. The registry/extraction can preserve behavior; changing upgrade policy should be a separate decision.

**5. Keep the two content types; decompose responsibilities before decomposing storage**

The page model is large, but it is not an undifferentiated record. `collection`, `source`, and `grammar` are already separate nested capabilities, and combining them supports a legitimate notebook use case. Exclusive Source/Grammar/Collection subtypes would make mixed pages harder to represent.

The observable cost lies in coordination:

- `clonePage` knows every nested structure.
- Deletion inspects groups, captures, examples, annotations, exact references, and preferences.
- Constructors, specialized commands, and backup validation contain overlapping authority checks.
- The unified workspace, still named `CollectionPage.jsx`, contains conditional presentation for all page capabilities.

See [pageStructures.js:45](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/pageStructures.js#L45), [items.js:302](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/items.js#L302), [constructor checks:188](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/items.js#L188), and [CollectionPage.jsx:1146](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/CollectionPage.jsx#L1146). The page workspace is 1,286 lines; `pageKinds.js` is 502 lines; page-structure mutation code is 532 lines.

Two details deserve precision:

- `pageProfile` is legacy compatibility vocabulary, not another current identity competing with `pageFocus`. The v5 migration removes it. See [db.js:96](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/db.js#L96).
- Diario requires a date **and no durable page structure**, including an empty `noteSections` array. Adding an outline can move a dated record into Pages. See [pageKinds.js:300](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/pageKinds.js#L300).

Persisting feedback and Apuntes on every page is defensible: it preserves information when a page crosses workspace boundaries. But each future Diario-specific feature should explicitly define whether that information remains visible and editable after such a transition.

**Recommendation:** Preserve stored shapes while giving each capability clear validation, mutation, and display-projection modules. Centralize cross-record checks behind transactional commands. Keep legacy profile adapters at migration/input boundaries rather than letting them define current concepts.

Treat “two content types” as a product simplification, not a prohibition on subordinate entities. Separate stores for captures or examples could become worthwhile if measured record size or independent editing demands justify them. This audit supplies no such measurement, so a storage rewrite is presently a higher-risk solution than the evidence warrants.

Guided lessons should retain their intentional boundary. When integration is proposed, decide explicitly which authored lesson material is reference data and which owner responses or progress are personal data; do not force everything into Page solely to preserve a slogan.

**Effort:** 3–5 days for focused code decomposition, overlapping the validation work above. **Risk:** moderate regression risk, minimal migration risk. A new storage decomposition would cost substantially more.

**6. Event-derived state is a good foundation, but “derive at render” needs qualification**

The event log is authoritative for learning state and activity; it is not a reconstruction log for notebook content. Generic edit events contain the item identity rather than the edited prose. A delete event therefore cannot restore deleted content. See [events.js:38](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/events.js#L38) and [items.js:261](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/items.js#L261).

The derivation code has real strengths. Item state uses a single pass rather than querying each word. Review replay is centralized, dates are injectable, and biography ladder replay uses the scheduler’s own implementation. See [events.js:203](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/events.js#L203) and [review.js:108](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/review.js#L108).

It is inaccurate to say every value is recomputed on every React render: many consumers use `useMemo`. The actual scaling issue is that every notebook reload reads all items and all events, rebuilds state, and supplies fresh arrays to consumers. Review then scans the log and sorts each item’s review history. See [useNotebook.js:15](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/useNotebook.js#L15) and [review.js:193](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/review.js#L193).

Repaso remains mounted after visiting it, even when hidden, so its memoized derivations can run on unrelated notebook changes. LexicalHub already has an `active` guard, demonstrating an available improvement. See [App.jsx:729](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/App.jsx#L729) and [LexicalHub.jsx:165](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/LexicalHub.jsx#L165).

**There is also a current correctness issue:** Repaso’s review, streak, and suggestion calculations depend on items/events but not an explicit current day. A mounted session crossing midnight without a notebook change can retain yesterday’s due queue or streak. Ordinary rerenders do not invalidate those memoized values. See [Repaso.jsx:206](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/Repaso.jsx#L206) and [suggestions:247](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/Repaso.jsx#L247). This is a high-confidence static finding.

**Recommendation:** First introduce an explicit local-day dependency refreshed on resume/day change. Then share notebook-level projections and avoid computing hidden surfaces unnecessarily. Permit disposable derived caches while keeping the log authoritative. “Never store authoritative counters” is valuable; “never cache a recomputable result” would be unnecessarily restrictive.

Personal search has another measurable candidate for future profiling: contained-vocabulary matching rebuilds an all-item map separately for each page, while text matching repeatedly projects Markdown and normalizes content. See [search.js:59](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/search.js#L59) and [search loop:193](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/search.js#L193). A query-scoped lookup map and item-revision text cache would preserve semantics.

**Effort:** half to one day for day invalidation; 2–4 days for synthetic performance measurements and targeted projection reuse. **Risk:** low for the day dependency, moderate for caching because invalidation becomes a responsibility. No present phone slowdown was measured, so persistent materialized views or event compaction are not justified yet.

**7. Spanish normalization is shared correctly; English tokenization is not**

The production pipeline re-exports the actual application normalizer. The spike’s copy is historical, not a competing production implementation. The ñ-preserving rule is correctly centralized. See [pipeline/lib/ids.mjs:9](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/pipeline/lib/ids.mjs#L9) and [normalize.js:15](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/normalize.js#L15).

A separate, concrete mismatch exists in English lookup. Packaging excludes stopwords including `the`, `of`, `in`, and `with`. Runtime English lookup retains those words and requires a posting for every token. Therefore a query such as “the house” necessarily fails through the English index because `the` was deliberately never indexed. See [07-package.mjs:178](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/pipeline/build/07-package.mjs#L178) and [ref/search.js:96](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/ref/search.js#L96).

**Recommendation:** Share the English tokenization policy between builder and reader, including deliberate handling of stopword-only queries. Preserve intersection of meaningful words and the existing exact-phrase ranking preference.

**Effort:** hours to one day. **Risk:** low; no personal migration. This is a better immediate search investment than replacing the search architecture.

**8. The shipped dictionary is reproducible as a deployment artifact, but upstream reconstruction is not locked**

Committed chunks make the existing dataset independently deployable. That is useful. Rebuilding the same dataset from upstream on a clean machine is a different guarantee.

The source registry uses mutable locations, including Kaikki’s current export, a GitHub `master` URL, and current Tatoeba exports. Full download provenance resides in ignored `pipeline/raw/_manifest.json`; the committed report truncates source hashes. See [sources.json:10](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/pipeline/sources.json#L10), [.gitignore:6](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/.gitignore#L6), and [08-report.mjs:50](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/pipeline/build/08-report.mjs#L50).

The downloader has two specific defects:

- Any nonempty destination is accepted as cached, while downloading writes directly into that destination. An interrupted partial file can be skipped on the next run.
- A previous SHA-256 is reused whenever byte size matches—even after a forced replacement. Equal size does not establish equal content.

See [01-download.mjs:38](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/pipeline/build/01-download.mjs#L38) and [hash reuse:52](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/pipeline/build/01-download.mjs#L52).

**Recommendation:** Commit a small source lock containing full hashes, expected sizes, source identity/date, and build revision. Separate “rebuild locked inputs” from “refresh upstream.” Download to temporary files, verify, then rename; verify cached files against the lock. Preserve access to the exact inputs outside Git where appropriate.

**Effort:** 1–2 days plus source archival arrangements. **Risk:** low for personal data; operational risk if historical inputs cannot be recovered. None of this establishes corruption in today’s shipped package.

**9. Complete the reference-refresh contract before changing upstream identity**

Runtime alias handling exists, but the producer still assigns `const previousIds = {}`. The checker requires compared datasets to have identical complete entry-ID sets. That safely supports the current additive rebuilds; it is not a general source-refresh workflow. See [07-package.mjs:259](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/pipeline/build/07-package.mjs#L259) and [check.mjs:68](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/pipeline/build/check.mjs#L68).

There is also an event-seam gap. Review enrollment and dictionary suggestions compare exact event keys with current attachment keys. Healing an attachment changes `dictKeys`, but historical views retain the old key. The suggestion rail uses raw `getEntries`, despite its comment describing resolution. See [review.js:199](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/review.js#L199), [DictAttachment.jsx:95](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/DictAttachment.jsx#L95), and [Repaso.jsx:257](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/Repaso.jsx#L257).

A future rename can therefore split lookup counts or make suggestions disappear. Review grades remain safe because they belong to personal IDs. This is a future-refresh defect, not an observed failure with the current empty alias map.

**Recommendation:** Produce an identity-difference report before refresh: retained, added, removed, and ambiguous entries. Approve mappings only where identity is defensible. Keep cumulative aliases flattened to current IDs because the runtime resolves one hop. Apply canonical resolution to event projections without rewriting historical events. See [entries.js:92](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/ref/entries.js#L92).

**Effort:** 2–4 days plus review of actual identity changes. **Risk:** moderate: a wrong alias is worse than an honest orphan. Complete this before the next upstream refresh, not as an unrelated urgent rewrite.

**10. Keep A/B installation and committed artifacts, with bounded improvements**

A/B installation is fundamentally sound for one installer: separate databases protect personal data; chunks are size/hash checked; rows and progress commit together; counts are checked before pointer publication. See [refdb.js:6](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/ref/refdb.js#L6) and [install.js:97](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/ref/install.js#L97).

Its guarantee assumes a single writer, however. Each install independently chooses the inactive slot, and install/repair/discard/remove have no shared cross-window operation guard. A second installer can continue writing a slot after the first makes it live. The old slot is also immediately cleared, potentially affecting an asynchronous reader holding its handle. See [install.js:74](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/ref/install.js#L74) and [publication/cleanup:155](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/ref/install.js#L155). These are inferred race risks, not reproduced incidents.

Manifest validation checks the format name but not a complete supported-format/capability contract; resume identity is only `datasetVersion`. See [install.js:32](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/ref/install.js#L32).

**Recommendation:** Serialize reference mutations across windows, validate supported manifest capabilities, and bind resume state to a manifest fingerprint. Retain the previous completed slot until reuse, or otherwise ensure readers have a coherent dataset lifetime.

**Effort:** 1–3 days. **Risk:** low to moderate; reference data remains replaceable.

Artifact placement is lower priority. Current chunks total **26,216,439 bytes—25.0 MiB—with 4,262,074 estimated gzip bytes**, rather than the older 22 MB description. There are 16 chunks. See [manifest.json:21](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/public/dict/manifest.json#L21). Tracked `pipeline/out/` contains eight files totaling approximately 115 KB; the spike contains 23 files totaling approximately 1.26 MB.

Keeping this package in Git lets deployment avoid raw downloads and the pipeline’s large heap requirement. The workflow simply builds the application and uploads `dist`. See [pipeline/README.md:23](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/pipeline/README.md#L23) and [deploy.yml:21](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/.github/workflows/deploy.yml#L21).

Keep the small reports and label the spike as frozen historical evidence. Its archived Jehle-derived conjugation tables should have explicit historical provenance so readers do not apply the current production bundle’s provenance statement to every repository artifact. See [spike producer:166](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/pipeline/spike/05-build-sample.mjs#L166).

Moving packages to immutable release artifacts becomes worthwhile when actual clone/review costs justify another delivery dependency. **Effort/risk:** hours and low risk for labeling; approximately 1–3 days and moderate delivery risk for a later artifact move. I would not prioritize that move now.

**Ranked recommendations**

Effort estimates include focused implementation and verification; they are judgment estimates, not measured project throughput.

| Rank | Recommended work | Main value | Rough effort | Change risk |
|---:|---|---|---|---|
| 1 | Fix mutual Source/Grammar reference authority | Prevent permitted saves from invalidating backups | 1–4 days | Low–moderate |
| 2 | Add rescue export, coherent snapshots, and a visible backup habit | Keep readable personal data recoverable | 2–4 days | Low–moderate |
| 3 | Make generic content/event writes atomic | Prevent partial saves and retry duplicates | 1–2 days | Low–moderate |
| 4 | Fix day invalidation and English stopword mismatch | Correct two bounded current behaviors | 1–2 days combined | Low |
| 5 | Consolidate migrations, validators, and page commands without changing records | Reduce the cost and inconsistency of future changes | 3–5 days | Moderate |
| 6 | Lock source inputs and repair downloader integrity | Make the next rebuild trustworthy | 1–2 days | Low personal-data risk |
| 7 | Finish alias generation and event-key projection before upstream refresh | Preserve reference continuity | 2–4 days plus review | Moderate |
| 8 | Enforce A/B single-writer and manifest contracts | Strengthen interruption/concurrency guarantees | 1–3 days | Low–moderate |
| 9 | Label historical artifacts; defer moving packages out of Git | Clarify provenance without adding delivery complexity | Hours | Low |

**What is well designed and should be preserved**

- **Independent personal identity and owner-owned meanings.** Dictionary replacement cannot redefine the owner’s lexical records.
- **Physical separation of personal and reference databases.** This is a strong structural safety boundary.
- **One stored ordinary connection with derived backlinks.** Preserve it while correcting the overly directional Source-reference rule.
- **Composable pages and preservation of dormant content.** Refactor responsibilities before undertaking a record migration.
- **Transactional deletion and dependent cleanup**, including hidden structures and pin preferences. See [items.js:302](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/items.js#L302).
- **Replayable learning history and shared scheduler logic.** Allow disposable caches while retaining events as authority.
- **Shared ñ-safe normalization, precomputed reference indexes, checksummed packages, and verification of actual shipped chunks.** See [verify-package.mjs:33](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/pipeline/build/verify-package.mjs#L33).
- **Compatibility with old backups, explicit restore confirmation, and secret exclusion.** Strengthen recovery around these protections rather than removing them.