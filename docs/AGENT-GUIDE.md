# Mi Cuaderno — shared agent guide

**Read this first, whichever tool you are.** `CLAUDE.md` (Claude Code) and `AGENTS.md` (Codex)
both point here and add only what is specific to their tool. This file is the single copy of
everything shared — if a rule here disagrees with a tool file, fix the discrepancy rather than
picking a side silently.

A personal Spanish notebook (PWA) built on a bundled offline dictionary. One owner, one device,
no server. The owner welcomes adding features, trying them and removing them later if useful.
[Reassessment §15](reviews/2026-10-17/REASSESSMENT.md#15-owner-response-2026-10-17) and its
[decision entry](../DECISIONS.md#reassessment-owner-response-2026-10-17) take precedence over older
friction-first wording. Friction is one input, not a feature gate; the usage review is withdrawn.
Data-safety and explicit approval boundaries still apply.

**Current state lives in [CURRENT](CURRENT.md).** This guide keeps durable rules and points to
references when the task needs them.

## Read order

Start every task with the current state:

1. [docs/CURRENT.md](CURRENT.md) — verified release, current work and unresolved checks.
2. Follow its task-relevant references. Use the [documentation index](README.md) to find
   proposals and history; historical reports retain their original figures and are not current status.
3. Inspect the existing architecture, components and utilities relevant to the request before
   recommending changes or introducing duplicates.

Then load the durable references the task actually needs:

- [PRODUCT](PRODUCT.md) and [ARCHITECTURE](ARCHITECTURE.md) are **the current contract.** Read the
  relevant sections before planning behavior changes; read both in full for a new phase or
  cross-cutting work on storage, identity, search, events, backup, the reference seam or AI.
  PRODUCT owns product policy, ARCHITECTURE owns implementation guarantees, and this guide owns
  working procedures. Preserve existing behavior outside the approved scope; inspect affected
  code, tests and decisions for exact details. Raise conflicts rather than choosing silently.
- [Brief v3](mi-cuaderno-project-brief-v3.md) is **frozen history**, kept byte-for-byte at its
  existing path. Read it when investigating an old acceptance criterion or decision; it no
  longer overrides the current contract. Update current documents in place and record reasons
  in DECISIONS rather than adding amendments to the brief.
- `DECISIONS.md` is the append-only reasoning record, not an always-load checklist. Scan its
  headings or search it for the affected phase, component and concept; read the matching entries
  before re-litigating a choice. Read current-phase and Tooling entries when they affect the work.
- `docs/IMPROVEMENT-IDEAS.md` is a dated record of unapproved planning possibilities. Read it when
  the owner asks to discuss or develop one of those ideas, but never treat an entry there as an
  approved phase, product requirement or implementation instruction.
- `docs/history/prototype/mi-cuaderno.jsx` is **historical, not current.** It was the look-and-feel reference before
  the app existed; the real app now supersedes it for visual and interaction decisions alike, and
  it drifts further every time a styling or layout choice is made only in `src/`. Its storage,
  linking and state handling were already superseded by the brief. Do not restore styling from it
  without checking the current app and `DECISIONS.md` first — a match may be coincidence, not
  intent.

## Working agreement

- **Approve a bounded task once.** Propose its plan in plain language and get approval before writing code;
  once approved, complete implementation, verification and routine fixes within that scope
  without asking again for each edit. Raise material scope changes and data-model changes not
  covered by the approved plan. Schema-policy exceptions still need their specific review and
  approval. Purely visual changes retain the lighter process below; push authorization remains
  separate. This is the owner-approved Step 3 workflow change.
- Explain choices; define jargon the first time it appears.
- Small verifiable steps. One commit per completed feature or sub-phase. After each change,
  state exactly how the owner can see or test it.
- **Every meaningful decision gets a `DECISIONS.md` line: date — decision — reason.**
- Found a conflict with the current contract, or think a rule is wrong? **Raise it. Do not deviate quietly.**
- For audits and reviews, do not implement recommendations unless explicitly asked.

## Tripwires

Easy to violate, expensive to discover later. Verify each against the files rather than trusting
this summary.

- **Events govern recorded activity and learning state.** Derive tricky state, lookup counts,
  review box and due date from them (`src/lib/review.js`, `src/db/events.js`); do not substitute
  persisted counters or mastery flags. Content and preferences have their own authority;
  disposable memory caches are allowed.
- **Personal-schema changes need an explicit safety plan.** Follow
  [ARCHITECTURE's migration and exception policy](ARCHITECTURE.md#backup-and-schema-upgrades).
  Raise changes not covered by the approved scope before implementing them. The default remains
  versioned migration, export-first safety and matching backup validation; an optional-field
  exception requires its own compatibility evidence and owner approval.
  [CURRENT](CURRENT.md) identifies the current schema and accepted backup versions; inspect
  [the version constant](../src/version.js), [database migrations](../src/db/db.js),
  [pre-upgrade gate](../src/db/preupgrade.js) and [backup path](../src/db/backup.js) for exact behavior.
  Preserve untouched validated legacy exports, sequential upgrades and validation before writes.
- **`src/lib/normalize.js` preserves ñ** — "año" must never match "ano", anywhere new. All
  matching goes through it. **Do not change it:** the pipeline imports the same file, so it also
  decides what the shipped dictionary entries match.
- **Notebook content has two types** — lexical items and pages. Supporting records are allowed
  after their own design and safety review; this does not approve a new store. Words and phrases
  are both lexical, told apart by `form`. Pages store
  one `pageFocus: notes | vocabulary | source | grammar`; Notes are the permanent body-based
  foundation, while complete `collection`, `source`, and `grammar` structures enable independently.
  A dated page is a Journal entry only when none of those structures is enabled and its Notes
  outline (`noteSections`) is empty. `pageProfile` is legacy migration/input compatibility,
  not current page identity.
- **Identity:** personal IDs are `user:<uuid>`; dictionary IDs are namespaced `dict:` keys. A
  lexical item's ordered `dictKeys[]` list holds reversible attachments, never its identity. An
  empty list means no attachment; the item keeps its own `term` and owns stable `meaning:<uuid>`
  records that never reference dictionary
  sense IDs or ordering, so it stays meaningful alone.
- **Links are stored once**, in `linkedKeys[]` on the item where the link was made; backlinks
  are derived from the `*linkedKeys` index. Never store a reciprocal copy. **Linking and
  unlinking log no `edit` event** — bookkeeping, not content. Tags and notes *are* content and
  do log one.
- **Nested page references never create authority.** Collection group, Source-capture, and
  Grammar-example `itemKeys` may only reference linked personal lexical items. An external Grammar
  `sourceCaptureRef` also requires the Grammar page's outgoing ordinary link to the Source page;
  a same-page reference requires no self-link. Disabled populated structures remain valid but stay
  outside display, filters, search, and contextual summaries. Removing authoritative page
  vocabulary or deleting an item/page/capture must clean every dependent nested reference in the
  same transaction without inventing reciprocal links.
- **The reference seam.** `dict:` keys can go stale across a dataset rebuild. Anything new that renders
  one needs the orphan behaviour: resolve through the alias map, rewrite the key when it answers
  (without logging an edit), and say so plainly when nothing answers. "Not installed" is **not**
  "orphaned". See `src/db/linkedEntries.js` and `src/components/DictAttachment.jsx`.
- **Two layers, separate databases.** Personal data lives in the `mi-cuaderno` Dexie database;
  the dictionary lives in `mi-cuaderno-ref-a`/`-b` with a localStorage pointer (`mc-ref-active`)
  naming the live one. Rebuilding reference data must never touch personal data. Dictionary
  entries are read-only in-app.
- **Backups** are JSON replace-and-restore of the personal layer only; the dictionary is
  replaceable and excluded. Never overwrite or delete the owner's browser data.
- **Current scope:** no accounts, application server, sync, analytics, merge-mode import or
  stored file attachments. There is no reserved Attachment store. Future work needs its own
  approved scope; proprietary dictionary content remains excluded.

## Environment and checks

- npm is the package manager (`package-lock.json`).
- Before running machine-specific setup or preview commands, read [Windows](agents/WINDOWS.md)
  or [XPS/Linux](agents/XPS.md), according to the actual OS and shell. Use
  [browser verification](agents/BROWSER-VERIFICATION.md) for visible application changes.
- `npm run lint` — JavaScript and React Hooks correctness checks; zero warnings. Keep intentional
  lifecycle exceptions narrow and explained; changing dependencies must preserve drafts and event timing.
- `npm test` — Vitest. Node is the default test environment; component tests opt into `jsdom`
  with a per-file `@vitest-environment` pragma. There is no type-check script.
  **The suite runs one file at a time** (`fileParallelism: false`, set in `vitest.config.js` so
  every invocation gets it). Run the complete serial suite before claiming a phase; parallel
  runs are not the project's acceptance gate.
- **A passing verification run exits zero with no failing tests or unhandled errors.** Capture
  the exact failing test and error before rerunning. Passing in isolation does not establish
  harmless contention: unfinished work can leak into a later test. Wait for the operation's
  final saved state or completion callback, and finish pending work before clearing databases.
  For a timing fix, force the problematic ordering with controlled promises and prove the test
  detects broken behavior; retain real database integration and the existing timeout policy.
- **No fake timers.** This suite uses none anywhere, deliberately: the app's async paths run
  through Dexie and the browser's own scheduling, which `vi.useFakeTimers()` does not advance, so
  a test that awaits one hangs until the runner kills it rather than failing usefully. Wait for
  the observable result instead — `await waitFor(() => …)`.
- `npm run build` — production build. Run the relevant checks after code changes.
- Pushes to `main` run checks and deploy to GitHub Pages unless every changed path matches the
  documentation exclusions in the [workflow](../.github/workflows/deploy.yml). Mixed pushes
  retain the full gate; manual `workflow_dispatch` runs remain available. **Push only when asked.**
  A failed deploy leaves the previously published site serving. For unusually large pushes,
  check [GitHub's diff limits](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow#git-diff-comparisons):
  a timeout or more than 1,000 commits forces a run, while the 3,000-file cap can miss changes
  that should trigger it. Verify a run was created for an authorized publication; use manual
  dispatch on `main` if filtering missed it.
- **Record verified publication in the same session.** Put the published revision, date, CI run
  and checks in [release history](history/RELEASES.md); update [CURRENT](CURRENT.md) to point to it
  and change any affected idea's progress/completion status. Record what was actually verified,
  including outstanding owner checks. README links to CURRENT; decisions retain reasons rather
  than deployment transcripts. A documentation-only publication record normally skips deployment;
  keep the last verified published revision until another deployment is actually verified.

## Git, when two tools share one working directory

The owner switches between Claude Code and Codex in the **same checkout**, so the branch you
start on may not be the branch the previous session used.

- **Check `git status -sb` before your first commit, and again before pushing.** This has already
  bitten once: a Codex-created branch was still checked out, two commits landed on it instead of
  `main`, and `git push origin main` then reported "Everything up-to-date" — correctly, because
  local `main` had not moved. Nothing was lost, but the push silently did nothing.
- **A push that reports "Everything up-to-date" when you expected commits to go out is a signal,
  not a success.** Check which branch HEAD is on before assuming the remote already had them.
- **Confirm the remote actually moved before reporting a push succeeded**:
  `git rev-parse HEAD origin/main` prints two SHAs, and they must match. Push output alone does
  not distinguish "already there" from "nothing to send from this branch" — the failure above
  looked like success in the transcript.
- Prefer `git merge --ff-only` when catching a branch up: it refuses rather than inventing a
  merge commit if the history is not what you assumed.
- **Do not delete or reset the other tool's branches**, and do not rebase shared history. A
  branch you did not create may be mid-task. Leave it and say so.

## Machine and browser work

Use the recipes when the task needs them: [Windows](agents/WINDOWS.md),
[XPS/Linux](agents/XPS.md), and [browser verification](agents/BROWSER-VERIFICATION.md).
Fetch and inspect the branch at session start; local commits are invisible to the other machine
until pushed. Report unpushed work and pending checks at handoff.

Visible changes require running-app verification with disposable fixtures at 375 px. Record what
was actually inspected and any limitations; keep owner-only checks pending until confirmed.
Never interpret an empty test notebook as the owner's actual state.

## Real notebook snapshot

The owner may keep a disposable export at
`private-data/mi-cuaderno-backup-latest.json`. It is a stale working snapshot, never the live
browser database or the authoritative disaster-recovery copy.

- **Request task-scoped access.** When real data would materially improve a task, explain what
  you would inspect, why fixtures cannot answer it as well, and the expected output, then ask the
  owner for permission before opening the file. An initial request that explicitly directs use of
  the snapshot is approval for that stated scope. A different task or use requires fresh approval.
- **Keep the source read-only.** Analyze it in place or load a separate copy into a disposable test
  database when the approved scope requires that. Preserve the source file exactly; owner browser
  data is never a test target.
- **Contain derivatives.** Keep raw content and derived output within the approved task. Anything
  entering tracked files must first be minimized and anonymized; the snapshot and raw extracts
  never enter Git.
- **Respect staleness.** Read `exportedAt` and describe conclusions as applying to that snapshot,
  never as the owner's current live state. Without approval or without the file, continue with
  seeded fixtures and state any resulting limitation.

## Visual changes

Process rules for styling and layout work (owner-approved 2026-08-05). Aesthetic direction is
deliberately not written down yet: the palette is not locked in, and taste is being settled
through iteration rather than declared up front.

- **Purely-visual changes get a lighter loop than the plan-first agreement.** If a change touches
  only appearance — colour, spacing, typography, borders, ordering of static elements — and no
  behaviour, data, navigation, or component structure, skip the plan and go straight to a shown,
  verified result the owner accepts or rejects. Anything structural (new screens, state, markup
  restructuring that tests can see) stays plan-first. When unsure which side of the line a change
  is on, it is structural.
- **The palette lives in one place**: the `@theme static` block in `src/index.css`. `C` in
  `src/theme.jsx` holds `var(--color-*)` references, so a palette change is a one-file edit and
  needs no component work. Never build colour values by string surgery on `C.*` (e.g. appending
  hex alpha) — they are `var()` references, not hex; a variant colour gets its own token.
- **New hardcoded hex values in components are a bug.** Every colour goes through a token. If the
  token you need is missing, add it to `src/index.css` and `C` rather than inlining the value.
- **Subjective choices are presented as variants, not guesses**: 2–3 treatments side by side on a
  disposable page outside the repo (scratchpad), using real-length content — the longest entry,
  the empty state, a five-tag card — never lorem ipsum or the three-item happy path. Nothing
  enters `src/` until the owner picks.
- **Visual commits stay separate from logic commits.** Taste gets reverted more often than logic;
  one concern per commit keeps that a `git revert` instead of surgery.
- **Owner-side input**: screenshots of the running app (with what feels wrong marked or named)
  carry far more information than prose descriptions, and are the preferred way to open a visual
  request.
- Meaningful visual decisions still get their `DECISIONS.md` line — the lighter loop drops the
  upfront plan, not the record.

## When proposing changes, identify

- the observed problem, distinguished from assumptions and anticipated risks;
- the expected owner value;
- the affected files or components;
- implementation effort and risk;
- whether the change fits the existing architecture;
- dependencies on the personal/reference data seam, storage or schema changes, open product
  decisions, or in-progress work.

## One habit worth keeping

When a test passes, ask whether it *could* have failed. Two bugs in this project were checks that
could not fail in the case they existed to catch (Phase 2g's licence assertion; the Phase 4c
navigation test, which passed against a deliberate break because it raced the async handler).
Break the thing on purpose, watch the test go red, then put it back.
