import { describe, expect, it } from "vitest";
import {
  TALLER_SKILL_CATEGORY_IDS,
  bodyWithIncludedPrompt,
  cleanTemas,
  drawDrillPrompt,
  drawTema,
  endingsForTense,
  practiceDetailsByPage,
  practiceSkillByPage,
  practiceTargetLabel,
  promptHasTiers,
  promptTextForTier,
  proposeTallerSkill,
  sampleOfferedWords,
} from "./taller.js";
import { JOURNAL_PROMPTS } from "./journalPrompts.js";

let eventCounter = 0;
const event = (type, itemKey, at, metadata = null) => ({
  id: `evt:${(eventCounter += 1)}`,
  type,
  itemKey,
  at,
  localDate: at.slice(0, 10),
  metadata,
});

const practice = (skill, itemKey, at) => event("practice_write", itemKey, at, { skill, kept: Boolean(itemKey) });

const lexical = (id, term, createdAt) => ({ id, type: "lexical", form: "word", term, createdAt });

describe("proposeTallerSkill", () => {
  it("rotates through the three skill categories by local day before any practice exists", () => {
    expect(proposeTallerSkill([], "2026-01-01")).toBe("narrate");
    expect(proposeTallerSkill([], "2026-01-02")).toBe("imagine");
    expect(proposeTallerSkill([], "2026-01-03")).toBe("connect");
    expect(proposeTallerSkill([], "2026-01-04")).toBe("narrate");
  });

  it("proposes the least-recently-practiced skill once events exist", () => {
    const events = [
      practice("narrate", "user:a", "2026-08-19T10:00:00.000Z"),
      practice("imagine", null, "2026-08-15T10:00:00.000Z"),
    ];
    // connect has never been practiced, so it sorts before both practiced skills.
    expect(proposeTallerSkill(events, "2026-08-20")).toBe("connect");

    events.push(practice("connect", null, "2026-08-20T09:00:00.000Z"));
    expect(proposeTallerSkill(events, "2026-08-20")).toBe("imagine");
  });

  it("ignores reflective-category and malformed practice events", () => {
    const events = [
      practice("reflect", "user:a", "2026-08-19T10:00:00.000Z"),
      event("practice_write", null, "2026-08-19T11:00:00.000Z", null),
    ];
    expect(TALLER_SKILL_CATEGORY_IDS).toContain(proposeTallerSkill(events, "2026-08-20"));
    expect(proposeTallerSkill(events, "2026-01-01")).toBe("narrate");
  });
});

describe("drawDrillPrompt", () => {
  const weakPreterite = () => {
    const events = [];
    for (let i = 0; i < 3; i += 1) {
      events.push(event("drill_fail", null, `2026-08-1${i}T10:00:00.000Z`, {
        mode: "typed",
        stage: "initial",
        tense: "Indicative/Preterite",
        slot: "yo",
        verbKey: "lemma:hablar",
      }));
    }
    return events;
  };

  it("prefers prompts targeting a weak tense without locking out the pool", () => {
    const events = weakPreterite();
    // First random() call decides preference (0 < 2/3 → preferred pool), second picks the index.
    const preferredDraw = drawDrillPrompt("narrate", { events, items: [], random: () => 0 });
    expect(preferredDraw.category).toBe("narrate");
    expect(preferredDraw.tense).toBe("Indicative/Preterite");

    const values = [0.9, 0];
    const fullPoolDraw = drawDrillPrompt("narrate", { events, items: [], random: () => values.shift() ?? 0 });
    expect(fullPoolDraw.category).toBe("narrate");
    expect(fullPoolDraw.id).toBe(JOURNAL_PROMPTS.filter((p) => p.category === "narrate")[0].id);
  });

  it("draws uniformly when nothing is weak and returns null for an unknown category", () => {
    const drawn = drawDrillPrompt("connect", { events: [], items: [], random: () => 0 });
    expect(drawn.category).toBe("connect");
    expect(drawDrillPrompt("nonsense", { events: [], items: [] })).toBeNull();
  });
});

describe("sampleOfferedWords", () => {
  const today = "2026-08-20";

  it("mixes one draw from each cohort — due, recently added, long-untouched", () => {
    const items = [
      lexical("user:due", "casa", "2026-06-01T10:00:00.000Z"),
      lexical("user:new", "hogar", "2026-08-18T10:00:00.000Z"),
      lexical("user:old", "techo", "2026-01-01T10:00:00.000Z"),
    ];
    const events = [
      // Tricky enrolment makes user:due due today; recent events keep it out of long-untouched.
      event("tricky_on", "user:due", "2026-08-19T10:00:00.000Z"),
      event("create", "user:new", "2026-08-18T10:00:00.000Z"),
      event("create", "user:old", "2026-01-01T10:00:00.000Z"),
    ];
    const picked = sampleOfferedWords(items, events, { today, random: () => 0 });
    const ids = picked.map((item) => item.id).sort();
    expect(ids).toEqual(["user:due", "user:new", "user:old"]);
  });

  it("offers nothing rather than a lone chip when fewer than two candidates exist", () => {
    const items = [lexical("user:new", "hogar", "2026-08-18T10:00:00.000Z")];
    const events = [event("create", "user:new", "2026-08-18T10:00:00.000Z")];
    expect(sampleOfferedWords(items, events, { today, random: () => 0 })).toEqual([]);
    expect(sampleOfferedWords([], [], { today })).toEqual([]);
  });

  it("never repeats an item across cohorts", () => {
    // Both due (tricky) and long-untouched cannot double-offer; a second candidate fills in.
    const items = [
      lexical("user:both", "casa", "2026-01-01T10:00:00.000Z"),
      lexical("user:old", "techo", "2026-01-02T10:00:00.000Z"),
    ];
    const events = [event("tricky_on", "user:both", "2026-01-05T10:00:00.000Z")];
    const picked = sampleOfferedWords(items, events, { today, random: () => 0 });
    const ids = picked.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("user:both");
    expect(ids).toContain("user:old");
  });
});

