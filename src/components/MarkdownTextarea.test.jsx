// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import MarkdownTextarea from "./MarkdownTextarea.jsx";

afterEach(cleanup);

function Field({ initial, ...props }) {
  const [value, setValue] = useState(initial);
  return <MarkdownTextarea aria-label="Notes" value={value} onChange={setValue} {...props} />;
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
    for (const name of ["Bold", "Italic", "Highlight", "Heading", "Bulleted list", "Numbered list", "Block quote", "Image link", "Divider"]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
    expect(screen.queryByRole("button", { name: "Blank line" })).toBeNull();
  });

  it("inserts an image template with the URL placeholder selected for pasting", async () => {
    const user = userEvent.setup();
    render(<Field initial="Mapa del voseo" />);
    const field = screen.getByRole("textbox", { name: "Notes" });
    field.focus();
    field.setSelectionRange(0, field.value.length);

    await user.click(screen.getByRole("button", { name: "Image link" }));

    expect(field.value).toBe("![Mapa del voseo](https://)");
    await waitFor(() => expect(field.selectionStart).toBe("![Mapa del voseo](".length));
    expect(field.selectionEnd).toBe(field.selectionStart + "https://".length);
  });

  it("inserts a blank-line marker after selected lines without replacing their prose", async () => {
    const user = userEvent.setup();
    render(<Field initial={"First paragraph\nSecond paragraph\nThird paragraph"} blankLines />);
    const field = screen.getByRole("textbox", { name: "Notes" });
    field.focus();
    field.setSelectionRange(2, 32);

    await user.click(screen.getByRole("button", { name: "Blank line" }));

    expect(field.value).toBe("First paragraph\nSecond paragraph\n\n<br>\n\nThird paragraph");
    await waitFor(() => expect(field.selectionStart).toBe("First paragraph\nSecond paragraph\n\n<br>\n\n".length));
    expect(field.selectionEnd).toBe(field.selectionStart);
  });

  it("allows repeated blank-line markers", async () => {
    const user = userEvent.setup();
    render(<Field initial="First paragraph" blankLines />);

    await user.click(screen.getByRole("button", { name: "Blank line" }));
    await user.click(screen.getByRole("button", { name: "Blank line" }));

    expect(screen.getByRole("textbox", { name: "Notes" }).value).toBe(
      "First paragraph\n\n<br>\n\n<br>\n\n"
    );
  });

  it("offers a Grammar Note callout without renaming ordinary block quotes", async () => {
    const user = userEvent.setup();
    const view = render(<Field initial="" quoteLabel="Note callout" />);

    expect(screen.getByRole("button", { name: "Note callout" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Block quote" })).toBeNull();
    const field = screen.getByRole("textbox", { name: "Notes" });
    field.focus();
    field.setSelectionRange(0, 0);
    await user.click(screen.getByRole("button", { name: "Note callout" }));
    expect(field.value).toBe("> ");

    view.unmount();
    render(<Field initial="Ordinary quote" />);
    expect(screen.getByRole("button", { name: "Block quote" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Note callout" })).toBeNull();
  });

  it("offers separate Block quote and explicit Note callout actions for Page Notes", async () => {
    const user = userEvent.setup();
    render(<Field initial="Remember this" noteCallouts />);

    expect(screen.getByRole("button", { name: "Block quote" })).toBeTruthy();
    const callout = screen.getByRole("button", { name: "Note callout" });
    const field = screen.getByRole("textbox", { name: "Notes" });
    field.focus();
    field.setSelectionRange(0, field.value.length);
    await user.click(callout);

    expect(field.value).toBe("> [!NOTE]\n> Remember this");
  });

  it("places the caret inside a new empty explicit Note callout", async () => {
    const user = userEvent.setup();
    render(<Field initial="" noteCallouts />);
    const field = screen.getByRole("textbox", { name: "Notes" });

    await user.click(screen.getByRole("button", { name: "Note callout" }));

    await waitFor(() => expect(field.selectionStart).toBe("> [!NOTE]\n> ".length));
    expect(field.value).toBe("> [!NOTE]\n> ");
    expect(field.selectionEnd).toBe(field.selectionStart);
  });

  it("keeps selected paragraphs inside one callout", async () => {
    const user = userEvent.setup();
    render(<Field initial={"First paragraph\n\nSecond paragraph"} quoteLabel="Note callout" />);
    const field = screen.getByRole("textbox", { name: "Notes" });
    field.focus();
    field.setSelectionRange(0, field.value.length);

    await user.click(screen.getByRole("button", { name: "Note callout" }));

    expect(field.value).toBe("> First paragraph\n>\n> Second paragraph");
  });
});
