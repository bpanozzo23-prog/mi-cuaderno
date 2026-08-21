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
  meanings: [],
  pos: "",
  notes: "",
  noteSections: [],
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
  return casa;
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
  it("uses a named note section as lexical context when no meaning or General note exists", () => {
    const source = page("source", "Source");
    const target = {
      ...lexical("target", "quedar"),
      noteSections: [{
        id: "note-section:14141414-1414-4414-8414-141414141414",
        parentId: null,
        name: "Usage",
        body: "Arrange to meet.",
      }],
    };

    render(<LinkPicker {...pickerProps(source, [source, target])} />);

    expect(screen.getByText("Usage: Arrange to meet.")).toBeTruthy();
  });

  it("starts at Related, offers the approved order, and passes the selected perspective", async () => {
    const user = userEvent.setup();
    const source = page("source", "Source");
    const target = lexical("target", "chamba");
    const onPick = vi.fn();

    render(<LinkPicker {...pickerProps(source, [source, target], { onPick })} />);

    const relationship = screen.getByRole("combobox", { name: "Relationship" });
    expect(relationship.value).toBe("related:owner");
    expect(Array.from(relationship.options).map((option) => option.textContent)).toEqual([
      "Similar meaning",
      "Contrast",
      "Often confused",
      "Variant",
      "Explained by",
      "Explains",
      "Found in",
      "Contains",
      "Related",
    ]);

    await user.selectOptions(relationship, "found_in:target");
    await user.click(screen.getByRole("button", { name: /^chamba/ }));

    expect(onPick).toHaveBeenCalledWith("target", {
      type: "found_in",
      subject: "target",
      note: "",
    });
  });

  it("shows the current relationship instead of a generic linked label", () => {
    const source = page("source", "Source");
    const target = lexical("target", "estar");

    render(
      <LinkPicker
        {...pickerProps(source, [source, target], {
          linkedKeys: new Set([target.id]),
          connections: [{ key: target.id, label: "Often confused" }],
        })}
      />
    );

    const row = screen.getByRole("button", { name: /estar.*Often confused/i });
    expect(row.disabled).toBe(true);
    expect(screen.queryByText("linked")).toBeNull();
  });

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

  it("does not reintroduce a filtered attached lexical item through its dictionary result", async () => {
    const user = userEvent.setup();
    const casa = await seedCasaDictionary();
    const source = page("source", "Collection");
    const attached = {
      ...lexical("attached", "mi casa"),
      dictKey: casa.id,
    };
    const onPick = vi.fn();

    render(
      <LinkPicker
        {...pickerProps(source, [source, attached], {
          candidateFilter: (candidate) => candidate.type === "page",
          allowCreateLexical: false,
          onPick,
        })}
      />
    );

    await user.type(
      screen.getByPlaceholderText("Link a word, phrase, page or dictionary entry…"),
      "casa"
    );

    const dictionaryRow = await screen.findByRole("button", { name: /^casa/ });
    expect(screen.queryByRole("button", { name: /^mi casa/ })).toBeNull();
    await user.click(dictionaryRow);
    expect(onPick).toHaveBeenCalledWith(casa.id);
  });

  it("marks an unresolved canonical dictionary result connected even when only raw alias keys are stored", async () => {
    const user = userEvent.setup();
    const casa = await seedCasaDictionary();
    const source = page("source", "Collection");
    const onPick = vi.fn();

    render(
      <LinkPicker
        {...pickerProps(source, [source], {
          linkedKeys: new Set(["dict:wiktionary-es:casa:old-a", "dict:wiktionary-es:casa:old-b"]),
          unresolvedKeys: new Set([
            casa.id,
            "dict:wiktionary-es:casa:old-a",
            "dict:wiktionary-es:casa:old-b",
          ]),
          onPick,
        })}
      />
    );

    await user.type(
      screen.getByPlaceholderText("Link a word, phrase, page or dictionary entry…"),
      "casa"
    );

    const row = await screen.findByRole("button", { name: /casa.*Needs resolution/i });
    expect(row.disabled).toBe(true);
    await user.click(row);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("shows a personal phrase bare, never borrowing a dictionary part of speech", async () => {
    const user = userEvent.setup();
    const source = page("source", "Source");
    const phrase = lexical("phrase", "de repente", "phrase");
    render(<LinkPicker {...pickerProps(source, [source, phrase])} />);

    await user.type(
      screen.getByPlaceholderText("Link a word, phrase, page or dictionary entry…"),
      "de repente"
    );

    expect(screen.getByRole("button", { name: /^de repente/ })).toBeTruthy();
    expect(screen.queryByText("phrase")).toBeNull();
    expect(screen.queryByText("loc.")).toBeNull();
  });
});