describe("prompt tiers", () => {
  const tiered = JOURNAL_PROMPTS.find((prompt) => prompt.easier && prompt.harder);
  const untiered = JOURNAL_PROMPTS.find((prompt) => !prompt.easier && !prompt.harder);

  it("resolves tier text with a standard fallback", () => {
    expect(promptTextForTier(tiered, "easier")).toEqual(tiered.easier);
    expect(promptTextForTier(tiered, "harder")).toEqual(tiered.harder);
    expect(promptTextForTier(tiered, "standard")).toEqual({ es: tiered.es, en: tiered.en });
    expect(promptTextForTier(untiered, "easier")).toEqual({ es: untiered.es, en: untiered.en });
    expect(promptHasTiers(tiered)).toBe(true);
    expect(promptHasTiers(untiered)).toBe(false);
  });
});

describe("bodyWithIncludedPrompt", () => {
  it("prepends the prompt as one quote block above the writing", () => {
    expect(bodyWithIncludedPrompt("¿Qué pasó?", "Hoy fui al mercado."))
      .toBe("> ¿Qué pasó?\n\nHoy fui al mercado.");
  });
});

describe("temas", () => {
  it("cleans the preference to trimmed, unique, non-empty strings", () => {
    expect(cleanTemas(["  escalada ", "cocina", "escalada", "", "   ", 7, null, "mi perro"]))
      .toEqual(["escalada", "cocina", "mi perro"]);
    expect(cleanTemas("not-an-array")).toEqual([]);
    expect(cleanTemas(undefined)).toEqual([]);
  });

  it("draws a tema, and the shuffle always moves somewhere new when it can", () => {
    expect(drawTema([], {})).toBeNull();
    expect(drawTema(["cocina"], { random: () => 0 })).toBe("cocina");
    // Excluding the current tema with one alternative is deterministic.
    expect(drawTema(["cocina", "escalada"], { random: () => 0, exclude: "cocina" })).toBe("escalada");
    // With nothing else to move to, the current tema stays rather than vanishing.
    expect(drawTema(["cocina"], { exclude: "cocina" })).toBe("cocina");
  });
});

describe("endingsForTense", () => {
  it("returns the shipped regular-endings rows for a targeted tense and nothing otherwise", () => {
    const preterite = endingsForTense("Indicative/Preterite");
    expect(preterite.length).toBeGreaterThan(0);
    expect(preterite.every((row) => row.answer === "Indicative/Preterite")).toBe(true);
    expect(endingsForTense(null)).toEqual([]);
    expect(endingsForTense("Imperative Affirmative/Present")).toEqual([]);
  });
});

describe("practiceSkillByPage", () => {
  it("maps kept practice events to skill labels and ignores discarded ones", () => {
    const events = [
      practice("narrate", "user:p1", "2026-08-19T10:00:00.000Z"),
      practice("imagine", null, "2026-08-19T11:00:00.000Z"),
      practice("mystery", "user:p2", "2026-08-19T12:00:00.000Z"),
      event("edit", "user:p1", "2026-08-19T13:00:00.000Z"),
    ];
    const byPage = practiceSkillByPage(events);
    expect(byPage.get("user:p1")).toBe("Narrate");
    expect(byPage.has("user:p2")).toBe(false);
    expect(byPage.size).toBe(1);
  });

  it("derives category and target labels from a kept drill's prompt id", () => {
    const events = [
      event("practice_write", "user:imagine", "2026-08-19T10:00:00.000Z", {
        skill: "imagine", promptId: "imagine-hope", kept: true,
      }),
      event("practice_write", "user:connect", "2026-08-19T11:00:00.000Z", {
        skill: "connect", promptId: "connect-porpara", kept: true,
      }),
    ];

    expect(practiceDetailsByPage(events)).toEqual(new Map([
      ["user:imagine", {
        categoryId: "imagine",
        categoryLabel: "Imagine",
        targetLabel: "Present subjunctive",
      }],
      ["user:connect", {
        categoryId: "connect",
        categoryLabel: "Connect",
        targetLabel: "Por vs. para",
      }],
    ]));
  });

  it("names all current tense and non-tense practice targets concisely", () => {
    expect(practiceTargetLabel(JOURNAL_PROMPTS.find((prompt) => prompt.id === "narrate-scene")))
      .toBe("Indicative preterite");
    expect(practiceTargetLabel(JOURNAL_PROMPTS.find((prompt) => prompt.id === "imagine-hope")))
      .toBe("Present subjunctive");
    expect(practiceTargetLabel(JOURNAL_PROMPTS.find((prompt) => prompt.id === "connect-porpara")))
      .toBe("Por vs. para");
  });
});
