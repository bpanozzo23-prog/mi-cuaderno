import { describe, it, expect } from "vitest";
import {
  deriveReviewState,
  deriveDictSuggestions,
  LEITNER_INTERVALS_DAYS,
  LOOKUP_ENROLL_DISTINCT_DAYS,
  LOOKUP_WINDOW_DAYS,
  DICT_SUGGEST_MIN_VIEWS,
  MAX_BOX,
  GRADES,
  cardDirection,
} from "./review.js";
import { addDaysToLocalDate } from "./dates.js";
import { makeLexical, makePage, makeEvent } from "../test/factories.js";
import { newMeaning } from "./meanings.js";

const TODAY = "2026-07-31";
const at = (day, hour = 10) => `${day}T${String(hour).padStart(2, "0")}:00:00.000Z`;

const view = (key, day, hour = 10) =>
  makeEvent({ type: "view", itemKey: key, at: at(day, hour), localDate: day });
const graded = (key, day, grade, hour = 10) =>
  makeEvent({
    type: grade === GRADES.again ? "review_fail" : "review_pass",
    itemKey: key,
    at: at(day, hour),
    localDate: day,
    metadata: { grade },
  });
const pass = (key, day, hour = 10) => graded(key, day, GRADES.good, hour);
const fail = (key, day, hour = 10) =>
  graded(key, day, GRADES.again, hour);
const trickyOn = (key, day) =>
  makeEvent({ type: "tricky_on", itemKey: key, at: at(day), localDate: day });
const trickyOff = (key, day) =>
  makeEvent({ type: "tricky_off", itemKey: key, at: at(day), localDate: day });

const stateOf = (items, events, today = TODAY) => deriveReviewState(items, events, today);

describe("enrollment: what gets into the queue at all", () => {
  it("takes a word the owner flagged tricky, due immediately", () => {
    const word = makeLexical({ term: "madrugar" });
    const { states, due } = stateOf([word], [trickyOn(word.id, "2026-07-31")]);

    expect(states.get(word.id).enrolled).toBe(true);
    expect(states.get(word.id).reason).toBe("tricky");
    expect(states.get(word.id).box).toBe(1);
    expect(due.map((i) => i.id)).toEqual([word.id]);
  });

  it("drops a word once the highlighter comes off, if nothing else holds it", () => {
    const word = makeLexical({ term: "madrugar" });
    const events = [trickyOn(word.id, "2026-07-20"), trickyOff(word.id, "2026-07-25")];

    expect(stateOf([word], events).states.get(word.id).enrolled).toBe(false);
  });

  it("takes a word looked up on three separate days", () => {
    const word = makeLexical({ term: "sacar" });
    const events = [view(word.id, "2026-07-20"), view(word.id, "2026-07-25"), view(word.id, "2026-07-30")];

    const state = stateOf([word], events).states.get(word.id);
    expect(state.lookupDays).toBe(LOOKUP_ENROLL_DISTINCT_DAYS);
    expect(state.enrolled).toBe(true);
    expect(state.reason).toBe("lookups");
  });

  it("does NOT take a word opened three times in one sitting", () => {
    // Three visits on one day is one day of trouble, not three.
    const word = makeLexical({ term: "sacar" });
    const events = [view(word.id, "2026-07-30", 9), view(word.id, "2026-07-30", 13), view(word.id, "2026-07-30", 20)];

    const state = stateOf([word], events).states.get(word.id);
    expect(state.lookupDays).toBe(1);
    expect(state.enrolled).toBe(false);
  });

  it("forgets lookups older than the window", () => {
    const word = makeLexical({ term: "sacar" });
    const old = addDaysToLocalDate(TODAY, -(LOOKUP_WINDOW_DAYS + 5));
    const events = [
      view(word.id, old),
      view(word.id, addDaysToLocalDate(old, 1)),
      view(word.id, "2026-07-30"),
    ];

    expect(stateOf([word], events).states.get(word.id).lookupDays).toBe(1);
  });

  it("counts dictionary lookups of the entry a word is attached to", () => {
    // The section 5 seam applied to events: the owner looked this word up three times,
    // and it does not matter that two of those were before they wrote it down.
    const word = makeLexical({ term: "chamba", dictKey: "dict:wiktionary-es:chamba-noun-1" });
    const events = [
      view(word.dictKey, "2026-07-20"),
      view(word.dictKey, "2026-07-25"),
      view(word.id, "2026-07-30"),
    ];

    const state = stateOf([word], events).states.get(word.id);
    expect(state.lookupDays).toBe(3);
    expect(state.enrolled).toBe(true);
  });

  it("keeps a word in the ladder after the highlighter comes off mid-way", () => {
    const word = makeLexical({ term: "madrugar" });
    const events = [
      trickyOn(word.id, "2026-07-01"),
      pass(word.id, "2026-07-02"),
      trickyOff(word.id, "2026-07-03"),
    ];

    const state = stateOf([word], events).states.get(word.id);
    expect(state.enrolled).toBe(true);
    expect(state.reason).toBe("reviewing");
    expect(state.box).toBe(2);
  });

  it("never queues a page, even a tricky one", () => {
    const page = makePage({ title: "Ser vs estar" });
    const { states, due } = stateOf([page], [trickyOn(page.id, "2026-07-31")]);

    expect(states.has(page.id)).toBe(false);
    expect(due).toEqual([]);
  });

  it("ignores events belonging to items that no longer exist", () => {
    const word = makeLexical({ term: "sacar" });
    const events = [trickyOn("user:deleted", "2026-07-31"), trickyOn(word.id, "2026-07-31")];

    const { states, due } = stateOf([word], events);
    expect(states.has("user:deleted")).toBe(false);
    expect(due.map((i) => i.id)).toEqual([word.id]);
  });

  it("ignores event types it does not recognise", () => {
    const word = makeLexical({ term: "sacar" });
    const events = [
      makeEvent({ type: "some_future_type", itemKey: word.id, at: at("2026-07-31"), localDate: "2026-07-31" }),
      trickyOn(word.id, "2026-07-31"),
    ];

    expect(stateOf([word], events).states.get(word.id).box).toBe(1);
  });
});

