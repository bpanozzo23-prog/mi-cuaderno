# Test reliability hardening — 2026-09-03

## Scope

Owner-approved test-only maintenance for DictAttachment, JournalReader, TallerScaffold,
RecognitionDrill and JournalEditor. Production behavior, database schema, backup format,
deployment workflow, serial execution, default timeouts and timer policy are unchanged.
No owner data or external AI service was used. The pre-existing CollectionPage modification
was excluded from this work.

## Corrections

- Readiness absence checks now hold the real dictionary/preference result behind a
  test-controlled promise. Assertions cover both the pending UI and the settled unavailable
  state, with matching available-state controls. Existing installed-dictionary interactions
  remain real IndexedDB integration tests.
- The new AI-preference matrix checks explicit boolean enablement and missing, empty,
  whitespace, non-string and valid keys. Synthetic fixture values never leave the tests.
- Recognition event assertions and missed-round navigation wait for completed grading.
  A held write proves that callbacks and Done stay unavailable while another answer is blocked.
- Journal tests await Saved or save-specific completion before inspecting history or ending.
  Explicit unmount tests cover ordinary writing, temporarily blank dates, and a newer draft
  queued while initial materialization is pending. The latter holds the create API's return
  after its real database work, outside a transaction.
- The cancellation test uses two synchronous input changes, so slow character-by-character
  typing cannot legitimately autosave before the test erases the text. Its bounded real-timer
  wait intentionally tests passage beyond the debounce, not guessed database readiness.
- The stale "Margin notes" negative assertion now checks the actual named Feedback region,
  with the same region required by the positive stored-review test.
- Failure-safe teardown releases gates, unmounts, awaits captured editor navigation barriers
  and call-through API promises, then restores mocks/globals. The settlement helper also waits
  for newly recorded calls and reports rejected work; it is not a generic event-loop-idle
  detector. Successful unmount assertions run before the teardown barrier can rescue a save.
- The agent guide now requires zero failures, zero unhandled errors and exit zero, rather than
  exempting a historical error that was already fixed.

## Deliberate failure proofs

Every temporary mutation below was restored before repeat verification.

| Mutation | Observed failure |
| --- | --- |
| Invert DictAttachment dictionary readiness | Both unavailable and available settled assertions fail; initial loading assertions still pass |
| Invert TallerScaffold dictionary readiness | Lookup absence and presence controls fail after settlement |
| Invert JournalReader AI readiness | Disabled, keyless and enabled-with-key UI cases fail after settlement |
| Remove AI enablement requirement | Missing, false and nonboolean flag cases fail |
| Remove AI key requirement | Missing, empty, whitespace, null and numeric key cases fail |
| Remove `await logDrill` | Grading callback is observed before the held write finishes |
| Remove editor unmount flush | Latest-draft probe gets only the initial completion instead of both saves |
| Remove both debounce cancellation paths | Erased writing still reaches `createItem` |
| Drain only the initial spy-call snapshot | Helper misses a separately queued operation's rejection |

Removing only the autosave effect's cleanup cancellation stayed green because the next effect
also clears the timer. That was not a successful behavior-breaking mutation; removing both
cancellation paths produced the intended failure. This distinction avoids binding the test to
a redundant implementation detail.

## Verification

- Baseline: 1,766/1,766 tests across 145 files, exit zero, 556.67 seconds.
- Initial focused run: 73/73 across seven files.
- Focused acceptance: ten consecutive fresh processes, each 73/73 across seven files,
  exit zero and no unhandled errors; 30.87–38.49 seconds per run.
- Complete serial acceptance: three consecutive fresh processes, each 1,787/1,787 across
  147 files, exit zero and no unhandled errors; 435.47, 445.29 and 430.58 seconds.
- Acceptance used no skipped tests, failure retries, timeout increases or concurrent suites.
- Production build: passed, 2,144 modules transformed and service worker generated.
  Existing large-chunk warnings remain; bundle optimization was outside this scope.
- `git diff --check`: passed. Production source changes from deliberate breaks were fully
  restored; only tests, their helper and documentation are included in this change.

The baseline emitted existing jsdom `scrollTo` notices and a nested-button warning from
SpeakButton's test fixture. Neither is an unhandled rejection; both are outside this change.
The historical five-second JournalEditor timeout did not reproduce in the baseline. Confirmed
race weaknesses were corrected, but they are not claimed as its proven cause.

Verification is local Windows only. There is no new visible app behavior requiring browser
acceptance. Linux verification, push and deployment have not been performed. Repeated green
runs increase confidence; they do not prove that every test in the repository is deterministic.
