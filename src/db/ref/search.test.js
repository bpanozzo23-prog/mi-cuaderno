import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { searchDictionary } from "./search.js";
import { installDictionary, fetchManifest, removeDictionary } from "./install.js";
import { buildFixtureDictionary, installFetchStub } from "../../test/dictFixture.js";
import { searchItems, mergeResults, TIER } from "../../lib/search.js";
import { newLexical, newPage } from "../items.js";

const realFetch = globalThis.fetch;

beforeEach(async () => {
  await removeDictionary();
  localStorage.clear();
  installFetchStub(await buildFixtureDictionary());
  await installDictionary(await fetchManifest());
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

const lemmas = async (query) => (await searchDictionary(query)).map((r) => r.entry.lemma);
const reasonFor = async (query, lemma) =>
  (await searchDictionary(query)).find((r) => r.entry.lemma === lemma)?.reason;

describe("the brief §12 dictionary searches", () => {
  it('resolves "fui" to both ir and ser, each labelled as a form of its lemma', async () => {
    const results = await searchDictionary("fui");
    expect(results.map((r) => r.entry.lemma).sort()).toEqual(["ir", "ser"]);
    expect(results.every((r) => r.tier === TIER.inflectedForm)).toBe(true);
    expect(await reasonFor("fui", "ir")).toBe("form of ir");
    expect(await reasonFor("fui", "ser")).toBe("form of ser");
  });

  it('resolves "casas" to casa', async () => {
    expect(await lemmas("casas")).toContain("casa");
    expect(await reasonFor("casas", "casa")).toBe("form of casa");
  });

  it('surfaces sacar for "take out", labelled as an English-meaning match', async () => {
    const results = await searchDictionary("take out");
    expect(results.map((r) => r.entry.lemma)).toContain("sacar");
    const sacar = results.find((r) => r.entry.lemma === "sacar");
    expect(sacar.tier).toBe(TIER.translation);
    expect(sacar.reason).toBe("English meaning");
  });

  it("requires every word of an English query to match, not just one", async () => {
    // "year" alone finds año; "take year" should find nothing, since no entry means both
    expect(await lemmas("year")).toContain("año");
    expect(await lemmas("take year")).toEqual([]);
  });
});

describe("§8 normalization in the reference layer", () => {
  it('never matches "año" when searching "ano"', async () => {
    expect(await lemmas("ano")).toEqual(["ano"]);
  });

  it('never matches "ano" when searching "año"', async () => {
    expect(await lemmas("año")).toEqual(["año"]);
  });

  it("ranks the exactly typed word above an accent-blind match", async () => {
    const results = await searchDictionary("año");
    expect(results[0].tier).toBe(TIER.exactTerm);
  });
});

describe("ranking and shape", () => {
  it("matches a lemma by prefix, but not by its inflections' prefixes", async () => {
    // "saca" is a prefix of the lemma sacar
    expect(await lemmas("saca")).toContain("sacar");
    // "saq" only prefixes the inflection "saque", so it must not surface sacar
    expect(await lemmas("saq")).toEqual([]);
  });

  it("does not return the same entry twice when it matches several ways", async () => {
    const results = await searchDictionary("casa");
    const ids = results.map((r) => r.entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns nothing rather than throwing when no dictionary is installed", async () => {
    await removeDictionary();
    expect(await searchDictionary("fui")).toEqual([]);
  });

  it("returns nothing for an empty query", async () => {
    expect(await searchDictionary("   ")).toEqual([]);
  });
});

describe("the seam: one list across both layers (§8)", () => {
  const notebook = [
    newLexical({ term: "sacar", translation: "my own note about sacar" }),
    newLexical({ term: "chamba", translation: "work", notes: "heard in Mexico" }),
    newPage({ title: "Preterite vs imperfect", body: "sacar is regular" }),
  ];

  it("puts the owner's own word above the dictionary's at the same tier", async () => {
    const merged = mergeResults(searchItems(notebook, "sacar"), await searchDictionary("sacar"), notebook);
    expect(merged[0].kind).toBe("item");
    expect(merged[0].item.term).toBe("sacar");
  });

  it("ranks an exact dictionary match above a personal note that merely mentions the word", async () => {
    // "casa" is only in the dictionary; the page body mentions "sacar", not "casa"
    const merged = mergeResults(searchItems(notebook, "casa"), await searchDictionary("casa"), notebook);
    expect(merged[0].kind).toBe("entry");
    expect(merged[0].entry.lemma).toBe("casa");
  });

  it("shows an attached word once — as the owner's item, not as the dictionary's entry", async () => {
    const attached = [newLexical({ term: "sacar", dictKey: "dict:wiktionary-es:sacar:verb" })];
    const merged = mergeResults(searchItems(attached, "sacar"), await searchDictionary("sacar"), attached);
    expect(merged.filter((r) => r.kind === "entry")).toHaveLength(0);
    expect(merged).toHaveLength(1);
  });

  it("finds the owner's own word through an inflection the personal layer cannot resolve", async () => {
    // The notebook has no idea "fui" relates to "ir"; the reference layer does, and the
    // item is attached to that entry — so their note surfaces, labelled with the reason.
    const attached = [newLexical({ term: "ir", dictKey: "dict:wiktionary-es:ir:verb" })];
    expect(searchItems(attached, "fui")).toHaveLength(0);

    const merged = mergeResults(searchItems(attached, "fui"), await searchDictionary("fui"), attached);
    const mine = merged.find((r) => r.kind === "item");
    expect(mine.item.term).toBe("ir");
    expect(mine.reason).toBe("form of ir");
    // and the unattached lemma is still there, as a dictionary result
    expect(merged.filter((r) => r.kind === "entry").map((r) => r.entry.lemma)).toEqual(["ser"]);
  });

  it("ranks a promoted item above the dictionary entries it shares a tier with", async () => {
    const attached = [newLexical({ term: "ir", dictKey: "dict:wiktionary-es:ir:verb" })];
    const merged = mergeResults(searchItems(attached, "fui"), await searchDictionary("fui"), attached);
    expect(merged[0].kind).toBe("item");
  });

  it("gives every result a stable key and a reason", async () => {
    const merged = mergeResults(searchItems(notebook, "sacar"), await searchDictionary("sacar"), notebook);
    expect(merged.every((r) => r.key)).toBe(true);
    expect(merged.every((r) => r.reason)).toBe(true);
    expect(new Set(merged.map((r) => r.key)).size).toBe(merged.length);
  });
});