describe("the Leitner ladder", () => {
  it("moves up a box on a pass and waits longer each time", () => {
    const word = makeLexical({ term: "madrugar" });
    const events = [trickyOn(word.id, "2026-07-01")];
    const seen = [];

    for (let i = 0; i < MAX_BOX - 1; i += 1) {
      const day = `2026-07-${String(10 + i).padStart(2, "0")}`;
      events.push(pass(word.id, day));
      const state = stateOf([word], events, day).states.get(word.id);
      seen.push({ box: state.box, waited: LEITNER_INTERVALS_DAYS[state.box - 1] });
      expect(state.dueDate).toBe(addDaysToLocalDate(day, LEITNER_INTERVALS_DAYS[state.box - 1]));
      expect(state.due).toBe(false);
    }

    expect(seen.map((s) => s.box)).toEqual([2, 3, 4, 5]);
    expect(seen.map((s) => s.waited)).toEqual([2, 4, 8, 16]);
  });

  it("sends a missed word back to box 1, due tomorrow", () => {
    const word = makeLexical({ term: "madrugar" });
    const events = [
      trickyOn(word.id, "2026-07-01"),
      pass(word.id, "2026-07-10"),
      pass(word.id, "2026-07-15"),
      fail(word.id, "2026-07-31"),
    ];

    const state = stateOf([word], events).states.get(word.id);
    expect(state.box).toBe(1);
    expect(state.dueDate).toBe("2026-08-01");
    expect(state.due).toBe(false);
  });

  it("holds the current box on Hard and restarts that box's interval", () => {
    const word = makeLexical({ term: "madrugar" });
    const events = [
      trickyOn(word.id, "2026-07-01"),
      pass(word.id, "2026-07-10"),
      pass(word.id, "2026-07-12"),
      graded(word.id, "2026-07-31", GRADES.hard),
    ];

    const state = stateOf([word], events).states.get(word.id);
    expect(state.box).toBe(3);
    expect(state.dueDate).toBe("2026-08-04");
  });

  it("moves up two boxes on Easy and caps at box 5", () => {
    const word = makeLexical({ term: "madrugar" });
    const events = [
      trickyOn(word.id, "2026-07-01"),
      graded(word.id, "2026-07-10", GRADES.easy),
      graded(word.id, "2026-07-20", GRADES.easy),
    ];

    const state = stateOf([word], events).states.get(word.id);
    expect(state.box).toBe(MAX_BOX);
    expect(state.graduated).toBe(false);
  });

  it("lands Easy from box 4 in box 5 without retiring", () => {
    const word = makeLexical({ term: "madrugar" });
    const events = [
      trickyOn(word.id, "2026-07-01"),
      pass(word.id, "2026-07-10"),
      pass(word.id, "2026-07-12"),
      pass(word.id, "2026-07-16"),
      graded(word.id, "2026-07-31", GRADES.easy),
    ];

    const state = stateOf([word], events).states.get(word.id);
    expect(state.box).toBe(MAX_BOX);
    expect(state.graduated).toBe(false);
  });

  it("holds box 5 on Hard without retiring", () => {
    const word = makeLexical({ term: "madrugar" });
    const events = [
      trickyOn(word.id, "2026-07-01"),
      pass(word.id, "2026-07-02"),
      pass(word.id, "2026-07-04"),
      pass(word.id, "2026-07-08"),
      pass(word.id, "2026-07-16"),
      graded(word.id, "2026-07-31", GRADES.hard),
    ];

    const state = stateOf([word], events).states.get(word.id);
    expect(state.graduated).toBe(false);
    expect(state.box).toBe(MAX_BOX);
    expect(state.dueDate).toBe(addDaysToLocalDate("2026-07-31", LEITNER_INTERVALS_DAYS[MAX_BOX - 1]));
  });

  it("replays a historical gradeless pass as Good", () => {
    const word = makeLexical({ term: "madrugar" });
    const legacyPass = makeEvent({
      type: "review_pass",
      itemKey: word.id,
      at: at("2026-07-31"),
      localDate: "2026-07-31",
      metadata: null,
    });

    const state = stateOf([word], [trickyOn(word.id, "2026-07-01"), legacyPass]).states.get(word.id);
    expect(state.box).toBe(2);
    expect(state.dueDate).toBe("2026-08-02");
  });

  it("takes a reviewed word out of today's queue by arithmetic, with no 'done' list", () => {
    const word = makeLexical({ term: "madrugar" });
    const before = stateOf([word], [trickyOn(word.id, TODAY)]);
    expect(before.due).toHaveLength(1);

    const after = stateOf([word], [trickyOn(word.id, TODAY), pass(word.id, TODAY)]);
    expect(after.due).toHaveLength(0);
    expect(after.reviewedToday).toBe(1);
  });

  it("shows an overdue word as due, however long it has waited", () => {
    const word = makeLexical({ term: "madrugar" });
    const events = [trickyOn(word.id, "2026-06-01"), pass(word.id, "2026-06-02")];

    const state = stateOf([word], events).states.get(word.id);
    expect(state.dueDate).toBe("2026-06-04");
    expect(state.due).toBe(true);
  });
});

