# Markdown callout variants and inline actions — direction

**Status:** Owner-approved and implemented 2026-08-17 with palette direction B (sage Tip,
saffron ¡Ojo!); verified locally, not pushed or deployed. This increment joins the Phase 19
umbrella (page organization and formatting) alongside §8 Explicit Notes callouts and §9 Markdown
blank lines in `docs/PHASE-19-DIRECTION.md`.
**Origin:** Owner request while reviewing Markdown editor options: study notes need a warning-toned
callout for false friends and common mistakes ("¡Ojo!") and an advice-toned callout ("Tip"),
plus two small toolbar gaps — inline code and plain links — that the dialect already half
supports. The wider GFM set (tables, strikethrough, task lists) was discussed and deliberately
deferred; autolinks, footnotes and raw HTML were rejected outright.

## Outcome

Every editor that offers the **Note callout** action today also offers **Tip callout** and
**¡Ojo! callout**. All three use the same explicit first-line marker pattern inside an ordinary
blockquote — `[!NOTE]`, `[!TIP]`, `[!OJO]` — so unmarked blockquotes keep meaning quotation and
existing notes never change meaning. Read mode renders each as the existing accessible
`<aside role="note">` with a visible label ("Note", "Tip", "¡Ojo!") and a per-type colour
treatment. Separately, every Markdown toolbar gains an **Inline code** action (backticks) and a
**Link** action (`[text](url)`), matching the existing ungated Image link and Divider actions.

This is a rendering/editor increment only, like Phase 19 §8: no schema change, no migration, no
new field, event, preference, content type, and no general admonition system. The saved Markdown
string round-trips unchanged through ordinary persistence and backups.

## Explicitly out of scope

- **Tables, strikethrough, task lists** — deferred, not rejected. If wanted later they arrive as
  cherry-picked micromark/mdast extensions with their own direction doc, because `remark-gfm` is
  all-or-nothing and would also enable the rejected features below, and because it silently
  reinterprets already-saved text (`~~`, pipes, bare URLs, `[^1]`).
- **Autolink literals, footnotes, raw HTML** — rejected. Bare URLs stay plain text; the safe
  Markdown boundary in `safeMarkdownSource`/`skipHtml` is unchanged.
- **Fenced code blocks** — only *inline* code joins the dialect. A fenced block continues to
  degrade to readable plain text (see §3 for the containment detail this requires).
- **Grammar Overview callout behaviour** — unchanged. Grammar's `calloutBlockquotes` mode, which
  renders *every* blockquote as a purple Note aside, keeps doing exactly that; the new markers
  are not introduced there in this increment. If the owner later wants Tip/¡Ojo! in Grammar,
  that is a follow-up decision, raised rather than slipped in.

## 1 — Marker grammar and parsing (`src/lib/noteMarkdown.js`)

