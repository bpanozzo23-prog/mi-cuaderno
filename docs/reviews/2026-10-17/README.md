# Reassessment, 2026-10-17

A read-only review of how the project is organized now that it has grown well past the early plan:
the brief, the documentation, the working process, the code and the data layer. Done by Claude Code
on the XPS against `main` at `35cda8e`, with four independent Codex reviews. Owner-requested.

**These are findings and suggestions, not approved work.** Nothing here changes the brief, the
agent guide or any approval boundary. Each change still goes through the plan-first agreement in
[`docs/AGENT-GUIDE.md`](../../AGENT-GUIDE.md).

| File | What it is |
|---|---|
| [REASSESSMENT.md](REASSESSMENT.md) | The full report: what to keep, how the brief shaped the project, documentation and process, feature growth, code, confirmed bugs, data layer, guided lessons, suggested order of work, and the questions only the owner can answer |
| [STEP-1.md](STEP-1.md) | Work order for the first batch of safety fixes, one item per session, with evidence, a ready regression test and acceptance checks |
| [codex/](codex/) | The four Codex reviews, verbatim apart from repository-relative links: [code](codex/1-code.md), [brief and process](codex/2-brief-and-process.md), [data model](codex/3-data-model.md), [repository](codex/4-repository.md) |

Line numbers in all of these refer to `35cda8e`. Confirm a finding against current code before
acting on it.

To start a Step 1 item in a new session:

> Follow docs/AGENT-GUIDE.md as usual, then read docs/reviews/2026-10-17/STEP-1.md. Work on
> item N only. The review was done at commit 35cda8e, so first confirm the finding still holds on
> current main. Then propose a plan in plain language and wait for my approval.
