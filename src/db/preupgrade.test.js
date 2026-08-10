import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db, PERSONAL_STORES } from "./db.js";
import {
  buildPreupgradeBackup,
  currentPersonalDatabaseVersion,
  preupgradeStatus,
} from "./preupgrade.js";
import { makeLexical, makePage } from "../test/factories.js";
import { SCHEMA_VERSION } from "../version.js";

beforeEach(async () => {
  db.close();
  await Dexie.delete("mi-cuaderno");
});

afterEach(async () => {
  db.close();
  await Dexie.delete("mi-cuaderno");
});

async function seedLegacyDatabase(schemaVersion) {
  const legacy = new Dexie("mi-cuaderno");
  legacy.version(schemaVersion).stores(PERSONAL_STORES);
  await legacy.open();

  const current = makeLexical({ id: "user:sacar", term: "sacar", linkedKeys: ["user:page"] });
  const currentForSchema = schemaVersion < 4
    ? (({ linkAnnotations: _linkAnnotations, ...legacyItem }) => legacyItem)(current)
    : current;
  const lexical = schemaVersion === 1
    ? (() => {
        const { meanings: _meanings, ...v1Item } = currentForSchema;
        return { ...v1Item, translation: "take out\nwithdraw" };
      })()
    : currentForSchema;
  const currentPage = makePage({
    id: "user:page",
    title: "Thinking and opinions",
    linkedKeys: [current.id],
    grammar: {
      sections: [{
        id: "grammar-section:11111111-1111-4111-8111-111111111111",
        name: "Belief",
        explanation: "What the speaker treats as true.",
        pattern: "",
        examples: [],
      }],
    },
  });
  const relationshipShape = schemaVersion < 4
    ? (({ linkAnnotations: _linkAnnotations, ...legacyPage }) => legacyPage)(currentPage)
    : currentPage;
  const { noteSections: _noteSections, ...pageBeforeNotesOutline } = relationshipShape;
  let page;
  if (schemaVersion >= 5) {
    page = {
      ...pageBeforeNotesOutline,
      ...(schemaVersion === 5
        ? {
            grammar: {
              ...pageBeforeNotesOutline.grammar,
              sections: pageBeforeNotesOutline.grammar.sections.map(({ parentId: _parentId, ...section }) => section),
            },
          }
        : {}),
    };
  } else {
    const {
      pageFocus: _pageFocus,
      source: _source,
      grammar: _grammar,
      collection,
      ...pageBase
    } = pageBeforeNotesOutline;
    page = schemaVersion >= 3
      ? { ...pageBase, pageProfile: "general", collection: { groups: collection.groups } }
      : pageBase;
  }
  await legacy.items.bulkAdd([lexical, page]);
  await legacy.events.add({
    id: "event:one",
    type: "view",
    itemKey: current.id,
    at: current.updatedAt,
    localDate: "2026-08-02",
    metadata: null,
  });
  await legacy.prefs.add({ key: "preference", value: true });
  legacy.close();
  return { lexical, page };
}

describe("export-first schema gate", () => {
  it("does not create a database merely by checking for one", async () => {
    expect(await currentPersonalDatabaseVersion()).toBeNull();
    expect(await preupgradeStatus()).toMatchObject({
      needsBackup: false,
      needsV1Backup: false,
      unsupported: false,
    });
  });

  it.each([1, 2, 3, 4, 5, 6])("exports the untouched schema-v%s envelope before v7 can open", async (schemaVersion) => {
    const { lexical, page } = await seedLegacyDatabase(schemaVersion);

    expect(await preupgradeStatus()).toMatchObject({
      version: schemaVersion,
      needsBackup: true,
      needsV1Backup: true,
      unsupported: false,
    });
    const backup = await buildPreupgradeBackup();

    expect(backup.schemaVersion).toBe(schemaVersion);
    expect(backup.userItems).toContainEqual(lexical);
    expect(backup.userItems).toContainEqual(page);
    expect(backup.userItems.every((item) => Object.hasOwn(item, "linkAnnotations"))).toBe(schemaVersion >= 4);
    if (schemaVersion < 3 || schemaVersion >= 5) {
      expect(backup.userItems.find((item) => item.id === page.id)).not.toHaveProperty("pageProfile");
    } else {
      expect(backup.userItems.find((item) => item.id === page.id)).toMatchObject({
        pageProfile: "general",
        collection: { groups: [] },
      });
    }
    if (schemaVersion === 5) {
      expect(backup.userItems.find((item) => item.id === page.id).grammar.sections[0]).not.toHaveProperty("parentId");
    }
    expect(backup.userItems.find((item) => item.id === page.id)).not.toHaveProperty("noteSections");
    if (schemaVersion === 1) {
      expect(backup.userItems.find((item) => item.id === lexical.id).translation).toBe("take out\nwithdraw");
      expect(backup.userItems.find((item) => item.id === lexical.id)).not.toHaveProperty("meanings");
    } else {
      expect(backup.userItems.find((item) => item.id === lexical.id).meanings).toEqual(lexical.meanings);
      expect(backup.userItems.find((item) => item.id === lexical.id)).not.toHaveProperty("translation");
    }
    expect(backup.preferences).toEqual({ preference: true });
    expect(await currentPersonalDatabaseVersion()).toBe(schemaVersion);
  });

  it("blocks databases newer than this app and refuses to export them through a legacy connection", async () => {
    const newer = new Dexie("mi-cuaderno");
    newer.version(SCHEMA_VERSION + 1).stores(PERSONAL_STORES);
    await newer.open();
    newer.close();

    expect(await preupgradeStatus()).toMatchObject({
      version: SCHEMA_VERSION + 1,
      needsBackup: false,
      unsupported: true,
    });
    await expect(buildPreupgradeBackup()).rejects.toThrow(/Expected schema 1, 2, 3, 4, 5, 6/);
    expect(await currentPersonalDatabaseVersion()).toBe(SCHEMA_VERSION + 1);
  });
});
