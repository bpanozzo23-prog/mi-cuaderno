# Codex review — brief, process and documentation

> Independent read-only review by Codex (OpenAI Codex CLI), run on the XPS on 2026-10-17 against `main` at `35cda8e`, as one of four inputs to [the reassessment](../REASSESSMENT.md). The text below is the review verbatim, except that absolute file links were rewritten as repository-relative links and trailing whitespace was normalized. Its findings were spot-checked by Claude Code before use; see the reassessment for which were confirmed. It describes the code as it was at `35cda8e`.

**Mi Cuaderno has outgrown the way its contract and history are maintained. Its strongest architectural principles remain useful, but agents now have to reconstruct current requirements from accumulated amendments, historical plans, deployment notes, and corrections.** The highest-value improvement is to separate current truth from historical reasoning—not discard the reasoning or rewrite the application.

This audit covers repository state at `35cda8e`, dated October 17, 2026. I read the complete brief and reviewed the requested documentation, prototype, relevant implementation, and Git history, with two independent read-only investigations. I changed no files, ran no tests/builds/pipelines, and accessed no private notebook data, backup JSON, or stale worktree contents. Test results below are recorded historical evidence, not independently rerun results.

Confidence is high for the measured documentation problems and contradictions. Claims about architectural pressure are identified as inferences; this audit cannot establish which features the owner finds useful in daily use.

**The project has adapted the brief repeatedly; it has not simply followed the original plan literally.**

The brief began at commit `0077fc1` as 202 lines and 19,948 bytes. It is now 1,154 lines and 103,563 bytes. `git log --follow` shows 43 commits touching it, including its introduction: 42 subsequent changes.

Several adaptations demonstrate good judgment:

