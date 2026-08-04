// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ItemLinkCard } from "./LinkCard.jsx";

afterEach(cleanup);

const page = {
  id: "user:page",
  type: "page",
  title: "Grammar source",
  body: "This generic body preview should be hidden.",
  linkedKeys: [],
  linkAnnotations: [],
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("connection cards", () => {
  it("clamps a shared note, suppresses the target preview, and edits inline", async () => {
    const user = userEvent.setup();
    const onSaveRelationship = vi.fn();
    const onRemove = vi.fn();
    const connection = {
      type: "contrast",
      subject: "owner",
      note: "A shared explanation that belongs to the connection.",
      relationship: {
        type: "contrast",
        subject: "owner",
        note: "A shared explanation that belongs to the connection.",
      },
    };

    render(
      <ItemLinkCard
        item={page}
        connection={connection}
        onOpen={vi.fn()}
        onSaveRelationship={onSaveRelationship}
        onRemove={onRemove}
      />
    );

    const note = screen.getByText(/A shared explanation/);
    expect(note.className).toContain("line-clamp-2");
    expect(screen.queryByText(/generic body preview/)).toBeNull();

    const more = screen.getByRole("button", { name: "Edit connection to Grammar source" });
    expect(more.className).toContain("min-h-11");
    expect(more.className).toContain("min-w-11");
    await user.click(more);

    expect(screen.getByText("Edit connection")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Connection note" }).value).toBe(connection.note);
    await user.selectOptions(screen.getByRole("combobox", { name: "Relationship" }), "explained_by:target");
    const editor = screen.getByRole("textbox", { name: "Connection note" });
    await user.clear(editor);
    await user.type(editor, "Explains this rule");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSaveRelationship).toHaveBeenCalledWith({
      type: "explained_by",
      subject: "target",
      note: "Explains this rule",
    });
    expect(screen.queryByText("Edit connection")).toBeNull();
  });

  it("offers removal inside the editor rather than as an easy-to-hit card control", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <ItemLinkCard
        item={page}
        connection={{ type: "related", subject: "owner", note: "" }}
        onOpen={vi.fn()}
        onSaveRelationship={vi.fn()}
        onRemove={onRemove}
      />
    );

    expect(screen.queryByRole("button", { name: /Unlink/i })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Edit connection to Grammar source" }));
    await user.click(screen.getByRole("button", { name: "Remove connection" }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("accepts a specialized heading, meta line, preview rule, and accessible edit label", () => {
    render(
      <ItemLinkCard
        item={{
          ...page,
          title: "",
          body: "The first line normally identifies this untitled journal moment.",
          pageDate: "2026-08-01",
        }}
        connection={{ type: "related", subject: "owner", note: "" }}
        onOpen={vi.fn()}
        onSaveRelationship={vi.fn()}
        displayHeading="The first line normally identifies this moment"
        displayMeta="August 1, 2026"
        suppressPreview
        editLabel="Edit connection to August 1 moment"
      />
    );

    expect(screen.getByText("The first line normally identifies this moment")).toBeTruthy();
    expect(screen.getByText("August 1, 2026")).toBeTruthy();
    expect(screen.queryByText(/normally identifies this untitled journal moment/)).toBeNull();
    expect(screen.getByRole("button", { name: "Edit connection to August 1 moment" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit connection to Untitled page" })).toBeNull();
  });
});