describe("graduation", () => {
  const ladderTo5 = (key) => [
    trickyOn(key, "2026-05-01"),
    pass(key, "2026-05-02"),
    pass(key, "2026-05-04"),
    pass(key, "2026-05-08"),
    pass(key, "2026-05-16"),
  ];

  it("retires a word that passes from the top box, once nothing else holds it", () => {
    const word = makeLexical({ term: "madrugar" });
    const events = [...ladderTo5(word.id), trickyOff(word.id, "2026-06-01"), pass(word.id, "2026-06-02")];

    const state = stateOf([word], events).states.get(word.id);
    expect(state.box).toBe(MAX_BOX);
    expect(state.graduated).toBe(true);
    expect(state.enrolled).toBe(false);
  });

  it("keeps a still-highlighted word in rotation at the top box's gentle cadence", () => {
    // The owner's explicit flag outranks the scheduler: it stays until they unflag it.
    const word = makeLexical({ term: "madrugar" });
    const events = [...ladderTo5(word.id), pass(word.id, "2026-06-02")];

    const state = stateOf([word], events).states.get(word.id);
    expect(state.graduated).toBe(true);
    expect(state.enrolled).toBe(true);
    expect(state.reason).toBe("tricky");
    expect(state.dueDate).toBe(addDaysToLocalDate("2026-06-02", 16));
  });

  it("lets a retired word back in when it starts giving trouble again", () => {
    const word = makeLexical({ term: "madrugar" });
    const events = [
      ...ladderTo5(word.id),
      trickyOff(word.id, "2026-06-01"),
      pass(word.id, "2026-06-02"),
      view(word.id, "2026-07-20"),
      view(word.id, "2026-07-25"),
      view(word.id, "2026-07-30"),
    ];

    const state = stateOf([word], events).states.get(word.id);
    expect(state.enrolled).toBe(true);
    expect(state.reason).toBe("lookups");
    expect(state.box).toBe(MAX_BOX);
  });

  it("counts only the lookups since it retired towards bringing it back", () => {
    // All three lookups are inside the 30-day window, so the window alone would enroll
    // this word. Only the graduation cut-off keeps it retired: two of them happened
    // before it graduated, and those trips to the page are what the ladder just answered.
    const word = makeLexical({ term: "madrugar" });
    const events = [
      trickyOn(word.id, "2026-07-10"),
      view(word.id, "2026-07-11"),
      view(word.id, "2026-07-12"),
      pass(word.id, "2026-07-13"),
      pass(word.id, "2026-07-15"),
      pass(word.id, "2026-07-17"),
      pass(word.id, "2026-07-19"),
      trickyOff(word.id, "2026-07-20"),
      pass(word.id, "2026-07-21"), // box 5 → graduated
      view(word.id, "2026-07-30"),
    ];

    const state = stateOf([word], events).states.get(word.id);
    expect(state.graduated).toBe(true);
    expect(state.lookupDays).toBe(1);
    expect(state.enrolled).toBe(false);
  });

  it("sends a retired word that fails back down the whole ladder", () => {
    const word = makeLexical({ term: "madrugar" });
    const events = [...ladderTo5(word.id), trickyOff(word.id, "2026-06-01"), pass(word.id, "2026-06-02"), fail(word.id, "2026-07-30")];

    const state = stateOf([word], events).states.get(word.id);
    expect(state.box).toBe(1);
    expect(state.graduated).toBe(false);
    expect(state.enrolled).toBe(true);
    expect(state.dueDate).toBe("2026-07-31");
    expect(state.due).toBe(true);
  });
});

