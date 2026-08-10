import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildBackup, importBackup, validateBackup } from "./backup.js";
import { clearAllPersonalData, db, getPref, setPref } from "./db.js";
import { EVENT_TYPES } from "./events.js";
import { applyGlobalTagChange } from "./tags.js";
import { TAG_COLORS_PREF } from "../lib/tagColors.js";
import { makeLexical, makePage } from "../test/factories.js";
import { SCHEMA_VERSION } from "../version.js";

const UPDATED = "2026-08-01T12:00:00.000Z";
const lexical = (id, tags, overrides = {}) => makeLexical({
  id,
  term: id.slice(5),
  tags,
  createdAt: UPDATED,
  updatedAt: UPDATED,
  ...overrides,
});
const page = (id, tags, overrides = {}) => makePage({
  id,
  title: id.slice(5),
  tags,
  createdAt: UPDATED,
  updatedAt: UPDATED,
  ...overrides,
});

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
  vi.restoreAllMocks();
});

const edits = async () => (await db.events.toArray()).filter((event) => event.type === EVENT_TYPES.edit);

describe("applyGlobalTagChange", () => {
  it("renames the exact tag across every personal item kind without moving timestamps", async () => {
    const fixtures = [
      lexical("user:word", ["verbs", "study"]),
      lexical("user:phrase", ["Verbs", "verbs"], { form: "phrase" }),
      page("user:page", ["verbs"]),
      page("user:journal", ["verbs"], { pageDate: "2026-08-10" }),
      lexical("user:accent", ["vérbs"]),
    ];
    await db.items.bulkAdd(fixtures);
    await setPref(TAG_COLORS_PREF, { verbs: "red", grammar: "teal", keep: "blue" });

    const result = await applyGlobalTagChange({ source: "verbs", destination: "  grammar  " });

    expect(result).toMatchObject({ kind: "rename", changedCount: 4, finalCount: 4 });
    expect((await db.items.get("user:word")).tags).toEqual(["grammar", "study"]);
    expect((await db.items.get("user:phrase")).tags).toEqual(["Verbs", "grammar"]);
    expect((await db.items.get("user:page")).tags).toEqual(["grammar"]);
    expect((await db.items.get("user:journal")).tags).toEqual(["grammar"]);
    expect((await db.items.get("user:accent")).tags).toEqual(["vérbs"]);
    expect((await db.items.toArray()).every((item) => item.updatedAt === UPDATED)).toBe(true);
    expect((await edits()).map((event) => event.itemKey).sort()).toEqual([
      "user:journal",
      "user:page",
      "user:phrase",
      "user:word",
    ]);
    expect(await getPref(TAG_COLORS_PREF)).toEqual({ keep: "blue", grammar: "red" });
  });

  it("merges overlap, changes only source carriers and keeps the destination colour", async () => {
    await db.items.bulkAdd([
      lexical("user:source", ["verbs", "study"]),
      lexical("user:overlap", ["verbs", "study", "grammar"]),
      lexical("user:destination", ["grammar"]),
    ]);
    await setPref(TAG_COLORS_PREF, { verbs: "red", grammar: "teal" });

    const result = await applyGlobalTagChange({ source: "verbs", destination: "grammar" });

    expect(result).toMatchObject({
      kind: "merge",
      sourceCount: 2,
      destinationCount: 2,
      overlapCount: 1,
      finalCount: 3,
      changedCount: 2,
    });
    expect((await db.items.get("user:source")).tags).toEqual(["grammar", "study"]);
    expect((await db.items.get("user:overlap")).tags).toEqual(["study", "grammar"]);
    expect((await db.items.get("user:destination")).tags).toEqual(["grammar"]);
    expect((await edits()).map((event) => event.itemKey).sort()).toEqual(["user:overlap", "user:source"]);
    expect(await getPref(TAG_COLORS_PREF)).toEqual({ grammar: "teal" });
  });

  it("removes the tag and its colour without deleting entries or loose variants", async () => {
    await db.items.bulkAdd([
      lexical("user:word", ["verbs", "Verbs", "vérbs"]),
      page("user:page", ["verbs"]),
    ]);
    await setPref(TAG_COLORS_PREF, { verbs: "red", Verbs: "blue" });

    const result = await applyGlobalTagChange({ source: "verbs", destination: null });

    expect(result).toMatchObject({ kind: "remove", changedCount: 2 });
    expect(await db.items.count()).toBe(2);
    expect((await db.items.get("user:word")).tags).toEqual(["Verbs", "vérbs"]);
    expect((await db.items.get("user:page")).tags).toEqual([]);
    expect(await getPref(TAG_COLORS_PREF)).toEqual({ Verbs: "blue" });
  });

  it("does not write for blank, unchanged or missing-source requests", async () => {
    await db.items.add(lexical("user:word", ["verbs"]));
    await setPref(TAG_COLORS_PREF, { verbs: "red" });

    expect((await applyGlobalTagChange({ source: "verbs", destination: "  " })).kind).toBe("noop");
    expect((await applyGlobalTagChange({ source: "verbs", destination: "verbs" })).kind).toBe("noop");
    expect((await applyGlobalTagChange({ source: "missing", destination: null })).kind).toBe("noop");

    expect((await db.items.get("user:word")).tags).toEqual(["verbs"]);
    expect(await edits()).toEqual([]);
    expect(await getPref(TAG_COLORS_PREF)).toEqual({ verbs: "red" });
  });

  it("rolls items, events and colours back together when an event write fails", async () => {
    await db.items.bulkAdd([
      lexical("user:first", ["verbs"]),
      lexical("user:second", ["verbs"]),
    ]);
    await setPref(TAG_COLORS_PREF, { verbs: "red" });
    const realAdd = db.events.add.bind(db.events);
    let additions = 0;
    vi.spyOn(db.events, "add").mockImplementation((event) => {
      additions += 1;
      if (additions === 2) throw new Error("event store failed");
      return realAdd(event);
    });

    await expect(applyGlobalTagChange({ source: "verbs", destination: "grammar" }))
      .rejects.toThrow("event store failed");

    expect((await db.items.toArray()).map((item) => item.tags)).toEqual([["verbs"], ["verbs"]]);
    expect(await db.events.count()).toBe(0);
    expect(await getPref(TAG_COLORS_PREF)).toEqual({ verbs: "red" });
  });

  it("round-trips the completed mutation through a current schema backup", async () => {
    await db.items.bulkAdd([
      lexical("user:word", ["verbs"]),
      page("user:page", ["verbs"]),
    ]);
    await setPref(TAG_COLORS_PREF, { verbs: "red" });
    await applyGlobalTagChange({ source: "verbs", destination: "grammar" });

    const backup = await buildBackup();
    const checked = validateBackup(backup);
    expect(checked.ok).toBe(true);
    expect(backup.schemaVersion).toBe(SCHEMA_VERSION);

    await clearAllPersonalData();
    await importBackup(backup);

    expect((await db.items.toArray()).map((item) => item.tags)).toEqual([["grammar"], ["grammar"]]);
    expect(await getPref(TAG_COLORS_PREF)).toEqual({ grammar: "red" });
    expect(await edits()).toHaveLength(2);
    expect((await db.items.toArray()).every((item) => item.updatedAt === UPDATED)).toBe(true);
  });
});
