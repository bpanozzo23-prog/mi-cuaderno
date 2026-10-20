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
    ["missing citation", (l) => { l.sources = l.sources.filter((source) => source.id !== "S5"); }, /missing source S5/],
    ["unknown locator", (l) => { l.steps[0].card.variant = "remote-map"; }, /unsupported locator/],
    ["missing locator description", (l) => { delete l.steps[0].card.description; }, /locator description/],
    ["missing locator caption", (l) => { delete l.steps[0].card.note; }, /locator caption/],
    ["missing locator place", (l) => { l.steps[0].card.lines.pop(); }, /three place names/],
    ["swapped locator names", (l) => { l.steps[0].card.lines.reverse(); }, /verified landmarks/],
    ["uncited locator", (l) => { l.steps[0].sourceIds.pop(); }, /locator source must be cited/],
    ["locator on later page", (l) => { l.steps[1].card = l.steps[0].card; delete l.steps[0].card; }, /opening only/],
    ["uncited excerpt", (l) => { l.steps[3].blocks[1].sourceId = "S1"; }, /excerpt source/],
    ["uncited paraphrase", (l) => { l.steps[5].blocks[2].sourceId = "S5"; }, /source must be cited/],
    ["missing gloss", (l) => { l.steps[0].glossaryIds.push("missing"); }, /missing glossary/],
    ["invalid answer", (l) => { l.steps[10].activity.answerId = "missing"; }, /invalid answer/],
    ["missing feedback", (l) => { l.steps[10].activity.options[0].feedback = ""; }, /feedback: text is required/],
    ["unsafe source", (l) => { l.sources[0].links[0].url = "javascript:alert(1)"; }, /HTTPS/],
    ["unreviewed HTML block", (l) => { l.steps[0].blocks[0].type = "html"; }, /unsupported block/],
    ["support on another page", (l) => { l.steps[1].readingSupport = l.steps[0].readingSupport; }, /opening only/],
    ["support without orientation", (l) => { l.steps[0].readingSupport.orientation = ""; }, /reading support orientation/],
    ["orphan passage support", (l) => { delete l.steps[0].readingSupport; }, /support must belong/],
    ["missing passage support", (l) => { delete l.steps[0].blocks[0].support; }, /supported paragraphs/],
    ["missing section label", (l) => { l.steps[0].blocks[0].support.label = ""; }, /section label/],
    ["missing passage translation", (l) => { delete l.steps[0].blocks[0].support.translation; }, /passage translation/],
    ["focus on another page's glossary", (l) => { l.steps[0].blocks[1].support.focus[0].glossaryId = "constituyente"; }, /page glossary entry/],
    ["focus using the unmatched infinitive", (l) => { l.steps[0].blocks[1].support.focus[1].text = "hacer cumplir"; }, /occur exactly once/],
    ["ambiguous focus", (l) => { l.steps[0].blocks[1].text += " hacerlo cumplir"; }, /occur exactly once/],
    ["overlapping focus", (l) => { l.steps[0].blocks[1].support.focus[1].text = "un derecho"; }, /must not overlap/],
    ["missing focus", (l) => { delete l.steps[0].blocks[1].support.focus; }, /one or two/],
    ["too many focus expressions", (l) => { l.steps[0].blocks[1].support.focus.push(l.steps[0].blocks[1].support.focus[0]); }, /one or two/],
    ["malformed focus collection", (l) => { l.steps[0].blocks[1].support.focus = {}; }, /must be an array/],
    ["duplicate source link", (l) => { l.sources[0].links.push(l.sources[0].links[0]); }, /duplicate entries/],
    ["duplicate branch launch", (l) => { l.steps[4].branchIds.push(l.steps[4].branchIds[0]); }, /duplicate entries/],
    ["duplicate card line", (l) => { l.steps[0].card.lines.push(l.steps[0].card.lines[0]); }, /duplicate entries/],
    ["duplicate response frame", (l) => { l.steps[9].reflection.frames.push(l.steps[9].reflection.frames[0]); }, /duplicate entries/],
  ])("rejects %s", (_, edit, message) => {
    expect(changed(edit)).toMatch(message);
  });
});
