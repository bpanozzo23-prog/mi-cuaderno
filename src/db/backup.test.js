import { describe, it, expect, beforeEach } from "vitest";
import { db, setPref, getPref, clearAllPersonalData } from "./db.js";
import { buildBackup, validateBackup, importBackup, BACKUP_FORMAT } from "./backup.js";
import { makeLexical, makePage, makeEvent } from "../test/factories.js";
import { SCHEMA_VERSION } from "../version.js";

const GROUP_ONE = "page-group:11111111-1111-4111-8111-111111111111";
const GROUP_TWO = "page-group:22222222-2222-4222-8222-222222222222";
const makeV3Page = (overrides = {}) => makePage({
  pageProfile: "general",
  collection: { groups: [] },
  ...overrides,
});
const makeLegacyPage = (overrides = {}) => {
  const { pageProfile: _pageProfile, collection: _collection, ...page } = makePage(overrides);
  return page;
};

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

describe("the database survives being closed and reopened", () => {
  it("reads back what it wrote", async () => {
    const word = makeLexical({ term: "madrugar", translation: "to get up very early" });
    await db.items.add(word);

    db.close();
    await db.open();

    const stored = await db.items.get(word.id);
    expect(stored).toEqual(word);
  });

  it("indexes tags and linkedKeys as multi-entry, so lookups by either are direct", async () => {
    const page = makeV3Page({ tags: ["grammar", "verbs"] });
    const word = makeLexical({ linkedKeys: [page.id] });
    await db.items.bulkAdd([page, word]);

    expect(await db.items.where("tags").equals("verbs").count()).toBe(1);
    const linkers = await db.items.where("linkedKeys").equals(page.id).toArray();
    expect(linkers.map((i) => i.id)).toEqual([word.id]);
  });
});

describe("export", () => {
  it("produces the envelope the brief specifies", async () => {
    await db.items.add(makeLexical());
    await db.events.add(makeEvent({ type: "create" }));
    await setPref("lastBackupAt", "2026-07-30T10:00:00.000Z");

    const envelope = await buildBackup();

    expect(envelope.format).toBe(BACKUP_FORMAT);
    expect(envelope.schemaVersion).toBe(SCHEMA_VERSION);
    expect(envelope.appVersion).toBeTruthy();
    expect(Date.parse(envelope.exportedAt)).not.toBeNaN();
    expect(envelope.userItems).toHaveLength(1);
    expect(envelope.events).toHaveLength(1);
    expect(envelope.preferences).toEqual({ lastBackupAt: "2026-07-30T10:00:00.000Z" });
  });
});

