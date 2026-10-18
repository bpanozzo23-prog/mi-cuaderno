# Current state

The app is deployed; reassessment Steps 1, 2 and 3 are complete and published.
This is the starting point for current status, not a release diary.

## Verified release

- **Published revision:** `33b5300`, 2026-10-17 (America/Chicago). Its [Actions run](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/39086772342)
  passed all **1,913 tests across 155 files** in 219.37 seconds, built and deployed successfully.
  This documentation-only follow-up leaves application behavior unchanged from `c82889f`.
  Seven live app files matched that earlier revision's local build; no new live-asset comparison
  was performed for `33b5300`. See [release history](history/RELEASES.md).
- **Delivered work:** [Step 2 documentation reset](reviews/2026-10-17/STEP-2.md) and
  [Step 3 contract reset](reviews/2026-10-17/STEP-3.md), on top of completed
  [Step 1 safety work](reviews/2026-10-17/STEP-1.md). Application behavior is unchanged from the
  Step 1 release. Detailed publication evidence lives in [release history](history/RELEASES.md).
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
- **Locally complete, not published:** [Step 5](reviews/2026-10-17/REASSESSMENT.md#12-suggested-order-of-work)'s
  bounded lint setup. `npm run lint` checks active JavaScript and React Hooks with zero warnings;
  CI runs it before the serial tests and build. Intentional lifecycle patterns retain explained
  exceptions; Cuaderno now updates merged results when dictionary alias metadata arrives.
  Clean `npm ci`, lint, all **1,914 tests across 155 files** (444.94 s, no unhandled errors), the
  production build and `git diff --check` pass. The existing build chunk-size warning remains.
  Focused tests pass 69/69; removing the alias dependency deliberately fails its new regression.
  Disposable Chromium fixtures at 375×812 verify alias-result replacement, retained Diario and
  conflict drafts, and the Diario unmount save. Four screenshots were inspected with no horizontal
  overflow, browser warnings or uncaught errors. No owner data was accessed; the preview server
  was stopped and the disposable profile removed. Implementation commits are `6492682` and `872cb8f`; CI/docs
  closeout completes the three-commit local task. Push and live CI verification await a request.
  Broader Step 5 work remains separate; Step 4's usage review remains withdrawn.
- **Separate, unapproved follow-ups:** other executable tooling changes and feature/code reorganization.
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
