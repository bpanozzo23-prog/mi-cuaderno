/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PageCustomizeSheet from "./PageCustomizeSheet.jsx";
import { savePageConfiguration } from "../db/pageStructures.js";

vi.mock("../db/pageStructures.js", () => ({ savePageConfiguration: vi.fn() }));

const page = {
  id: "user:page",
  type: "page",
  title: "Voces",
  pageDate: "2026-08-04",
  pageFocus: "source",
  linkedKeys: ["user:word"],
  collection: { enabled: true, groups: [] },
  source: { enabled: true, captures: [{ id: "source-capture:one" }] },
  grammar: { enabled: true, sections: [] },
};

beforeEach(() => {
  vi.clearAllMocks();
  savePageConfiguration.mockResolvedValue({ page, changed: true, movesToJournal: false });
});

afterEach(cleanup);

describe("PageCustomizeSheet", () => {
  it("previews the exact focus-led section order while structures are toggled", async () => {
    const user = userEvent.setup();
    render(<PageCustomizeSheet page={page} onClose={() => {}} onSaved={() => {}} />);
    const preview = screen.getByLabelText("Preview section order");

    expect(preview.textContent).toBe("Source · Vocabulary · Grammar");

    await user.click(screen.getByRole("radio", { name: "Grammar guide" }));
    expect(preview.textContent).toBe("Grammar · Vocabulary · Source");

    await user.click(screen.getByRole("radio", { name: "Vocabulary" }));
    expect(preview.textContent).toBe("Vocabulary · Source · Grammar");

    await user.click(screen.getByRole("radio", { name: "Notes" }));
    expect(preview.textContent).toBe("Notes · Source · Grammar · Vocabulary");

    await user.click(screen.getByRole("checkbox", { name: "Source notebook" }));
    expect(preview.textContent).toBe("Notes · Grammar · Vocabulary");
  });

  it("falls back to Notes when the leading structure is hidden and preserves counts", async () => {
    const user = userEvent.setup();
    render(<PageCustomizeSheet page={page} onClose={() => {}} onSaved={() => {}} />);
    expect(screen.getByText("1 capture")).toBeTruthy();
    await user.click(screen.getByRole("checkbox", { name: /^Source notebook$/i }));
    expect(screen.getByRole("radio", { name: /^Notes$/i }).checked).toBe(true);
  });

  it("labels a dated page that loses its final structures before saving", async () => {
    const user = userEvent.setup();
    render(<PageCustomizeSheet page={{
      ...page,
      collection: { enabled: false, groups: [] },
      grammar: { enabled: false, sections: [] },
    }} onClose={() => {}} onSaved={() => {}} />);
    await user.click(screen.getByRole("checkbox", { name: /^Source notebook$/i }));
    expect(screen.getByRole("button", { name: "Save and move to Diario" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Save and move to Diario" }));
    expect(savePageConfiguration).toHaveBeenCalledWith(page.id, expect.objectContaining({
      pageFocus: "notes",
      sourceEnabled: false,
    }));
  });
});
