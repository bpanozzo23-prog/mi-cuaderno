import { describe, it, expect } from "vitest";
import { attachedTwinsFor, derivePersonalTwinMerges } from "./personalTwins.js";

const ENTRY_KEY = "dict:wiktionary-es:casa-noun-1";
const OLD_ENTRY_KEY = "dict:wiktionary-es:casa-old-7";

const entry = { id: ENTRY_KEY, lemma: "casa", pos: "noun" };

const lexical = (id, overrides = {}) => ({
  id: `user:${id}`,
  type: "lexical",
  term: "casa",
  dictKey: null,
  linkedKeys: [],
  linkAnnotations: [],
  ...overrides,
});

const page = (id, overrides = {}) => ({
  id: `user:${id}`,
  type: "page",
  title: "Diario",
  linkedKeys: [],
  linkAnnotations: [],
  ...overrides,
});

const entryLink = (overrides = {}) => ({
  canonicalKey: ENTRY_KEY,
  entry,
  rawKeys: [ENTRY_KEY],
  relationship: { type: "related", subject: "owner", note: "" },
  conflict: null,
  ...overrides,
});

describe("attachedTwinsFor", () => {
  it("finds twins by exact dictKey and through the previousIds alias map", () => {
    const exact = lexical("exact", { dictKey: ENTRY_KEY });
    const aliased = lexical("aliased", { dictKey: OLD_ENTRY_KEY });
    const unrelated = lexical("other", { dictKey: "dict:wiktionary-es:perro-noun-1" });
    const detached = lexical("detached");

    expect(attachedTwinsFor(ENTRY_KEY, [exact, aliased, unrelated, detached], {
      [OLD_ENTRY_KEY]: ENTRY_KEY,
    })).toEqual([exact, aliased]);
    expect(attachedTwinsFor(ENTRY_KEY, [aliased], {})).toEqual([]);
  });

  it("ignores pages even when they carry a stray dictKey field", () => {
    const strayPage = page("stray", { dictKey: ENTRY_KEY });
    expect(attachedTwinsFor(ENTRY_KEY, [strayPage], {})).toEqual([]);
  });
});

describe("derivePersonalTwinMerges", () => {
  it("offers each attached twin in notebook order for a plain dictionary connection", () => {
    const source = page("source", { linkedKeys: [ENTRY_KEY] });
    const first = lexical("first", { dictKey: ENTRY_KEY });
    const second = lexical("second", { dictKey: ENTRY_KEY, term: "casa (segunda)" });

    const merges = derivePersonalTwinMerges(source, [entryLink()], [first, second, source], {});
    expect([...merges.keys()]).toEqual([ENTRY_KEY]);
    const { twins } = merges.get(ENTRY_KEY);
    expect(twins.map((row) => row.twin.id)).toEqual([first.id, second.id]);
    expect(twins[0]).toMatchObject({
      alreadyLinked: null,
      personalRelationship: null,
      conflict: null,
    });
  });

  it("reports an outgoing personal edge from the item's own row", () => {
    const twin = lexical("twin", { dictKey: ENTRY_KEY });
    const source = page("source", {
      linkedKeys: [ENTRY_KEY, twin.id],
      linkAnnotations: [{ targetKey: twin.id, type: "contrast", subject: "owner", note: "" }],
    });

    const [row] = derivePersonalTwinMerges(source, [entryLink()], [twin, source], {})
      .get(ENTRY_KEY).twins;
    expect(row.alreadyLinked).toBe("outgoing");
    expect(row.personalRelationship).toMatchObject({ type: "contrast" });
  });

  it("reports an incoming personal edge reoriented into the item's perspective", () => {
    const source = page("source", { linkedKeys: [ENTRY_KEY] });
    const twin = lexical("twin", {
      dictKey: ENTRY_KEY,
      linkedKeys: [source.id],
      linkAnnotations: [{ targetKey: source.id, type: "found_in", subject: "owner", note: "" }],
    });

    const [row] = derivePersonalTwinMerges(source, [entryLink()], [twin, source], {})
      .get(ENTRY_KEY).twins;
    expect(row.alreadyLinked).toBe("incoming");
    // The twin is "found in" the source; seen from the source the subject flips.
    expect(row.personalRelationship).toMatchObject({ type: "found_in", subject: "target" });
  });

  it("flags a conflict only when both sides are explicit and different", () => {
    const twin = lexical("twin", { dictKey: ENTRY_KEY });
    const explicitDict = entryLink({
      relationship: { type: "explained_by", subject: "owner", note: "" },
    });
    const linkedWith = (annotation) => page("source", {
      linkedKeys: [ENTRY_KEY, twin.id],
      linkAnnotations: annotation ? [{ targetKey: twin.id, ...annotation }] : [],
    });

    const conflicting = derivePersonalTwinMerges(
      linkedWith({ type: "contrast", subject: "owner", note: "" }),
      [explicitDict], [twin], {}
    ).get(ENTRY_KEY).twins[0];
    expect(conflicting.conflict.candidates.map((candidate) => candidate.source))
      .toEqual(["dictionary", "personal"]);

    const implicitPersonal = derivePersonalTwinMerges(linkedWith(null), [explicitDict], [twin], {})
      .get(ENTRY_KEY).twins[0];
    expect(implicitPersonal.conflict).toBeNull();

    const equalExplicit = derivePersonalTwinMerges(
      linkedWith({ type: "explained_by", subject: "owner", note: "" }),
      [explicitDict], [twin], {}
    ).get(ENTRY_KEY).twins[0];
    expect(equalExplicit.conflict).toBeNull();
  });

  it("skips the self-twin, conflicted entry rows, and entries with no twin", () => {
    // An attached item ordinarily linked to its own entry must not offer merging into itself.
    const selfTwin = lexical("self", { dictKey: ENTRY_KEY, linkedKeys: [ENTRY_KEY] });
    expect(derivePersonalTwinMerges(selfTwin, [entryLink()], [selfTwin], {}).size).toBe(0);

    const source = page("source", { linkedKeys: [ENTRY_KEY] });
    const twin = lexical("twin", { dictKey: ENTRY_KEY });
    const conflicted = entryLink({ conflict: { canonicalKey: ENTRY_KEY, candidates: [] } });
    expect(derivePersonalTwinMerges(source, [conflicted], [twin], {}).size).toBe(0);

    expect(derivePersonalTwinMerges(source, [entryLink()], [source], {}).size).toBe(0);
  });
});
