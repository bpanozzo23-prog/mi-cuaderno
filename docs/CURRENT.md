# Current state

The app is deployed; Step 1 safety work is complete. Steps 2 and 3 are complete locally;
documentation work is unpushed. This is the starting point for current status, not a release diary.

## Verified release

- **Published revision:** `b48a948`, 2026-10-17. Its [Actions run](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/39080236039)
  passed tests, build and deployment. The owner reported the final **1,913 tests across 155 files**
  and live-asset verification; the workflow result was independently checked during Step 2 planning.
- **Delivered work:** all four [Step 1 items](reviews/2026-10-17/STEP-1.md) are complete:
  deployment test gate, backup safety, all-or-nothing saves and five small fixes.
  The item-4 application release was `6d92bab`; `b48a948` records that deployment without
  changing application code. Detailed checks remain in the work order and [release history](history/RELEASES.md).
- **Personal schema:** **v12**, defined in [src/version.js](../src/version.js).
  Backups v1–v12 upgrade sequentially and validate before restore; newer versions are blocked.
  Legacy database upgrades require an untouched validated export before Dexie opens.
- **Dictionary:** see the [shipped manifest](../public/dict/manifest.json) for the dataset revision,
  counts and raw/gzip package bytes, and [data sources](../DATA_SOURCES.md) for attribution.

## Work and boundaries

- **Complete locally, unpushed:** [Step 2 documentation reset](reviews/2026-10-17/STEP-2.md).
  Current status is consolidated, historical records preserved, active idea context kept together,
  and machine/browser recipes separated. Documentation and preservation checks pass.
  No application, schema, CI or tooling behavior changes; no push requested.
- **Complete locally, unpushed:** [Step 3 contract reset](reviews/2026-10-17/STEP-3.md).
  [PRODUCT](PRODUCT.md) and [ARCHITECTURE](ARCHITECTURE.md) are the accepted contract; brief v3
  is frozen unchanged as history. The owner approved supporting records, retaining structural
  Diario membership, case-specific review before any optional-field exception, approval once
  per bounded task, and deferring code licensing. The guide and current entry points agree.
  No application, schema, CI or executable tooling changes; no optional-field exception granted.
- **Planning only:** [guided lessons](guided-lessons/README.md), including the 1917 drafts.
  The player and integration are not implemented or approved by this documentation work.
- **Separate, unapproved follow-ups:** executable tooling changes and feature/code reorganization.
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
