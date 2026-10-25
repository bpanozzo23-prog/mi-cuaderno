# Release history

Record publication evidence here: date, published revision, CI run and checks. CURRENT links
to the latest verified release; decisions record reasons, not repeated test/deploy transcripts.
Documentation-only follow-ups covered by the [workflow exclusions](../../.github/workflows/deploy.yml)
normally skip deployment. Keep the last verified published revision; the
[agent guide](../AGENT-GUIDE.md#environment-and-checks) covers publication checks and filter limits.

## 2026-10-24 — Keep adds to existing entries (Ask about this, step 2)

| Date | Published revision | Work | CI and checks |
|---|---|---|---|
| 2026-10-24 | `a8cbe36` | Keep adds to attached entries: frozen snapshots and content fingerprints, `updates` schema and prompt, additions normaliser, one-transaction `applyKeep`, change cards, settings copy, Codex fixes and contract record (`01430fc`–`a8cbe36`) | [40147692428](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/40147692428): lint, 2,240 tests / 173 files in 247.59 s, build and deployment passed; seven live files returned HTTP 200 and matched local build bytes |

The owner-requested push advanced `main` from `ae3f791` to `a8cbe36`; local HEAD matched
`origin/main`. CI used Node 24.21.0 / npm 11.19.0. Live comparison covered index HTML, manifest,
service-worker registration, service worker, entry/application JavaScript and CSS, against the
local build of `762ed6e` (later commits are documentation only).

Local acceptance passed zero-warning lint, the complete serial suite (2,240/2,240 across 173 files
in 467.52 s) and the production build. Every new guard was shown to fail with its protection
removed. Headless Chromium at 375×812 with fixtures and locally fulfilled Anthropic requests
verified the flow; no real API call was made and no owner data was accessed. Codex reviewed the
design (eight findings) and the diff (four findings, then two follow-ups); all were fixed.
Personal schema v12 and backups are unchanged. Pending owner checks are listed in
[CURRENT](../CURRENT.md).

## 2026-10-24 — Ask about this (attachments for Pregunta)

| Date | Published revision | Work | CI and checks |
|---|---|---|---|
| 2026-10-24 | `3f13cf1` | Ask about this: attachment snapshots, Ask request and Keep changes, App queue, Pregunta chips/preview/starters, entry, page and Repaso buttons, settings copy, Codex fixes and contract record (`5fc017b`–`3f13cf1`) | [40136679980](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/40136679980): lint, 2,195 tests / 171 files in 246.04 s, build and deployment passed; seven live files returned HTTP 200 and matched local build bytes |

The owner-requested push advanced `main` from `a81425a` to `3f13cf1`; local HEAD matched
`origin/main`. CI used Node 24.21.0 / npm 11.19.0. Live comparison covered index HTML, manifest,
service-worker registration, service worker, entry/application JavaScript and CSS.

Local acceptance passed zero-warning lint, the complete serial suite (2,195/2,195 across 171 files
in 462.46 s) and the production build. Every new guard was shown to fail with its protection
removed. Headless Chromium at 375×812 with fixtures and locally fulfilled Anthropic requests
verified the flows; no real API call was made and no owner data was accessed. Codex reviewed the
plan (eight findings) and the diff (four findings); all were fixed. Personal schema v12 and
backups are unchanged. Pending owner checks are listed in [CURRENT](../CURRENT.md).

## 2026-10-24 — Ask + Keep (Pregunta)

| Date | Published revision | Work | CI and checks |
|---|---|---|---|
| 2026-10-24 | `29101fe` | Ask + Keep: Pregunta tab, Keep proposals and review, shared AI request layer, batch writer, settings copy, Codex fixes and contract record (`8971557`–`29101fe`); also publishes the earlier local guided-lessons A1 preview commits | [40121045969](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/40121045969): lint, 2,141 tests / 169 files in 187.16 s, build and deployment passed; seven live files returned HTTP 200 and matched local build bytes |

The owner-requested push advanced `main` from `f86c841` to `29101fe`; local HEAD matched
`origin/main`. CI used Node 24.21.0 / npm 11.19.0. Live comparison covered index HTML, manifest,
service-worker registration, service worker, entry/application JavaScript and CSS. The
guided-lessons preview remains a separate development entry outside the production build.

Local acceptance passed zero-warning lint, the complete serial suite (2,141/2,141 across 169 files
in 476.23 s, no unhandled errors) and the production build. Every new safety test was shown to
fail with its protection removed. Headless Chromium at 375×812 with fixtures and locally fulfilled
Anthropic requests verified the flow; no real API call was made and no owner data was accessed.
Codex reviewed the plan (six findings) and the diff (five findings); all were fixed. Personal
schema v12 and backups are unchanged. Pending owner checks are listed in [CURRENT](../CURRENT.md).

## 2026-10-18 — Guarded Back/Forward navigation

| Date | Published revision | Work | CI and checks |
|---|---|---|---|
| 2026-10-18 | `740311a` | Guarded Back/Forward ordering (`90bd038`) and contract/verification record (`740311a`) | [39147520015](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/39147520015): lint, 1,960 tests / 158 files in 226.65 s, build and deployment passed; seven live files returned HTTP 200 and matched local build bytes |

The push advanced `main` from `4e65b12` to `740311a`; local HEAD matched `origin/main`.
CI used Node 24.21.0 / npm 11.19.0. Live comparison covered index HTML, manifest,
service-worker registration, service worker, entry/application JavaScript and CSS. This
publication record is a documentation-only follow-up and does not require redeployment.

Local acceptance passed zero-warning lint, 39 focused checks, the complete serial suite
(1,960/1,960 across 158 files in 412.48 s, no unhandled errors), production build and diff
checks. Eighteen new integration cases cover superseding navigation, read/write failure,
competing saves, refused navigation, queued recovery, unmount, saved-entry identity, study
markers and the navigation-depth cap. All 16 initial regressions failed against the original
App; the cap regression independently failed when recovery used capped depth. Read-only
Claude CLI review identified the cap issue; follow-up review of the corrected implementation
found no grounded actionable defects.

Fresh Chromium fixtures at 375×812 verified saved-entry Forward, a newer Repaso choice through
old refresh failure/retry, and refused navigation recovery followed by valid-date exit, retaining
one saved entry. Four screenshots were inspected with no horizontal overflow, browser warnings
or uncaught errors. The disposable profile was removed and preview stopped; no owner data was
accessed. Personal schema v12, backups, dependency resolutions and save/refresh policy are
unchanged. Existing build chunk-size warnings and npm audit findings (2 moderate, 5 high)
remain; physical Android Back verification remains pending in [CURRENT](../CURRENT.md).

## 2026-10-18 — Shared Node selection and Journal navigation ordering

| Date | Published revision | Work | CI and checks |
|---|---|---|---|
| 2026-10-18 | `d37b943` | Shared Node selection (`3af203c`, `a3d3656`) and Journal tab navigation ordering (`2c18404`, `d37b943`) | [39142390630](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/39142390630): lint, 1,942 tests / 157 files in 220.16 s, build and deployment passed; seven live files returned HTTP 200 and matched local build bytes |

CI read `.nvmrc` as Node 24 and selected Node 24.21.0 / npm 11.19.0. The push advanced
`main` from `b5c3812` to `d37b943`; local HEAD matched `origin/main`. Live comparison covered
index HTML, manifest, service-worker registration, service worker, entry/application JavaScript
and CSS. The publication record is a documentation-only follow-up and does not require redeployment.

Local acceptance with Node 24.19.0 / npm 11.17.0 passed zero-warning lint, the complete serial
suite (1,942/1,942 across 157 files in 405.69 s, no unhandled errors), production build and diff
checks. Ten added integration cases cover delayed tab choices, competing saves, read failure,
refused reselection, materialization, Back/Forward, unmount and another in-app visit. Seven cases
failed against the original implementation; independently removing the visit guard failed its
targeted case. Focused read-only Claude review found no actionable defects introduced by the fix;
its refused-request coverage suggestion was added and passed.

Fresh headless Chromium fixtures at 375×812 verified delayed refresh success, failure/retry and
Back/Forward while preserving one saved entry. Four screenshots were inspected, with no horizontal
overflow, browser warnings or uncaught errors. The disposable profile was removed and preview
stopped. No owner data was accessed. Save/refresh policy, dependency resolutions, personal schema
v12 and dictionary data are unchanged. The existing build chunk-size warning and npm audit findings
(2 moderate, 5 high) remain; owner-device checks remain pending in [CURRENT](../CURRENT.md).

## 2026-10-18 — Documentation-only CI filtering

| Date | Published revision | Work | CI and checks |
|---|---|---|---|
| 2026-10-18 | `ac527a0` | Documentation-only push exclusions (`abad2e4`) and deployment guidance | [39134092760](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/39134092760): lint, 1,932 tests / 157 files in 162.26 s, build and deployment passed; seven live files returned HTTP 200 and matched local build bytes |

The mixed workflow/documentation push triggered the existing full gate. Manual dispatch, jobs,
permissions and concurrency are unchanged. Local verification passed YAML parsing and structural
comparison, 29 changed-path cases, zero-warning lint, the complete serial suite (1,932/1,932 across
157 files in 410.57 s, no unhandled errors), production build and diff checks. Path cases include
code, assets, configuration, mixed changes, deletions and old/new rename paths; local checks do
not emulate GitHub's large-diff limits. Documentation-only publication records use the exclusions.

Live comparison covered index HTML, manifest, service-worker registration, service worker,
entry/application JavaScript and CSS. Application behavior, personal schema, dependencies and
Node configuration are unchanged. The existing build chunk-size warning and SpeakButton test
fixture's nested-button warning remain; CI reports no failing tests or unhandled errors.

## 2026-10-18 — Awaitable notebook refresh

| Date | Published revision | Work | CI and checks |
|---|---|---|---|
| 2026-10-18 | `4b7d47d` | Bounded awaitable-refresh follow-up (`0d14853`, `a28976a`) and verified contract record | [39099125670](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/39099125670): lint, 1,932 tests / 157 files in 169.29 s, build and deployment passed; seven live files returned HTTP 200 and matched local build bytes |

The live comparison covered index HTML, manifest, service-worker registration, service worker,
entry/application JavaScript and CSS. Local acceptance on 2026-10-17 passed zero-warning lint,
the complete serial suite (1,932/1,932 across 157 files in 393.30 s, no unhandled errors), the
production build and diff checks. The existing build chunk-size warning remains. Seventy focused
tests passed; deliberately resolving before React commit, restoring stale navigation data, and
removing the originating-visit guards failed their targeted regressions.

Disposable headless Chromium at 375×812 verified long Journal text through refresh failure/retry
and pending Taller Keep through a tab switch without duplicate writes. Four screenshots were
inspected; there was no horizontal overflow, browser warning or uncaught error. Temporary
profiles and the preview were cleaned up. No owner data was accessed. Storage, personal schema
v12, backup compatibility and event policy are unchanged; existing owner-device checks remain
pending in [CURRENT](../CURRENT.md).

## 2026-10-17 — Step 5 lint setup

| Date | Published revision | Work | CI and checks |
|---|---|---|---|
| 2026-10-17 | `2dfe9c2` | Bounded local/CI lint setup, reviewed baseline findings and Cuaderno alias-metadata dependency fix; three commits from `33b5300` | [39090099456](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/39090099456): lint, 1,914 tests / 155 files in 157.69 s, build and deployment passed; seven live files returned HTTP 200 and matched local build bytes |

The live comparison covered index HTML, manifest, service-worker registration, service worker,
entry/application JavaScript and CSS. Local clean install, zero-warning lint, the complete serial
suite (1,914/1,914 across 155 files in 444.94 s, no unhandled errors), production build and diff
checks passed. The existing build chunk-size warning remains. Focused tests passed 69/69;
removing the alias dependency deliberately failed the new metadata-arrival regression. In-memory
lint probes detected undefined JSX names, browser/Node global mistakes, conditional Hooks and
missing dependencies, while accepting intentional field removal and excluding historical output.

Disposable Chromium fixtures at 375×812 verified alias-result replacement, retained Diario and
conflict drafts, and the Diario unmount save. Four screenshots were inspected with no horizontal
overflow, browser warnings or uncaught errors. No owner data was accessed; the preview server
was stopped and the disposable profile removed. Schema remains v12, dictionary files are
unchanged, and existing owner-device checks remain pending in [CURRENT](../CURRENT.md).

## 2026-10-17 — Steps 2 and 3

| Date | Published revision | Work | CI and checks |
|---|---|---|---|
| 2026-10-17 | `33b5300` | Documentation-only follow-up; application unchanged from `c82889f` | [39086772342](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/39086772342): 1,913 tests / 155 files in 219.37 s, build and deployment passed; checked at Step 5 start, no new live-asset comparison |
| 2026-10-17 | `c82889f` | Documentation reset and accepted product/architecture contract; eight commits from `b48a948`, no application behavior change | [39086426104](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/39086426104): 1,913 tests / 155 files in 207.00 s, build and deployment passed; local build passed; seven live files returned HTTP 200 and matched local bytes |

The `c82889f` live comparison covered index HTML, manifest, service-worker registration, service worker,
entry/application JavaScript and CSS. Documentation checks covered 105 Markdown files, unchanged
brief v3 and preserved historical records. Existing owner-device checks remain pending in
[CURRENT](../CURRENT.md); no new browser walkthrough or owner-data access was needed.

## 2026-10-17 — Step 1

| Date | Published revision | Work | CI and checks |
|---|---|---|---|
| 2026-10-17 | `b48a948` | Documentation closeout; application unchanged from `6d92bab` | [39080236039](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/39080236039): tests, build and deployment passed; owner reported 1,913 tests / 155 files and verified live assets |
| 2026-10-17 | `6d92bab` | Item 4: five small fixes | [39079960584](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/39079960584): 1,913 tests / 155 files, build/deploy; live JS/CSS matched local build |
| 2026-10-17 | `aa9db7d` | Item 3: all-or-nothing saves (`0311096`) | [39076885631](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/39076885631): 1,883 tests / 151 files, build/deploy; live assets matched |
| 2026-10-17 | `bca7f22` | Item 2: backup safety (`6d59e76`) | [39070596526](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/39070596526): 1,849 tests / 150 files, build/deploy; live entry assets matched; owner fixture check complete |
| 2026-10-17 | `401bc74` | Item 1: test gate | [39057987662](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/39057987662): 1,816 tests / 148 files, build/deploy |

[Step 1](../reviews/2026-10-17/STEP-1.md) retains implementation details, negative controls,
fixture checks and verification limits. The final workflow was checked again during Step 2 planning;
older results above are preserved release evidence, not fresh test runs.

## Earlier releases

This index carries the revisions and CI links named in the
[preserved README status](README-STATUS-2026-10-17.md#status). Some narratives name multiple
implementation/publication commits; those references are retained without labelling all of them
as separate deployments. Dates and detailed checks remain in that snapshot and the linked reports.
This index extracts references from each README narrative; archived reports and decisions may
contain further publication details. An unlisted reference does not mean verification failed.

| Historical release narrative | Recorded revision references | Recorded CI evidence |
|---|---|---|
| Phase 0 — done | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Phase 4 — ongoing maintenance | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Phase 6 — first slice deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Phase 7 — shipped | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Phase 8 — shipped | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Phase 9 — shipped | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Phase 10 — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Phase 11 — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Phase 12 — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Phase 13 — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Phase 14 — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Phase 15 — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Phase 16 — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Phase 17 — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Phase 18 — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Phase 19 — deployed | `4f73a45` | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Phase 20 — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Phase 21 — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Phase 22 — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Phase 23 — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Phase 24 — deployed | Not identified in snapshot | [run 31723115634](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/31723115634) |
| Phase 25 — safe slice deployed | `1432dd1` | [run 31749800168](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/31749800168) |
| Phase 26 — deployed | `6780961` | [run 31812821165](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/31812821165) |
| Editable media links — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Collection bulk capture — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Vocabulary group collapse — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Compact page sections — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Notebook formatting — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Page hierarchy and icon actions — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Optional Grammar key idea — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Persisted Diario feedback (Phase 6, second slice) — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Inline media rendering — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Picture-front flashcards — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Editor writing comfort — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Meaning-level interjection override — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Android share target — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Share arrival destination chooser — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Continue-with-this-video — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| New word/phrase share destination — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Example-to-phrase bridge — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Personal twin merge — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Apuntes — deployed | `29c3840` | [run 31835260852](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/31835260852) |
| Attach-later for unattached words — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Backup pos validation widened — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Creation-time dictionary suggestions — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Meaning-example reading polish — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Additional Refine views — deployed | `c97ed20` | [run 31897874543](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/31897874543) |
| Suppressed-containment confirmation — deployed | `39c0e90` | [run 31917078425](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/31917078425) |
| Broader parts of speech — deployed | `0de63dd` | [run 31918541094](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/31918541094) |
| Lexical-note Markdown parity and meaning-example editing — deployed | `de89791` | [run 31972144810](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/31972144810) |
| General-example reading polish and editing — deployed | `b77d809` | [run 31993261452](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/31993261452) |
| Typography: Literata entry face — deployed | `d459d64` | [run 31995019703](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/31995019703) |
| Typography: small-caps grammar labels — deployed | `51f21c3` | [run 32049318652](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/32049318652) |
| Markdown callout variants and inline actions — deployed | `1869593` | [run 32081320262](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/32081320262) |
| Cuaderno landing foyer — deployed | `65200bf` | [run 32194741780](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/32194741780) |
| Repaso search-miss display removal — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Compact tag settings and duplicate review — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Browser-backed navigation continuity — deployed | `3b4e717` | [run 32208156024](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/32208156024) |
| Cuidar mi cuaderno hub — deployed | `f6f5f04` | [run 32213861769](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/32213861769) |
| Compact Cuidar and Pasear landing doors — deployed | `3dc1ecf` | [run 32215040409](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/32215040409) |
| Global-search creation bridge — deployed | `4968878` | [run 32279564126](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/32279564126) |
| Share page-kind chooser — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Diario skill-focused prompts — deployed | `7ed9aca` | [run 32292697167](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/32292697167) |
| Pasear random continuation — deployed | `976d9c0` | [run 32420448459](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/32420448459) |
| Taller — Diario writing practice — deployed | `6d7dd34` | [run 32437421316](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/32437421316) |
| Lexical Structured Notes — deployed | `2b8fabd`, `6195ee8` | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Recent list expansion — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Contrasts lane — deployed | `bc5c053` | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Forms Choose — deployed | `f3e4d03` | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Transform lane — deployed | `939e48f` | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Diario skill-prompt examples and coverage expansion — deployed | `1316ee2` | [run 32904787874](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/32904787874) |
| Additional Taller skill coverage — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Taller language polish and composite grammar targets — deployed | `e8603a7` | [run 33338694755](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/33338694755) |
| Pages hub derived grouping — deployed | `71e6b17` | [run 32918989431](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/32918989431) |
| Copy structure from the page being copied — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Exact meaning refinements and match-aware Words & phrases cards — deployed | `f5c8e83` | [run 33108273404](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/33108273404) |
| Per-meaning Similar relationships v1 — deployed | `4432465` | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Diario home and role-color polish — deployed | `0627b18` | [run 33140753545](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/33140753545) |
| Same-day Diario continuations — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Pages hub folder edge and role glyphs — deployed | `72ac29d` | [run 33190454395](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/33190454395) |
| Diario daily cluster and Taller provenance — deployed | Not identified in snapshot | [See snapshot narrative](README-STATUS-2026-10-17.md#status) |
| Open-page hierarchy polish — deployed | `d277208` | [run 33206718849](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/33206718849) |
| Today-action and open-entry density follow-up — deployed | `dc696bc` | [run 33212209269](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/33212209269) |
| Folder-tab containing-block fix — deployed | `3513e11` | [run 33216885561](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/33216885561) |
| Test reliability hardening — pushed and deployed | `b04c171` | [run 33800415895](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/33800415895) |
| Same-heading dictionary meanings — deployed | `1f4ffdc` | [run 34425595454](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/34425595454) |
| Plural dictionary attachments — deployed, owner phone check pending | `3c92a0f` | [run 34529040809](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/34529040809) |
