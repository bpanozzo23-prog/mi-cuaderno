/**
 * Phase 5f's strong duplicate comparison is intentionally NOT search normalization.
 * Search strips accents so that `si` can find `sí`; a duplicate warning must keep those
 * headings distinct so legitimate homographs remain easy to create.
 *
 * This key is comparison-only. It never rewrites the term or title the owner stores.
 */
function strongHeadingKey(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("es");
}

const headingOfType = (item, type) => {
  if (type === "lexical" && item?.type === "lexical") return item.term;
  if (type === "page" && item?.type === "page") return item.title;
  return null;
};

/**
 * Finds existing PERSONAL headings of the same content type.
 *
 * Word and phrase are forms of the same lexical type (§7), so they compare with each other.
 * Dictionary rows have no personal `type` and are ignored by construction.
 */
export function findPersonalHeadingDuplicates(items = [], type, heading) {
  if (type !== "lexical" && type !== "page") return [];
  const key = strongHeadingKey(heading);
  if (!key) return [];

  return items.filter((item) => {
    const existing = headingOfType(item, type);
    return existing !== null && strongHeadingKey(existing) === key;
  });
}
