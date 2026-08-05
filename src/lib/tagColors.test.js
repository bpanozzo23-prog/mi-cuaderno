import { describe, expect, it } from "vitest";
import {
  DEFAULT_SWATCH,
  TAG_SWATCHES,
  normalizeTagColors,
  tagChipStyle,
  tagSwatchId,
} from "./tagColors.js";

describe("tag colours", () => {
  it("gives every swatch a readable pairing and a stable id", () => {
    for (const swatch of TAG_SWATCHES) {
      expect(swatch.id).toMatch(/^[a-z]+$/);
      expect(swatch.label).toBeTruthy();
      expect(swatch.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(swatch.border).toMatch(/^#[0-9A-F]{6}$/i);
    }
    expect(new Set(TAG_SWATCHES.map((swatch) => swatch.id)).size).toBe(TAG_SWATCHES.length);
  });

  it("falls back to Plain for a tag with no colour, or one naming a swatch this build lost", () => {
    expect(tagSwatchId("Slang", {})).toBe(DEFAULT_SWATCH.id);
    expect(tagSwatchId("Slang", { Slang: "chartreuse" })).toBe(DEFAULT_SWATCH.id);
    expect(tagChipStyle("Slang", { Slang: "chartreuse" })).toEqual(tagChipStyle("Slang", {}));
  });

  it("styles a tag with the swatch the owner picked", () => {
    const red = TAG_SWATCHES.find((swatch) => swatch.id === "red");

    expect(tagChipStyle("Vulgar", { Vulgar: "red" })).toEqual({
      background: red.background,
      color: red.color,
      borderColor: red.border,
    });
  });

  describe("normalizing the stored map", () => {
    it("drops unknown swatches and the default, which is what an absent entry already means", () => {
      expect(normalizeTagColors({ Slang: "red", Old: "chartreuse", Quiet: DEFAULT_SWATCH.id }))
        .toEqual({ Slang: "red" });
    });

    it("drops tags the notebook no longer has when it is told which exist", () => {
      expect(normalizeTagColors({ Slang: "red", Gone: "teal" }, ["Slang"])).toEqual({ Slang: "red" });
    });

    it("leaves every tag alone when it is not told", () => {
      expect(normalizeTagColors({ Slang: "red", Gone: "teal" })).toEqual({ Slang: "red", Gone: "teal" });
    });

    it("survives junk instead of a map", () => {
      expect(normalizeTagColors(null)).toEqual({});
      expect(normalizeTagColors(undefined)).toEqual({});
    });
  });
});
