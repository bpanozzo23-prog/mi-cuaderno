/**
 * The attached entries Keep may add to, frozen when Keep opens.
 *
 * Claude has only seen an entry in full when it was attached, so only those can receive
 * additions. For each, one reading of the notebook gives three things that must agree: the text
 * sent (with meanings numbered `m1`, `m2`…), which meaning ID each number names, and a content
 * fingerprint. Apply compares the fingerprint inside its transaction and refuses to add to an
 * entry that has changed since, rather than merging into something Claude never saw.
 *
 * Members of an attached group were seen only in a short form, so they are frozen the same way
 * but in that form (`short: true`), at the detail Pregunta sent; Keep may give them examples,
 * tags and links, never meanings or notes. This is distinct from `truncated`, a single
 * attachment cut short, which keeps its own tags-and-links-only rule.
 *
 * Only this module's `text` leaves the device; IDs and fingerprints stay here.
 */

import { capped, lexicalLines, shownMeanings } from "./askContext.js";
import { shortFormEntry } from "./askGroups.js";
import { contentFingerprint } from "./contentFingerprint.js";

export { contentFingerprint };

/**
 * One frozen snapshot per attached word or phrase, using the `c#` refs Keep's candidates gave
 * them: [{ ref, itemId, term, text, truncated, short, meaningIds: { m1: "meaning:…" },
 * fingerprint }]. Group members (`matchedBy: "group"`) come in short form at the detail
 * `groupDetails` names. Pages, missing entries and merely related candidates are left out.
 */
export function keepAttachedSnapshots(items = [], candidates = [], { groupDetails = new Map() } = {}) {
  const byId = new Map(items.map((item) => [item?.id, item]));
  const snapshots = [];
  for (const candidate of candidates) {
    if (candidate.matchedBy !== "attached" && candidate.matchedBy !== "group") continue;
    const item = byId.get(candidate.itemId);
    if (item?.type !== "lexical") continue;
    if (candidate.matchedBy === "group") {
      const detail = groupDetails.get(item.id) === "examples" ? "examples" : "meanings";
      const { text, meaningIds } = shortFormEntry(item, { detail, meaningRefs: true });
      snapshots.push({
        ref: candidate.ref,
        itemId: item.id,
        term: candidate.term,
        text,
        truncated: false,
        short: true,
        detail,
        meaningIds,
        fingerprint: contentFingerprint(item),
      });
      continue;
    }
    const { text, truncated } = capped(lexicalLines(item, items, { meaningRefs: true }).filter(Boolean).join("\n"));
    snapshots.push({
      ref: candidate.ref,
      itemId: item.id,
      term: candidate.term,
      text,
      truncated,
      short: false,
      meaningIds: Object.fromEntries(shownMeanings(item).map((meaning, index) => [`m${index + 1}`, meaning.id])),
      fingerprint: contentFingerprint(item),
    });
  }
  return snapshots;
}

const SHORT_FORM = {
  meanings: "Short form (from a group; meanings only): examples, tags and links only",
  examples: "Short form (from a group; meanings and examples): examples, tags and links only",
};

/** What Keep sends for them. Each entry's text was neutralised when it was built. */
export function attachedEntriesBlock(snapshots = []) {
  if (snapshots.length === 0) return "";
  const entries = snapshots.map((snapshot) => {
    const marker = snapshot.short ? `${SHORT_FORM[snapshot.detail] || SHORT_FORM.meanings}\n` : "";
    return `<attached_entry>\nRef: ${snapshot.ref}\n${marker}${snapshot.text}\n</attached_entry>`;
  });
  return `<attached_entries>\n${entries.join("\n")}\n</attached_entries>`;
}
