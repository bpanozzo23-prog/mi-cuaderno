import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CURATED_GYM_LEMMAS, GYM_SLOTS } from "./conjugationGym.js";
import { buildTypedDeck, rebuildMissedTypedDeck } from "./endingsProduction.js";
import { RECOGNITION_CARDS, RECOGNITION_LANES, recognitionTenses } from "./recognitionContent.js";
import {
  TRANSFORM_CARDS,
  TRANSFORM_FAMILIES,
  TRANSFORM_FAMILY_IDS,
  TRANSFORM_GUIDE_TERMS,
  transformCards,
} from "./transformContent.js";

const rngFrom = (values) => {
  let index = 0;
  return () => values[index++ % values.length];
};

function shippedTables() {
  const manifest = JSON.parse(readFileSync(new URL("../../public/dict/manifest.json", import.meta.url), "utf8"));
  const entries = [];
  const tables = new Map();
  for (const chunk of manifest.chunks) {
    const body = JSON.parse(readFileSync(new URL(`../../public/dict/${manifest.path}/${chunk.file}`, import.meta.url), "utf8"));
    entries.push(...(body.stores.entries || []));
    for (const table of body.stores.conjugations || []) tables.set(table.id, table);
  }
  return (lemma) => {
    const entry = entries.find((row) => row.pos === "verb" && row.conjugationId && row.lemma === lemma);
    return entry ? tables.get(entry.conjugationId) : null;
  };
}

describe("Transform reference content", () => {
  it("ships five families of stable, unique, well-formed frames", () => {
    expect(TRANSFORM_FAMILY_IDS).toEqual(["doubt", "emotion", "wish", "impersonal", "purpose"]);
    expect(TRANSFORM_CARDS).toHaveLength(40);
    expect(new Set(TRANSFORM_CARDS.map((card) => card.id)).size).toBe(TRANSFORM_CARDS.length);
    for (const family of TRANSFORM_FAMILY_IDS) {
      expect(transformCards(family).length, family).toBeGreaterThanOrEqual(8);
      expect(TRANSFORM_FAMILIES[family].triggers.length).toBeGreaterThan(0);
    }
    for (const card of TRANSFORM_CARDS) {
      expect(card.id, card.id).toBe(`transform:${card.family}:${card.id.split(":")[2]}`);
      expect(card.skill).toBe("transform");
      expect(card.tense).toBe("Subjunctive/Present");
      expect(GYM_SLOTS).toContain(card.slot);
      expect(card.frame.split("___"), card.id).toHaveLength(2);
      expect(card.answer).toMatch(/^\S+$/);
      expect(card.base).toMatch(/\S/);
      expect(card.gloss).toMatch(/\S/);
      expect(card.rule).toMatch(/\S/);
      // The trigger family is visible in the frame or its rule; the base sentence never is.
      expect(card.base).not.toContain("___");
    }
  });

  it("uses only curated Gym lemmas, so the Gym library already carries every table", () => {
    const curated = new Set(CURATED_GYM_LEMMAS);
    for (const card of TRANSFORM_CARDS) expect(curated.has(card.lemma), card.id).toBe(true);
  });

  it("reproduces every answer and every base form from the packaged conjugation tables", () => {
    const tableFor = shippedTables();
    for (const card of TRANSFORM_CARDS) {
      const table = tableFor(card.lemma);
      expect(table, card.lemma).toBeTruthy();
      expect(table.tenses["Subjunctive/Present"][card.slot], card.id).toBe(card.answer);
      const indicative = table.tenses["Indicative/Present"][card.slot];
      const words = card.base.toLowerCase().replace(/[.,;:!?¿¡]/g, " ").split(/\s+/);
      expect(words, `${card.id} base should contain «${indicative}»`).toContain(indicative.toLowerCase());
      expect(words, `${card.id} base must not already contain the answer`).not.toContain(card.answer.toLowerCase());
    }
  });

  it("registers as a lane without a tense scope and keeps long guide terms", () => {
    expect(RECOGNITION_CARDS.transform).toBe(TRANSFORM_CARDS);
    expect(RECOGNITION_LANES.transform).toEqual({ label: "Transform", eyebrow: "Indicative → subjunctive" });
    expect(recognitionTenses("transform")).toEqual([]);
    for (const term of TRANSFORM_GUIDE_TERMS) {
      expect(term.trim().split(/\s+/).length > 1 || term.length >= 8, term).toBe(true);
    }
    expect(transformCards("all")).toHaveLength(40);
    expect(transformCards(["doubt", "wish"]).every((card) => ["doubt", "wish"].includes(card.family))).toBe(true);
  });
});

describe("Transform decks through the shared typed builder", () => {
  it("balances a ten-frame deck across families without consecutive repeats", () => {
    const deck = buildTypedDeck(transformCards("all"), {
      size: 10,
      rng: rngFrom([0.12, 0.84, 0.31, 0.67, 0.45]),
      keyOf: (card) => card.family,
    });
    expect(deck).toHaveLength(10);
    expect(new Set(deck.map((card) => card.id)).size).toBe(10);
    expect(new Set(deck.map((card) => card.family)).size).toBe(5);
    for (let index = 1; index < deck.length; index += 1) {
      expect(deck[index].family).not.toBe(deck[index - 1].family);
    }
  });

  it("caps honestly at the frames a family has and is deterministic under an injected rng", () => {
    const first = buildTypedDeck(transformCards("doubt"), { size: 20, rng: rngFrom([0.3, 0.7]), keyOf: (card) => card.family });
    const again = buildTypedDeck(transformCards("doubt"), { size: 20, rng: rngFrom([0.3, 0.7]), keyOf: (card) => card.family });
    expect(first).toHaveLength(transformCards("doubt").length);
    expect(again).toEqual(first);
  });

  it("repeats every missed frame once, de-duplicated by id", () => {
    const [a, b] = transformCards("wish");
    const missed = rebuildMissedTypedDeck([a, b, a], { rng: () => 0.4, keyOf: (card) => card.family });
    expect(missed.map((card) => card.id).sort()).toEqual([a.id, b.id].sort());
  });
});
