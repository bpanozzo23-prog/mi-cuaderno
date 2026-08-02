// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ItemCard from "./ItemCard.jsx";
import { ItemLinkCard } from "./LinkCard.jsx";
import ReviewSession from "./ReviewSession.jsx";

afterEach(cleanup);

const phrase = {
  id: "user:phrase",
  type: "lexical",
  form: "phrase",
  term: "tener ganas de",
  translation: "to feel like",
  pos: "",
  notes: "",
  myExamples: [],
  tags: [],
  linkedKeys: [],
  mediaLinks: [],
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("personal word and phrase terminology", () => {
  it("labels a personal phrase consistently on notebook and link cards", () => {
    const first = render(<ItemCard item={phrase} onOpen={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^tener ganas de phrase/ })).toBeTruthy();
    expect(screen.queryByText("loc.")).toBeNull();
    first.unmount();

    render(
      <ItemLinkCard
        item={phrase}
        attached={false}
        onOpen={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /^tener ganas de phrase/ })).toBeTruthy();
    expect(screen.queryByText("loc.")).toBeNull();
  });

  it("uses the same personal phrase label on the review card", () => {
    render(
      <ReviewSession
        cards={[{ ...phrase, box: 1, reason: "tricky", tricky: true }]}
        onFinish={vi.fn()}
        onOpen={vi.fn()}
        onGraded={vi.fn()}
      />
    );

    expect(screen.getByText("phrase")).toBeTruthy();
    expect(screen.queryByText("loc.")).toBeNull();
  });
});
