import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db, PERSONAL_STORES } from "./db.js";
import { buildPreupgradeV1Backup, currentPersonalDatabaseVersion, preupgradeStatus } from "./preupgrade.js";
import { makeLexical } from "../test/factories.js";

beforeEach(async () => {
  db.close();
  await Dexie.delete("mi-cuaderno");
});

afterEach(async () => {
  db.close();
  await Dexie.delete("mi-cuaderno");
});

describe("export-first schema gate", () => {
  it("does not create a database merely by checking for one", async () => {
    expect(await currentPersonalDatabaseVersion()).toBeNull();
    expect(await preupgradeStatus()).toMatchObject({ needsV1Backup: false, unsupported: false });
  });

  it("exports the untouched schema-v1 envelope before allowing v2 to open", async () => {
    const legacy = new Dexie("mi-cuaderno");
    legacy.version(1).stores(PERSONAL_STORES);
    await legacy.open();
    const current = makeLexical({ term: "sacar" });
    const { meanings: _meanings, ...v1Item } = current;
    await legacy.items.add({ ...v1Item, translation: "take out\nwithdraw" });
    await legacy.events.add({
      id: "event:one",
      type: "view",
      itemKey: current.id,
      at: current.updatedAt,
      localDate: "2026-08-02",
      metadata: null,
    });
    legacy.close();

    expect(await preupgradeStatus()).toMatchObject({ version: 1, needsV1Backup: true });
    const backup = await buildPreupgradeV1Backup();

    expect(backup.schemaVersion).toBe(1);
    expect(backup.userItems[0].translation).toBe("take out\nwithdraw");
    expect(backup.userItems[0]).not.toHaveProperty("meanings");
    expect(await currentPersonalDatabaseVersion()).toBe(1);
  });
});
