import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import {
  migratePersonalDataToV2,
  migratePersonalDataToV3,
  migratePersonalDataToV4,
  migratePersonalDataToV5,
  migratePersonalDataToV6,
  migratePersonalDataToV7,
  migratePersonalDataToV8,
  migratePersonalDataToV9,
  PERSONAL_STORES,
  upgradePageItemV5,
  upgradePageItemV6,
  upgradePageItemV7,
  upgradePageItemV8,
} from "./db.js";
import { emptyGrammar, emptySource } from "../lib/pageKinds.js";

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
  database.version(4).stores(PERSONAL_STORES).upgrade(migratePersonalDataToV4);
  database.version(5).stores(PERSONAL_STORES).upgrade(migratePersonalDataToV5);
  database.version(6).stores(PERSONAL_STORES).upgrade(migratePersonalDataToV6);
  database.version(7).stores(PERSONAL_STORES).upgrade(migratePersonalDataToV7);
  database.version(8).stores(PERSONAL_STORES).upgrade(migratePersonalDataToV8);
  database.version(9).stores(PERSONAL_STORES).upgrade(migratePersonalDataToV9);
}

const upgradedNotesPage = (page, { linkAnnotations = [], groups = [] } = {}) => ({
  ...page,
  noteSections: [],
  feedback: null,
  apuntes: null,
  linkAnnotations,
  pageFocus: "notes",
  collection: { enabled: false, groups },
  source: emptySource(),
  grammar: emptyGrammar(),
});

