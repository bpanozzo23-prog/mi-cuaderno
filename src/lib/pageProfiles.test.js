import { describe, expect, it } from "vitest";
import { effectivePageKind, isPageProfile, PAGE_KINDS, PAGE_PROFILES } from "./pageProfiles.js";

describe("page profiles", () => {
  it("lets Collection win over pageDate", () => {
    expect(effectivePageKind({ pageProfile: PAGE_PROFILES.collection, pageDate: "2026-08-03" })).toBe(
      PAGE_KINDS.collection
    );
  });

  it("keeps dated General and legacy pages as Journal entries", () => {
    expect(effectivePageKind({ pageProfile: PAGE_PROFILES.general, pageDate: "2026-08-03" })).toBe(
      PAGE_KINDS.journal
    );
    expect(effectivePageKind({ pageDate: "2026-08-03" })).toBe(PAGE_KINDS.journal);
    expect(effectivePageKind({ pageProfile: PAGE_PROFILES.general, pageDate: null })).toBe(PAGE_KINDS.general);
  });

  it("recognizes only the two stored profiles", () => {
    expect(isPageProfile("general")).toBe(true);
    expect(isPageProfile("collection")).toBe(true);
    expect(isPageProfile("journal")).toBe(false);
    expect(isPageProfile(undefined)).toBe(false);
  });
});