describe("the queue's order", () => {
  it("puts the most overdue first, then the shakiest box, then alphabetical", () => {
    const overdue = makeLexical({ term: "zurcir" });
    const shaky = makeLexical({ term: "apurarse" });
    const steady = makeLexical({ term: "barrer" });
    const items = [steady, shaky, overdue];

    const events = [
      trickyOn(overdue.id, "2026-06-01"),
      pass(overdue.id, "2026-06-02"), // due 2026-06-04
      trickyOn(shaky.id, "2026-07-31"), // never reviewed, box 1, due today
      trickyOn(steady.id, "2026-07-01"),
      pass(steady.id, "2026-07-29"),
      pass(steady.id, "2026-07-30"), // box 3, due 2026-08-03 — not due
    ];

    const { due } = stateOf(items, events);
    expect(due.map((i) => i.term)).toEqual(["zurcir", "apurarse"]);
  });

  it("counts each word reviewed today once, however many times it was graded", () => {
    const a = makeLexical({ term: "sacar" });
    const b = makeLexical({ term: "barrer" });
    const events = [
      trickyOn(a.id, TODAY),
      trickyOn(b.id, TODAY),
      fail(a.id, TODAY, 9),
      pass(a.id, TODAY, 11),
      pass(b.id, TODAY, 12),
    ];

    expect(stateOf([a, b], events).reviewedToday).toBe(2);
  });
});

