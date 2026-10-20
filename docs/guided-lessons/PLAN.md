# Guided lessons — delivery plan

**A1 implemented and verified locally, 2026-10-18; not pushed.** The owner approved all seven editorial
refinements and the three-commit plan in the [1917 review](chapters/1917/REVIEW.md).
The preview covers the complete reading path and optional checks, without saved writing,
notebook integration or deployment. Narrative/language acceptance still follows owner use.

| Document | Owns |
|---|---|
| [Scope](SCOPE.md) | Confirmed language-support direction, research context, chapter outlines, branching, future topics and audio. |
| [Integration](INTEGRATION.md) | Proposed notebook handoffs, storage/backup contract, media/offline behavior and integrated-release checks. |
| [1917 storyboard](chapters/1917/STORYBOARD.md) | Reviewed script and activity text. |
| [1917 sources](chapters/1917/SOURCES.md) | Evidence, exact excerpts, attribution and asset choices. |
| [A1 review and plan](chapters/1917/REVIEW.md) | Approved bounded preview scope and verification. |

The planning began 2026-10-04. On 2026-10-05 the owner confirmed Spanish storytelling with
English help, recreation of the unavailable prototype, and **1917 as a proper chapter, then
1920**. Storyboard development followed. Those topics need no new selection; Trotsky remains
later. The complete earlier plan is retained across these linked documents rather than
replaced by a second roadmap.

## 7. Delivery sequence and acceptance gates

The first usable release is **A + B**, centered on the full 1917 chapter; the 1920 chapter follows
in C. This does not require finishing the whole historical season. Each
increment gets its own approval. A1 below is approved; the rest of A and increments B–E
remain proposed.

| Increment | Deliverable | Gate before expanding |
| --- | --- | --- |
| A. Recreate the player and prove 1917 | Prepare the source packet and complete 1917 storyboard; implement a small shared player and independently viewable preview. Include the constitutional narrative, purposeful images, original-source reading, English help, a local comparison, one investigation, and optional practice. Recovery of old files is not required. Clearly label temporary work until B. | 1917 works as a substantive chapter with its own conclusion, not just a refresher for 1920; history and Spanish support are useful; quotations/images have traceable provenance and verified reuse rights before public-repository inclusion or release; exercises can be skipped. |
| B. Make it safe for regular use | Approve the durability contract, implement migration/backup and resume/drafts, add the Lecciones entry point and explicit notebook handoffs. Establish bounded media/offline handling. | Refresh/restart, lesson revisions, missing content, failed writes, lookup/Back, and export/restore preserve work. The integrated reader passes the phone check and existing-app regression gates. |
| C. Add the 1920 chapter | Produce the Carranza/Agua Prieta chapter through the same authoring and review process; include a concise bridge from 1917 and a return to its unresolved questions. | Chapter 2 mostly adds content rather than new engineering; the pair connects constitutional promises to the struggle over governing authority, while each chapter has its own conclusion. |
| D. Add reviewed audio | Trial a finalized passage from the 1917 chapter, then narrate accepted content and add optional audio downloads. The small trial may run alongside C once the text is stable. | Voice accepted; names and transcript checked; failed/downloaded/offline playback handled; phone playback tested. |
| E. Expand the historical library | Select the next small topic pack, then repeat the content pipeline. | Actual use shows what depth and support are valuable; sourcing and rights are feasible for the chosen next topic. |

The large uncertainties are remaining image/reuse choices and the persistence contract. The
local comparison now has a checked source and a drafted treatment, pending owner acceptance.
Make a calendar/effort estimate after A's storyboard review and the storage decision, rather
than treating research and narration as fixed-cost code tasks.

### Approved A1 inside increment A

The three implementation commits refine the script and split planning documents, encode/validate
the chapter, and build/verify the isolated player preview. See the [closeout](chapters/1917/REVIEW.md#implementation-closeout)
and [local run instructions](README.md#try-the-a1-preview). Full scope and acceptance checks live in the
[approved review](chapters/1917/REVIEW.md#small-implementation-commits-after-approval).
No durable response field, archival media, audio, app route or schema change is included.
The optional reflection remains a prompt/model to consider aloud or on paper. This is a
preview for owner feedback, not the integrated first release.

## Decisions and next gate

- 2026-10-05: Spanish story with English help; recreate the missing prototype; 1917 then 1920.
- 2026-10-18: A1 approved to make the whole chapter reviewable without personal-data integration.
  The no-typing-field tradeoff avoids disposable writing; the separate entry avoids notebook
  startup and service-worker coupling. Project approval is recorded in [DECISIONS](../../DECISIONS.md).
- 2026-10-20: owner accepted the [combined language-support direction](SCOPE.md#agreed-language-support-direction--2026-10-20).
  A real-content visual proof is the proposed next bounded task; new player behavior is not
  implemented. Owner reading/recall feedback remains optional and deferred.

After the visual proof, review narrative interest, Spanish difficulty, depth and optional
activities when the owner is ready. Broader media choices and the rest of A remain separately
bounded work. Before B, review the exact durability/storage design and safety plan. The topic
after 1920 remains open and does not block the first two chapters. No push or production lesson
release is authorized.
