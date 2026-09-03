import { beforeEach, expect, it } from "vitest";
import { clearAllPersonalData, db, setPref } from "../db/db.js";
import { AI_API_KEY_PREF, AI_ENABLED_PREF, aiFeedbackReady } from "./aiPrefs.js";

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

it.each([
  ["both missing", undefined, undefined, false],
  ["missing flag with a key", undefined, "fixture-key", false],
  ["disabled with a key", false, "fixture-key", false],
  ["truthy nonboolean flag", "true", "fixture-key", false],
  ["enabled but key missing", true, undefined, false],
  ["empty key", true, "", false],
  ["whitespace key", true, " \t\n ", false],
  ["null key", true, null, false],
  ["non-string key", true, 123, false],
  ["enabled with a key", true, "fixture-key", true],
  ["enabled with a padded key", true, " fixture-key ", true],
])("requires explicit enablement and a nonblank string key: %s", async (_label, enabled, key, expected) => {
  if (enabled !== undefined) await setPref(AI_ENABLED_PREF, enabled);
  if (key !== undefined) await setPref(AI_API_KEY_PREF, key);
  expect(await aiFeedbackReady()).toBe(expected);
});
