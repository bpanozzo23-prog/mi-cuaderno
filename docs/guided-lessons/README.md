# Guided lessons

Planning, research, and chapter drafts for Mi Cuaderno's guided-lesson feature. The initial
history sequence is **1917, then 1920**, with supported Spanish storytelling.
The reviewed 1917 chapter now has a complete, verified local A1 preview.
Notebook integration remains proposed work.

## Start here

| Document | Purpose |
| --- | --- |
| [Development plan](PLAN.md) | Delivery sequence, approved A1 and later approval gates. |
| [Scope](SCOPE.md) | Learning experience, research, chapter outlines and future topics. |
| [Integration](INTEGRATION.md) | Proposed notebook handoffs, durability, storage, media and offline behavior. |
| [1917 storyboard](chapters/1917/STORYBOARD.md) | Page-by-page Spanish narrative, English help, optional activities, and visual suggestions. |
| [1917 sources](chapters/1917/SOURCES.md) | Checked passages, source limitations, image candidates, and remaining publication checks. |
| [1917 review and preview proposal](chapters/1917/REVIEW.md) | Editorial findings and the approved development-only first preview. |

Next: choose between the [two Figma layouts](https://www.figma.com/design/qYUUCkgMUmEgumNEhO5549?node-id=2-64)
of the [agreed language-support direction](SCOPE.md#agreed-language-support-direction--2026-10-20),
using real opening-page content. Both show hidden/revealed English as separate static states.
The [completed A1 preview](chapters/1917/REVIEW.md#implementation-closeout)
still has its existing language-help behavior. Owner acceptance of narrative, language and phone
usability remains pending; a reading session is an option for later, not the immediate next step.
The [1920 outline](SCOPE.md#chapter-2-storyboard--1920) is in Scope;
it does not yet have a separate storyboard.

## Try the A1 preview

From the repository root, run `npm run dev:lessons` and open `http://127.0.0.1:5174/` on
that same computer. If that port is occupied, choose another explicitly, for example
`npm run dev:lessons -- --port 5341`; the server will not silently change ports. Stop it with Ctrl+C.
This is a separate development reader, without a Lecciones tab in the normal app. Building or
serving it with `vite preview` is intentionally blocked.

Read with Anterior, Siguiente or Índice. Both optional branches return to their launch point;
English help, translations, glosses, explanations and sources open in place. No exercise is
required. Position and choices reset on reload. The final reflection has a prompt and model,
with no typing field or saved writing. Source links open a separate tab and need connectivity.

Review narrative interest and pacing, Spanish difficulty, usefulness of English/glossary help,
and whether the optional checks and final reflection help. Screenshots and automated checks
establish the implemented behavior; they do not settle those editorial choices.

The XPS's loopback address is not reachable from another device. A phone walkthrough needs the
verified [private-network recipe](../agents/XPS.md#checks-and-phone-preview) and a reachable port;
no public preview or deployment has been enabled. Task-created verification servers are stopped.

## Organization

Shared feature planning lives at this folder's top level. Each chapter has its own folder under
`chapters/`, keeping its storyboard, sources, and future chapter-specific production notes together.
Additional chapter or research folders can be added when there is material to put in them.
This is documentation organization, not a change to the proposed application or media layout.

The [owner-supplied research reference](SCOPE.md#2-what-informs-this-plan) remains linked to its
pinned version on the separate research branch; it has not been copied or merged here.

Project-wide decisions remain in [DECISIONS.md](../../DECISIONS.md#history-and-spanish-lesson-planning-2026-10-05).
[PRODUCT](../PRODUCT.md) and [ARCHITECTURE](../ARCHITECTURE.md) are the current contract.
Supporting records are allowed, but organizing these drafts and accepting that policy do not
approve its storage design, a migration, integration or deployment. A1 has its own later
approval, explicitly bounded in the review.