describe("a word reviewed across a month comes back less often", () => {
  it("stretches the gap between reviews after every pass", () => {
    // Brief section 12's "done when", pinned: the owner passes the word each time it
    // is offered, and the schedule keeps handing it back later.
    const word = makeLexical({ term: "madrugar" });
    const events = [trickyOn(word.id, "2026-07-01")];
    const gaps = [];
    let day = "2026-07-01";

    for (let round = 0; round < MAX_BOX; round += 1) {
      const { due, states } = stateOf([word], events, day);
      expect(due.map((i) => i.id)).toEqual([word.id]);

      events.push(pass(word.id, day));
      const next = stateOf([word], events, day).states.get(word.id);
      gaps.push(Number(daysBetween(day, next.dueDate)));
      expect(states.get(word.id).due).toBe(true);
      day = next.dueDate;
    }

    expect(gaps).toEqual([2, 4, 8, 16, 16]);
    for (let i = 1; i < gaps.length; i += 1) expect(gaps[i]).toBeGreaterThanOrEqual(gaps[i - 1]);
  });
});

function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
}

describe("dictionary words the owner keeps looking up", () => {
  const KEY = "dict:wiktionary-es:chamba-noun-1";

  it("suggests an entry opened often enough, with its count", () => {
    const events = [view(KEY, "2026-07-20"), view(KEY, "2026-07-25"), view(KEY, "2026-07-30")];

    expect(deriveDictSuggestions([], events, TODAY)).toEqual([
      { dictKey: KEY, views: 3, lastViewedAt: at("2026-07-30") },
    ]);
  });

  it("stays quiet below the threshold", () => {
    const events = Array.from({ length: DICT_SUGGEST_MIN_VIEWS - 1 }, (_, i) => view(KEY, `2026-07-2${i}`));
    expect(deriveDictSuggestions([], events, TODAY)).toEqual([]);
  });

  it("says nothing about a word already in the cuaderno", () => {
    const word = makeLexical({ term: "chamba", dictKey: KEY });
    const events = [view(KEY, "2026-07-20"), view(KEY, "2026-07-25"), view(KEY, "2026-07-30")];

    expect(deriveDictSuggestions([word], events, TODAY)).toEqual([]);
  });

  it("says nothing about a word a page already links to", () => {
    const page = makePage({ title: "Mexican slang", linkedKeys: [KEY] });
    const events = [view(KEY, "2026-07-20"), view(KEY, "2026-07-25"), view(KEY, "2026-07-30")];

    expect(deriveDictSuggestions([page], events, TODAY)).toEqual([]);
  });

  it("forgets lookups older than the window", () => {
    const old = addDaysToLocalDate(TODAY, -(LOOKUP_WINDOW_DAYS + 1));
    const events = [view(KEY, old), view(KEY, old), view(KEY, old), view(KEY, "2026-07-30")];

    expect(deriveDictSuggestions([], events, TODAY)).toEqual([]);
  });

  it("puts the most looked up first", () => {
    const other = "dict:wiktionary-es:torta-noun-1";
    const events = [
      view(KEY, "2026-07-20"),
      view(KEY, "2026-07-25"),
      view(KEY, "2026-07-30"),
      view(other, "2026-07-20"),
      view(other, "2026-07-21"),
      view(other, "2026-07-22"),
      view(other, "2026-07-23"),
    ];

    expect(deriveDictSuggestions([], events, TODAY).map((r) => r.dictKey)).toEqual([other, KEY]);
  });

  it("ignores personal lookups entirely", () => {
    const word = makeLexical({ term: "sacar" });
    const events = [view(word.id, "2026-07-20"), view(word.id, "2026-07-25"), view(word.id, "2026-07-30")];

    expect(deriveDictSuggestions([word], events, TODAY)).toEqual([]);
  });
});

