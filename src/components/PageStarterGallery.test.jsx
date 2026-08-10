// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PageStarterGallery from "./PageStarterGallery.jsx";
import { newPage } from "../db/items.js";
import { emptySource } from "../lib/pageKinds.js";

afterEach(cleanup);

describe("page starting points", () => {
  it("starts with the five approved page families, then shows that family's recipes", async () => {
    const user = userEvent.setup();
    render(<PageStarterGallery onChoose={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: /^Notes/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Vocabulary/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Source notebook/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Grammar guide/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Copy page structure/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Conversational function/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: /^Vocabulary/ }));
    expect(screen.getByRole("button", { name: /^Blank/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Conversational function/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Situation\/context/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Register\/usage/ })).toBeTruthy();
    expect(screen.getByText("Questions · Answers · Reactions and follow-ups")).toBeTruthy();
  });

  it("returns only a composable structural seed, never family or recipe identity", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<PageStarterGallery onChoose={onChoose} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /^Source notebook/ }));
    await user.click(screen.getByRole("button", { name: /^Podcast or audio/ }));

    expect(onChoose).toHaveBeenCalledWith({
      pageFocus: "source",
      collectionEnabled: true,
      sourceEnabled: true,
      grammarEnabled: false,
      noteSections: [],
      groupNames: [],
      sectionNames: [],
      sourceFormat: "audio",
    });
    expect(onChoose.mock.calls[0][0]).not.toHaveProperty("id");
    expect(onChoose.mock.calls[0][0]).not.toHaveProperty("familyId");
    expect(onChoose.mock.calls[0][0]).not.toHaveProperty("recipeId");
    expect(onChoose.mock.calls[0][0]).not.toHaveProperty("templateId");
  });

  it("offers approved Grammar recipes and can return to the family list", async () => {
    const user = userEvent.setup();
    render(<PageStarterGallery onChoose={vi.fn()} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /^Grammar guide/ }));
    expect(screen.getByRole("button", { name: /^Rule or construction/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Compare forms/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Example bank/ })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Page families/ }));
    expect(screen.getByRole("button", { name: /^Notes/ })).toBeTruthy();
  });

  it("copies only from nonjournal Pages and returns a transient source page id", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    const notes = newPage({ title: "Thinking and opinions" });
    const journal = newPage({ title: "A journal moment", pageDate: "2026-08-04" });
    const datedSource = newPage({
      title: "Radio Ambulante",
      pageDate: "2026-08-03",
      pageFocus: "source",
      collection: { enabled: true, groups: [] },
      source: emptySource({ enabled: true, format: "audio" }),
    });
    render(
      <PageStarterGallery
        items={[journal, datedSource, notes, { id: "user:word", type: "lexical", term: "pensar" }]}
        onChoose={onChoose}
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /^Copy page structure/ }));
    expect(screen.queryByRole("button", { name: /A journal moment/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Thinking and opinions/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Radio Ambulante/ })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Copy structure from Radio Ambulante/ }));
    expect(onChoose).toHaveBeenCalledWith({ copySourcePageId: datedSource.id });
  });
});
