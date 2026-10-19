# 1917 review and A1 preview

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

At the original document-only review, no tests or build were run and no application behavior changed.
Implementation evidence follows below.

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

## Implementation closeout

2026-10-18 — A1 is complete locally, not pushed or deployed. The seven editorial refinements,
planning split, structured chapter and isolated player are implemented. Content revision is
`0.2.0-a1`; semantic IDs are independent of that revision. The text-card fallback was used for
place orientation, and the [source packet](SOURCES.md) records the specific basis for the two
short excerpts. No archival images or new media were included.

Verification of the final implementation:

- Zero-warning lint and **34 focused tests** pass. The complete serial suite passes
  **1,994 tests across 160 files in 415.79s**, with zero exit and no unhandled errors.
  An earlier sandboxed run terminated with exit 143 without results; its remaining process group
  was stopped before the clean final run. No timeout policy or fake timers changed.
  The suite prints nine jsdom `Window.scrollTo` notices; lesson scrolling is mocked in component
  tests and independently verified in Chromium. These are not unhandled Vitest errors.
- The production build passes; the existing chunk-size warning remains. Production output and
  service-worker entries contain no preview HTML, lesson code/text or lesson-only styles/assets.
  The separate lesson config refuses both build and preview commands with its development-only
  error. Production CSS is byte-identical to the pre-task build. The JavaScript hashes change
  because `src/version.js` imports package metadata, now including `dev:lessons`; that script
  string is present, but the lesson entry and content are absent. No assets were added beyond
  the renamed app chunks; `index.html` and `sw.js` reference their new hashes.
- Content validation catches a deliberately broken branch return. New-document browser
  instrumentation blocks database opens/deletion, local/session-storage writes and service-worker
  registration; deliberately injecting a database open fails the intended isolation assertion.
  The restored complete flow makes none of those calls, no AI/remote-media requests and no
  notebook startup imports. The 43 recorded requests are local development/font resources.
- Fresh disposable Chromium profiles at **375×812** cover the opening, assembly, 1910 letter,
  source/date distinctions, English/glossary help, both branches and feedback, conclusion/model,
  and finish without writing or answers. Eleven preview screenshots were inspected. Branch
  return restores scroll, focus and open help; reload resets transient state. Local Literata
  loading, shared button styles, zero horizontal overflow and no console warnings/errors pass.
- Tab traversal reproduced a control partly hidden by the sticky navigation bar; preview-only
  scroll padding fixes it, and the same check passes. Keyboard disclosure activation and heading
  focus also pass. This is browser evidence, not a physical-phone or screen-reader certification.
- A separate fresh profile seeds two synthetic notebook items into the normal production app.
  Cuaderno, lexical detail, Diario and Repaso smoke checks and four inspected screenshots pass
  at 375×812, with no horizontal overflow, warnings or uncaught errors. No owner data was accessed.
  Task-created browser profiles were removed and preview servers stopped. One browser run passed
  interactions but hit a profile-removal race during Chromium shutdown; bounded cleanup retries
  resolved it and the final run exited zero.
- Diff and local documentation-link checks pass. The normal application, dependencies, personal
  schema v12, backups, reference data, event policy and deployed revision are unchanged.

Two read-only Codex investigations checked content fidelity and player/test boundaries. Claude's
content and code reviews prompted source/language precision, persistent feedback live regions,
finish-button focus retention, branch outline marking, validation gaps and the keyboard fix.
Its follow-up found no blocking or medium-severity issue; the three low-severity findings were
resolved with required content arrays, removal of an unnecessary label on a generic card, and
verified scroll padding. No further media interaction or integration was added.

