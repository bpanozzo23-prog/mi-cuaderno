import { ITEM_CATEGORIES, VERDICTS } from "./aiFeedback.js";
import { nowIso } from "./dates.js";
import { plainTextFromMarkdown } from "./noteMarkdown.js";

/**
 * The stored Diario review (schema v8): the latest AI feedback kept on the entry it reviewed,
 * plus the staleness signal that says whether the entry's text still matches what was sent.
 *
 * Staleness is a content hash of the reviewed-text projection, never `updatedAt`: the feedback
 * save itself and formatting-only autosaves would both corrupt a timestamp comparison. The one
 * projection below is shared by the request path and the staleness check, so the two can never
 * diverge — and because it goes through `plainTextFromMarkdown`, a purely cosmetic edit
 * (`**bold**`) correctly does not mark a review stale.
 */

/** The exact text a review judges: the title and the body's visible-text projection. */
export function reviewedTextFor({ title, body } = {}) {
  const cleanTitle = typeof title === "string" ? title.trim() : "";
  return `${cleanTitle}\n${plainTextFromMarkdown(body)}`;
}

/** djb2 over code points, as hex. A staleness hint, not an integrity check. */
export function reviewHash(text) {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

/** Stamps a fresh review with when it happened and what text it judged. */
export function makeStoredFeedback(review, { title, body } = {}) {
  return {
    ...review,
    reviewedAt: nowIso(),
    reviewedHash: reviewHash(reviewedTextFor({ title, body })),
  };
}

/** A review with no hash cannot prove it matches anything, so it counts as stale. */
export function isFeedbackStale(feedback, { title, body } = {}) {
  if (!feedback?.reviewedHash) return true;
  return feedback.reviewedHash !== reviewHash(reviewedTextFor({ title, body }));
}

const isString = (v) => typeof v === "string";

/**
 * Shape check for the persisted field. `null` is the valid "no review" state — the field is
 * always present on a v8 page. Mirrors `parseFeedback`'s item checks in aiFeedback.js, plus the
 * two stored-only stamps.
 */
export function validateStoredFeedback(feedback, where = "feedback") {
  if (feedback === null) return [];
  const errors = [];
  if (!feedback || typeof feedback !== "object" || Array.isArray(feedback)) {
    return [`${where} must be null or an object.`];
  }
  if (!VERDICTS.includes(feedback.verdict)) {
    errors.push(`${where}.verdict must be one of ${VERDICTS.join(", ")}.`);
  }
  if (!isString(feedback.summary)) errors.push(`${where}.summary must be a string.`);
  if (!Array.isArray(feedback.items)) {
    errors.push(`${where}.items must be an array.`);
  } else {
    feedback.items.forEach((item, index) => {
      const itemWhere = `${where}.items[${index}]`;
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        errors.push(`${itemWhere} must be an object.`);
        return;
      }
      if (!ITEM_CATEGORIES.includes(item.category)) {
        errors.push(`${itemWhere}.category must be one of ${ITEM_CATEGORIES.join(", ")}.`);
      }
      if (!isString(item.quote)) errors.push(`${itemWhere}.quote must be a string.`);
      if (item.corrected !== null && !isString(item.corrected)) {
        errors.push(`${itemWhere}.corrected must be a string or null.`);
      }
      if (!isString(item.explanation)) errors.push(`${itemWhere}.explanation must be a string.`);
    });
  }
  if (!isString(feedback.reviewedAt) || !feedback.reviewedAt.trim()) {
    errors.push(`${where}.reviewedAt must be a timestamp string.`);
  }
  if (!isString(feedback.reviewedHash) || !feedback.reviewedHash.trim()) {
    errors.push(`${where}.reviewedHash must be a nonempty string.`);
  }
  return errors;
}
