import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveLinkedKeys } from "./linkedEntries.js";
import { installDictionary, fetchManifest, removeDictionary } from "./ref/install.js";
import { buildFixtureDictionary, installFetchStub } from "../test/dictFixture.js";
import { db } from "./db.js";
import { createItem, newPage, getItem } from "./items.js";
import { allEvents, EVENT_TYPES } from "./events.js";

/**
 * The §5 seam, applied to LINKS rather than attachments.
 *
 * `linkedKeys[]` may point at a dictionary entry (§6), and a rebuild can rename or remove it.
 * DictAttachment has handled this for `dictKey` since Phase 2f; before Phase 4 the linked-key
 * path did not, and quietly dropped both cases. These tests are what keeps it honest.
 */

const realFetch = globalThis.fetch;
const SACAR = "dict:wiktionary-es:sacar:verb";
const CASA = "dict:wiktionary-es:casa:noun";

beforeEach(async () => {
  await removeDictionary();
  await db.items.clear();
  await db.events.clear();
  localStorage.clear();
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

let build = 0;
async function install(overrides = {}) {
  installFetchStub(await buildFixtureDictionary({ datasetVersion: `fixture-v${++build}`, ...overrides }));
  await installDictionary(await fetchManifest());
}

describe("resolving the dictionary entries an item links to", () => {
  it("returns the entries behind the keys", async () => {
    await install();
    const page = await createItem(newPage({ title: "Verbs", linkedKeys: [SACAR, CASA] }));

    const { entries, orphans } = await resolveLinkedKeys(page);

    expect(entries.map((e) => e.lemma).sort()).toEqual(["casa", "sacar"]);
    expect(orphans).toEqual([]);
  });

  it("ignores personal keys, which are not the reference layer's business", async () => {
    await install();
    const page = await createItem(newPage({ title: "Verbs", linkedKeys: ["user:abc", SACAR] }));

    const { entries } = await resolveLinkedKeys(page);

    expect(entries.map((e) => e.id)).toEqual([SACAR]);
  });

  it("follows the alias map when a rebuild renames an entry, and rewrites the link", async () => {
    // The link was made under sacar's OLD canonical id, before a rebuild moved it.
    const oldKey = "dict:wiktionary-es:sacar:verb:1";
    await install({ previousIds: { [oldKey]: SACAR } });
    const page = await createItem(newPage({ title: "Verbs", linkedKeys: [oldKey] }));

    const { entries, orphans } = await resolveLinkedKeys(await getItem(page.id));

    // §6 ships the alias map precisely so a rebuild does not orphan links like this one.
    expect(orphans).toEqual([]);
    expect(entries.map((e) => e.id)).toEqual([SACAR]);

    // And the link is rewritten to the new id, so it survives the NEXT rebuild too instead of
    // depending on an alias chain that grows with every release (the Phase 2f argument).
    const saved = await getItem(page.id);
    expect(saved.linkedKeys).toEqual([SACAR]);
  });

  it("does not duplicate a key when the alias resolves to one already linked", async () => {
    const oldKey = "dict:wiktionary-es:sacar:verb:1";
    await install({ previousIds: { [oldKey]: SACAR } });
    const page = await createItem(newPage({ title: "Verbs", linkedKeys: [oldKey, SACAR] }));

    await resolveLinkedKeys(await getItem(page.id));

    expect((await getItem(page.id)).linkedKeys).toEqual([SACAR]);
  });

  it("reports a key nothing can resolve as an orphan instead of dropping it", async () => {
    await install();
    const page = await createItem(newPage({ title: "Verbs", linkedKeys: [SACAR, CASA] }));

    // The rebuild removes sacar, and the alias map has nothing to offer.
    await install({ dropEntries: [SACAR] });

    const { entries, orphans } = await resolveLinkedKeys(await getItem(page.id));

    expect(entries.map((e) => e.id)).toEqual([CASA]);
    expect(orphans).toEqual([SACAR]);
    // The link is still on the item: the owner decides whether to forget it, not the app.
    expect((await getItem(page.id)).linkedKeys).toContain(SACAR);
  });

  it("says nothing at all when no dictionary is installed — that is not orphaned", async () => {
    const page = await createItem(newPage({ title: "Verbs", linkedKeys: [SACAR] }));

    const { entries, orphans } = await resolveLinkedKeys(page);

    // Phase 2f: a warning about a dataset the owner never downloaded is noise they cannot act on.
    expect(entries).toEqual([]);
    expect(orphans).toEqual([]);
  });

  it("never logs an edit event: the dataset changed, the owner did not", async () => {
    await install();
    const page = await createItem(newPage({ title: "Verbs", linkedKeys: [SACAR] }));
    await install({ dropEntries: [SACAR] });

    await resolveLinkedKeys(await getItem(page.id));

    const edits = (await allEvents()).filter((e) => e.type === EVENT_TYPES.edit);
    expect(edits).toEqual([]);
  });
});
