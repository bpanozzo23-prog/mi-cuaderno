# Mi Cuaderno — shared agent guide

**Read this first, whichever tool you are.** `CLAUDE.md` (Claude Code) and `AGENTS.md` (Codex)
both point here and add only what is specific to their tool. This file is the single copy of
everything shared — if a rule here disagrees with a tool file, fix the discrepancy rather than
picking a side silently.

A personal Spanish notebook (PWA) built on a bundled offline dictionary. One owner, one device,
no server. Simplicity and durability beat features.

**Current state deliberately lives elsewhere.** This guide states no phase status, because a
file that restates it is a copy that goes stale between commits.

## Read order

Start every task with the current state:

1. `README.md` → Status — which phases are done and what is in progress.
2. Follow the report linked from the in-progress phase in that Status section. If no phase is in
   progress, use the report linked from the most recently completed phase. Do not guess from file
   timestamps: older reports deliberately keep their historical figures.
3. Inspect the existing architecture, components and utilities relevant to the request before
   recommending changes or introducing duplicates.

Then load the durable references the task actually needs:

- `docs/mi-cuaderno-project-brief-v3.md` is **the contract.** Read the sections governing a
  proposed behaviour change before planning it. Read the whole brief before planning a new phase
  or changing cross-cutting architecture, the data model, storage, identity, search, events,
  backup, the reference-data seam or AI policy. Where it specifies exact behaviour, implement it
  as written. Amendments use strikethrough plus the replacement so the original stays readable.
- `DECISIONS.md` is the append-only reasoning record, not an always-load checklist. Scan its
  headings or search it for the affected phase, component and concept; read the matching entries
  before re-litigating a choice. Read current-phase and Tooling entries when they affect the work.
- `docs/IMPROVEMENT-IDEAS.md` is a dated record of unapproved planning possibilities. Read it when
  the owner asks to discuss or develop one of those ideas, but never treat an entry there as an
  approved phase, product requirement or implementation instruction.
- `docs/mi-cuaderno.jsx` is **historical, not current.** It was the look-and-feel reference before
  the app existed; the real app now supersedes it for visual and interaction decisions alike, and
  it drifts further every time a styling or layout choice is made only in `src/`. Its storage,
  linking and state handling were already superseded by the brief. Do not restore styling from it
  without checking the current app and `DECISIONS.md` first — a match may be coincidence, not
  intent.

## Working agreement (brief §2)

