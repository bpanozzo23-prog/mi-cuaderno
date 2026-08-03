import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import {
  migratePersonalDataToV2,
  migratePersonalDataToV3,
  PERSONAL_STORES,
} from "./db.js";

const at = "2026-08-01T11:00:00.000Z";

function pageFixture() {
  return {
    id: "user:page",
    type: "page",
    title: "Source",
    body: "Body",
    pageDate: null,
    tags: [],
    linkedKeys: ["user:sacar"],
    mediaLinks: [],
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: at,
  };
}

function eventFixture() {
  return {
    id: "event:existing",
    type: "view",
    itemKey: "user:sacar",
    at,
    localDate: "2026-08-01",
    metadata: null,
  };
}

function declareCurrentSchema(database) {
  database.version(1).stores(PERSONAL_STORES);
  database.version(2).stores(PERSONAL_STORES).upgrade(migratePersonalDataToV2);
  database.version(3).stores(PERSONAL_STORES).upgrade(migratePersonalDataToV3);
}

describe("personal-data schema v3 migrations", () => {
  it("runs v1 → v2 → v3 in order without touching unrelated data", async () => {
    const name = `mi-cuaderno-migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(1).stores(PERSONAL_STORES);
    await legacy.open();

    const lexical = {
      id: "user:sacar",
      type: "lexical",
      dictKey: "dict:wiktionary-es:sacar:verb",
      form: "word",
      term: "sacar",
      translation: "1. take out\r\n\r\nwithdraw; draw out",
      pos: "verb",
      notes: "Entry note",
      myExamples: [{ es: "Saca la basura.", en: "Take out the trash." }],
      tags: ["verbs"],
      linkedKeys: ["user:page"],
      mediaLinks: [],
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: at,
    };
    const page = pageFixture();
    const event = eventFixture();
    await legacy.items.bulkAdd([lexical, page]);
    await legacy.events.add(event);
    await legacy.prefs.add({ key: "preference", value: true });
    legacy.close();

    const upgraded = new Dexie(name);
    declareCurrentSchema(upgraded);
    try {
      await upgraded.open();

      const stored = await upgraded.items.get(lexical.id);
      expect(stored).not.toHaveProperty("translation");
      expect(stored.meanings.map((meaning) => meaning.gloss)).toEqual(["1. take out", "withdraw; draw out"]);
      expect(stored.meanings.every((meaning) => /^meaning:/.test(meaning.id))).toBe(true);
      expect(stored.notes).toBe(lexical.notes);
      expect(stored.myExamples).toEqual(lexical.myExamples);
      expect(stored.updatedAt).toBe(lexical.updatedAt);
      expect(await upgraded.items.get(page.id)).toEqual({
        ...page,
        pageProfile: "general",
        collection: { groups: [] },
      });
      expect(await upgraded.events.toArray()).toEqual([event]);
      expect(await upgraded.prefs.toArray()).toEqual([{ key: "preference", value: true }]);
    } finally {
      upgraded.close();
      await Dexie.delete(name);
    }
  });

  it("upgrades v2 pages while preserving structured lexical items, events, preferences and timestamps", async () => {
    const name = `mi-cuaderno-migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(2).stores(PERSONAL_STORES);
    await legacy.open();

    const lexical = {
      id: "user:sacar",
      type: "lexical",
      dictKey: null,
      form: "word",
      term: "sacar",
      meanings: [{
        id: "meaning:11111111-1111-4111-8111-111111111111",
        gloss: "take out",
        usageCue: "",
        regions: [],
        usageLabels: [],
        posOverride: "",
        verbBehavior: [],
        note: "",
        examples: [],
      }],
      pos: "verb",
      notes: "",
      myExamples: [],
      tags: [],
      linkedKeys: ["user:page"],
      mediaLinks: [],
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: at,
    };
    const page = pageFixture();
    const event = eventFixture();
    await legacy.items.bulkAdd([lexical, page]);
    await legacy.events.add(event);
    await legacy.prefs.add({ key: "preference", value: { nested: true } });
    legacy.close();

    const upgraded = new Dexie(name);
    declareCurrentSchema(upgraded);
    try {
      await upgraded.open();

      expect(await upgraded.items.get(lexical.id)).toEqual(lexical);
      expect(await upgraded.items.get(page.id)).toEqual({
        ...page,
        pageProfile: "general",
        collection: { groups: [] },
      });
      expect(await upgraded.events.toArray()).toEqual([event]);
      expect(await upgraded.prefs.toArray()).toEqual([{ key: "preference", value: { nested: true } }]);
    } finally {
      upgraded.close();
      await Dexie.delete(name);
    }
  });
});
