# Reassessment, 2026-10-17

A read-only review of how the project is organized now that it has grown well past the early plan:
the brief, the documentation, the working process, the code and the data layer. Done by Claude Code
on the XPS against `main` at `35cda8e`, with four independent Codex reviews. Owner-requested.

**The reassessment is historical advice.** Step 1 was separately approved and completed;
Step 2 was separately approved as documentation-only work. Neither approval authorizes the
remaining recommendations. For current status and the next task, read [CURRENT](../../CURRENT.md).
New work follows the plan-first agreement in
[`docs/AGENT-GUIDE.md`](../../AGENT-GUIDE.md).

| File | What it is |
|---|---|
| [REASSESSMENT.md](REASSESSMENT.md) | The full report: what to keep, how the brief shaped the project, documentation and process, feature growth, code, confirmed bugs, data layer, guided lessons, suggested order of work, the questions only the owner can answer, and the owner's response (section 15) |
| [STEP-1.md](STEP-1.md) | Work order for the first batch of safety fixes, one item per session, with evidence, a ready regression test and acceptance checks |
| [STEP-2.md](STEP-2.md) | Documentation reset: approved boundaries, new homes and verification evidence |
| [codex/](codex) | The four Codex reviews, preserved text with navigation repairs; line citations pinned to the reviewed commit: [code](codex/1-code.md), [brief and process](codex/2-brief-and-process.md), [data model](codex/3-data-model.md), [repository](codex/4-repository.md) |

Line citations in the original reassessment and Codex reviews refer to `35cda8e`. Confirm a
finding against current code before acting on it; later work orders identify their own baselines.

The owner's response (2026-10-17) is section 15 of the report. It withdraws the usage review and
the friction-first advice, and adds suggestions for the ideas file. Where it differs from the
rest of the report, it wins.

Historical Step 1 starter (retained for provenance; those items are complete):

> Follow docs/AGENT-GUIDE.md as usual, then read docs/reviews/2026-10-17/STEP-1.md. Work on
> item N only. The review was done at commit 35cda8e, so first confirm the finding still holds on
> current main. Then propose a plan in plain language and wait for my approval.
