import { describe, expect, it } from "vitest";
import {
  appendDictionaryKey,
  dictionaryKeysForItem,
  itemAttachesDictionaryEntry,
  uniqueDictionaryKeys,
} from "./dictionaryAttachments.js";

describe("plural dictionary attachments", () => {
  const item = {
    type: "lexical",
    dictKeys: ["dict:wiktionary-es:mal:adj", "dict:wiktionary-es:mal:adv"],
  };

  it("keeps every attachment in saved order", () => {
    expect(dictionaryKeysForItem(item)).toEqual([
      "dict:wiktionary-es:mal:adj",
      "dict:wiktionary-es:mal:adv",
    ]);
  });

  it("matches direct and aliased attachments", () => {
    expect(itemAttachesDictionaryEntry(item, "dict:wiktionary-es:mal:adv")).toBe(true);
    expect(itemAttachesDictionaryEntry(
      item,
      "dict:wiktionary-es:mal:adverb-current",
      { "dict:wiktionary-es:mal:adv": "dict:wiktionary-es:mal:adverb-current" }
    )).toBe(true);
  });

  it("appends a new key but not an alias-equivalent duplicate", () => {
    expect(appendDictionaryKey(item.dictKeys, "dict:wiktionary-es:mal:noun")).toEqual([
      ...item.dictKeys,
      "dict:wiktionary-es:mal:noun",
    ]);
    expect(appendDictionaryKey(
      item.dictKeys,
      "dict:wiktionary-es:mal:adverb-current",
      { "dict:wiktionary-es:mal:adv": "dict:wiktionary-es:mal:adverb-current" }
    )).toEqual(item.dictKeys);
  });

  it("deduplicates alias-healed keys without reordering survivors", () => {
    expect(uniqueDictionaryKeys(["dict:a", "dict:b", "dict:a"])).toEqual(["dict:a", "dict:b"]);
  });
});
