// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { clearAllPersonalData, db } from "../db/db.js";
import { createItem, getItem, newPage } from "../db/items.js";
import { newNoteSection } from "../lib/pageKinds.js";
import StructuredNotesSection from "./StructuredNotesSection.jsx";

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

afterEach(cleanup);

function renderNotes(initialPage) {
  function Harness() {
    const [page, setPage] = useState(initialPage);
    return (
      <StructuredNotesSection
        page={page}
        onChanged={async () => setPage(await getItem(page.id))}
      />
    );
  }
  return render(<Harness />);
}

describe("Structured Notes", () => {
  it("keeps Overview callout variants and the Section option directly discoverable on an empty page", async () => {
    const user = userEvent.setup();
    const page = await createItem(newPage({ title: "Collection explanation" }));
    renderNotes(page);

    expect(screen.getByRole("button", { name: "Add Notes section" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Expand Notes section" }));
    expect(screen.getByRole("button", { name: "Write Notes overview" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Write Notes overview" }));
    const overview = screen.getByRole("textbox", { name: "Notes overview" });
    await user.type(overview, "Why these words belong together.");
    overview.setSelectionRange(0, overview.value.length);
    expect(screen.getByRole("button", { name: "Block quote" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Blank line" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Note callout" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "¡Ojo! callout" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Tip callout" }));
    await user.click(screen.getByRole("button", { name: "Save overview" }));

    await waitFor(() => expect(screen.getByRole("note", { name: "Tip" })).toBeTruthy());
    expect(screen.getByRole("note", { name: "Tip" }).textContent).toContain("Why these words belong together.");
    expect((await getItem(page.id)).body).toBe("> [!TIP]\n> Why these words belong together.");
    expect((await getItem(page.id)).noteSections).toEqual([]);
  });

  it("creates a root and one subsection with Markdown bodies and ordinary block quotes", async () => {
    const user = userEvent.setup();
    const page = await createItem(newPage({ title: "Vocabulary collection" }));
    const { container } = renderNotes(page);

    await user.click(screen.getByRole("button", { name: "Add Notes section" }));
    await user.type(screen.getByRole("textbox", { name: "Notes section name" }), "Collection context");
    const rootBody = screen.getByRole("textbox", { name: "Notes section body" });
    await user.type(rootBody, "A shared situation.");
    rootBody.setSelectionRange(0, rootBody.value.length);
    await user.click(screen.getByRole("button", { name: "¡Ojo! callout" }));
    await user.click(screen.getByRole("button", { name: "Save section" }));

    await user.click(await screen.findByRole("button", { name: "Add Notes subsection to Collection context" }));
    await user.type(screen.getByRole("textbox", { name: "Notes section name" }), "Register");
    await user.type(screen.getByRole("textbox", { name: "Notes section body" }), "> Mostly conversational.");
    await user.click(screen.getByRole("button", { name: "Save section" }));

    await waitFor(() => expect(screen.getByText("1 section · 1 subsection")).toBeTruthy());
    const stored = await getItem(page.id);
    expect(stored.noteSections).toHaveLength(2);
    expect(stored.noteSections[1].parentId).toBe(stored.noteSections[0].id);
    expect(stored.noteSections[0].body).toBe("> [!OJO]\n> A shared situation.");
    expect(screen.getByRole("note", { name: "¡Ojo!" }).textContent).toContain("A shared situation.");
    expect(container.querySelector("blockquote")?.textContent).toContain("Mostly conversational.");
    expect(container.querySelector(".grammar-note-callout")).toBeNull();
    expect(screen.getByRole("button", { name: "Organize Notes" })).toBeTruthy();
  });

  it("renders an https image inside a saved section body", async () => {
    const map = newNoteSection({
      name: "Voseo map",
      body: "El voseo por región:\n\n![Mapa del voseo](https://upload.wikimedia.org/mapa.svg)",
    });
    const page = await createItem(newPage({ title: "Grammar notes", noteSections: [map] }));

    const { container } = renderNotes(page);

    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://upload.wikimedia.org/mapa.svg");
    expect(img?.closest("a")?.getAttribute("target")).toBe("_blank");
  });

  it("organizes names, sibling order, and parents while preserving every Notes body", async () => {
    const user = userEvent.setup();
    const usage = newNoteSection({ name: "Usage", body: "Keep usage." });
    const register = newNoteSection({ parentId: usage.id, name: "Register", body: "Keep register." });
    const examples = newNoteSection({ name: "Examples", body: "Keep examples." });
    const page = await createItem(newPage({
      title: "Organized notes",
      noteSections: [usage, register, examples],
    }));
    renderNotes(page);

    await user.click(screen.getByRole("button", { name: "Organize Notes" }));
    const organizer = screen.getByText("Organize Notes").closest("div.rounded-xl");
    const firstName = within(organizer).getByRole("textbox", { name: "Section 1 name" });
    await user.clear(firstName);
    await user.type(firstName, "When to use it");
    await user.selectOptions(within(organizer).getByRole("combobox", { name: "Parent for Register" }), examples.id);
    await user.click(within(organizer).getByRole("button", { name: "Move section Examples up" }));
    await user.click(within(organizer).getByRole("button", { name: "Add Notes section to organizer" }));
    await user.type(within(organizer).getByRole("textbox", { name: "Section 4 name" }), "Study prompts");
    await user.click(within(organizer).getByRole("button", { name: "Save organization" }));

    await waitFor(async () => {
      const saved = await getItem(page.id);
      expect(saved.noteSections.map((section) => section.name)).toEqual([
        "Examples",
        "Register",
        "When to use it",
        "Study prompts",
      ]);
    });
    const saved = await getItem(page.id);
    expect(saved.noteSections).toEqual([
      expect.objectContaining({ id: examples.id, body: "Keep examples." }),
      expect.objectContaining({ id: register.id, parentId: examples.id, body: "Keep register." }),
      expect.objectContaining({ id: usage.id, name: "When to use it", body: "Keep usage." }),
      expect.objectContaining({ name: "Study prompts", parentId: null, body: "" }),
    ]);
  });

  it("confirms that deleting a leaf removes its prose and can move a dated page to Diario", async () => {
    const user = userEvent.setup();
    const only = newNoteSection({ name: "Context", body: "This prose will be deleted too." });
    const page = await createItem(newPage({
      title: "Dated outline",
      pageDate: "2026-08-10",
      noteSections: [only],
    }));
    renderNotes(page);

    await user.click(screen.getByRole("button", { name: "Edit Notes section Context" }));
    await user.click(screen.getByRole("button", { name: "Delete section" }));
    const confirmation = screen.getByRole("alertdialog", { name: "Confirm delete section" });
    expect(confirmation.textContent).toMatch(/Notes body/i);
    expect(confirmation.textContent).toMatch(/move to Diario/i);
    await user.click(within(confirmation).getByRole("button", { name: "Confirm delete" }));

    await waitFor(async () => expect((await getItem(page.id)).noteSections).toEqual([]));
  });
});