- `visitExplicitNoteCallouts` generalizes its first-line match from `[!NOTE]` to
  `[!NOTE]`, `[!TIP]` or `[!OJO]` (same position, same trailing-whitespace/newline rule,
  case-sensitive, marker must be the very start of the blockquote's first paragraph).
- The matched type travels on the node: keep the existing `note-callout-source` class and add a
  per-type class (`note-callout-source--note|tip|ojo`) so the renderer can label and colour
  without re-parsing text.
- **Marker choice decision:** `[!OJO]` rather than reusing GFM's `[!WARNING]`, because the owner
  types what the notebook renders and these notes never render on GitHub. Alternative was
  considered and rejected for this app. (Record in `DECISIONS.md` on approval.)
- Search, previews and AI-visible text keep the callout prose and omit all three markers.
  `plainTextFromMarkdown`'s callout parser inherits this by sharing the same plugin — verify
  with red/green tests per marker, mirroring the existing `[!NOTE]` suite in
  `noteMarkdown.test.js`.
- The frozen plugin lists (`NOTE_CALLOUT_MARKDOWN_PLUGINS` and variants) do not grow: the same
  plugin handles all three markers, so display, search and previews cannot drift apart.

## 2 — Rendering (`src/components/MarkdownText.jsx`, `src/index.css`)

- `NoteCallout` takes the parsed type and renders the visible label from it: `Note`, `Tip`,
  `¡Ojo!`. The label stays the single `aria-labelledby` source so screen readers announce the
  type exactly once; `¡` is part of the accessible name and that is intended.
- Grammar's `calloutBlockquotes` path continues to pass the fixed "Note"/grammar treatment.
- Colour: each type gets its own token pair (border/line + pale background) following the
  existing pattern — Note keeps the Notes blue family
  (`--color-page-folder-notes-line` / `--color-pen-pale`). Tip and ¡Ojo! need new tokens in the
  `@theme static` block of `src/index.css`, referenced from CSS only; **no hardcoded hex in
  components** (see AGENT-GUIDE "Visual changes"). Working intent: Tip in a green/positive
  family, ¡Ojo! in an amber/warning family — but per the visual-changes agreement the exact
  values are **subjective choices presented as 2–3 variants** on a disposable scratchpad page
  with real-length content, and nothing enters `src/` until the owner picks.
- **Owner-picked 2026-08-17:** direction B, the notebook-family treatment. Tip uses sage
  (`#738A53` line, `#F1F5E9` background, `#4E6132` label); ¡Ojo! uses saffron
  (`#C49128` line, `#FFF5D8` background, `#745314` label). Each still receives dedicated tokens
  rather than borrowing Source, success or review-grade identity.
- Label CSS reuses `.note-callout__label`; only the per-type colour rules are new.

## 3 — Inline code (dialect addition)

- Toolbar: a fourth inline action — label **Inline code**, backtick before/after — joining
  Bold/Italic/Highlight in `INLINE_ACTIONS` (`src/components/MarkdownTextarea.jsx`). Same
  wrap/unwrap toggle behaviour the other inline actions already have.
- Rendering: add `code` to `ALLOWED_ELEMENTS` in `MarkdownText.jsx`, plus a
  `.note-markdown code` style (existing ink colour, subtle background, slight padding, the
  UI's monospace stack). Purpose in a Spanish notebook: citing exact forms — `hubiera` vs
  `habría` — without italics ambiguity.
- **Containment detail:** react-markdown renders a fenced block as `pre > code`. `pre` stays
  disallowed and unwraps, which would leave the block's text styled as inline code. Guard the
  `code` component: render the code element only for genuinely inline nodes (no newline in the
  value / not the child of an unwrapped block); otherwise fall back to plain text. Red/green
  test: a fenced block must render as plain readable text, not as a giant inline-code run.
- Search is already correct: `visibleText` in `noteMarkdown.js` returns `inlineCode` values
  today. Add a test asserting backtick punctuation never becomes searchable but the code text
  stays searchable.

## 4 — Link action (toolbar only, no dialect change)

- The dialect already renders `[text](url)` as a clickable link for **https URLs only**
  (`BodyLink` in `MarkdownText.jsx`); non-https falls back to the readable text. No parser or
  renderer change.
- Toolbar: a **Link** button beside **Image link**, mirroring `imageLink()` without the `!`:
  wraps the selection as `[selection](https://)` and leaves the `https://` placeholder selected
  so pasting a copied URL overwrites it in one gesture.
- Icon suggestion: lucide `Link`; Tip: `Lightbulb`; ¡Ojo!: `TriangleAlert`. Final icons are the
  implementer's call within lucide.

## 5 — Toolbar growth and phone fit

- The toolbar reaches ~14 actions on callout-enabled editors. It already wraps
  (`flex-wrap`), every button stays 44×44 px, and the 375 px viewport must show no horizontal
  overflow. Verify the two-or-three-row wrapped toolbar visually by the numbers
  (`scrollWidth === clientWidth === 375`) in the disposable browser flow.
- If the wrapped toolbar reads as clutter, raise it with a screenshot-driven variant pass
  rather than silently regrouping actions — regrouping is a visual decision the owner picks.

## Delivery

1. On owner approval: record the scope decision and the `[!OJO]` marker choice in
   `DECISIONS.md`; note this doc joins the Phase 19 umbrella.
2. Parser slice: generalized marker match + per-type classes + search omission, red/green
   tests first (`noteMarkdown.test.js`, `MarkdownText.test.jsx`).
3. Renderer slice: typed labels and per-type classes with placeholder use of existing tokens;
   colour tokens land only after the owner picks from scratchpad variants (visual commit kept
   separate from logic commits).
4. Toolbar slice: Tip/¡Ojo! actions gated by the existing `noteCallouts` prop; Inline code and
   Link actions ungated; toolbar tests extended (`MarkdownTextarea.test.jsx`).
5. Inline-code containment slice: `code` in `ALLOWED_ELEMENTS`, the fenced-block guard, CSS,
   and the search assertions.
6. Verification: focused suites per slice; the complete serial suite; production build;
   `git diff --check`; a disposable 375×812 flow covering each new callout in a Notes editor,
   an ordinary quote staying a quote, marker-free search, 44×44 px actions and zero horizontal
   overflow. Nothing is pushed or deployed without a separate owner request.

## Implementation closeout

The parser, renderer, toolbar and integration tests first failed in 12 intended places against the
prior implementation, then the focused gate passed 191/191 across ten files. The complete serial
suite passes 1,549/1,549 tests across 130 files; its only output is the repository's known jsdom
`scrollTo` notice. The production build transforms 2,122 modules, and `git diff --check` passes.

A disposable 375×812 browser flow used an unsaved Notes-page creation draft, so it changed no
personal item or event. Its preview rendered accessible Note, Tip and ¡Ojo! regions with exact
resolved surface/border/label colours of blue `237 241 250` / `123 147 209` / `36 63 133`, sage
`241 245 233` / `115 138 83` / `78 97 50`, and saffron `255 245 216` / `196 145 40` / `116 83 20`.
One ordinary blockquote remained a blockquote; inline code used the monospace treatment; the HTTPS
link opened in a new tab; and no source marker appeared in visible text. All 16 toolbar actions
measured 44×44 px across three rows, with toolbar geometry 328/328 and document geometry 375/375.
The console contained zero warnings or errors. The draft was closed without saving, notebook totals
remained unchanged, the viewport override was reset and both local test servers were stopped. No
owner browser data or real notebook snapshot was available or inspected.
