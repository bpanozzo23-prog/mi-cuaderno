# Step 2 — documentation reset

**Approved scope:** documentation only, following [reassessment sections 4, 5, 12 and 15](REASSESSMENT.md).
The owner chose separate executable-tooling follow-ups, draft effort estimates with unranked
interest, and compatibility pointers for paths used by preserved records. Section 15 takes
precedence: experiment-driven feature growth is welcome; the usage review is withdrawn.

## Result

README is 41 lines (previously 1,160); active ideas are about 95 KB (previously 145 KB),
with open follow-ups kept alongside their original discussion context.

- [CURRENT](../../CURRENT.md) owns the verified release, schema, work status and pending checks.
  The [documentation index](../../README.md) separates guidance, proposals and historical records.
- Root README is a quick introduction/run guide. Its original Status narrative is preserved in
  [a dated snapshot](../../history/README-STATUS-2026-10-17.md); publication evidence has its own
  [release history](../../history/RELEASES.md). Existing decision entries are unchanged; a topic
  index and one concise approved-arrangement entry were added.
- Forty-two phase documents, six standalone directions, the reliability report, prototype and
  four design-QA artifacts have canonical archive homes. Twenty small compatibility pointers
  preserve paths in the brief and decisions. Archive banners explain later outcomes without
  rewriting original chronological evidence. Review line citations use the reviewed commit.
- [Ideas](../../IMPROVEMENT-IDEAS.md) retain active and owner-deferred context in one file,
  including unresolved follow-ups extracted from completed entries. Implemented bodies and the
  original change history are preserved separately. The data-source survey and polish list have
  reference homes; neither is an approved work order. Estimates are provisional; rankings remain
  Not set. Explicit owner deferrals and genuine data-quality requirements remain intact.
- [Windows](../../agents/WINDOWS.md), [XPS](../../agents/XPS.md) and
  [browser verification](../../agents/BROWSER-VERIFICATION.md) hold the operational recipes.
  The guide corrects plural dictionary attachments and Diario's Notes-outline condition, and
  points to the current schema instead of repeating migration history.

## Verification

The reset is verified by document/content checks rather than a new application test run:

- Local links and heading fragments checked across 102 Markdown files using a Markdown parser;
  no unresolved paths/fragments. Code examples are excluded.
- Brief v3 compared byte-for-byte with `b48a948`; all pre-existing decision entries preserved.
- All moved artifact bodies compared with baseline, allowing only archive notes and link repairs;
  the prototype and three QA images compared byte-for-byte.
- Original implemented-idea bodies, Taller/Historia captures and document history preserved;
  active idea headings accounted for, with separate read-only review of still-open context.
- All 11 changed source/test files contain documentation-path comment replacements only. No app
  logic, schema, dependencies, build/CI configuration or shipped dictionary changed.
- Repeated skill-copy syntax exercised twice against disposable files; no nested directory
  created. The actual ignored Claude skill copy was not touched.
- `git diff --check` passed. Pending owner/browser checks remain recorded in CURRENT; no owner
  data or private export was opened and no new browser verification is claimed.

The last published app remains the release recorded in CURRENT. These documentation commits
are local until the owner requests a push; the existing CI test/build/deploy gate is unchanged.

## Separate work

Documentation changes the reading/recording workflow: CURRENT replaces README Status, releases
record publication evidence, and decisions record reasons. This does not narrow approval or
verification rules. A record-only follow-up does not need an endless chain of self-recording deploys.

Executable deploy filtering, a skills-sync script or cleanup, lint and Node configuration remain
separate. Brief v3 is unchanged and still the contract; PRODUCT/ARCHITECTURE and contract policy
changes belong to Step 3. Guided-lessons restructuring, feature work and repository branch cleanup
are not included. No further step or push is authorized by this reset.
