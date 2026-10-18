# Codex review — repository hygiene and tooling

> Independent read-only review by Codex (OpenAI Codex CLI), run on the XPS on 2026-10-17 against `main` at `35cda8e`, as one of four inputs to [the reassessment](../REASSESSMENT.md). The text below is the review verbatim, except that absolute file links were rewritten as repository-relative links and trailing whitespace was normalized. Its findings were spot-checked by Claude Code before use; see the reassessment for which were confirmed. It describes the code as it was at `35cda8e`.

The repository’s main weakness is **the amount of manually synchronized project state**, followed by **a deployment workflow that does not enforce the project’s own test gate**. Git storage is currently a smaller problem. The dictionary dominates the checkout, but its history has not made this a large repository.

The brief and phase process have preserved valuable reasoning, data-safety boundaries, and verification evidence. The reassessment should retain those benefits while separating current instructions from historical records and replacing repeated bookkeeping with a few automated checks.

This audit examined `main` at **`35cda8e`**, dated 2026-10-17. I made no changes and ran no tests, builds, installations, servers, or pipeline scripts. I did not inspect private data, backup JSON files, or `.claude/worktrees/` contents. Branch findings describe locally recorded refs; no fetch was performed. Test results mentioned below are repository records, not independently verified results from this audit.

**The measured repository is modest; the onboarding burden is substantial.** These counts come from `git ls-files`, `git log`, filesystem sizes, and read-only Git object inspection:

| Measurement | Observed result |
|---|---:|
| Tracked files | 497 |
| Tracked working-tree contents | 32.0 MiB |
| Current `public/dict/` | 25.0 MiB, about 78% of tracked bytes |
| Local `.git` directory | Approximately 25 MiB |
| Git object storage | 15.41 MiB packed; 8.00 MiB loose |
| Commits reachable from `main` | 472, including one merge |
| Tracked files directly under `docs/` | 54; 58 including subfolders |
| README | 1,113 lines; 13,226 words |
| DECISIONS | 83,552 words; approximately 545 KiB |

The important distinction is between **storage cost**, **navigation cost**, and **maintenance risk**. Several small files deserve relocation because they confuse authority or navigation. The largest files deserve a deliberate delivery policy, but not necessarily immediate removal.

