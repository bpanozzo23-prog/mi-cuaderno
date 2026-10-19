# 1917 review and proposed first preview

2026-10-18. **Owner-approved A1 implementation scope.**
Approval followed the completed review: “Approved, proceed.” The three commits and all seven
editorial rows below are authorized; routine fixes stay within scope. Final chapter acceptance,
integration, personal-data changes and push/deployment are separate. The original review
findings and proposal below are retained as the approval record.
The owner requested this review and consultation with Claude Code. The existing
[storyboard](STORYBOARD.md) remains the script draft; the [development plan](../../PLAN.md)
retains the full feature context. The review does not accept the final chapter on the owner's behalf. A1 code is now approved;
persistence, publication and deployment are not.

## Editorial recommendation

Keep the complete ten-page chapter, Anenecuilco's concrete planting concern, Galindo's written
intervention and the short Article 123 reading. The chapter has an independent conclusion
before its 1920 preview. Optional English summaries, source labels and skippable activities
fit the confirmed direction. No proficiency level should be inferred from the owner's interest
in history.

The draft works best as a guided historical investigation. Whether it feels sufficiently
story-like, and whether its Spanish is comfortable, need a readable preview and owner feedback.
The following refinements were proposed in the review and are now approved and applied for A1.

| Place | Finding | Proposed refinement |
|---|---|---|
| Page 2, assembly | Several abstract political terms sit inside one long eligibility sentence; the glossary does not cover most of them. | Split the sentence while preserving the exact scope of the restriction. Add contextual help for *constitucionalista*, *facción* and *cargo público*, plus *demanda* and *marco legal* where used. On page 7, explain *particular* as private and *oficial* as public/state in the schooling context. This is a language-density finding, not a proficiency diagnosis. |
| Pages 3–5, land and letter | The transition promises to explain restitution versus a land grant, but the letter illustrates urgent planting while ownership is disputed. | Retarget the transition to the practical stakes of access to land; do not claim the letter explains the two legal procedures. In the evidence list, name a record of delivery (*acta de entrega*) rather than the delivery event itself. |
| Page 9, dates | The heading and English summary use publication, while the opening Spanish sentence switches to promulgation. | Use *Publicar una Constitución, su entrada en vigor y hacer cumplir sus reglas…* consistently. Keep the election exception visible and the eleventh transitional article in accessible source notes. |
| Pages 4–6, 9–10 | The law-versus-outcome distinction recurs frequently. The repetition is observable; its effect on pacing is editorial judgment. | Keep its full treatment on page 5 and return to it in the conclusion. Shorten repeated qualifications on pages 6 and 9 while preserving source precision. Do not manufacture scenes or a local outcome to add drama. |
| Optional branches B1/B2 | Both questions reward much the same distinction between a rule and actual conditions. | Keep B1 about choosing evidence. Make B2 concentrate on *máxima* versus *exactamente* and the function of *será*. Retain explanations for every choice, immediate access and no progress gate. |
| Page 8, participation | “Este caso cambia nuestra pregunta” introduces a question already asked on page 2; its English summary includes an author-facing assurance absent from the Spanish. | Make this an explicit return to the opening participation question. Move the assurance about women's political activity to editorial notes, retaining Galindo's concrete action in both languages. |
| Page 2 citations | S2's convocation schedules the assembly; that alone does not establish that it met. | Add the already-listed S1 preamble as support for the December meeting. Fresh retrieval supports this narrow citation fix; no additional historical episode is needed. |

Preserve original-quotation, modern-paraphrase, translation and meaning-summary labels.
Preserve the explicit 1910 look back and the 2008-transcription label on the local letter.
The page-9 wording change and citation addition are precision fixes. Pacing and activity
changes are editorial choices to try, not evidence that the current chapter is historically wrong.

## Approved A1: read and explore the whole chapter

Build one development-only preview of the eventual shared player. This is a bounded part of
increment A, not completion of A or the usable integrated A+B release.

- All ten core pages, their conclusion, an outline, Previous/Next and both optional branches.
  Each branch returns to its originating page. The owner can finish without answering anything.
- English summaries and contextual glosses open in place. Source notes and institutional links
  remain available independently of activities. External sources open separately without
  navigating the reader away; their content requires a network connection.
- Temporary objective feedback, with explanatory text and no scores, mastery or activity log.
- The final reflection prompt and optional model, **without a typing field**. This tests the
  invitation to write while durable drafts remain separately designed. It does not test the
  writing workflow. The preview clearly says that position and choices reset on reload.
