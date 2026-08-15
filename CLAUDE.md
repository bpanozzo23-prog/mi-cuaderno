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
  syntax, so the `@` markers land in the message as a stray first and last line. Read the
  message back with `git log -1 --pretty=%B` before moving on: a stray leading or trailing `@`
  means the wrong idiom leaked in, and amending is cheap only until the next commit lands.
- **Dev server: use the preview/browser tools, never Bash.** `.claude/launch.json` (gitignored,
  this machine only) defines the `mi-cuaderno-dev` configuration. If it is missing after a fresh
  clone, recreate it from `docs/claude-launch.example.json` and adjust `runtimeExecutable` if
  Node is installed elsewhere.
- **This tool's skills copy is gitignored; Codex's is not.** The five vendored
  `mattpocock/skills` entries live twice — `.agents/skills/` (tracked, what Codex reads) and
  `.claude/skills/` (ignored by `.gitignore`, what this tool reads). A fresh clone restores only
  the Codex half; recreate this one with `cp -r .agents/skills .claude/skills`, which carries the
  local edits with it. **Never run `npx skills remove`** — it switched the checkout's branch
  mid-command once (`DECISIONS.md`, 2026-08-14). Remove a skill by deleting both directories and
  its `skills-lock.json` entry, and keep the two trees identical: `diff -r .agents/skills
  .claude/skills` must be silent.