describe("import: replace and restore", () => {
  it("round-trips everything through export, wipe and import", async () => {
    const word = makeLexical({ term: "sacar", tags: ["verbs"], myExamples: [{ es: "Saca la basura.", en: "Take out the trash." }] });
    const page = makeV3Page({ title: "Ser vs estar", body: "Permanent vs temporary.", pageDate: "2026-07-30", linkedKeys: [word.id] });
    const events = [makeEvent({ type: "create", itemKey: word.id }), makeEvent({ type: "view", itemKey: word.id })];
    await db.items.bulkAdd([word, page]);
    await db.events.bulkAdd(events);
    await setPref("storagePersisted", true);

    const envelope = await buildBackup();
    await clearAllPersonalData();
    expect(await db.items.count()).toBe(0);

    const result = await importBackup(envelope);

    expect(result).toEqual({ items: 2, events: 2, preferences: 1 });
    expect(await db.items.get(word.id)).toEqual(word);
    expect(await db.items.get(page.id)).toEqual(page);
    expect((await db.events.toArray()).map((e) => e.id).sort()).toEqual(events.map((e) => e.id).sort());
    expect(await getPref("storagePersisted")).toBe(true);
  });

  it("round-trips collection group/item order and pinned page preferences", async () => {
    const first = makeLexical({ id: "user:first", term: "qué tal" });
    const second = makeLexical({ id: "user:second", term: "cómo" });
    const page = makeV3Page({
      id: "user:collection",
      title: "Questions",
      pageProfile: "collection",
      linkedKeys: [second.id, "dict:wiktionary-es:orphan", first.id],
      collection: {
        groups: [
          { id: GROUP_ONE, name: "Follow-ups", itemKeys: [second.id] },
          { id: GROUP_TWO, name: "Openers", itemKeys: [first.id] },
        ],
      },
    });
    await db.items.bulkAdd([first, second, page]);
    await setPref("pinnedPageIds", [page.id]);

    const exported = await buildBackup();
    expect(exported.userItems.find((item) => item.id === page.id).collection.groups).toEqual([
      { id: GROUP_ONE, name: "Follow-ups", itemKeys: [second.id] },
      { id: GROUP_TWO, name: "Openers", itemKeys: [first.id] },
    ]);
    const text = JSON.stringify(exported);
    await clearAllPersonalData();
    await importBackup(text);

    const restored = await db.items.get(page.id);
    expect(restored.linkedKeys).toEqual([second.id, "dict:wiktionary-es:orphan", first.id]);
    expect(restored.collection.groups).toEqual([
      { id: GROUP_ONE, name: "Follow-ups", itemKeys: [second.id] },
      { id: GROUP_TWO, name: "Openers", itemKeys: [first.id] },
    ]);
    expect(await getPref("pinnedPageIds")).toEqual([page.id]);
  });

  it("carries review grades through the file, so the schedule survives a restore", async () => {
    // Leitner boxes are derived from these events (src/lib/review.js). If the grade
    // metadata did not survive a backup, restoring would silently reset the schedule —
    // which is why this is checked through JSON text rather than an in-memory object.
    const word = makeLexical({ term: "madrugar" });
    await db.items.add(word);
    await db.events.bulkAdd([
      makeEvent({ type: "review_pass", itemKey: word.id, metadata: { grade: 2 } }),
      makeEvent({ type: "review_fail", itemKey: word.id, metadata: { grade: 0 } }),
    ]);

    const text = JSON.stringify(await buildBackup());
    await clearAllPersonalData();
    const { ok, envelope } = validateBackup(text);
    expect(ok).toBe(true);
    await importBackup(envelope);

    const restored = (await db.events.toArray()).sort((a, b) => a.type.localeCompare(b.type));
    expect(restored.map((e) => e.type)).toEqual(["review_fail", "review_pass"]);
    expect(restored.map((e) => e.metadata.grade)).toEqual([0, 2]);
    expect(restored.every((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.localDate))).toBe(true);
  });

  it("survives a JSON string round-trip, not just an in-memory object", async () => {
    await db.items.add(makeLexical({ term: "año" }));
    const text = JSON.stringify(await buildBackup());
    await clearAllPersonalData();

    const { ok, envelope } = validateBackup(text);
    expect(ok).toBe(true);
    await importBackup(envelope);

    const restored = await db.items.toArray();
    expect(restored[0].term).toBe("año");
  });

  it("preserves ordered structured meanings", async () => {
    const meaning = "suddenly\nall at once\nout of nowhere";
    await db.items.add(makeLexical({ term: "de repente", translation: meaning }));

    const text = JSON.stringify(await buildBackup());
    await clearAllPersonalData();
    const { ok, envelope } = validateBackup(text);
    expect(ok).toBe(true);
    await importBackup(envelope);

    const restored = await db.items.toArray();
    expect(restored[0].meanings.map((entry) => entry.gloss)).toEqual(meaning.split("\n"));
    expect(restored[0]).not.toHaveProperty("translation");
  });

  it("validates and upgrades a schema-v1 backup before restoring it", async () => {
    const current = makeLexical({
      term: "sacar",
      notes: "Entry note",
      myExamples: [{ es: "Saca la basura.", en: "Take out the trash." }],
    });
    const { meanings: _meanings, ...v1Item } = current;
    const v1Page = makeLegacyPage({ id: "user:v1-page", title: "Legacy page", linkedKeys: [current.id] });
    const v1 = {
      format: BACKUP_FORMAT,
      schemaVersion: 1,
      exportedAt: "2026-07-30T10:00:00.000Z",
      appVersion: "0.1.0",
      userItems: [{ ...v1Item, translation: "1. take out\r\n\r\nwithdraw; draw out" }, v1Page],
      events: [],
      preferences: {},
    };

    const checked = validateBackup(v1);
    expect(checked.ok).toBe(true);
    expect(checked.summary).toMatchObject({ schemaVersion: 1, targetSchemaVersion: 3, willUpgrade: true });
    expect(checked.envelope.schemaVersion).toBe(3);
    expect(checked.envelope.userItems[0].meanings.map((entry) => entry.gloss)).toEqual([
      "1. take out",
      "withdraw; draw out",
    ]);
    expect(checked.envelope.userItems[0].notes).toBe("Entry note");
    expect(checked.envelope.userItems[0].myExamples).toEqual(current.myExamples);
    expect(checked.envelope.userItems[0]).not.toHaveProperty("translation");
    expect(checked.envelope.userItems[1]).toEqual({
      ...v1Page,
      pageProfile: "general",
      collection: { groups: [] },
    });

    await importBackup(checked.envelope);
    expect((await db.items.get(current.id)).meanings).toHaveLength(2);
  });

  it("validates and upgrades a schema-v2 backup before restoring it", async () => {
    const lexical = makeLexical({ id: "user:v2-word", term: "pensar" });
    const page = makeLegacyPage({ id: "user:v2-page", title: "Thinking", linkedKeys: [lexical.id] });
    const v2 = {
      format: BACKUP_FORMAT,
      schemaVersion: 2,
      exportedAt: "2026-08-02T10:00:00.000Z",
      appVersion: "0.1.0",
      userItems: [lexical, page],
      events: [],
      preferences: { pinnedPageIds: [page.id] },
    };

    const checked = validateBackup(v2);

    expect(checked.ok).toBe(true);
    expect(checked.summary).toMatchObject({ schemaVersion: 2, targetSchemaVersion: 3, willUpgrade: true });
    expect(checked.envelope.schemaVersion).toBe(3);
    expect(checked.envelope.userItems[0]).toEqual(lexical);
    expect(checked.envelope.userItems[1]).toEqual({
      ...page,
      pageProfile: "general",
      collection: { groups: [] },
    });
    expect(checked.envelope.preferences.pinnedPageIds).toEqual([page.id]);
  });

  it("skips duplicate event ids rather than failing", async () => {
    const event = makeEvent({ type: "view" });
    const envelope = {
      format: BACKUP_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: "2026-07-30T10:00:00.000Z",
      appVersion: "0.1.0",
      userItems: [],
      events: [event, { ...event }],
      preferences: {},
    };

    const { ok, summary } = validateBackup(envelope);
    expect(ok).toBe(true);
    expect(summary.events).toBe(1);
    expect(summary.skippedEvents).toBe(1);

    await importBackup(envelope);
    expect(await db.events.count()).toBe(1);
  });
});

