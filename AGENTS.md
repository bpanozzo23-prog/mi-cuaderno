# Mi Cuaderno — Codex entry point

**Read `docs/AGENT-GUIDE.md` before doing anything else.** It is the single shared copy of the
read-order, working agreement, architecture tripwires, environment and verification habits for
every coding agent on this project. `CLAUDE.md` (Claude Code) points at the same file — rules
live there once, so the two tools can never drift apart. Do not restate its content here.

Codex-specific notes only:

- **The owner's real browser data is not available in Codex's test browser.** Verify against
  seeded fixture data as the guide describes; never treat an empty notebook as the owner's
  actual state.
- Current phase status is deliberately not written in any agent file — read `README.md` → Status
  and the newest `docs/PHASE-*-REPORT.md`, per the guide's read-order.
- Log meaningful decisions in `DECISIONS.md` as you go, and commit per sub-phase, per the guide.
