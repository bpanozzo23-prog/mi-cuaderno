import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, PERSONAL_STORES } from "./db.js";
import { buildBackup, importBackup, validateBackup, LAST_BACKUP_PREF } from "./backup.js";
import { BackupValidationError, RESCUE_FORMAT, rescueFilename, readBackupSnapshot, validateBackupSnapshot } from "./backupSnapshot.js";
import { buildPreupgradeBackup, currentPersonalDatabaseVersion } from "./preupgrade.js";
import { makeLexical, makePage, makeEvent } from "../test/factories.js";
import { newGrammarExample, newGrammarSection } from "../lib/pageKinds.js";
import { AI_API_KEY_PREF } from "../lib/aiPrefs.js";
import { SCHEMA_VERSION } from "../version.js";

beforeEach(async () => {
  db.close();
  await Dexie.delete("mi-cuaderno");
});

afterEach(async () => {
  vi.restoreAllMocks();
  db.close();
  await Dexie.delete("mi-cuaderno");
});

async function openConnection(version) {
  const connection = new Dexie("mi-cuaderno");
  connection.version(version).stores(PERSONAL_STORES);
  await connection.open();
  return connection;
}

describe("rescue exports", () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])(
    "preserves invalid schema-v%s rows without exporting the API key or upgrading",
    async (version) => {
      const connection = await openConnection(version);
      try {
        const invalid = { id: "user:invalid", type: "page", title: 42, extra: { keep: "raw content" } };
        const event = makeEvent({ itemKey: invalid.id });
        const prefs = [
          { key: "unusual", value: { nested: true }, extra: "retain this field" },
          { key: AI_API_KEY_PREF, value: "test-only-secret" },
        ];
        await connection.items.add(invalid);
        await connection.events.add(event);
        await connection.prefs.bulkAdd(prefs);
        expect((await connection.prefs.get(AI_API_KEY_PREF)).value).toBe("test-only-secret");
        if (version === SCHEMA_VERSION) await db.open();

        const failure = await (version === SCHEMA_VERSION ? buildBackup() : buildPreupgradeBackup())
          .catch((error) => error);
        expect(failure).toBeInstanceOf(BackupValidationError);
        const rescue = JSON.parse(JSON.stringify(failure.rescue));
        expect(rescue).toMatchObject({ format: RESCUE_FORMAT, schemaVersion: version });
        expect(rescue.stores).toEqual({ items: [invalid], events: [event], prefs: [prefs[0]] });
        expect(rescue.validationErrors.length).toBeGreaterThan(0);
        expect(JSON.stringify(failure)).not.toContain(AI_API_KEY_PREF);
        expect(JSON.stringify(failure)).not.toContain("test-only-secret");
        expect(rescueFilename(rescue)).toMatch(/^mi-cuaderno-RESCUE-.*\.json$/);
        expect(await connection.items.toArray()).toEqual([invalid]);
        expect(await connection.events.toArray()).toEqual([event]);
        expect(await connection.prefs.toArray()).toEqual([...prefs].sort((a, b) => a.key.localeCompare(b.key)));
        expect(await connection.prefs.get(LAST_BACKUP_PREF)).toBeUndefined();
        expect(await currentPersonalDatabaseVersion()).toBe(version);
        expect(validateBackup(rescue).errors.join(" ")).toMatch(/rescue.*repair/i);
      } finally {
        connection.close();
      }
    }
  );

  it("keeps a rescue when malformed Source records make the validator throw", async () => {
    await db.open();
    const source = makePage();
    source.source.captures = { malformed: true };
    const page = makePage({
      linkedKeys: [source.id],
      grammar: {
        enabled: true,
        sections: [newGrammarSection({ name: "Example", examples: [newGrammarExample({
          es: "Hola.", sourceCaptureRef: { pageId: source.id, captureId: "source-capture:11111111-1111-4111-8111-111111111111" },
        })] })],
      },
    });
    await db.items.bulkAdd([source, page]);
    const before = await db.items.toArray();
    const failure = await buildBackup().catch((error) => error);
    expect(failure).toBeInstanceOf(BackupValidationError);
    expect(failure.validationErrors.join(" ")).toMatch(/checker could not finish/);
    expect(failure.rescue.stores.items).toEqual(before);
    expect(await db.items.toArray()).toEqual(before);
  });

  it("does not invent a rescue when the records cannot be read", async () => {
    await db.open();
    const getAll = IDBObjectStore.prototype.getAll;
    vi.spyOn(IDBObjectStore.prototype, "getAll").mockImplementation(function (...args) {
      if (this.name === "items") throw new Error("Read failed");
      return getAll.apply(this, args);
    });
    const failure = await buildBackup().catch((error) => error);
    expect(failure.message).toBe("Read failed");
    expect(failure.rescue).toBeUndefined();
  });

  it("preserves the original rescue if a checker mutates its candidate before failing", async () => {
    await db.open();
    await db.items.add(makeLexical());
    await db.prefs.put({ key: "nested", value: { keep: "original" } });
    const snapshot = await readBackupSnapshot(db, SCHEMA_VERSION);
    const original = structuredClone(snapshot);
    let failure;
    try {
      validateBackupSnapshot(snapshot, (candidate) => {
        candidate.userItems[0].term = "changed by checker";
        candidate.preferences.nested.keep = "changed by checker";
        throw new Error("Checker failed");
      });
    } catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(BackupValidationError);
    expect(failure.rescue.stores).toEqual(original.stores);
    expect(snapshot).toEqual(original);
  });

  it("rejects rescue imports before writing, even with otherwise valid backup fields", async () => {
    await db.open();
    const item = makeLexical();
    await db.items.add(item);
    const valid = await buildBackup();
    const rescue = { ...valid, format: RESCUE_FORMAT, validationErrors: [], stores: {} };
    expect(validateBackup(JSON.stringify(rescue))).toMatchObject({ ok: false, envelope: null });
    await expect(importBackup(rescue)).rejects.toThrow(/rescue.*repair/i);
    expect(await db.items.toArray()).toEqual([item]);
    expect(await db.events.toArray()).toEqual([]);
    expect(await db.prefs.toArray()).toEqual([]);
  });
});

