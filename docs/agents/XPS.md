# XPS / Linux recipes

Use this on the headless Ubuntu XPS reached over SSH inside `tmux`. `uname` reports `Linux`;
`npm`, `node`, `git` and `gh` use their plain names. `npm.cmd`, Windows PATH prepends and `gh.exe`
paths do not apply. Read files with `cat` or `rg`.

## Session and checkout

Claude Code and Codex run as CLIs. For Claude, start with `tmux new -As work`, run `claude`,
and after a dropped SSH session reattach and use `claude --continue`. Claude's `/rc` hands the
running session to its mobile app. An installed desktop app without a display is not a browser pane.

The owner also has a Windows checkout. Fetch before assuming the other machine has no new work;
inspect `git status -sb` and use a fast-forward-only update when behind, preserving local changes.
Commits are invisible on the other machine until pushed. Push only when asked, and report any
unpushed commits and pending checks in the handoff. Shared branch/push safeguards remain in the
[guide](../AGENT-GUIDE.md#git-when-two-tools-share-one-working-directory).

This checkout historically uses `core.autocrlf=input`. A whole-file diff in an untouched file is
a signal to check line endings before committing. For the ignored Claude skills copy, use the
[repeatable copy procedure](WINDOWS.md#claude-skill-copy); Linux needs no launch.json for CLI use.

## Node setup

Run these from the repository root to compare the selected major, supported range and installed
version:

```bash
cat .nvmrc
node -p "require('./package.json').engines.node"
node --version
npm --version
```

If this machine already uses nvm, `nvm install` followed by `nvm use` reads `.nvmrc` and selects
an installed release for that major. Otherwise use the existing Node installation method to
select a release within the declared range. Check `node --version` before `npm ci`; the version
file alone does not change the current shell's Node. Exact minor/patch versions can differ from CI.

## Checks and phone preview

Run `npm test` and `npm run build` as the guide requires. A slower CPU can expose timing mistakes;
it is not an exception to the zero-exit/no-unhandled-errors gate. The historical App
`DatabaseClosedError` was fixed on 2026-08-22; investigate any new failure.

The CLI has no built-in browser pane, but a separate installed headless browser or connected
browser tool may be available. Follow [browser verification](BROWSER-VERIFICATION.md) and report
which method actually worked. For an owner phone preview, start Vite on the private network:

```bash
node node_modules/vite/bin/vite.js --host
```

Port 5173 is configured for the Tailscale interface on the owner's server. Confirm the actual
network boundary before exposing a preview; use a disposable fixture origin/profile for agent
checks. Report the private URL from the following command without committing the machine name:

```bash
echo "http://$(hostname):5173/mi-cuaderno/"
```

MagicDNS resolves the short name. The owner checks the phone view; if the agent did not inspect
the app, say so plainly. Stop a temporary preview when the task is done.

## Bash commit messages

Use a heredoc for a multiline message in Bash (Linux or Windows Git Bash):

```bash
git commit -F - <<'MSG'
docs: describe the completed change

Explain the reason when useful.
MSG
```

PowerShell's `@'…'@` form is not Bash syntax. Read the result with `git log -1 --pretty=%B`;
stray `@` lines signal the wrong shell idiom. Avoid rewriting shared history.
