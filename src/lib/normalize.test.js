import { describe, it, expect } from "vitest";
import { normalize } from "./normalize.js";

describe("search normalization (brief section 8)", () => {
  it("lowercases and strips acute accents", () => {
    expect(normalize("sacó")).toBe("saco");
    expect(normalize("RÁPIDAS")).toBe("rapidas");
    expect(normalize("Está")).toBe("esta");
  });

  it("strips the diaeresis", () => {
    expect(normalize("pingüino")).toBe("pinguino");
  });

  it("keeps ñ distinct — 'año' must never match a search for 'ano'", () => {
    expect(normalize("año")).toBe("año");
    expect(normalize("ano")).toBe("ano");
    expect(normalize("año")).not.toBe(normalize("ano"));
    expect(normalize("Ñoño")).toBe("ñoño");
  });

  it("handles empty and missing input", () => {
    expect(normalize("")).toBe("");
    expect(normalize(null)).toBe("");
    expect(normalize(undefined)).toBe("");
  });
});
