import { describe, expect, it } from "vitest";
import {
  connectionFromResolvedEntryLink,
  connectionsFromResolvedEntryLinks,
} from "./resolvedConnections.js";

const owner = { id: "user:page", type: "page", title: "Source", linkedKeys: [] };
const entry = { id: "dict:canonical", lemma: "chamba", pos: "noun" };
const resolved = {
  canonicalKey: entry.id,
  entry,
  rawKeys: ["dict:old", entry.id],
  relationship: { type: "found_in", subject: "owner", note: "From the interview." },
  conflict: null,
};

describe("connections from resolved dictionary links", () => {
  it("uses resolver metadata from the personal owner's perspective", () => {
    expect(connectionFromResolvedEntryLink(owner, resolved)).toEqual({
      kind: "entry",
      key: entry.id,
      entry,
      ownerKey: owner.id,
      targetKey: entry.id,
      rawKeys: ["dict:old", entry.id],
      type: "found_in",
      subject: "owner",
      note: "From the interview.",
      label: "Found in",
      relationship: { type: "found_in", subject: "owner", note: "From the interview." },
    });
  });

  it("inverts a directional relationship for read-only dictionary detail", () => {
    expect(connectionFromResolvedEntryLink(owner, resolved, { perspective: "target" }))
      .toMatchObject({
        kind: "item",
        key: owner.id,
        item: owner,
        label: "Contains",
        relationship: { type: "found_in", subject: "target", note: "From the interview." },
      });
  });

  it("omits unresolved conflicts rather than selecting one description", () => {
    expect(connectionsFromResolvedEntryLinks(owner, [{ ...resolved, conflict: {} }])).toEqual([]);
  });
});
