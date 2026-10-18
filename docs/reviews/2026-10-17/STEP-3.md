# Step 3 — contract reset

**Status: complete locally, unpushed.** After reviewing the draft recommendations, the owner
said “Go with your recommendations,” approving all five choices below and activation of the
replacement contract. This completes [reassessment Step 3](REASSESSMENT.md#12-suggested-order-of-work).
Section 15 remains controlling; the usage review remains withdrawn.

## Reviewable result

- [PRODUCT](../../PRODUCT.md) describes the owner-facing purpose, behavior and safeguards in
  plain language, including experimental feature growth.
- [ARCHITECTURE](../../ARCHITECTURE.md) describes actual storage, identity, saves, backup,
  reference installation, search, navigation, learning and AI behavior.
- PRODUCT and ARCHITECTURE are now authoritative. Brief v3 remains byte-identical at its
  original path as frozen history. Historical decisions remain intact; the new acceptance entry
  records the changed policy. No application changes are authorized by this reset.

## Small commits

1. `2d91b8b` added the two marked drafts, this carry-forward record and status/index links.
   Implementation reviews and preservation checks passed while the old contract remained active.
2. Activation incorporates the owner's answers, changes the guide's authority and approval
   rules, updates current entry points and records acceptance. Brief v3 stays unchanged.

## Owner decisions

All five recommendations were accepted on 2026-10-17. The authoritative rules live in the
contract and guide; this table records the choice and its boundary.

| Question | Accepted recommendation | Boundary |
|---|---|---|
| Two content types | Two kinds of notebook content; supporting records allowed | Each new store still needs its own approved design and safety coverage |
| Diario membership | Retain the current structural rule; leave redesign open | No identity or schema change |
| Optional additive fields | Consider an exception only after specific compatibility review and approval | Existing version/export/validation requirements and installed gate remain; no exception granted |
| Plan approval | Approve a bounded task once; routine fixes within it may proceed | Raise material scope changes and uncovered data-model work; push permission remains separate |
| Code license | Keep a separate owner decision | No license selected |

Local feature-open events remain a low-priority possibility; none are approved here. The
keep/hide/retire review was withdrawn by the owner and is not a gate for lessons or other growth.

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
| Approval, commits, verification, pushes and machine recipes | Shared guide and docs/agents recipes; bounded-task approval is active |
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

## Verification and separate follow-ups

Completed for the draft increment: all 105 Markdown files have valid local targets/fragments;
`git diff --check` passes; brief v3 is byte-identical to the deployed baseline; historical
decision bodies and Step 2 archive preservation checks pass. Both read-only reviewers checked
the drafts; corrections include link timestamps, unsaved-feedback behavior, deletion
confirmation, provider-side spending limits, attribution and the broader secrets rule.
No runtime files or executable tooling changed in this increment, so no application test suite
or browser walkthrough was rerun. Existing release evidence and unresolved owner-device checks
stay in CURRENT.

Activation passed the same link, whitespace and preservation checks. Both independent
read-only reviews confirmed the accepted policy boundaries and retained safeguards. Current
authority pointers were corrected in the guide, entry points, ideas, lesson plan, pipeline
README and tracked wait-what skill; the ignored Claude skills copy was not changed. All
activation changes are Markdown; pre-activation decisions, release evidence and pending
owner-device checks are unchanged. Durable safeguards remain explicit in active documents: stable identity,
personal/reference separation, nested reference authority and cleanup, event-derived learning,
ñ preservation, explicit AI requests and spending-cap condition, secrets exclusion, deletion
confirmation, atomic saves, validated export/restore and attribution. Existing behavior outside
approved scope remains protected even where the old brief's phase acceptance lists are not
repeated. Historical records remain available for exact rationale.

**Workflow changes:** bounded approval is active; optional-field exceptions can be considered
only after compatibility evidence and specific approval. Neither changes running code.
**Executable tooling and application work:** linting, Node pinning, awaitable reload, lesson
restructuring, migrations and feature work remain separate. The lesson plan's contract references
were corrected without approving its proposed store or player. Code licensing remains deferred.