- Authored text cards and a date comparison. A simple place-orientation graphic may be included
  only with verified placement and text equivalents; a place-name card is the bounded fallback.
  Use the existing palette and typography. No new visual identity is being selected.
- No archival scans/photos, audio, generated illustrations, notebook handoffs, dictionary
  dependency, lesson library entry, saved progress or schema change in A1.

Keep the checked short excerpts and full attributions only after their specific reproduction
basis is recorded. Prior text verification is not rights clearance. If unresolved, use a labeled
source link and authored explanation, record which close-reading experience remains untested,
and do not silently substitute a paraphrase under an original-text label. Unresolved archival
image rights do not block the text-and-card preview.

Preview navigation stays in React memory. Browser Back leaves the standalone preview; it is
not the notebook's guarded history flow. Previous/Next/outline/Return handle movement inside
this preview. Restoring reading position after a source visit in another tab is testable;
resume after refresh/restart and integrated Back behavior belong to increment B.

## Small implementation commits, after approval

Approval of A1 covers all seven editorial rows above and the three commits below,
including the focused planning-document split. It accepts those changes for a preview,
not certify the final chapter's difficulty or authorize integrated release B.

1. **Prepare the script and lighten the planning documents.** Apply the agreed editorial
   refinements and source/attribution decisions. Separate the existing plan into owner-facing
   scope and integration documents, retaining a short PLAN index/delivery sequence and all
   existing research links, deferred ideas and approval boundaries. Fix inbound anchors;
   chapter script and sources stay in this folder. This follows reassessment §11 without
   restructuring unrelated documentation. Record accepted reasons once.
2. **Encode the chapter and validate it.** Put content and pure validation in
   `src/features/lessons/`, with stable semantic IDs and a separate content revision. Use plain
   structured text, citations and explicit source-layer labels, not executable HTML. Validate
   uniqueness, core order/reachable conclusion, branch destinations/returns, source references
   and objective answer/feedback IDs. Colocate meaningful tests under `src` so current lint
   and test discovery apply. Do not build a general authoring system or revision-migration engine.
3. **Build the shared player and isolated preview.** Add `src/features/lessons/LessonPlayer.jsx`,
   its tests, `src/features/lessons/preview/index.html` and `main.jsx` in that same preview
   directory, plus root `vite.lessons.config.js` and `npm run dev:lessons`. Default to
   `127.0.0.1:5174` with `strictPort: true`, independently of the normal app's `PORT` variable.
   Use a preview-directory root, `publicDir: false`, React/Tailwind only and no PWA plugin.
   The config rejects `command === "build"` and `isPreview`; this entry is served only by
   the development server. Complete the verification below, Claude review and routine fixes
   within this scope. Report the preview address and owner review questions. Push only on a
   separate request.

