import { describe, expect, it } from "vitest";
import { makeLexical, makePage } from "../test/factories.js";
import { emptyReviewState } from "./review.js";
import {
  groupByInitial,
  initialOf,
  LEXICAL_CONTEXTS,
  LEXICAL_LEARNING,
  LEXICAL_POS_ANY,
  LEXICAL_USAGE_ANY,
  LEXICAL_VERB_BEHAVIOR_ANY,
  meaningFilterMatch,
  matchingMeaningsForFilters,
  matchesContextFilter,
  matchesLearningFilter,
  matchesMeaningFilters,
  matchesPageFilter,
  matchesPosFilter,
  OTHER_INITIAL,
  pageContextIndex,
  pageContextCountsIn,
  PINNED_LEXICAL_IDS_PREF,
  posCountsIn,
  posValuesOf,
  usageCountsIn,
  verbBehaviorCountsIn,
} from "./lexicalViews.js";
import { newMeaning } from "./meanings.js";
import { newGrammarExample, newGrammarSection, newSourceCapture } from "./pageKinds.js";

const word = (term) => makeLexical({ term });

/** One page carrying the same word in all three structures, so each filter can be told apart. */
function pageHolding(itemKey, { collection = true, source = true, grammar = true } = {}) {
  return makePage({
    title: "Nomás",
    linkedKeys: [itemKey],
    collection: {
      enabled: collection,
      groups: [{ id: "page-group:one", name: "Softening", itemKeys: [itemKey] }],
    },
    source: {
      enabled: source,
      captures: [newSourceCapture({ type: "passage", text: "Nomás dime.", location: "18:42", itemKeys: [itemKey] })],
    },
    grammar: {
      enabled: grammar,
      sections: [newGrammarSection({
        name: "Pragmatics",
        examples: [newGrammarExample({ es: "Nomás dime.", itemKeys: [itemKey] })],
      })],
    },
  });
}

const stateWith = (patch) => ({ ...emptyReviewState, ...patch });

