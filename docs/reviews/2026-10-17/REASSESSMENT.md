# Mi Cuaderno, reassessed

Read-only review of `main` at `35cda8e`, 2026-10-17, by Claude Code on the XPS, with four
independent Codex reviews ([`codex/`](codex/)). Requested by the owner: assess the project's
organization now that it has grown, and check whether following the brief has led anywhere that
should be reconsidered.

**Status: findings, not approved work.** Nothing here authorizes implementation. Each change goes
through the normal plan-first agreement in [`docs/AGENT-GUIDE.md`](../../AGENT-GUIDE.md). The
first batch of fixes is written up as a work order in [`STEP-1.md`](STEP-1.md). Line numbers refer
to `35cda8e`; check the current code before acting.

**Owner response, 2026-10-17.** The owner replied on feature growth and on the ideas file.
[Section 15](#15-owner-response-2026-10-17) records the reply. It withdraws the usage review and
the friction-first advice, and those places are marked below. Where the report and section 15
differ, section 15 wins.

The app is in better shape than most first projects. The architecture is sound, all 1,816 tests
pass, and the data-safety rules have done their job. What has not scaled is the writing around the
code. The brief, the README and the decision log have each turned into a running history that every
session has to read through to find out what is true today. In a few places that history is now
steering the product more than the owner is.

## The short version

1. **Keep the foundations.** Separate databases for personal notes and the dictionary, stable IDs
   for personal words, export-first upgrades, ñ-safe search, the event log as the record of
   learning, and plan-first with owner approval. These were the brief's best calls.
2. **The brief is no longer a brief.** It is five times its original size, with 62 crossed-out
   passages and the acceptance criteria of more than 20 phases. Freeze it as history. Replace it
   with a short product description the owner owns and a separate description of how the app is
   built today.
3. **"What is true now" lives in too many files, and they disagree.** The README is 96% status
   history. Six direction documents still say work is "not deployed" (or not even planned) when
   it shipped long ago. The agent guide contradicts itself about dictionary attachments. One short
   current-state file would fix this.
4. **Some brief rules were stretched past what they say.** "Events are the source of truth" became
   "cache nothing." "Plan each phase" became "plan before any code." "One line per decision"
   became 83,000 words that mix decisions with deploy logs. "Two content types" became a goal in
   its own right: a Diario entry is now defined by what a page lacks.
5. **After mid-August, most new features came from agent-written idea lists** rather than from
   friction met while using the app. Many were built to leave no trace, so nothing shows which ones
   are used. Worth checking before guided lessons adds another large area.
   *Owner response: growth by experiment is intended, and checking usage is low priority. See
   section 15.*
6. **Several bugs are confirmed. The most serious one was reproduced:** two ordinary Grammar edits
   can leave the notebook unable to export a backup. None of the fixes needs a schema change.
7. **Cheapest high-value fixes:** make the deploy run the tests, fix the backup-blocking bug, add
   an emergency "rescue export," and make item saves all-or-nothing.

## 1. How this was checked

- Read the whole brief, the agent guide, both tool entry files, the README, the decision log's
  structure and recent entries, a sample of phase documents from early to late, the
  improvement-ideas file, the guided-lessons plan, and the git history.
- Ran the full test suite once on the XPS: **148 files, 1,816 tests, all passing, 411 seconds**
  one file at a time.
- Ran four independent Codex reviews in a read-only sandbox: code architecture, brief and process,
  data model, and repository hygiene. Their main claims were checked against the files before
  being included here. Where they were not, this report says so.
- Reproduced one bug in a throwaway in-memory test outside the repository (see `STEP-1.md`).
- No owner browser data or `private-data/` file was opened.

## 2. What is working and should stay

- **Two layers, one seam.** Personal notes and the dictionary live in separate databases. A
  dictionary rebuild cannot touch personal words, and the A/B install checks every chunk before
  switching. This is the strongest design decision in the project.
- **Personal words own their meanings.** Each meaning has its own ID, independent of dictionary
  sense order, so a dictionary update cannot quietly redefine what the owner wrote.
- **Safety around upgrades.** Export first, validate before restoring, never export the API key.
  These caught real problems, including the 2026-08-14 upgrade gate failure.
- **Measuring before deciding.** The Phase 0.5 spike, dropping Jehle after a 57,580-cell
  comparison, and stopping Phase 25b when the data failed its quality check. The process
  encouraged this, and it should keep doing so.
- **Tests that test behaviour.** Real database code in memory, roughly 1,800 role-based queries, no
  snapshot tests, and the habit of breaking code on purpose to prove a test can fail.
- **The dictionary pipeline.** Numbered steps, one shared `normalize.js`, and a verifier that checks
  the chunks that actually ship.
- **One palette file.** Every colour goes through tokens in `src/index.css`. No hard-coded colours
  in components.
- **Honest reports.** Agents say when they did not see the app and leave the owner's phone check
  marked pending.

## 3. The brief: what it became

On day one the brief was 202 lines and 20 KB. It is now 1,154 lines and 104 KB, changed in 43
commits. The "last amended" line alone carries eleven crossed-out dates. Section 12 (phases) is 37%
of the document. Section 10 restates the upgrade rules for every schema version from 1 to 12, and
its backup example still shows version 5.

The cause is a rule in the brief itself: amendments are written as strikethrough plus replacement
"so the original stays readable." Combined with the guide calling the brief "the contract," every
phase amended the contract instead of updating a description of the present. Git already keeps
that history. Keeping it inside the file means every reader pays for it every time.

The brief has also stopped being readable by the owner. Section 2 asks agents to explain things in
plain language because the owner is learning. The brief now reads like this: *"a disposable 375×812
numerical closeout finds no horizontal overflow or console warning/error."* It has become a
document agents write for other agents.

### Rule by rule

| Rule | What happened | Verdict |
|---|---|---|
| **Two layers, one seam** (§5) | Held up and protects the owner's data. | **Keep** |
| **ñ is its own letter** (§8) | Held everywhere except one conjugation helper (bug 5). | **Keep** |
| **Events are the source of truth; no stored "struggling" flag** (§7) | Widened by agents into "no state flags, derive everything at render, nothing cached" (guide line 62; an early decision says recomputing is "free"). Separately, many features were specified to write no events at all, so nothing records whether they are used. | **Keep, narrow it.** Allow throwaway caches. Allow events that record feature use. |
| **Exactly two personal content types** (§7) | Pages absorbed a focus setting, three optional structures, a Notes outline, and two Diario-only fields stored on every page. A Diario entry is "a dated page with no structure and an empty outline," so adding an outline moves an entry out of Diario. The ideas file tries to fit a prompt store into preferences to avoid a third type. Guided lessons will need a store of their own. | **Revisit the wording, not the data.** "Two kinds of notebook content" can stay; it should not forbid supporting stores. |
| **Every personal schema change: migration, version bump, export-first gate** (§5, amended 2026-08-04) | An owner-approved amendment, not agent drift. Result: 12 versions in six weeks. Several only add an empty field (`noteSections: []`, `feedback: null`, `apuntes: null`) and one changes nothing. Each still costs a migration, a backup upgrade step, a validator, tests, a brief amendment and an export on the phone. | **Keep, narrow it.** Full ceremony for changes that transform data; a lighter path for purely additive fields. |
| **Propose a plan per phase and wait** (§2) | The guide broadened this to every code change and says so. Each phase also got a Direction and a Report document: 42 files, 432 KB. | **Keep, narrow it.** Approve a bounded scope once; small fixes inside it go ahead. Archive phase docs when done. |
| **DECISIONS.md: one line, date, reason** (§2) | 958 entries, median 76 words, many with test counts, CI run numbers and deploy confirmations. 322 of 472 commits touch it. | **Keep, narrow it.** Decisions only; release evidence goes elsewhere. |
| **Phase 4: polish driven by friction from daily use** (§12) | Most later phases started from agent-written idea lists instead (section 6). | **Withdrawn by the owner** (section 15). Was "Bring it back." |
| **Each phase ends usable, with "Done when" criteria** (§12) | Grew into a fixed closing ritual: full suite, build, diff check, phone-width browser check, push, and a separate "record deployment" commit. | **Keep, automate it** |
| **The prototype is the reference for look and feel** (brief header) | The guide and README call it historical. The brief's header still calls it the reference. Two authorities disagree. | **Archive it** |
| **No router** (Phase 5 direction, owner-approved) | Partly reversed on 2026-08-18. Navigation is now hand-built in `App.jsx` and `navigation.js`. Not wrong, but an example of a short-term simplification becoming a long-term constraint. | **Label limits like this** "temporary, revisit when…" |
| **Non-goals** (§13: no server, accounts, sync, analytics) | Held. | **Keep** |

Several restrictions in the brief were owner decisions, recorded properly. The issue is not that
agents ignored the owner. Release-scope choices like "no new event, no preference, no schema
change" were repeated so often that they started to read as permanent principles.

## 4. Documentation and records

| File | Size | ≈ tokens | Role today |
|---|---:|---:|---|
| `DECISIONS.md` | 558 KB | 140k | Decisions, work log and release log combined |
| 42 `PHASE-*.md` | 432 KB | 108k | Plans and reports, some with stale status lines |
| `docs/IMPROVEMENT-IDEAS.md` | 145 KB | 36k | 35 active ideas, no short priority list |
| Brief v3 | 104 KB | 26k | "The contract," plus its whole history |
| `README.md` | 97 KB | 24k | Status is 1,073 of its 1,113 lines |
| `docs/AGENT-GUIDE.md` | 21 KB | 5k | Shared rules, plus machine-specific recipes |

The required reading order sends every session through the guide and the README, then a phase
report: about 30,000 tokens before any code. A cross-cutting change adds the brief. The decision
log is too large to read at all, so it can only be searched. On 2026-08-02 an earlier documentation
refresh set out to remove a 148 KB reading burden. The burden has since come back.

### Places where the documents disagree with each other or with the code

- `docs/AGENT-GUIDE.md` line 74 describes `dictKeys[]`; line 91 still describes a single optional
  `dictKey`, which the code now rejects.
- The guide's Diario rule leaves out the Notes-outline condition that the brief and `pageKinds.js`
  include.
- The direction docs for Phases 18, 20, 22, 26 and the Transform lane still say "not pushed or
  deployed." `DIARIO-TALLER-DIRECTION.md` still says Taller is "not yet planned or implemented."
  The README records all of them as deployed. The ideas file still lists Taller as "Ready to plan."
- The README sends agents to "Phase 4, ongoing maintenance," whose report stops around schema 5.
  The latest release is at the bottom of the README, at schema 12.
- The dictionary is described as 22 MB in several places. It is now 25 MiB (4.1 MiB compressed).
- Commit `6e3fbad` had to correct the schema version in the guide, and the 2026-08-11 status sweep
  fixed three releases missing from the README.

The root cause is that the same fact is copied into several files. Adding more "remember to update
X" rules has not worked and will not. Each fact needs one home, and every other place should link
to it.

### A leaner structure

```text
README.md               What the app is, how to run it, link to CURRENT
AGENTS.md / CLAUDE.md    Thin tool entry points (as now)
DECISIONS.md            Kept as is, plus an index at the top; new entries are decisions only

docs/
  README.md             Map: current / proposed / history
  CURRENT.md            Last release (commit, date), schema, active work, pending checks
  PRODUCT.md            What the app does and why, in plain language. The owner owns it.
  ARCHITECTURE.md       Data model, seams, invariants, module map, as they are today
  AGENT-GUIDE.md        Shorter: rules and read order only
  agents/               Machine and browser recipes (Windows, XPS, verification)
  work/                 One file per approved piece of work while active
  ideas/                Short ranked backlog; detail files only for big ideas
  history/
    brief-v3.md         Frozen, untouched
    phases/             The 42 phase docs and lane directions
    prototype/          mi-cuaderno.jsx
    design-qa/          The root-level QA images and notes
    RELEASES.md         One line per deploy: date, commit, CI run, checks
  guided-lessons/       As now
```

New read order: guide → `CURRENT.md` → the relevant part of `ARCHITECTURE.md` and the code → the
decision log only when the reasoning is needed. Do not turn the 958 old entries into 958 files;
index the important ones and move on. Put a plain-language summary at the top of each current
document so it serves the owner as well as the agents.

## 5. Working process

- **The deploy does not run the tests.** `deploy.yml` installs, builds and publishes. The 7-minute
  test suite runs only when an agent remembers, on whichever machine it is on. Adding `npm test`
  before the build is the single cheapest safety improvement available.
- **Recording a deploy causes another deploy.** 34 commits are documentation-only "record
  deployment" entries, and every push to `main` redeploys. Record releases once, in one file, and
  skip deploys for documentation-only pushes.
- **Two machines and two agent tools in one checkout.** The rules in the guide came from real
  incidents and help. Add "one agent writes at a time" and a one-line handoff (machine, branch,
  unpushed commits, pending checks).
- **The skills copy has already drifted.** `.claude/skills/` contains a nested `skills/skills/`
  duplicate. The documented `cp -r` command produces exactly this when run a second time. Replace it
  with a small sync script that is safe to repeat.
- **No lint or type checks.** For a codebase written mostly by agents, these are inexpensive extra
  reviewers. Codex found a missing React hook dependency in `Cuaderno.jsx` (line 325) that the
  standard React Hooks lint rule flags automatically.
- **"Verify visually by the numbers"** checks overflow and layout, not whether something looks or
  feels right. The owner's phone check is the real acceptance. Keep recording it as pending until
  it is done, as the agents already do.
- Commit messages mix two styles (103 prefixed, 363 not). Low priority; pick one.

## 6. How features got chosen

| Week of | 27 Jul | 3 Aug | 10 Aug | 17 Aug | 24 Aug | 31 Aug | 7 Sep | 14 Sep–5 Oct | 12 Oct |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Commits | 51 | 161 | 157 | 38 | 56 | 2 | 5 | 0 | 2 |

Phases 5 to 26, plus the Gym lanes, Taller and Diario work, shipped in about four weeks. Their
"Origin" lines show where they came from: "the post-Phase-22 brainstorm," "the owner asked how the
notebook could derive more connections, selected the first three recommendations," "the owner
reviewed a survey of drill ideas." Friction from real use, which the brief made the engine of
Phase 4, appears much less often. Phase 19's Grammar hierarchy is one clear example of it.

The result is a large feature surface: Leitner review, free practice, Similar-meaning recall, a
Conjugation Gym with Forms, Usage, Endings, Contrasts, Transform and Choose, Taller, AI feedback on
Diario, Historia, Pasear, "Mentioned here," "Seen together," and more. Each one adds rules the code
has to protect. Many were specified to write no events, so the app cannot tell the owner which ones
are used. Meanwhile the guide's opening line says "simplicity and durability beat features."

*Owner response: the owner prefers to add features, try them and remove them later if needed,
rather than wait for friction. The usage review below is withdrawn as a step. See section 15.*

Before guided lessons adds another large area, do a usage review. The owner enjoys brainstorming,
and the brief says so; this is not a reason to stop. It is a reason to check what is used. The
simplest version is a list of features marked "weekly," "tried it" or "never." The data version is
to let an agent count views, reviews and drill events in a backup snapshot (with permission, as the
guide requires). Then hide or retire what is unused. A smaller surface means fewer rules to keep
correct. The brief already allows new local event types, so a local-only "opened this feature"
event would not break the no-analytics rule. Whether to add one is the owner's call.

## 7. Code organization

About 44,000 lines of app code and 36,000 lines of tests. No import cycles. Of 95 component files,
38 call database functions directly, almost always through named operations like
`saveGrammarExample`. That is reasonable at this size.

### Flat folders named by history

All 95 components sit in one folder and 70 helper modules in another. Names record the past:
`CollectionPage.jsx` is now the whole page workspace (the name dates from the Collection-profile
era), `GeneralPageDetail` has no callers, and `pageProfiles.js` calls itself a "temporary
compatibility surface… during the Phase 7 refactor." Gradually grouping files by feature would help
both the owner and agents find things:

```text
src/features/  pages/  lexical/  diario/  repaso/  gym/  dictionary/  lessons/
src/ui/        shared buttons, sheets, markdown, tokens
src/db/        storage and migrations (as now)
```

Do this when files are already being touched, not as one big move. Start with guided lessons, which
has no code yet.

### Large files with clear seams

| File | Lines | Where to split |
|---|---:|---|
| `Detail.jsx` | 1,335 | Heading editor, examples, media links, relationships; drop the unused page branch |
| `CollectionPage.jsx` | 1,286 | Its Connections, Media and Vocabulary sections already exist as separate pieces; move them out and rename the file |
| `GrammarSection.jsx` | 1,204 | Section editor, example editor, organizer |
| `ConjugationGym.jsx` | 930 | Setup, lanes, performance |
| `App.jsx` | 785 | Browser-history handling and study-session guards (about ten refs coordinate them) |

### Data loading

- `useNotebook` reloads every item and every event after each change. That is fine at the current
  size; measure before changing it. Drill events will keep growing.
- If that load fails, there is no error state. The app would show "Opening your cuaderno…"
  indefinitely.
- `reload()` returns before fresh data arrives, so code that writes `await onChanged()` does not
  actually wait for it. Some editors close before the save finishes and lose the draft if it fails.

### Tests

The tests are a strength. Split the largest files (`App.test.jsx` is 72 KB) by feature, and add a
small real-browser smoke test for startup, offline use and app updates, which the current tests
cannot see. Running one file at a time is a reasonable choice and can stay.

### Version number

`package.json` has said 0.1.0 since day one, so the About screen and every backup report "0.1.0."
Show the build's commit instead, so the owner can tell which version the phone is running.

## 8. Bugs found

"Confirmed" means traced in the code by Claude Code; "reproduced" means also made to happen. None of
these needs a schema change. Details, evidence and suggested fixes for items 1–8 are in
[`STEP-1.md`](STEP-1.md).

| # | What happens | Status | Impact |
|---:|---|---|---|
| 1 | **Two pages whose Grammar examples cite each other's Source captures cannot be backed up.** When page B cites page A, `ensureOutgoingPageConnection` (`pageStructures.js`:87) removes A's link to B, which A's own example depends on. Export then fails with "sourceCaptureRef.pageId must also be an outgoing page link." | **Reproduced** | Rare, but it disables disaster recovery |
| 2 | **One failed validation blocks every export path:** normal export, the safety export before a restore, and the export required before an upgrade. This already happened once: `5fcfd8e` (2026-08-14) fixed the v8→v9 upgrade gate failing on valid parts of speech. In Ajustes the failure is also silent: `handleExport` has no error handling, so no file and no message appear. | Confirmed | Will recur as rules tighten |
| 3 | **Saves are not all-or-nothing.** `createItem` and `updateItem` (`items.js`:210, 230) write the item, then the event, separately. If the second write fails, the screen says "Couldn't save" although the item exists. Retrying in Diario can create a duplicate. | Confirmed | Rare, confusing |
| 4 | **Repaso shows yesterday's queue if the app stays open overnight.** "Today" is fixed when the review state is computed and only recomputed when data changes (`Repaso.jsx`:205, `review.js`:193). | Confirmed | Likely on a phone |
| 5 | **The conjugation analyzer strips ñ.** `withoutWrittenAccents` (`conjugationPatterns.js`:272) removes every combining mark, including the tilde, for pronominal gerunds and commands, so "bañándose" becomes "banando." Shared with the pipeline. | Confirmed | Limited to ñ verbs |
| 6 | **English searches containing a common word find no dictionary meaning,** for example "the house" or "in front of." The pipeline leaves stopwords out of the index (`07-package.mjs`:178), but the search requires every word to be found (`ref/search.js`:96). | Confirmed | Small |
| 7 | A failed notebook load has no error state (`useNotebook.js`). | Confirmed | Small |
| 8 | Restoring a backup on a new phone copies "storage already persisted: yes," so the app never asks the new browser to protect its storage (`persistence.js`:13). | Confirmed | Matters when changing phones |
| 9 | A backup reads items, events and preferences as three separate reads (`backup.js`:55) rather than one consistent snapshot. | Confirmed | Small |
| 10 | The dictionary downloader accepts a half-downloaded file as cached and reuses an old checksum when the file size matches (`01-download.mjs`:38, 59). | Confirmed | Next dictionary rebuild |
| 11 | Installing or removing the dictionary in Ajustes does not refresh a search still open in Cuaderno. | Codex only, not checked | Small |

## 9. Data layer and dictionary

- **Keep the stored shapes.** Composable pages serve a real need (a book page with passages,
  vocabulary and grammar together). The cost is in the code that coordinates them, so reorganize
  code before considering any storage change. Nothing found justifies a migration now.
- **Make validation two things.** One validator for "is this safe to write today," and a separate,
  frozen set of rules for "can we accept this old backup." Today's rules applied to old data are
  what caused the 2026-08-14 gate failure.
- **One migration list.** The twelve upgrade steps are declared in the database file and again,
  step by step, in `backup.js` (938 lines). One registry used by both would make the next change
  cheaper.
- **Add frozen example backups** for old versions, written once and never generated from today's
  test factories.
- **Before the next dictionary rebuild:** the alias map that lets old dictionary links follow
  renamed entries is currently empty (`previousIds = {}`), and the build check assumes no entry IDs
  change. That is fine for additive rebuilds, but a real upstream refresh needs an ID-difference
  report and a source lock file first.
- **Keep the dictionary in git for now.** Four revisions add only about 11 MiB to the repository's
  history. Revisit this if rebuilds become frequent.

## 10. Repository tidy-up

- `design-qa.md` and three JPGs sit at the root and point to Windows paths. They were committed
  inside an unrelated feature commit ("Show Taller practice targets in Diario"), which suggests
  agents stage every changed file. Move them to `docs/history/design-qa/` and have agents stage
  files by name.
- Eleven remote branches and one local branch are fully merged; the scratch worktree
  `.claude/worktrees/happy-matsumoto-c9fc2b` is still registered. Delete them after a quick look.
- Guided lessons links its research reference to a pinned commit on an unmerged branch. If that
  branch is ever deleted, the link can eventually break. Copy the reference into
  `docs/guided-lessons/research/`.
- No Node version file and no `engines` field. CI uses Node 24; write that down once and use it in
  both places.
- `pipeline/spike/out/` (1.15 MiB) is Phase 0.5 history. Label it as such.
- There is still no LICENSE file; the decision has been deferred since 2026-07-30. A public
  repository without a license means "all rights reserved." Decide what is wanted.

## 11. Guided lessons

Keeping it separate is right. Its README is short, it distinguishes drafts from approved work, and
its plan already handles the hard questions well: lessons are replaceable reference content, saving
to the notebook is always explicit, owner writing survives lesson revisions, and lesson IDs are
separate from content versions. To keep it from repeating the main project's document sprawl:

- **Split `PLAN.md` (399 lines) before any code:** a `SCOPE.md` for what the experience is, an
  `INTEGRATION.md` for storage, backup, navigation and media, and the existing `chapters/` folders.
- **Keep a short decision list inside the folder.** Only decisions that affect the whole app go to
  the main log.
- **Settle storage first, and use it to fix the two-types wording.** The plan's preferred option, a
  separate store for lesson drafts and progress, is a supporting store, not a third kind of notebook
  content. Say so in the new product document instead of amending the old brief again.
- **Build the player in its own folder with a development-only preview,** so the 1917 chapter can be
  tried before any schema change, as the plan suggests.
- **Check the offline cache before adding images.** The current service-worker config caches every
  PNG and SVG on install. Lesson images would be downloaded on install unless they are excluded the
  way the dictionary is.
- **Write these documents for the owner first.** The owner will read them more than the agents will.

## 12. Suggested order of work

| Step | Work | Size |
|---|---|---|
| 1 | **Safety.** Run tests in the deploy workflow. Fix bug 1 and add the rescue export. Make saves all-or-nothing. Fix the overnight queue, the ñ helper and the English stopwords. See [`STEP-1.md`](STEP-1.md). | About a week of agent time |
| 2 | **Documentation reset.** Create `CURRENT.md` and `docs/README.md`. Slim the README. Move phase docs, the prototype and design QA into history. Fix the contradictions in section 4. Add an index to the decision log and a separate release log. Move machine recipes out of the guide. | 2–4 days |
| 3 | **Contract reset, with the owner.** Write `PRODUCT.md` in plain language, and `ARCHITECTURE.md` describing the app as it is. Decide the questions in section 13. Freeze brief v3 unchanged. | 2–3 sessions |
| 4 | **Usage review.** Mark each feature keep, hide or retire before starting lessons. *Withdrawn by the owner (section 15).* | — |
| 5 | **Code tidy-up as files are touched.** Add a lint check. Remove dead compatibility code. Split the five large files. Group files by feature, starting with lessons. Make `reload()` awaitable. | Ongoing |
| 6 | **Guided lessons,** using the lighter document structure from the start. | — |

Steps 1 and 2 are independent and can run in parallel. Step 3 depends on the owner's answers.
Effort figures are rough, for agent-driven work.

## 13. Calls only the owner can make

1. Does "two content types" cover only notebook content (things the owner writes and organizes),
   or every kind of stored record?
2. Should being a Diario entry be the owner's choice, or keep following from a page's structure?
3. Should a purely additive optional field still require a version bump and an export on the phone?
4. What size of change needs a written plan first, and what can go ahead inside an approved scope?
5. Should there be a local "opened this feature" event, so the app can show what is used?
   *Low priority for the owner (section 15).*
6. Which features are used? Which should be hidden or retired? *Low priority for the owner
   (section 15).*
7. Which license, if any, for the code?

Steps 1 and 2 are safe to start without any of these answers.

## 14. Numbers behind this

**Repository and history**

- 472 commits from 2026-07-30 to 2026-10-17; 316 touch `src/`; 142 (30%) touch only documentation.
- `DECISIONS.md` changed in 322 commits, the README in 130, the brief in 43, the guide in 21.
- 34 documentation-only "record … deploy" commits.
- 497 tracked files, about 32 MiB; `public/dict/` is 25 MiB of that; `.git` is about 25 MiB.
- 12 merged branches (11 remote, 1 local), 1 unmerged research branch, 1 stale worktree.

**Code and tests**

- App code: components 26,876 lines (95 files), helpers 11,322 (70), storage 4,553 (15).
- Tests: 146 files in `src/` plus 2 in the pipeline, 35,985 lines; 1,816 tests pass in 411 s run one
  file at a time.
- Schema went from v1 to v12 between 2026-07-31 and 2026-09-10; the stores and indexes never changed.
- About 1,600 inline style objects and 2,500 class lists. That is consistent: tokens for colour,
  Tailwind for layout.

**Documents**

- Brief: 202 lines / 20 KB at first commit, now 1,154 lines / 104 KB; 62 strikethrough passages;
  §12 is 37%.
- README: 1,113 lines, Status 1,073 of them.
- DECISIONS: 83,552 words, 958 entries, median 76 words each.
- 42 phase documents (432 KB) plus 6 other direction docs at the top of `docs/`.

## 15. Owner response (2026-10-17)

The owner read the report and commented on two points. This section records what they said and
how it changes the report. Where the two differ, this section wins.

### Feature growth and friction

In the owner's words:

> I am ok with feature growth. I would rather add features, use them, experiment, and if needed
> remove later than wait until a friction proves they are needed. The friction requirement was an
> agent item added to the brief (and worth tracking), but is not an absolute requirement for me.
> Since this is only a personal app, I see it more as experimental than something that needs to be
> safe/steady and only growing if necessary because I think that would be too limiting for me to
> explore potential new features that may not come up by always waiting for a friction. So the
> friction stuff and tracking/removing features is not a big concern for me. I'm not against it, but
> its not a high priority at this point.

What this changes:

- **Withdrawn:** the usage review (step 4 in section 12), the advice to check usage before guided
  lessons (section 6 and point 5 of the short version), and the "Bring it back" verdict on
  friction-driven polish (section 3). Friction from real use is one source of ideas, not a
  condition for building something.
- **Low priority:** questions 5 and 6 in section 13. A local "opened this feature" event stays
  available if the owner ever wants one.
- **Still applies:** every feature adds rules the code has to keep correct. Trying a feature and
  removing it later works best when removal is cheap. Two parts of the report help with that: the
  test gate (Step 1, item 1, now done) and grouping files by feature (section 7 and step 5).
- **Wording that still points the other way:** brief §12 says Phase 4 is "driven by a running list
  of friction the owner collects while using the app daily," and the agent guide opens with
  "Simplicity and durability beat features." Agents read both and may resist new features because
  of them. Until the contract reset (step 3), this section and its `DECISIONS.md` entry record the
  owner's position. `PRODUCT.md` should then state it in the owner's own words.

### The ideas file

In the owner's words, about [`docs/IMPROVEMENT-IDEAS.md`](../../IMPROVEMENT-IDEAS.md):

> The ideas log was meant to record feature ideas, the reasoning behind them, the potential
> benefit/use, and an estimate of what it would take to do. So it was the idea + context +
> additional context if the agent and I discussed an idea further.

Measured against that purpose, it should stay one file. Its entry format already fits: each idea
has its description and context, expected value, risks, evidence, timing and later discussion.
What needs work is around the entries. These are suggestions, not approved work, and they replace
the `ideas/` line in the structure proposed in section 4.

- **Move the history out.** Of the file's 145 KB, 79 KB is active ideas. The file's own "Document
  history" takes 30 KB and repeats what git and `DECISIONS.md` hold. The bodies of implemented
  ideas take 23 KB. Move both to history, and keep one index row for each implemented idea with its
  link.
- **Add the missing effort estimate.** The template has no field for what an idea would take, and
  only a few entries mention cost in passing. Add two lines to each idea: *Size* (small: an
  afternoon; medium: a session or two; large: a phase) and *Touches* (screen only, a new setting,
  a new event, or a schema change). Agents can draft both for the owner to check.
- **Add the owner's interest to the index.** 28 of the 35 active ideas have an "Owner interest"
  line, but 18 of those record how the idea got onto the list ("Requested with the rest of the
  consolidation batch," "Asked to retain for later"), not how much the owner wants it. An index
  column with three values (want soon, curious, someday), set only by the owner, gives the ranking
  section 4 had in mind: by the owner's interest, not by evidence.
- **Move out the entries that are not ideas.** "Candidate future data sources (survey)" is
  reference research, and "Phase 19/20 review nits (edge polish)" is a polish list.
- **Keep status simple:** idea, in progress, or done with a link. Deploy status belongs in the
  single current-state file (section 4). The file still lists Taller as "Ready to plan" and the
  Contrasts lane as "not yet deployed," and both have shipped.
- **Treat evidence notes as notes, not gates.** The file's rule "Add real-use evidence before
  promoting a data-dependent idea into a phase," and the six discussion points in its index that
  wait for real use or real data, should hold only where a feature needs data to work at all. For
  example, a time-boxed session of the "weakest" words needs enough review history to pick them.
- **Keep the graduation path.** When an idea is worked out in detail, it already moves to its own
  direction document, as Taller did.

Moving the history out fits step 2 (documentation reset). The interest column needs the owner.
