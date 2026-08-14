// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TwinMergeResolver from "./TwinMergeResolver.jsx";

afterEach(() => cleanup());

const CANONICAL_KEY = "dict:wiktionary-es:sacar:verb";

const twin = { id: "user:twin", type: "lexical", term: "sacar", dictKey: CANONICAL_KEY };

const conflict = {
  candidates: [
    {
      source: "dictionary",
      explicit: true,
      relationship: { type: "found_in", subject: "owner", note: "From an interview." },
    },
    {
      source: "personal",
      explicit: true,
      relationship: { type: "explained_by", subject: "target", note: "My page explains it." },
    },
  ],
};

describe("TwinMergeResolver", () => {
  it("shows both descriptions and submits the owner's chosen, editable survivor", async () => {
    const user = userEvent.setup();
    const mergeTwin = vi.fn().mockResolvedValue({ merged: true });
    const onMerged = vi.fn();
    render(
      <TwinMergeResolver
        itemId="user:page"
        canonicalKey={CANONICAL_KEY}
        twin={twin}
        conflict={conflict}
        mergeTwin={mergeTwin}
        onMerged={onMerged}
      />
    );

    expect(screen.getByText("From the dictionary link")).toBeTruthy();
    expect(screen.getByText("From your existing link")).toBeTruthy();
    expect(screen.getAllByText("From an interview.").length).toBeGreaterThan(0);
    expect(screen.getByText("My page explains it.")).toBeTruthy();

    await user.click(screen.getByRole("radio", { name: "Use Explains From your existing link" }));
    expect(screen.getByRole("combobox", { name: "Relationship" }).value).toBe("explained_by:target");

    await user.selectOptions(screen.getByRole("combobox", { name: "Relationship" }), "contrast:owner");
    const note = screen.getByRole("textbox", { name: "Surviving shared note" });
    await user.clear(note);
    await user.type(note, "Keep this final note.");
    await user.click(screen.getByRole("button", { name: "Merge into my entry" }));

    await waitFor(() => expect(mergeTwin).toHaveBeenCalledWith(
      "user:page",
      CANONICAL_KEY,
      "user:twin",
      { type: "contrast", subject: "owner", note: "Keep this final note." }
    ));
    expect(onMerged).toHaveBeenCalledWith({ merged: true });
  });

  it("keeps the offer visible and explains a failed merge", async () => {
    const user = userEvent.setup();
    const mergeTwin = vi.fn().mockRejectedValue(new Error("The connection changed."));
    render(
      <TwinMergeResolver
        itemId="user:page"
        canonicalKey={CANONICAL_KEY}
        twin={twin}
        conflict={conflict}
        mergeTwin={mergeTwin}
      />
    );

    await user.click(screen.getByRole("button", { name: "Merge into my entry" }));

    expect((await screen.findByRole("alert")).textContent).toBe("The connection changed.");
    expect(screen.getByRole("heading", { name: "Point this link at “sacar”" })).toBeTruthy();
  });

  it("reports a missing dictionary without losing the owner's draft, and cancels", async () => {
    const user = userEvent.setup();
    const mergeTwin = vi.fn().mockResolvedValue({ merged: false, reason: "not_installed" });
    const onMerged = vi.fn();
    const onCancel = vi.fn();
    render(
      <TwinMergeResolver
        itemId="user:page"
        canonicalKey={CANONICAL_KEY}
        twin={twin}
        conflict={conflict}
        mergeTwin={mergeTwin}
        onMerged={onMerged}
        onCancel={onCancel}
      />
    );

    const note = screen.getByRole("textbox", { name: "Surviving shared note" });
    await user.clear(note);
    await user.type(note, "Keep this draft while I reinstall.");
    await user.click(screen.getByRole("button", { name: "Merge into my entry" }));

    expect((await screen.findByRole("alert")).textContent)
      .toBe("The dictionary is no longer installed. Reinstall it before merging this connection.");
    expect(onMerged).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Surviving shared note" }).value)
      .toBe("Keep this draft while I reinstall.");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
