import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveEntry, dictionaryInstalled, getEntries, isDictKey } from "./entries.js";
import { installDictionary, fetchManifest, removeDictionary } from "./install.js";
import { buildFixtureDictionary, installFetchStub } from "../../test/dictFixture.js";
import { db } from "../db.js";
import { createItem, newLexical, updateItem } from "../items.js";

/**
 * Brief §5: "if a dataset update removes a referenced dictionary entry and the alias map
 * cannot resolve it, the personal item keeps working as a standalone lexical item, is
 * subtly marked 'reference unlinked', and can be re-attached later. Personal data never
 * breaks because reference data changed."
 *
 * These tests cover the data half of that promise; DictAttachment renders it.
 */

const realFetch = globalThis.fetch;
const SACAR = "dict:wiktionary-es:sacar:verb";

beforeEach(async () => {
  await removeDictionary();
  await db.items.clear();
  await db.events.clear();
  localStorage.clear();
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Each call ships a distinct datasetVersion, because a rebuild is what these tests simulate. */
let build = 0;
async function install(overrides = {}) {
  installFetchStub(await buildFixtureDictionary({ datasetVersion: `fixture-v${++build}`, ...overrides }));
  await installDictionary(await fetchManifest());
}

describe("a personal item whose dictionary entry vanishes", () => {
  it("keeps its own term and translation — the item is not the entry (§5 seam rule)", async () => {
    await install();
    const item = await createItem(newLexical({ term: "sacar", translation: "to take out", dictKey: SACAR }));

    // rebuild the dictionary without sacar
    await install({ dropEntries: [SACAR] });

    const stored = await db.items.get(item.id);
    expect(stored.term).toBe("sacar");
    expect(stored.translation).toBe("to take out");
    expect((await resolveEntry(stored.dictKey)).entry).toBeNull();
  });

  it("is silently migrated when the alias map knows the entry's new id (§6)", async () => {
    await install();
    const item = await createItem(newLexical({ term: "sacar", dictKey: "dict:wiktionary-es:sacar:verb:1" }));

    await install({ previousIds: { "dict:wiktionary-es:sacar:verb:1": SACAR } });

    const { entry, resolvedFrom } = await resolveEntry(item.dictKey);
    expect(entry.lemma).toBe("sacar");
    expect(resolvedFrom).toBe("dict:wiktionary-es:sacar:verb:1");
  });

  it("can be re-attached to a different entry", async () => {
    await install();
    const item = await createItem(newLexical({ term: "sacar", dictKey: "dict:wiktionary-es:gone:verb" }));
    expect((await resolveEntry(item.dictKey)).entry).toBeNull();

    await updateItem(item.id, { dictKey: SACAR }, { logEdit: false });

    const stored = await db.items.get(item.id);
    expect((await resolveEntry(stored.dictKey)).entry.lemma).toBe("sacar");
  });

  it("reports no dictionary rather than an orphan when none is installed", async () => {
    await createItem(newLexical({ term: "sacar", dictKey: SACAR }));
    expect(await dictionaryInstalled()).toBe(false);
    // Not installed is not orphaned: the caller shows nothing, rather than a warning
    // about a dataset the owner never downloaded.
    expect((await resolveEntry(SACAR)).entry).toBeNull();
  });

  it("does not log an edit event when the alias map rewrites the link", async () => {
    await install();
    const item = await createItem(newLexical({ term: "sacar", dictKey: SACAR }));
    const before = await db.events.count();

    await updateItem(item.id, { dictKey: SACAR }, { logEdit: false });

    // The owner changed nothing — the dataset did. §7 keeps `edit` for real edits.
    expect(await db.events.count()).toBe(before);
  });
});

describe("links into the reference layer (§6)", () => {
  it("recognises a dict key and resolves linked entries", async () => {
    await install();
    expect(isDictKey(SACAR)).toBe(true);
    expect(isDictKey("user:abc")).toBe(false);

    const page = await createItem(newLexical({ term: "phrasal verbs", linkedKeys: [SACAR] }));
    const stored = await db.items.get(page.id);
    const entries = await getEntries(stored.linkedKeys.filter(isDictKey));
    expect(entries.map((e) => e.lemma)).toEqual(["sacar"]);
  });

  it("leaves the link in place, and resolvable as nothing, when the entry goes away", async () => {
    await install();
    const item = await createItem(newLexical({ term: "notes", linkedKeys: [SACAR] }));

    await install({ dropEntries: [SACAR] });

    const stored = await db.items.get(item.id);
    expect(stored.linkedKeys).toEqual([SACAR]);
    expect(await getEntries([SACAR])).toEqual([]);
  });
});