Run instructions and owner review prompts are in [the feature README](../../README.md#try-the-a1-preview).
Owner acceptance of narrative interest, Spanish difficulty, pacing and phone usability remains
pending. The optional reflection still does not test durable writing. Broader media work and
increment B's storage/backup/resume design need their own bounded plan; a push remains separate.

## First owner feedback: visual interest

2026-10-18 — The owner wants a more visually appealing lesson to help sustain interest,
including possible images, maps, diagrams and formatting improvements. This is the first
preview feedback, not acceptance of the narrative, language level or whole chapter.

Fresh 375×812 captures show a readable but repetitive paragraph-and-card rhythm; the opening's
title, preview notice and outline control occupy substantial space before the story. Three
independent image concepts were shown, in this order: **1. Illustrated reader**, **2. Map-led
opening**, **3. Evidence-focused page**. The images and side-by-side comparison are disposable
artifacts outside the repository. No player code changed during the comparison. The owner's
subsequent selection and proposed implementation pass are recorded below.

The useful opportunities are a quieter opening, distinctive source quotations, a compact place
locator, a visual comparison of the page-5 evidence, and the page-9 date distinction. These can
be combined after owner feedback; they are not an instruction to decorate every page. Actual
chapter text and the existing palette ground the concepts. The generated map is a layout sketch
with unverified geography/boundaries, not a usable geographic asset. Illustrations are conceptual,
not archival evidence; source labels, readable text and accessible text equivalents remain needed.

Two read-only Codex investigations covered pacing and media/source candidates. A focused Claude
review supported compact visuals and warned against implying that the local petition caused the
national rule or that legal recognition proves local implementation. Keep the page-5 local outcome
explicitly unanswered, the page-9 election exception visible and implementation undated. A map
needs verified placement and a reusable base; archival photographs need item-level image, caption
and rights review. No photograph or scan was cleared or added in this pass.

After the owner invited another opinion, Claude inspected all three generated mockups. It
recommends a compact version of option 2's map plus option 3's evidence diagram, using option 1's
quiet preview footer. This differs from Codex's preference for option 1's warmer opening; neither
is an owner choice. Grounded follow-ups are clearer conceptual-art labels and less artifact-like
document illustrations, separated map labels with no unexplained shaded regions, and moving
option 3's closing Spanish paragraph above English help so it cannot look like disclosure content.
Check diagram wrapping and navigation spacing in the real 375px reader. The mockup review is
visual evidence, not geographic verification, rights clearance or a test of the remaining pages.

At the comparison stage, direction and implementation scope were pending. A1's existing
no-storage/no-notebook boundaries remain intact. This pass
captured and inspected the unchanged reader and reviewed concepts; it does not repeat or replace
the implementation test/build evidence above, or establish physical-phone acceptance.

## Selected direction and bounded visual pass

2026-10-18 — The owner selected **option 2, the map-led opening**: “2 is the most interesting
looking option.” This resolves the visual direction. A refined image keeps its warm atlas-like
appearance, clearer labels and quieter preview notice; it remains a style reference, not verified
geography. The owner approved the two-commit implementation pass with “Proceed.” Routine
implementation and verification fixes are authorized; publication remains separate.

The existing reader repeats paragraph/card treatments, and the opening notice delays the story.
This pass should make the opening more inviting and geographically meaningful while improving
the reading hierarchy across the chapter. It does not add the option-3 evidence diagram, date
diagrams, photographs, activities or additional map placements.

### Two implementation commits

1. **Prepare a verified, local locator.** Use a pinned reusable geographic base and independently
   checked locality positions for Querétaro, Ciudad de México and Anenecuilco. Render a compact
   central-Mexico locator with a whole-country inset, north up, no state boundaries, invented
   shaded regions, routes or historical control areas. Keep the selected paper/blue/ochre style,
   but derive geography from source data. Record provenance, source hashes, point records and
   projection/crop choices in `SOURCES.md`. Add a small static `LessonLocator.jsx` and only the
   necessary opening-card metadata and validation in `content1917.js` / `contentValidation.js`.
   Retain the three place names as a text equivalent and a visible modern-orientation caption.
   No general media loader, map library, remote tiles or runtime fetches. Do not ship unverified
   coordinates or substitute the generated map for the checked asset.
2. **Apply the selected reader layout and verify it.** In `LessonPlayer.jsx`, group the existing
   outline and reading-position information into a compact header, place the locator immediately
   after the opening's heading and before its prose, and replace the opening's name-only card.
   Keeping the heading before the map lets existing heading focus/scroll reveal it on return.
   Give the reset/navigation notice a quieter location in normal flow while preserving its full
   information. Use scoped `preview/preview.css` for typography, spacing, dividers and distinct
   source treatments. Retain readable prose, credits and help; do not trade font size for fitting
   the entire page into one viewport. Leave navigation state, branch refs, focus/scroll effect,
   choice behavior and source links intact. Complete the checks below and record the outcome.

The map's subject matter was already allowed in A1; replacing the card and regrouping the header
are structural under the guide's visual-change rule, covered by the owner's approval of this
bounded pass. Effort is small to medium; the main risks are geographic fidelity,
crowded labels, heading/branch focus and accidental inclusion in production assets. It fits the
isolated preview without changes to notebook data, schema v12, backups, reference data or events.
All component/assets remain under `src/features/lessons/`, outside `public/`; use existing palette
tokens. Any asset derivation is data-based cartography, not invented vector illustration.

### Geographic preparation at approval time

[Natural Earth 1:50m Admin 0 Countries](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/)
has a [pinned v5.1.1 source](https://github.com/nvkelso/natural-earth-vector/tree/v5.1.1/50m_cultural)
and [public-domain terms](https://www.naturalearthdata.com/about/terms-of-use/). Its geometry has
not yet been downloaded or inspected for this pass. Use the matching source files together and
extract Mexico; the final asset should not suggest a historical boundary reconstruction.

The [INEGI locality API](https://www.inegi.org.mx/servicios/catalogounico.html) documents decimal
latitude/longitude. Exact response values remain unverified for
[Anenecuilco](https://gaia.inegi.org.mx/wscatgeo/v2/localidades/170040004),
[Santiago de Querétaro](https://gaia.inegi.org.mx/wscatgeo/v2/localidades/220140001), and the
[Ciudad de México lookup](https://gaia.inegi.org.mx/wscatgeo/v2/localidades/buscar/ciudad%20de%20m%C3%A9xico).
Resolve an appropriate city/locality point, not the federal entity's centroid. The read-only
lookup did not execute because automatic approval review reported model capacity; this was a
technical review failure, not an unsafe-action determination. Coordinate verification remains a
prerequisite to the map commit. The generated mockup does not close that gap. These were the
preparation limits; the implementation resolved the geographic sources as recorded in
[SOURCES V1](SOURCES.md#v1-verified-modern-locator-2026-10-18).

### Verification after approval

- Check map geometry and projected markers against the geographic sources, including label
  separation at 375px. Static image tests alone do not prove geographic accuracy.
- Add focused cases for locator metadata/required text alternatives and an opening-only figure.
  Preserve existing outline, branch return, focus/scroll, help, choices and reload-reset tests.
  Compare all narrative, excerpt and help strings with the pre-change chapter.
- Inspect the real reader at 375×812 and a wider viewport: opening, long/source-heavy pages,
  open help, both branches and conclusion. Check keyboard visibility, map labels, overflow,
  captions, notice readability and browser errors using disposable fixtures only.
- Run zero-warning lint, the complete serial test suite, production build and diff checks.
  Recheck preview isolation and absence of lesson/map assets from production output, and
  smoke-check the ordinary app if shared generated CSS changes. Consult Claude on the finished
  visual/accessibility and isolation changes; resolve grounded findings within this scope.

No application code changed in the preparation pass. The subsequent “Proceed” authorized
implementation; publication still requires a separate push request.

## Visual pass: implementation and verification handoff

2026-10-18 checkpoint — The approved pass was implemented in the working tree, **not yet complete,
committed, pushed or deployed**. The 2026-10-19 retry/closeout below supersedes this blocker status.
The pass replaces the opening name card with the verified modern locator,
groups the outline and reading position into a compact header, preserves the full preview
notice below the reading, and distinguishes excerpts from paraphrases through scoped styling.
No new activity, persistence, notebook integration, event, backup or schema change is included.

The source packet closes geographic verification using a pinned Natural Earth 1:110m outline
and official landmark records. Two read-only Codex investigations checked source provenance and
player/validation risks. Their grounded fixes bind labels to stable place IDs, reject reordered
text equivalents and move the Ciudad de México label below the inset. Actual glyph clearance
and visual quality still need browser inspection; source review does not establish them.

Completed checks:

- Zero-warning lint and all **2,002 tests across 160 files** in the complete serial suite,
  417.18s, exit zero with no failing tests or unhandled errors. The final label-only adjustment
  shortened the inset label to “México” and increased its size; a subsequent focused run passed
  **42 tests across two files** in 5.85s, followed by lint. The suite adds seven authoring
  rejection cases and one locator/reading-position/navigation integration case.
- A disposable copy of the authoring test fails on “swapped locator names” when the name guard
  is deliberately removed, then passes with the original validator restored. Repository files
  were not changed for this regression proof.
- All narrative, quotations, help, activities, original sources and reading order compare
  unchanged with the pre-pass content. The three original place names remain a text equivalent.
- Production build passes with the existing chunk-size warning. All **45 production files**
  match a fresh build of unchanged `a06ee3d` byte for byte, including CSS, app bundles and service
  worker. An older on-disk build differed, so it was not used as the isolation baseline.
  Lesson/map identifiers and source strings are absent from production text assets. The lesson
  configuration still refuses production build and `vite preview`.
- Source geometry is a closed 170-vertex polygon; numerical checks place all three landmarks
  inside it. Projection and inset extent derive from the same coordinates. This is separate
  from the required mobile label/layout inspection.

Checks blocked at the 2026-10-18 handoff:

- A loopback-only preview launch and its single retry did not execute because automatic
  approval review timed out. The browser inventory call timed out in the same service. A safer
  sandbox launch failed with `listen EPERM` at `127.0.0.1:5341`; no server was started.
- The read-only Claude CLI implementation review produced no result in the sandbox and was
  stopped. Its network-enabled launch did not execute: automatic approval review reported that
  the selected review model was at capacity. This was a review-service failure, not an
  unsafe-action determination. Earlier Claude concept reviews remain useful history but do
  not count as review of this implementation.
- Resume with real 375×812 and wide-reader inspection, including map labels/inset, keyboard
  focus, open help/source notes, both branch returns and conclusion. Verify zero overflow,
  unexpected network requests, persistence access or console errors using a disposable browser.
  Obtain Claude's focused implementation review and resolve grounded findings, then record the
  final evidence and make the two planned commits. Refresh/inspect the remote before committing;
  this turn has not re-established remote freshness. Push still requires the owner's request.

Scratch evidence is under `/tmp/mi-cuaderno-lesson-map/` (serial/focused/lint/build logs, source
geometry, production hashes, mutation results and the prepared Claude prompt). The selected
style reference remains `/tmp/mi-cuaderno-lesson-visuals/map-refined.png`. No owner data was
opened and no new browser profile or live preview needs cleanup. Owner narrative/language and
physical-phone acceptance remain pending independently of these tool failures.

## Visual pass: retry and closeout

2026-10-19 — The owner requested a retry of the blocked checks. The preview, disposable Chromium
and read-only Claude CLI review all ran successfully. **The bounded pass is complete locally;
it is not pushed or deployed.** Remote `main` was fetched and remains `f86c841`; the six earlier
local commits were preserved.

The real phone-width render exposed a clipped Ciudad de México label (right edge 361.02px,
map edge 359px). The label now ends to the left of its unchanged marker. The inset is slightly
taller, with its country name below the coastline. Both fixes passed a fresh capture and label
bounds check at 375×812 and 1100×900. Claude found that the new source credit preceded the
historical sources and that the visual register was stale. S6 now follows S1–S5, the citation
test removes its target by stable ID, and the register points to the verified provenance.
Claude's focused follow-up read the corrected code and phone/desktop screenshots and confirmed
all grounded findings resolved, with no concrete defect introduced by the fixes. Potential
screen-reader repetition remains an unverified minor consideration; no screen-reader test is
claimed.

Final verification:

- Zero-warning lint; complete serial suite **2,002/2,002 tests across 160 files in 429.96s**,
  exit zero, no failing tests or unhandled errors; production build and `git diff --check` pass.
  An earlier retry was intentionally interrupted to incorporate review fixes before the final
  complete run. The existing chunk-size build warning and nine jsdom `scrollTo` notices remain.
- All **45 production files** still match the fresh unchanged-`a06ee3d` build byte for byte,
  including CSS, JavaScript and service worker. No ordinary-app smoke repeat was necessary
  because no shared generated assets changed. The development-only lesson build/preview guards
  remain verified; no notebook integration or production lesson assets were introduced.
- Browser checks capture 19 screenshots at the two widths. Inspected views cover the opening,
  map on return, long/source-heavy pages, open English/glossary/translation help, keyboard focus,
  both optional branches, dates, conclusion and reflection. Branch return retains exact scroll,
  launch focus and help state; completion needs no writing, and reload resets the visit. There
  is no horizontal overflow, browser exception or console warning. All 27 unique requests stay
  on the local origin; guards detect no database access, storage writes or service-worker
  registration. [Design QA](../../../../design-qa.md) records the comparison, fixes and expected
  adaptations from the generated style reference.
- A fresh full download of the pinned geographic source exactly matches the bundled geometry;
  its upstream hash is now recorded in [SOURCES](SOURCES.md#v1-verified-modern-locator-2026-10-18).
  Original narrative, quotations, help, activities, glossary and historical-source order remain
  unchanged. The earlier deliberate authoring regression proof remains valid.

The two commit boundaries keep the verified locator/data/provenance preparation separate from
the reader/content/validation integration and its verification record. Scratch evidence remains
under `/tmp/mi-cuaderno-lesson-map/`: `browser-result.json`, `design-comparison.png`, screenshots,
`claude-retry.json`, `claude-followup.json`, `serial-retry-final.log`, `build-retry-final.log` and
`production-comparison-final.json`. Temporary profiles were removed and the loopback preview
stopped. No owner data was opened. To try the reader, use `npm run dev:lessons` and the printed
local URL; owner visual/narrative/language and physical-phone acceptance remain the next input.
Publication still requires an explicit push request.
