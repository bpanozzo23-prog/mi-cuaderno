/**
 * The attached entries Keep may add to, frozen when Keep opens.
 *
 * Claude has only seen an entry in full when it was attached, so only those can receive
 * additions. For each, one reading of the notebook gives three things that must agree: the text
 * sent (with meanings numbered `m1`, `m2`…), which meaning ID each number names, and a content
 * fingerprint. Apply compares the fingerprint inside its transaction and refuses to add to an
 * entry that has changed since, rather than merging into something Claude never saw.
 *
 * Only this module's `text` leaves the device; IDs and fingerprints stay here.
 */

import { capped, lexicalLines, shownMeanings } from "./askContext.js";
import { contentFingerprint } from "./contentFingerprint.js";

export { contentFingerprint };

/**
 * One frozen snapshot per attached word or phrase, using the `c#` refs Keep's candidates gave
 * them: [{ ref, itemId, term, text, truncated, meaningIds: { m1: "meaning:…" }, fingerprint }].
 * Pages, missing entries and unattached candidates are left out.
 */
export function keepAttachedSnapshots(items = [], candidates = []) {
  const byId = new Map(items.map((item) => [item?.id, item]));
  const snapshots = [];
  for (const candidate of candidates) {
    if (candidate.matchedBy !== "attached") continue;
    const item = byId.get(candidate.itemId);
    if (item?.type !== "lexical") continue;
    const { text, truncated } = capped(lexicalLines(item, items, { meaningRefs: true }).filter(Boolean).join("\n"));
    snapshots.push({
      ref: candidate.ref,
      itemId: item.id,
      term: candidate.term,
      text,
      truncated,
      meaningIds: Object.fromEntries(shownMeanings(item).map((meaning, index) => [`m${index + 1}`, meaning.id])),
      fingerprint: contentFingerprint(item),
    });
  }
  return snapshots;
}

/** What Keep sends for them. Each entry's text was neutralised when it was built. */
export function attachedEntriesBlock(snapshots = []) {
  if (snapshots.length === 0) return "";
  const entries = snapshots.map((snapshot) => `<attached_entry>\nRef: ${snapshot.ref}\n${snapshot.text}\n</attached_entry>`);
  return `<attached_entries>\n${entries.join("\n")}\n</attached_entries>`;
}