- **Propose a plan in plain language and wait for approval before writing code.** Purely-visual
  changes are the one exception — see "Visual changes" below. (The brief's own wording is
  per phase or sub-phase; the blanket form here was this guide's broadening.)
- Explain choices; define jargon the first time it appears.
- Small verifiable steps. One commit per completed feature or sub-phase. After each change,
  state exactly how the owner can see or test it.
- **Every meaningful decision gets a `DECISIONS.md` line: date — decision — reason.**
- Found a conflict with the brief, or think a rule is wrong? **Raise it. Do not deviate quietly.**
- For audits and reviews, do not implement recommendations unless explicitly asked.

## Tripwires

Easy to violate, expensive to discover later. Verify each against the files rather than trusting
this summary.

- **The event log is the single source of truth** (§7). No stored counters, no state flags.
  Tricky state, lookup counts, review box and due date are all *derived at render*
  (`src/lib/review.js`, `src/db/events.js`).
- **`SCHEMA_VERSION` is 10.** Phase 4i introduced v1→v2 structured meanings, Phase 4j–4o added
  v2→v3 page profiles, Phase 4t added v3→v4 sparse link annotations, Phase 7 added v4→v5
  composable pages, Phase 19 added v5→v6 Grammar hierarchy followed by v6→v7 Structured Notes,
  the 2026-08-11 Diario amendment added v7→v8 persisted entry feedback (`feedback: null` on
  every page), the 2026-08-14 Apuntes amendment added v8→v9 owner notes beside a Diario
  entry (`apuntes: null` on every page), and the 2026-08-21 Lexical Structured Notes amendment
  added v9→v10 `noteSections: []` to every Word and Phrase while preserving `notes` as its
  General note. Startup requires an untouched validated schema-1 through schema-9 export before
  Dexie opens; direct legacy upgrades run every migration in order. Backup schemas 1 through 10
  upgrade sequentially in memory and are deeply validated as v10 before any write; versions newer
  than 10 remain blocked. Any further personal schema change
  still triggers §5 in full: migration plan, export-first safety, version bump and matching
  backup validation. **If you conclude another is needed, stop and raise it.**
- **`src/lib/normalize.js` preserves ñ** — "año" must never match "ano", anywhere new. All
  matching goes through it. **Do not change it:** the pipeline imports the same file, so it also
  decides what the 10,278 shipped dictionary entries match.
- **Personal content has exactly two types** — lexical items and pages (§7 forbids a third
  without a brief amendment). Words and phrases are both lexical, told apart by `form`. Pages store
  one `pageFocus: notes | vocabulary | source | grammar`; Notes are the permanent body-based
  foundation, while complete `collection`, `source`, and `grammar` structures enable independently.
  A dated page is a Journal entry only when none of those structures is enabled. `pageProfile` is
  legacy migration/input compatibility, not current page identity.
- **Identity:** personal IDs are `user:<uuid>`; dictionary IDs are namespaced `dict:` keys. A
  lexical item's optional `dictKey` is a reversible attachment, never its identity — the item
  keeps its own `term` and owns stable `meaning:<uuid>` records that never reference dictionary
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
- **The §5 seam.** `dict:` keys can go stale across a dataset rebuild. Anything new that renders
  one needs the orphan behaviour: resolve through the alias map, rewrite the key when it answers
  (without logging an edit), and say so plainly when nothing answers. "Not installed" is **not**
  "orphaned". See `src/db/linkedEntries.js` and `src/components/DictAttachment.jsx`.
- **Two layers, separate databases.** Personal data lives in the `mi-cuaderno` Dexie database;
  the dictionary lives in `mi-cuaderno-ref-a`/`-b` with a localStorage pointer (`mc-ref-active`)
  naming the live one. Rebuilding reference data must never touch personal data. Dictionary
  entries are read-only in-app.
- **Backups** are JSON replace-and-restore of the personal layer only; the dictionary is
  replaceable and excluded. Never overwrite or delete the owner's browser data.
- **Non-goals (§13) still stand:** no accounts, no server, no sync, no analytics, no merge-mode
  import, no file attachments (model reserved), no content from proprietary dictionaries.

## Environment and checks

- npm is the package manager (`package-lock.json`).
- Commands below use npm's conventional spelling; a tool entry file may give the spelling needed
  by its shell on the Windows laptop. On the Ubuntu server the conventional spelling is the right
  one (see "Two machines, one remote" below).
- `npm test` — Vitest. Node is the default test environment; component tests opt into `jsdom`
  with a per-file `@vitest-environment` pragma. There is no lint or type-check script.
  **The suite runs one file at a time** (`fileParallelism: false`, set in `vitest.config.js` so
  every invocation gets it). That is the "complete serial suite" this project's reports have
  always cited, and it costs roughly 225s on the Windows laptop (about 360s on the Ubuntu server)
  rather than 68s. Run it whole before claiming a phase; a red `App.test.jsx` navigation timeout
  under parallel load is contention, not a regression.
- **No fake timers.** This suite uses none anywhere, deliberately: the app's async paths run
  through Dexie and the browser's own scheduling, which `vi.useFakeTimers()` does not advance, so
  a test that awaits one hangs until the runner kills it rather than failing usefully. Wait for
  the observable result instead — `await waitFor(() => …)`, as ~17 component test files already
  do.
- `npm run build` — production build. Run the relevant checks after code changes.
- Dev server: Vite on port 5173 (`node node_modules/vite/bin/vite.js`; honours `PORT`). The app
  is served under `/mi-cuaderno/`.
- Pushing to `main` deploys to GitHub Pages automatically. **Push only when asked.** A failed
  deploy leaves the previously published site serving.
- **A deploy is not finished until the status docs say so.** In the same session as a push to
  `main`, update `README.md`'s Status section — including its `SCHEMA_VERSION` paragraph if the
  version moved — and any `docs/IMPROVEMENT-IDEAS.md` status the release changes. README Status is
  step 1 of every session's read order, so drift there misleads every future session: the
  2026-08-11 sweep existed because three deployed increments and a schema bump were recorded in
  `DECISIONS.md` but never in the README.

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

## Two machines, one remote

Since 2026-08-22 the owner works from two checkouts of this repository: the **Windows laptop**
(Claude Code desktop app and Codex; PowerShell and Git Bash) and a **headless Ubuntu server** —
an old Dell XPS on the owner's Tailscale network, reached over SSH from a Surface Pro or a phone,
where Claude Code and Codex run as CLIs inside `tmux`. The tool entry files carry the shell
spellings for each machine; everything else in this guide applies on both. What differs:

- **`uname` tells you which one you are on** — `Linux` is the XPS. Do not carry the Windows
  shell quirks (`npm.cmd`, the `PATH=` prepend, the full `gh.exe` path) onto Linux, and do not
  assume Linux tools on Windows. On the XPS, `npm test`, `npm run build`, `node`, `git` and `gh`
  all work under their plain names.
- **Commits are invisible across machines until pushed.** "Push only when asked" still holds, so
  a session that ends with unpushed commits must say so in its report — the next session may be
  on the other machine and will not see them. `git status -sb` at the start of a session now also
  answers whether the local branch is behind `origin/main`; catch up with `git pull --ff-only`
  before building on it, and fetch before assuming the other machine has nothing new.
- **Line endings.** The Windows checkout runs with `core.autocrlf=true` and over-reports modified
  files; the Linux checkout runs with `core.autocrlf=input` so it commits LF without rewriting
  the tree. A diff that touches every line of a file you did not edit is a line-ending accident,
  not a change — stop and check `git config core.autocrlf` before committing it.
- **`.claude/` is gitignored, so a fresh clone has none of it.** Recreate the Claude Code skills
  copy with `mkdir -p .claude && cp -r .agents/skills .claude/skills` and keep
  `diff -r .agents/skills .claude/skills` silent. `.claude/launch.json` only matters to a tool
  with a browser pane; the CLI on the XPS has none (see below).
- **The suite is slower there and exposes a teardown race.** Expect about 360s for the serial
  run. One known unhandled rejection — `DatabaseClosedError` after `App.test.jsx`'s "routes tag
  twins to Ajustes" test — fires on the slow CPU without failing any test (`DECISIONS.md`,
  2026-08-22). It makes `npm test` exit non-zero, so read the pass/fail counts rather than the
  exit code until it is fixed, and do not report it as a regression of whatever you changed.
