/**
 * What an addition to a word or phrase could conflict with, as one exact string. Keep freezes it
 * with the snapshot Claude sees; `applyKeep` compares it inside its transaction and refuses to add
 * to an entry that has changed since. Compared as a string, never hashed, so two different
 * contents cannot look the same. Links are excluded: linking changes no content.
 */
const CONTENT_FIELDS = ["term", "form", "pos", "meanings", "myExamples", "notes", "noteSections", "tags"];

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value === undefined ? null : value;
}

/** Key order inside records does not matter; array order (meanings, examples) does. */
export function contentFingerprint(item) {
  return JSON.stringify(CONTENT_FIELDS.map((field) => [field, canonical(item?.[field])]));
}
