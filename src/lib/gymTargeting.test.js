import { describe, expect, it } from "vitest";
import { gymCellCount } from "./conjugationGym.js";
import {
  deriveSavedGymTargeting,
  isSavedGymSubsetValid,
  savedGymVerbsForSubset,
} from "./gymTargeting.js";

const lexical = (id, term, tags = []) => ({ id, type: "lexical", term, tags, linkedKeys: [] });
const saved = (itemKey, lemma) => ({
  itemKey,
  lemma,
  term: lemma,
  verbKey: `lemma:${lemma}`,
  source: "saved",
  conjugation: { tenses: { "Indicative/Present": { yo: `${lemma}-form` } } },
});
const page = (id, title, linkedKeys, options = {}) => ({
  id,
  type: "page",
  title,
  pageFocus: options.pageFocus || "notes",
  linkedKeys,
  collection: {
    enabled: options.enabled !== false,
    groups: options.groups || [],
  },
});

describe("Saved Gym targeting derivation", () => {
  it("keeps exact tag case, hides nonconjugable tags, and filters exact members", () => {
    const items = [
      lexical("user:a", "sacar", ["Travel", "travel"]),
      lexical("user:b", "preferir", ["travel", "Study"]),
      lexical("user:ghost", "inventado", ["Ghost"]),
    ];
    const verbs = [saved("user:a", "sacar"), saved("user:b", "preferir")];
    const targeting = deriveSavedGymTargeting(items, verbs);

    expect(targeting.tags).toEqual([
      { tag: "Study", itemKeys: ["user:b"], count: 1 },
      { tag: "travel", itemKeys: ["user:a", "user:b"], count: 2 },
      { tag: "Travel", itemKeys: ["user:a"], count: 1 },
    ]);
    expect(targeting.tags.some((row) => row.tag === "Ghost")).toBe(false);
    expect(savedGymVerbsForSubset(verbs, targeting, { kind: "tag", value: "Travel" }).map((verb) => verb.itemKey))
      .toEqual(["user:a"]);
    expect(savedGymVerbsForSubset(verbs, targeting, { kind: "tag", value: "travel" }).map((verb) => verb.itemKey))
      .toEqual(["user:a", "user:b"]);
  });

  it("uses authoritative linkedKeys, ignores phantom groups, and accepts any active Vocabulary capability", () => {
    const a = lexical("user:a", "sacar");
    const b = lexical("user:b", "preferir");
    const ghost = lexical("user:ghost", "inventado");
    const active = page("user:page", "Travel verbs", [a.id, ghost.id, a.id], {
      pageFocus: "grammar",
      groups: [{ id: "page-group:phantom", name: "Visual only", itemKeys: [b.id] }],
    });
    const zero = page("user:zero", "No conjugable verbs", [ghost.id]);
    const dormant = page("user:dormant", "Dormant", [b.id], { enabled: false });
    const items = [a, b, ghost, active, zero, dormant];
    const verbs = [saved(a.id, "sacar"), saved(b.id, "preferir")];
    const targeting = deriveSavedGymTargeting(items, verbs);

    expect(targeting.pages).toEqual([{
      id: "user:page",
      title: "Travel verbs",
      itemKeys: ["user:a"],
      count: 1,
    }]);
    expect(savedGymVerbsForSubset(verbs, targeting, { kind: "page", value: "user:page" }).map((verb) => verb.lemma))
      .toEqual(["sacar"]);
  });

  it("detects invalidated selections and leaves lemma-cell de-duplication intact", () => {
    const items = [lexical("user:a", "sacar", ["Travel"]), lexical("user:b", "sacar", ["Travel"])];
    const verbs = [saved("user:a", "sacar"), saved("user:b", "sacar")];
    const targeting = deriveSavedGymTargeting(items, verbs);

    expect(isSavedGymSubsetValid({ kind: "tag", value: "Travel" }, targeting)).toBe(true);
    expect(isSavedGymSubsetValid({ kind: "tag", value: "Missing" }, targeting)).toBe(false);
    expect(isSavedGymSubsetValid({ kind: "page", value: "user:missing" }, targeting)).toBe(false);
    expect(gymCellCount(savedGymVerbsForSubset(verbs, targeting, { kind: "tag", value: "Travel" }), {
      tenses: ["Indicative/Present"],
      slots: ["yo"],
    })).toBe(1);
  });
});
