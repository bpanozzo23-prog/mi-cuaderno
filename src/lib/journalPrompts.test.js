import { describe, expect, it } from "vitest";
import { JOURNAL_PROMPT_CATEGORIES, JOURNAL_PROMPTS } from "./journalPrompts.js";

describe("journal prompt library", () => {
  it("contains 24 unique, bilingual, evenly grouped prompts", () => {
    expect(JOURNAL_PROMPTS).toHaveLength(24);
    expect(new Set(JOURNAL_PROMPTS.map((prompt) => prompt.id)).size).toBe(24);
    expect(new Set(JOURNAL_PROMPTS.map((prompt) => prompt.es)).size).toBe(24);
    expect(JOURNAL_PROMPTS.every((prompt) => prompt.es && prompt.en)).toBe(true);
    for (const category of JOURNAL_PROMPT_CATEGORIES) {
      expect(JOURNAL_PROMPTS.filter((prompt) => prompt.category === category.id)).toHaveLength(6);
    }
  });
});
