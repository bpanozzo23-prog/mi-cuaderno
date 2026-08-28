import { describe, expect, it } from "vitest";
import { JOURNAL_PROMPT_CATEGORIES, JOURNAL_PROMPTS } from "./journalPrompts.js";
import { PERFECT_TENSES, SIMPLE_TENSES } from "./conjugation.js";
import { TALLER_SCAFFOLDS, scaffoldForCategory } from "./tallerScaffolds.js";

const SKILL_CATEGORY_IDS = ["narrate", "imagine", "connect"];

// Reflective categories stay at their original six; skill categories grow by
// owner-directed coverage expansions (2026-08-25 and 2026-08-28) and pin their exact counts here.
const CATEGORY_COUNTS = { notice: 6, reflect: 6, spanish: 6, grow: 6, narrate: 8, imagine: 11, connect: 9 };
const TOTAL_PROMPTS = Object.values(CATEGORY_COUNTS).reduce((sum, count) => sum + count, 0);

describe("journal prompt library", () => {
  it("contains 52 unique, bilingual prompts in the pinned per-category counts", () => {
    expect(TOTAL_PROMPTS).toBe(52);
    expect(JOURNAL_PROMPTS).toHaveLength(TOTAL_PROMPTS);
    expect(new Set(JOURNAL_PROMPTS.map((prompt) => prompt.id)).size).toBe(TOTAL_PROMPTS);
    expect(new Set(JOURNAL_PROMPTS.map((prompt) => prompt.es)).size).toBe(TOTAL_PROMPTS);
    expect(JOURNAL_PROMPTS.every((prompt) => prompt.es && prompt.en)).toBe(true);
    for (const category of JOURNAL_PROMPT_CATEGORIES) {
      expect(
        JOURNAL_PROMPTS.filter((prompt) => prompt.category === category.id),
        category.id
      ).toHaveLength(CATEGORY_COUNTS[category.id]);
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

  it("keeps every displayed prompt string trimmed", () => {
    for (const prompt of JOURNAL_PROMPTS) {
      for (const field of ["es", "en", "example"]) {
        if (prompt[field] === undefined) continue;
        expect(prompt[field], `${prompt.id}.${field}`).toBe(prompt[field].trim());
      }
      for (const tier of ["easier", "harder"]) {
        if (!prompt[tier]) continue;
        for (const field of ["es", "en"]) {
          expect(prompt[tier][field], `${prompt.id}.${tier}.${field}`).toBe(prompt[tier][field].trim());
        }
      }
    }
  });

  it("keeps the Mexican-Spanish and time-expression polish explicit", () => {
    const byId = new Map(JOURNAL_PROMPTS.map((prompt) => [prompt.id, prompt]));
    const presentPerfect = byId.get("narrate-perfect");
    expect(presentPerfect.es).toContain("últimamente");
    expect([presentPerfect.es, presentPerfect.easier.es, presentPerfect.harder.es, presentPerfect.example].join(" "))
      .not.toMatch(/hoy he/i);

    expect(byId.get("connect-porpara").example).toContain("por la casa de mi abuela");

    const advice = byId.get("imagine-advice");
    expect(advice.harder.es).toContain("qué le convendría hacer");
    expect(advice.harder.es).not.toContain("qué haría bien");

    const duration = byId.get("connect-duration");
    expect(duration.focus).toBe("Time and duration expressions");
    expect(duration.es).toMatch(/desde hace tiempo.*acabas de hacer/);
    expect(duration.easier.en).toMatch(/I have been.*I just/);
    expect(duration.harder.es).toMatch(/dos costumbres.*después añade algo que acabas de hacer/);
  });

  it("keeps drill fields on skill prompts only", () => {
    for (const prompt of JOURNAL_PROMPTS) {
      if (SKILL_CATEGORY_IDS.includes(prompt.category)) continue;
      expect(prompt.tense, prompt.id).toBeUndefined();
      expect(prompt.easier, prompt.id).toBeUndefined();
      expect(prompt.harder, prompt.id).toBeUndefined();
      expect(prompt.offersWords, prompt.id).toBeUndefined();
      expect(prompt.example, prompt.id).toBeUndefined();
    }
  });

  it("ships both tiers and a Spanish-only example with every skill prompt", () => {
    const skillPrompts = JOURNAL_PROMPTS.filter((prompt) => SKILL_CATEGORY_IDS.includes(prompt.category));
    expect(skillPrompts.length).toBeGreaterThan(0);
    for (const prompt of skillPrompts) {
      expect(prompt.easier, prompt.id).toBeDefined();
      expect(prompt.harder, prompt.id).toBeDefined();
      expect(typeof prompt.example, prompt.id).toBe("string");
      expect(prompt.example.trim(), prompt.id).not.toBe("");
      expect(prompt.example, prompt.id).not.toBe(prompt.es);
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
