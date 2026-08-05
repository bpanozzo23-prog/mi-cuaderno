// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CollectionOrganizer from "./CollectionOrganizer.jsx";

afterEach(cleanup);

const group = {
  id: "page-group:11111111-1111-4111-8111-111111111111",
  name: "Softening",
  itemKeys: ["user:word"],
};

const itemById = new Map([
  ["user:word", { id: "user:word", type: "lexical", term: "nomás" }],
]);

function props(overrides = {}) {
  return {
    groups: [group],
    ungroupedItemKeys: [],
    itemById,
    onCancel: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("CollectionOrganizer contextual removal confirmation", () => {
  it("keeps the previous immediate-removal behavior when no impact callback is supplied", async () => {
    const user = userEvent.setup();
    const values = props();
    render(<CollectionOrganizer {...values} />);

    await user.click(screen.getByRole("button", { name: "Remove nomás from collection" }));
    expect(screen.queryByText("nomás")).toBeNull();
    expect(screen.queryByRole("alertdialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Save organization" }));
    await waitFor(() => expect(values.onSave).toHaveBeenCalledWith({
      groups: [{ ...group, itemKeys: [] }],
      ungroupedItemKeys: [],
      removedItemKeys: ["user:word"],
    }));
  });

  it("removes immediately when the supplied contextual impact total is zero", async () => {
    const user = userEvent.setup();
    const removalImpactForKey = vi.fn(() => ({ groups: 0, captures: 0, examples: 0, total: 0 }));
    render(<CollectionOrganizer {...props({ removalImpactForKey })} />);

    await user.click(screen.getByRole("button", { name: "Remove nomás from collection" }));

    expect(removalImpactForKey).toHaveBeenCalledWith("user:word");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.queryByText("nomás")).toBeNull();
  });

  it("counts every supplied reference and leaves the draft unchanged when confirmation is cancelled", async () => {
    const user = userEvent.setup();
    const values = props({
      removalImpactForKey: vi.fn(() => ({ groups: 1, captures: 2, examples: 3, total: 6 })),
    });
    render(<CollectionOrganizer {...values} />);

    await user.click(screen.getByRole("button", { name: "Remove nomás from collection" }));
    const prompt = screen.getByRole("alertdialog", { name: "Confirm removal of nomás" });
    expect(prompt.textContent).toContain("1 group placement");
    expect(prompt.textContent).toContain("2 Source capture references");
    expect(prompt.textContent).toContain("3 Grammar example references");
    expect(prompt.textContent).toContain("6 saved references total");
    expect(prompt.textContent).toContain("hidden page structures");
    expect(screen.getByText("nomás")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save organization" }).disabled).toBe(true);

    await user.click(screen.getByRole("button", { name: "Keep vocabulary" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByText("nomás")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save organization" }).disabled).toBe(true);
    expect(values.onSave).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Remove nomás from collection" }));
    await user.click(screen.getByRole("button", { name: "Remove and clear references" }));
    expect(screen.queryByText("nomás")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Save organization" }));
    await waitFor(() => expect(values.onSave).toHaveBeenCalledWith({
      groups: [{ ...group, itemKeys: [] }],
      ungroupedItemKeys: [],
      removedItemKeys: ["user:word"],
    }));
  });
});

