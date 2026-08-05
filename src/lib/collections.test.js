import { describe, expect, it } from "vitest";
import {
  NOT_GROUPED_LABEL,
  deriveCollection,
  getAvailableCollectionDestinations,
  getCollectionPlacements,
  newPageGroup,
  pruneCollectionItemKeys,
  reorderCollectionMemberLinks,
  validateCollectionGroups,
} from "./collections.js";
import { makeLexical, makePage } from "../test/factories.js";

const GROUP_ONE = "page-group:11111111-1111-4111-8111-111111111111";
const GROUP_TWO = "page-group:22222222-2222-4222-8222-222222222222";

describe("Collection group validation", () => {
  it("builds a trimmed group with a stable namespaced UUID", () => {
    const group = newPageGroup("  Questions  ");
    expect(group).toMatchObject({ name: "Questions", itemKeys: [] });
    expect(group.id).toMatch(/^page-group:[0-9a-f-]{36}$/);
  });

  it("rejects blank and Unicode-normalized case-insensitive duplicate names", () => {
    expect(() => newPageGroup("  ")).toThrow(/blank/i);
    expect(() =>
      validateCollectionGroups([
        { id: GROUP_ONE, name: "Énfasis", itemKeys: [] },
        { id: GROUP_TWO, name: "E\u0301NFASIS", itemKeys: [] },
      ])
    ).toThrow(/unique/i);
  });

  it("allows accents to remain meaningful but rejects duplicate placements and nonpersonal keys", () => {
    expect(() =>
      validateCollectionGroups([
        { id: GROUP_ONE, name: "Énfasis", itemKeys: ["user:one"] },
        { id: GROUP_TWO, name: "Enfasis", itemKeys: ["user:one"] },
      ])
    ).toThrow(/only one group/i);

    expect(() =>
      validateCollectionGroups([{ id: GROUP_ONE, name: "Questions", itemKeys: ["dict:one"] }])
    ).toThrow(/personal lexical/i);

    expect(
      validateCollectionGroups([
        { id: GROUP_ONE, name: "Énfasis", itemKeys: [] },
        { id: GROUP_TWO, name: "Enfasis", itemKeys: [] },
      ])
    ).toHaveLength(2);
  });

  it("rejects malformed group IDs and dangling layout references when membership is supplied", () => {
    expect(() =>
      validateCollectionGroups([{ id: "page-group:questions", name: "Questions", itemKeys: [] }])
    ).toThrow(/invalid ID/i);
    expect(() =>
      validateCollectionGroups(
        [{ id: GROUP_ONE, name: "Questions", itemKeys: ["user:missing"] }],
        { allowedItemKeys: ["user:member"] }
      )
    ).toThrow(/current Collection members/i);
  });
});

describe("deriveCollection", () => {
  it("uses outgoing personal lexical links as members and keeps everything else Related", () => {
    const grouped = makeLexical({ id: "user:grouped", term: "¿Qué tal?", meanings: [] });
    const ungrouped = makeLexical({ id: "user:ungrouped", term: "¿Cómo?" });
    const incoming = makeLexical({ id: "user:incoming", term: "A ver", linkedKeys: ["user:collection"] });
    const relatedPage = makePage({ id: "user:related-page", title: "Source" });
    const incomingPage = makePage({ id: "user:incoming-page", title: "Index", linkedKeys: ["user:collection"] });
    const page = makePage({
      id: "user:collection",
      pageFocus: "vocabulary",
      linkedKeys: [ungrouped.id, relatedPage.id, "dict:wiktionary-es:hola", grouped.id],
      collection: {
        enabled: true,
        groups: [
          { id: GROUP_ONE, name: "Questions", itemKeys: [grouped.id] },
          { id: GROUP_TWO, name: "Empty", itemKeys: [] },
        ],
      },
    });
    const items = [page, incoming, incomingPage, relatedPage, grouped, ungrouped];

    const result = deriveCollection(page, items);

    expect(result.groups.map((group) => [group.name, group.itemKeys])).toEqual([
      ["Questions", [grouped.id]],
      ["Empty", []],
    ]);
    expect(result.ungroupedItemKeys).toEqual([ungrouped.id]);
    expect(result.memberKeys).toEqual([ungrouped.id, grouped.id]);
    expect(result.itemCount).toBe(2);
    expect(result.groupCount).toBe(2);
    expect(result.relatedItems.map((item) => item.id)).toEqual([incoming.id, incomingPage.id, relatedPage.id]);
    expect(result.relatedDictKeys).toEqual(["dict:wiktionary-es:hola"]);
    expect(result.practiceEligible).toBe(true);
  });

  it("ignores layout references that are not outgoing lexical members", () => {
    const lexical = makeLexical({ id: "user:word" });
    const pageTarget = makePage({ id: "user:other-page" });
    const page = makePage({
      id: "user:collection",
      pageFocus: "vocabulary",
      linkedKeys: [pageTarget.id],
      collection: { enabled: true, groups: [{ id: GROUP_ONE, name: "Questions", itemKeys: [lexical.id] }] },
    });
    const result = deriveCollection(page, [page, lexical, pageTarget]);
    expect(result.groups[0].itemKeys).toEqual([]);
    expect(result.memberKeys).toEqual([]);
    expect(result.practiceEligible).toBe(false);
  });
});

