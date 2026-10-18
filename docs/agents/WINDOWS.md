# Windows recipes

Use this on the owner's Windows laptop. Confirm the shell before copying commands; Linux/XPS
uses [different spellings](XPS.md). Shared policy stays in the [agent guide](../AGENT-GUIDE.md).

## Codex — Windows PowerShell 5.1

Use `npm.cmd test`, `npm.cmd run build` and `npm.cmd run dev`. Plain `npm` resolves to
`npm.ps1`, which the laptop's execution policy blocks. Read repository UTF-8 text with
`Get-Content -Encoding UTF8` or `rg` to preserve ñ, section signs and punctuation.

## Claude Code — Git Bash and desktop preview

`uname` reports `MINGW64…` in Git Bash. On this laptop the shell PATH may omit Node and gh:

```bash
PATH="/c/Program Files/nodejs:$PATH" npm test
"C:/Program Files/GitHub CLI/gh.exe" --version
```

Use the preview/browser tools to start the Windows desktop preview. `.claude/launch.json`
(gitignored) defines `mi-cuaderno-dev`; restore a missing file from
[the example](../claude-launch.example.json), adjusting `runtimeExecutable` for the installed Node.
Do not apply this desktop launch rule to the Linux CLI. For Bash commit messages use the
[heredoc recipe](XPS.md#bash-commit-messages), not a PowerShell here-string.

## Claude skill copy

This copy procedure works in Git Bash or Linux Bash. `.agents/skills/` is tracked;
`.claude/skills/` is ignored. For a fresh clone or to copy updated files, run from the repo root:

```bash
mkdir -p .claude/skills
cp -R .agents/skills/. .claude/skills/
diff -r .agents/skills .claude/skills
```

The `/.` copies contents into the existing destination and is safe to repeat without creating
`skills/skills/`. A silent diff confirms equality. This copy does not remove stale destination
files: inspect any extra files or a pre-existing nested `skills/` directory before a separately
scoped cleanup. The documentation reset does not repair the local ignored copy.

Never run `npx skills remove`: it once switched the checkout's branch mid-command. When a skill
removal is requested, deliberately remove its matching directories and `skills-lock.json` entry,
then inspect the diff. An automated synchronization script remains a separate tooling change.

## Line endings

The Windows checkout historically uses `core.autocrlf=true`. If unrelated files show whole-file
diffs, check `git config core.autocrlf` before committing; preserve their content and avoid an
accidental line-ending rewrite. [Browser verification](BROWSER-VERIFICATION.md) uses disposable
fixtures, not the owner's notebook.
