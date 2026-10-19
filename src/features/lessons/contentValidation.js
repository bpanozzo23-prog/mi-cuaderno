// Validate the small, authored A1 format. This is not a remote lesson/package loader.
const BLOCK_TYPES = new Set(["paragraph", "excerpt", "paraphrase", "translation"]);
const list = (value) => Array.isArray(value) ? value : [];
const filled = (value) => typeof value === "string" && value.trim().length > 0;

export function validateLesson(lesson) {
  const errors = [];
  const ids = new Set();
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const text = (value, name) => check(filled(value), `${name}: text is required`);
  const identify = (value, name) => {
    check(filled(value), `${name}: id is required`);
    check(!ids.has(value), `${name}: duplicate id ${value}`);
    ids.add(value);
  };
  if (!lesson || typeof lesson !== "object") return ["Lesson is required"];
  identify(lesson.id, "Lesson");
  text(lesson.revision, "Revision");
  text(lesson.title, "Title");
  text(lesson.question, "Question");
  const steps = list(lesson.steps);
  const coreOrder = list(lesson.coreOrder);
  const byId = new Map(steps.map((step) => [step.id, step]));
  const sources = new Set(list(lesson.sources).map((source) => source.id));
  const glossary = new Set(list(lesson.glossary).map((entry) => entry.id));
  check(coreOrder.length > 0, "Core reading order is required");
  check(new Set(coreOrder).size === coreOrder.length, "Core reading order has duplicate steps");
  check(coreOrder.at(-1) === lesson.endId && byId.get(lesson.endId)?.kind === "core", "Conclusion must be the last reachable core step");
  for (const id of coreOrder) check(byId.get(id)?.kind === "core", `Core destination missing: ${id}`);
  for (const source of list(lesson.sources)) {
    identify(source.id, "Source");
    for (const key of ["title", "credit", "limit"]) text(source[key], `${source.id} ${key}`);
    check(list(source.links).length > 0, `${source.id}: source link is required`);
    for (const link of list(source.links)) {
      text(link.label, `${source.id} link label`);
      let safe = false;
      try { const url = new URL(link.url); safe = url.protocol === "https:" && !url.username && !url.password; } catch { /* reported below */ }
      check(safe, `${source.id}: source link must use HTTPS without credentials`);
    }
  }
  for (const entry of list(lesson.glossary)) {
    identify(entry.id, "Glossary");
    text(entry.term, `${entry.id} term`);
    text(entry.meaning, `${entry.id} meaning`);
  }
  for (const step of steps) {
    identify(step.id, "Step");
    check(["core", "branch"].includes(step.kind), `${step.id}: unknown step kind`);
    text(step.title, `${step.id} title`);
    text(step.english, `${step.id} English help`);
    if (step.kind === "core") check(coreOrder.includes(step.id), `${step.id}: core step is unreachable`);
    check(list(step.sourceIds).length > 0, `${step.id}: citations are required`);
    for (const id of list(step.sourceIds)) check(sources.has(id), `${step.id}: missing source ${id}`);
    for (const id of list(step.glossaryIds)) check(glossary.has(id), `${step.id}: missing glossary ${id}`);
    for (const block of list(step.blocks)) {
      identify(block.id, "Passage");
      check(BLOCK_TYPES.has(block.type), `${block.id}: unsupported block type`);
      text(block.text, `${block.id} passage`);
      if (block.type !== "paragraph") text(block.label, `${block.id} label`);
      if (block.type === "excerpt") {
        check(sources.has(block.sourceId) && list(step.sourceIds).includes(block.sourceId), `${block.id}: excerpt source must be cited on its step`);
        text(block.note, `${block.id} edition note`);
      }
    }
    for (const id of list(step.branchIds)) {
      const branch = byId.get(id);
      check(step.kind === "core" && branch?.kind === "branch" && branch.returnTo === step.id, `${step.id}: invalid branch destination/return ${id}`);
    }
    if (step.kind === "branch") {
      const origin = byId.get(step.returnTo);
      check(origin?.kind === "core" && list(origin.branchIds).includes(step.id), `${step.id}: missing reciprocal origin/return`);
      text(step.launchLabel, `${step.id} launch label`);
    }
    if (step.card) {
      identify(step.card.id, "Card");
      text(step.card.title, `${step.card.id} title`);
      check(list(step.card.lines).length > 0, `${step.card.id}: card lines are required`);
      for (const line of list(step.card.lines)) text(line, `${step.card.id} line`);
    }
    if (step.activity) {
      identify(step.activity.id, "Activity");
      text(step.activity.prompt, `${step.activity.id} prompt`);
      const options = list(step.activity.options);
      check(options.length >= 2, `${step.activity.id}: at least two choices required`);
      check(options.some((option) => option.id === step.activity.answerId), `${step.activity.id}: invalid answer id`);
      for (const option of options) {
        identify(option.id, "Choice");
        text(option.text, `${option.id} choice`);
        text(option.feedback, `${option.id} feedback`);
      }
    }
    if (step.reflection) {
      identify(step.reflection.id, "Reflection");
      for (const key of ["title", "prompt", "selfCheck", "model"]) text(step.reflection[key], `${step.reflection.id} ${key}`);
      check(list(step.reflection.frames).length > 0, "Reflection frames are required");
      for (const frame of list(step.reflection.frames)) text(frame, "Reflection frame");
    }
  }
  return errors;
}