describe("Phase 10a: which way a card faces", () => {
  const withGloss = makeLexical({ term: "sacar", meanings: [newMeaning({ gloss: "to take out" })] });
  const noGloss = makeLexical({ term: "sacar", meanings: [] });

  it("faces forward or reverse as the session chose", () => {
    expect(cardDirection(withGloss, "forward")).toBe("forward");
    expect(cardDirection(withGloss, "reverse")).toBe("reverse");
  });

  it("splits a mixed session on the coin, not on the item", () => {
    expect(cardDirection(withGloss, "mixed", () => 0.1)).toBe("forward");
    expect(cardDirection(withGloss, "mixed", () => 0.9)).toBe("reverse");
  });

  it("keeps a word with nothing written down facing forward, whatever was chosen", () => {
    // Reverse asks the glosses. With none there is no question side at all, so the
    // choice has to yield rather than render an empty card.
    expect(cardDirection(noGloss, "reverse")).toBe("forward");
    expect(cardDirection(noGloss, "mixed", () => 0.9)).toBe("forward");
  });

  it("treats a whitespace-only gloss as nothing written down", () => {
    const blank = makeLexical({ meanings: [newMeaning({ gloss: "   " })] });
    expect(cardDirection(blank, "reverse")).toBe("forward");
  });

  it("falls back to forward for an unrecognised choice", () => {
    expect(cardDirection(withGloss, undefined)).toBe("forward");
  });
});

describe("drill events stay out of the review model", () => {
  /**
   * The whole reason `drill_pass`/`drill_fail` are their own types (Phase 13). A Leitner
   * box says "do I know what this word means"; conjugating it wrong is a different fact.
   * Section 7 requires every consumer to ignore types it does not recognise, and this is
   * that requirement made checkable rather than assumed.
   */
  const drillPass = (key, day, hour = 10) =>
    makeEvent({
      type: "drill_pass",
      itemKey: key,
      at: at(day, hour),
      localDate: day,
      metadata: { tense: "Indicative/Preterite", slot: "yo", mode: "reveal", verdict: "self" },
    });
  const drillFail = (key, day, hour = 10) =>
    makeEvent({
      type: "drill_fail",
      itemKey: key,
      at: at(day, hour),
      localDate: day,
      metadata: { tense: "Indicative/Preterite", slot: "yo", mode: "typed", verdict: "wrong" },
    });

  const word = makeLexical({ id: "user:1", term: "poner" });

  it("does not enrol a word that has only ever been drilled", () => {
    const state = stateOf([word], [drillPass("user:1", "2026-07-29"), drillFail("user:1", "2026-07-30")]);
    expect(state.states.get("user:1").enrolled).toBe(false);
    expect(state.due).toEqual([]);
  });

  it("leaves every Leitner value unchanged after a recognition answer", () => {
    const reviewed = stateOf([word], [pass("user:1", "2026-07-30")]);
    const recognition = makeEvent({
      type: "drill_fail",
      itemKey: null,
      at: at("2026-07-31"),
      localDate: "2026-07-31",
      metadata: {
        skill: "usage",
        cardId: "usage:preterite-completed",
        tense: "Indicative/Preterite",
        chosen: "Indicative/Imperfect",
        mode: "choice",
      },
    });
    const after = stateOf([word], [pass("user:1", "2026-07-30"), recognition]);

    expect(after.states.get(word.id)).toEqual(reviewed.states.get(word.id));
    expect(after.due).toEqual(reviewed.due);
  });

  it("does not move a box, and does not count as a lookup", () => {
    // One real review puts the word in box 2; three drills on three separate days would
    // reach the lookup threshold if they were miscounted as views.
    const events = [
      pass("user:1", "2026-07-30"),
      drillFail("user:1", "2026-07-28"),
      drillFail("user:1", "2026-07-29"),
      drillFail("user:1", "2026-07-30"),
    ];
    const state = stateOf([word], events).states.get("user:1");

    expect(state.box).toBe(2);
    expect(state.reviews).toBe(1);
    expect(state.lookupDays).toBe(0);
    expect(state.reason).toBe("reviewing");
  });
});
