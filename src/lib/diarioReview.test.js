import { describe, expect, it } from "vitest";
import {
  isFeedbackStale,
  makeStoredFeedback,
  reviewedTextFor,
  reviewHash,
  validateStoredFeedback,
} from "./diarioReview.js";

const review = {
  verdict: "mostly_clear",
  summary: "Readable with a few slips.",
  items: [
    { category: "error", quote: "yo sabo", corrected: "yo sé", explanation: "Irregular first person." },
    { category: "praise", quote: "aunque llueva", corrected: null, explanation: "Good subjunctive." },
  ],
};

const entry = { title: "Mi día", body: "Hoy **fui** al mercado." };

describe("reviewedTextFor", () => {
  it("projects the title and the body's visible text, so formatting is invisible to the hash", () => {
    expect(reviewedTextFor(entry)).toBe("Mi día\nHoy fui al mercado.");
    expect(reviewedTextFor({ title: "  Mi día  ", body: "Hoy fui al mercado." }))
      .toBe(reviewedTextFor(entry));
  });

  it("tolerates missing fields", () => {
    expect(reviewedTextFor({})).toBe("\n");
    expect(reviewedTextFor()).toBe("\n");
  });
});

describe("reviewHash", () => {
  it("is stable for equal text and differs for different text", () => {
    expect(reviewHash("hola")).toBe(reviewHash("hola"));
    expect(reviewHash("hola")).not.toBe(reviewHash("holá"));
  });
});

describe("makeStoredFeedback / isFeedbackStale", () => {
  it("stamps the review so it is fresh against the text it judged", () => {
    const stored = makeStoredFeedback(review, entry);
    expect(stored.verdict).toBe(review.verdict);
    expect(stored.items).toEqual(review.items);
    expect(typeof stored.reviewedAt).toBe("string");
    expect(isFeedbackStale(stored, entry)).toBe(false);
  });

  it("stays fresh across a formatting-only edit but goes stale on a text edit", () => {
    const stored = makeStoredFeedback(review, entry);
    expect(isFeedbackStale(stored, { ...entry, body: "Hoy fui al mercado." })).toBe(false);
    expect(isFeedbackStale(stored, { ...entry, body: "Hoy fui al tianguis." })).toBe(true);
    expect(isFeedbackStale(stored, { ...entry, title: "Otro día" })).toBe(true);
  });

  it("treats a review without a hash as stale", () => {
    expect(isFeedbackStale({ ...review }, entry)).toBe(true);
    expect(isFeedbackStale(null, entry)).toBe(true);
  });
});

describe("validateStoredFeedback", () => {
  const stored = makeStoredFeedback(review, entry);

  it("accepts null and a complete stored review", () => {
    expect(validateStoredFeedback(null)).toEqual([]);
    expect(validateStoredFeedback(stored)).toEqual([]);
  });

  it.each([
    ["a non-object", "nope"],
    ["an array", []],
    ["an unknown verdict", { ...stored, verdict: "meh" }],
    ["a missing summary", { ...stored, summary: 7 }],
    ["non-array items", { ...stored, items: {} }],
    ["an unknown item category", { ...stored, items: [{ ...stored.items[0], category: "vibe" }] }],
    ["a non-string quote", { ...stored, items: [{ ...stored.items[0], quote: 3 }] }],
    ["a numeric corrected", { ...stored, items: [{ ...stored.items[0], corrected: 3 }] }],
    ["a missing explanation", { ...stored, items: [{ ...stored.items[0], explanation: null }] }],
    ["a missing reviewedAt", { ...stored, reviewedAt: undefined }],
    ["a blank reviewedHash", { ...stored, reviewedHash: " " }],
  ])("rejects %s", (_label, bad) => {
    expect(validateStoredFeedback(bad).length).toBeGreaterThan(0);
  });

  it("allows a praise item with corrected null", () => {
    expect(validateStoredFeedback({
      ...stored,
      items: [{ category: "praise", quote: "bien", corrected: null, explanation: "Nice." }],
    })).toEqual([]);
  });
});
