// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LinkPicker from "./LinkPicker.jsx";
import { removeDictionary } from "../db/ref/install.js";
import { META_KEYS, refDb, setActiveSlot } from "../db/ref/refdb.js";
import { FIXTURE_ENTRIES, FIXTURE_FORM_SHARDS } from "../test/dictFixture.js";

const lexical = (id, term, form = "word") => ({
  id,
  type: "lexical",
  form,
  term,
  translation: "",
  pos: "",
  notes: "",
  tags: [],
  linkedKeys: [],
  mediaLinks: [],
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
});

const page = (id, title) => ({
  id,
  type: "page",
  title,
  body: "",
  tags: [],
  linkedKeys: [],
  mediaLinks: [],
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
});

const pickerProps = (item, items, over = {}) => ({
  item,
  items,
  linkedKeys: new Set(),
  onPick: vi.fn(),
  onCancel: vi.fn(),
  onCreate: vi.fn(),
  ...over,
});

async function seedCasaDictionary() {
  const reference = refDb("a");
  const casa = FIXTURE_ENTRIES.find((entry) => entry.lemma === "casa");
  await Promise.all([
    reference.entries.put(casa),
    reference.formShards.bulkPut(FIXTURE_FORM_SHARDS.filter((row) => row.id === "ca")),
    reference.meta.put({
      key: META_KEYS.dataset,
      value: { datasetVersion: "phase-5f-fixture", counts: { entries: 1 } },
    }),
  ]);
  setActiveSlot("a");
}

beforeEach(async () => {
  await removeDictionary();
  localStorage.clear();
});

afterEach(async () => {
  cleanup();
  await removeDictionary();
  vi.restoreAllMocks();
});

describe("LinkPicker duplicate guard", () => {
  it("warns lexical and page creation independently while keeping both actions enabled", async () => {
    const user = userEvent.setup();
    const source = page("source", "Source");
    const existingPhrase = lexical("phrase", "de repente", "phrase");
    const existingPage = page("page", "de repente");
    const onCreate = vi.fn();

    render(
      <LinkPicker
        {...pickerProps(source, [source, existingPhrase, existingPage], { onCreate })}
      />
    );

    await user.type(
      screen.getByPlaceholderText("Link a word, phrase, page or dictionary entry…"),
      "DE   REPENTE"
    );

    expect(screen.getAllByRole("status")).toHaveLength(2);
    const lexicalCreate = screen.getByRole("button", {
      name: /Create phrase .*DE REPENTE.* and link it/,
    });
    const pageCreate = screen.getByRole("button", {
      name: /Create page .*DE REPENTE.* and link it/,
    });
    expect(lexicalCreate.disabled).toBe(false);
    expect(pageCreate.disabled).toBe(false);

    await user.click(lexicalCreate);
    await user.click(pageCreate);
    expect(onCreate).toHaveBeenNthCalledWith(1, "lexical", "DE   REPENTE");
    expect(onCreate).toHaveBeenNthCalledWith(2, "page", "DE   REPENTE");
  });

  it("counts the current item as an existing page even though picker results exclude it", async () => {
    const user = userEvent.setup();
    const source = page("source", "Verbs");
    render(<LinkPicker {...pickerProps(source, [source])} />);

    await user.type(
      screen.getByPlaceholderText("Link a word, phrase, page or dictionary entry…"),
      "verbs"
    );

    expect(screen.getByRole("status").textContent).toMatch(/page with this title/i);
  });

  it("keeps personal creation usable for a dictionary-only exact match", async () => {
    const user = userEvent.setup();
    await seedCasaDictionary();
    const source = page("source", "Source");
    const onCreate = vi.fn();
    render(<LinkPicker {...pickerProps(source, [source], { onCreate })} />);

    await user.type(
      screen.getByPlaceholderText("Link a word, phrase, page or dictionary entry…"),
      "casa"
    );

    expect(await screen.findByRole("button", { name: /^casa/ })).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    const create = screen.getByRole("button", {
      name: /Create word .*casa.* and link it/,
    });
    expect(create.disabled).toBe(false);
    await user.click(create);
    expect(onCreate).toHaveBeenCalledWith("lexical", "casa");
  });

  it("labels a personal phrase as phrase rather than a dictionary part of speech", async () => {
    const user = userEvent.setup();
    const source = page("source", "Source");
    const phrase = lexical("phrase", "de repente", "phrase");
    render(<LinkPicker {...pickerProps(source, [source, phrase])} />);

    await user.type(
      screen.getByPlaceholderText("Link a word, phrase, page or dictionary entry…"),
      "de repente"
    );

    expect(screen.getByRole("button", { name: /^de repente phrase/ })).toBeTruthy();
    expect(screen.queryByText("loc.")).toBeNull();
  });
});
