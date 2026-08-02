// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddSheet from "./AddSheet.jsx";
import { db, clearAllPersonalData } from "../db/db.js";
import { allItems, createItem, newLexical, newPage } from "../db/items.js";
import { allEvents, EVENT_TYPES } from "../db/events.js";

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

afterEach(cleanup);

describe("AddSheet duplicate guard", () => {
  it("warns for a cleaned lexical heading but still creates another with the chosen form", async () => {
    const user = userEvent.setup();
    const existing = await createItem(
      newLexical({ term: "buenos días", form: "phrase" })
    );
    const onCreated = vi.fn();

    render(
      <AddSheet
        kind="lexical"
        items={[existing]}
        onClose={vi.fn()}
        onCreated={onCreated}
      />
    );

    await user.type(screen.getByPlaceholderText("Spanish word or phrase *"), "  BUENOS   DÍAS  ");
    expect(screen.getByRole("status").textContent).toMatch(/already in your cuaderno/i);

    // Word and phrase are the same lexical content type for the warning, but the owner still
    // controls the form of the new homograph.
    await user.click(screen.getByRole("button", { name: "word" }));
    const add = screen.getByRole("button", { name: "Add to cuaderno" });
    expect(add.disabled).toBe(false);
    await user.click(add);

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    const items = await allItems();
    const created = items.find((item) => item.id === onCreated.mock.calls[0][0]);
    expect(created.term).toBe("BUENOS   DÍAS");
    expect(created.form).toBe("word");
    expect(items).toHaveLength(2);

    const events = await allEvents();
    expect(events.filter((event) => event.type === EVENT_TYPES.create)).toHaveLength(2);
    expect(events.filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(0);
  });

  it("warns pages only for page titles, not lexical or accent-distinct headings", async () => {
    const user = userEvent.setup();
    const lexicalRoma = await createItem(newLexical({ term: "Roma" }));
    const accentedPage = await createItem(newPage({ title: "sí" }));

    render(
      <AddSheet
        kind="page"
        items={[lexicalRoma, accentedPage]}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    const title = screen.getByPlaceholderText("Title *");
    await user.type(title, "roma");
    expect(screen.queryByRole("status")).toBeNull();

    await user.clear(title);
    await user.type(title, "si");
    expect(screen.queryByRole("status")).toBeNull();

    await user.clear(title);
    await user.type(title, " SÍ ");
    expect(screen.getByRole("status").textContent).toMatch(/page with this title/i);
    expect(screen.getByRole("button", { name: "Add page" }).disabled).toBe(false);
  });
});
