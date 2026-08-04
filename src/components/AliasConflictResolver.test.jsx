// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AliasConflictResolver from "./AliasConflictResolver.jsx";

afterEach(() => cleanup());

const OLD_KEY = "dict:wiktionary-es:sacar:verb:1";
const CANONICAL_KEY = "dict:wiktionary-es:sacar:verb";

const conflict = {
  canonicalKey: CANONICAL_KEY,
  entry: { id: CANONICAL_KEY, lemma: "sacar", pos: "verb" },
  rawKeys: [OLD_KEY, CANONICAL_KEY],
  candidates: [
    {
      rawKey: OLD_KEY,
      explicit: true,
      relationship: { type: "found_in", subject: "owner", note: "From an interview." },
    },
    {
      rawKey: CANONICAL_KEY,
      explicit: true,
      relationship: { type: "explained_by", subject: "target", note: "My page explains it." },
    },
  ],
};

describe("AliasConflictResolver", () => {
  it("shows every raw value and submits the owner's chosen, editable survivor", async () => {
    const user = userEvent.setup();
    const resolveConflict = vi.fn().mockResolvedValue({ resolved: true });
    const onResolved = vi.fn();
    render(
      <AliasConflictResolver
        itemId="user:page"
        conflict={conflict}
        resolveConflict={resolveConflict}
        onResolved={onResolved}
      />
    );

    expect(screen.getByText(OLD_KEY)).toBeTruthy();
    expect(screen.getByText(CANONICAL_KEY)).toBeTruthy();
    expect(screen.getAllByText("From an interview.").length).toBeGreaterThan(0);
    expect(screen.getByText("My page explains it.")).toBeTruthy();
    expect(screen.getAllByText("Found in").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Explains").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("radio", { name: `Use Explains from ${CANONICAL_KEY}` }));
    expect(screen.getByRole("combobox", { name: "Relationship" }).value).toBe("explained_by:target");

    await user.selectOptions(screen.getByRole("combobox", { name: "Relationship" }), "contrast:owner");
    const note = screen.getByRole("textbox", { name: "Surviving shared note" });
    await user.clear(note);
    await user.type(note, "Keep this final note.");
    await user.click(screen.getByRole("button", { name: "Resolve connection" }));

    await waitFor(() => expect(resolveConflict).toHaveBeenCalledWith(
      "user:page",
      CANONICAL_KEY,
      { type: "contrast", subject: "owner", note: "Keep this final note." }
    ));
    expect(onResolved).toHaveBeenCalledWith({ resolved: true });
  });

  it("keeps the conflict visible and explains a failed save", async () => {
    const user = userEvent.setup();
    const resolveConflict = vi.fn().mockRejectedValue(new Error("The connection changed."));
    render(
      <AliasConflictResolver
        itemId="user:page"
        conflict={conflict}
        resolveConflict={resolveConflict}
      />
    );

    await user.click(screen.getByRole("button", { name: "Resolve connection" }));

    expect((await screen.findByRole("alert")).textContent).toBe("The connection changed.");
    expect(screen.getByRole("heading", { name: "Resolve dictionary connection" })).toBeTruthy();
  });

  it("keeps the owner's draft and reports when the dictionary disappears before Save", async () => {
    const user = userEvent.setup();
    const resolveConflict = vi.fn().mockResolvedValue({ resolved: false, reason: "not_installed" });
    const onResolved = vi.fn();
    render(
      <AliasConflictResolver
        itemId="user:page"
        conflict={conflict}
        resolveConflict={resolveConflict}
        onResolved={onResolved}
      />
    );

    const note = screen.getByRole("textbox", { name: "Surviving shared note" });
    await user.clear(note);
    await user.type(note, "Keep this draft while I reinstall.");
    await user.click(screen.getByRole("button", { name: "Resolve connection" }));

    expect((await screen.findByRole("alert")).textContent)
      .toBe("The dictionary is no longer installed. Reinstall it before resolving this connection.");
    expect(onResolved).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Surviving shared note" }).value)
      .toBe("Keep this draft while I reinstall.");
    expect(screen.getByRole("heading", { name: "Resolve dictionary connection" })).toBeTruthy();
  });

  it("keeps an edited survivor draft across an equivalent notebook reload", async () => {
    const user = userEvent.setup();
    const props = {
      itemId: "user:page",
      conflict,
      resolveConflict: vi.fn(),
    };
    const view = render(<AliasConflictResolver {...props} />);

    await user.click(screen.getByRole("radio", { name: `Use Explains from ${CANONICAL_KEY}` }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Relationship" }), "contrast:owner");
    const note = screen.getByRole("textbox", { name: "Surviving shared note" });
    await user.clear(note);
    await user.type(note, "Unsaved owner choice");

    // allItems() returns newly materialized objects after an event or unrelated save. The values
    // are unchanged, so this must not be treated as a new conflict and reset the form.
    view.rerender(
      <AliasConflictResolver
        {...props}
        conflict={JSON.parse(JSON.stringify(conflict))}
      />
    );

    expect(screen.getByRole("combobox", { name: "Relationship" }).value).toBe("contrast:owner");
    expect(screen.getByRole("textbox", { name: "Surviving shared note" }).value)
      .toBe("Unsaved owner choice");
  });
});
