/**
 * Namespaced keys per brief section 6.
 * Personal items: "user:<uuid>". Reference entries (Phase 2): "dict:wiktionary-es:<canonical-id>".
 */

export function newId() {
  return crypto.randomUUID();
}

export function newUserKey() {
  return `user:${newId()}`;
}

export function newEventId() {
  return newId();
}

/** Stable personal meaning identity; deliberately unrelated to dictionary sense IDs. */
export function newMeaningKey() {
  return `meaning:${newId()}`;
}

export function isUserKey(key) {
  return typeof key === "string" && key.startsWith("user:");
}

export function isDictKey(key) {
  return typeof key === "string" && key.startsWith("dict:");
}

export function isMeaningKey(key) {
  return typeof key === "string" && key.startsWith("meaning:");
}
