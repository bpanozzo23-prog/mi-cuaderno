import { PAGE_FOCUSES } from "./pageKinds.js";

export const PAGE_STARTER_FAMILIES = Object.freeze([
  Object.freeze({ id: "notes", title: "Notes", description: "Flexible prose and connections" }),
  Object.freeze({ id: "vocabulary", title: "Vocabulary", description: "Groups, expandable entries, and Practice" }),
  Object.freeze({ id: "source", title: "Source notebook", description: "Captured notes, source details, and vocabulary" }),
  Object.freeze({ id: "grammar", title: "Grammar guide", description: "Sections, subsections, patterns, and example pairs" }),
  Object.freeze({ id: "copy", title: "Copy page structure", description: "Reuse focus and organization without copying content" }),
]);

export const PAGE_RECIPES = Object.freeze({
  notes: Object.freeze([
    Object.freeze({ id: "blank", title: "Blank", description: "Start with an empty notes page." }),
  ]),
  vocabulary: Object.freeze([
    Object.freeze({ id: "blank", title: "Blank", description: "Start with no groups.", groupNames: [] }),
    Object.freeze({
      id: "conversational-function",
      title: "Conversational function",
      description: "Questions · Answers · Reactions and follow-ups",
      groupNames: ["Questions", "Answers", "Reactions and follow-ups"],
    }),
    Object.freeze({
      id: "situation-context",
      title: "Situation/context",
      description: "Essentials · Questions and requests · Responses · Problems and follow-up",
      groupNames: ["Essentials", "Questions and requests", "Responses", "Problems and follow-up"],
    }),
    Object.freeze({
      id: "register-usage",
      title: "Register/usage",
      description: "Neutral · Formal · Informal · Use with care",
      groupNames: ["Neutral", "Formal", "Informal", "Use with care"],
    }),
  ]),
  source: Object.freeze([
    Object.freeze({ id: "book", title: "Book or written work", description: "Pages, chapters, passages, and reflections", sourceFormat: "book" }),
    Object.freeze({ id: "audio", title: "Podcast or audio", description: "Episodes, timestamps, language notes, and vocabulary", sourceFormat: "audio" }),
    Object.freeze({ id: "video", title: "Film or video", description: "Scenes, timestamps, dialogue, and reactions", sourceFormat: "video" }),
    Object.freeze({ id: "article-lesson", title: "Article or lesson", description: "Sections, observations, examples, and questions", sourceFormat: "article_lesson" }),
  ]),
  grammar: Object.freeze([
    Object.freeze({
      id: "rule-construction",
      title: "Rule or construction",
      description: "Top-level sections you can expand with subsections",
      sectionNames: ["Formation", "When to use it", "Exceptions and contrasts"],
    }),
    Object.freeze({
      id: "compare-forms",
      title: "Compare forms",
      description: "Three top-level sections: two forms and how to choose",
      sectionNames: ["Form A", "Form B", "Choosing between them"],
    }),
    Object.freeze({
      id: "example-bank",
      title: "Example bank",
      description: "One flexible top-level examples section",
      sectionNames: ["Examples"],
    }),
  ]),
});

/** Transient creation seed. Its family/recipe identity is intentionally never persisted. */
export function pageSeedFromRecipe(familyId, recipeId) {
  const recipe = (PAGE_RECIPES[familyId] || []).find((candidate) => candidate.id === recipeId);
  if (!recipe) throw new Error("Page recipe does not exist.");
  if (familyId === "notes") {
    return {
      pageFocus: PAGE_FOCUSES.notes,
      collectionEnabled: false,
      sourceEnabled: false,
      grammarEnabled: false,
      noteSections: [],
      groupNames: [],
      sectionNames: [],
      sourceFormat: "",
    };
  }
  if (familyId === "vocabulary") {
    return {
      pageFocus: PAGE_FOCUSES.vocabulary,
      collectionEnabled: true,
      sourceEnabled: false,
      grammarEnabled: false,
      noteSections: [],
      groupNames: [...(recipe.groupNames || [])],
      sectionNames: [],
      sourceFormat: "",
    };
  }
  if (familyId === "source") {
    return {
      pageFocus: PAGE_FOCUSES.source,
      collectionEnabled: true,
      sourceEnabled: true,
      grammarEnabled: false,
      noteSections: [],
      groupNames: [],
      sectionNames: [],
      sourceFormat: recipe.sourceFormat,
    };
  }
  return {
    pageFocus: PAGE_FOCUSES.grammar,
    collectionEnabled: true,
    sourceEnabled: false,
    grammarEnabled: true,
    noteSections: [],
    groupNames: [],
    sectionNames: [...(recipe.sectionNames || [])],
    sourceFormat: "",
  };
}
