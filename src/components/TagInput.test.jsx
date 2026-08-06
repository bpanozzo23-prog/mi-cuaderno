// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TagInput from "./TagInput.jsx";

afterEach(cleanup);

const USED_TAGS = ["Book", "Expression", "Informal", "Mexico", "Phrase", "Slang"];

describe("TagInput suggestions", () => {
  it("starts collapsed and opens the existing tags in one non-wrapping strip", async () => {
    const user = userEvent.setup();
    render(<TagInput allTags={USED_TAGS} onChange={vi.fn()} />);

    const disclosure = screen.getByRole("button", { name: "used before (6)" });
    expect(disclosure.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: "Book" })).toBeNull();

    await user.click(disclosure);

    expect(disclosure.getAttribute("aria-expanded")).toBe("true");
    const strip = screen.getByRole("group", { name: "Previously used tag suggestions" });
    expect(strip.className).toContain("flex-nowrap");
    expect(strip.className).toContain("overflow-x-auto");
    for (const tag of USED_TAGS) expect(screen.getByRole("button", { name: tag })).toBeTruthy();

    await user.click(disclosure);
    expect(screen.queryByRole("group", { name: "Previously used tag suggestions" })).toBeNull();
  });

  it("automatically opens matches while typing and collapses after reusing one", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    function Harness() {
      const [tags, setTags] = useState([]);
      return (
        <TagInput
          tags={tags}
          allTags={["Book", "expresión", "Mexico"]}
          onChange={(next) => {
            onChange(next);
            setTags(next);
          }}
        />
      );
    }

    render(<Harness />);
    const input = screen.getByPlaceholderText("new tag");

    await user.type(input, "expresion");
    expect(screen.getByText("already used:")).toBeTruthy();
    expect(screen.getByRole("button", { name: "expresión" })).toBeTruthy();

    await user.clear(input);
    expect(
      screen.getByRole("button", { name: "used before (3)" }).getAttribute("aria-expanded")
    ).toBe("false");

    await user.type(input, "expresion");
    await user.click(screen.getByRole("button", { name: "expresión" }));

    expect(onChange).toHaveBeenCalledWith(["expresión"]);
    expect(input.value).toBe("");
    expect(screen.queryByRole("group", { name: "Previously used tag suggestions" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "used before (2)" }).getAttribute("aria-expanded")
    ).toBe("false");
  });

  it("renders no disclosure when every existing tag is already selected", () => {
    render(<TagInput tags={["Book"]} allTags={["Book"]} onChange={vi.fn()} />);

    expect(screen.queryByText(/used before/)).toBeNull();
    expect(screen.queryByRole("group", { name: "Previously used tag suggestions" })).toBeNull();
  });
});
