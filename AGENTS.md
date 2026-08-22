# Mi Cuaderno — Codex entry point

**Read `docs/AGENT-GUIDE.md` before doing anything else.** It is the single shared copy of the
read-order, working agreement, architecture tripwires, environment and verification habits for
every coding agent on this project. `CLAUDE.md` (Claude Code) points at the same file — rules
live there once, so the two tools can never drift apart. Do not restate its content here.

Codex-specific notes only:

- **The owner's real browser data is not available in Codex's test browser.** Verify against
  seeded fixture data as the guide describes; never treat an empty notebook as the owner's
  actual state.
- **On the Windows laptop this Codex shell is Windows PowerShell 5.1.** Use `npm.cmd test`,
  `npm.cmd run build` and `npm.cmd run dev`; plain `npm` resolves to `npm.ps1`, which that
  machine's execution policy blocks. When reading the repository's UTF-8 files with
  `Get-Content`, pass `-Encoding UTF8` (or use `rg`) so ñ, section signs and punctuation are not
  garbled.
- **On the XPS server (`uname` says `Linux`) the shell is bash**, reached over SSH inside
  `tmux`. `npm.cmd` does not exist there and plain `npm test` is correct; use `cat`/`rg` rather
  than `Get-Content`. There is no browser pane — see the guide's "Two machines, one remote" for
  how verification and unpushed commits are handled across the two checkouts.
- **Subagents:** For substantial reviews, audits, or debugging with at least two independent
  read-only investigations, use at most two subagents when doing so would materially improve
  coverage or keep noisy exploration out of the main context. Suitable work includes mapping
  separate code paths, checking requirements against implementation, reviewing test coverage,
  and investigating independent failure hypotheses. Subagents must not edit files, commit, push,
  perform browser-data operations, or run competing test suites. Do not delegate routine commands
  or small tasks. Wait for every delegated result before synthesis. The primary agent owns
  implementation, decisions, the complete serial suite, browser verification, and final synthesis.
  Leave subagent model selection unpinned unless repeated experience demonstrates a need for
  project-specific configuration.
