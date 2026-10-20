# Design QA — 1917 opening language support

2026-10-20. **Visual and interaction checks: passed.** The owner selected Figma **B — short
sections**, approved its opening-page implementation and requested a map visual refinement.
The [chapter review](docs/guided-lessons/chapters/1917/REVIEW.md#opening-page-b-implementation-and-closeout)
owns the complete acceptance record. The earlier map pass is retained below.

## Selected B comparison

References: [hidden English](https://www.figma.com/design/qYUUCkgMUmEgumNEhO5549?node-id=3-260)
and [revealed English](https://www.figma.com/design/qYUUCkgMUmEgumNEhO5549?node-id=3-362).
Figma design context and its screenshot were inspected before implementation. The existing
native locator and shared buttons/icons supply the matching project assets; there are no
flattened UI images or temporary Figma URLs in application code. The owner's map refinement
explicitly extends the static reference.

Actual Chromium screenshots in `/tmp/mi-cuaderno-opening-b/` were inspected:

- `01-phone-opening-verified.png`: real 375×812 viewport, initial hidden state.
- `02-opening-hidden-full-verified.png` and `04-opening-english-full-verified.png`: complete
  opening at 375px width, hidden and revealed. These use a tall viewport so the sticky controls
  appear at the bottom of the full-page artifact; they are not 812px viewport screenshots.
- `03-mixed-english.png`: a passage revealed by native Enter with keyboard focus retained.
- `05-large-text-verified.png`: 375×812 with root text enlarged to 200%.
- `06-desktop-opening-verified.png` and `07-desktop-full.png`: 1100px-wide comparison.

The selected hierarchy, brief English orientation, Spanish cards, nearby translations,
focus-expression panel and chapter question are implemented. Existing local Literata and
system UI fonts replace Figma's Roboto approximation. The existing outline/progress controls,
disabled Previous control and full preview-reset notice are retained, so the full page is
longer than the static reference. All three original Spanish paragraphs remain intact.

## Findings resolved during implementation

- Enlarged toolbar/navigation text originally broke into narrow columns. Flexible wrapping and
  word-preserving controls fix that at 200% text size. A stale Vite-generated stylesheet initially
  concealed the fix; restarting the preview and disabling browser cache established the final
  rendered result. Screenshots, rather than overflow measurements alone, caught this mismatch.
- Return navigation originally placed the hidden article heading at the top, hiding B's visible
  title. A 375px reproduction measured the title bottom at −14.5px. Returning now scrolls to 0;
  the heading keeps focus and open translations remain available. Native reload scroll
  restoration is disabled only in the disposable preview so its reset starts at the title.
- Claude's review corrected the Spanish language tag within the English focus note. Its
  screenshot/code follow-up found no blocking layout or map defect. No actual screen-reader
  walkthrough or owner physical-phone acceptance is claimed.

## Map and interaction evidence

Larger place labels, a highlighted Querétaro marker, thinner label halos, a clearer north arrow,
a larger country inset and softly shaded land improve legibility. Existing palette tokens
supply every color. Geometry, projection, landmark coordinates, derived regional extent,
modern/approximate caption and attribution are preserved. Bounds checks and screenshot
inspection show all place, inset and ocean labels inside the map at both widths.

Hidden, mixed and fully revealed states have no horizontal overflow. Keyboard activation keeps
focus and scroll; individual/page controls leave the meaning summary independent. Next/Previous
and outline returns retain help. Both optional branches retain their launch focus, scroll and
help, and both historical-source translations remain usable. Reload resets reading/help state.
Disposable-browser checks found no database opens or storage mutations, service-worker
registrations, external page requests, console warnings or uncaught exceptions. The request
check observed 26 unique local URLs. Owner visual/language acceptance remains separate.

## Previous verified map pass — 2026-10-19

2026-10-19. **final result: passed**

The scope is the owner's [approved adaptation](docs/guided-lessons/chapters/1917/REVIEW.md#selected-direction-and-bounded-visual-pass)
of option 2. This is a responsive reader using verified geographic data and existing design
tokens, not a pixel-identical reproduction of the generated map. Owner taste, narrative/language
acceptance and physical-phone checks remain separate.

## Comparison evidence

- Source visual truth: `/tmp/mi-cuaderno-lesson-visuals/map-refined.png`, 853×1844 pixels.
  Normalize to 375×811 without cropping. The source is generated, so its device density and
  geographic accuracy are not established.
- Rendered opening: `/tmp/mi-cuaderno-lesson-map/01-opening.png`, 375×812 pixels, Chromium
  CSS viewport 375×812, device scale factor 1, local development reader, Spanish, help closed.
- Combined full-view comparison: `/tmp/mi-cuaderno-lesson-map/design-comparison.png`.
  Both normalized images were opened together. The one-pixel height difference is immaterial;
  the reference compresses the chapter prose and places the heading below the map, whereas the
  approved implementation retains full prose and keeps heading focus before the figure.
- Focused inspection: map labels/caption at native phone size in `01-opening.png`, map on return
  in `15-return-opening.png`, source treatments in `03-petition.png` / `06-workday.png`, source
  credits in `12-map-sources.png`, keyboard focus in `13-keyboard-focus.png`, branches in
  `04-evidence.png` / `05-language.png`, and reflection in `09-reflection.png`, all in the same
  scratch directory. Desktop evidence: `17-wide-opening.png` and `18-wide-source.png`, 1100×900,
  density 1. These screenshots were inspected, not merely captured.

## Findings and comparison history

1. **Resolved P2 — clipped city name.** The initial 375px render placed the Ciudad de México
   text's right edge at 361.02px, beyond the map's 359px edge. The final label sits to the left of
   its unchanged marker, anchored at SVG x295. A subsequent capture and bounding-box check at
   both widths show the complete name inside the map and clear of the inset.
2. **Resolved P2 — inset label crowding.** The country name was tight against the simplified
   coastline. The inset height increases from 94 to 100 SVG units and its label baseline from
   85 to 91, leaving room below the geography. The final phone/desktop captures were reinspected.
3. **Expected adaptations, not remaining defects:** the map uses verified, generalized Natural
   Earth geometry rather than unverified generated terrain; labels follow actual landmark
   positions. The opening heading precedes the map to preserve focus/scroll. The full caption,
   credits and original chapter prose take more space than the compressed mock. Existing
   44px controls and 16px prose are retained instead of shrinking them to fit the whole opening.

## Required visual surfaces

| Surface | Observed result |
|---|---|
| Fonts / typography | Loaded local Literata preserves the serif title/reading hierarchy. System text handles navigation and credits; the question is italic. No truncated map labels remain. Prose retains 16px / 1.7 line height; text wraps naturally at both widths. |
| Spacing / layout | Compact toolbar, opening map and clear paragraph spacing follow the selected direction within the approved heading order. 44px controls remain available. No horizontal overflow at 375×812 or 1100×900. |
| Colors / tokens | Existing paper, ink, blue, ochre and source-card tokens supply the palette. No new component hex values or palette changes. Warm flat cartography is an intentional substitute for the mock's unverified terrain texture. |
| Image quality / geography | Source-derived SVG paths remain sharp at both sizes. Outline, markers and inset share a projection; text is readable and has a separate text equivalent. No generated geography, raster placeholder, remote tiles or historical-boundary claim. |
| Copy / content | Original narrative, quotations, translations, help, activities and source records are preserved. The full reset/navigation notice remains readable below the article. Source credits distinguish modern orientation from historical evidence. |

## Interaction verification and remaining limits

Chromium checks exercise outline navigation, English/glossary/translation disclosures, keyboard
activation and visible focus, both optional branches with return focus/scroll and retained help,
choices, reflection, finishing without writing, reload reset, and return to the opening map.
All browser requests stay on the local origin; guards detect no database/storage writes or
service-worker registration. Browser exception and warning logs are empty. The profile is
disposable and removed; no owner data is inspected.

No actionable P0/P1/P2 visual issue remains. Possible repeated screen-reader announcements of
the figure/image description are an unverified P3 consideration, not a demonstrated failure;
no screen-reader or physical Android acceptance is claimed. Further texture/imagery would be
a separate owner iteration with its own source and accuracy requirements.

Implementation checklist: clipping fixed; inset spacing fixed; final captures inspected;
interaction/isolation checks passed. The [chapter review](docs/guided-lessons/chapters/1917/REVIEW.md)
owns the complete implementation and automated-verification record.

## Historical pointer

Earlier work remains in [the historical design QA record](docs/history/design-qa/design-qa.md).
This link preserves the destination referenced by the unchanged brief and historical decisions.
