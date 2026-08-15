// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";

const mocks = vi.hoisted(() => ({ searchDictionary: vi.fn() }));

vi.mock("../db/ref/search.js", () => ({
  searchDictionary: mocks.searchDictionary,
}));

import { useDictionarySearch } from "./DictionarySearch.jsx";

function Harness() {
  const [query, setQuery] = useState("");
  const { results } = useDictionarySearch(query);
  return (
    <>
      <input aria-label="Dictionary query" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div>{results.map((row) => row.entry.lemma).join(", ")}</div>
    </>
  );
}

afterEach(() => {
  cleanup();
  mocks.searchDictionary.mockReset();
});

describe("useDictionarySearch", () => {
  it("never lets a slower old query overwrite the latest suggestions", async () => {
    const user = userEvent.setup();
    const resolve = new Map();
    mocks.searchDictionary.mockImplementation((query) => new Promise((done) => resolve.set(query, done)));
    render(<Harness />);

    const input = screen.getByRole("textbox", { name: "Dictionary query" });
    await user.type(input, "ca");
    await waitFor(() => expect(mocks.searchDictionary).toHaveBeenCalledWith("ca", { limit: 8 }));

    await user.type(input, "s");
    await waitFor(() => expect(mocks.searchDictionary).toHaveBeenCalledWith("cas", { limit: 8 }));

    await act(async () => {
      resolve.get("cas")([{ entry: { id: "dict:casa", lemma: "casa" } }]);
    });
    expect(await screen.findByText("casa")).toBeTruthy();

    await act(async () => {
      resolve.get("ca")([{ entry: { id: "dict:caber", lemma: "caber" } }]);
    });
    expect(screen.getByText("casa")).toBeTruthy();
    expect(screen.queryByText("caber")).toBeNull();
  });
});
