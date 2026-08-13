import { describe, expect, it, vi } from "vitest";
import { makeLexical, makePage } from "../test/factories.js";
import {
  deriveSavedFamilySiblings,
  prepareSavedConjugationFamily,
} from "./wordFamilies.js";

const familyDeps = ({ entry, familyRows, previousIds = {} } = {}) => ({
  resolveReference: vi.fn(async () => ({ entry: entry || null, resolvedFrom: null })),
  loadConjugations: vi.fn(async () => [{ id: "conj:sacar" }]),
  analyzePatterns: vi.fn(() => ({ patternIds: ["spelling:c-qu"] })),
  loadFamilies: vi.fn(async () => familyRows || []),
  loadMeta: vi.fn(async () => ({ previousIds })),
});

describe("saved conjugation families", () => {
  it("prepares one alias-aware family in notebook order through the read-only reference seam", async () => {
    const entry = {
      id: "dict:sacar",
      lemma: "sacar",
      conjugationId: "conj:sacar",
    };
    const center = makeLexical({ id: "user:center", dictKey: "dict:old:sacar" });
    const direct = makeLexical({ id: "user:direct", term: "buscar", dictKey: "dict:buscar" });
    const aliased = makeLexical({ id: "user:alias", term: "tocar", dictKey: "dict:old:tocar" });
    const unrelated = makeLexical({ id: "user:no", term: "hablar", dictKey: "dict:hablar" });
    const phrase = makeLexical({ id: "user:phrase", form: "phrase", term: "buscar trabajo", dictKey: "dict:buscar" });
    const page = makePage({ id: "user:page", dictKey: "dict:buscar" });
    const familyRows = [{
      id: "spelling:c-qu",
      members: [entry, { id: "dict:buscar" }, { id: "dict:tocar" }],
    }];
    const deps = familyDeps({
      entry,
      familyRows,
      previousIds: {
        "dict:old:sacar": entry.id,
        "dict:old:tocar": "dict:tocar",
      },
    });

    const result = await prepareSavedConjugationFamily(
      center,
      [center, direct, aliased, unrelated, phrase, page],
      deps
    );

    expect(result).toEqual({ entry, siblings: [direct, aliased] });
    expect(deps.resolveReference).toHaveBeenCalledWith(center.dictKey);
    expect(deps.loadConjugations).toHaveBeenCalledWith([entry.conjugationId]);
    expect(deps.analyzePatterns).toHaveBeenCalledWith({
      lemma: entry.lemma,
      conjugation: { id: "conj:sacar" },
    });
    expect(deps.loadFamilies).toHaveBeenCalledWith(["spelling:c-qu"]);
  });

  it("keeps a loaded current family even when no sibling is saved", async () => {
    const entry = { id: "dict:sacar", lemma: "sacar", conjugationId: "conj:sacar" };
    const center = makeLexical({ id: "user:center", dictKey: entry.id });
    const deps = familyDeps({
      entry,
      familyRows: [{ id: "spelling:c-qu", members: [entry, { id: "dict:buscar" }] }],
    });

    await expect(prepareSavedConjugationFamily(center, [center], deps)).resolves.toEqual({
      entry,
      siblings: [],
    });
  });

  it("stays silent for ineligible or incomplete reference evidence", async () => {
    const unattached = makeLexical({ dictKey: null });
    const phrase = makeLexical({ form: "phrase", dictKey: "dict:sacar" });
    const page = makePage({ dictKey: "dict:sacar" });
    const unused = familyDeps();
    await expect(prepareSavedConjugationFamily(unattached, [], unused)).resolves.toBeNull();
    await expect(prepareSavedConjugationFamily(phrase, [], unused)).resolves.toBeNull();
    await expect(prepareSavedConjugationFamily(page, [], unused)).resolves.toBeNull();
    expect(unused.resolveReference).not.toHaveBeenCalled();

    const entry = { id: "dict:sacar", lemma: "sacar", conjugationId: "conj:sacar" };
    const center = makeLexical({ dictKey: entry.id });
    const missingCurrent = familyDeps({
      entry,
      familyRows: [{ id: "spelling:c-qu", members: [{ id: "dict:buscar" }] }],
    });
    await expect(prepareSavedConjugationFamily(center, [center], missingCurrent)).resolves.toBeNull();

    const failed = familyDeps({ entry });
    failed.resolveReference.mockRejectedValueOnce(new Error("optional dictionary unavailable"));
    await expect(prepareSavedConjugationFamily(center, [center], failed)).resolves.toBeNull();
  });
});

describe("saved family sibling intersection", () => {
  it("de-duplicates overlapping rows while preserving personal notebook order", () => {
    const center = makeLexical({ id: "user:center", dictKey: "dict:sacar" });
    const first = makeLexical({ id: "user:first", dictKey: "dict:buscar" });
    const second = makeLexical({ id: "user:second", dictKey: "dict:tocar" });
    const rows = [
      { id: "one", members: [{ id: "dict:sacar" }, { id: "dict:tocar" }] },
      { id: "two", members: [{ id: "dict:buscar" }, { id: "dict:tocar" }] },
    ];

    expect(deriveSavedFamilySiblings(center, [center, first, second], rows)).toEqual([
      first,
      second,
    ]);
  });
});
