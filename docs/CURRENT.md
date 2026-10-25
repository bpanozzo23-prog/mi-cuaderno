# Current state

The app is deployed; reassessment Steps 1–3, bounded lint/refresh work, documentation-only CI
filtering, shared Node selection, guarded Journal/Back/Forward navigation ordering, Ask + Keep
(Pregunta), Ask about this and Keep adds to existing entries are published.
This is the starting point for current status, not a release diary.

## Verified release

- **Published revision:** `a8cbe36`, 2026-10-24 (America/Chicago). Its [Actions run](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/40147692428)
  passed lint, all **2,240 tests across 173 files** in 247.59 seconds, the production build and
  deployment. Seven live app files returned HTTP 200 and matched the verified local build byte
  for byte. Detailed publication evidence lives in [release history](history/RELEASES.md).
- **Delivered work:** Keep adds to existing entries (additions to attached entries, reviewed per addition), Ask about this (entry, page and Repaso attachments for Pregunta), Ask + Keep (Pregunta tab and Keep proposals), guarded Back/Forward and Journal tab navigation ordering, shared Node selection, documentation-only CI
  filtering, the bounded Step 5 lint setup and awaitable notebook refresh, on top of completed
  [Step 1 safety work](reviews/2026-10-17/STEP-1.md), [Step 2 documentation reset](reviews/2026-10-17/STEP-2.md)
  and [Step 3 contract reset](reviews/2026-10-17/STEP-3.md). JavaScript/React Hooks lint runs locally
  and in CI. Refresh now reports committed completion without misclassifying saved writes;
  delayed Journal tab requests and Taller completion preserve the owner’s newer navigation.
- **Personal schema:** **v12**, defined in [src/version.js](../src/version.js).
  Backups v1–v12 upgrade sequentially and validate before restore; newer versions are blocked.
  Legacy database upgrades require an untouched validated export before Dexie opens.
- **Dictionary:** see the [shipped manifest](../public/dict/manifest.json) for the dataset revision,
  counts and raw/gzip package bytes, and [data sources](../DATA_SOURCES.md) for attribution.

## Work and boundaries

