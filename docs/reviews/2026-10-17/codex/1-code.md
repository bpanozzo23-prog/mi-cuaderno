# Codex review — code architecture and quality

> Independent read-only review by Codex (OpenAI Codex CLI), run on the XPS on 2026-10-17 against `main` at `35cda8e`, as one of four inputs to [the reassessment](../REASSESSMENT.md). The text below is the review verbatim, except that absolute file links were rewritten as repository-relative links and trailing whitespace was normalized. Its findings were spot-checked by Claude Code before use; see the reassessment for which were confirmed. It describes the code as it was at `35cda8e`.

**Mi Cuaderno’s core architecture remains sound, but its implementation practices need a maintenance pass.** The strongest foundations are the separation of personal and reference data, stable personal identities, explicit migration handling, and substantial behavioral tests. The most consequential weaknesses are inconsistent transaction boundaries, manually coordinated asynchronous state, and verification that depends on agents following instructions rather than an enforced deployment gate.

This was a read-only audit of HEAD `35cda8e`, with independent persistence and testing subreviews. I ran no tests, builds, servers, installations, or pipeline scripts, and accessed no personal backups or private-data directory. Execution results mentioned below are historical records, not fresh verification. Findings distinguish observed code properties from inferred failure scenarios.

The proposed work can largely preserve the current schema and product behavior. Guided lessons’ separate planning boundary is intentional and appropriate; eventual integration should enter through explicit application services and shared UI components.

**The directory counts overstate the number of production modules.** Static inventory found:

| Area | Production files | Test files | Production lines |
|---|---:|---:|---:|
| `src/components` | 95 | 67 | 26,876 |
| `src/lib` | 70 | 62 | 11,322 |
| `src/db` | 15 | 15 | 4,553 |

Thus, the stated 162 component files include 67 tests. This is nevertheless a substantial application, and the original “personal notebook is small” assumption now deserves measurement rather than automatic acceptance.

The main dependency directions are:

```text
App → screens → domain helpers
              → database services → Dexie
database services → domain helpers
some lib modules → reference/database services
```

A static scan of local production JavaScript imports found **no import cycles**. That is useful evidence of structural health, although it does not rule out complicated runtime coordination.