describe("lexical hub derivations", () => {
  it("names the pin preference separately from the page one", () => {
    expect(PINNED_LEXICAL_IDS_PREF).toBe("pinnedLexicalIds");
  });

  describe("where a word lives", () => {
    it("matches each active structure and anywhere", () => {
      const item = word("nomás");
      const items = [item, pageHolding(item.id)];
      const contexts = pageContextIndex(items).get(item.id);

      expect(matchesContextFilter(contexts, LEXICAL_CONTEXTS.anywhere)).toBe(true);
      expect(matchesContextFilter(contexts, LEXICAL_CONTEXTS.vocabulary)).toBe(true);
      expect(matchesContextFilter(contexts, LEXICAL_CONTEXTS.source)).toBe(true);
      expect(matchesContextFilter(contexts, LEXICAL_CONTEXTS.grammar)).toBe(true);
      expect(matchesContextFilter(contexts, LEXICAL_CONTEXTS.none)).toBe(false);
    });

    it("distinguishes one structure from the others", () => {
      const item = word("nomás");
      const items = [item, pageHolding(item.id, { collection: true, source: false, grammar: false })];
      const contexts = pageContextIndex(items).get(item.id);

      expect(matchesContextFilter(contexts, LEXICAL_CONTEXTS.vocabulary)).toBe(true);
      expect(matchesContextFilter(contexts, LEXICAL_CONTEXTS.source)).toBe(false);
      expect(matchesContextFilter(contexts, LEXICAL_CONTEXTS.grammar)).toBe(false);
    });

    it("reads a word held only by DISABLED structures as living nowhere", () => {
      const item = word("nomás");
      const items = [item, pageHolding(item.id, { collection: false, source: false, grammar: false })];
      const contexts = pageContextIndex(items).get(item.id);

      expect(contexts).toEqual([]);
      expect(matchesContextFilter(contexts, LEXICAL_CONTEXTS.none)).toBe(true);
      expect(matchesContextFilter(contexts, LEXICAL_CONTEXTS.vocabulary)).toBe(false);
    });

    it("reads a word no page mentions as living nowhere", () => {
      const item = word("nomás");
      const contexts = pageContextIndex([item, makePage()]).get(item.id);

      expect(contexts).toEqual([]);
      expect(matchesContextFilter(contexts, LEXICAL_CONTEXTS.none)).toBe(true);
    });

    it("indexes only lexical items", () => {
      const item = word("nomás");
      const page = makePage();
      const index = pageContextIndex([item, page]);

      expect(index.has(item.id)).toBe(true);
      expect(index.has(page.id)).toBe(false);
    });

    it("counts each word once per exact Page and filters by its stable id", () => {
      const first = word("nomás");
      const second = word("órale");
      const firstPage = pageHolding(first.id);
      const secondPage = makePage({
        title: "Ándale",
        source: {
          enabled: true,
          captures: [newSourceCapture({ itemKeys: [first.id, second.id] })],
        },
      });
      const items = [first, second, firstPage, secondPage];
      const index = pageContextIndex(items);

      expect(pageContextCountsIn([first, second], index)).toEqual([
        { pageId: secondPage.id, pageTitle: "Ándale", count: 2 },
        { pageId: firstPage.id, pageTitle: "Nomás", count: 1 },
      ]);
      expect(matchesPageFilter(index.get(first.id), firstPage.id)).toBe(true);
      expect(matchesPageFilter(index.get(second.id), firstPage.id)).toBe(false);
      expect(matchesPageFilter(index.get(second.id), "")).toBe(true);
    });
  });

  describe("the learning lens", () => {
    it("keeps everything under any, including a word with no history", () => {
      expect(matchesLearningFilter(stateWith({}), LEXICAL_LEARNING.any)).toBe(true);
      expect(matchesLearningFilter(undefined, LEXICAL_LEARNING.any)).toBe(true);
    });

    it("matches highlighted, due and graduated on their own flags", () => {
      expect(matchesLearningFilter(stateWith({ tricky: true }), LEXICAL_LEARNING.tricky)).toBe(true);
      expect(matchesLearningFilter(stateWith({ tricky: false }), LEXICAL_LEARNING.tricky)).toBe(false);
      expect(matchesLearningFilter(stateWith({ due: true }), LEXICAL_LEARNING.due)).toBe(true);
      expect(matchesLearningFilter(stateWith({ due: false }), LEXICAL_LEARNING.due)).toBe(false);
      expect(matchesLearningFilter(stateWith({ graduated: true }), LEXICAL_LEARNING.graduated)).toBe(true);
      expect(matchesLearningFilter(stateWith({ graduated: false }), LEXICAL_LEARNING.graduated)).toBe(false);
    });

    it("excludes a retired word from in review, and an unenrolled one too", () => {
      expect(matchesLearningFilter(stateWith({ enrolled: true }), LEXICAL_LEARNING.reviewing)).toBe(true);
      expect(
        matchesLearningFilter(stateWith({ enrolled: true, graduated: true }), LEXICAL_LEARNING.reviewing)
      ).toBe(false);
      expect(matchesLearningFilter(stateWith({ enrolled: false }), LEXICAL_LEARNING.reviewing)).toBe(false);
    });

    it("matches nothing but any when a word has no derived state at all", () => {
      expect(matchesLearningFilter(undefined, LEXICAL_LEARNING.tricky)).toBe(false);
      expect(matchesLearningFilter(undefined, LEXICAL_LEARNING.reviewing)).toBe(false);
    });
  });

  describe("the part-of-speech lens", () => {
    /** *como* as the notebook keeps it: one item, its roles carried by the meanings. */
    const como = () => makeLexical({
      term: "como",
      pos: "",
      meanings: [
        newMeaning({ gloss: "like, as", posOverride: "preposition" }),
        newMeaning({ gloss: "as, since", posOverride: "conjunction" }),
      ],
    });

    it("keeps everything under any", () => {
      expect(matchesPosFilter(makeLexical({ pos: "verb" }), LEXICAL_POS_ANY)).toBe(true);
      expect(matchesPosFilter(makeLexical({ pos: "" }), LEXICAL_POS_ANY)).toBe(true);
      expect(matchesPosFilter(makeLexical({ pos: "" }))).toBe(true);
    });

    it("matches a word on its own part of speech", () => {
      const item = makeLexical({ term: "sobre", pos: "preposition" });

      expect(matchesPosFilter(item, "preposition")).toBe(true);
      expect(matchesPosFilter(item, "noun")).toBe(false);
    });

    it("finds a multi-role word by ANY of its meanings, so it need not be split into three", () => {
      const item = como();

      expect(matchesPosFilter(item, "preposition")).toBe(true);
      expect(matchesPosFilter(item, "conjunction")).toBe(true);
      expect(matchesPosFilter(item, "adverb")).toBe(false);
    });

    it("matches on the entry and on a meaning that departs from it alike", () => {
      const item = makeLexical({
        term: "bien",
        pos: "adverb",
        meanings: [newMeaning({ gloss: "good, benefit", posOverride: "noun" })],
      });

      expect(posValuesOf(item)).toEqual(new Set(["adverb", "noun"]));
      expect(matchesPosFilter(item, "adverb")).toBe(true);
      expect(matchesPosFilter(item, "noun")).toBe(true);
    });

    it("matches nothing but any when a word records no part of speech at all", () => {
      const item = makeLexical({ pos: "", meanings: [newMeaning({ gloss: "to take out" })] });

      expect(posValuesOf(item)).toEqual(new Set());
      expect(matchesPosFilter(item, "verb")).toBe(false);
    });

    it("offers only the parts of speech present, in the option order rather than by count", () => {
      const counts = posCountsIn([
        makeLexical({ term: "casa", pos: "noun" }),
        makeLexical({ term: "libro", pos: "noun" }),
        makeLexical({ term: "sacar", pos: "verb" }),
        como(),
      ]);

      // noun before verb before preposition before conjunction — LEXICAL_POS_OPTIONS order, even
      // though nouns and prepositions would swap under a by-count sort.
      expect(counts).toEqual([
        { pos: "noun", count: 2 },
        { pos: "verb", count: 1 },
        { pos: "preposition", count: 1 },
        { pos: "conjunction", count: 1 },
      ]);
    });

    it("counts a word once per distinct value, never twice for one repeated meaning", () => {
      const counts = posCountsIn([
        makeLexical({
          term: "bien",
          pos: "adverb",
          meanings: [
            newMeaning({ gloss: "well", posOverride: "adverb" }),
            newMeaning({ gloss: "quite", posOverride: "adverb" }),
          ],
        }),
      ]);

      expect(counts).toEqual([{ pos: "adverb", count: 1 }]);
    });
  });

  describe("meaning-level refinements", () => {
    const meaning = (gloss, over = {}) => newMeaning({ gloss, ...over });

    it("matches closed usage and behavior values exactly, never as substrings", () => {
      const item = makeLexical({
        term: "quedar",
        pos: "verb",
        meanings: [meaning("to remain", {
          usageLabels: ["informal"],
          verbBehavior: ["intransitive"],
        })],
      });

      expect(matchesMeaningFilters(item, { usage: "informal" })).toBe(true);
      expect(matchesMeaningFilters(item, { usage: "formal" })).toBe(false);
      expect(matchesMeaningFilters(item, { verbBehavior: "intransitive" })).toBe(true);
      expect(matchesMeaningFilters(item, { verbBehavior: "transitive" })).toBe(false);
    });

    it("requires usage, behavior and POS to agree on one meaning", () => {
      const split = makeLexical({
        term: "split",
        pos: "verb",
        meanings: [
          meaning("casual sense", { usageLabels: ["informal"] }),
          meaning("self-directed sense", { verbBehavior: ["reflexive"] }),
        ],
      });
      const coherent = makeLexical({
        term: "coherent",
        pos: "verb",
        meanings: [
          meaning("casual self-directed sense", {
            usageLabels: ["informal"],
            verbBehavior: ["reflexive"],
          }),
        ],
      });

      expect(matchesMeaningFilters(split, {
        usage: "informal",
        verbBehavior: "reflexive",
      })).toBe(false);
      expect(matchesMeaningFilters(coherent, {
        usage: "informal",
        verbBehavior: "reflexive",
      })).toBe(true);
    });

    it("uses the meaning override before inherited entry POS in a combined refinement", () => {
      const item = makeLexical({
        term: "como",
        pos: "adverb",
        meanings: [
          meaning("as a connector", {
            usageLabels: ["informal"],
            posOverride: "conjunction",
          }),
          meaning("in an adverbial use", { usageLabels: ["formal"] }),
        ],
      });

      expect(matchesMeaningFilters(item, { pos: "conjunction", usage: "informal" })).toBe(true);
      expect(matchesMeaningFilters(item, { pos: "adverb", usage: "informal" })).toBe(false);
      expect(matchesMeaningFilters(item, { pos: "adverb", usage: "formal" })).toBe(true);
    });

    it("preserves entry-wide OR meaning-override POS behavior when POS is the only refinement", () => {
      const item = makeLexical({
        term: "bien",
        pos: "adverb",
        meanings: [meaning("good, benefit", { posOverride: "noun" })],
      });

      expect(matchesMeaningFilters(item, { pos: "adverb" })).toBe(true);
      expect(matchesMeaningFilters(item, { pos: "noun" })).toBe(true);
      expect(matchesMeaningFilters(item, {
        pos: "adverb",
        usage: LEXICAL_USAGE_ANY,
        verbBehavior: LEXICAL_VERB_BEHAVIOR_ANY,
      })).toBe(true);
    });

    it("counts entries once in canonical option order and respects upstream meaning filters", () => {
      const doubleFormal = makeLexical({
        term: "double",
        pos: "verb",
        meanings: [
          meaning("first", { usageLabels: ["formal"], verbBehavior: ["transitive"] }),
          meaning("second", { usageLabels: ["formal"], verbBehavior: ["transitive"] }),
        ],
      });
      const informal = makeLexical({
        term: "casual",
        pos: "verb",
        meanings: [meaning("casual", {
          usageLabels: ["informal"],
          verbBehavior: ["intransitive"],
        })],
      });
      const formalNoun = makeLexical({
        term: "noun",
        pos: "noun",
        meanings: [meaning("formal noun", { usageLabels: ["formal"] })],
      });

      expect(usageCountsIn([doubleFormal, informal, formalNoun], { pos: "verb" })).toEqual([
        { usage: "formal", count: 1 },
        { usage: "informal", count: 1 },
      ]);
      expect(verbBehaviorCountsIn([doubleFormal, informal, formalNoun], {
        pos: "verb",
        usage: "formal",
      })).toEqual([{ verbBehavior: "transitive", count: 1 }]);
    });

    it("returns the first qualifying meaning and an additional-match count for the card", () => {
      const item = makeLexical({
        term: "quedar",
        pos: "verb",
        meanings: [
          meaning("to remain"),
          meaning("to arrange to meet", {
            usageLabels: ["informal"],
            verbBehavior: ["pronominal"],
          }),
          meaning("to agree to meet", {
            usageLabels: ["informal"],
            verbBehavior: ["pronominal"],
          }),
        ],
      });
      const filters = { pos: "verb", usage: "informal", verbBehavior: "pronominal" };

      expect(matchingMeaningsForFilters(item, filters).map((row) => row.gloss)).toEqual([
        "to arrange to meet",
        "to agree to meet",
      ]);
      expect(meaningFilterMatch(item, filters)).toEqual({
        meaning: expect.objectContaining({ gloss: "to arrange to meet" }),
        criteria: [
          { label: "Part of speech", value: "verb" },
          { label: "Usage", value: "informal" },
          { label: "Verb behavior", value: "pronominal" },
        ],
        additionalCount: 1,
      });
    });

    it("prefers a POS-qualified meaning but falls back to the ordinary gloss for entry-only POS", () => {
      const preferred = makeLexical({
        term: "como",
        pos: "adverb",
        meanings: [
          meaning("in the way that"),
          meaning("as, while", { posOverride: "conjunction" }),
        ],
      });
      const entryOnly = makeLexical({
        term: "bien",
        pos: "adverb",
        meanings: [meaning("good, benefit", { posOverride: "noun" })],
      });

      expect(meaningFilterMatch(preferred, { pos: "conjunction" })?.meaning?.gloss)
        .toBe("as, while");
      expect(meaningFilterMatch(entryOnly, { pos: "adverb" })?.meaning?.gloss)
        .toBe("good, benefit");
    });

    it("returns no descriptor when every semantic refinement is off", () => {
      expect(meaningFilterMatch(makeLexical(), {
        pos: LEXICAL_POS_ANY,
        usage: LEXICAL_USAGE_ANY,
        verbBehavior: LEXICAL_VERB_BEHAVIOR_ANY,
      })).toBeNull();
    });
  });

  describe("the A–Z index", () => {
    it("folds accents onto the base letter but keeps ñ its own", () => {
      expect(initialOf(word("árbol"))).toBe("A");
      expect(initialOf(word("año"))).toBe("A");
      expect(initialOf(word("ñoño"))).toBe("Ñ");
      expect(initialOf(word("Nomás"))).toBe("N");
    });

    it("sends digits, punctuation and blank terms to one other group", () => {
      expect(initialOf(word("1er"))).toBe(OTHER_INITIAL);
      expect(initialOf(word("¿qué?"))).toBe(OTHER_INITIAL);
      expect(initialOf(word(""))).toBe(OTHER_INITIAL);
      expect(initialOf(undefined)).toBe(OTHER_INITIAL);
    });

    it("keeps the caller's order and gives each letter exactly one group", () => {
      const groups = groupByInitial([
        word("árbol"),
        word("agua"),
        word("nube"),
        word("ñoño"),
        word("zorro"),
      ]);

      expect(groups.map((group) => group.letter)).toEqual(["A", "N", "Ñ", "Z"]);
      expect(groups[0].items.map((item) => item.term)).toEqual(["árbol", "agua"]);
    });

    it("forces the other group last even when it appeared first", () => {
      const groups = groupByInitial([word("1er"), word("agua"), word("zorro")]);

      expect(groups.map((group) => group.letter)).toEqual(["A", "Z", OTHER_INITIAL]);
      expect(groups.at(-1).items.map((item) => item.term)).toEqual(["1er"]);
    });

    it("returns nothing for an empty list", () => {
      expect(groupByInitial([])).toEqual([]);
    });
  });
});
