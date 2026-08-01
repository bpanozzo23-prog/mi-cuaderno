import { describe, it, expect } from "vitest";
import { relatedTo, relatedToKey } from "./links.js";

/**
 * The Phase 1c contract, asserted against the pure derivation the screens actually use:
 * a link is stored on one side and read from both. src/db/links.test.js asserts the other
 * half — that the database really does store it on one side only, and that the multi-entry
 * index answers the reverse direction.
 */

const word = (id, over = {}) => ({
  id,
  type: "lexical",
  term: id,
  translation: "",
  linkedKeys: [],
  updatedAt: "2026-07-31T10:00:00.000Z",
  ...over,
});
const page = (id, over = {}) => ({
  id,
  type: "page",
  title: id,
  body: "",
  pageDate: null,
  linkedKeys: [],
  updatedAt: "2026-07-31T10:00:00.000Z",
  ...over,
});

describe("relatedTo reads links in both directions", () => {
  it("finds items this one links to", () => {
    const sacar = word("sacar");
    const grammar = page("preterite", { linkedKeys: ["sacar"] });

    expect(relatedTo(grammar, [grammar, sacar]).map((i) => i.id)).toEqual(["sacar"]);
  });

  it("finds items that link to this one, without the link being stored here", () => {
    const sacar = word("sacar");
    const grammar = page("preterite", { linkedKeys: ["sacar"] });

    // Nothing on sacar mentions the page; the reverse direction is derived.
    expect(sacar.linkedKeys).toEqual([]);
    expect(relatedTo(sacar, [grammar, sacar]).map((i) => i.id)).toEqual(["preterite"]);
  });

  it("deduplicates when both sides happen to store the link", () => {
    const sacar = word("sacar", { linkedKeys: ["preterite"] });
    const grammar = page("preterite", { linkedKeys: ["sacar"] });

    expect(relatedTo(grammar, [grammar, sacar]).map((i) => i.id)).toEqual(["sacar"]);
  });

  it("never includes the item itself", () => {
    const self = word("sacar", { linkedKeys: ["sacar"] });

    expect(relatedTo(self, [self])).toEqual([]);
  });

  it("ignores dictionary keys, which live in the reference layer", () => {
    const sacar = word("sacar", { linkedKeys: ["dict:wiktionary-es:sacar-verb-1"] });

    expect(relatedTo(sacar, [sacar])).toEqual([]);
  });

  it("returns nothing for a missing item rather than throwing", () => {
    expect(relatedTo(null, [word("sacar")])).toEqual([]);
  });
});

describe("relatedToKey answers the same question about a dictionary entry", () => {
  const KEY = "dict:wiktionary-es:sacar-verb-1";

  it("finds items attached to the entry and items linking to it", () => {
    const attached = word("mine", { dictKey: KEY });
    const linking = page("verbs", { linkedKeys: [KEY] });
    const unrelated = word("otra");

    const found = relatedToKey(KEY, [attached, linking, unrelated]);
    expect(found.map((i) => i.id)).toEqual(["mine", "verbs"]);
  });

  it("lists an item once even when it is both attached and linked", () => {
    const both = word("mine", { dictKey: KEY, linkedKeys: [KEY] });

    expect(relatedToKey(KEY, [both]).map((i) => i.id)).toEqual(["mine"]);
  });
});
