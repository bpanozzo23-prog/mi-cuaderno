import { describe, it, expect } from "vitest";
import { relatedTo, relatedToKey, pickerMatches, groupRelated, GROUPS } from "./links.js";

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

describe("pickerMatches finds the one item you mean", () => {
  const ids = (rows) => rows.map((r) => r.item.id);

  it("matches a word's term and a page's title", () => {
    const sacar = word("w1", { term: "sacar" });
    const grammar = page("p1", { title: "Sacar y poner" });

    expect(ids(pickerMatches([sacar, grammar], "sacar"))).toEqual(["w1", "p1"]);
  });

  it("matches the English translation, because looking up from English is first-class", () => {
    const sacar = word("w1", { term: "sacar", translation: "to take out" });

    expect(ids(pickerMatches([sacar], "take out"))).toEqual(["w1"]);
  });

  it("does NOT match tags — a picker is not a search screen", () => {
    const tagged = word("w1", { term: "correr", tags: ["verbs"] });

    expect(pickerMatches([tagged], "verbs")).toEqual([]);
  });

  it("does NOT match notes or page bodies", () => {
    const noted = word("w1", { term: "correr", notes: "heard it in a podcast" });
    const bodied = page("p1", { title: "Grammar", body: "heard it in a podcast" });

    expect(pickerMatches([noted, bodied], "podcast")).toEqual([]);
  });

  it("keeps ñ a distinct letter: año never offers ano", () => {
    const year = word("w1", { term: "año" });
    const anus = word("w2", { term: "ano" });

    expect(ids(pickerMatches([year, anus], "ano"))).toEqual(["w2"]);
    expect(ids(pickerMatches([year, anus], "año"))).toEqual(["w1"]);
  });

  it("ranks an exactly typed accent above an accent-blind match", () => {
    const accented = word("w1", { term: "sacó" });
    const plain = word("w2", { term: "saco" });

    expect(ids(pickerMatches([accented, plain], "sacó"))).toEqual(["w1", "w2"]);
    expect(ids(pickerMatches([accented, plain], "saco"))).toEqual(["w2", "w1"]);
  });

  it("ranks exact above prefix above contains", () => {
    const contains = word("w1", { term: "resacar" });
    const prefix = word("w2", { term: "sacarse" });
    const exact = word("w3", { term: "sacar" });

    expect(ids(pickerMatches([contains, prefix, exact], "sacar"))).toEqual(["w3", "w2", "w1"]);
  });

  it("never offers the item being linked from", () => {
    const self = word("w1", { term: "sacar" });
    const other = word("w2", { term: "sacar" });

    expect(ids(pickerMatches([self, other], "sacar", { excludeId: "w1" }))).toEqual(["w2"]);
  });

  it("offers the most recently updated items before anything is typed", () => {
    const older = word("w1", { updatedAt: "2026-07-01T10:00:00.000Z" });
    const newer = word("w2", { updatedAt: "2026-07-30T10:00:00.000Z" });

    // useNotebook hands items over already ordered newest-first; the picker keeps that order.
    expect(ids(pickerMatches([newer, older], ""))).toEqual(["w2", "w1"]);
    expect(ids(pickerMatches([newer, older], "   "))).toEqual(["w2", "w1"]);
  });

  it("honours the limit", () => {
    const many = Array.from({ length: 20 }, (_, i) => word(`w${i}`, { term: `sacar${i}` }));

    expect(pickerMatches(many, "sacar", { limit: 3 })).toHaveLength(3);
  });
});

describe("groupRelated sorts links into what the data already knows", () => {
  const names = (groups) => groups.map((g) => g.name);
  const keys = (groups, name) => groups.find((g) => g.name === name).rows.map((r) => r.key);

  it("splits words, undated pages and dated pages, which are journal entries (§7)", () => {
    const rows = [
      word("w1"),
      page("p1"),
      page("d1", { pageDate: "2026-07-28" }),
    ];

    const groups = groupRelated(rows);

    expect(names(groups)).toEqual([GROUPS.palabras, GROUPS.paginas, GROUPS.diario]);
    expect(keys(groups, GROUPS.palabras)).toEqual(["w1"]);
    expect(keys(groups, GROUPS.paginas)).toEqual(["p1"]);
    expect(keys(groups, GROUPS.diario)).toEqual(["d1"]);
  });

  it("orders each group most recently updated first", () => {
    const rows = [
      word("old", { updatedAt: "2026-07-01T00:00:00.000Z" }),
      word("new", { updatedAt: "2026-07-30T00:00:00.000Z" }),
      word("mid", { updatedAt: "2026-07-15T00:00:00.000Z" }),
    ];

    expect(keys(groupRelated(rows), GROUPS.palabras)).toEqual(["new", "mid", "old"]);
  });

  it("puts linked dictionary entries in palabras, after the owner's own words", () => {
    const entries = [
      { id: "dict:b", lemma: "beber", pos: "verb", senses: [{ gloss: "to drink" }] },
      { id: "dict:a", lemma: "andar", pos: "verb", senses: [{ gloss: "to walk" }] },
    ];

    const groups = groupRelated([word("w1")], entries);

    // The owner's word first; entries alphabetical, having no updatedAt to sort by.
    expect(keys(groups, GROUPS.palabras)).toEqual(["w1", "dict:a", "dict:b"]);
    expect(groups.find((g) => g.name === GROUPS.palabras).rows.map((r) => r.kind)).toEqual([
      "item",
      "entry",
      "entry",
    ]);
  });

  it("drops empty groups rather than rendering empty headings", () => {
    expect(names(groupRelated([word("w1")]))).toEqual([GROUPS.palabras]);
    expect(groupRelated([])).toEqual([]);
  });

  it("leads with the group the screen is for, without changing what is in them", () => {
    const rows = [word("w1"), page("p1"), page("d1", { pageDate: "2026-07-28" })];

    // A word's screen leads with the pages it turns up on; a page's leads with its vocabulary.
    const fromWord = groupRelated(rows, [], [GROUPS.paginas, GROUPS.diario, GROUPS.palabras]);
    expect(names(fromWord)).toEqual([GROUPS.paginas, GROUPS.diario, GROUPS.palabras]);
    expect(keys(fromWord, GROUPS.palabras)).toEqual(["w1"]);
  });
});
