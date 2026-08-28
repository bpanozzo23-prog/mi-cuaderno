import { describe, expect, it } from "vitest";
import {
  RELATIONSHIP_OPTIONS,
  RELATIONSHIP_SUBJECTS,
  RELATIONSHIP_TYPES,
  connectionsFor,
  groupConnections,
  groupConnectionsByMeaning,
  isDirectionalRelationshipType,
  makeLinkAnnotation,
  normalizeRelationship,
  relationshipFromOption,
  relationshipLabel,
  relationshipOptionValue,
  reorientRelationship,
} from "./relationships.js";

const item = (id, overrides = {}) => ({
  id,
  type: "lexical",
  term: id,
  linkedKeys: [],
  linkAnnotations: [],
  updatedAt: "2026-08-04T10:00:00.000Z",
  ...overrides,
});

describe("relationship registry and normalization", () => {
  it("keeps the seven approved types in display order with Related last", () => {
    expect(RELATIONSHIP_TYPES).toEqual([
      "similar_meaning",
      "contrast",
      "often_confused",
      "variant",
      "explained_by",
      "found_in",
      "related",
    ]);
    expect(RELATIONSHIP_SUBJECTS).toEqual(["owner", "target"]);
    expect(RELATIONSHIP_OPTIONS.map((option) => option.label)).toEqual([
      "Similar meaning",
      "Contrast",
      "Often confused",
      "Variant",
      "Explained by",
      "Explains",
      "Found in",
      "Contains",
      "Related",
    ]);
  });

  it("normalizes symmetric subjects, trims notes and keeps Related/blank implicit", () => {
    expect(normalizeRelationship()).toEqual({ type: "related", subject: "owner", note: "" });
    expect(normalizeRelationship({ type: "contrast", subject: "target", note: "  not interchangeable  " }))
      .toEqual({ type: "contrast", subject: "owner", note: "not interchangeable" });
    expect(makeLinkAnnotation("user:b", { type: "related", note: "  " })).toBeNull();
    expect(makeLinkAnnotation("user:b", { type: "related", note: " context " })).toEqual({
      targetKey: "user:b",
      type: "related",
      subject: "owner",
      note: "context",
    });
  });

  it("rejects invalid types, subjects and non-text notes", () => {
    expect(() => normalizeRelationship({ type: "example_of" })).toThrow(/Unknown relationship/);
    expect(() => normalizeRelationship({ type: "found_in", subject: "left" })).toThrow(/subject/);
    expect(() => normalizeRelationship({ type: "related", note: { prose: true } })).toThrow(/plain text/);
  });

  it("maps directional labels and selector values from either endpoint", () => {
    const foundIn = relationshipFromOption("found_in:owner", "  episode 3 ");
    expect(foundIn).toEqual({ type: "found_in", subject: "owner", note: "episode 3" });
    expect(relationshipOptionValue(foundIn)).toBe("found_in:owner");
    expect(relationshipLabel(foundIn, "owner")).toBe("Found in");
    expect(relationshipLabel(foundIn, "target")).toBe("Contains");
    expect(reorientRelationship(foundIn)).toEqual({
      type: "found_in",
      subject: "target",
      note: "episode 3",
    });
    expect(isDirectionalRelationshipType("found_in")).toBe(true);
    expect(isDirectionalRelationshipType("variant")).toBe(false);
  });
});

describe("meaning-specific Similar connections", () => {
  it("maps physical anchors into each endpoint's perspective and groups in focal order", () => {
    const first = item("user:first", {
      meanings: [{ id: "meaning:first-a", gloss: "first A" }, { id: "meaning:first-b", gloss: "first B" }],
      linkedKeys: ["user:second"],
      linkAnnotations: [{
        targetKey: "user:second", type: "similar_meaning", subject: "owner", note: "",
        ownerMeaningId: "meaning:first-b", targetMeaningId: "meaning:second-a",
      }],
    });
    const second = item("user:second", { meanings: [{ id: "meaning:second-a", gloss: "second A" }] });
    const forward = connectionsFor(first, [first, second])[0];
    const backward = connectionsFor(second, [first, second])[0];
    expect([forward.focalMeaningId, forward.connectedMeaningId]).toEqual(["meaning:first-b", "meaning:second-a"]);
    expect([backward.focalMeaningId, backward.connectedMeaningId]).toEqual(["meaning:second-a", "meaning:first-b"]);
    expect(groupConnectionsByMeaning(first, [forward]).meaningGroups.map((group) => group.meaning.id))
      .toEqual(["meaning:first-b"]);
  });

  it("requires both anchors and limits them to Similar meaning", () => {
    expect(() => makeLinkAnnotation("user:b", { type: "similar_meaning" }, { ownerMeaningId: "meaning:a" }))
      .toThrow(/two valid meaning IDs/);
    expect(() => makeLinkAnnotation("user:b", { type: "contrast" }, {
      ownerMeaningId: "meaning:a", targetMeaningId: "meaning:b",
    })).toThrow(/Only Similar meaning/);
  });
});

