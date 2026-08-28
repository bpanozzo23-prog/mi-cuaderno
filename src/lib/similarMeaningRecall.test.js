import { describe, expect, it } from "vitest";
import {
  deriveSimilarMeaningPrompts,
  selectSimilarMeaningRecallDeck,
  similarMeaningRecallLimits,
} from "./similarMeaningRecall.js";

const lexical = (term) => ({
  id: `user:${term}`,
  type: "lexical",
  form: "word",
  term,
  meanings: [{ id: `meaning:${term}`, gloss: `meaning of ${term}` }],
  linkedKeys: [],
  linkAnnotations: [],
});

const page = (title) => ({
  id: `user:page:${title}`,
  type: "page",
  title,
  linkedKeys: [],
  linkAnnotations: [],
});

function connect(owner, target, type = "similar_meaning") {
  owner.linkedKeys.push(target.id);
  owner.linkAnnotations.push({ targetKey: target.id, type, subject: "owner", note: "" });
}

describe("confirmed similar-meaning prompt graph", () => {
  it("uses direct confirmed neighbors without inferring transitive answers", () => {
    const angry = lexical("enojado");
    const annoyed = lexical("molesto");
    const irritated = lexical("irritado");
    connect(angry, annoyed);
    connect(annoyed, irritated);

    const prompts = deriveSimilarMeaningPrompts([angry, annoyed, irritated]);

    expect(prompts.map((prompt) => prompt.focal.term)).toEqual([
      "enojado", "molesto", "irritado",
    ]);
    expect(prompts.find((prompt) => prompt.focal === angry).neighbors.map((item) => item.term))
      .toEqual(["molesto"]);
    expect(prompts.find((prompt) => prompt.focal === annoyed).neighbors.map((item) => item.term))
      .toEqual(["enojado", "irritado"]);
    expect(prompts.find((prompt) => prompt.focal === irritated).neighbors.map((item) => item.term))
      .toEqual(["molesto"]);
  });

  it("ignores gloss overlap, other relationship types, pages, and missing targets", () => {
    const first = lexical("feliz");
    const rawOverlap = lexical("contento");
    rawOverlap.meanings[0].gloss = first.meanings[0].gloss;
    const contrast = lexical("triste");
    const notes = page("Emotions");
    connect(first, contrast, "contrast");
    connect(first, notes);
    first.linkedKeys.push("user:missing");

    expect(deriveSimilarMeaningPrompts([first, rawOverlap, contrast, notes])).toEqual([]);
  });

  it("treats a stored-once backlink as symmetric and de-duplicates a reciprocal legacy pair", () => {
    const first = lexical("rápido");
    const second = lexical("veloz");
    connect(first, second);
    second.linkedKeys.push(first.id);

    const prompts = deriveSimilarMeaningPrompts([first, second]);

    expect(prompts).toHaveLength(2);
    expect(prompts[0].neighbors).toEqual([second]);
    expect(prompts[1].neighbors).toEqual([first]);
  });

  it("creates oriented sense prompts with only the exact connected gloss", () => {
    const bank = lexical("banco");
    bank.meanings = [{ id: "meaning:seat", gloss: "bench" }, { id: "meaning:finance", gloss: "bank" }];
    const institution = lexical("entidad");
    institution.meanings = [{ id: "meaning:institution", gloss: "institution" }];
    bank.linkedKeys.push(institution.id);
    bank.linkAnnotations.push({
      targetKey: institution.id, type: "similar_meaning", subject: "owner", note: "",
      ownerMeaningId: "meaning:finance", targetMeaningId: "meaning:institution",
    });
    const prompts = deriveSimilarMeaningPrompts([bank, institution]);
    expect(prompts).toHaveLength(2);
    expect(prompts[0]).toMatchObject({
      focalMeaning: { id: "meaning:finance", gloss: "bank" },
      answers: [{ meaning: { id: "meaning:institution", gloss: "institution" } }],
    });
    expect(prompts[1]).toMatchObject({
      focalMeaning: { id: "meaning:institution" },
      answers: [{ meaning: { id: "meaning:finance", gloss: "bank" } }],
    });
  });
});

describe("similar-meaning recall deck selection", () => {
  it("offers only distinct 10, 20, and All choices that fit the prompt count", () => {
    expect(similarMeaningRecallLimits(0)).toEqual([]);
    expect(similarMeaningRecallLimits(8)).toEqual(["all"]);
    expect(similarMeaningRecallLimits(15)).toEqual([10, "all"]);
    expect(similarMeaningRecallLimits(25)).toEqual([10, 20, "all"]);
  });

  it("shuffles a copy before limiting and never mutates the prompt snapshot", () => {
    const prompts = ["one", "two", "three"].map((id) => ({ id }));
    const before = [...prompts];

    expect(selectSimilarMeaningRecallDeck(prompts, { limit: 2, random: () => 0 }).map(({ id }) => id))
      .toEqual(["two", "three"]);
    expect(prompts).toEqual(before);
    expect(selectSimilarMeaningRecallDeck(prompts, { limit: "all", random: () => 0 })).toHaveLength(3);
  });
});
