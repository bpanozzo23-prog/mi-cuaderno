// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import MarkdownText from "./MarkdownText.jsx";

afterEach(cleanup);

describe("MarkdownText", () => {
  it("renders the approved notebook-oriented Markdown set", () => {
    const { container } = render(
      <MarkdownText>{`## Heading

This is **bold**, *italic*, and ==highlighted==.

1. First
2. Second

> Quoted

---`}</MarkdownText>
    );

    expect(screen.getByRole("heading", { name: "Heading", level: 2 })).toBeTruthy();
    expect(container.querySelector("strong")?.textContent).toBe("bold");
    expect(container.querySelector("em")?.textContent).toBe("italic");
    expect(container.querySelector("mark")?.textContent).toBe("highlighted");
    expect(container.querySelectorAll("ol li")).toHaveLength(2);
    expect(container.querySelector("blockquote")?.textContent).toContain("Quoted");
    expect(container.querySelector("hr")).toBeTruthy();
  });

  it("does not render raw HTML or tables as active elements", () => {
    const { container } = render(
      <MarkdownText>{`Before <script>alert("no")</script> after.`}</MarkdownText>
    );

    expect(container.querySelector("script, table, pre, iframe")).toBeNull();
    expect(container.textContent).not.toContain("alert");
    expect(container.textContent).toContain("Before  after.");
  });

  it("renders inline code while fenced code stays readable plain text", () => {
    const { container } = render(
      <MarkdownText>{`Compare \`hubiera\` with \`habría\`.

\`\`\`js
const form = "hubiera";
\`\`\`

\`\`\`
\`\`\``}</MarkdownText>
    );

    expect(container.querySelectorAll("code")).toHaveLength(2);
    expect(container.querySelector("pre")).toBeNull();
    expect(container.textContent).toContain('const form = "hubiera";');
  });

  it("renders an https image as a tappable block figure with captioned lazy no-referrer loading", () => {
    const { container } = render(
      <MarkdownText>{`Mid ![Botijo de barro](https://upload.wikimedia.org/botijo.jpg) sentence.`}</MarkdownText>
    );

    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://upload.wikimedia.org/botijo.jpg");
    expect(img?.getAttribute("alt")).toBe("Botijo de barro");
    expect(img?.getAttribute("loading")).toBe("lazy");
    expect(img?.getAttribute("referrerpolicy")).toBe("no-referrer");
    const anchor = img?.closest("a");
    expect(anchor?.getAttribute("href")).toBe("https://upload.wikimedia.org/botijo.jpg");
    expect(anchor?.getAttribute("target")).toBe("_blank");
    expect(anchor?.getAttribute("rel")).toContain("noreferrer");
    expect(anchor?.className).toContain("media-image");
    expect(screen.getByText("Botijo de barro")).toBeTruthy();
  });

  it("replaces a failed or non-https image with readable fallback text", () => {
    const { container } = render(
      <MarkdownText>{`![Mapa del voseo](https://example.com/map.png)

![insecure](http://example.com/x.png)`}</MarkdownText>
    );

    expect(screen.getByText("insecure")).toBeTruthy();
    expect(container.querySelectorAll("img")).toHaveLength(1);

    fireEvent.error(container.querySelector("img"));
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Mapa del voseo")).toBeTruthy();
  });

  it("renders https hyperlinks in a new tab and leaves other link labels as plain text", () => {
    const { container } = render(
      <MarkdownText>{`See [the article](https://es.wikipedia.org/wiki/Voseo) or [not this](http://example.com/insecure).`}</MarkdownText>
    );

    const anchor = container.querySelector("a");
    expect(anchor?.getAttribute("href")).toBe("https://es.wikipedia.org/wiki/Voseo");
    expect(anchor?.getAttribute("target")).toBe("_blank");
    expect(anchor?.getAttribute("rel")).toContain("noreferrer");
    expect(container.querySelectorAll("a")).toHaveLength(1);
    expect(container.textContent).toContain("not this");
    expect(container.textContent).not.toContain("http://example.com/insecure");
  });

  it("renders only a top-level standalone br marker as an unlabeled blank line", () => {
    const { container } = render(
      <MarkdownText blankLines>{`First paragraph.

<br>

Second paragraph with an inline <br> marker.`}</MarkdownText>
    );

    const spacer = container.querySelector(".note-blank-line");
    expect(spacer).toBeTruthy();
    expect(spacer.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll(".note-blank-line")).toHaveLength(1);
    expect(container.querySelector("br")).toBeNull();
    expect(container.textContent.replace(/\s+/g, " ").trim()).toBe(
      "First paragraph. Second paragraph with an inline marker."
    );
  });

  it("renders repeated blank-line markers as repeated spacers", () => {
    const { container } = render(
      <MarkdownText blankLines>{`Before.

<br>

<br>

After.`}</MarkdownText>
    );

    expect(container.querySelectorAll(".note-blank-line")).toHaveLength(2);
  });

  it("leaves escaped highlight markers visible", () => {
    const { container } = render(<MarkdownText>{String.raw`\==literal==`}</MarkdownText>);
    expect(container.querySelector("mark")).toBeNull();
    expect(screen.getByText("==literal==")).toBeTruthy();
  });

  it("presents Grammar block quotes as labeled Note callouts", () => {
    const { container } = render(
      <MarkdownText calloutBlockquotes>{`Before.

> [!TIP]
> The speaker only needs to believe it is true.

After.`}</MarkdownText>
    );

    const note = screen.getByRole("note", { name: "Note" });
    expect(note.textContent).toContain("Note");
    expect(note.textContent).toContain("[!TIP]");
    expect(note.textContent).toContain("The speaker only needs to believe it is true.");
    expect(note.getAttribute("aria-label")).toBeNull();
    expect(note.getAttribute("aria-labelledby")).toBeTruthy();
    expect(container.querySelector("blockquote")).toBeNull();
  });

  it("presents typed Page Notes callouts and preserves ordinary block quotes", () => {
    const { container } = render(
      <MarkdownText blankLines explicitNoteCallouts>{`> [!NOTE]
> Remember that belief is what matters.

> [!TIP]
> Keep the preposition in the whole phrase.

> [!OJO]
> Actualmente does not mean actually.

<br>

> This remains an ordinary quotation.`}</MarkdownText>
    );

    const note = screen.getByRole("note", { name: "Note" });
    const tip = screen.getByRole("note", { name: "Tip" });
    const ojo = screen.getByRole("note", { name: "¡Ojo!" });
    expect(note.textContent).toContain("Remember that belief is what matters.");
    expect(note.textContent).not.toContain("[!NOTE]");
    expect(container.querySelector(".notes-note-callout")).toBe(note);
    expect(tip.classList.contains("note-callout--tip")).toBe(true);
    expect(ojo.classList.contains("note-callout--ojo")).toBe(true);
    for (const callout of [note, tip, ojo]) {
      expect(callout.getAttribute("aria-label")).toBeNull();
      expect(callout.getAttribute("aria-labelledby")).toBeTruthy();
    }
    expect(container.querySelectorAll(".note-blank-line")).toHaveLength(1);
    expect(container.querySelector("blockquote")?.textContent).toContain("ordinary quotation");
  });
});
