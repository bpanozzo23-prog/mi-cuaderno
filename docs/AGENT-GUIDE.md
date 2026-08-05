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
- `docs/mi-cuaderno.jsx` is a **look-and-feel reference only** and only needs to be read for visual
  or interaction work. Its storage, linking and state handling are superseded by the brief and
  the current application.

## Working agreement (brief §2)

- **Propose a plan in plain language and wait for approval before writing code.**
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
- **`SCHEMA_VERSION` is 5.** Phase 4i introduced v1→v2 structured meanings, Phase 4j–4o added
  v2→v3 page profiles, Phase 4t added v3→v4 sparse link annotations, and Phase 7 adds v4→v5
  composable pages. Startup requires an untouched validated v1, v2, v3, or v4 export before Dexie
  opens; direct v1→v5 runs all four migrations in order. Backup schemas 1 through 5 upgrade
  sequentially in memory and are deeply validated as v5 before any write; versions newer than 5
  remain blocked. Any further personal schema change still triggers §5 in full: migration plan,
  export-first safety, version bump and matching backup validation. **If you conclude another is
  needed, stop and raise it.**
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
  by its shell on this machine.
- `npm test` — Vitest. Node is the default test environment; component tests opt into `jsdom`
  with a per-file `@vitest-environment` pragma. There is no lint or type-check script.
- `npm run build` — production build. Run the relevant checks after code changes.
- Dev server: Vite on port 5173 (`node node_modules/vite/bin/vite.js`; honours `PORT`). The app
  is served under `/mi-cuaderno/`.
- Pushing to `main` deploys to GitHub Pages automatically. **Push only when asked.** A failed
  deploy leaves the previously published site serving.

## Git, when two tools share one working directory

The owner switches between Claude Code and Codex in the **same checkout**, so the branch you
start on may not be the branch the previous session used.

- **Check `git status -sb` before your first commit, and again before pushing.** This has already
  bitten once: a Codex-created branch was still checked out, two commits landed on it instead of
  `main`, and `git push origin main` then reported "Everything up-to-date" — correctly, because
  local `main` had not moved. Nothing was lost, but the push silently did nothing.
- **A push that reports "Everything up-to-date" when you expected commits to go out is a signal,
  not a success.** Check which branch HEAD is on before assuming the remote already had them.
- Prefer `git merge --ff-only` when catching a branch up: it refuses rather than inventing a
  merge commit if the history is not what you assumed.
- **Do not delete or reset the other tool's branches**, and do not rebase shared history. A
  branch you did not create may be mid-task. Leave it and say so.

## Verifying in the browser

Tests are not enough for anything the owner can see; the project's habit is to check the running
app and say so in the report.

You do **not** need the real 22 MB dictionary. Write fixture entries straight into
`mi-cuaderno-ref-a` and set `localStorage["mc-ref-active"] = "a"` — see `src/test/dictFixture.js`
for the store shapes, and Phase 3c/4d in `DECISIONS.md` for how this has been done before. Seed
personal items directly into the `mi-cuaderno` Dexie database the same way.

Check the phone case: **375 px viewport, no horizontal overflow.** Phone is the primary device.

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
