// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeLexical, makePage } from "../test/factories.js";
import MentionedHere from "./MentionedHere.jsx";

afterEach(cleanup);

describe("Mentioned here", () => {
  it("stays collapsed until asked and requires an explicit per-row Add", async () => {
    const user = userEvent.setup();
    const word = makeLexical({ term: "sacar", dictKey: null });
    const page = makePage({ body: "Quiero sacar la basura." });
    const onOpen = vi.fn();
    const onAdd = vi.fn(async () => {});
    render(
      <MentionedHere
        items={[word, page]}
        contextId={`${page.id}:notes:overview`}
        onOpen={onOpen}
        onAdd={onAdd}
      />
    );

    const disclosure = await screen.findByRole("button", { name: "Mentioned here · 1" });
    expect(disclosure.getAttribute("aria-expanded")).toBe("false");
    await user.click(disclosure);
    await user.click(screen.getByRole("button", { name: "Open sacar" }));
    expect(onOpen).toHaveBeenCalledWith(word.id);
    await user.click(screen.getByRole("button", { name: "Add mentioned vocabulary sacar" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Mentioned here · 1" })).toBeNull();
  });

  it("retains only the failed row with an inline problem", async () => {
    const user = userEvent.setup();
    const word = makeLexical({ term: "sacar", dictKey: null });
    const page = makePage({ body: "sacar" });
    render(
      <MentionedHere
        items={[word, page]}
        contextId={`${page.id}:notes:overview`}
        onAdd={vi.fn(async () => { throw new Error("Could not save this placement."); })}
      />
    );

    await user.click(await screen.findByRole("button", { name: "Mentioned here · 1" }));
    const add = screen.getByRole("button", { name: "Add mentioned vocabulary sacar" });
    await user.click(add);
    expect((await screen.findByRole("alert")).textContent).toContain("Could not save this placement.");
    expect(add.disabled).toBe(false);
  });
});
