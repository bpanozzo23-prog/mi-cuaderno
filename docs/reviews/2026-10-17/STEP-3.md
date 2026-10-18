# Step 3 — contract reset

**Status: drafts prepared; owner decisions pending.** The owner asked to move to the next task
after Step 2. This is [reassessment Step 3](REASSESSMENT.md#12-suggested-order-of-work), whose
policy choices explicitly depend on the owner. Section 15 remains controlling; the withdrawn
usage review has not returned as a requirement.

## Reviewable result

- [PRODUCT](../../PRODUCT.md) describes the owner-facing purpose, behavior and safeguards in
  plain language, including experimental feature growth.
- [ARCHITECTURE](../../ARCHITECTURE.md) describes actual storage, identity, saves, backup,
  reference installation, search, navigation, learning and AI behavior.
- Brief v3 remains unchanged and authoritative pending acceptance of its replacements.
  Historical decision entries remain intact. Nothing in these drafts approves app changes.

## Small commits

1. Add the two explicitly marked drafts, this carry-forward record and navigation/status links.
   Verify claims against source and check links; leave the old contract in force.
2. Incorporate the owner's decisions, then activate the new contract and update the guide's
   authority/read-order pointers. Freeze brief v3 unchanged as historical reference at its
   existing path. Record the policy choices once in the decision log.

The second commit depends on answers below. No automatic acceptance is inferred from time or
from permission to draft the documents.

## Owner decisions

| Question | Proposed resolution for review | Current rule while unanswered |
|---|---|---|
| Two content types | Two kinds of notebook content; supporting records allowed after their own design and safety review | Lexical/page items plus existing events/preferences; no new store approved |
| Diario membership | Document the structural rule; keep possible redesign open | Dated page, no enabled structured capability, empty Notes outline |
| Optional additive fields | Consider an exception only after a specific compatibility review and approval | Existing personal-schema version/export/validation requirements and installed gate remain |
| Plan approval | Approve a bounded task once; routine fixes within it may proceed | Guide's existing plan-first rule and visual-only exception remain |
| Code license | Keep a separate owner decision | No license selected by this reset |

Local feature-open events remain a low-priority possibility; none are approved here. The
keep/hide/retire review was withdrawn by the owner and is not a gate for lessons or other growth.
The five questions above were sent to the owner during this task; answers are not yet recorded.

## Where the old contract's content goes

| Subject from brief v3 | Continuing home |
|---|---|
| Purpose, phone-first use, owner control, language orientation | PRODUCT: Purpose, Reference and discovery |
| Experimental growth and open ideas | PRODUCT: Purpose and Boundaries; complete active context remains in IMPROVEMENT-IDEAS |
| Notebook content, Diario and explicit saving | PRODUCT: What the owner keeps; ARCHITECTURE: Content identity and pages |
| Personal/reference separation, stable identity and dictionary aliases | ARCHITECTURE: Runtime, Content identity, Connections, Reference installation |
| Single stored edges, nested authority, meaning anchors and cleanup | ARCHITECTURE: Connections and references; linked operations retain exact validation details |
| Event-derived review and separate practice modes | PRODUCT: Learning and writing; ARCHITECTURE: Activity, review and practice |
| Search, ñ preservation and active page content | PRODUCT: Reference and discovery; ARCHITECTURE: Reference installation and search |
| Explicit AI, key safety, saved feedback and future assistant | PRODUCT: Optional AI; ARCHITECTURE: Navigation and optional AI |
| Atomic saves, export/upgrade/restore, rescue and persistence | PRODUCT: Data safety; ARCHITECTURE: Writes and Backup |
| Approval, commits, verification, pushes and machine recipes | Existing shared guide and docs/agents recipes; approval wording pending owner |
| Current releases, schemas, dataset figures and outstanding checks | CURRENT and its manifest/release links |
| Phase acceptance lists, old measurements, amendments and deferred history | Unchanged brief v3, DECISIONS and archived phase records |
| Guided lessons, future stores, attachments, sync and tooling | Separate proposals; no implementation authorization from this reset |

## Corrections grounded in current code

The complete brief and relevant decisions were reviewed alongside the implementation. Two
independent read-only reviews checked architecture and contract carry-forward; neither changed
files, ran competing tests or accessed private notebook data.

- Events govern recorded activity and derived learning state, not all application state.
  Existing memory caches do not contradict that guarantee.
- Supporting events/preferences exist today; no lesson or Attachment store exists. A future
  store would need explicit backup/restore coverage.
- Diario is structurally derived. `pageProfile` and scalar `dictKey` are legacy vocabulary.
- Taller is deployed despite being absent from brief v3. Its event behavior is distinct from
  scheduled review, Gym and the general streak.
- Only Diario AI feedback is implemented. The API key stays out of backups but is sent to the
  provider for authentication; “never leaves the device” would be incorrect.
- Step 1's atomic writes, consistent exports, rescue path and retryable notebook reads are
  current behavior. `reload()` is still not awaitable.
- Optional item fields are not automatically migration-free. Existing no-transform upgrades
  still used a version bump/export gate; validators have version-specific rules without a
  global unknown-property ban.

## Verification and remaining work

Completed for the draft increment: all 105 Markdown files have valid local targets/fragments;
`git diff --check` passes; brief v3 is byte-identical to the deployed baseline; historical
decision bodies and Step 2 archive preservation checks pass. Both read-only reviewers checked
the drafts; corrections include link timestamps, unsaved-feedback behavior, deletion
confirmation, provider-side spending limits, attribution and the broader secrets rule.
No runtime files or executable tooling changed in this increment, so no application test suite
or browser walkthrough was rerun. Existing release evidence and unresolved owner-device checks
stay in CURRENT.

Before activation, incorporate the owner's answers, recheck the final authority/read-order
links, and review the guide's tripwires for conflicts with the accepted contract. Confirm each
durable safeguard is stated in an active document, not merely linked through code or historical
records. Keep changes
to workflow policy explicit: bounded approval and additive-field exceptions are proposals, not
already adopted rules. Linting, Node pinning, awaitable reload, lesson restructuring, migrations
and any other executable tooling or application work remain separate.
