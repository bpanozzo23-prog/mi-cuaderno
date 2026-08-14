import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mergeLinkedEntryIntoTwin,
  resolveLinkedEntryConflict,
  resolveLinkedKeys,
} from "./linkedEntries.js";
import { installDictionary, fetchManifest, removeDictionary } from "./ref/install.js";
import { buildFixtureDictionary, installFetchStub } from "../test/dictFixture.js";
import { db } from "./db.js";
import { createItem, newLexical, newPage, getItem, linkItems } from "./items.js";
import { allEvents, EVENT_TYPES } from "./events.js";

/**
 * The §5 seam, applied to LINKS rather than attachments.
 *
 * `linkedKeys[]` may point at a dictionary entry (§6), and a rebuild can rename or remove it.
 * DictAttachment has handled this for `dictKey` since Phase 2f; before Phase 4 the linked-key
 * path did not, and quietly dropped both cases. These tests are what keeps it honest.
 */

const realFetch = globalThis.fetch;
const SACAR = "dict:wiktionary-es:sacar:verb";
const CASA = "dict:wiktionary-es:casa:noun";

beforeEach(async () => {
  await removeDictionary();
  await db.items.clear();
  await db.events.clear();
  localStorage.clear();
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

let build = 0;
async function install(overrides = {}) {
  installFetchStub(await buildFixtureDictionary({ datasetVersion: `fixture-v${++build}`, ...overrides }));
  await installDictionary(await fetchManifest());
}

describe("resolving the dictionary entries an item links to", () => {
  it("returns the entries behind the keys", async () => {
    await install();
    const page = await createItem(newPage({ title: "Verbs", linkedKeys: [SACAR, CASA] }));

    const { entries, orphans } = await resolveLinkedKeys(page);

    expect(entries.map((e) => e.lemma).sort()).toEqual(["casa", "sacar"]);
    expect(orphans).toEqual([]);
  });

  it("ignores personal keys, which are not the reference layer's business", async () => {
    await install();
    const page = await createItem(newPage({ title: "Verbs", linkedKeys: ["user:abc", SACAR] }));

    const { entries } = await resolveLinkedKeys(page);

    expect(entries.map((e) => e.id)).toEqual([SACAR]);
  });

  it("follows the alias map when a rebuild renames an entry, and rewrites the link", async () => {
    // The link was made under sacar's OLD canonical id, before a rebuild moved it.
    const oldKey = "dict:wiktionary-es:sacar:verb:1";
    await install({ previousIds: { [oldKey]: SACAR } });
    const page = await createItem(newPage({ title: "Verbs", linkedKeys: [oldKey] }));

    const { entries, orphans } = await resolveLinkedKeys(await getItem(page.id));

    // §6 ships the alias map precisely so a rebuild does not orphan links like this one.
    expect(orphans).toEqual([]);
    expect(entries.map((e) => e.id)).toEqual([SACAR]);

    // And the link is rewritten to the new id, so it survives the NEXT rebuild too instead of
    // depending on an alias chain that grows with every release (the Phase 2f argument).
    const saved = await getItem(page.id);
    expect(saved.linkedKeys).toEqual([SACAR]);
  });

  it("moves an alias annotation atomically without changing item recency", async () => {
    const oldKey = "dict:wiktionary-es:sacar:verb:1";
    await install({ previousIds: { [oldKey]: SACAR } });
    const page = newPage({
      title: "Verbs",
      linkedKeys: [oldKey],
      linkAnnotations: [{
        targetKey: oldKey,
        type: "found_in",
        subject: "target",
        note: "From an interview.",
      }],
    });
    page.updatedAt = "2026-01-02T03:04:05.000Z";
    await createItem(page);

    const result = await resolveLinkedKeys(await getItem(page.id));
    const saved = await getItem(page.id);

    expect(result.rewritten).toBe(true);
    expect(saved.linkedKeys).toEqual([SACAR]);
    expect(saved.linkAnnotations).toEqual([{
      targetKey: SACAR,
      type: "found_in",
      subject: "target",
      note: "From an interview.",
    }]);
    expect(saved.updatedAt).toBe("2026-01-02T03:04:05.000Z");
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toEqual([]);
  });

  it("does not duplicate a key when the alias resolves to one already linked", async () => {
    const oldKey = "dict:wiktionary-es:sacar:verb:1";
    await install({ previousIds: { [oldKey]: SACAR } });
    const page = await createItem(newPage({ title: "Verbs", linkedKeys: [oldKey, SACAR] }));

    await resolveLinkedKeys(await getItem(page.id));

    expect((await getItem(page.id)).linkedKeys).toEqual([SACAR]);
  });

  it("preserves the sole explicit annotation while deduplicating old and canonical keys", async () => {
    const oldKey = "dict:wiktionary-es:sacar:verb:1";
    await install({ previousIds: { [oldKey]: SACAR } });
    const relationship = {
      type: "often_confused",
      subject: "owner",
      note: "Not the same as quitar.",
    };
    const page = await createItem(newPage({
      title: "Verbs",
      linkedKeys: [oldKey, SACAR],
      linkAnnotations: [{ targetKey: oldKey, ...relationship }],
    }));

    const { entries, entryLinks, conflicts } = await resolveLinkedKeys(await getItem(page.id));
    const saved = await getItem(page.id);

    expect(entries.map((entry) => entry.id)).toEqual([SACAR]);
    expect(entryLinks).toHaveLength(1);
    expect(entryLinks[0].rawKeys).toEqual([oldKey, SACAR]);
    expect(conflicts).toEqual([]);
    expect(saved.linkedKeys).toEqual([SACAR]);
    expect(saved.linkAnnotations).toEqual([{ targetKey: SACAR, ...relationship }]);
  });

  it("deduplicates identical explicit alias annotations", async () => {
    const oldKey = "dict:wiktionary-es:sacar:verb:1";
    await install({ previousIds: { [oldKey]: SACAR } });
    const relationship = { type: "variant", subject: "owner", note: "Regional form." };
    const page = await createItem(newPage({
      title: "Verbs",
      linkedKeys: [oldKey, SACAR],
      linkAnnotations: [
        { targetKey: oldKey, ...relationship },
        { targetKey: SACAR, ...relationship },
      ],
    }));

    await resolveLinkedKeys(await getItem(page.id));

    expect((await getItem(page.id)).linkAnnotations).toEqual([{
      targetKey: SACAR,
      ...relationship,
    }]);
  });

  it("repairs an existing alias instead of adding its canonical key as a second connection", async () => {
    const oldKey = "dict:wiktionary-es:sacar:verb:1";
    const otherOldKey = "dict:wiktionary-es:sacar:verb:2";
    await install({ previousIds: { [oldKey]: SACAR, [otherOldKey]: SACAR } });
    const originalRelationship = {
      targetKey: oldKey,
      type: "found_in",
      subject: "owner",
      note: "From an older source.",
    };
    const page = newPage({
      title: "Verbs",
      linkedKeys: [oldKey],
      linkAnnotations: [originalRelationship],
    });
    page.updatedAt = "2026-04-05T06:07:08.000Z";
    await createItem(page);
    const beforeEvents = await db.events.count();

    await linkItems(page.id, SACAR, {
      type: "contrast",
      subject: "owner",
      note: "This new value must not replace the existing connection.",
    });
    // A stale caller may still submit a different historical alias. Conceptual identity must
    // protect this path too, rather than relying on every UI to submit only canonical IDs.
    await linkItems(page.id, otherOldKey, {
      type: "variant",
      subject: "owner",
      note: "This alias must not become another physical copy.",
    });

    expect(await getItem(page.id)).toMatchObject({
      linkedKeys: [SACAR],
      linkAnnotations: [{
        ...originalRelationship,
        targetKey: SACAR,
      }],
      updatedAt: "2026-04-05T06:07:08.000Z",
    });
    expect(await db.events.count()).toBe(beforeEvents);
  });

  it("does not add a canonical key over an unresolved conflict between two old aliases", async () => {
    const oldA = "dict:wiktionary-es:sacar:verb:old-a";
    const oldB = "dict:wiktionary-es:sacar:verb:old-b";
    await install({ previousIds: { [oldA]: SACAR, [oldB]: SACAR } });
    const page = newPage({
      title: "Verbs",
      linkedKeys: [oldA, oldB],
      linkAnnotations: [
        { targetKey: oldA, type: "contrast", subject: "owner", note: "First description." },
        { targetKey: oldB, type: "variant", subject: "owner", note: "Second description." },
      ],
    });
    page.updatedAt = "2026-05-06T07:08:09.000Z";
    await createItem(page);
    const before = await getItem(page.id);
    const beforeEvents = await db.events.count();

    await linkItems(page.id, SACAR, {
      type: "related",
      subject: "owner",
      note: "Do not append this.",
    });

    expect(await getItem(page.id)).toEqual(before);
    expect((await getItem(page.id)).linkedKeys).not.toContain(SACAR);
    expect(await db.events.count()).toBe(beforeEvents);
  });

  it("keeps conflicting alias annotations untouched and returns one visible entry plus resolver data", async () => {
    const oldKey = "dict:wiktionary-es:sacar:verb:1";
    await install({ previousIds: { [oldKey]: SACAR } });
    const originalAnnotations = [
      {
        targetKey: oldKey,
        type: "found_in",
        subject: "owner",
        note: "The interview uses it.",
      },
      {
        targetKey: SACAR,
        type: "explained_by",
        subject: "target",
        note: "My usage note explains it.",
      },
    ];
    const page = newPage({
      title: "Verbs",
      linkedKeys: [oldKey, SACAR],
      linkAnnotations: originalAnnotations,
    });
    page.updatedAt = "2026-02-03T04:05:06.000Z";
    await createItem(page);

    const result = await resolveLinkedKeys(await getItem(page.id));
    const saved = await getItem(page.id);

    expect(result.entries.map((entry) => entry.id)).toEqual([SACAR]);
    expect(result.entryLinks).toHaveLength(1);
    expect(result.rewritten).toBe(false);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toMatchObject({
      canonicalKey: SACAR,
      rawKeys: [oldKey, SACAR],
      candidates: [
        { rawKey: oldKey, explicit: true, relationship: { type: "found_in" } },
        { rawKey: SACAR, explicit: true, relationship: { type: "explained_by" } },
      ],
    });
    expect(saved.linkedKeys).toEqual([oldKey, SACAR]);
    expect(saved.linkAnnotations).toEqual(originalAnnotations);
    expect(saved.updatedAt).toBe("2026-02-03T04:05:06.000Z");

    // The unresolved state is ordinary serializable v4 data: both descriptions still point at
    // their retained physical keys, ready for backup validation to accept as a pending conflict.
    const roundTripped = JSON.parse(JSON.stringify(saved));
    expect(roundTripped).toEqual(saved);
    expect(roundTripped.linkAnnotations.every((annotation) =>
      roundTripped.linkedKeys.includes(annotation.targetKey)
    )).toBe(true);
  });

  it("canonicalizes a conflict with the owner's edited survivor without an event or timestamp", async () => {
    const oldKey = "dict:wiktionary-es:sacar:verb:1";
    await install({ previousIds: { [oldKey]: SACAR } });
    const page = newPage({
      title: "Verbs",
      linkedKeys: [oldKey, SACAR],
      linkAnnotations: [
        { targetKey: oldKey, type: "contrast", subject: "owner", note: "Old note." },
        { targetKey: SACAR, type: "variant", subject: "owner", note: "New note." },
      ],
    });
    page.updatedAt = "2026-03-04T05:06:07.000Z";
    await createItem(page);

    const result = await resolveLinkedEntryConflict(page.id, SACAR, {
      type: "explained_by",
      subject: "target",
      note: "  Final shared note.  ",
    });
    const saved = await getItem(page.id);

    expect(result.resolved).toBe(true);
    expect(saved.linkedKeys).toEqual([SACAR]);
    expect(saved.linkAnnotations).toEqual([{
      targetKey: SACAR,
      type: "explained_by",
      subject: "target",
      note: "Final shared note.",
    }]);
    expect(saved.updatedAt).toBe("2026-03-04T05:06:07.000Z");
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toEqual([]);
  });

  it("reports a key nothing can resolve as an orphan instead of dropping it", async () => {
    await install();
    const page = await createItem(newPage({ title: "Verbs", linkedKeys: [SACAR, CASA] }));

    // The rebuild removes sacar, and the alias map has nothing to offer.
    await install({ dropEntries: [SACAR] });

    const { entries, orphans } = await resolveLinkedKeys(await getItem(page.id));

    expect(entries.map((e) => e.id)).toEqual([CASA]);
    expect(orphans).toEqual([SACAR]);
    // The link is still on the item: the owner decides whether to forget it, not the app.
    expect((await getItem(page.id)).linkedKeys).toContain(SACAR);
  });

  it("retains and reports an installed orphan's relationship metadata", async () => {
    await install();
    const relationship = {
      targetKey: SACAR,
      type: "explained_by",
      subject: "owner",
      note: "Keep this explanation.",
    };
    const page = await createItem(newPage({
      title: "Verbs",
      linkedKeys: [SACAR],
      linkAnnotations: [relationship],
    }));
    await install({ dropEntries: [SACAR] });

    const { orphanDetails } = await resolveLinkedKeys(await getItem(page.id));

    expect(orphanDetails).toEqual([{
      key: SACAR,
      rawKey: SACAR,
      explicit: true,
      annotation: relationship,
      relationship: { type: "explained_by", subject: "owner", note: "Keep this explanation." },
    }]);
    expect((await getItem(page.id)).linkAnnotations).toEqual([relationship]);
  });

  it("says nothing at all when no dictionary is installed — that is not orphaned", async () => {
    const page = await createItem(newPage({ title: "Verbs", linkedKeys: [SACAR] }));

    const { entries, orphans } = await resolveLinkedKeys(page);

    // Phase 2f: a warning about a dataset the owner never downloaded is noise they cannot act on.
    expect(entries).toEqual([]);
    expect(orphans).toEqual([]);
  });

  it("does not treat a dictKey attachment as an ordinary link or rewrite it", async () => {
    const oldKey = "dict:wiktionary-es:sacar:verb:1";
    await install({ previousIds: { [oldKey]: SACAR } });
    const lexical = await createItem(newLexical({ term: "sacar", dictKey: oldKey }));

    const result = await resolveLinkedKeys(await getItem(lexical.id));

    expect(result.entries).toEqual([]);
    expect((await getItem(lexical.id)).dictKey).toBe(oldKey);
  });

  it("never logs an edit event: the dataset changed, the owner did not", async () => {
    await install();
    const page = await createItem(newPage({ title: "Verbs", linkedKeys: [SACAR] }));
    await install({ dropEntries: [SACAR] });

    await resolveLinkedKeys(await getItem(page.id));

    const edits = (await allEvents()).filter((e) => e.type === EVENT_TYPES.edit);
    expect(edits).toEqual([]);
  });
});

describe("merging a dictionary connection into its attached personal twin", () => {
  const editEvents = async () =>
    (await allEvents()).filter((event) => event.type === EVENT_TYPES.edit);

  it("re-points the key at the twin, carries the annotation, and moves neither recency nor events", async () => {
    await install();
    const twin = await createItem(newLexical({ term: "sacar", dictKey: SACAR }));
    const relationship = { type: "found_in", subject: "target", note: "From an interview." };
    const page = newPage({
      title: "Verbs",
      linkedKeys: [SACAR],
      linkAnnotations: [{ targetKey: SACAR, ...relationship }],
    });
    page.updatedAt = "2026-01-02T03:04:05.000Z";
    await createItem(page);

    const result = await mergeLinkedEntryIntoTwin(page.id, SACAR, twin.id);
    const saved = await getItem(page.id);

    expect(result.merged).toBe(true);
    expect(saved.linkedKeys).toEqual([twin.id]);
    expect(saved.linkAnnotations).toEqual([{ targetKey: twin.id, ...relationship }]);
    expect(saved.updatedAt).toBe("2026-01-02T03:04:05.000Z");
    expect((await getItem(twin.id)).dictKey).toBe(SACAR);
    expect(await editEvents()).toEqual([]);

    // The merged row is ordinary v8 data: one key, one matching sparse annotation.
    const roundTripped = JSON.parse(JSON.stringify(saved));
    expect(roundTripped).toEqual(saved);
  });

  it("merges old alias raw keys on both sides of the seam", async () => {
    // The link was made under one historical id and the attachment under another; the alias map
    // says both now name SACAR. The merge must not depend on either side being canonical.
    const linkedOldKey = "dict:wiktionary-es:sacar:verb:1";
    const attachedOldKey = "dict:wiktionary-es:sacar:verb:2";
    await install({ previousIds: { [linkedOldKey]: SACAR, [attachedOldKey]: SACAR } });
    const twin = await createItem(newLexical({ term: "sacar", dictKey: attachedOldKey }));
    const page = await createItem(newPage({ title: "Verbs", linkedKeys: [linkedOldKey] }));

    const result = await mergeLinkedEntryIntoTwin(page.id, SACAR, twin.id);

    expect(result.merged).toBe(true);
    expect((await getItem(page.id)).linkedKeys).toEqual([twin.id]);
  });

  it("drops the dictionary key without duplicating an existing outgoing personal link", async () => {
    await install();
    const twin = await createItem(newLexical({ term: "sacar", dictKey: SACAR }));
    const relationship = { type: "contrast", subject: "owner", note: "Not quitar." };
    const page = await createItem(newPage({
      title: "Verbs",
      linkedKeys: [CASA, SACAR, twin.id],
      linkAnnotations: [{ targetKey: SACAR, ...relationship }],
    }));

    const result = await mergeLinkedEntryIntoTwin(page.id, SACAR, twin.id);
    const saved = await getItem(page.id);

    expect(result.merged).toBe(true);
    expect(saved.linkedKeys).toEqual([CASA, twin.id]);
    // The dictionary side's explicit annotation survives over the implicit personal edge.
    expect(saved.linkAnnotations).toEqual([{ targetKey: twin.id, ...relationship }]);
  });

  it("returns conflicting explicit descriptions untouched instead of picking one", async () => {
    await install();
    const twin = await createItem(newLexical({ term: "sacar", dictKey: SACAR }));
    const page = newPage({
      title: "Verbs",
      linkedKeys: [SACAR, twin.id],
      linkAnnotations: [
        { targetKey: SACAR, type: "found_in", subject: "owner", note: "The interview." },
        { targetKey: twin.id, type: "contrast", subject: "owner", note: "My note." },
      ],
    });
    page.updatedAt = "2026-02-03T04:05:06.000Z";
    await createItem(page);
    const before = await getItem(page.id);

    const result = await mergeLinkedEntryIntoTwin(page.id, SACAR, twin.id);

    expect(result.merged).toBe(false);
    expect(result.reason).toBe("conflict");
    expect(result.candidates.filter((candidate) => candidate.explicit)).toHaveLength(2);
    expect(await getItem(page.id)).toEqual(before);
    expect(await editEvents()).toEqual([]);
  });

  it("canonicalizes the same conflict with the owner's edited survivor", async () => {
    await install();
    const twin = await createItem(newLexical({ term: "sacar", dictKey: SACAR }));
    const page = newPage({
      title: "Verbs",
      linkedKeys: [SACAR, twin.id],
      linkAnnotations: [
        { targetKey: SACAR, type: "found_in", subject: "owner", note: "The interview." },
        { targetKey: twin.id, type: "contrast", subject: "owner", note: "My note." },
      ],
    });
    page.updatedAt = "2026-03-04T05:06:07.000Z";
    await createItem(page);

    const result = await mergeLinkedEntryIntoTwin(page.id, SACAR, twin.id, {
      type: "explained_by",
      subject: "target",
      note: "  Final shared note.  ",
    });
    const saved = await getItem(page.id);

    expect(result.merged).toBe(true);
    expect(saved.linkedKeys).toEqual([twin.id]);
    expect(saved.linkAnnotations).toEqual([{
      targetKey: twin.id,
      type: "explained_by",
      subject: "target",
      note: "Final shared note.",
    }]);
    expect(saved.updatedAt).toBe("2026-03-04T05:06:07.000Z");
    expect(await editEvents()).toEqual([]);
  });

  it("writes the survivor reoriented on the twin's row when the twin owns the edge", async () => {
    await install();
    const page = newPage({ title: "Verbs", linkedKeys: [SACAR], linkAnnotations: [{
      targetKey: SACAR, type: "explained_by", subject: "owner", note: "It explains me.",
    }] });
    page.updatedAt = "2026-04-05T06:07:08.000Z";
    await createItem(page);
    const twin = newLexical({ term: "sacar", dictKey: SACAR, linkedKeys: [page.id] });
    twin.updatedAt = "2026-04-05T06:07:09.000Z";
    await createItem(twin);

    const result = await mergeLinkedEntryIntoTwin(page.id, SACAR, twin.id);
    const savedPage = await getItem(page.id);
    const savedTwin = await getItem(twin.id);

    expect(result.merged).toBe(true);
    // No reciprocal physical key appears on either row: the twin keeps the only edge.
    expect(savedPage.linkedKeys).toEqual([]);
    expect(savedPage.linkAnnotations).toEqual([]);
    expect(savedTwin.linkedKeys).toEqual([page.id]);
    expect(savedTwin.linkAnnotations).toEqual([{
      targetKey: page.id,
      type: "explained_by",
      subject: "target",
      note: "It explains me.",
    }]);
    expect(savedPage.updatedAt).toBe("2026-04-05T06:07:08.000Z");
    expect(savedTwin.updatedAt).toBe("2026-04-05T06:07:09.000Z");
    expect(await editEvents()).toEqual([]);
  });

  it("stays sparse when every description is implicit", async () => {
    await install();
    const twin = await createItem(newLexical({ term: "sacar", dictKey: SACAR }));
    const page = await createItem(newPage({ title: "Verbs", linkedKeys: [SACAR] }));

    await mergeLinkedEntryIntoTwin(page.id, SACAR, twin.id);

    expect((await getItem(page.id)).linkAnnotations).toEqual([]);
  });

  it("guards its endpoints: installation, attachment, and self-merge", async () => {
    const detachedPage = await createItem(newPage({ title: "Verbs", linkedKeys: [SACAR] }));
    const missingDictionary = await mergeLinkedEntryIntoTwin(
      detachedPage.id, SACAR, "user:0f0e0d0c-0b0a-4908-8706-050403020100"
    );
    expect(missingDictionary).toMatchObject({ merged: false, reason: "not_installed" });

    await install();
    const unattached = await createItem(newLexical({ term: "sacar" }));
    await expect(mergeLinkedEntryIntoTwin(detachedPage.id, SACAR, unattached.id))
      .rejects.toThrow(/not attached/);

    const selfTwin = await createItem(newLexical({ term: "sacar", dictKey: SACAR, linkedKeys: [SACAR] }));
    await expect(mergeLinkedEntryIntoTwin(selfTwin.id, SACAR, selfTwin.id))
      .rejects.toThrow(/its own item/);
  });
});
