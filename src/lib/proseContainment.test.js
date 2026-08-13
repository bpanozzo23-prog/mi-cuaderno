import { describe, expect, it, vi } from "vitest";
import { makeLexical, makePage } from "../test/factories.js";
import {
  deriveProseContainment,
  matchSnippet,
  prepareProseContainment,
  proseDocumentsFor,
} from "./proseContainment.js";

const table = (lemma, forms = {}) => ({
  id: `conj:${lemma}`,
  tenses: { "Indicative/Present": forms },
});

describe("prose document projection", () => {
  it("copies search gating and removes supported Markdown-only markers", () => {
    const page = makePage({
      title: "Visible notes",
      body: "![año](https://example.com/year.png)\n> [!NOTE]\n> **casa**\n<br>",
      noteSections: [{ id: "note-section:one", parentId: null, name: "More", body: "_casa_" }],
      source: {
        enabled: false,
        captures: [{ id: "source-capture:hidden", type: "passage", text: "casa", location: "", itemKeys: [] }],
      },
      grammar: {
        enabled: false,
        sections: [{ id: "grammar-section:hidden", parentId: null, name: "Hidden", explanation: "casa", pattern: "", examples: [] }],
      },
    });

    const documents = proseDocumentsFor([page]);
    expect(documents.map((row) => row.source)).toEqual(["page", "note"]);
    expect(documents.map((row) => row.text)).toEqual(["casa", "casa"]);
    expect(deriveProseContainment(makeLexical({ term: "NOTE" }), [page])).toEqual([]);
    expect(deriveProseContainment(makeLexical({ term: "año" }), [page])).toEqual([]);
  });

  it("includes enabled captures and Grammar explanations but never their disabled twins", () => {
    const enabled = makePage({
      title: "Enabled",
      source: {
        enabled: true,
        captures: [{ id: "source-capture:on", type: "language_note", text: "Vi la casa.", location: "p. 4", itemKeys: [] }],
      },
      grammar: {
        enabled: true,
        sections: [{ id: "grammar-section:on", parentId: null, name: "Rule", explanation: "Uso de **casa**.", pattern: "", examples: [] }],
      },
    });
    const disabled = makePage({
      title: "Disabled",
      source: {
        enabled: false,
        captures: [{ id: "source-capture:off", type: "passage", text: "casa", location: "", itemKeys: [] }],
      },
      grammar: {
        enabled: false,
        sections: [{ id: "grammar-section:off", parentId: null, name: "Rule", explanation: "casa", pattern: "", examples: [] }],
      },
    });

    const rows = deriveProseContainment(makeLexical({ term: "casa" }), [enabled, disabled]);
    expect(rows.map((row) => [row.page.title, row.source, row.label])).toEqual([
      ["Enabled", "source", "Language note · p. 4"],
      ["Enabled", "grammar", "Rule"],
    ]);
  });
});

describe("prose containment", () => {
  it("matches whole exact token runs, folds accents, and preserves ñ", () => {
    const page = makePage({ title: "Examples", body: "La casa está casada. El año fue largo; ANO no es año." });
    const phrase = makeLexical({ term: "la casa", form: "phrase" });

    expect(deriveProseContainment(makeLexical({ term: "casa" }), [page])).toMatchObject([
      { pageId: page.id, surface: "casa", matchKind: "exact" },
    ]);
    expect(deriveProseContainment(phrase, [page])).toMatchObject([{ surface: "La casa" }]);
    expect(deriveProseContainment(makeLexical({ term: "año" }), [page])[0].surface).toBe("año");
    expect(deriveProseContainment(makeLexical({ term: "ano" }), [page])[0].surface).toBe("ANO");
    expect(deriveProseContainment(makeLexical({ term: "cas" }), [page])).toEqual([]);
  });

  it("suppresses the shared fixed stop list", () => {
    const page = makePage({ body: "Quiero ir de viaje." });
    expect(deriveProseContainment(makeLexical({ term: "de" }), [page])).toEqual([]);
    expect(deriveProseContainment(makeLexical({ term: "ir" }), [page])).toHaveLength(1);
  });

  it("keeps ambiguous fui silent through injected form postings", async () => {
    const subject = makeLexical({ term: "ir", dictKey: "dict:ir" });
    const page = makePage({ body: "Ayer fui al centro." });
    const ir = { id: "dict:ir", lemma: "ir", conjugationId: "conj:ir" };
    const ser = { id: "dict:ser", lemma: "ser", conjugationId: "conj:ser" };

    const rows = await prepareProseContainment(subject, [page], {
      resolveEntries: vi.fn(async () => [{ entry: ir }]),
      getConjugations: vi.fn(async () => [table("ir", { yo: "fui" })]),
      getFormEntries: vi.fn(async () => new Map([["fui", [ir, ser]]])),
    });
    expect(rows).toEqual([]);
  });

  it("matches a safe inflection but stays silent inside a clitic-attached token", async () => {
    const subject = makeLexical({ term: "dar", dictKey: "dict:dar" });
    const safe = makePage({ title: "Safe", body: "Me da igual." });
    const clitic = makePage({ title: "Clitic", body: "Quiero dármelo mañana." });
    const entry = { id: "dict:dar", lemma: "dar", conjugationId: "conj:dar" };

    const rows = await prepareProseContainment(subject, [safe, clitic], {
      resolveEntries: vi.fn(async () => [{ entry }]),
      getConjugations: vi.fn(async () => [table("dar", { "él/ella/usted": "da" })]),
      getFormEntries: vi.fn(async () => new Map([["da", [entry]]])),
    });
    expect(rows).toMatchObject([{ page: { title: "Safe" }, surface: "da", matchKind: "inflected" }]);
  });

  it("scopes Diario alone and orders its rows newest first", () => {
    const ordinary = makePage({ title: "Page", body: "casa" });
    const old = makePage({ title: "Old", body: "casa", pageDate: "2026-08-01", createdAt: "2026-08-01T12:00:00.000Z" });
    const recent = makePage({ title: "Recent", body: "casa", pageDate: "2026-08-11", createdAt: "2026-08-11T12:00:00.000Z" });
    const rows = deriveProseContainment(
      makeLexical({ term: "casa" }),
      [old, ordinary, recent],
      new Map(),
      { sources: ["journal"] }
    );
    expect(rows.map((row) => row.page.title)).toEqual(["Recent", "Old"]);
    expect(rows.every((row) => row.journal && row.source === "journal")).toBe(true);
  });

  it("falls back to exact-only matching after any reference failure", async () => {
    const subject = makeLexical({ term: "dar", dictKey: "dict:dar" });
    const inflected = makePage({ title: "Inflected", body: "Me da igual." });
    const exact = makePage({ title: "Exact", body: "Dar las gracias." });
    const rows = await prepareProseContainment(subject, [inflected, exact], {
      resolveEntries: vi.fn(async () => { throw new Error("offline"); }),
    });
    expect(rows).toMatchObject([{ page: { title: "Exact" }, surface: "Dar", matchKind: "exact" }]);
  });
});

describe("matched snippets", () => {
  it("uses original matcher offsets and adds ellipses only where text was clipped", () => {
    const text = "Mucho antes aparece casa y mucho después.";
    const start = text.indexOf("casa");
    expect(matchSnippet(text, { start, end: start + 4 }, 6)).toBe("…arece casa y muc…");
    expect(matchSnippet("casa al final", { start: 0, end: 4 }, 4)).toBe("casa al…");
  });
});
