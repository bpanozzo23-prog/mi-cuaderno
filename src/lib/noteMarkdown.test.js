import { describe, expect, it } from "vitest";
import { markdownPreviewText, plainTextFromMarkdown } from "./noteMarkdown.js";

describe("notebook Markdown plain text", () => {
  it("keeps the visible words and removes every supported marker", () => {
    const source = `## Travel phrases

Remember **quedar** can mean ==to arrange to meet==.

- ¿Dónde quedamos?
- Quedamos a las ocho.

---

> Useful in Mexico.`;

    expect(plainTextFromMarkdown(source)).toBe(
      "Travel phrases\nRemember quedar can mean to arrange to meet.\n¿Dónde quedamos?\nQuedamos a las ocho.\nUseful in Mexico."
    );
    expect(markdownPreviewText(source)).toBe(
      "Travel phrases Remember quedar can mean to arrange to meet. ¿Dónde quedamos? Quedamos a las ocho. Useful in Mexico."
    );
  });

  it("keeps escaped highlight markers literal and drops raw HTML", () => {
    expect(plainTextFromMarkdown(String.raw`\==literal== and ==marked== <script>hidden()</script>`))
      .toBe("==literal== and marked");
  });

  it("preserves ñ in the visible text", () => {
    expect(plainTextFromMarkdown("**año** and ==señora==")).toBe("año and señora");
  });
});