describe("consistent export snapshots", () => {
  it.each([11, 12])("reads one committed state while another connection saves (schema %s)", async (version) => {
    const writer = await openConnection(version);
    let exportTask;
    let writerFinished;
    let spy;
    try {
      const currentItem = makeLexical({ notes: "before" });
      const { dictKeys, ...legacyItem } = currentItem;
      const item = version === 12 ? currentItem : { ...legacyItem, dictKey: dictKeys[0] ?? null };
      const initialEvent = makeEvent({ itemKey: item.id, type: "create" });
      const editEvent = makeEvent({ itemKey: item.id, type: "edit" });
      await writer.items.add(item);
      await writer.events.add(initialEvent);
      await writer.prefs.put({ key: "snapshotMarker", value: "before" });
      if (version === SCHEMA_VERSION) await db.open();
      const nativeWriter = writer.backendDB();
      const getAll = IDBObjectStore.prototype.getAll;
      let injected = false;
      spy = vi.spyOn(IDBObjectStore.prototype, "getAll").mockImplementation(function (...args) {
        const request = getAll.apply(this, args);
        if (!injected && this.name === "items" && this.transaction.mode === "readonly"
            && this.transaction.db.name === "mi-cuaderno" && this.transaction.db !== nativeWriter) {
          injected = true;
          // Queue synchronously after the first actual read. Using Dexie.transaction here
          // would defer creation and fail to force the mixed-read ordering in the broken code.
          const transaction = nativeWriter.transaction(["items", "events", "prefs"], "readwrite");
          writerFinished = new Promise((resolve) => {
            transaction.addEventListener("complete", () => resolve({ ok: true }), { once: true });
            transaction.addEventListener("abort", () => resolve({ ok: false, error: transaction.error }), { once: true });
          });
          transaction.objectStore("items").put({ ...item, notes: "after" });
          transaction.objectStore("events").add(editEvent);
          transaction.objectStore("prefs").put({ key: "snapshotMarker", value: "after" });
        }
        return request;
      });
      exportTask = version === 12 ? buildBackup() : buildPreupgradeBackup();
      const exported = await exportTask;
      expect(injected).toBe(true);
      expect(await writerFinished).toEqual({ ok: true });
      expect(exported.userItems).toEqual([item]);
      expect(exported.events).toEqual([initialEvent]);
      expect(exported.preferences.snapshotMarker).toBe("before");
      // A positive control proves the competing save really ran, after the snapshot.
      expect((await writer.items.get(item.id)).notes).toBe("after");
      expect(await writer.events.get(editEvent.id)).toEqual(editEvent);
      expect((await writer.prefs.get("snapshotMarker")).value).toBe("after");
      expect(await currentPersonalDatabaseVersion()).toBe(version);
    } finally {
      spy?.mockRestore();
      await exportTask?.catch(() => {});
      await writerFinished;
      writer.close();
    }
  });
});
