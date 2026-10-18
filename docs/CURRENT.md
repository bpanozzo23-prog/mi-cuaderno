# Current state

The app is deployed; reassessment Steps 1–3 and Step 5’s bounded lint and awaitable-refresh tasks
are published.
This is the starting point for current status, not a release diary.

## Verified release

- **Published revision:** `4b7d47d`, 2026-10-18 (America/Chicago). Its [Actions run](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/39099125670)
  passed lint, all **1,932 tests across 157 files** in 169.29 seconds, the production build and
  deployment. Seven live app files returned HTTP 200 and matched the verified local build byte
  for byte. Detailed publication evidence lives in [release history](history/RELEASES.md).
- **Delivered work:** the bounded Step 5 lint setup and awaitable notebook refresh, on top of completed
  [Step 1 safety work](reviews/2026-10-17/STEP-1.md), [Step 2 documentation reset](reviews/2026-10-17/STEP-2.md)
  and [Step 3 contract reset](reviews/2026-10-17/STEP-3.md). JavaScript/React Hooks lint runs locally
  and in CI. Refresh now reports committed completion without misclassifying saved writes;
  delayed Taller completion preserves the owner’s chosen tab.
- **Personal schema:** **v12**, defined in [src/version.js](../src/version.js).
  Backups v1–v12 upgrade sequentially and validate before restore; newer versions are blocked.
  Legacy database upgrades require an untouched validated export before Dexie opens.
- **Dictionary:** see the [shipped manifest](../public/dict/manifest.json) for the dataset revision,
  counts and raw/gzip package bytes, and [data sources](../DATA_SOURCES.md) for attribution.

## Work and boundaries

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
- **Planning only:** [guided lessons](guided-lessons/README.md), including the 1917 drafts.
  The player and integration are not implemented or approved by this documentation work.
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
- **Complete locally; not pushed:** bounded documentation-only CI filtering (`abad2e4`). The
  [workflow](../.github/workflows/deploy.yml) skips pushes whose changed paths all match its
  explicit documentation exclusions; mixed pushes retain every check and deployment, and manual
  dispatch remains available. Local verification on 2026-10-18 passed YAML parsing/unchanged-job
  checks, 29 changed-path cases, zero-warning lint, all **1,932 tests across 157 files** serially
  in 410.57 seconds (no unhandled errors), the production build and diff checks. The existing
  build chunk-size warning remains. Application, schema, dependencies and Node configuration
  are unchanged. After a separately requested push, verify that the workflow change triggers
  deployment and that its documentation-only publication-record follow-up skips it. Native
  GitHub diff generation and trigger behavior are not established by the local path checks.
- **Owner direction:** [reassessment §15](reviews/2026-10-17/REASSESSMENT.md#15-owner-response-2026-10-17)
  takes precedence on experimental feature growth and the ideas file. The usage review is
  withdrawn. Friction is an input to ideas, not a condition for building features.

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