- **No browser pane from the CLI.** Verification on the XPS is tests plus the owner looking:
  start the dev server with `--host` (`node node_modules/vite/bin/vite.js --host`; port 5173 is
  open on the Tailscale interface only) and report the URL for the owner to open on the phone:
  `echo "http://$(hostname):5173/mi-cuaderno/"` — the short name resolves over MagicDNS, and the
  real name stays out of this public repo. The 375 px check is literal there. Say plainly in
  the report that the agent did not see the app.

## Verifying in the browser

Tests are not enough for anything the owner can see; the project's habit is to check the running
app and say so in the report.

You do **not** need the real 22 MB dictionary. Write fixture entries straight into
`mi-cuaderno-ref-a` and set `localStorage["mc-ref-active"] = "a"` — see `src/test/dictFixture.js`
for the store shapes, and Phase 3c/4d in `DECISIONS.md` for how this has been done before. Seed
personal items directly into the `mi-cuaderno` Dexie database the same way.

Check the phone case: **375 px viewport, no horizontal overflow.** Phone is the primary device.

**The in-app browser pane does not composite frames**, so screenshots time out. This is a known
limitation, not a broken setup — do not burn time retrying. Verify visually by the numbers
instead: computed styles (`getComputedStyle`), resolved colours, element counts, layout
measurements, `scrollWidth` for overflow. Several phase closeouts have shipped on exactly this
evidence.

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
- dependencies on the personal/reference data seam, storage or schema changes, deferred
  decisions (§14), or in-progress phase work.

## One habit worth keeping

When a test passes, ask whether it *could* have failed. Two bugs in this project were checks that
could not fail in the case they existed to catch (Phase 2g's licence assertion; the Phase 4c
navigation test, which passed against a deliberate break because it raced the async handler).
Break the thing on purpose, watch the test go red, then put it back.
