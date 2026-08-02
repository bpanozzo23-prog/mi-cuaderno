# Mi Cuaderno — Codex entry point

**Read `docs/AGENT-GUIDE.md` before doing anything else.** It is the single shared copy of the
read-order, working agreement, architecture tripwires, environment and verification habits for
every coding agent on this project. `CLAUDE.md` (Claude Code) points at the same file — rules
live there once, so the two tools can never drift apart. Do not restate its content here.

Codex-specific notes only:

- **The owner's real browser data is not available in Codex's test browser.** Verify against
  seeded fixture data as the guide describes; never treat an empty notebook as the owner's
  actual state.
- **This Codex shell is Windows PowerShell 5.1.** Use `npm.cmd test`, `npm.cmd run build` and
  `npm.cmd run dev`; plain `npm` resolves to `npm.ps1`, which this machine's execution policy
  blocks. When reading the repository's UTF-8 files with `Get-Content`, pass `-Encoding UTF8`
  (or use `rg`) so ñ, section signs and punctuation are not garbled.
