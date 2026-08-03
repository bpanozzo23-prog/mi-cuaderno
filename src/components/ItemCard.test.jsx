// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ItemCard from "./ItemCard.jsx";
import { newPageGroup } from "../lib/collections.js";

afterEach(cleanup);

const lexical = (id, term) => ({
  id,
  type: "lexical",
  form: "word",
  term,
  meanings: [],
  notes: "",
  myExamples: [],
  tags: [],
  linkedKeys: [],
  mediaLinks: [],
  createdAt: "2026-08-03T00:00:00.000Z",
  updatedAt: "2026-08-03T00:00:00.000Z",
});

const page = (overrides = {}) => ({
  id: "user:collection",
  type: "page",
  title: "Travel essentials",
  body: "Words I want close at hand.",
  pageDate: null,
  tags: [],
  linkedKeys: [],
  mediaLinks: [],
  pageProfile: "general",
  collection: { groups: [] },
  createdAt: "2026-08-03T00:00:00.000Z",
  updatedAt: "2026-08-03T00:00:00.000Z",
  ...overrides,
});

describe("page cards", () => {
  it("shows Collection member/group counts and keeps a dated Collection out of Journal presentation", () => {
    const question = lexical("user:question", "¿Cuánto cuesta?");
    const answer = lexical("user:answer", "Cuesta diez euros");
    const groups = [
      newPageGroup("Questions", [question.id]),
      newPageGroup("Answers", [answer.id]),
    ];
    const collection = page({
      pageProfile: "collection",
      pageDate: "2026-08-03",
      linkedKeys: [question.id, answer.id, "dict:wiktionary-es:viaje:noun"],
      collection: { groups },
    });

    render(<ItemCard item={collection} items={[collection, question, answer]} onOpen={vi.fn()} />);

    expect(screen.getByText("Collection · 2 items · 2 groups")).toBeTruthy();
    expect(screen.queryByText("2026-08-03")).toBeNull();
  });

  it("keeps the existing dated General page presentation", () => {
    render(<ItemCard item={page({ pageDate: "2026-08-03" })} onOpen={vi.fn()} />);

    expect(screen.getByText("2026-08-03")).toBeTruthy();
    expect(screen.queryByText(/Collection ·/)).toBeNull();
  });

  it("exposes a separate accessible pin control without opening the page", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onPinnedChange = vi.fn();
    render(
      <ItemCard
        item={page()}
        onOpen={onOpen}
        pinned={false}
        onPinnedChange={onPinnedChange}
      />
    );

    const pin = screen.getByRole("button", { name: "Pin Travel essentials" });
    expect(pin.getAttribute("aria-pressed")).toBe("false");
    await user.click(pin);
    expect(onPinnedChange).toHaveBeenCalledWith(true);
    expect(onOpen).not.toHaveBeenCalled();
  });
});
