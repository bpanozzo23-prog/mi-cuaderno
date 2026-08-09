// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ItemCard, { personalHeadingSuffix } from "./ItemCard.jsx";
import LexicalHubCard from "./LexicalHubCard.jsx";
import { ItemLinkCard } from "./LinkCard.jsx";
import ReviewSession from "./ReviewSession.jsx";
import { newMeaning } from "../lib/meanings.js";

afterEach(cleanup);

const phrase = {
  id: "user:phrase",
  type: "lexical",
  form: "phrase",
  term: "tener ganas de",
  meanings: [newMeaning({ gloss: "to feel like" })],
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
  it("does not show dictionary noun gender after a personal part-of-speech override", () => {
    expect(personalHeadingSuffix(
      { ...phrase, form: "word", pos: "other" },
      { pos: "noun", gender: "f" }
    )).toBe("");
  });

  it("gives a personal phrase no heading suffix on notebook and link cards", () => {
    const first = render(<ItemCard item={phrase} onOpen={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^tener ganas de/ })).toBeTruthy();
    expect(screen.queryByText("phrase")).toBeNull();
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
    expect(screen.getByRole("button", { name: /^tener ganas de/ })).toBeTruthy();
    expect(screen.queryByText("phrase")).toBeNull();
    expect(screen.queryByText("loc.")).toBeNull();
  });

  it("keeps phrase headings upright on both browsing cards", () => {
    const first = render(<ItemCard item={phrase} onOpen={vi.fn()} />);
    expect(screen.getByText("tener ganas de").parentElement.style.fontStyle).toBe("normal");
    first.unmount();

    render(
      <LexicalHubCard
        item={phrase}
        onOpen={vi.fn()}
        onPinnedChange={vi.fn()}
      />
    );
    expect(screen.getByText("tener ganas de").parentElement.style.fontStyle).toBe("normal");
  });

  it("leaves the review card free of a suffix too", () => {
    render(
      <ReviewSession
        cards={[{ ...phrase, box: 1, reason: "tricky", tricky: true }]}
        onFinish={vi.fn()}
        onOpen={vi.fn()}
        onGraded={vi.fn()}
      />
    );

    expect(screen.getByText("tener ganas de")).toBeTruthy();
    expect(screen.queryByText("phrase")).toBeNull();
    expect(screen.queryByText("loc.")).toBeNull();
  });

  it("reveals every meaning and cue together on one entry-level review card", async () => {
    const user = userEvent.setup();
    render(
      <ReviewSession
        cards={[{
          ...phrase,
          meanings: [
            newMeaning({ id: "meaning:first", gloss: "feel like", usageCue: "tener ganas de salir" }),
            newMeaning({ id: "meaning:second", gloss: "want", usageCue: "tener ganas de algo", regions: ["Mexico"] }),
          ],
          box: 1,
          reason: "tricky",
          tricky: true,
        }]}
        onFinish={vi.fn()}
        onOpen={vi.fn()}
        onGraded={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Tap to see the meaning" }));
    expect(screen.getByText("feel like")).toBeTruthy();
    expect(screen.getByText("want")).toBeTruthy();
    expect(screen.getByText("tener ganas de salir")).toBeTruthy();
    expect(screen.getByText("tener ganas de algo")).toBeTruthy();
    expect(screen.getByText("Mexico")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Got it" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Missed it" })).toBeTruthy();
  });
});