describe("validation happens before anything is written", () => {
  const baseline = () => ({
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: "2026-07-30T10:00:00.000Z",
    appVersion: "0.1.0",
    userItems: [makeLexical()],
    events: [],
    preferences: {},
  });

  const collectionInput = ({
    pageProfile = "collection",
    collection = { groups: [{ id: GROUP_ONE, name: "Questions", itemKeys: ["user:member"] }] },
    linkedKeys = ["user:member"],
    preferences = {},
    extraItems = [],
  } = {}) => {
    const member = makeLexical({ id: "user:member", term: "qué" });
    const page = makeV3Page({
      id: "user:collection",
      title: "Questions",
      pageProfile,
      collection,
      linkedKeys,
    });
    return { ...baseline(), userItems: [member, ...extraItems, page], preferences };
  };

  it.each([
    ["not JSON at all", "{ this is not json"],
    ["a different file's JSON", JSON.stringify({ hello: "world" })],
    ["a newer schema version", { ...baseline(), schemaVersion: SCHEMA_VERSION + 1 }],
    ["an item missing its term", { ...baseline(), userItems: [{ ...makeLexical(), term: "" }] }],
    ["an item with an unknown type", { ...baseline(), userItems: [{ ...makeLexical(), type: "recipe" }] }],
    ["a meaning with a blank gloss", { ...baseline(), userItems: [{ ...makeLexical(), meanings: [{ ...makeLexical().meanings[0], gloss: " " }] }] }],
    ["a malformed nested example", { ...baseline(), userItems: [{ ...makeLexical(), meanings: [{ ...makeLexical().meanings[0], examples: [{ es: "", en: 42 }] }] }] }],
    ["an event missing localDate", { ...baseline(), events: [{ ...makeEvent(), localDate: undefined }] }],
    ["duplicate item ids", { ...baseline(), userItems: [makeLexical({ id: "user:a" }), makeLexical({ id: "user:a" })] }],
    ["an unknown page profile", collectionInput({ pageProfile: "source" })],
    ["missing collection metadata", collectionInput({ collection: null })],
    ["a malformed page-group id", collectionInput({
      collection: { groups: [{ id: "page-group:not-a-uuid", name: "Questions", itemKeys: ["user:member"] }] },
    })],
    ["an untrimmed group name", collectionInput({
      collection: { groups: [{ id: GROUP_ONE, name: " Questions ", itemKeys: ["user:member"] }] },
    })],
    ["Unicode-equivalent duplicate group names", collectionInput({
      collection: { groups: [
        { id: GROUP_ONE, name: "Café", itemKeys: ["user:member"] },
        { id: GROUP_TWO, name: "Cafe\u0301", itemKeys: [] },
      ] },
    })],
    ["duplicate page-group ids", collectionInput({
      collection: { groups: [
        { id: GROUP_ONE, name: "Questions", itemKeys: ["user:member"] },
        { id: GROUP_ONE, name: "Answers", itemKeys: [] },
      ] },
    })],
    ["duplicate collection placement", collectionInput({
      collection: { groups: [
        { id: GROUP_ONE, name: "Questions", itemKeys: ["user:member"] },
        { id: GROUP_TWO, name: "Answers", itemKeys: ["user:member"] },
      ] },
    })],
    ["a dictionary key used as a collection member", collectionInput({
      collection: { groups: [{ id: GROUP_ONE, name: "Questions", itemKeys: ["dict:wiktionary-es:que"] }] },
      linkedKeys: ["dict:wiktionary-es:que"],
    })],
    ["a dangling collection member", collectionInput({
      collection: { groups: [{ id: GROUP_ONE, name: "Questions", itemKeys: ["user:missing"] }] },
      linkedKeys: ["user:missing"],
    })],
    ["a grouped item without an outgoing page link", collectionInput({ linkedKeys: [] })],
    ["a page used as a collection member", (() => {
      const targetPage = makeV3Page({ id: "user:other-page", title: "Other" });
      return collectionInput({
        collection: { groups: [{ id: GROUP_ONE, name: "Questions", itemKeys: [targetPage.id] }] },
        linkedKeys: [targetPage.id],
        extraItems: [targetPage],
      });
    })()],
    ["a non-array pinnedPageIds preference", collectionInput({ preferences: { pinnedPageIds: "user:collection" } })],
    ["a lexical id in pinnedPageIds", collectionInput({ preferences: { pinnedPageIds: ["user:member"] } })],
    ["a dangling pinnedPageIds preference", collectionInput({ preferences: { pinnedPageIds: ["user:missing"] } })],
  ])("rejects %s without touching the database", async (_label, input) => {
    const survivor = makeLexical({ term: "superviviente" });
    await db.items.add(survivor);

    const { ok, errors } = validateBackup(input);
    expect(ok).toBe(false);
    expect(errors.length).toBeGreaterThan(0);

    await expect(importBackup(input)).rejects.toThrow(/Refusing to import/);
    expect(await db.items.toArray()).toEqual([survivor]);
  });

  it("rejects duplicate personal meaning ids before writing", async () => {
    const survivor = makeLexical({ term: "superviviente" });
    await db.items.add(survivor);
    const first = makeLexical({ id: "user:first" });
    const second = makeLexical({ id: "user:second", meanings: [{ ...first.meanings[0] }] });
    const input = { ...baseline(), userItems: [first, second] };

    const checked = validateBackup(input);
    expect(checked.ok).toBe(false);
    expect(checked.errors.join(" ")).toMatch(/Duplicate meaning id/);
    await expect(importBackup(input)).rejects.toThrow(/Refusing to import/);
    expect(await db.items.toArray()).toEqual([survivor]);
  });
});