- The conjugation-source decision changed after measurement, rather than preserving the original plan unquestioningly. The brief records the comparison and why the replacement was preferable. [Brief §4](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/mi-cuaderno-project-brief-v3.md#L144)
- Independent phases became permissible through an explicit coordination amendment. [Brief §12](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/mi-cuaderno-project-brief-v3.md#L668)
- Browser navigation restrictions were reversed when the application gained more destinations. [Navigation decision](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/DECISIONS.md#L1192)
- Phase 25b stopped before UI implementation because the reference data failed its quality gate. The report gives counts and concrete false relationships, rather than manufacturing a feature from inadequate evidence. [Phase 25 report](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/PHASE-25-REPORT.md#L55)

These are practices to preserve. The problem is that each adaptation tends to add another layer of governing prose without retiring the old layer from everyday reading.

**The brief remains valuable as historical evidence, but is no longer a good primary current specification.**

The following distinctions matter:

| Rule or area | Assessment |
|---|---|
| Personal identity independent of dictionary identity; replaceable reference data | **Still right.** These protect owner-created content through dictionary replacement and changing attachments. |
| Validated backups, transactional restore, export-first migrations | **Still right.** Consolidate their documentation without weakening their guarantees. |
| Phone-first, offline notebook, explicit AI disclosure and approval | **Still right.** Describe current behavior independently of phase numbers. |
| Exactly two personal content types | **Should be revisited as a universal constraint.** It may remain a useful notebook model without governing every durable personal record. |
| Events as authority for learning history | **Still right, but over-interpreted when equated with “derive everything at render” or “no state flags.”** |
| Numbered phases and inline amendment history | **Useful historical delivery structure; unsuitable as the organizing structure of the current contract.** |
| Temporary bans on routers, stored preferences, richer organization, or practice history | **Context-dependent decisions.** They need explicit scope and reconsideration triggers, rather than becoming permanent defaults. |

The durable foundations are explicit in [§§5–6](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/mi-cuaderno-project-brief-v3.md#L152) and [§10](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/mi-cuaderno-project-brief-v3.md#L581). They should survive any consolidation.

The current presentation makes those foundations unnecessarily difficult to recover:

- The brief contains **62 strikethrough spans**. The personal-content row alone combines the original rule and three subsequent formulations. [Brief:207](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/mi-cuaderno-project-brief-v3.md#L207)
- The backup example still displays `"schemaVersion": 5`, followed by successive migration amendments culminating in version 12. A careful reader can resolve this, but a current contract should not require that reconstruction. [Brief:565](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/mi-cuaderno-project-brief-v3.md#L565)
- Section 12 occupies approximately **38.4 KB, or 37% of the brief**. It mixes acceptance criteria, historical implementation boundaries, verification results, and later reversals.
- The opening still calls the prototype a reference for features, interaction, and visual design; the shared guide says the real app supersedes it for visual and interaction decisions. These are conflicting authority signals. [Brief:6](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/mi-cuaderno-project-brief-v3.md#L6), [guide:38](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/AGENT-GUIDE.md#L38)

The prototype deserves preservation, but as an archive. Its normalization, stored struggling flags, reciprocal links, and limited event history are historical implementation choices, not suitable starting points for current work. [Prototype:28](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/mi-cuaderno.jsx#L28), [prototype:169](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/mi-cuaderno.jsx#L169)

**The two-type rule has preserved consistency, but the Pages/Diario boundary now deserves an explicit product review.**

Composable Pages have a defensible purpose. Phase 7 explains that a book page may need passages, vocabulary, reflections, and grammar together; exclusive profiles could not express that well. Composition itself is not evidence of a mistake. [Phase 7 direction](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/PHASE-7-DIRECTION.md#L10)

Nevertheless, “two types” now conceals a substantial domain model: focus, independently enabled capabilities, preserved dormant structures, section hierarchies, contextual vocabulary, exact source references, feedback, and Apuntes.

Diario identity is especially consequential. The actual predicate is effectively:

> A page is Journal when it has a date and has neither an enabled structured capability nor a nonempty Notes outline.

That is implemented directly in [pageKinds.js:296](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/pageKinds.js#L296) and required by [brief:207](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/mi-cuaderno-project-brief-v3.md#L207).

Thus, at the model level, changing organization can change which workspace owns a dated record. The code conforms to the amended contract; this is a question about the contract, not a discovered implementation bug.

**Inference, moderate confidence:** preserving a small top-level type count has become a design objective in its own right, sometimes obscuring distinctions the product actually needs. Supporting evidence appears in planning:

- A reflective-versus-practice distinction is described as touching the two-type rule.
- A future private prompt store is tentatively characterized as “likely a preference-shaped record, not a third content type.” [Ideas:193](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/IMPROVEMENT-IDEAS.md#L193), [ideas:237](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/IMPROVEMENT-IDEAS.md#L237)

That creates pressure to fit durable owner content into an existing category before deciding its ownership and lifecycle.

There is similar pressure in relationship modeling. Storing links once is a sound consistency invariant. Making the same outgoing link represent page-vocabulary membership is a separate choice. It now requires promotion of incoming edges, directional-label changes, dormant annotations, and cleanup across active and hidden placements. [Brief:416](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/mi-cuaderno-project-brief-v3.md#L416)

These mechanisms may be justified. Their complexity should, however, be judged against owner behavior—not treated as inevitable consequences of “two types” or “store once.”

The useful review questions are:

- Should Diario membership express owner intent, or continue to follow content structure?
- Does “two types” mean two notebook editing experiences, two record variants, or every kind of durable personal information?
- Which relationships are semantic connections, which are membership, and which are provenance?

A review need not produce a migration. Keeping the existing representation after examining alternatives is a valid outcome.

**Event authority has been broadened into an implementation prescription.**

The brief says events are the source of truth for state and statistics, prohibits running counters, and specifically prohibits a stored `struggling` flag. It does not prescribe replaying everything during rendering. [Brief:454](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/mi-cuaderno-project-brief-v3.md#L454)

The stronger rule appears elsewhere:

- The guide says “no state flags” and “derived at render.” [Guide:62](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/AGENT-GUIDE.md#L62)
- An early decision says nothing is cached and recomputing is “free” because a personal notebook is small. [Decisions:52](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/DECISIONS.md#L52)
- The review implementation’s commentary quotes “no stored state flags” as though that were the brief’s wording. [review.js:13](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/review.js#L13)

This is a demonstrable expansion of the original rule. Authoritative event history does not logically forbid an invalidatable projection or cache.

The current hook reloads all items and events on each notebook reload, while review derivation scans events and sorts per-item review histories. [useNotebook.js:5](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/useNotebook.js#L5), [review.js:193](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/src/lib/review.js#L193)

**No performance failure is established here.** For this notebook, the approach may remain entirely adequate. The problem is making a historical size assumption permanent policy.

The contract should distinguish:

- authored content and configuration;
- operational state, such as resumable work;
- historical learning evidence;
- disposable derived views.

The app already has these distinctions in practice. Calling all of them “event-derived state” makes future design harder to discuss accurately.

**Other restrictions came from local implementation decisions, not directly from the original brief.**

The plan-first broadening is already acknowledged: the guide requires approval before writing code generally, while the brief frames approval around phases and subphases. [Guide:47](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/AGENT-GUIDE.md#L47)

Navigation is another instructive example. The original brief did not prohibit browser history or routers. The owner-approved Phase 5 direction added that prohibition, then explicitly superseded part of it when normal Android Back and retained tab context became necessary. [Phase 5 direction:33](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/PHASE-5-DIRECTION.md#L33)

This was **not unauthorized agent overreach**: approval is recorded. It illustrates how a reasonable implementation simplification can age into a product restriction.

Likewise, the brief explicitly permits new event types. Repeated later promises of “no new event,” “no preference,” or “no schema change” are release-scope choices, not universal architectural virtues. [Brief:458](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/mi-cuaderno-project-brief-v3.md#L458)

A smaller example shows implementation reuse influencing learning design: the Contrasts direction uses four conjugated ser/estar options because the existing engine requires four distinct choices, thereby testing agreement as well as the contrast. This was explicitly owner-approved; there is no evidence here that it teaches badly. It nevertheless warrants asking whether the engine is determining the learning objective. [Contrasts direction:27](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/CONTRAST-LANE-DIRECTION.md#L27)

The general improvement is to label each restriction as an enduring invariant, an owner preference, or a temporary implementation boundary.

**The documentation system has multiple current-state authorities, and their synchronization is failing.**

Measured sizes at the audited commit:

| Document group | Size | Words |
|---|---:|---:|
| README | 97,354 bytes | 13,226 |
| Brief | 103,563 bytes | 14,313 |
| Shared agent guide | 20,549 bytes | 3,126 |
| DECISIONS | 558,228 bytes | 83,552 |
| Improvement ideas | 144,755 bytes | 20,816 |
| 42 `PHASE-*.md` files | 432,446 bytes | — |

README’s Status occupies **1,073 of its 1,113 lines: 96.4%**. Development instructions begin at line 1098. It functions mainly as a cumulative release history.

The read-order compounds this. Agents must consult the report linked from the in-progress phase, but Phase 4 remains “ongoing maintenance,” pointing to a historical report ending around schema 5. Current schema-12 release information appears near the bottom of README. [Guide:18](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/AGENT-GUIDE.md#L18), [README:33](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/README.md#L33), [README:1063](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/README.md#L1063)

Following guide → README → Phase 4 report loads about **166 KB and 23,326 words before code or the brief**. A cross-cutting task then adds the complete 14,313-word brief. That represents tens of thousands of model tokens; no exact tokenizer count is claimed.

This repeats an already recognized failure: the August 2 documentation refresh explicitly sought to eliminate an approximately 148 KB unconditional reading burden. [Decisions:293](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/DECISIONS.md#L293)

The cost is not just tokens. Relevant constraints compete with obsolete instructions, and a human has to understand project chronology to discover current behavior.

Concrete contradictions include:

| Source | What it says | Conflicting current record |
|---|---|---|
| [Guide:91](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/AGENT-GUIDE.md#L91) | Lexical attachment is optional scalar `dictKey` | Same guide documents schema-12 `dictKeys[]` at line 74 |
| [Guide:88](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/AGENT-GUIDE.md#L88) | Journal exclusion mentions enabled structures only | Brief and code also exclude nonempty Notes outlines |
| [Taller direction:3](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/DIARIO-TALLER-DIRECTION.md#L3) | “not yet planned or implemented” | [README:740](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/README.md#L740) records deployment |
| [Ideas:136](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/IMPROVEMENT-IDEAS.md#L136) | Taller “Ready to plan” | Same deployed implementation |
| [Transform direction:3](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/TRANSFORM-LANE-DIRECTION.md#L3) | Not pushed or deployed | [README:827](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/README.md#L827) records deployment |

Older test counts in historical reports are not contradictions. Present-tense status banners and instructions to begin already-completed work are.

The project has already repaired this class of drift several times, including guide schema correction `6e3fbad` and the documented August 11 status sweep. Adding another instruction to update every copy is unlikely to solve a structural duplication problem. [Guide:145](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/AGENT-GUIDE.md#L145)

DECISIONS has a related problem. It promises “one line per meaningful choice,” but contains 958 dash-prefixed entries with a median of 76 words. Many are substantial paragraphs held on one physical line. Valuable rationale sits beside repeated test counts, deployment results, and browser measurements.

For example, plural-attachment verification and deployment appear in both [DECISIONS:1438](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/DECISIONS.md#L1438) and [README:1071](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/README.md#L1071). The reasoning about independent attachments belongs in a decision record; the deployment evidence needs only one authoritative location.

The ideas document retains useful distinctions—owner interest, observed problem, evidence needed—but has 35 active ideas without a short priority list. Approximately 37% is implemented history and document history. It already permits compression using Git history, providing an approved precedent for a leaner system. [Ideas:20](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/IMPROVEMENT-IDEAS.md#L20), [ideas:30](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/IMPROVEMENT-IDEAS.md#L30)

**The working process has strong safeguards, but too much repeated reporting and unclear completion status.**

Plan-first approval has protected a novice owner’s control over product behavior and personal data. Small coherent commits make changes inspectable and reversible. Neither should be abandoned.

The opportunity is to approve a bounded outcome once, then let implementation proceed within it. A routine corrective change should not become a new approval ceremony simply because every code edit has been interpreted as a fresh planning unit. Material changes to behavior, persistence, cost, or approved scope still need renewed discussion.

Likewise, “one commit per feature or subphase” should describe cohesive checkpoints, not a quota. No evidence here justifies replacing small commits with large batches.

Deployment recording has measurable overhead. Among 472 commits, **34 subjects contain both “record” and “deploy”; all 34 modify only documentation**. The deployment workflow runs on every push to `main`, without path filtering. Separately pushed recording commits can therefore rebuild and redeploy an unchanged application. This does not prove 34 extra deployments, because commits may be pushed together. [Deployment workflow:3](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/.github/workflows/deploy.yml#L3)

Owner-side verification is honestly disclosed, which is good. However, “deployed,” “automated checks passed,” and “owner accepted” need distinct fields. The latest attachment increment is recorded as deployed with its owner phone check pending, while its brief acceptance criterion includes owner verification. [README:1063](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/README.md#L1063), [brief:1090](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/mi-cuaderno-project-brief-v3.md#L1090)

DOM measurements establish overflow and geometry; they do not establish visual quality or comfortable interaction. The guide’s phrase “verify visually by the numbers” overstates that evidence. [Guide:219](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/AGENT-GUIDE.md#L219)

The two-machine rules address actual incidents: wrong-branch pushes, invisible unpushed commits, shell differences, and line-ending changes. Preserve those protections and make one-writer-per-checkout explicit. Concurrent implementation should continue to use the isolation already specified in the brief. [Guide:154](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/AGENT-GUIDE.md#L154)

Skills duplication has one verified defect. The proper top-level copies match, but `.claude/skills/skills/` contains an extra nested copy; recursive comparison reports that extra directory. The documented `cp -r .agents/skills .claude/skills` command can produce exactly this nesting when repeated. Causation is inferred, but the non-idempotent recipe and resulting shape are observed. Vendoring remains reasonable; manual two-copy maintenance does not. [Guide:193](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/AGENT-GUIDE.md#L193)

**Guided lessons has a healthy intentional boundary and already contains a better answer to some core-project problems.**

Its short README distinguishes drafts, accepted content direction, implementation approval, and project-wide authority. Its chapter folders separate narrative and source evidence. Keep that separation. [Guided-lessons README](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/guided-lessons/README.md#L7)

The plan also makes several sound commitments:

- authored lessons are replaceable reference content;
- notebook saves are explicit;
- saved owner text survives lesson revisions;
- identity is separate from content version;
- durable drafts retain enough prompt context to remain understandable;
- media removal does not remove personal work. [Plan:189](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/guided-lessons/PLAN.md#L189), [plan:226](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/guided-lessons/PLAN.md#L226)

Most significantly, it recommends a narrow lesson-work store and openly calls it a contract change, rather than hiding drafts in preferences. This is the right way to confront an aging constraint. [Plan:249](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/35cda8e/docs/guided-lessons/PLAN.md#L249)

The emerging risk is documentary: the 399-line plan already combines editorial direction, superseded proposals, chapter outlines, architecture, persistence, media, delivery, and future expansion. Before implementation, separate current feature scope from the integration contract. Keep chapter-specific reasoning beside each chapter; record only cross-project decisions in the main decision system.

**A proposed target structure would separate current requirements, active work, and history.** The filenames are a matter of taste; the ownership boundaries are the substantive recommendation.

```text
README.md                         Short introduction, commands, current-state link
AGENTS.md / CLAUDE.md              Thin tool-specific entry points
DECISIONS.md                      Compact decision index

docs/
  AGENT-GUIDE.md                   Shared workflow and task-sensitive read order
  CURRENT.md                       Release/schema, active work, pending acceptance
  PRODUCT.md                       Clean, accepted current behavior and non-goals
  ARCHITECTURE.md                   Ownership, data model, seams, module map
  decisions/
    ADR-*.md                       Selected consequential decisions and supersession
  work/
    active/<feature>.md            Approved scope, implementation plan, acceptance
    archive/                       Completed work and phase reports
  ideas/
    README.md                      Short backlog and owner-selected priorities
    <substantial-proposal>.md      Detail only where useful
  archive/
    brief-v3.md                    Preserved amended historical brief
    decisions-through-2026-10.md   Preserved historical decision log
    mi-cuaderno.jsx               Original prototype
  guided-lessons/
    README.md                      Feature state and next decision
    SCOPE.md                       Accepted experience and release boundary
    INTEGRATION.md                 Personal data, content, media, navigation contract
    chapters/<chapter>/
      STORYBOARD.md
      SOURCES.md
```

Do not turn 958 historical entries into 958 ADR files. Preserve the old log, index the consequential decisions, and use focused records going forward. Likewise, do not create empty proposal folders or split every paragraph into a document.

The target read-order should be: shared guide → short current state → relevant current specification/code → linked rationale when needed. Historical phase reports should no longer be the route to discovering the present.

The following recommendations are ranked by expected value. Effort estimates cover the proposed documentation/process work; substantial product migrations would require separate estimates.

1. **Publish a clean current contract and architecture description.**\
   **Problem/evidence:** The brief is over five times its original size, mixes current rules with superseded shapes, and retains the schema-5 backup example.\
   **Cost:** Agents can implement obsolete requirements or miss surviving obligations.\
   **Change:** Extract current behavior into `PRODUCT.md` and `ARCHITECTURE.md`; freeze the amended brief as history. Review unchanged restatement separately from proposed policy changes, then explicitly establish precedence.\
   **Effort:** 2–4 focused days. **Risk:** Moderate—accidentally changing meaning during condensation.\
   **Keep:** Stable identity, reference isolation, backup guarantees, and searchable amendment history.

2. **Give current state one short authoritative home.**\
   **Problem/evidence:** README Status consumes 96.4% of README; the read-order can lead to the permanently open Phase 4 report; Taller and lane statuses conflict.\
   **Cost:** Repeated archaeology, mistaken replanning, and lost pending acceptance checks.\
   **Change:** Create `CURRENT.md` with release commit/schema, active work, and unresolved acceptance; reduce README to an introduction and entry points. Historical directions should link there rather than maintain competing current status.\
   **Effort:** ½–1½ days. **Risk:** Low to moderate—omitting an outstanding commitment.\
   **Keep:** Explicit separation of implementation, deployment, and owner acceptance.

3. **Review Pages/Diario identity and the meaning of “two types.”**\
   **Problem/evidence:** Journal identity depends on absent structures; planning already suggests fitting prompts into preferences to avoid another type.\
   **Cost:** New features may inherit unsuitable lifecycles or require increasingly elaborate classification rules.\
   **Change:** Decide whether the restriction governs notebook experiences or all durable records; examine workspace identity, membership, and provenance before approving lesson persistence. Do not migrate merely for conceptual tidiness.\
   **Effort:** One or two design sessions. **Risk:** Low for review; potentially high for resulting data changes.\
   **Keep:** Composable Pages where they serve actual use, stable IDs, and lossless preservation.

4. **Replace the growing decision transcript with an index and selective ADRs.**\
   **Problem/evidence:** DECISIONS contains 83,552 words, mixing rationale with repeated release evidence.\
   **Cost:** Finding the current decision requires reading and reconciling historical paragraphs.\
   **Change:** Preserve the log; index consequential decisions with accepted/superseded status and replacement links. Put future durable rationale in short ADRs and verification evidence in one acceptance record.\
   **Effort:** 1–2 days initially. **Risk:** Low if history remains intact.\
   **Keep:** Reasons, rejected alternatives, approval provenance, and supersession links.

5. **Scale planning to the decision and retire phases from current-state navigation.**\
   **Problem/evidence:** The blanket approval rule exceeds the brief’s phase/subphase wording; Phase 4 remains indefinitely open while substantial work is unnumbered.\
   **Cost:** Owner attention goes to repeated procedural approval and phase bookkeeping.\
   **Change:** Approve bounded outcomes once; replan material scope changes. Use named active work records with measurable acceptance, retaining phase numbers as historical identifiers.\
   **Effort:** ½ day to agree and document. **Risk:** Moderate if boundaries become vague.\
   **Keep:** Plain-language plans, owner control, small verifiable steps, and cohesive commits.

6. **Clarify event authority without prescribing perpetual full replay.**\
   **Problem/evidence:** “No stored struggling flag” became “no state flags,” and early “recomputing is free” reasoning became standing guidance.\
   **Cost:** Operational persistence and future performance work can be rejected for the wrong reason.\
   **Change:** Define authoritative event history, authored state, operational state, and disposable projections separately. Permit measurable optimization without parallel authoritative counters.\
   **Effort:** ½–1 day for policy clarification. **Risk:** Moderate if cache ownership is left ambiguous.\
   **Keep:** Replayable learning evidence, pure derivations, and measurement before optimization.

7. **Record release evidence once and make acceptance debt visible.**\
   **Problem/evidence:** Thirty-four documentation-only deployment-record commits; every main push triggers deployment; latest owner phone verification remains pending.\
   **Cost:** Redundant release work and ambiguous “done” claims.\
   **Change:** Use one release record linking the deployed commit and Actions run. Distinguish automated, DOM, and owner-device checks; specify whether pending checks block release or are explicitly deferred. Exclude confirmed documentation-only changes from application deployment where appropriate.\
   **Effort:** ½–1 day. **Risk:** Moderate for workflow filtering—build inputs must not be excluded accidentally.\
   **Keep:** Deployment verification, honest limitations, serial acceptance checks, and meaningful deliberate-failure proofs.

8. **Make the ideas list a backlog rather than another history ledger.**\
   **Problem/evidence:** Thirty-five active ideas, stale Taller status, and substantial implemented/document-history content.\
   **Cost:** Captured possibilities resemble commitments, while shipped work remains apparently open.\
   **Change:** Keep a concise index, a small owner-selected priority list, and detailed files only for substantial proposals. Promotion should link to approved work; completion should stop maintaining a second release narrative.\
   **Effort:** ½–1 day. **Risk:** Low, provided captured ideas are not silently promoted or discarded.\
   **Keep:** Owner interest, observed-versus-hypothetical distinctions, and conditions for reconsideration.

9. **Make environment handoffs and skill installation repeatable.**\
   **Problem/evidence:** Actual wrong-branch incidents and an extra nested skills tree produced by a repeat-sensitive setup pattern.\
   **Cost:** Tool behavior can diverge, and work can be stranded on another branch or machine.\
   **Change:** Keep one tracked skill source with idempotent synchronization and comparison; record machine, branch, commit, outstanding local work, and pending checks at handoff. Enforce one writer per checkout.\
   **Effort:** A few hours. **Risk:** Low; retain Windows compatibility and inspect before removing redundant copies.\
   **Keep:** Vendoring, thin tool entry points, explicit push authorization, and protection of another session’s work.

10. **Apply the lean structure to guided lessons before implementation expands.**\
    **Problem/evidence:** Its sound boundary is currently embedded in a 399-line plan with editorial, technical, historical, and future material.\
    **Cost:** Each chapter and amendment could reproduce the main project’s documentation sprawl.\
    **Change:** Keep the intentional subtree; separate accepted scope from the integration contract, retain chapter-local source/storyboard records, and approve core-contract changes before durable lesson work is implemented.\
    **Effort:** ½–1 day of organization and boundary review. **Risk:** Low unless reorganizing drafts is mistaken for approving implementation.\
    **Keep:** One-chapter-at-a-time acceptance, explicit notebook saves, stable content identities, recoverable owner drafts, replaceable media, and the distinction between research, approval, implementation, and publication.