**Deployment currently trusts agent procedure more than executable checks.** The sole tracked workflow runs `npm ci`, then `npm run build`, and publishes the resulting artifact. There is no test step or pull-request trigger. This directly bypasses the guide’s complete serial-suite acceptance gate. See [deploy.yml:3](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/.github/workflows/deploy.yml#L3), [deploy.yml:28](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/.github/workflows/deploy.yml#L28), and [AGENT-GUIDE.md:124](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/AGENT-GUIDE.md#L124).

This is a high-confidence delivery gap, not evidence that the deployed application currently fails tests. Its concrete consequence is that a green deployment establishes compilation success without establishing that migration, backup, or interaction tests passed on that commit.

The minimal improvement is to insert `npm test` before the build. Preserve the configured serial execution. Then add validation on pull requests, with publishing restricted to `main`. The existing package verifier also provides a useful gate for dictionary-artifact or dictionary-contract changes: it checks the actual shipped chunks, hashes, counts, and lookup behavior ([verify-package.mjs:33](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/pipeline/build/verify-package.mjs#L33)).

Allow **1–3 hours for the minimal gate**, or approximately **half a day including PR validation and the first successful CI run**. Implementation risk is low; previously hidden failures may block deployment, which is the intended result.

Several delivery practices already deserve credit:

- npm caching exists; recommending “add caching” would be inaccurate.
- `npm ci` uses the committed lockfile.
- The build artifact passes to a dependent deployment job.
- Deployment concurrency is controlled.
- Dictionary files are explicitly excluded from automatic PWA precaching and navigation fallback ([vite.config.js:16](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/vite.config.js#L16)).

There is no evidence here that custom build-output caching or a replacement build system would repay its complexity.

**The dictionary should remain committed for now, with a clearer policy for future growth.** The often-repeated “22 MB” figure is historical. Current chunks total **26,216,439 bytes**, or approximately **25.0 MiB raw**, and the package report records **4,262,074 bytes gzipped**, approximately **4.06 MiB** ([07-package-report.json:21](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/pipeline/out/07-package-report.json#L21)). The gzip figure is package output metadata, not a network measurement from this audit.

`git log --stat -- public/dict` shows four named dataset revisions across five commits:

| Commit | Dictionary change |
|---|---|
| `1387436` | Initial package, 14 chunks |
| `66db7ad` | r2, with conjugations derived from kaikki |
| `51d67b2` | r3, adding verified conjugation families |
| `a3a6e5b` | Corrections to r3 and removal of remaining r2 files |
| `0ed22fc` | Enriched r4, 16 chunks |

Across recorded refs, dictionary history contains **67 distinct blobs**, totaling approximately **95.1 MiB uncompressed**, but only **11.1 MiB of locally stored blob payload** after Git compression and deltas. Thus, “four revisions means roughly 100 MB added to every clone” would be misleading.

A fresh full clone’s Git transfer should be understood as being on the order of **tens of MiB**, not hundreds, based on this checkout’s object storage. Exact transfer size was not measured and will depend on server packing and requested history. Deleting dictionary files in a future commit would reduce checkout size but would **not remove their existing history from ordinary full clones**.

The alternatives have different costs:

| Approach | Assessment |
|---|---|
| Keep committed packages | Best current tradeoff: simple deployment, exact released bytes preserved, no additional download dependency during deployment. |
| Versioned release asset | Best future alternative if revisions become frequent or substantially larger. CI could download a pinned, checksum-verified package and place it into the same Pages artifact. GitHub supports release assets for distributing packaged files. [GitHub releases documentation](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) |
| Build the dictionary in every deployment | Poor fit currently: mutable source URLs, substantial intermediate processing, and loss of the distinction between rebuilding the app and refreshing its reference data. |
| Separate data repository | Useful only if dictionary maintenance develops an independent lifecycle. Otherwise it adds coordination without eliminating storage. |
| Git LFS | Not a drop-in improvement for this Pages setup. GitHub documents a Pages limitation, and additional materialization/delivery handling would need validation. [GitHub LFS documentation](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage) |

My recommendation is to retain the current package, record this decision, and reconsider external assets when measured growth or release frequency warrants it. A future release-asset implementation would be roughly **1–2 days**, with medium delivery risk. History rewriting would add disruption across both machines and existing refs without a compelling present benefit.

**Input provenance needs attention before any move toward automated dataset rebuilding.** Source URLs include changing download endpoints and repository `master` paths ([sources.json:10](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/pipeline/sources.json#L10), [sources.json:29](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/pipeline/sources.json#L29)). Full download metadata is written into ignored `pipeline/raw/_manifest.json`; the tracked attribution report displays abbreviated hashes ([01-download.mjs:4](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/pipeline/build/01-download.mjs#L4), [DATA_SOURCES.md:23](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/DATA_SOURCES.md#L23)).

More concretely, the downloader reuses the previous checksum whenever the byte size matches:

`prev && prev.bytes === size && prev.sha256 ? prev.sha256 : sha256(dest)`

This occurs after the download branch and therefore also applies to a forced replacement with different content but identical length ([01-download.mjs:59](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/pipeline/build/01-download.mjs#L59)).

That is an observed correctness flaw in provenance recording. I did not demonstrate an affected download, and it does **not** establish that shipped chunk hashes are wrong: those are independently computed.

Recompute checksums after downloads and retain a small, tracked input-provenance record containing full digests, dates, and source identifiers. Preserve retrievable source snapshots outside normal source history where needed for reproducible rebuilds. This is approximately **half a day**, with low implementation risk. It offers more immediate value than relocating the current dictionary.

**Most other tracked artifacts are a placement problem, not a size problem.**

| Artifact | Evidence and assessment | Recommended treatment |
|---|---|---|
| Three root `design-qa*.jpg` files | About 275 KiB combined; introduced by `65200bf` | Retain selected evidence under dated design history. |
| Root `docs/history/design-qa/design-qa.md` | Combines landing-page and Taller QA; references local Windows paths at [lines 5](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/design-qa.md#L5) and [49](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/design-qa.md#L49) | Split or archive by feature/date; use relative links for retained evidence. |
| `pipeline/spike/out/` | Eleven files, 1.15 MiB; all introduced in `f20222a` | Preserve the feasibility report and representative evidence; mark remaining outputs historical. |
| `pipeline/out/` | Eight files, approximately 112 KiB; nine commits touch this directory | Keep. These are small release reports, deliberately committed according to [pipeline/README.md:15](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/pipeline/README.md#L15). |
| `docs/history/prototype/mi-cuaderno.jsx` | Approximately 38 KiB; unchanged since `0077fc1` | Archive as a historical prototype and resolve conflicting authority descriptions. |
| `.agents/skills/` | Eleven files, approximately 17 KiB | Keep useful project adaptations; fix synchronization. |
| `skills-lock.json` | Records origin and upstream content hashes | Keep provenance, but clarify that locally modified skills are not fully described by upstream hashes. |

The prototype has a particularly avoidable ambiguity: README and the guide call it historical, while the brief still calls it a reference for lexical features, interaction patterns, and visual design ([brief:6](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/mi-cuaderno-project-brief-v3.md#L6)). That is an authority conflict, not a stylistic objection.

Archiving selected artifacts should take **2–4 hours**, with low risk apart from broken references. Deleting them solely to save clone space would have little value. The ignored raw-download directories and the separation of personal data from tracked files are appropriate practices to retain.

**The README has become a release ledger presented as current status.** Its Status section occupies lines **14–1085**; development instructions begin at **1098**. The mandatory read order sends every agent into that section, then to the report for the in-progress phase ([guide:16](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/AGENT-GUIDE.md#L16)).

That selection is ambiguous: Phase 4 remains “ongoing maintenance,” while the latest application release appears near the bottom as plural dictionary attachments. The latest planning work is guided lessons. Those are different kinds of current state.

The concrete cost is repeated reading and interpretation. Historical schema values and test counts are legitimate historical evidence, but become hazardous when mixed into a mandatory current-state entry point.

Make README contain a compact introduction, setup instructions, and one current-status block:

- Latest deployed application commit and deployment record.
- Current work and its approved direction.
- Outstanding verification, including the pending owner phone check.
- Links to authoritative schema code and historical releases.

Move completed release narratives into history without discarding them. The pending phone check is currently explicit at [README:1063](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/README.md#L1063); it must survive any condensation.

This is **half to one day**, with low-to-medium risk from link changes or accidentally losing unresolved work.

**The commit history shows useful discipline alongside measurable bookkeeping.** I classified the 471 non-merge commits on `main`, treating a commit as documentation-only when every changed path was under `docs/` or ended in `.md`.

| Metric | Result |
|---|---:|
| Documentation-only commits | 141 — 29.9% |
| Commits touching `src/` or executable pipeline code | 321 |
| Those also touching documentation | 211 |
| Documentation-only subjects containing “deploy” | 55 |
| Subjects matching “Record … deploy…” | 32 |
| Average / median files changed | 6.3 / 4 |
| Average / median added-plus-deleted text lines | 410 / 135 |

Line counts are a poor proxy for effort here: the original spike added 46,127 lines, while large minified dictionary chunks count as individual lines.

The percentage of documentation commits is not itself a defect. Planning and verification records are particularly useful in an agent-built project. The stronger evidence of overhead is repeated recording of the same release state: `DECISIONS.md` changed in **321** non-merge commits, README in **130**, and the guide explicitly requires post-push status synchronization ([guide:145](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/AGENT-GUIDE.md#L145)).

Because every push to `main` triggers deployment, a commit recording a successful deployment is itself eligible to trigger another deployment. I did not count actual workflow executions.

Record release evidence once, keyed by application SHA and workflow run. README should summarize it; DECISIONS should explain consequential choices. Also skip production publication for changes established to affect documentation alone. Keep validation separate: GitHub warns that path-filtered required workflows can leave checks pending. [GitHub required-check documentation](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)

Allow **2–4 hours** for publishing conditions and the revised release convention. Risk is medium if path filters omit real deployment inputs, especially future lesson content.

Commit-message style is mixed: **103 of 471** non-merge subjects use standard lowercase prefixes such as `feat:` or `docs:`; **363** are unprefixed. Clear imperative subjects are already common. Choosing one lightweight future convention would take **30 minutes**, with negligible risk. Historical renaming or elaborate commit enforcement would deliver little owner value.

**Agent onboarding has real drift, despite the sound shared-guide design.** Three examples matter:

- The guide correctly describes `dictKeys[]` at [line 73](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/AGENT-GUIDE.md#L73), but still calls the attachment an optional scalar `dictKey` at [line 91](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/AGENT-GUIDE.md#L91). Runtime rejects that old update shape ([items.js:230](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/db/items.js#L230)).
- Its Journal description omits the structured-Notes exclusion ([guide:84](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/AGENT-GUIDE.md#L84)); the actual predicate includes it ([pageKinds.js:300](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/pageKinds.js#L300)).
- Commit **`6e3fbad`**, “Correct schema version in agent guide,” repaired an already-stale schema paragraph. The current guide and README still duplicate the version and migration chronology, although the authoritative constant is [src/version.js:6](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/version.js#L6).

These are high-confidence discrepancies. The guide’s instruction to verify against source mitigates them, but maintaining contradictory summaries still costs attention and can misdirect implementation.

Keep durable invariants explicit: personal-data protection, export-first migration safeguards, event-derived state, stored-once links, and ñ preservation. Replace mutable numbers and detailed predicates with named source and test references.

Approximately **106 of the guide’s 290 lines** cover environment/checks, shared-checkout Git, machine setup, and browser verification. Much of this records real incidents and remains useful. Move detailed Windows, Linux, browser, and release recipes behind conditional links. Treat tool limitations as dated observations to verify, rather than permanent universal facts.

This cleanup is **half a day**, with low risk if safety rules remain prominent. Preserve the shared-guide architecture; the problem is its accumulating contents, not the decision to centralize instructions.

**A navigable documentation map would help more than a wholesale source-tree reorganization.** There are 42 phase documents among the 54 files directly under `docs/`, and no `docs/README.md`. Phase numbers communicate chronology better than responsibility.

A reasonable target is:

```text
README.md                  introduction, setup, current status
AGENTS.md / CLAUDE.md       thin tool entry points
DECISIONS.md               preserved existing log; index to new decisions
DATA_SOURCES.md             prominent data attribution

docs/
  README.md                map: current, proposed, historical
  AGENT-GUIDE.md            stable entry path; concise shared rules
  agents/                  environment and verification recipes
  product/                 current contract and proposals
  architecture/            data model, identity, backup, dictionary
  decisions/               new substantial decision records
  history/
    phases/
    releases/
    prototypes/
    design-qa/
  guided-lessons/           existing planning/research boundary
```

The folder names are a matter of taste; separating authority and status is the substantive improvement. Start with an index and labels, then move completed material in manageable batches. Preserve the existing decision log rather than spending days converting every paragraph into a formal decision record.

Allow **1–2 days** for grouping and link repair; bulk moves have medium link-breakage risk. The source tree also has large flat directories—162 direct component files and 132 direct library files, including tests—but these counts alone do not justify moving all application code.

**Guided lessons are appropriately located in `docs/` today.** The folder contains planning, research, and chapter drafts, and its README clearly identifies what exists and what remains proposed ([guided-lessons/README.md:3](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/guided-lessons/README.md#L3)). Its separation is healthy.

The existing plan already proposes the eventual division:

- `content/lessons/` for authored production content.
- `src/lib/lessons/` for validation and traversal.
- `src/components/lessons/` for the player and library.
- A development preview using the same player.

See [PLAN.md:215](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/guided-lessons/PLAN.md#L215). Follow that plan when implementation begins. Keep storyboards and research in docs; place executable prototypes or previews in a clearly marked development location. A separate package or repository is not yet justified by the observed structure.

Clarifying this boundary is **1–2 hours** within documentation organization, with low risk; it is not an estimate for implementing lessons.

**Dependency hygiene needs reproducibility and maintenance, not speculative deletion.** The questioned packages all have uses:

| Dependency | Evidence |
|---|---|
| `unbzip2-stream` | Pipeline decompression: [pipeline/lib/io.mjs:6](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/pipeline/lib/io.mjs#L6) |
| `react-markdown` | [MarkdownText.jsx:2](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/components/MarkdownText.jsx#L2) |
| `remark-*`, `unified` | Rendering and visible-text parsing: [noteMarkdown.js:1](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/noteMarkdown.js#L1) |
| Three Fontsource packages | Explicit local font imports: [main.jsx:8](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/main.jsx#L8) |

CI selects Node major 24, but there is no tracked Node-version file or `engines` field. The locked jsdom package has a more specific compatibility requirement than “any Node 24” ([package-lock.json:5618](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/package-lock.json#L5618)). Commit one tested Node-version specification, consume it in CI, declare the supported range, and make `npm ci` the documented fresh-clone command.

There is no checked-in dependency-update configuration or dedicated audit step. Historical vulnerability assessments in DECISIONS are not current findings. Establish small, grouped dependency reviews after the CI gate exists; do not use indiscriminate forced upgrades.

Allow **half a day** initially, then approximately **30–60 minutes per review batch**. Configuration risk is low; upgrade risk varies.

The application version also needs repair as a diagnostic. `package.json` has remained `0.1.0` since its introduction, and `APP_VERSION` derives directly from it ([version.js:1](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/version.js#L1)). That identifier appears in About and backup metadata. It cannot distinguish deployed revisions or older installed PWA code.

Expose a short build commit and adopt a lightweight release version. Keep application, schema, and dataset versions separate. This is **2–4 hours**, with low risk if initially confined to display/build metadata.

**Vendored skills are defensible; manual duplication is not working reliably.** The tracked skills are tiny, and project adaptations were deliberate ([DECISIONS.md:1102](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/DECISIONS.md#L1102)).

The documented copy command is `cp -r .agents/skills .claude/skills` ([CLAUDE.md:35](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/CLAUDE.md#L35)). Read-only comparison found an extra complete tree at `.claude/skills/skills/`. Normal top-level copies match the canonical files; the additional nesting is the observed discrepancy. Repeating the documented command with an existing destination would produce this layout, although the audit cannot establish which execution caused it.

Keep one canonical source and provide an idempotent synchronization/check mechanism. Record the reviewed upstream revision and local adaptations; upstream `computedHash` values do not fully describe modified local contents. General personal skills could instead live in owner-level configuration, but that is a portability choice, not a storage optimization.

Effort is **2–3 hours**, with low risk after checking both tools’ discovery paths.

**Branch cleanup is straightforward except for the intentional research branch.** `main` and recorded `origin/main` both point to `35cda8e`. The following refs have **zero commits absent from `main`**:

| Ref | Tip | Commits behind `main` |
|---|---|---:|
| Local `claude/happy-matsumoto-c9fc2b` | `df3d22a` | 65 |
| `origin/codex/compact-tag-settings` | `3b4e717` | 92 |
| `origin/codex/lexical-notes-spacing` | `6195ee8` | 70 |
| `origin/codex/lexical-structured-notes` | `2b8fabd` | 71 |
| `origin/codex/page-profiles-collections` | `df8a454` | 416 |
| `origin/codex/phase-19-grammar-guide-depth` | `193fb8d` | 238 |
| `origin/codex/phase-19-notes-callouts` | `986adfe` | 215 |
| `origin/codex/phase-21-conjugation-patterns` | `a3a6e5b` | 173 |
| `origin/codex/phase-26-derived-context-connections` | `3a06690` | 131 |
| `origin/codex/phase-5` | `079e0fb` | 425 |
| `origin/codex/phase-5d` | `758699e` | 427 |
| `origin/skills-trial` | `c97ed20` | 115 |

These are merged cleanup candidates, not evidence of lost work. Their tips date from August 2–23.

`origin/claude/add-reference-document-0znq72` has one unique commit, **`f186712`**, dated October 4; `main` has two commits absent from it. The guided-lessons README explicitly links the research at a pinned revision and says it has not been merged ([line 26](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/guided-lessons/README.md#L26)). It should not be classified as abandoned.

`.claude/worktrees/` exists. I did not inspect it and cannot establish whether it contains unique uncommitted work. Later cleanup must distinguish deleting merged refs from discarding working-tree contents.

A verified branch inventory and cleanup session should take **1–2 hours**. Risk is low for confirmed merged refs after checking active use; scratch-worktree disposal remains unassessed.

The **top ten recommendations, ranked by expected owner value**, are:

| Rank | Recommendation | Effort | Change risk |
|---:|---|---|---|
| 1 | Run the existing serial suite before deployment; add PR validation. | ½ day | Low; failures correctly block publishing |
| 2 | Make README a concise current-state entry point; preserve release history separately. | ½–1 day | Low–medium: links and unresolved checks |
| 3 | Remove stale mutable facts from agent instructions; link authoritative code and conditional environment recipes. | ½ day | Low if safeguards remain explicit |
| 4 | Fix download checksum reuse and retain full input provenance; keep current dictionary packages committed. | ½–1 day | Low; externalization can wait |
| 5 | Expose a useful application/build identifier. | 2–4 hours | Low |
| 6 | Establish one tested Node specification and a small dependency-review cadence. | ½ day | Low setup risk; upgrades vary |
| 7 | Add a documentation map and archive historical prototypes/QA/phases; preserve the planned lesson code/content boundary. | 1–2 days | Medium for bulk link changes |
| 8 | Stop documentation-only changes from republishing the app; record deployment evidence once. | 2–4 hours | Medium if publishing inputs are filtered incorrectly |
| 9 | Keep canonical vendored skills and replace manual copying with repeatable synchronization. | 2–3 hours | Low |
| 10 | Retire verified merged branches; preserve intentional research and inspect scratch work separately. | 1–2 hours | Low for merged refs; scratch risk unknown |

**Keep** the simple single-application build, lockfile and npm caching, separate dictionary pipeline, committed small package reports, explicit offline-download boundary, personal-data exclusions, thin agent entry files, shared-guide concept, task-sensitive decision-log reading, phase reasoning and verification evidence, honest pending-check records, and the deliberately separate guided-lessons planning folder. Those practices provide durable value; the opportunity is to make them cheaper to maintain and harder to contradict.