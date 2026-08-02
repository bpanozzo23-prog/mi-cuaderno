# Mi Cuaderno — instructions for Claude Code

A personal Spanish notebook (PWA) built on a bundled offline dictionary. One owner, one device,
no server. Simplicity and durability beat features.

This file holds the things that are true every session. **Current state deliberately lives
elsewhere** — restating which phase is done here would just create another copy to keep in sync.

## Read before proposing anything

1. `docs/mi-cuaderno-project-brief-v3.md` — **the contract.** Where it specifies exact behaviour
   (IDs, search rules, import semantics, event rules), implement it as specified. Amendments are
   marked inline with strikethrough plus the replacement, so the original stays readable.
2. `README.md` → Status — which phases are done, and what is in progress.
3. The newest `docs/PHASE-*-REPORT.md` — what shipped last and what was left open. Older reports
   preserve historical figures on purpose; read the newest one for current numbers.
4. `DECISIONS.md` — every choice with its reason. Check here before re-litigating anything.
5. `docs/mi-cuaderno.jsx` is a **look-and-feel reference only**. Its storage, linking and state
   handling are superseded by the brief.

## Working agreement (brief §2)

- **Propose a plan in plain language and wait for approval before writing code.** Use Plan Mode.
- Explain choices; define jargon the first time it appears.
- Small verifiable steps. One commit per completed feature or sub-phase.
- **Every meaningful decision gets a `DECISIONS.md` line: date — decision — reason.**
- Found a conflict with the brief, or think a rule is wrong? **Raise it. Do not deviate quietly.**

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
- **Links are stored once**, on the item where the link was made; the reverse is derived from the
  `*linkedKeys` index. **Linking and unlinking log no `edit` event** — that is bookkeeping, not
  content. Tags and notes *are* content and do log one.
- **The §5 seam.** `dict:` keys can go stale across a dataset rebuild. Anything new that renders
  one needs the orphan behaviour: resolve through the alias map, rewrite the key when it answers
  (without logging an edit), and say so plainly when nothing answers. "Not installed" is **not**
  "orphaned". See `src/db/linkedEntries.js` and `src/components/DictAttachment.jsx`.
- **Two layers, separate databases.** Personal data is in `mi-cuaderno`; the dictionary is in
  `mi-cuaderno-ref-a`/`-b` with a localStorage pointer (`mc-ref-active`) naming the live one.
  Rebuilding reference data must never touch personal data.
- **Non-goals (§13) still stand:** no accounts, no server, no sync, no analytics, no merge-mode
  import, no file attachments (model reserved).

## Environment

`npm`, `node` and `gh` are **not on this shell's PATH**:

```bash
PATH="/c/Program Files/nodejs:$PATH" npm test
```

`gh` needs its full path: `"C:/Program Files/GitHub CLI/gh.exe"`.

- `npm test` — Vitest. Node is the default environment; component tests opt into `jsdom` with a
  per-file `@vitest-environment` pragma. There is no lint or type-check script.
- `npm run build` — production build.
- **Dev server: use the preview/browser tools, never Bash.** `.claude/launch.json` defines
  `mi-cuaderno-dev`.
- Pushing to `main` deploys to GitHub Pages automatically. **Push only when asked.**

## Verifying in the browser

Tests are not enough for anything the owner can see; the project's habit is to check the running
app and say so in the report.

You do **not** need the real 22 MB dictionary. Write fixture entries straight into
`mi-cuaderno-ref-a` and set `localStorage["mc-ref-active"] = "a"` — see `src/test/dictFixture.js`
for the store shapes, and Phase 3c/4d in `DECISIONS.md` for how this has been done before. Seed
personal items directly into the `mi-cuaderno` Dexie database the same way.

Check the phone case: **375 px viewport, no horizontal overflow.** Phone is the primary device.

## One habit worth keeping

When a test passes, ask whether it *could* have failed. Two bugs in this project were checks that
could not fail in the case they existed to catch (Phase 2g's licence assertion; the Phase 4c
navigation test, which passed against a deliberate break because it raced the async handler).
Break the thing on purpose, watch the test go red, then put it back.
