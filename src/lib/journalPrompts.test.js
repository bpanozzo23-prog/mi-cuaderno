import { describe, expect, it } from "vitest";
import { JOURNAL_PROMPT_CATEGORIES, JOURNAL_PROMPTS } from "./journalPrompts.js";
import { PERFECT_TENSES, SIMPLE_TENSES } from "./conjugation.js";
import { TALLER_SCAFFOLDS, scaffoldForCategory } from "./tallerScaffolds.js";

const SKILL_CATEGORY_IDS = ["narrate", "imagine", "connect"];

describe("journal prompt library", () => {
  it("contains 42 unique, bilingual, evenly grouped prompts", () => {
    expect(JOURNAL_PROMPTS).toHaveLength(42);
    expect(new Set(JOURNAL_PROMPTS.map((prompt) => prompt.id)).size).toBe(42);
    expect(new Set(JOURNAL_PROMPTS.map((prompt) => prompt.es)).size).toBe(42);
    expect(JOURNAL_PROMPTS.every((prompt) => prompt.es && prompt.en)).toBe(true);
    for (const category of JOURNAL_PROMPT_CATEGORIES) {
      expect(JOURNAL_PROMPTS.filter((prompt) => prompt.category === category.id)).toHaveLength(6);
    }
  });

  it("names only real conjugation table keys in tense tags", () => {
    const known = new Set([...SIMPLE_TENSES, ...Object.keys(PERFECT_TENSES)]);
    const tagged = JOURNAL_PROMPTS.filter((prompt) => prompt.tense !== undefined);
    expect(tagged.length).toBeGreaterThan(0);
    for (const prompt of tagged) {
      expect(known.has(prompt.tense), `${prompt.id} tense "${prompt.tense}"`).toBe(true);
    }
  });

  it("shapes every tier variant as bilingual {es, en}", () => {
    const withTiers = JOURNAL_PROMPTS.filter((prompt) => prompt.easier || prompt.harder);
    expect(withTiers.length).toBeGreaterThan(0);
    for (const prompt of withTiers) {
      for (const tier of ["easier", "harder"]) {
        const variant = prompt[tier];
        if (variant === undefined) continue;
        expect(typeof variant.es, `${prompt.id}.${tier}.es`).toBe("string");
        expect(variant.es.trim()).not.toBe("");
        expect(typeof variant.en, `${prompt.id}.${tier}.en`).toBe("string");
        expect(variant.en.trim()).not.toBe("");
      }
    }
  });

  it("keeps drill fields on skill prompts only", () => {
    for (const prompt of JOURNAL_PROMPTS) {
      if (SKILL_CATEGORY_IDS.includes(prompt.category)) continue;
      expect(prompt.tense, prompt.id).toBeUndefined();
      expect(prompt.easier, prompt.id).toBeUndefined();
      expect(prompt.harder, prompt.id).toBeUndefined();
      expect(prompt.offersWords, prompt.id).toBeUndefined();
    }
  });

  it("marks some skill prompts as word-offering", () => {
    expect(JOURNAL_PROMPTS.some((prompt) => prompt.offersWords === true)).toBe(true);
  });
});

describe("taller scaffold banks", () => {
  it("ships a non-empty bank for every skill category and a general fallback", () => {
    for (const id of [...SKILL_CATEGORY_IDS, "general"]) {
      const bank = TALLER_SCAFFOLDS[id];
      expect(Array.isArray(bank), id).toBe(true);
      expect(bank.length, id).toBeGreaterThan(0);
      for (const group of bank) {
        expect(group.label.trim()).not.toBe("");
        expect(group.items.length).toBeGreaterThan(0);
        expect(group.items.every((item) => typeof item === "string" && item.trim() !== "")).toBe(true);
      }
    }
  });

  it("falls back to the general bank for reflective categories", () => {
    expect(scaffoldForCategory("narrate")).toBe(TALLER_SCAFFOLDS.narrate);
    expect(scaffoldForCategory("reflect")).toBe(TALLER_SCAFFOLDS.general);
    expect(scaffoldForCategory("nonsense")).toBe(TALLER_SCAFFOLDS.general);
  });
});
