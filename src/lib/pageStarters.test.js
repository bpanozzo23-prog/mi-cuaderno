import { describe, expect, it } from "vitest";
import { PAGE_RECIPES, PAGE_STARTER_FAMILIES, pageSeedFromRecipe } from "./pageStarters.js";

describe("page starters", () => {
  it("offers family-first creation without a stored template identity", () => {
    expect(PAGE_STARTER_FAMILIES.map(({ id }) => id)).toEqual([
      "notes",
      "vocabulary",
      "source",
      "grammar",
      "copy",
    ]);
    expect(PAGE_STARTER_FAMILIES.find(({ id }) => id === "grammar").description).toMatch(/subsections/i);
    expect(pageSeedFromRecipe("source", "audio")).toEqual({
      pageFocus: "source",
      collectionEnabled: true,
      sourceEnabled: true,
      grammarEnabled: false,
      groupNames: [],
      sectionNames: [],
      sourceFormat: "audio",
    });
    expect(pageSeedFromRecipe("source", "audio")).not.toHaveProperty("recipeId");
  });

  it("seeds approved editable Grammar section names", () => {
    expect(pageSeedFromRecipe("grammar", "rule-construction").sectionNames).toEqual([
      "Formation",
      "When to use it",
      "Exceptions and contrasts",
    ]);
    expect(pageSeedFromRecipe("grammar", "compare-forms").sectionNames).toEqual([
      "Form A",
      "Form B",
      "Choosing between them",
    ]);
    expect(PAGE_RECIPES.grammar.find(({ id }) => id === "compare-forms").description).toMatch(/top-level/i);
    expect(PAGE_RECIPES.grammar).toHaveLength(3);
  });
});
