// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import KnowledgeConsolidation from "./KnowledgeConsolidation.jsx";
import { newLexical } from "../db/items.js";

afterEach(cleanup);

describe("phrase↔word containment on lexical detail", () => {
  it("keeps derived rows outside Connections and navigates in both directions", async () => {
    const user = userEvent.setup();
    const open = vi.fn();
    const word = newLexical({ term: "casa", form: "word" });
    const phrase = newLexical({ term: "Mi casa es tu casa", form: "phrase" });

    const { rerender } = render(
      <KnowledgeConsolidation item={word} items={[phrase, word]} onOpen={open} />
    );
    expect(await screen.findByText("Appears in 1 of your phrases")).toBeTruthy();
    expect(screen.getByRole("region", { name: "From your cuaderno" })).toBeTruthy();
    expect(screen.queryByText("Connections")).toBeNull();
    await user.click(screen.getByRole("button", { name: phrase.term }));
    expect(open).toHaveBeenCalledWith(phrase.id);

    rerender(<KnowledgeConsolidation item={phrase} items={[phrase, word]} onOpen={open} />);
    expect(await screen.findByText("Built on words you know")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "casa" }));
    expect(open).toHaveBeenLastCalledWith(word.id);
  });

  it("renders nothing for an empty derivation and does not mutate either item", async () => {
    const word = newLexical({ term: "madrugar", form: "word" });
    const phrase = newLexical({ term: "Buenas noches", form: "phrase" });
    const before = JSON.stringify([word, phrase]);
    const { container } = render(
      <KnowledgeConsolidation item={word} items={[word, phrase]} onOpen={vi.fn()} />
    );
    await waitFor(() => expect(container.textContent).toBe(""));
    expect(JSON.stringify([word, phrase])).toBe(before);
  });

  it("does not let an older async derivation leak onto a newly opened entry", async () => {
    const first = newLexical({ term: "casa", form: "word" });
    const second = newLexical({ term: "madrugar", form: "word" });
    const phrase = newLexical({ term: "Mi casa", form: "phrase" });
    let finishFirst;
    const prepare = vi.fn((item) => item.id === first.id
      ? new Promise((resolve) => { finishFirst = resolve; })
      : Promise.resolve([]));

    const { container, rerender } = render(
      <KnowledgeConsolidation item={first} items={[first, second, phrase]} onOpen={vi.fn()} prepareContainment={prepare} />
    );
    await waitFor(() => expect(prepare).toHaveBeenCalledTimes(1));
    rerender(
      <KnowledgeConsolidation item={second} items={[first, second, phrase]} onOpen={vi.fn()} prepareContainment={prepare} />
    );
    finishFirst([{ item: phrase, phrase, word: first, surface: "casa", matchKind: "exact" }]);
    await waitFor(() => expect(prepare).toHaveBeenCalledTimes(2));
    expect(container.textContent).toBe("");
  });
});
