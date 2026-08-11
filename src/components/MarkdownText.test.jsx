// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
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

  it("does not render raw HTML, images, links, tables, or code as active elements", () => {
    const { container } = render(
      <MarkdownText>{`Before <script>alert("no")</script> after.

![private](https://example.com/image.png)

[visible label](https://example.com)

\`plain code\``}</MarkdownText>
    );

    expect(container.querySelector("script, img, a, table, code, pre")).toBeNull();
    expect(screen.getByText("visible label")).toBeTruthy();
    expect(screen.getByText("plain code")).toBeTruthy();
    expect(container.textContent).not.toContain("alert");
    expect(container.textContent).toContain("Before  after.");
  });

  it("leaves escaped highlight markers visible", () => {
    const { container } = render(<MarkdownText>{String.raw`\==literal==`}</MarkdownText>);
    expect(container.querySelector("mark")).toBeNull();
    expect(screen.getByText("==literal==")).toBeTruthy();
  });

  it("presents Grammar block quotes as labeled Note callouts", () => {
    const { container } = render(
      <MarkdownText calloutBlockquotes>{`Before.

> The speaker only needs to believe it is true.

After.`}</MarkdownText>
    );

    const note = screen.getByRole("note", { name: "Note" });
    expect(note.textContent).toContain("Note");
    expect(note.textContent).toContain("The speaker only needs to believe it is true.");
    expect(note.getAttribute("aria-label")).toBeNull();
    expect(note.getAttribute("aria-labelledby")).toBeTruthy();
    expect(container.querySelector("blockquote")).toBeNull();
  });

  it("presents only explicitly marked Page Notes block quotes as callouts", () => {
    const { container } = render(
      <MarkdownText explicitNoteCallouts>{`> [!NOTE]
> Remember that belief is what matters.

> This remains an ordinary quotation.`}</MarkdownText>
    );

    const note = screen.getByRole("note", { name: "Note" });
    expect(note.textContent).toContain("Remember that belief is what matters.");
    expect(note.textContent).not.toContain("[!NOTE]");
    expect(container.querySelector(".notes-note-callout")).toBe(note);
    expect(container.querySelector("blockquote")?.textContent).toContain("ordinary quotation");
  });
});
