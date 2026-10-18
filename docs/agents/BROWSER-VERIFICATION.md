# Browser verification

Use this for visible application changes. Tests establish behavior; inspecting the running app
checks the presentation. Use a disposable profile/origin with seeded fixtures. The owner's real
browser database is never a test target, and an empty test notebook says nothing about it.

## Choose an available method

1. Inspect the available browser tools and local browser installation for this session.
2. Prefer a working browser tool or disposable headless Chromium. Capture and inspect screenshots
   when available, alongside interaction and layout checks. Step 1's [recorded closeouts](../reviews/2026-10-17/STEP-1.md)
   successfully used headless Chromium on the XPS; a missing built-in pane does not rule that out.
3. If the current tool cannot capture frames, record the limitation and use computed styles,
   resolved colors, element counts and layout measurements as partial evidence. Earlier in-app
   panes timed out on screenshots; that is a tool-specific history, not a universal rule.
4. Where visual or device checks remain unavailable, ask the owner to inspect the private preview
   or released app and keep the relevant check pending in [CURRENT](../CURRENT.md). Numerical
   layout checks alone do not establish that a design looks right or that Android hardware works.

## Seed fixtures and inspect

The full dictionary download is unnecessary. See [dictFixture.js](../../src/test/dictFixture.js)
for reference store shapes; seed fixture entries into `mi-cuaderno-ref-a` and set
`localStorage["mc-ref-active"] = "a"`. Seed personal items in the disposable `mi-cuaderno`
Dexie database. Earlier examples are recorded under Phase 3c/4d in [DECISIONS](../../DECISIONS.md).
Do not clear, restore over or upgrade the owner's browser data for verification.

- Exercise the actual changed flow, including relevant empty, long-content, error and retry states.
- Check **375 px width** and no horizontal overflow; record the viewport height actually used.
- Inspect screenshots when possible; measure `scrollWidth` against viewport width and check
  browser warnings/uncaught errors. Record which observations came from screenshots, measurements
  or the owner rather than conflating them.
- A fixture button's success is distinct from the real installed-PWA share sheet, hardware Back
  and update/offline checks. Keep those limitations visible until specifically verified.
- Dispose of task-created browser profiles and stop temporary previews after verification.

For serving previews use the [Windows](WINDOWS.md) or [XPS](XPS.md#checks-and-phone-preview)
recipe. Access to a real notebook export requires the guide's separate task-scoped approval;
fixtures remain the default.
