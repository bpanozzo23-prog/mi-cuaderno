/**
 * Search normalization per brief section 8: strip acute accents and diaeresis,
 * but PRESERVE ñ as a distinct letter ("año" must never match "ano").
 *
 * The prototype's normalize() strips ñ via a blanket NFD + combining-mark removal.
 * The fix: swap ñ for a sentinel that NFD cannot touch, decompose, then restore it.
 * U+0001 is used as the sentinel because it cannot occur in dictionary text.
 */
const N_SENTINEL = "";
const COMBINING_MARKS = /[̀-ͯ]/g;

export function normalize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFC")
    .replaceAll("ñ", N_SENTINEL)
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replaceAll(N_SENTINEL, "ñ");
}

/**
 * Canonical ID per brief section 6: derived from identity, never display spelling alone.
 *
 * Case is PRESERVED in the lemma part: lowercasing would conflate proper nouns with
 * common ones (FIFA/fifa, Papa/papa). Case-insensitive matching is search's job
 * (normalize() above), not the identity's.
 */
export function canonicalId(lemma, pos, etymologyKey) {
  const slug = (v) =>
    String(v ?? "")
      .normalize("NFC")
      .replace(/\s+/g, "_")
      .replace(/[^\p{L}\p{N}_-]/gu, "");
  const parts = [slug(lemma), slug(pos)];
  if (etymologyKey !== undefined && etymologyKey !== null && etymologyKey !== "") {
    parts.push(slug(etymologyKey));
  }
  return `dict:wiktionary-es:${parts.join(":")}`;
}
