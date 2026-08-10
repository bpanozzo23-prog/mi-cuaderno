import { getConjugation, resolveEntry } from "../db/ref/entries.js";
import { pickCloze, verbForms } from "./cloze.js";
import { cardDirection } from "./review.js";

/**
 * Snapshots the question face of every vocabulary card for one session.
 *
 * The reference dictionary is an optional enrichment seam: personal examples can make
 * cloze cards on their own, while a resolved entry can add stock examples and inflected
 * verb matches. A missing installation, stale attachment, or failed read always falls
 * back to an ordinary usable card.
 */
export async function preparePracticeCards(
  items,
  {
    direction = "forward",
    random = Math.random,
    resolve = resolveEntry,
    loadConjugation = getConjugation,
  } = {}
) {
  const cards = items.map((item) => ({
    ...item,
    direction: cardDirection(item, direction, random),
  }));

  const keys = [
    ...new Set(
      cards
        .filter((card) => card.direction !== "reverse")
        .map((card) => card.dictKey)
        .filter(Boolean)
    ),
  ];
  const resolved = await Promise.all(keys.map(async (key) => {
    try {
      return [key, (await resolve(key))?.entry || null];
    } catch {
      return [key, null];
    }
  }));
  // Keep the stored attachment as the map key: resolveEntry may have followed an alias
  // to a differently named canonical entry behind it.
  const entries = new Map(resolved.filter(([, entry]) => entry));

  const conjugationIds = [
    ...new Set(resolved.map(([, entry]) => entry?.conjugationId).filter(Boolean)),
  ];
  const loaded = await Promise.all(conjugationIds.map(async (id) => {
    try {
      return [id, await loadConjugation(id)];
    } catch {
      return [id, null];
    }
  }));
  const tables = new Map(loaded.filter(([, table]) => table));

  return cards.map((card) => {
    // Reverse shows the meanings and asks for the term. A sentence containing that term
    // would expose the answer, so reverse and cloze are deliberately mutually exclusive.
    if (card.direction === "reverse") return card;
    const entry = card.dictKey ? entries.get(card.dictKey) || null : null;
    const table = entry?.conjugationId ? tables.get(entry.conjugationId) : null;
    const cloze = pickCloze(card, entry, {
      forms: table ? verbForms(table) : null,
      rng: random,
    });
    return cloze ? { ...card, cloze, face: "cloze" } : card;
  });
}
