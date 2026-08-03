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

/** Stable identity for an editable group inside one Collection page. */
export function newPageGroupKey() {
  return `page-group:${newId()}`;
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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPageGroupKey(key) {
  return typeof key === "string" && key.startsWith("page-group:") && UUID_PATTERN.test(key.slice(11));
}