describe("Collection placements", () => {
  it("reports active Collection group labels and Not grouped yet, but hides dormant General layout", () => {
    const lexical = makeLexical({ id: "user:word" });
    const grouped = makePage({
      id: "user:grouped-page",
      title: "Conversation",
      pageFocus: "vocabulary",
      linkedKeys: [lexical.id],
      collection: { enabled: true, groups: [{ id: GROUP_ONE, name: "Questions", itemKeys: [lexical.id] }] },
    });
    const ungrouped = makePage({
      id: "user:ungrouped-page",
      title: "Travel",
      pageFocus: "vocabulary",
      linkedKeys: [lexical.id],
      collection: { enabled: true, groups: [] },
    });
    const dormant = makePage({
      id: "user:dormant-page",
      pageFocus: "notes",
      linkedKeys: [lexical.id],
      collection: { enabled: false, groups: [{ id: GROUP_TWO, name: "Old group", itemKeys: [lexical.id] }] },
    });

    const placements = getCollectionPlacements(lexical.id, [grouped, ungrouped, dormant, lexical]);
    expect(placements.map(({ pageId, groupId, groupName }) => ({ pageId, groupId, groupName }))).toEqual([
      { pageId: grouped.id, groupId: GROUP_ONE, groupName: "Questions" },
      { pageId: ungrouped.id, groupId: null, groupName: NOT_GROUPED_LABEL },
    ]);
  });

  it("offers active nonmember Collections in title order with Not grouped first", () => {
    const lexical = makeLexical({
      id: "user:word",
      linkedKeys: ["user:alpha"],
    });
    const alpha = makePage({
      id: "user:alpha",
      title: "Álbum",
      pageFocus: "vocabulary",
      collection: {
        enabled: true,
        groups: [
          { id: GROUP_TWO, name: "Second", itemKeys: [] },
          { id: GROUP_ONE, name: "First", itemKeys: [] },
        ],
      },
    });
    const zeta = makePage({
      id: "user:zeta",
      title: "Zeta",
      pageFocus: "vocabulary",
      collection: { enabled: true, groups: [] },
    });
    const existing = makePage({
      id: "user:existing",
      title: "Already there",
      pageFocus: "vocabulary",
      linkedKeys: [lexical.id],
      collection: { enabled: true, groups: [] },
    });
    const dormant = makePage({
      id: "user:dormant",
      title: "Dormant",
      pageFocus: "notes",
      collection: { enabled: false, groups: [] },
    });

    const destinations = getAvailableCollectionDestinations(
      lexical.id,
      [zeta, existing, dormant, lexical, alpha]
    );

    expect(destinations.map((destination) => destination.pageId)).toEqual([alpha.id, zeta.id]);
    expect(destinations[0].groups).toEqual([
      { id: null, name: NOT_GROUPED_LABEL },
      { id: GROUP_TWO, name: "Second" },
      { id: GROUP_ONE, name: "First" },
    ]);
  });
});

describe("Collection layout utilities", () => {
  it("prunes dormant group references", () => {
    const page = makePage({
      pageFocus: "notes",
      collection: { enabled: false, groups: [{ id: GROUP_ONE, name: "Questions", itemKeys: ["user:one", "user:two"] }] },
    });
    const result = pruneCollectionItemKeys(page, ["user:one"]);
    expect(result.changed).toBe(true);
    expect(result.collection.groups[0].itemKeys).toEqual(["user:two"]);
  });

  it("reorders only member slots and preserves nonmember link order", () => {
    expect(
      reorderCollectionMemberLinks(
        ["dict:first", "user:a", "user:page", "user:b", "dict:last", "user:c"],
        ["user:a", "user:b", "user:c"],
        ["user:c", "user:a"]
      )
    ).toEqual(["dict:first", "user:c", "user:page", "user:a", "dict:last"]);
  });

  it("leaves grouped members fixed while persisting Not-grouped order", () => {
    expect(
      reorderCollectionMemberLinks(
        ["dict:first", "user:grouped", "user:one", "user:page", "user:two"],
        ["user:grouped", "user:one", "user:two"],
        ["user:two", "user:one"],
        { fixedMemberKeys: ["user:grouped"] }
      )
    ).toEqual(["dict:first", "user:grouped", "user:two", "user:page", "user:one"]);
  });
});
