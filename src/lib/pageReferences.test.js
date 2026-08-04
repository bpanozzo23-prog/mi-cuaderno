import { describe, expect, it } from "vitest";
import {
  activePageContextsForLexical,
  activePageVocabularyKeys,
  clearSourceCaptureReferences,
  clearSourcePageReferences,
  prunePageVocabularyReferences,
  vocabularyRemovalImpact,
} from "./pageReferences.js";

const lexical = (id) => ({ id, type: "lexical", linkedKeys: [] });
const page = (patch = {}) => ({
  id: "user:page",
  type: "page",
  title: "Voces",
  linkedKeys: ["user:word"],
  collection: {
    enabled: true,
    groups: [{ id: "page-group:one", name: "Softening", itemKeys: ["user:word"] }],
  },
  source: {
    enabled: true,
    captures: [{ id: "source-capture:one", type: "passage", text: "Nomás", location: "18:42", reflection: "", itemKeys: ["user:word"] }],
  },
  grammar: {
    enabled: true,
    sections: [{
      id: "grammar-section:one",
      name: "Pragmatics",
      explanation: "",
      pattern: "",
      examples: [{ id: "grammar-example:one", es: "Nomás dime.", en: "", note: "", itemKeys: ["user:word"], sourceCaptureRef: { pageId: "user:source", captureId: "source-capture:target" } }],
    }],
  },
  ...patch,
});

describe("page contextual references", () => {
  it("counts and prunes every vocabulary placement, including dormant structures", () => {
    const source = page({
      collection: { ...page().collection, enabled: false },
      source: { ...page().source, enabled: false },
      grammar: { ...page().grammar, enabled: false },
    });
    expect(vocabularyRemovalImpact(source, "user:word")).toEqual({ groups: 1, captures: 1, examples: 1, total: 3 });
    const pruned = prunePageVocabularyReferences(source, ["user:word"]);
    expect(pruned.changed).toBe(true);
    expect(pruned.collection.groups[0].itemKeys).toEqual([]);
    expect(pruned.source.captures[0].itemKeys).toEqual([]);
    expect(pruned.grammar.sections[0].examples[0].itemKeys).toEqual([]);
  });

  it("clears exact capture or page references without changing the example", () => {
    const one = clearSourceCaptureReferences(page(), "user:source", ["source-capture:target"]);
    expect(one.changed).toBe(true);
    expect(one.grammar.sections[0].examples[0].sourceCaptureRef).toBeNull();

    const all = clearSourcePageReferences(page(), "user:source");
    expect(all.changed).toBe(true);
    expect(all.grammar.sections[0].examples[0].es).toBe("Nomás dime.");
  });

  it("derives only active contexts and de-duplicates active vocabulary", () => {
    const active = page();
    const hidden = page({
      id: "user:hidden",
      title: "Hidden",
      collection: { ...page().collection, enabled: false },
      source: { ...page().source, enabled: false },
      grammar: { ...page().grammar, enabled: false },
    });
    const items = [active, hidden, lexical("user:word")];
    expect(activePageContextsForLexical("user:word", items).map(({ kind }) => kind)).toEqual([
      "source",
      "vocabulary",
      "grammar",
    ]);
    expect(activePageVocabularyKeys(active, items)).toEqual(["user:word"]);
  });
});
