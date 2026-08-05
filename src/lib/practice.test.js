import { describe, expect, it } from "vitest";
import {
  buildPracticeDeck,
  isPracticeEligible,
  PRACTICE_ORDERS,
  shufflePracticeItems,
} from "./practice.js";

const item = (id, over = {}) => ({
  id,
  type: "lexical",
  meanings: [{ id: `meaning:${id}`, gloss: `meaning ${id}` }],
  ...over,
});

describe("free-practice deck selection", () => {
  it("accepts only personal lexical entries with a nonblank meaning", () => {
    expect(isPracticeEligible(item("ready"))).toBe(true);
    expect(isPracticeEligible(item("empty", { meanings: [] }))).toBe(false);
    expect(isPracticeEligible(item("blank", { meanings: [{ gloss: "   " }] }))).toBe(false);
    expect(isPracticeEligible(item("page", { type: "page" }))).toBe(false);
  });

  it("applies the limit after removing incomplete entries", () => {
    const items = [
      item("one"),
      item("missing", { meanings: [] }),
      item("two"),
      item("three"),
    ];

    expect(buildPracticeDeck(items, { limit: 2, order: PRACTICE_ORDERS.current }).map((row) => row.id))
      .toEqual(["one", "two"]);
    expect(buildPracticeDeck(items, { limit: 20, order: PRACTICE_ORDERS.current })).toHaveLength(3);
    expect(buildPracticeDeck(items, { limit: "all", order: PRACTICE_ORDERS.current })).toHaveLength(3);
  });

  it("preserves the supplied hub order when requested", () => {
    const items = [item("pinned"), item("recent"), item("older")];
    expect(buildPracticeDeck(items, { limit: "all", order: PRACTICE_ORDERS.current }).map((row) => row.id))
      .toEqual(["pinned", "recent", "older"]);
  });

  it("shuffles a copy deterministically without mutating the source", () => {
    const items = [item("one"), item("two"), item("three"), item("four")];
    const randomValues = [0, 0.5, 0];
    const shuffled = shufflePracticeItems(items, () => randomValues.shift());

    expect(shuffled.map((row) => row.id)).toEqual(["three", "four", "two", "one"]);
    expect(items.map((row) => row.id)).toEqual(["one", "two", "three", "four"]);
  });
});
