# Mi Cuaderno — Claude Code entry point

**Read `docs/AGENT-GUIDE.md` before doing anything else.** It is the single shared copy of the
read-order, working agreement, architecture tripwires, environment and verification habits for
every coding agent on this project. `AGENTS.md` (Codex) points at the same file — rules live
there once, so the two tools can never drift apart. Do not restate its content here.

Claude-Code-specific notes only:

- **Use Plan Mode** for the brief §2 working agreement: propose the plan in plain language and
  wait for approval before writing code.
- **This shell's PATH lacks the toolchain.** Prepend for npm/node —
  `PATH="/c/Program Files/nodejs:$PATH" npm test` — and call gh by full path:
  `"C:/Program Files/GitHub CLI/gh.exe"`.
- **Multi-line commit messages: use a bash heredoc** — `git commit -F - <<'MSG' … MSG`. The
  `@'…'@` here-string is Codex's PowerShell idiom (`AGENTS.md`); in this Bash shell it is not
  syntax, so the `@` markers land in the message as a stray first and last line.
- **Dev server: use the preview/browser tools, never Bash.** `.claude/launch.json` (gitignored,
  this machine only) defines the `mi-cuaderno-dev` configuration. If it is missing after a fresh
  clone, recreate it from `docs/claude-launch.example.json` and adjust `runtimeExecutable` if
  Node is installed elsewhere.
