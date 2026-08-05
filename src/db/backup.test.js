import { describe, it, expect, beforeEach } from "vitest";
import { db, setPref, getPref, clearAllPersonalData } from "./db.js";
import { buildBackup, validateBackup, importBackup, BACKUP_FORMAT } from "./backup.js";
import { makeLexical, makePage, makeEvent } from "../test/factories.js";
import { SCHEMA_VERSION } from "../version.js";
import { emptyGrammar, emptySource } from "../lib/pageKinds.js";

const GROUP_ONE = "page-group:11111111-1111-4111-8111-111111111111";
const GROUP_TWO = "page-group:22222222-2222-4222-8222-222222222222";
const CAPTURE_ONE = "source-capture:33333333-3333-4333-8333-333333333333";
const SECTION_ONE = "grammar-section:44444444-4444-4444-8444-444444444444";
const EXAMPLE_ONE = "grammar-example:55555555-5555-4555-8555-555555555555";
const makeV3Page = (overrides = {}) => makePage(overrides);
const makeV4Page = (overrides = {}) => {
  const pageProfile = overrides.pageProfile === "collection" ? "collection" : "general";
  const current = makePage({ ...overrides, pageProfile });
  const {
    pageFocus: _pageFocus,
    source: _source,
    grammar: _grammar,
    collection,
    ...legacy
  } = current;
  return { ...legacy, pageProfile, collection: { groups: collection.groups } };
};
const makeLegacyPage = (overrides = {}) => {
  const {
    pageFocus: _pageFocus,
    collection: _collection,
    source: _source,
    grammar: _grammar,
    linkAnnotations: _linkAnnotations,
    ...page
  } = makePage(overrides);
  return page;
};
const withoutAnnotations = (item) => {
  const { linkAnnotations: _linkAnnotations, ...legacy } = item;
  return legacy;
};
const upgradedGeneralPage = (legacyPage, linkAnnotations = []) => ({
  ...legacyPage,
  linkAnnotations,
  pageFocus: "notes",
  collection: { enabled: false, groups: [] },
  source: emptySource(),
  grammar: emptyGrammar(),
});

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
    const page = makeV3Page({
      title: "Ser vs estar",
      body: "Permanent vs temporary.",
      pageDate: "2026-07-30",
      linkedKeys: [word.id],
      linkAnnotations: [{
        targetKey: word.id,
        type: "explained_by",
        subject: "target",
        note: "Use this page to compare the two verbs.",
      }],
    });
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

  it("round-trips pinned vocabulary, and still accepts a backup written before pins existed", async () => {
    const word = makeLexical({ id: "user:pinned", term: "madrugar" });
    const other = makeLexical({ id: "user:other", term: "trasnochar" });
    await db.items.bulkAdd([word, other]);
    await setPref("pinnedLexicalIds", [other.id, word.id]);

    const text = JSON.stringify(await buildBackup());
    await clearAllPersonalData();
    await importBackup(text);

    expect(await getPref("pinnedLexicalIds")).toEqual([other.id, word.id]);

    // The key is absent from every backup written before this release. Those must still restore,
    // which is what let the pin list ship without a schema-version change.
    const older = JSON.parse(text);
    delete older.preferences.pinnedLexicalIds;
    expect(validateBackup(older).ok).toBe(true);
  });

  it("round-trips tag colours, accepts a file written before they existed, and refuses an invented one", async () => {
    const word = makeLexical({ id: "user:coloured", term: "chingar", tags: ["Slang", "Vulgar"] });
    await db.items.bulkAdd([word]);
    await setPref("tagColors", { Slang: "red", Vulgar: "plum" });

    const text = JSON.stringify(await buildBackup());
    await clearAllPersonalData();
    await importBackup(text);

    expect(await getPref("tagColors")).toEqual({ Slang: "red", Vulgar: "plum" });

    // Absent is valid, which is why colours needed no schema-version change.
    const older = JSON.parse(text);
    delete older.preferences.tagColors;
    expect(validateBackup(older).ok).toBe(true);

    // A hand-edited file must not be able to restore a colour the palette has never heard of.
    const invented = JSON.parse(text);
    invented.preferences.tagColors = { Slang: "chartreuse" };
    const checked = validateBackup(invented);
    expect(checked.ok).toBe(false);
    expect(checked.errors.join(" ")).toMatch(/tagColors\.Slang is not a known colour/);

    const wrongShape = JSON.parse(text);
    wrongShape.preferences.tagColors = ["red"];
    expect(validateBackup(wrongShape).ok).toBe(false);
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
      linkAnnotations: [{
        targetKey: first.id,
        type: "similar_meaning",
        subject: "owner",
        note: "Dormant while this item is an active Collection member.",
      }],
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
    expect(restored.linkAnnotations).toEqual(page.linkAnnotations);
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
    const { meanings: _meanings, linkAnnotations: _linkAnnotations, ...v1Item } = current;
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
    expect(checked.summary).toMatchObject({ schemaVersion: 1, targetSchemaVersion: 5, willUpgrade: true });
    expect(checked.envelope.schemaVersion).toBe(5);
    expect(checked.envelope.userItems[0].meanings.map((entry) => entry.gloss)).toEqual([
      "1. take out",
      "withdraw; draw out",
    ]);
    expect(checked.envelope.userItems[0].notes).toBe("Entry note");
    expect(checked.envelope.userItems[0].myExamples).toEqual(current.myExamples);
    expect(checked.envelope.userItems[0].linkAnnotations).toEqual([]);
    expect(checked.envelope.userItems[0]).not.toHaveProperty("translation");
    expect(checked.envelope.userItems[1]).toEqual(upgradedGeneralPage(v1Page));

    await importBackup(checked.envelope);
    expect((await db.items.get(current.id)).meanings).toHaveLength(2);
  });

  it("validates and upgrades a schema-v2 backup before restoring it", async () => {
    const lexical = withoutAnnotations(makeLexical({ id: "user:v2-word", term: "pensar" }));
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
    expect(checked.summary).toMatchObject({ schemaVersion: 2, targetSchemaVersion: 5, willUpgrade: true });
    expect(checked.envelope.schemaVersion).toBe(5);
    expect(checked.envelope.userItems[0]).toEqual({ ...lexical, linkAnnotations: [] });
    expect(checked.envelope.userItems[1]).toEqual(upgradedGeneralPage(page));
    expect(checked.envelope.preferences.pinnedPageIds).toEqual([page.id]);
  });

  it("validates and upgrades schema v3 through annotations and composable page structures", () => {
    const lexical = withoutAnnotations(makeLexical({
      id: "user:v3-word",
      term: "pensar",
      linkedKeys: ["user:v3-page", "user:v3-page", "user:v3-word"],
    }));
    const page = withoutAnnotations(makeV4Page({
      id: "user:v3-page",
      title: "Thinking",
      linkedKeys: [lexical.id],
    }));
    const v3 = {
      format: BACKUP_FORMAT,
      schemaVersion: 3,
      exportedAt: "2026-08-03T10:00:00.000Z",
      appVersion: "0.1.0",
      userItems: [lexical, page],
      events: [],
      preferences: { pinnedPageIds: [page.id] },
    };

    const checked = validateBackup(v3);

    expect(checked.ok).toBe(true);
    expect(checked.summary).toMatchObject({ schemaVersion: 3, targetSchemaVersion: 5, willUpgrade: true });
    expect(checked.envelope.userItems).toEqual([
      { ...lexical, linkAnnotations: [] },
      upgradedGeneralPage((({ pageProfile: _pageProfile, collection: _collection, ...rest }) => rest)(page)),
    ]);
    expect(checked.envelope.userItems[0].linkedKeys).toEqual(lexical.linkedKeys);
    expect(checked.envelope.userItems[1].linkedKeys).toEqual(page.linkedKeys);
  });

  it("upgrades schema v4 while preserving dictionary alias conflicts and orphans", () => {
    const oldKey = "dict:wiktionary-es:chamba:noun:old";
    const canonicalKey = "dict:wiktionary-es:chamba:noun";
    const item = makeLexical({
      id: "user:chamba",
      term: "chamba",
      linkedKeys: [oldKey, canonicalKey, "dict:wiktionary-es:installed-orphan"],
      linkAnnotations: [
        { targetKey: oldKey, type: "found_in", subject: "owner", note: "Old-key value" },
        { targetKey: canonicalKey, type: "contrast", subject: "owner", note: "Conflicting canonical value" },
        {
          targetKey: "dict:wiktionary-es:installed-orphan",
          type: "related",
          subject: "owner",
          note: "Keep this even when the entry cannot resolve.",
        },
      ],
    });
    const v4 = {
      format: BACKUP_FORMAT,
      schemaVersion: 4,
      exportedAt: "2026-08-04T10:00:00.000Z",
      appVersion: "0.1.0",
      userItems: [item],
      events: [],
      preferences: {},
    };

    const checked = validateBackup(JSON.stringify(v4));

    expect(checked.ok).toBe(true);
    expect(checked.envelope).toEqual({ ...v4, schemaVersion: 5 });
    expect(checked.summary).toMatchObject({ schemaVersion: 4, targetSchemaVersion: 5, willUpgrade: true });
  });

  it("round-trips exact schema-v5 Source and Grammar structures with stable contextual references", () => {
    const word = makeLexical({ id: "user:word", term: "nomás" });
    const sourcePage = makePage({
      id: "user:source",
      title: "Radio Ambulante — El hilo",
      pageFocus: "source",
      linkedKeys: [word.id],
      collection: { enabled: true, groups: [] },
      source: {
        enabled: true,
        format: "audio",
        creator: "Radio Ambulante",
        scope: "Episode 4",
        url: "https://example.com/episode",
        context: "Listening notes",
        captures: [{
          id: CAPTURE_ONE,
          type: "passage",
          text: "Nomás dime la verdad.",
          location: "18:42",
          reflection: "A useful softener.",
          itemKeys: [word.id],
        }],
      },
    });
    const grammarPage = makePage({
      id: "user:grammar",
      title: "Softening requests",
      pageFocus: "grammar",
      linkedKeys: [word.id, sourcePage.id],
      collection: { enabled: true, groups: [] },
      grammar: {
        enabled: true,
        keyIdea: "Nomás can soften an instruction.",
        sections: [{
          id: SECTION_ONE,
          name: "Pragmatics",
          explanation: "Notice the relationship and tone.",
          pattern: "nomás + imperative",
          examples: [{
            id: EXAMPLE_ONE,
            es: "Nomás dime.",
            en: "Just tell me.",
            note: "Conversational.",
            itemKeys: [word.id],
            sourceCaptureRef: { pageId: sourcePage.id, captureId: CAPTURE_ONE },
          }],
        }],
      },
    });
    const v5 = {
      format: BACKUP_FORMAT,
      schemaVersion: 5,
      exportedAt: "2026-08-04T10:00:00.000Z",
      appVersion: "0.1.0",
      userItems: [word, sourcePage, grammarPage],
      events: [],
      preferences: {},
    };

    const checked = validateBackup(JSON.stringify(v5));

    expect(checked.ok).toBe(true);
    expect(checked.envelope).toEqual(v5);
    expect(checked.summary).toMatchObject({ schemaVersion: 5, targetSchemaVersion: 5, willUpgrade: false });
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
    pageFocus = "vocabulary",
    collection = { enabled: true, groups: [{ id: GROUP_ONE, name: "Questions", itemKeys: ["user:member"] }] },
    linkedKeys = ["user:member"],
    preferences = {},
    extraItems = [],
  } = {}) => {
    const member = makeLexical({ id: "user:member", term: "qué" });
    const page = {
      ...makeV3Page({
      id: "user:collection",
      title: "Questions",
      linkedKeys,
      }),
      pageFocus,
      collection,
    };
    return { ...baseline(), userItems: [member, ...extraItems, page], preferences };
  };

  const relationshipInput = (linkAnnotations, {
    linkedKeys = ["user:target"],
    includeTarget = true,
  } = {}) => {
    const owner = makeLexical({ id: "user:owner", linkedKeys, linkAnnotations });
    const target = makeLexical({ id: "user:target", term: "estar" });
    return { ...baseline(), userItems: includeTarget ? [owner, target] : [owner] };
  };

  const contextualInput = ({ includeSourceLink = true, captureId = CAPTURE_ONE } = {}) => {
    const word = makeLexical({ id: "user:context-word", term: "nomás" });
    const sourcePage = makePage({
      id: "user:context-source",
      pageFocus: "source",
      linkedKeys: [word.id],
      source: {
        enabled: true,
        format: "book",
        creator: "",
        scope: "Chapter 1",
        url: "",
        context: "",
        captures: [{
          id: CAPTURE_ONE,
          type: "passage",
          text: "Nomás dime.",
          location: "p. 4",
          reflection: "",
          itemKeys: [word.id],
        }],
      },
    });
    const grammarPage = makePage({
      id: "user:context-grammar",
      pageFocus: "grammar",
      linkedKeys: includeSourceLink ? [word.id, sourcePage.id] : [word.id],
      grammar: {
        enabled: true,
        keyIdea: "",
        sections: [{
          id: SECTION_ONE,
          name: "Use",
          explanation: "",
          pattern: "",
          examples: [{
            id: EXAMPLE_ONE,
            es: "Nomás dime.",
            en: "",
            note: "",
            itemKeys: [word.id],
            sourceCaptureRef: { pageId: sourcePage.id, captureId },
          }],
        }],
      },
    });
    return { ...baseline(), userItems: [word, sourcePage, grammarPage] };
  };

  it.each([
    ["not JSON at all", "{ this is not json"],
    ["a different file's JSON", JSON.stringify({ hello: "world" })],
    ["a newer schema version", { ...baseline(), schemaVersion: SCHEMA_VERSION + 1 }],
    ["an item missing its term", { ...baseline(), userItems: [{ ...makeLexical(), term: "" }] }],
    ["an item with an unknown type", { ...baseline(), userItems: [{ ...makeLexical(), type: "recipe" }] }],
    ["a meaning with a blank gloss", { ...baseline(), userItems: [{ ...makeLexical(), meanings: [{ ...makeLexical().meanings[0], gloss: " " }] }] }],
    ["a malformed nested example", { ...baseline(), userItems: [{ ...makeLexical(), meanings: [{ ...makeLexical().meanings[0], examples: [{ es: "", en: 42 }] }] }] }],
    ["a missing annotation array", { ...baseline(), userItems: [{ ...makeLexical(), linkAnnotations: undefined }] }],
    ["a non-array annotation field", { ...baseline(), userItems: [{ ...makeLexical(), linkAnnotations: {} }] }],
    ["a malformed annotation", relationshipInput([null])],
    ["an annotation target without a supported namespace", relationshipInput([{
      targetKey: "meaning:not-a-link",
      type: "contrast",
      subject: "owner",
      note: "",
    }], { linkedKeys: ["meaning:not-a-link"] })],
    ["an unsupported relationship type", relationshipInput([{
      targetKey: "user:target",
      type: "example_of",
      subject: "owner",
      note: "",
    }])],
    ["an unsupported relationship subject", relationshipInput([{
      targetKey: "user:target",
      type: "found_in",
      subject: "source",
      note: "",
    }])],
    ["a target subject on a symmetric relationship", relationshipInput([{
      targetKey: "user:target",
      type: "similar_meaning",
      subject: "target",
      note: "",
    }])],
    ["a non-string relationship note", relationshipInput([{
      targetKey: "user:target",
      type: "contrast",
      subject: "owner",
      note: 42,
    }])],
    ["an untrimmed relationship note", relationshipInput([{
      targetKey: "user:target",
      type: "contrast",
      subject: "owner",
      note: " compare these ",
    }])],
    ["a redundant explicit Related annotation", relationshipInput([{
      targetKey: "user:target",
      type: "related",
      subject: "owner",
      note: "",
    }])],
    ["an annotation without its physical outgoing edge", relationshipInput([{
      targetKey: "user:target",
      type: "contrast",
      subject: "owner",
      note: "",
    }], { linkedKeys: [] })],
    ["an annotation pointing to a missing personal item", relationshipInput([{
      targetKey: "user:target",
      type: "contrast",
      subject: "owner",
      note: "",
    }], { includeTarget: false })],
    ["duplicate annotations for one target", relationshipInput([
      { targetKey: "user:target", type: "contrast", subject: "owner", note: "" },
      { targetKey: "user:target", type: "variant", subject: "owner", note: "" },
    ])],
    ["an event missing localDate", { ...baseline(), events: [{ ...makeEvent(), localDate: undefined }] }],
    ["duplicate item ids", { ...baseline(), userItems: [makeLexical({ id: "user:a" }), makeLexical({ id: "user:a" })] }],
    ["a lingering schema-v4 pageProfile", { ...baseline(), userItems: [{ ...makePage(), pageProfile: "general" }] }],
    ["an unknown page focus", collectionInput({ pageFocus: "worksheet" })],
    ["a focus whose structure is disabled", { ...baseline(), userItems: [makePage({ pageFocus: "source" })] }],
    ["missing collection metadata", collectionInput({ collection: null })],
    ["a non-http Source URL", { ...baseline(), userItems: [makePage({
      pageFocus: "source",
      source: { ...emptySource({ enabled: true }), url: "example.com/book" },
    })] }],
    ["an incomplete HTTP Source URL", { ...baseline(), userItems: [makePage({
      pageFocus: "source",
      source: { ...emptySource({ enabled: true }), url: "https://" },
    })] }],
    ["a blank Source capture", (() => {
      const input = contextualInput();
      input.userItems[1].source.captures[0].text = " ";
      return input;
    })()],
    ["a malformed Source capture id", (() => {
      const input = contextualInput();
      input.userItems[1].source.captures[0].id = "source-capture:not-a-uuid";
      return input;
    })()],
    ["an external Source capture reference without its page link", contextualInput({ includeSourceLink: false })],
    ["an exact reference to a missing Source capture", contextualInput({
      captureId: "source-capture:66666666-6666-4666-8666-666666666666",
    })],
    ["a contextual vocabulary attachment without page membership", (() => {
      const input = contextualInput();
      input.userItems[1].linkedKeys = [];
      return input;
    })()],
    ["Unicode-equivalent duplicate Grammar section names", (() => {
      const input = contextualInput();
      input.userItems[2].grammar.sections.push({
        id: "grammar-section:77777777-7777-4777-8777-777777777777",
        name: "u\u0073e",
        explanation: "",
        pattern: "",
        examples: [],
      });
      return input;
    })()],
    ["a malformed page-group id", collectionInput({
      collection: { enabled: true, groups: [{ id: "page-group:not-a-uuid", name: "Questions", itemKeys: ["user:member"] }] },
    })],
    ["an untrimmed group name", collectionInput({
      collection: { enabled: true, groups: [{ id: GROUP_ONE, name: " Questions ", itemKeys: ["user:member"] }] },
    })],
    ["Unicode-equivalent duplicate group names", collectionInput({
      collection: { enabled: true, groups: [
        { id: GROUP_ONE, name: "Café", itemKeys: ["user:member"] },
        { id: GROUP_TWO, name: "Cafe\u0301", itemKeys: [] },
      ] },
    })],
    ["duplicate page-group ids", collectionInput({
      collection: { enabled: true, groups: [
        { id: GROUP_ONE, name: "Questions", itemKeys: ["user:member"] },
        { id: GROUP_ONE, name: "Answers", itemKeys: [] },
      ] },
    })],
    ["duplicate collection placement", collectionInput({
      collection: { enabled: true, groups: [
        { id: GROUP_ONE, name: "Questions", itemKeys: ["user:member"] },
        { id: GROUP_TWO, name: "Answers", itemKeys: ["user:member"] },
      ] },
    })],
    ["a dictionary key used as a collection member", collectionInput({
      collection: { enabled: true, groups: [{ id: GROUP_ONE, name: "Questions", itemKeys: ["dict:wiktionary-es:que"] }] },
      linkedKeys: ["dict:wiktionary-es:que"],
    })],
    ["a dangling collection member", collectionInput({
      collection: { enabled: true, groups: [{ id: GROUP_ONE, name: "Questions", itemKeys: ["user:missing"] }] },
      linkedKeys: ["user:missing"],
    })],
    ["a grouped item without an outgoing page link", collectionInput({ linkedKeys: [] })],
    ["a page used as a collection member", (() => {
      const targetPage = makeV3Page({ id: "user:other-page", title: "Other" });
      return collectionInput({
        collection: { enabled: true, groups: [{ id: GROUP_ONE, name: "Questions", itemKeys: [targetPage.id] }] },
        linkedKeys: [targetPage.id],
        extraItems: [targetPage],
      });
    })()],
    ["a non-array pinnedPageIds preference", collectionInput({ preferences: { pinnedPageIds: "user:collection" } })],
    ["a lexical id in pinnedPageIds", collectionInput({ preferences: { pinnedPageIds: ["user:member"] } })],
    ["a dangling pinnedPageIds preference", collectionInput({ preferences: { pinnedPageIds: ["user:missing"] } })],
    ["a non-array pinnedLexicalIds preference", collectionInput({ preferences: { pinnedLexicalIds: "user:member" } })],
    ["a page id in pinnedLexicalIds", collectionInput({ preferences: { pinnedLexicalIds: ["user:collection"] } })],
    ["a dangling pinnedLexicalIds preference", collectionInput({ preferences: { pinnedLexicalIds: ["user:missing"] } })],
    ["duplicates in pinnedLexicalIds", collectionInput({ preferences: { pinnedLexicalIds: ["user:member", "user:member"] } })],
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

  it("rejects annotations stored on both sides of one reciprocal personal pair", () => {
    const first = makeLexical({
      id: "user:first",
      linkedKeys: ["user:second"],
      linkAnnotations: [{
        targetKey: "user:second",
        type: "contrast",
        subject: "owner",
        note: "First copy",
      }],
    });
    const second = makeLexical({
      id: "user:second",
      linkedKeys: ["user:first"],
      linkAnnotations: [{
        targetKey: "user:first",
        type: "contrast",
        subject: "owner",
        note: "Second copy",
      }],
    });

    const checked = validateBackup({ ...baseline(), userItems: [first, second] });

    expect(checked.ok).toBe(false);
    expect(checked.errors.join(" ")).toMatch(/duplicates the personal connection annotation/);
  });

  it("accepts redundant legacy physical links when only one conceptual annotation exists", () => {
    const first = makeLexical({
      id: "user:first",
      linkedKeys: ["user:second", "user:second", "user:first"],
      linkAnnotations: [{
        targetKey: "user:second",
        type: "often_confused",
        subject: "owner",
        note: "One annotation for the pair.",
      }],
    });
    const second = makeLexical({ id: "user:second", linkedKeys: ["user:first"] });

    const checked = validateBackup({ ...baseline(), userItems: [first, second] });

    expect(checked.ok).toBe(true);
    expect(checked.envelope.userItems.map((item) => item.linkedKeys)).toEqual([
      first.linkedKeys,
      second.linkedKeys,
    ]);
  });
});