Thirty-eight of the 95 production component files import database modules. Most call named operations such as `updateItem`, `commitCollectionAdd`, or `saveGrammarExample`; they do not manipulate Dexie tables directly. Settings’ item/event counts are a visible exception at [Ajustes.jsx:225](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/Ajustes.jsx#L225). Calling application operations from a screen is reasonable at this scale.

The less clear boundary is `lib`: six modules there import database services, including `wordFamilies`, `practiceCards`, and `phraseContainment`. Consequently, `lib` means “supporting code,” not “pure domain logic.” This is manageable, but agents should not assume everything in it is side-effect-free. Existing dependency injection in [practiceCards.js:15](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/practiceCards.js#L15) provides a good pattern for separating fetching from derivation.

**1. Ordinary saves need the transaction guarantees already used by more complicated operations.**

This is the highest-value correctness finding.

`createItem` adds the item, then records its event separately. `updateItem` similarly updates content before logging its edit. Neither establishes its own transaction spanning both writes. Its meaning-reference check also runs before the separate update. See [items.js:210](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/items.js#L210) and [items.js:230](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/items.js#L230).

The concrete failure mechanism is:

1. The item write succeeds.
2. The event write fails.
3. The operation rejects even though content was saved.

For Diario creation, this can produce a duplicate on retry: `JournalEditor` records the newly created ID only after `createItem` resolves, and its catch reports an unsuccessful save. A partially successful creation therefore leaves the editor without that ID. See [JournalEditor.jsx:114](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/JournalEditor.jsx#L114).

**Confidence:** high in the source-level failure mechanism; no evidence that the owner has experienced it.

The project already contains the right solution. Dictionary-meaning import wraps its read/update/event work in a transaction, and deletion atomically cleans references and records its event. See [items.js:273](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/items.js#L273) and [items.js:303](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/items.js#L303).

Make generic creation and updating transactional, including validation that depends on current database state. Keep browser persistence requests outside the transaction. Review multi-step UI operations such as “create and then link” for the same partial-success problem; one such sequence appears at [CollectionPage.jsx:412](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/CollectionPage.jsx#L412).

Add failure-injection checks proving that an event failure leaves neither partial content nor a misleading retry state. The existing dependent-cleanup rollback test is an excellent model: [pageStructures.test.js:680](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/pageStructures.test.js#L680).

**Effort:** approximately 1–2 days including verification. **Change risk:** moderate because existing callers sometimes supply an enclosing transaction; no schema change is needed.

**2. Data loading needs explicit completion and failure semantics.**

`useNotebook.js` is only **33 lines**, so size is not its problem. It loads every item and event, derives state, and exposes a reload callback. There is no `liveQuery`; writes generally propagate an `onChanged` callback back to this hook. See [useNotebook.js:11](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/useNotebook.js#L11).

Two observed weaknesses matter:

- The asynchronous load has no rejection handler. An initial read failure leaves `loading: true`; App continues showing “Opening your cuaderno…” at [App.jsx:633](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/App.jsx#L633).
- `reload()` increments an epoch and returns immediately. Code such as `await onChanged()` therefore does not necessarily await refreshed UI data. For example, [Detail.jsx:420](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/Detail.jsx#L420) awaits a callback ultimately supplied by this mechanism.

The inconsistency extends to editing. `saveHead` closes its editor before awaiting persistence, with no local error recovery; example editing nearby catches errors and retains an error message. Compare [Detail.jsx:425](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/Detail.jsx#L425) with [Detail.jsx:450](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/Detail.jsx#L450).

Introduce a small, explicit contract:

- An invalidation operation means “schedule a refresh.”
- An awaitable refresh means “a new snapshot has been loaded.”
- Loading and saving expose error/retry states.
- Editors close after successful persistence and retain drafts on failure.

A consistent read transaction for the notebook snapshot would also make its consistency guarantee explicit. The same consideration applies to backup creation, which currently reads items, events, and preferences through independent calls at [backup.js:54](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/backup.js#L54). Concurrent snapshot inconsistency is a risk to investigate, not a reproduced defect.

Keep full reloads initially. The brief’s requirement that learning state derive from events does **not** require every screen to reread and recompute everything after every event. That is an implementation choice explicitly justified by notebook size in [useNotebook.js:5](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/useNotebook.js#L5).

**Effort:** 1–3 days for the shared contract and highest-risk callers. **Risk:** moderate because navigation and autosave rely on current timing.

**3. Dictionary changes lack a shared invalidation mechanism.**

There is a high-confidence stale-state path across Settings and the still-mounted browsing screens.

Installation/removal calls `DictionaryCard.onInstalled`, but Ajustes supplies a callback that updates only its own dictionary metadata. See [DictionaryCard.jsx:79](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/DictionaryCard.jsx#L79), [DictionaryCard.jsx:114](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/DictionaryCard.jsx#L114), and [Ajustes.jsx:237](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/Ajustes.jsx#L237).

Meanwhile:

- Cuaderno remains mounted when another tab is selected.
- Its installed metadata reloads only when `selectedId` changes.
- Its dictionary search reruns only when the query or eligibility changes.

See [App.jsx:639](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/App.jsx#L639), [Cuaderno.jsx:127](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/Cuaderno.jsx#L127), and [Cuaderno.jsx:296](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/Cuaderno.jsx#L296).

**Inferred user-visible consequence:** leave a search open, change the dictionary in Settings, then return without changing the query. Results and availability information can still describe the previous installation. This audit did not reproduce that interaction in a browser.

There is also a specific dependency omission: the `visible` memo reads `dictionary.previousIds` but does not include `dictionary` in its dependency list. Refreshing alias metadata alone therefore need not update merged results. See [Cuaderno.jsx:325](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/Cuaderno.jsx#L325).

Other reference-dependent caches use personal-item identity as their invalidation signal: [ConjugationGym.jsx:119](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/ConjugationGym.jsx#L119) and [contextConnections.js:328](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/contextConnections.js#L328).

Publish one reference-dataset revision from install/remove/repair operations. Metadata, searches, and derived reference caches should depend on it. Preserve intentional snapshots for practice sessions already in progress.

This is also the right opportunity to consolidate dictionary-search lifecycle code. A shared hook already implements debouncing, stale-response protection, and error handling at [DictionarySearch.jsx:14](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/DictionarySearch.jsx#L14), while Cuaderno, LinkPicker, and CollectionAddVocabularySheet retain separate implementations. The latter two lack comparable rejection handling at [LinkPicker.jsx:175](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/LinkPicker.jsx#L175) and [CollectionAddVocabularySheet.jsx:133](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/CollectionAddVocabularySheet.jsx#L133).

Share the request lifecycle while preserving each surface’s matching rules and search-miss policy.

**Effort:** 1–3 days. **Risk:** moderate, particularly around active sessions and alias resolution.

**4. Deployment should enforce the tests, and static checks should shoulder some review work.**

The only workflow installs dependencies and builds, then deploys. It does not run tests. See [deploy.yml:28](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/.github/workflows/deploy.yml#L28).

That leaves a substantial safety investment dependent on the agent remembering to run it on the correct revision. A push from the other machine, an omitted verification step, or an edit after the local run can publish behavior the suite would reject.

Put the existing complete serial `npm test` before the build/deploy step, and run verification on pull requests. This requires no architectural redesign.

**Effort:** half a day to one day, including a clean-checkout Actions run. **Risk:** low product risk; it may expose environment differences and adds several minutes to deployment.

There are also no lint, type-check, or formatter scripts in [package.json:6](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/package.json#L6). The most useful first addition is ESLint correctness and React Hooks checks. The missing Cuaderno memo dependency above is a concrete example of the category such checks can catch.

Do not mechanically add every suggested dependency: several effects intentionally express “once per item opening,” and changing their triggers could inflate events. Review each finding and document narrow exceptions.

**Effort:** 1–2 days for an initial useful lint gate. **Risk:** low if fixes are reviewed; higher if dependency changes are blindly automated.

**5. Current-write contracts should agree with export contracts.**

The backup boundary is stronger than the generic write boundary. `createItem` accepts its object without validating a current record; `updateItem` validates selected fields. Structural writers, by comparison, validate their resulting structures before writing. See [items.js:210](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/items.js#L210) and [pageStructures.js:71](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/pageStructures.js#L71).

One concrete mismatch: meaning normalization retains an example with an empty Spanish sentence and nonempty English translation, while backup validation rejects that example. See [meanings.js:59](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/meanings.js#L59) and [backup.js:100](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/backup.js#L100).

The current editor guards this case. This is therefore a **latent API-contract weakness**, not a demonstrated reachable UI bug. Its cost is future fragility: a new agent-written caller can save content that later prevents a valid export.

Introduce shared current-record validation and focused “accepted write can export” tests. Add JSDoc definitions and scoped `checkJs` for personal items, meanings, relationships, and service return values. This would catch mistakes without requiring a repository-wide TypeScript conversion.

Keep historical recovery validation distinct. Some old values are deliberately accepted so the export-first migration gate cannot trap an existing notebook; that reasoning is recorded at [DECISIONS.md:1435](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/DECISIONS.md#L1435).

**Effort:** 2–5 days for a useful first slice. **Risk:** moderate: accidentally tightening historical acceptance could damage recovery compatibility.

**6. Split the large files along ownership boundaries, starting where duplication already costs correctness.**

The largest files are not uniformly incoherent:

| File | Lines | Assessment and useful seam |
|---|---:|---|
| `Detail.jsx` | 1,335 | Heading, examples, media, relationships, placements, statistics, biography dispatch, and legacy page branches |
| `CollectionPage.jsx` | 1,286 | A composable page workspace whose name understates its responsibility |
| `GrammarSection.jsx` | 1,204 | Several local components plus editors, organization, references, and orchestration |
| `ConjugationGym.jsx` | 930 | Library loading, setup choices, multiple lanes, performance, sessions |
| `App.jsx` | 785 | Browser-history coordination, editor guards, study-session history, preferences, routing |
| `theme.jsx` | 329 | Tokens, UI primitives, and a layout-measurement hook |

These are static line counts, not complexity scores.

The most valuable extractions are:

- **Detail:** lexical heading editor, example management, media-link editing, and relationship presentation.
- **CollectionPage:** move its already distinct `ConnectionsSection`, `PageMediaSection`, and `VocabularySection` into focused modules. Their boundaries already exist at [CollectionPage.jsx:222](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/CollectionPage.jsx#L222), [CollectionPage.jsx:429](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/CollectionPage.jsx#L429), and [CollectionPage.jsx:587](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/CollectionPage.jsx#L587).
- **GrammarSection:** separate section/example editors and the organizer. The file contains multiple cohesive components; merely splitting at an arbitrary line count would accomplish little. See [GrammarSection.jsx:324](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/GrammarSection.jsx#L324).
- **App:** extract browser-navigation integration, preference loading, and study-session history handling. Keep the existing pure navigation functions. The dense history/session coordination at [App.jsx:172](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/App.jsx#L172) and [App.jsx:304](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/App.jsx#L304) deserves concentrated tests.

Related presentation helpers should stop living incidentally in another screen’s module. For example, many consumers import lexical heading rules from [ItemCard.jsx:17](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/ItemCard.jsx#L17).

There is also proven obsolete surface to remove:

- `StandardDetail` calculates page behavior even though its dispatcher sends pages elsewhere. See [Detail.jsx:160](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/Detail.jsx#L160).
- `GeneralPageDetail` has no callers.
- `effectivePageKind` and `PAGE_KINDS` are used only by their compatibility tests.
- The “temporary” compatibility module still describes an ongoing Phase 7 transition at [pageProfiles.js:1](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/pageProfiles.js#L1).

Retain the actual old-schema migration and import paths. They remain required recovery functionality.

**Effort:** 3–6 days for the first useful extractions, staged by feature. **Risk:** moderate for state ownership changes; low for confirmed-unused exports. Avoid a wholesale directory reshuffle.

**7. Normalization is mostly deliberate, but one exception violates the ñ invariant.**

Different comparisons legitimately need different rules. Search folds accents; duplicate detection deliberately preserves them so `si` and `sí` remain distinct. That difference is documented at [duplicateGuard.js:1](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/duplicateGuard.js#L1). Combining every comparison into one normalizer would introduce errors.

However, `withoutWrittenAccents` in the conjugation analyzer removes **all combining marks**, including the tilde in ñ. Pronominal command and gerund analysis uses it. See [conjugationPatterns.js:272](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/conjugationPatterns.js#L272) and [conjugationPatterns.js:299](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/conjugationPatterns.js#L299).

For example, after removing `se`, `bañándose` is transformed into `banando`, whereas the regular model retains the ñ. Exact regularity comparison then compares those different spellings at [conjugationPatterns.js:381](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/conjugationPatterns.js#L381).

**Confidence:** high in the transformation and mismatch; impact on shipped teaching output was not executed or measured. This does not establish a global-search defect or a change to stored personal text.

Replace blanket mark removal with the intended vowel-accent operation preserving ñ. Add a pronominal ñ fixture and check implications for generated conjugation-family data, since the pipeline imports this analyzer.

**Effort:** hours for the code change, up to a day including relevant verification. **Risk:** low-to-moderate because the analyzer is shared with the pipeline.

**8. The tests are generally valuable; improve their boundaries before optimizing their count.**

There are **146 source test files and 35,985 test lines**, plus two pipeline test files in the configured suite. The large files are real: App has 1,444 lines, backup 1,466, and Detail 1,108.

The suite is predominantly behavioral: static inventory found 1,818 `getByRole` calls, and no snapshots. Large backup tests are justified by independent recovery cases. Removing those cases to improve file-size statistics would reduce safety.

Some presentation assertions are brittle. For example, a grammar test locates `.rounded-xl` ancestors and compares two levels of `parentElement`: [GrammarSection.test.jsx:524](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/GrammarSection.test.jsx#L524). Such tests can reject harmless markup changes without proving actual phone geometry.

Split App tests by navigation/history, journal-save navigation, share arrival, and cross-feature routes. Split Detail tests by editing, relationships, media, and learning state. Keep a small explicit fixture/teardown utility; avoid hiding behavior inside a custom testing framework.

The serial setting is an evidence-backed workaround. Its comment records intermittent full-suite timeouts and preserves the existing timeout bound: [vitest.config.js:20](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/vitest.config.js#L20). A singleton Dexie connection does **not** prove that isolated Vitest workers share one database. The historical evidence supports CPU contention and unfinished asynchronous work within test environments, not that stronger claim.

The September reliability work should be preserved. It distinguishes pending from settled absence, controls promises, awaits actual completion, and records meaningful mutation checks: [TEST-RELIABILITY-REPORT.md:13](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/TEST-RELIABILITY-REPORT.md#L13). Three historical complete runs took roughly 430–445 seconds; these are documented measurements, not this audit’s results.

The fake-timer ban is reasonable for the existing Dexie integration tests. It need not become a universal prohibition on testing an extracted pure scheduler with an injected clock. That policy refinement is lower priority than keeping asynchronous completion explicit.

The largest missing testing layer is a **small production-browser lifecycle suite**. App tests import App directly, while startup and delayed loading live in [main.jsx:20](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/main.jsx#L20), and the test configuration excludes the PWA plugin. Add seeded tests for offline reload, startup upgrade gating, and update/relaunch around unsaved journal work.

**Effort:** 1–2 days for surgical test organization; 2–4 days for a small browser harness. **Risk:** low production risk, moderate maintenance risk if the browser suite becomes broad or timing-dependent. Keep serial acceptance while separately measuring any proposed bounded parallelism.

**9. Phone performance deserves measurement at the application boundary.**

The dictionary architecture is a strength. The current manifest describes **26,216,439 raw bytes and 4,262,074 gzipped bytes**, so “22 MB” is now historical shorthand. See [manifest.json:21](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/public/dict/manifest.json#L21).

Installation processes chunks individually, verifies size/hash, writes each transactionally, checks final store counts, then switches the active database. It does not parse the entire dictionary in one operation. Search reads indexed shards and selected entries. See [install.js:93](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/ref/install.js#L93) and [search.js:124](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/ref/search.js#L124). Workbox explicitly excludes dictionary files at [vite.config.js:15](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/vite.config.js#L15).

The more plausible performance costs are in the app itself:

- App statically imports its major screens; its delayed startup import is not route-level feature splitting.
- Multiple hubs mount together behind `hidden` wrappers.
- Notebook refresh replaces all item/event arrays, invalidating dependent derivations.
- Hidden screens can continue calculating. LexicalHub has an `active` guard, but App derives it from the remembered Cuaderno screen without checking the active primary tab. See [App.jsx:674](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/App.jsx#L674) and [LexicalHub.jsx:165](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/LexicalHub.jsx#L165).
- Hub title sizing reads width on every render and registers a resize listener per title: [theme.jsx:138](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/theme.jsx#L138).

These are observed mechanisms, **not measured phone slowdowns**.

For scale only, the existing unrebuilt `dist` contains approximately 1.24 MiB across its two JavaScript files. I did not establish that those artifacts match HEAD; this is not a certified current bundle measurement. Historical large-chunk warnings are independently recorded at [TEST-RELIABILITY-REPORT.md:67](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/TEST-RELIABILITY-REPORT.md#L67).

Measure startup through notebook-ready rendering, event-heavy reloads, and hub transitions on the phone. The existing startup metric labels `domInteractive` as interactivity, although the application subsequently imports App and loads IndexedDB; it does not measure notebook readiness. See [speedtest.js:39](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/speedtest.js#L39).

Then prioritize correct inactive-screen guards and lazy mounting. Consider feature code splitting only with offline availability verified. Preserve useful existing caches, such as the bounded Markdown projection cache at [noteMarkdown.js:123](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/noteMarkdown.js#L123).

**Effort:** 1–3 days for instrumentation and initial corrections. **Risk:** low for measurement, moderate for mounting/splitting because local drafts and offline routes must survive.

**10. Styling is coherent; shared interaction primitives need a little more authority.**

Tailwind for layout and token-based inline styles for color is a coherent approach. The palette lives centrally, and a scan found no hardcoded hexadecimal colors in production component JSX. The manually mirrored browser/manifest color is explicitly documented at [index.css:15](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/index.css#L15).

The weaker consistency is behavioral geometry. `IconButton` guarantees a 44px square, while the shared `Button` has padding but no guaranteed minimum touch height. Individual callers repeatedly supply `min-h-11`. Compare [theme.jsx:285](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/theme.jsx#L285) and [theme.jsx:310](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/theme.jsx#L310).

When these controls are next touched, centralize their touch-size, focus, disabled, and pending conventions. Separate tokens from components and the title-measurement hook when doing related work. A formatter can reduce mechanical variation, but should be introduced separately from logic changes to avoid obscuring review.

**Effort:** half a day to two days for a narrow pass. **Risk:** low-to-moderate visual/layout risk. This ranks below durability, state correctness, and verification enforcement.

**The top 10 code-level recommendations, ranked by expected value, are:**

1. **Make generic create/update operations atomic**, including dependent validation and events. Add partial-failure proofs. **1–2 days; moderate risk.**
2. **Require the complete existing test suite before deployment**, and on pull requests. **½–1 day; low product risk.**
3. **Define loading, failure, retry, and refresh-completion semantics**, then retain drafts until saves succeed. **1–3 days; moderate risk.**
4. **Publish one dictionary revision and consolidate query lifecycle handling**, fixing stale results and reference-cache invalidation. **1–3 days; moderate risk.**
5. **Add ESLint correctness and Hooks checks**, reviewing intentional effect dependencies individually. **1–2 days; low risk with reviewed fixes.**
6. **Align current writes with exportable record contracts**, supported by scoped JSDoc/`checkJs`; preserve historical acceptance. **2–5 days; moderate compatibility risk.**
7. **Extract cohesive editors/services from Detail, CollectionPage, GrammarSection, and App**, removing proven-unused compatibility branches along the way. **3–6 days initially; moderate risk.**
8. **Fix ñ loss in pronominal conjugation analysis**, with a focused fixture and pipeline-impact check. **Hours to one day; low-to-moderate risk.**
9. **Add a small real-browser startup/offline/update suite**, while splitting oversized integration tests by responsibility and preserving serial acceptance. **2–4 days for the browser foundation; moderate maintenance risk.**
10. **Measure actual notebook readiness and hidden-screen work**, then correct inactive guards and selectively reduce initial mounting/loading. **1–3 days initially; moderate behavioral risk.**

**Things that are well done and should be preserved:**

- Separate personal and replaceable reference databases, with verified A/B dictionary installation.
- Stable personal and meaning identities independent of dictionary ordering.
- Shared nested-reference cleanup and transactional deletion.
- Sequential migration, export-first protection, and validation-before-restore.
- Pure domain derivations and shared Notes mutation/card-engine components.
- Semantic component tests, real Dexie integration, controlled-promise tests, and deliberate failure proofs.
- Centralized color tokens, local fonts, and explicit phone-layout attention.