Localhost on the XPS is not automatically reachable from the owner's phone or laptop. An owner
phone walkthrough can use the existing [private-network recipe](../../../agents/XPS.md#checks-and-phone-preview)
after verifying its network boundary and port reachability; do not expose the server publicly.
If private access is unavailable, provide inspected screenshots and report that owner interaction
remains pending. Stop task-created preview servers after verification.

Expected effort: medium, roughly one or two implementation/review sessions, with editorial
feedback and any rights investigation able to add time. The main engineering risks are branch
state/focus behavior and accidental coupling to app startup or production assets. Personal-data
risk is low only if the entry and dependency boundaries are verified. The proposal fits the
current contract without using its supporting-store allowance.

## Architecture and verification

Reuse the existing palette, typography and simple presentational pieces from `src/theme.jsx`
and `src/index.css`; give buttons explicit types. The preview entry imports the stylesheet and
the same local Literata 400/400-italic/600/700 faces directly, without importing normal startup.
Keep new executable content under `src` so
`eslint.config.js` and `vitest.config.js` cover it without expanding their globs.

Do not import the normal `main.jsx`: it invokes the personal-schema check. Do not import App,
notebook hooks, DB operations, drill/Taller/session wrappers, speech or AI helpers. Those paths
carry startup, persistence, reference, logging or navigation behavior that this preview does
not need. Structured text avoids the remote-image behavior allowed by the existing Markdown
renderer. No lesson assets go into `public/`, and the normal app never imports the preview.
The production PWA currently precaches emitted PNG/SVG and app assets, excluding the dictionary.

Acceptance after implementation:

- Content tests reject duplicate IDs, missing destinations/returns/citations, invalid answer
  IDs and unreachable endings. Deliberately break a branch return to show its check fails.
- Player tests cover finishing without exercises, outline jumps, help preserving position,
  both branch round trips, immediate feedback/model access, and meaningful heading focus after
  navigation. Returning from a branch restores its origin and focuses its launch control.
- Inspect transitive imports and instrument a fresh preview browser profile before its entry runs
  (Chromium DevTools Protocol new-document injection and request logging are available here): no IndexedDB opens,
  local/session-storage writes, service-worker registration, AI calls or remote media loads
  during ordinary reading/checks. Local Vite/font resources are expected; external source
  requests occur only through explicit links. Prove the isolation check catches a deliberate
  storage-opening violation, then remove it.
- Run zero-warning lint, the complete serial test suite, the production build and diff checks.
  Capture failures before retrying; no fake timers or timeout increases.
- Inspect `dist` and `sw.js` for excluded preview HTML, lesson text and assets. Shared Tailwind
  scanning can add utility CSS, so do not promise byte-identical production CSS. Inspect any
  resulting CSS effect and smoke-check the ordinary app; do not restructure global styling.
  Verify that building with the lesson config and using it for `vite preview` both fail clearly.
- Use disposable fixtures/profile at 375 px. Inspect opening, longest page, English help,
  both branches, feedback and conclusion; check keyboard/focus, overflow and console errors.
  Verify local Literata loading and computed styles for lesson-only utilities. If source
  discovery needs adjustment, keep it in a preview-only stylesheet. Use React StrictMode in
  the preview and matching component tests so development effect behavior is exercised.
  Record what was actually seen. Owner acceptance of pace, language and usefulness remains
  separate from automated checks.
- Request focused Claude review of content changes and completed preview boundaries. Resolve
  grounded findings within the approved scope, rather than requesting approval for routine fixes.

No tests or build were run for this document-only review; no application behavior changed.

## Evidence and review record

Two read-only Codex investigations covered editorial/source-label consistency and the actual
preview integration boundaries. Claude Code independently reviewed the complete storyboard and
source packet with tools disabled. Its useful additions were the unfulfilled page-3 transition,
the record-versus-event wording on page 5, the participation callback and schooling false friends;
these are included above. It also supported the isolated preview and the honest reflection
tradeoff. The primary reviewed the script, source packet, development
plan, current contracts, relevant decisions, Vite/PWA startup, lint/test globs, theme and
Markdown/media behavior. The clean starting revision was `f86c841`, synchronized with main.

Fresh text spot-checks on 2026-10-18, not a repeat of the entire earlier research pass:

- [S1 original-text transcription](https://www.diputados.gob.mx/LeyesBiblio/ref/cpeum/CPEUM_orig_05feb1917.pdf):
  preamble supports the December 1916 meeting; Article 123 I and transitional provisions
  support the selected labor clause and date qualifications. No new scan inspection in this pass.
- [S2 convocation](https://archivos.juridicas.unam.mx/www/bjv/libros/6/2883/19.pdf):
  Article 1 schedules the opening, which is distinct from evidence that the meeting occurred.
- [S3 inspected edition](https://archivos.juridicas.unam.mx/www/bjv/libros/15/7102/8.pdf),
  printed p.109: retrieved text retains the planting fragment and April 1910 context. The
  original manuscript and reuse basis remain unverified here.
- [SRE Galindo biography](https://portales.sre.gob.mx/ppt-celac/es/biblioteca-digital-celac-hermila-galindo/2-uncategorised/35-quien-es-hermila-galindo-3):
  supports the broad initiative/rejection account. The draft deliberately avoids its exact date.

Agent review is not historian or native-speaker certification. Source/asset rights, owner
editorial acceptance and implementation approval remain distinct decisions.

Claude's suggestion to replace B1 with card matching is deferred: the current check is
deliberately modest and ungraded, and a new interaction is unnecessary to test the chapter.
Its proposed translation changes are optional editorial alternatives, not established errors.
No new assembly conflict is added from recollection. Its suggestion that A remains incomplete
because audio is absent is not adopted: audio belongs to increment D. A1 remains partial
because it narrows the response and media experience. At review time, authorization was
pending; the owner has since approved A1, as recorded above.

A second, focused Claude plan review prompted explicit file paths, font imports, port/owner
access behavior, approval coverage, config refusal checks and browser instrumentation. Its
claim that the entry would be outside lint came from the abbreviated path; the entry is now
spelled out under `src/features/lessons/preview/`, already covered by existing globs. The plan
split remains an explicit part of the proposed approval, following reassessment §11. No second
model's recommendation is treated as owner approval.

Implementation editorial check: Claude reviewed v0.2 and confirmed the seven rows and objective
answer keys. Routine fixes clarified B2's two-word title and schedule wording, retained Galindo's
written action in English, smoothed page-9 grammar and made approval status explicit.