describe("personal-data schema v9 migrations", () => {
  it("runs v1 → v2 → v3 → v4 → v5 → v6 → v7 → v8 → v9 in order without touching unrelated data", async () => {
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
      expect(stored.linkedKeys).toEqual(lexical.linkedKeys);
      expect(stored.linkAnnotations).toEqual([]);
      expect(await upgraded.items.get(page.id)).toEqual(upgradedNotesPage(page));
      expect(await upgraded.events.toArray()).toEqual([event]);
      expect(await upgraded.prefs.toArray()).toEqual([{ key: "preference", value: true }]);
    } finally {
      upgraded.close();
      await Dexie.delete(name);
    }
  });

  it("runs v2 → v3 → v4 → v5 → v6 → v7 → v8 → v9 while preserving structured content, events, preferences and timestamps", async () => {
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

      expect(await upgraded.items.get(lexical.id)).toEqual({ ...lexical, linkAnnotations: [] });
      expect(await upgraded.items.get(page.id)).toEqual(upgradedNotesPage(page));
      expect(await upgraded.events.toArray()).toEqual([event]);
      expect(await upgraded.prefs.toArray()).toEqual([{ key: "preference", value: { nested: true } }]);
    } finally {
      upgraded.close();
      await Dexie.delete(name);
    }
  });

  it("runs v3 → v4 → v5 → v6 → v7 → v8 → v9 and preserves redundant legacy topology", async () => {
    const name = `mi-cuaderno-migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(3).stores(PERSONAL_STORES);
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
      notes: "Keep every field",
      myExamples: [],
      tags: ["verbs"],
      // Duplicate, reciprocal and self links are deliberately retained by the migration.
      linkedKeys: ["user:page", "user:page", "user:sacar"],
      mediaLinks: [],
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: at,
    };
    const page = {
      ...pageFixture(),
      pageProfile: "collection",
      collection: { groups: [] },
    };
    const event = eventFixture();
    const preference = { key: "preference", value: { nested: true } };
    await legacy.items.bulkAdd([lexical, page]);
    await legacy.events.add(event);
    await legacy.prefs.add(preference);
    legacy.close();

    const upgraded = new Dexie(name);
    declareCurrentSchema(upgraded);
    try {
      await upgraded.open();

      expect(await upgraded.items.get(lexical.id)).toEqual({ ...lexical, linkAnnotations: [] });
      const { pageProfile: _pageProfile, collection, ...pageBase } = page;
      expect(await upgraded.items.get(page.id)).toEqual({
        ...pageBase,
        linkAnnotations: [],
        pageFocus: "vocabulary",
        noteSections: [],
        feedback: null,
        apuntes: null,
        collection: { enabled: true, groups: collection.groups },
        source: emptySource(),
        grammar: emptyGrammar(),
      });
      expect((await upgraded.items.get(lexical.id)).linkedKeys).toEqual([
        "user:page",
        "user:page",
        "user:sacar",
      ]);
      expect(await upgraded.events.toArray()).toEqual([event]);
      expect(await upgraded.prefs.toArray()).toEqual([preference]);
    } finally {
      upgraded.close();
      await Dexie.delete(name);
    }
  });

  it("runs v4 → v5 → v6 → v7 → v8 → v9 by replacing only page identity and adding empty structures", async () => {
    const name = `mi-cuaderno-migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(4).stores(PERSONAL_STORES);
    await legacy.open();

    const group = {
      id: "page-group:22222222-2222-4222-8222-222222222222",
      name: "Questions",
      itemKeys: ["user:sacar"],
    };
    const page = {
      ...pageFixture(),
      pageDate: "2026-08-04",
      pageProfile: "collection",
      collection: { groups: [group] },
      // These keys were not part of schema v4 and must never opt a migrated page into a role.
      pageFocus: "source",
      source: { enabled: true, captures: [{ text: "unrecognized" }] },
      grammar: { enabled: true, sections: [] },
      linkAnnotations: [{
        targetKey: "user:sacar",
        type: "found_in",
        subject: "target",
        note: "Dormant metadata",
      }],
    };
    await legacy.items.add(page);
    legacy.close();

    const upgraded = new Dexie(name);
    declareCurrentSchema(upgraded);
    try {
      await upgraded.open();
      const stored = await upgraded.items.get(page.id);
      expect(stored).not.toHaveProperty("pageProfile");
      expect(stored).toEqual({
        ...((({
          pageProfile: _pageProfile,
          pageFocus: _pageFocus,
          collection: _collection,
          source: _source,
          grammar: _grammar,
          ...rest
        }) => rest)(page)),
        pageFocus: "vocabulary",
        noteSections: [],
        feedback: null,
        apuntes: null,
        collection: { enabled: true, groups: [group] },
        source: emptySource(),
        grammar: emptyGrammar(),
      });
      expect(stored.updatedAt).toBe(page.updatedAt);
    } finally {
      upgraded.close();
      await Dexie.delete(name);
    }
  });

  it("runs v5 → v6 by cloning Grammar sections and making each one a root", async () => {
    const rootOne = {
      id: "grammar-section:11111111-1111-4111-8111-111111111111",
      name: "Indicative",
      explanation: "Definition",
      pattern: "SPOCK",
      examples: [],
    };
    const rootTwo = {
      id: "grammar-section:22222222-2222-4222-8222-222222222222",
      name: "Subjunctive",
      explanation: "Contrast",
      pattern: "WEIRDO",
      examples: [],
    };
    const page = {
      ...pageFixture(),
      linkAnnotations: [],
      pageFocus: "grammar",
      collection: { enabled: false, groups: [] },
      source: emptySource(),
      grammar: { enabled: true, keyIdea: "Compare the moods", sections: [rootOne, rootTwo] },
    };
    const snapshot = structuredClone(page);
    const pureUpgrade = upgradePageItemV5(page);

    expect(page).toEqual(snapshot);
    expect(pureUpgrade.grammar).not.toBe(page.grammar);
    expect(pureUpgrade.grammar.sections[0]).not.toBe(page.grammar.sections[0]);
    expect(pureUpgrade.grammar.sections.map((section) => section.parentId)).toEqual([null, null]);

    const name = `mi-cuaderno-migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(5).stores(PERSONAL_STORES);
    await legacy.open();
    await legacy.items.add(page);
    legacy.close();

    const upgraded = new Dexie(name);
    declareCurrentSchema(upgraded);
    try {
      await upgraded.open();
      const stored = await upgraded.items.get(page.id);
      expect(stored).toEqual(upgradePageItemV8(upgradePageItemV7(upgradePageItemV6(pureUpgrade))));
      expect(stored.updatedAt).toBe(page.updatedAt);
    } finally {
      upgraded.close();
      await Dexie.delete(name);
    }
  });

  it("runs v6 → v7 → v8 → v9 as pure root-field additions without restructuring Page content", async () => {
    const page = {
      ...pageFixture(),
      linkAnnotations: [],
      pageFocus: "grammar",
      collection: { enabled: false, groups: [] },
      source: emptySource(),
      grammar: emptyGrammar({
        enabled: true,
        sections: [{
          id: "grammar-section:11111111-1111-4111-8111-111111111111",
          parentId: null,
          name: "Indicative",
          explanation: "Definition",
          pattern: "SPOCK",
          examples: [],
        }],
      }),
    };
    const snapshot = structuredClone(page);
    const upgradedPage = upgradePageItemV6(page);

    expect(page).toEqual(snapshot);
    expect(upgradedPage).toEqual({ ...page, noteSections: [] });
    expect(upgradedPage.grammar).toBe(page.grammar);

    const name = `mi-cuaderno-migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(6).stores(PERSONAL_STORES);
    await legacy.open();
    await legacy.items.add(page);
    legacy.close();

    const upgraded = new Dexie(name);
    declareCurrentSchema(upgraded);
    try {
      await upgraded.open();
      expect(await upgraded.items.get(page.id)).toEqual(upgradePageItemV8(upgradePageItemV7(upgradedPage)));
    } finally {
      upgraded.close();
      await Dexie.delete(name);
    }
  });

  it("runs v7 → v8 as a pure root-field addition that leaves other records untouched", async () => {
    const page = {
      ...pageFixture(),
      linkAnnotations: [],
      pageFocus: "notes",
      noteSections: [{
        id: "note-section:11111111-1111-4111-8111-111111111111",
        name: "Ideas",
        body: "Outline body",
      }],
      collection: { enabled: false, groups: [] },
      source: emptySource(),
      grammar: emptyGrammar(),
    };
    const lexical = {
      id: "user:sacar",
      type: "lexical",
      dictKey: null,
      form: "word",
      term: "sacar",
      meanings: [],
      pos: "verb",
      notes: "",
      myExamples: [],
      tags: [],
      linkedKeys: [],
      linkAnnotations: [],
      mediaLinks: [],
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: at,
    };
    const event = eventFixture();
    const preference = { key: "preference", value: true };
    const snapshot = structuredClone(page);
    const upgradedPage = upgradePageItemV7(page);

    expect(page).toEqual(snapshot);
    expect(upgradedPage).toEqual({ ...page, feedback: null });
    expect(upgradedPage.noteSections).toBe(page.noteSections);
    expect(upgradePageItemV7(lexical)).toEqual(lexical);

    const name = `mi-cuaderno-migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(7).stores(PERSONAL_STORES);
    await legacy.open();
    await legacy.items.bulkAdd([page, lexical]);
    await legacy.events.add(event);
    await legacy.prefs.add(preference);
    legacy.close();

    const upgraded = new Dexie(name);
    declareCurrentSchema(upgraded);
    try {
      await upgraded.open();
      const stored = await upgraded.items.get(page.id);
      expect(stored).toEqual(upgradePageItemV8(upgradedPage));
      expect(stored.updatedAt).toBe(page.updatedAt);
      expect(await upgraded.items.get(lexical.id)).toEqual(lexical);
      expect(await upgraded.events.toArray()).toEqual([event]);
      expect(await upgraded.prefs.toArray()).toEqual([preference]);
    } finally {
      upgraded.close();
      await Dexie.delete(name);
    }
  });

  it("runs v8 → v9 as a pure root-field addition that leaves other records untouched", async () => {
    const page = {
      ...pageFixture(),
      pageDate: "2026-08-10",
      linkAnnotations: [],
      pageFocus: "notes",
      noteSections: [],
      collection: { enabled: false, groups: [] },
      source: emptySource(),
      grammar: emptyGrammar(),
      // A stored review must ride the migration untouched, not be confused with the new field.
      feedback: {
        verdict: "clear",
        summary: "Reads well.",
        items: [],
        reviewedAt: "2026-08-11T10:00:00.000Z",
        reviewedHash: "abc123",
      },
    };
    const lexical = {
      id: "user:sacar",
      type: "lexical",
      dictKey: null,
      form: "word",
      term: "sacar",
      meanings: [],
      pos: "verb",
      notes: "",
      myExamples: [],
      tags: [],
      linkedKeys: [],
      linkAnnotations: [],
      mediaLinks: [],
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: at,
    };
    const event = eventFixture();
    const preference = { key: "preference", value: true };
    const snapshot = structuredClone(page);
    const upgradedPage = upgradePageItemV8(page);

    expect(page).toEqual(snapshot);
    expect(upgradedPage).toEqual({ ...page, apuntes: null });
    // Shallow root-only spread: nested content is shared by reference, never rebuilt.
    expect(upgradedPage.feedback).toBe(page.feedback);
    expect(upgradedPage.noteSections).toBe(page.noteSections);
    expect(upgradePageItemV8(lexical)).toEqual(lexical);

    const name = `mi-cuaderno-migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(8).stores(PERSONAL_STORES);
    await legacy.open();
    await legacy.items.bulkAdd([page, lexical]);
    await legacy.events.add(event);
    await legacy.prefs.add(preference);
    legacy.close();

    const upgraded = new Dexie(name);
    declareCurrentSchema(upgraded);
    try {
      await upgraded.open();
      const stored = await upgraded.items.get(page.id);
      expect(stored).toEqual(upgradedPage);
      expect(stored.updatedAt).toBe(page.updatedAt);
      expect(await upgraded.items.get(lexical.id)).toEqual(lexical);
      expect(await upgraded.events.toArray()).toEqual([event]);
      expect(await upgraded.prefs.toArray()).toEqual([preference]);
    } finally {
      upgraded.close();
      await Dexie.delete(name);
    }
  });
});
