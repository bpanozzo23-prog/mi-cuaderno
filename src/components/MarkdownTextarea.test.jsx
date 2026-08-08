// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import MarkdownTextarea from "./MarkdownTextarea.jsx";

afterEach(cleanup);

function Field({ initial }) {
  const [value, setValue] = useState(initial);
  return <MarkdownTextarea aria-label="Notes" value={value} onChange={setValue} />;
}

describe("MarkdownTextarea", () => {
  it("wraps selected text and restores the selection", async () => {
    const user = userEvent.setup();
    render(<Field initial="This matters" />);
    const field = screen.getByRole("textbox", { name: "Notes" });
    field.focus();
    field.setSelectionRange(5, 12);

    await user.click(screen.getByRole("button", { name: "Bold" }));

    expect(field.value).toBe("This **matters**");
    await waitFor(() => expect([field.selectionStart, field.selectionEnd]).toEqual([7, 14]));
  });

  it("adds and removes a multiline bulleted list", async () => {
    const user = userEvent.setup();
    render(<Field initial={"uno\ndos"} />);
    const field = screen.getByRole("textbox", { name: "Notes" });
    field.focus();
    field.setSelectionRange(0, field.value.length);

    await user.click(screen.getByRole("button", { name: "Bulleted list" }));
    expect(field.value).toBe("- uno\n- dos");

    field.setSelectionRange(0, field.value.length);
    await user.click(screen.getByRole("button", { name: "Bulleted list" }));
    expect(field.value).toBe("uno\ndos");
  });

  it("offers every approved formatting action in one accessible toolbar", () => {
    render(<Field initial="" />);
    expect(screen.getByRole("toolbar", { name: "Text formatting" })).toBeTruthy();
    for (const name of ["Bold", "Italic", "Highlight", "Heading", "Bulleted list", "Numbered list", "Block quote", "Divider"]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
  });
});
