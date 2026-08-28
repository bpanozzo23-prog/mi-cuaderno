import { shufflePracticeItems } from "./practice.js";
import { connectionsFor } from "./relationships.js";
import { meaningById } from "./relationships.js";

/**
 * One prompt per personal lexical endpoint with at least one direct, confirmed Similar meaning
 * neighbor. `connectionsFor` keeps stored-once backlinks and legacy reciprocal rows conceptual;
 * this layer deliberately adds no transitive closure and never reads raw gloss suggestions.
 */
export function deriveSimilarMeaningPrompts(items = []) {
  const prompts = [];
  for (const focal of items) {
    if (focal?.type !== "lexical") continue;
    const similar = connectionsFor(focal, items)
      .filter((connection) =>
        connection.kind === "item"
        && connection.item?.type === "lexical"
        && connection.type === "similar_meaning"
      );
    const seen = new Set();
    const neighbors = similar
      .filter((connection) => !connection.focalMeaningId)
      .map((connection) => connection.item)
      .filter((neighbor) => {
        if (seen.has(neighbor.id)) return false;
        seen.add(neighbor.id);
        return true;
      });
    if (neighbors.length > 0) {
      prompts.push({ id: focal.id, focal, neighbors });
    }
    for (const focalMeaning of focal.meanings || []) {
      const answers = similar
        .filter((connection) => connection.focalMeaningId === focalMeaning.id)
        .map((connection) => ({
          item: connection.item,
          meaning: meaningById(connection.item, connection.connectedMeaningId),
        }))
        .filter(({ meaning }) => meaning);
      if (answers.length) {
        prompts.push({
          id: `${focal.id}:${focalMeaning.id}`,
          focal,
          focalMeaning,
          answers,
        });
      }
    }
  }
  return prompts;
}

/** Avoids duplicate size choices: with eight prompts, “10” and “All 8” mean the same thing. */
export function similarMeaningRecallLimits(count) {
  const available = Math.max(0, Math.floor(Number(count) || 0));
  if (available === 0) return [];
  return [
    ...(available > 10 ? [10] : []),
    ...(available > 20 ? [20] : []),
    "all",
  ];
}

/** Selects one shuffled visit-local deck from an already-derived prompt snapshot. */
export function selectSimilarMeaningRecallDeck(
  prompts = [],
  { limit = "all", random = Math.random } = {}
) {
  const shuffled = shufflePracticeItems(prompts, random);
  const count = limit === "all"
    ? shuffled.length
    : Math.min(shuffled.length, Math.max(0, Math.floor(Number(limit) || 0)));
  return shuffled.slice(0, count);
}
