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

  it.each(["NOTE", "TIP", "OJO"])(
    "omits an explicit [%s] callout marker only when callouts are enabled",
    (marker) => {
      const source = `> [!${marker}]\n> The speaker only needs to believe it.\n\n> An ordinary quotation.`;

      expect(plainTextFromMarkdown(source, { noteCallouts: true })).toBe(
        "The speaker only needs to believe it.\nAn ordinary quotation."
      );
      expect(markdownPreviewText(source, { noteCallouts: true })).toBe(
        "The speaker only needs to believe it. An ordinary quotation."
      );
      expect(plainTextFromMarkdown(source)).toContain(`[!${marker}]`);
    }
  );

  it.each(["[!tip]", "[!WARNING]", "[!TIP] same line"])(
    "keeps the near-miss callout marker %s visible",
    (marker) => {
      expect(plainTextFromMarkdown(`> ${marker}`, { noteCallouts: true })).toContain(marker);
    }
  );

  it("keeps inline-code text visible without its backticks", () => {
    expect(plainTextFromMarkdown("Compare `hubiera` with `habría`.")).toBe(
      "Compare hubiera with habría."
    );
  });

  it("keeps link labels visible while images stay out of search and previews", () => {
    const source = `See [el voseo](https://es.wikipedia.org/wiki/Voseo).

![Mapa del voseo](https://upload.wikimedia.org/mapa.svg)`;

    expect(plainTextFromMarkdown(source)).toBe("See el voseo.");
    expect(markdownPreviewText(source)).toBe("See el voseo.");
  });

  it("omits blank-line markers from visible text and previews", () => {
    const source = `Before the space.

<br>

After the space.`;

    expect(plainTextFromMarkdown(source)).toBe("Before the space.\nAfter the space.");
    expect(markdownPreviewText(source)).toBe("Before the space. After the space.");
  });
});
