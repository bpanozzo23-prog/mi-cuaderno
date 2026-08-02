# Mi Cuaderno — shared agent guide

**Read this first, whichever tool you are.** `CLAUDE.md` (Claude Code) and `AGENTS.md` (Codex)
both point here and add only what is specific to their tool. This file is the single copy of
everything shared — if a rule here disagrees with a tool file, fix the discrepancy rather than
picking a side silently.

A personal Spanish notebook (PWA) built on a bundled offline dictionary. One owner, one device,
no server. Simplicity and durability beat features.

**Current state deliberately lives elsewhere.** This guide states no phase status, because a
file that restates it is a copy that goes stale between commits.

## Read before proposing anything

1. `docs/mi-cuaderno-project-brief-v3.md` — **the contract.** Where it specifies exact behaviour
   (IDs, search rules, import semantics, event rules), implement it as specified. Amendments are
   marked inline with strikethrough plus the replacement, so the original stays readable.
2. `README.md` → Status — which phases are done, and what is in progress.
3. The newest `docs/PHASE-*-REPORT.md` — what shipped last and what was left open. Older reports
   preserve historical figures on purpose; the newest one has current numbers.
4. `DECISIONS.md` — every choice with its reason. Check here before re-litigating anything.
5. `docs/mi-cuaderno.jsx` is a **look-and-feel reference only**. Its storage, linking and state
   handling are superseded by the brief and the current application.
6. Inspect the existing architecture, components and utilities before recommending changes or
   introducing duplicates.

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
- **`SCHEMA_VERSION` is 1 and has never moved.** A personal-layer schema change triggers §5 in
  full: migration plan, export-first reminder, version bump, and matching validation in
  `src/db/backup.js`. **If you conclude one is needed, stop and raise it** — every phase so far
  has found a way not to need one.
- **`src/lib/normalize.js` preserves ñ** — "año" must never match "ano", anywhere new. All
  matching goes through it. **Do not change it:** the pipeline imports the same file, so it also
  decides what the 10,278 shipped dictionary entries match.
- **Personal content has exactly two types** — lexical items and pages (§7 forbids a third
  without a brief amendment). Words and phrases are both lexical, told apart by `form`. A dated
  page is a journal entry; films, podcasts and grammar notes are ordinary pages.
- **Identity:** personal IDs are `user:<uuid>`; dictionary IDs are namespaced `dict:` keys. A
  lexical item's optional `dictKey` is a reversible attachment, never its identity — the item
  keeps its own `term` and `translation` and stays meaningful alone.
- **Links are stored once**, in `linkedKeys[]` on the item where the link was made; backlinks
  are derived from the `*linkedKeys` index. Never store a reciprocal copy. **Linking and
  unlinking log no `edit` event** — bookkeeping, not content. Tags and notes *are* content and
  do log one.
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
- `npm test` — Vitest. Node is the default test environment; component tests opt into `jsdom`
  with a per-file `@vitest-environment` pragma. There is no lint or type-check script.
- `npm run build` — production build. Run the relevant checks after code changes.
- Dev server: Vite on port 5173 (`node node_modules/vite/bin/vite.js`; honours `PORT`). The app
  is served under `/mi-cuaderno/`.
- Pushing to `main` deploys to GitHub Pages automatically. **Push only when asked.** A failed
  deploy leaves the previously published site serving.

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