describe("connectionsFor", () => {
  it("derives one annotated personal connection from both endpoints", () => {
    const ser = item("user:ser", {
      linkedKeys: ["user:estar"],
      linkAnnotations: [{
        targetKey: "user:estar",
        type: "often_confused",
        subject: "owner",
        note: "Both can translate as to be.",
      }],
    });
    const estar = item("user:estar");
    const all = [ser, estar];

    expect(connectionsFor(ser, all)).toMatchObject([{
      key: estar.id,
      ownerKey: ser.id,
      targetKey: estar.id,
      label: "Often confused",
      relationship: {
        type: "often_confused",
        subject: "owner",
        note: "Both can translate as to be.",
      },
    }]);
    expect(connectionsFor(estar, all)).toMatchObject([{
      key: ser.id,
      ownerKey: ser.id,
      targetKey: estar.id,
      label: "Often confused",
      relationship: {
        type: "often_confused",
        subject: "owner",
        note: "Both can translate as to be.",
      },
    }]);
  });

  it("converts a directional annotation into the focal endpoint's perspective", () => {
    const por = item("user:por", {
      linkedKeys: ["user:grammar"],
      linkAnnotations: [{
        targetKey: "user:grammar",
        type: "explained_by",
        subject: "owner",
        note: "See the decision guide.",
      }],
    });
    const grammar = item("user:grammar", { type: "page", title: "Por and para" });

    expect(connectionsFor(por, [por, grammar])[0]).toMatchObject({
      label: "Explained by",
      type: "explained_by",
      subject: "owner",
    });
    expect(connectionsFor(grammar, [por, grammar])[0]).toMatchObject({
      label: "Explains",
      type: "explained_by",
      subject: "target",
    });
  });

  it("tolerates reciprocal legacy storage and prefers the sole explicit annotation", () => {
    const first = item("user:first", { linkedKeys: ["user:second"] });
    const second = item("user:second", {
      linkedKeys: ["user:first"],
      linkAnnotations: [{
        targetKey: "user:first",
        type: "variant",
        subject: "owner",
        note: "Regional spelling.",
      }],
    });

    const rows = connectionsFor(first, [first, second]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      ownerKey: second.id,
      targetKey: first.id,
      type: "variant",
      note: "Regional spelling.",
    });
  });

  it("derives dictionary links only from supplied resolved entries and supports dictionary perspective", () => {
    const key = "dict:wiktionary-es:chamba:noun:1";
    const source = item("user:source", {
      linkedKeys: [key],
      linkAnnotations: [{ targetKey: key, type: "found_in", subject: "target", note: "A film." }],
    });
    const entry = { id: key, lemma: "chamba", pos: "noun", senses: [] };

    expect(connectionsFor(source, [source])).toEqual([]);
    expect(connectionsFor(source, [source], [entry])[0]).toMatchObject({
      kind: "entry",
      key,
      label: "Contains",
    });
    expect(connectionsFor(key, [source])[0]).toMatchObject({
      kind: "item",
      key: source.id,
      label: "Found in",
    });
  });
});

describe("groupConnections", () => {
  it("keeps content kinds mixed while ordering specific groups before Related", () => {
    const rows = [
      { kind: "item", key: "related", relationship: normalizeRelationship() },
      { kind: "entry", key: "contrast", relationship: normalizeRelationship({ type: "contrast" }) },
      { kind: "item", key: "contains", relationship: normalizeRelationship({ type: "found_in", subject: "target" }) },
      { kind: "item", key: "found", relationship: normalizeRelationship({ type: "found_in", subject: "owner" }) },
    ];

    const groups = groupConnections(rows);
    expect(groups.map((group) => group.label)).toEqual(["Contrast", "Found in", "Contains", "Related"]);
    expect(groups.at(-1).rows).toEqual([rows[0]]);
    expect(groups[0].rows[0].kind).toBe("entry");
  });
});
