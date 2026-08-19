import { describe, expect, it } from "vitest";
import {
  grammarShareStarter,
  notesShareStarter,
  parseSharePayload,
  sourceShareStarter,
  vocabularyShareStarter,
} from "./shareTarget.js";
import { PAGE_FOCUSES } from "./pageKinds.js";

describe("parseSharePayload", () => {
  it("returns null when no share params are present", () => {
    expect(parseSharePayload("")).toBeNull();
    expect(parseSharePayload("?foo=bar")).toBeNull();
    expect(parseSharePayload(undefined)).toBeNull();
  });

  it("returns null for whitespace-only payloads", () => {
    expect(parseSharePayload("?share_text=%20%20&share_title=%20")).toBeNull();
  });

  it("dispatches a valid share_url as a URL share, carrying the title", () => {
    expect(
      parseSharePayload("?share_url=https%3A%2F%2Fexample.com%2Farticle&share_title=Un%20art%C3%ADculo")
    ).toEqual({ kind: "url", url: "https://example.com/article", title: "Un artículo" });
  });

  it("dispatches text that is exactly one http(s) URL as a URL share (Chrome's sharing shape)", () => {
    expect(
      parseSharePayload("?share_text=https%3A%2F%2Fexample.com%2Fnota&share_title=Nota")
    ).toEqual({ kind: "url", url: "https://example.com/nota", title: "Nota" });
  });

  it("keeps prose containing a link a text share", () => {
    const text = "lee esto https://example.com/nota cuando puedas";
    expect(parseSharePayload(`?share_text=${encodeURIComponent(text)}`)).toEqual({
      kind: "text",
      text,
    });
  });

  it("dispatches a plain word as a text share", () => {
    expect(parseSharePayload("?share_text=madrugar")).toEqual({ kind: "text", text: "madrugar" });
  });

  it("passes long prose through whole", () => {
    const prose = "Cuando despertó, el dinosaurio todavía estaba allí, esperando junto a la ventana.";
    expect(parseSharePayload(`?share_text=${encodeURIComponent(prose)}`)).toEqual({
      kind: "text",
      text: prose,
    });
  });

  it("treats a non-http scheme as text, not as a URL share", () => {
    expect(parseSharePayload("?share_url=javascript%3Aalert(1)&share_text=hola")).toEqual({
      kind: "text",
      text: "hola",
    });
    expect(parseSharePayload("?share_text=ftp%3A%2F%2Fexample.com%2Ffile")).toEqual({
      kind: "text",
      text: "ftp://example.com/file",
    });
  });

  it("falls back to searching a title-only share", () => {
    expect(parseSharePayload("?share_title=madrugar")).toEqual({ kind: "text", text: "madrugar" });
  });
});

describe("sourceShareStarter", () => {
  it("builds a Source-notebook starter with no preselected format", () => {
    const starter = sourceShareStarter({ url: "https://example.com/a", title: "Título" });
    expect(starter).toEqual({
      pageFocus: PAGE_FOCUSES.source,
      collectionEnabled: true,
      sourceEnabled: true,
      grammarEnabled: false,
      noteSections: [],
      groupNames: [],
      sectionNames: [],
      sourceFormat: "",
      sourceUrl: "https://example.com/a",
      title: "Título",
    });
  });

  it("defaults the title to empty", () => {
    expect(sourceShareStarter({ url: "https://example.com/a" }).title).toBe("");
  });
});

describe("notesShareStarter", () => {
  it("builds the blank Notes starter with the shared URL as a media link", () => {
    expect(notesShareStarter({ url: "https://vm.tiktok.com/x", title: "Cinco respuestas" })).toEqual({
      pageFocus: PAGE_FOCUSES.notes,
      collectionEnabled: false,
      sourceEnabled: false,
      grammarEnabled: false,
      noteSections: [],
      groupNames: [],
      sectionNames: [],
      sourceFormat: "",
      mediaLinks: [{ url: "https://vm.tiktok.com/x", label: "Cinco respuestas" }],
      title: "Cinco respuestas",
    });
  });

  it("leaves the title and media label empty when the sender supplies no title", () => {
    const starter = notesShareStarter({ url: "https://vm.tiktok.com/x" });
    expect(starter.title).toBe("");
    expect(starter.mediaLinks).toEqual([{ url: "https://vm.tiktok.com/x", label: "" }]);
  });
});

describe("vocabularyShareStarter", () => {
  it("builds the blank Vocabulary starter with the shared URL as a media link", () => {
    const starter = vocabularyShareStarter({
      url: "https://vm.tiktok.com/x",
      title: "Formas de responder",
    });
    expect(starter.pageFocus).toBe(PAGE_FOCUSES.vocabulary);
    expect(starter.collectionEnabled).toBe(true);
    expect(starter.sourceEnabled).toBe(false);
    expect(starter.grammarEnabled).toBe(false);
    expect(starter.groupNames).toEqual([]);
    expect(starter.mediaLinks).toEqual([
      { url: "https://vm.tiktok.com/x", label: "Formas de responder" },
    ]);
    expect(starter.title).toBe("Formas de responder");
  });
});

describe("grammarShareStarter", () => {
  it("builds a Grammar-guide starter with no preselected sections and the video as a media link", () => {
    const starter = grammarShareStarter({ url: "https://vm.tiktok.com/x", title: "Ser vs estar" });
    expect(starter).toEqual({
      pageFocus: PAGE_FOCUSES.grammar,
      collectionEnabled: true,
      sourceEnabled: false,
      grammarEnabled: true,
      noteSections: [],
      groupNames: [],
      sectionNames: [],
      sourceFormat: "",
      mediaLinks: [{ url: "https://vm.tiktok.com/x", label: "Ser vs estar" }],
      title: "Ser vs estar",
    });
  });

  it("defaults the title (and media label) to empty", () => {
    const starter = grammarShareStarter({ url: "https://vm.tiktok.com/x" });
    expect(starter.title).toBe("");
    expect(starter.mediaLinks).toEqual([{ url: "https://vm.tiktok.com/x", label: "" }]);
  });
});
