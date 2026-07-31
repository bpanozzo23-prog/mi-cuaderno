/**
 * Search normalization per brief section 8: strip acute accents and diaeresis,
 * but PRESERVE ñ as a distinct letter ("año" must never match "ano").
 *
 * The prototype's normalize() strips ñ via a blanket NFD + combining-mark removal.
 * The fix: swap ñ for a sentinel that NFD cannot touch, decompose, then restore it.
 * U+0001 is used as the sentinel because it cannot occur in dictionary text.
 *
 * This is the app's copy of the function proven in the Phase 0.5 spike
 * (pipeline/spike/lib/normalize.mjs). The Phase 2 pipeline imports this one.
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
