import { describe, it, expect, beforeEach } from "vitest";
import { db, setPref, getPref, clearAllPersonalData } from "./db.js";
import { buildBackup, validateBackup, importBackup, BACKUP_FORMAT } from "./backup.js";
import { makeLexical, makePage, makeEvent } from "../test/factories.js";
import { SCHEMA_VERSION } from "../version.js";

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
    const page = makePage({ tags: ["grammar", "verbs"] });
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
    const page = makePage({ title: "Ser vs estar", body: "Permanent vs temporary.", pageDate: "2026-07-30", linkedKeys: [word.id] });
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

  it.each([
    ["not JSON at all", "{ this is not json"],
    ["a different file's JSON", JSON.stringify({ hello: "world" })],
    ["a newer schema version", { ...baseline(), schemaVersion: SCHEMA_VERSION + 1 }],
    ["an item missing its term", { ...baseline(), userItems: [{ ...makeLexical(), term: "" }] }],
    ["an item with an unknown type", { ...baseline(), userItems: [{ ...makeLexical(), type: "recipe" }] }],
    ["an event missing localDate", { ...baseline(), events: [{ ...makeEvent(), localDate: undefined }] }],
    ["duplicate item ids", { ...baseline(), userItems: [makeLexical({ id: "user:a" }), makeLexical({ id: "user:a" })] }],
  ])("rejects %s without touching the database", async (_label, input) => {
    const survivor = makeLexical({ term: "superviviente" });
    await db.items.add(survivor);

    const { ok, errors } = validateBackup(input);
    expect(ok).toBe(false);
    expect(errors.length).toBeGreaterThan(0);

    await expect(importBackup(input)).rejects.toThrow(/Refusing to import/);
    expect(await db.items.toArray()).toEqual([survivor]);
  });
});
