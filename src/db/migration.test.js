import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { migratePersonalDataToV2, PERSONAL_STORES } from "./db.js";

describe("the first personal-data schema migration", () => {
  it("upgrades a real schema-v1 IndexedDB transaction without touching unrelated data", async () => {
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
      updatedAt: "2026-08-01T11:00:00.000Z",
    };
    const page = {
      id: "user:page",
      type: "page",
      title: "Source",
      body: "Body",
      pageDate: null,
      tags: [],
      linkedKeys: [lexical.id],
      mediaLinks: [],
      createdAt: lexical.createdAt,
      updatedAt: lexical.updatedAt,
    };
    const event = {
      id: "event:existing",
      type: "view",
      itemKey: lexical.id,
      at: lexical.updatedAt,
      localDate: "2026-08-01",
      metadata: null,
    };
    await legacy.items.bulkAdd([lexical, page]);
    await legacy.events.add(event);
    await legacy.prefs.add({ key: "preference", value: true });
    legacy.close();

    const upgraded = new Dexie(name);
    upgraded.version(1).stores(PERSONAL_STORES);
    upgraded.version(2).stores(PERSONAL_STORES).upgrade(migratePersonalDataToV2);
    await upgraded.open();

    const stored = await upgraded.items.get(lexical.id);
    expect(stored).not.toHaveProperty("translation");
    expect(stored.meanings.map((meaning) => meaning.gloss)).toEqual(["1. take out", "withdraw; draw out"]);
    expect(stored.meanings.every((meaning) => /^meaning:/.test(meaning.id))).toBe(true);
    expect(stored.notes).toBe(lexical.notes);
    expect(stored.myExamples).toEqual(lexical.myExamples);
    expect(stored.updatedAt).toBe(lexical.updatedAt);
    expect(await upgraded.items.get(page.id)).toEqual(page);
    expect(await upgraded.events.toArray()).toEqual([event]);
    expect(await upgraded.prefs.toArray()).toEqual([{ key: "preference", value: true }]);

    upgraded.close();
    await Dexie.delete(name);
  });
});
