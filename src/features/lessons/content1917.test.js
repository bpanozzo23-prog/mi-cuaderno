import { describe, expect, it } from "vitest";
import { lesson1917 } from "./content1917.js";
import { validateLesson } from "./contentValidation.js";

function changed(edit) {
  const lesson = structuredClone(lesson1917);
  edit(lesson);
  return validateLesson(lesson).join("\n");
}

describe("1917 authored chapter", () => {
  it("has a complete ten-page reading path and two reachable, optional investigations", () => {
    expect(validateLesson(lesson1917)).toEqual([]);
    expect(lesson1917.coreOrder).toHaveLength(10);
    expect(lesson1917.steps.filter((step) => step.kind === "branch")).toHaveLength(2);
    expect(lesson1917.endId).toBe("c1917-synthesis");
    const conclusion = lesson1917.steps.find((step) => step.id === lesson1917.endId);
    expect(conclusion.reflection.prompt).toContain("Elige tierra, trabajo o educación");
    expect(conclusion.reflection.frames).toContain("Restituir tierras significa…");
    expect(conclusion.reflection.frames).toContain("Entrar en vigor no demuestra por sí solo que…");
    expect(lesson1917.steps.find((step) => step.id === "c1917-branch-evidence").followUpEnglish).toContain("administrative record");
  });
  it("preserves the two checked excerpts, edition notes and separate translations", () => {
    const excerpts = lesson1917.steps.flatMap((step) => step.blocks).filter((block) => block.type === "excerpt");
    expect(excerpts.map((block) => block.text)).toEqual([
      "porque la siembra es lo que nos da vida",
      "La duración de la jornada máxima será de ocho horas.",
    ]);
    expect(excerpts[0].note).toContain("2008");
    expect(excerpts[1].note).toContain("1917");
    expect(lesson1917.steps.flatMap((step) => step.blocks).filter((block) => block.type === "translation")).toHaveLength(2);
  });
  it.each([
    ["duplicate IDs", (l) => { l.steps[1].blocks[0].id = l.steps[0].blocks[0].id; }, /duplicate id/],
    ["missing core destination", (l) => { l.coreOrder[0] = "missing"; }, /Core destination missing/],
    ["duplicate core destination", (l) => { l.coreOrder[1] = l.coreOrder[0]; }, /duplicate steps/],
    ["unreachable reading", (l) => { l.coreOrder.splice(3, 1); }, /core step is unreachable/],
    ["missing reading passages", (l) => { l.steps[0].blocks = []; }, /core reading passages/],
    ["missing branch passages array", (l) => { delete l.steps.find((step) => step.kind === "branch").blocks; }, /blocks must be an array/],
    ["missing glossary array", (l) => { delete l.steps[0].glossaryIds; }, /glossaryIds must be an array/],
    ["unreachable conclusion", (l) => { l.endId = "missing"; }, /Conclusion/],
    ["missing branch", (l) => { l.steps[4].branchIds = ["missing"]; }, /invalid branch/],
    ["wrong branch return", (l) => { l.steps[10].returnTo = l.steps[0].id; }, /branch destination\/return/],
    ["orphan branch", (l) => { delete l.steps[4].branchIds; }, /reciprocal origin/],
    ["missing citation", (l) => { l.sources.pop(); }, /missing source S5/],
    ["uncited excerpt", (l) => { l.steps[3].blocks[1].sourceId = "S1"; }, /excerpt source/],
    ["uncited paraphrase", (l) => { l.steps[5].blocks[2].sourceId = "S5"; }, /source must be cited/],
    ["missing gloss", (l) => { l.steps[0].glossaryIds.push("missing"); }, /missing glossary/],
    ["invalid answer", (l) => { l.steps[10].activity.answerId = "missing"; }, /invalid answer/],
    ["missing feedback", (l) => { l.steps[10].activity.options[0].feedback = ""; }, /feedback: text is required/],
    ["unsafe source", (l) => { l.sources[0].links[0].url = "javascript:alert(1)"; }, /HTTPS/],
    ["unreviewed HTML block", (l) => { l.steps[0].blocks[0].type = "html"; }, /unsupported block/],
    ["duplicate source link", (l) => { l.sources[0].links.push(l.sources[0].links[0]); }, /duplicate entries/],
    ["duplicate branch launch", (l) => { l.steps[4].branchIds.push(l.steps[4].branchIds[0]); }, /duplicate entries/],
    ["duplicate card line", (l) => { l.steps[0].card.lines.push(l.steps[0].card.lines[0]); }, /duplicate entries/],
    ["duplicate response frame", (l) => { l.steps[9].reflection.frames.push(l.steps[9].reflection.frames[0]); }, /duplicate entries/],
  ])("rejects %s", (_, edit, message) => {
    expect(changed(edit)).toMatch(message);
  });
});
