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
  // Every seeded version predates schema v9, so the Apuntes field never appears — and versions
  // below v8 predate the stored-review field too.
  const { apuntes: _apuntes, ...pageBeforeApuntes } = relationshipShape;
  const { feedback: _feedback, ...pageBeforeFeedback } = pageBeforeApuntes;
  const { noteSections: _noteSections, ...pageBeforeNotesOutline } = pageBeforeFeedback;
  let page;
  if (schemaVersion >= 8) {
    page = pageBeforeApuntes;
  } else if (schemaVersion >= 7) {
    page = pageBeforeFeedback;
  } else if (schemaVersion >= 5) {
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
  // The owner's real database holds the AI key and flag; the export must drop the key (§10)
  // while the flag rides along, and the key itself must survive in the database.
  await legacy.prefs.add({ key: "aiApiKey", value: "sk-ant-owners-key" });
  await legacy.prefs.add({ key: "aiEnabled", value: true });
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

  it.each([1, 2, 3, 4, 5, 6, 7, 8])("exports the untouched schema-v%s envelope before v9 can open", async (schemaVersion) => {
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
    if (schemaVersion < 7) {
      expect(backup.userItems.find((item) => item.id === page.id)).not.toHaveProperty("noteSections");
    } else {
      expect(backup.userItems.find((item) => item.id === page.id).noteSections).toEqual([]);
    }
    if (schemaVersion < 8) {
      expect(backup.userItems.find((item) => item.id === page.id)).not.toHaveProperty("feedback");
    } else {
      expect(backup.userItems.find((item) => item.id === page.id).feedback).toBeNull();
    }
    expect(backup.userItems.find((item) => item.id === page.id)).not.toHaveProperty("apuntes");
    if (schemaVersion === 1) {
      expect(backup.userItems.find((item) => item.id === lexical.id).translation).toBe("take out\nwithdraw");
      expect(backup.userItems.find((item) => item.id === lexical.id)).not.toHaveProperty("meanings");
    } else {
      expect(backup.userItems.find((item) => item.id === lexical.id).meanings).toEqual(lexical.meanings);
      expect(backup.userItems.find((item) => item.id === lexical.id)).not.toHaveProperty("translation");
    }
    expect(backup.preferences).toEqual({ preference: true, aiEnabled: true });
    expect(backup.preferences).not.toHaveProperty("aiApiKey");
    expect(JSON.stringify(backup)).not.toContain("sk-ant-owners-key");
    // Only the downloaded file omits the key — the database keeps it through the migration.
    const reopened = new Dexie("mi-cuaderno");
    reopened.version(schemaVersion).stores(PERSONAL_STORES);
    await reopened.open();
    expect((await reopened.table("prefs").get("aiApiKey"))?.value).toBe("sk-ant-owners-key");
    reopened.close();
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
