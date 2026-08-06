import { describe, it, expect } from "vitest";
import { pickSpanishVoice } from "./speech.js";

const voice = (lang, name = lang) => ({ lang, name });

describe("choosing a Spanish voice", () => {
  it("prefers Mexican Spanish, as the rest of this notebook does", () => {
    const voices = [voice("en-US"), voice("es-ES"), voice("es-MX"), voice("es-US")];

    expect(pickSpanishVoice(voices).lang).toBe("es-MX");
  });

  it("falls through the Latin American preferences in order", () => {
    expect(pickSpanishVoice([voice("es-ES"), voice("es-419"), voice("es-US")]).lang).toBe("es-419");
    expect(pickSpanishVoice([voice("es-ES"), voice("es-US")]).lang).toBe("es-US");
  });

  it("takes any Spanish rather than none when no preferred variety exists", () => {
    expect(pickSpanishVoice([voice("en-GB"), voice("es-ES")]).lang).toBe("es-ES");
  });

  it("reads a tag written with an underscore, as some platforms do", () => {
    expect(pickSpanishVoice([voice("es_MX")]).lang).toBe("es_MX");
  });

  it("is not fooled by a language that merely starts with the same letters", () => {
    // "et" is Estonian; only a genuine es- tag counts.
    expect(pickSpanishVoice([voice("et-EE"), voice("en-US")])).toBeNull();
  });

  it("answers null for a device with no Spanish voice, so the button can hide", () => {
    expect(pickSpanishVoice([voice("en-US"), voice("fr-FR")])).toBeNull();
    expect(pickSpanishVoice([])).toBeNull();
    expect(pickSpanishVoice(undefined)).toBeNull();
  });
});