- **Complete and published (`a8cbe36`, 2026-10-24):** "Keep adds to existing entries" —
  step 2 of Ask about this (approved 2026-10-24). Keep may propose additions to attached words and
  phrases (examples on a meaning or in My examples, new meanings, a note paragraph, tags) and
  connections between two existing entries when one is attached, each ticked separately and
  saved with one Apply. Append-only; no AI marker on additions (owner's choice); a content
  fingerprint frozen with the snapshot refuses additions to an entry changed since. No schema
  change. Zero-warning lint, **2,240 tests across 173 files** serially in 467.52s and the
  production build pass. Chromium at 375×812 with fixtures and locally fulfilled requests
  verified the flow. Codex reviewed the design and the diff; all findings are fixed. See the
  [decision record](../DECISIONS.md#keep-adds-to-existing-entries--ask-about-this-step-2-2026-10-24).
  **Pending owner checks:** real use on the phone, and whether the kinds and amount of additions
  are right.
- **Complete and published (`3f13cf1`, 2026-10-24):** "Ask about this" — the follow-on to Ask + Keep
  (approved 2026-10-24). "Ask Claude" on a word, phrase or page, or on a revealed Repaso card
  ("Ask later" keeps the session; "Ask now" ends it), attaches that entry to the next Pregunta
  question as an allowlisted, scrubbed text snapshot (up to five), with a preview, starter
  questions and a history-aware disclosure; Keep lists attached entries first. No schema change.
  Zero-warning lint, **2,195 tests across 171 files** serially in 462.46s and the production build
  pass; Chromium at 375×812 verified the flows. Codex reviewed the plan and the diff; all findings
  are fixed. See the [decision record](../DECISIONS.md#ask-about-this--attaching-entries-to-pregunta-2026-10-24).
  **Pending owner checks:** starter usefulness, answer quality with attachments, Repaso flow feel.
- **Complete and published (`29101fe`, 2026-10-24):** [Ask + Keep](IMPROVEMENT-IDEAS.md#ai-ask-and-tidy-with-a-shared-review),
  the first slice of AI Ask and Tidy (approved 2026-10-24). A Pregunta tab, shown while AI is on,
  holds a transient conversation with Claude (`claude-opus-5-5`); Keep turns it, or a pasted
  conversation, into reviewed proposals (new words/phrases, tags, connections) saved only on
  Apply, tagged `ia`. No schema change. Zero-warning lint, **2,141 tests across 169 files**
  serially in 476.23s and the production build pass; Chromium at 375×812 with fixtures and
  locally fulfilled requests verified the flow. Codex reviewed the plan and the diff; all
  findings are fixed. See the [decision record](../DECISIONS.md#ask--keep--ai-ask-and-tidy-first-slice-2026-10-24).
  **Pending owner checks:** first real request from the phone (fallback beta from a browser),
  latency, tab order and answer quality.
- **Complete and published:** [Step 2 documentation reset](reviews/2026-10-17/STEP-2.md).
  Current status is consolidated, historical records preserved, active idea context kept together,
  and machine/browser recipes separated. Documentation and preservation checks pass.
  No application, schema, CI or tooling behavior changes.
- **Complete and published:** [Step 3 contract reset](reviews/2026-10-17/STEP-3.md).
  [PRODUCT](PRODUCT.md) and [ARCHITECTURE](ARCHITECTURE.md) are the accepted contract; brief v3
  is frozen unchanged as history. The owner approved supporting records, retaining structural
  Diario membership, case-specific review before any optional-field exception, approval once
  per bounded task, and deferring code licensing. The guide and current entry points agree.
  No application, schema, CI or executable tooling changes; no optional-field exception granted.
- **Complete locally; not pushed:** the [guided-lessons A1 preview](guided-lessons/chapters/1917/REVIEW.md#implementation-closeout).
  All ten pages and both optional branches run in an isolated development reader with English
  help, glosses, source notes and temporary choices. Reflection is a prompt/model without typing.
  Zero-warning lint, **1,994 tests across 160 files** serially in 415.79s, production
  build and isolation checks pass. Chromium at 375×812 verified reading, keyboard navigation,
  branch return, reload reset and the ordinary app with synthetic fixtures; no owner data was
  accessed. Claude's grounded findings were fixed. Run `npm run dev:lessons`; see the
  [preview instructions](guided-lessons/README.md#try-the-a1-preview).
  [First owner feedback](guided-lessons/chapters/1917/REVIEW.md#first-owner-feedback-visual-interest)
  requests more visual interest. The owner selected the map-led option 2 and approved
  [the bounded visual pass](guided-lessons/chapters/1917/REVIEW.md#selected-direction-and-bounded-visual-pass)
  with “Proceed.” **The visual pass is implemented and verified locally**, including the
  sourced modern locator and reader styling. The 2026-10-19 retry resolved the tool blockers;
  zero-warning lint, **2,002 tests across 160 files** serially in 429.96s, production build and
  isolation checks pass. All 45 production files match a fresh build of unchanged `a06ee3d`
  byte for byte. Chromium at 375×812 and 1100×900 verified the map, source/help styling, keyboard
  focus, both branches, conclusion and reload reset. Actual inspection caught and fixed a
  clipped city label; Claude's review/follow-up confirms the grounded findings are resolved.
  See the [visual closeout](guided-lessons/chapters/1917/REVIEW.md#visual-pass-retry-and-closeout)
  and [design QA](../design-qa.md). The disposable browser profiles were removed and preview
  stopped. These commits were pushed with the Ask + Keep publication (`29101fe`, 2026-10-24).
  Owner visual/narrative/language/phone acceptance remains pending.
  On 2026-10-20 the owner accepted the [combined language-support direction](guided-lessons/SCOPE.md#agreed-language-support-direction--2026-10-20):
  brief English orientation, manageable Spanish, explicit focus expressions and nearby English
  help. The owner then approved the layouts task; the [Figma comparison](https://www.figma.com/design/qYUUCkgMUmEgumNEhO5549?node-id=2-64)
  now contains two editable 375px treatments, each with English hidden and revealed.
  Content/bounds checks and visual inspection pass. The owner selected **B — short sections**;
  the [bounded opening-page implementation plan](guided-lessons/SCOPE.md#selected-b-layout--opening-page-implementation)
  is complete locally, including the requested map readability refinement. The opening now
  has English orientation, three reading cards, two focus expressions and independent passage/
  page translation controls. Claude's grounded review findings are resolved. Zero-warning lint,
  **2,021 tests across 160 files** serially in 457.02s and the production build pass; a subsequent
  test-assertion improvement passed all **61 focused checks**, lint and build. All 45 production
  files match the fresh pre-task build byte for byte. Chromium verified 375×812, 1100×900,
  enlarged text, keyboard controls, both branch returns and reload reset. See the
  [B closeout](guided-lessons/chapters/1917/REVIEW.md#opening-page-b-implementation-and-closeout)
  and [design QA](../design-qa.md). Temporary preview/browser resources were cleaned up.
  Owner visual/language acceptance remains pending; the formal reading session is deferred.
  Saved writing, notebook integration, schema changes and a production lesson release remain
  outside A1. The preview stays a separate development entry (`npm run dev:lessons`) outside the production build.
- **Complete and published:** [Step 5](reviews/2026-10-17/REASSESSMENT.md#12-suggested-order-of-work)'s
  bounded lint setup (`6492682`, `872cb8f`, `2dfe9c2`). `npm run lint` checks active JavaScript and
  React Hooks with zero warnings; CI runs it before the serial tests and build. Intentional
  lifecycle patterns retain explained exceptions. Local tests, the deliberate regression check,
  375×812 browser fixtures and publication evidence are recorded in [release history](history/RELEASES.md).
  Broader Step 5 work remains separate; Step 4's usage review remains withdrawn.
- **Complete and published:** the bounded awaitable-refresh follow-up (`0d14853`, `a28976a`),
  published through `4b7d47d`. `reload()` reports loaded/failed/cancelled after accepted completion,
  preserves the last committed snapshot and settles superseded/unmounted callers. Journal/Taller
  and link-saving flows distinguish committed writes from refresh failure; post-refresh navigation
  uses current items, and delayed Taller completion respects the owner's chosen visit. Storage,
  personal schema, backup compatibility and event policy are unchanged. Local/CI results,
  deliberate regressions, 375×812 browser fixtures and live-file comparisons are recorded in
  [release history](history/RELEASES.md#2026-10-18--awaitable-notebook-refresh).
- **Separate, unapproved follow-ups:** other executable tooling changes and feature/code reorganization.
- **Complete and published:** bounded documentation-only CI filtering (`abad2e4`), through `ac527a0`. The
  [workflow](../.github/workflows/deploy.yml) skips pushes whose changed paths all match its
  explicit documentation exclusions; mixed pushes retain every check and deployment, and manual
  dispatch remains available. Local verification on 2026-10-18 passed YAML parsing/unchanged-job
  checks, 29 changed-path cases, zero-warning lint, all **1,932 tests across 157 files** serially
  in 410.57 seconds (no unhandled errors), the production build and diff checks. The mixed
  workflow/documentation push triggered CI and deployed successfully; publication evidence and
  remaining warnings are in [release history](history/RELEASES.md#2026-10-18--documentation-only-ci-filtering).
  Application, schema, dependencies and Node configuration are unchanged. GitHub's native
  large-diff limitations still apply; publication-record-only pushes normally skip deployment.
- **Owner direction:** [reassessment §15](reviews/2026-10-17/REASSESSMENT.md#15-owner-response-2026-10-17)
  takes precedence on experimental feature growth and the ideas file. The usage review is
  withdrawn. Friction is an input to ideas, not a condition for building features.
- **Complete and published:** shared Node version selection (`3af203c`). CI reads Node's
  major from [.nvmrc](../.nvmrc); package and lockfile metadata declare the supported range.
  [Linux](agents/XPS.md#node-setup) and [Windows](agents/WINDOWS.md#node-setup) guidance explains
  setup and version checks. Verification on 2026-10-18 with Node 24.19.0 / npm 11.17.0 passed
  `npm ci`, zero-warning lint, all **1,932 tests across 157 files** serially in 394.83 seconds
  (no unhandled errors), the production build and diff checks. Metadata/range checks confirmed
  unchanged dependency records and workflow behavior apart from the version-file input; config
  changes still trigger CI. The existing build chunk-size warning and npm audit findings
  (2 moderate, 5 high) remain. Application, dictionary, schema and machine installations are
  unchanged. CI resolved `.nvmrc` to Node 24.21.0 / npm 11.19.0 in the verified deployment;
  Windows commands were not executed on the owner's laptop. Publication evidence is in
  [release history](history/RELEASES.md#2026-10-18--shared-node-selection-and-journal-navigation-ordering).
- **Complete and published:** Journal tab navigation ordering (`2c18404`). A delayed
  save/refresh can no longer let an older tab choice overwrite a newer choice or a different
  active visit. Back/Forward and App unmount cancel pending choices; saving a new entry within
  its current visit still permits the intended navigation. Save policy, refresh waiting,
  stored data and schema v12 are unchanged. Verification on 2026-10-18 passed zero-warning lint,
  all **1,942 tests across 157 files** serially in 405.69 seconds (no unhandled errors), the
  production build and diff checks. Ten added integration cases cover competing requests and
  saves, read success/failure, refused reselection, materialization, Back/Forward, unmount and
  another in-app visit. Seven cases failed against the original implementation; independently
  removing the visit check failed the different-visit case. A focused read-only Claude CLI
  review found no actionable defects introduced by the fix; its refused-request coverage
  suggestion was added and passed. Fresh Chromium fixtures at 375×812 verified delayed success,
  delayed failure/retry and Back/Forward, with one saved entry, inspected screenshots, no
  horizontal overflow and no browser warnings or uncaught errors. The fixture profile was
  removed and preview stopped. CI/deployment and seven live-file comparisons passed, recorded in
  [release history](history/RELEASES.md#2026-10-18--shared-node-selection-and-journal-navigation-ordering).
  The existing build chunk-size warning and physical Android Back check remain;
  refresh-latency changes remain a separate, unapproved follow-up.
- **Complete and published:** guarded Back/Forward ordering (`90bd038`), through `740311a`. Obsolete
  save-waiting handlers can no longer overwrite a newer destination or perform stale refusal
  recovery. Refused navigation restores the editor's browser position, and tab/route/visible-Back
  actions wait for an already-requested recovery. New Journal saves retain their originating
  visit's identity without rewriting the popped target. A separate browser-history position
  handles recovery beyond the capped navigation depth; personal schema v12, backups, dependency
  resolutions and save/refresh policy are unchanged.
  Verification on 2026-10-18 passed zero-warning lint, **39 focused checks**, all **1,960 tests
  across 158 files** serially in 412.48 seconds (no unhandled errors), production build and diff
  checks. Eighteen new integration cases cover superseding Back/Forward/tabs, read/write failure,
  competing saves, refused navigation, queued recovery, unmount, saved-entry identity, study
  markers and the depth cap. All 16 initial regressions failed against the original App; an
  independent depth-cap check failed when recovery again used capped depth. Focused Claude CLI
  review identified the cap issue; the corrected implementation passed follow-up review with
  no grounded actionable defects. Fresh Chromium fixtures at 375×812 verified saved-entry
  Forward, a newer Repaso choice through old refresh failure/retry, and refused navigation
  recovery followed by valid-date exit, retaining one saved entry. Four screenshots were
  inspected with no horizontal overflow, browser warnings or uncaught errors. The profile was
  removed and preview stopped; no owner data was accessed. The existing build chunk-size warning
  remains. CI/deployment and seven live-file comparisons passed, recorded in
  [release history](history/RELEASES.md#2026-10-18--guarded-backforward-navigation).
  Physical Android Back remains pending.

## Unresolved verification

These are gaps in recorded evidence, not claims that the features are broken. Later Step 1
fixtures do not close checks of different features. Preserve each until matching evidence exists.

| Check | Evidence to consult |
|---|---|
| Phase 4t–4x Connections browser closeout | [Phase 4 report](history/phases/PHASE-4-REPORT.md) |
| Phase 4y Add to Collection phone/browser closeout | [Phase 4 report](history/phases/PHASE-4-REPORT.md) |
| Phase 7 composable-pages phone/browser closeout | [Phase 7 report](history/phases/PHASE-7-REPORT.md) |
| Installed Android PWA: formal share-sheet/multi-output walkthrough not recorded, although actual TikTok use informed the design | [Share target](../DECISIONS.md#android-share-target-2026-08-13) and [continuation](../DECISIONS.md#continue-with-this-video-flow-2026-08-13) |
| Physical Android hardware Back in the installed PWA | [Navigation continuity](../DECISIONS.md#browser-backed-navigation-continuity-2026-08-18) |
| Plural dictionary attachments: owner's phone check | [2026-09-10 decision](../DECISIONS.md#plural-dictionary-attachments-2026-09-10) |

The later owner confirmation for same-heading dictionary meanings is recorded; that phone check
is complete. See the [documentation index](README.md) for current guidance, proposals and history.
