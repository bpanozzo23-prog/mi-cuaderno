/**
 * The two preferences that gate the AI feature (brief §9).
 *
 * They live in their own module because `src/db/backup.js` needs the key name in order to keep it
 * out of every export (§10: the API key is never exported), and must not pull the request module —
 * and its prompt — along for that.
 *
 * `aiEnabled` is ordinary configuration and rides along in backups like any other preference.
 * `aiApiKey` never leaves the device: it is excluded on export and refused on import, so a restore
 * always lands with the feature off until the owner enters the key again.
 */
import { getPref } from "../db/db.js";

export const AI_ENABLED_PREF = "aiEnabled";
export const AI_API_KEY_PREF = "aiApiKey";

/**
 * Both halves are required: turning the feature on without a key, or restoring a backup that
 * carries the flag but never the key, must not offer a button that can only fail.
 */
export async function aiFeedbackReady() {
  const [enabled, key] = await Promise.all([getPref(AI_ENABLED_PREF), getPref(AI_API_KEY_PREF)]);
  return enabled === true && typeof key === "string" && key.trim() !== "";
}
