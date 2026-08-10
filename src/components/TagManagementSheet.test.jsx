/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TagManagementSheet from "./TagManagementSheet.jsx";
import { applyGlobalTagChange } from "../db/tags.js";

vi.mock("../db/tags.js", () => ({ applyGlobalTagChange: vi.fn() }));

const items = [
  { id: "word:source", type: "lexical", tags: ["verbs"] },
  { id: "word:destination", type: "lexical", tags: ["grammar"] },
  { id: "page:overlap", type: "page", tags: ["grammar", "verbs"] },
  { id: "page:variant", type: "page", tags: ["Verbs"] },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("TagManagementSheet", () => {
  it("renames an exact tag to a new trimmed spelling without a second confirmation", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    applyGlobalTagChange.mockResolvedValue({
      kind: "rename",
      source: "verbs",
      destination: "word classes",
      changedCount: 2,
    });

    render(
      <TagManagementSheet
        source="verbs"
        items={items}
        onClose={vi.fn()}
        onSaved={onSaved}
      />
    );

    expect(screen.getByText("2 entries use this exact tag.")).toBeTruthy();
    await user.type(screen.getByRole("textbox", { name: "New tag name" }), "  word classes  ");
    expect(screen.queryByRole("button", { name: "Confirm rename" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Rename tag" }));

    expect(applyGlobalTagChange).toHaveBeenCalledWith({
      source: "verbs",
      destination: "word classes",
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ kind: "rename" })));
  });

  it("suggests an existing exact tag, previews overlap, and requires merge confirmation", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const onExportBackup = vi.fn().mockResolvedValue(undefined);
    applyGlobalTagChange.mockResolvedValue({
      kind: "merge",
      source: "verbs",
      destination: "grammar",
      sourceCount: 2,
      destinationCount: 2,
      overlapCount: 1,
      finalCount: 3,
      changedCount: 2,
    });

    render(
      <TagManagementSheet
        source="verbs"
        items={items}
        onClose={vi.fn()}
        onSaved={onSaved}
        onExportBackup={onExportBackup}
      />
    );

    await user.type(screen.getByRole("textbox", { name: "New tag name" }), "gram");
    await user.click(screen.getByRole("button", { name: "Use existing tag grammar" }));

    expect(screen.getByText("2 source entries")).toBeTruthy();
    expect(screen.getByText("2 destination entries")).toBeTruthy();
    expect(screen.getByText("1 entry already has both")).toBeTruthy();
    expect(screen.getByText("3 entries after merge")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Confirm merge" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Merge tags" }));
    expect(screen.getByRole("button", { name: "Confirm merge" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm merge" }).disabled).toBe(false);

    await user.click(screen.getByRole("button", { name: "Export backup first" }));
    expect(onExportBackup).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Backup downloaded.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Confirm merge" }));
    expect(applyGlobalTagChange).toHaveBeenCalledWith({ source: "verbs", destination: "grammar" });
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ kind: "merge" })));
  });

  it("makes removal explicit, keeps entries, and requires confirmation", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    applyGlobalTagChange.mockResolvedValue({
      kind: "remove",
      source: "verbs",
      destination: null,
      changedCount: 2,
    });

    render(
      <TagManagementSheet source="verbs" items={items} onClose={vi.fn()} onSaved={onSaved} />
    );

    await user.click(screen.getByRole("button", { name: "Remove tag everywhere" }));
    expect(screen.getByText("Remove tag from 2 entries?")).toBeTruthy();
    expect(screen.getByText("The entries themselves will remain in your notebook.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Confirm removal" }));

    expect(applyGlobalTagChange).toHaveBeenCalledWith({ source: "verbs", destination: null });
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ kind: "remove" })));
  });

  it("leaves the sheet open with an inline problem when the transaction fails", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const onClose = vi.fn();
    applyGlobalTagChange.mockRejectedValue(new Error("The tag change was rolled back."));

    render(
      <TagManagementSheet source="verbs" items={items} onClose={onClose} onSaved={onSaved} />
    );

    await user.type(screen.getByRole("textbox", { name: "New tag name" }), "word classes");
    await user.click(screen.getByRole("button", { name: "Rename tag" }));

    expect((await screen.findByRole("alert")).textContent).toContain("The tag change was rolled back.");
    expect(screen.getByRole("dialog", { name: "Manage tag" })).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("disables competing controls until a save finishes", async () => {
    const user = userEvent.setup();
    let finishSave;
    const onSaved = vi.fn();
    applyGlobalTagChange.mockReturnValue(new Promise((resolve) => {
      finishSave = resolve;
    }));

    render(
      <TagManagementSheet source="verbs" items={items} onClose={vi.fn()} onSaved={onSaved} />
    );

    const input = screen.getByRole("textbox", { name: "New tag name" });
    await user.type(input, "word classes");
    await user.click(screen.getByRole("button", { name: "Rename tag" }));

    expect(input.disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Close tag management" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Remove tag everywhere" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Renaming…" })).toBeTruthy();

    finishSave({ kind: "rename", source: "verbs", destination: "word classes", changedCount: 2 });
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });
});
