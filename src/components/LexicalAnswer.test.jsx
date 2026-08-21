// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LexicalAnswer from "./LexicalAnswer.jsx";
import { newLexical } from "../db/items.js";

afterEach(cleanup);

describe("LexicalAnswer named Notes", () => {
  it("keeps General note visible and reveals named sections behind a compact count", async () => {
    const user = userEvent.setup();
    const rootId = "note-section:15151515-1515-4515-8515-151515151515";
    const item = newLexical({
      term: "quedar",
      notes: "General note stays visible.",
      noteSections: [
        { id: rootId, parentId: null, name: "Usage", body: "Arrange to meet." },
        {
          id: "note-section:16161616-1616-4616-8616-161616161616",
          parentId: rootId,
          name: "Register",
          body: "Neutral.",
        },
      ],
    });

    render(<LexicalAnswer item={item} />);

    expect(screen.getByText("General note stays visible.")).toBeTruthy();
    expect(screen.queryByText("Arrange to meet.")).toBeNull();
    const disclosure = screen.getByRole("button", { name: "Show 2 named note sections" });
    expect(disclosure.className).toContain("min-h-11");
    await user.click(disclosure);
    expect(screen.getByText("Arrange to meet.")).toBeTruthy();
    expect(screen.getByText("Neutral.")).toBeTruthy();
  });
});
