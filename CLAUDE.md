# Mi Cuaderno — Claude Code entry point

**Read `docs/AGENT-GUIDE.md` before doing anything else.** It is the single shared copy of the
read-order, working agreement, architecture tripwires, environment and verification habits for
every coding agent on this project. `AGENTS.md` (Codex) points at the same file — rules live
there once, so the two tools can never drift apart. Do not restate its content here.

Claude-Code-specific notes only:

- **Use Plan Mode** for the brief §2 working agreement: propose the plan in plain language and
  wait for approval before writing code.
- **Before shell or preview work:** read [Windows recipes](docs/agents/WINDOWS.md#claude-code--git-bash-and-desktop-preview)
  on the laptop or [XPS/Linux recipes](docs/agents/XPS.md) on the server. The actual OS and shell
  determine commands; a missing browser pane does not rule out a separate browser tool.
- **Before changing the ignored skills copy:** read the [copy procedure](docs/agents/WINDOWS.md#claude-skill-copy).
  The tracked source is `.agents/skills/`; inspect differences before any cleanup.
- **For multiline Bash commits:** use the [heredoc recipe](docs/agents/XPS.md#bash-commit-messages).
