import { describe, expect, it, vi } from "vitest";
import { newPageGroup } from "./collections.js";
import { newGrammarExample, newGrammarSection, newNoteSection, newSourceCapture } from "./pageKinds.js";
import {
  contextDocumentsFor,
  deriveContextMatchOccurrences,
  deriveContextNeighborhoods,
  mentionedHereFor,
  prepareContextIndex,
} from "./contextConnections.js";
import { makeLexical, makePage } from "../test/factories.js";

describe("Phase 26 context connections", () => {
  it("projects only active owner-visible prose fields with stable attachment targets", () => {
    const note = newNoteSection({ name: "Contrasts", body: "**saqué** ayer" });
    const capture = newSourceCapture({
      type: "passage",
      text: "sacar la basura",
      location: "p. 4",
      reflection: "Reflection is not scanned",
    });
    const example = newGrammarExample({ es: "Saqué la basura", en: "I took it out", note: "not scanned" });
    const grammarSection = newGrammarSection({
      name: "Preterite",
      explanation: "Use sacar for one event.",
      pattern: "not scanned",
      examples: [example],
    });
    const active = makePage({
      title: "Active",
      body: "Overview mentions sacar.",
      noteSections: [note],
      source: { enabled: true, creator: "not scanned", captures: [capture] },
      grammar: { enabled: true, keyIdea: "not scanned", sections: [grammarSection] },
    });
    const disabled = makePage({
      source: { enabled: false, captures: [newSourceCapture({ text: "hidden source" })] },
      grammar: { enabled: false, sections: [newGrammarSection({ explanation: "hidden grammar" })] },
    });
    const journal = makePage({ title: "A day", pageDate: "2026-08-12", body: "Hoy saqué basura." });

    const rows = contextDocumentsFor([active, disabled, journal]);

    expect(rows.map((row) => row.contextId)).toEqual([
      `${active.id}:notes:overview`,
      `${active.id}:notes:${note.id}`,
      `${active.id}:source:${capture.id}`,
      `${active.id}:grammar:${grammarSection.id}:overview`,
      `${active.id}:grammar:${grammarSection.id}:example:${example.id}`,
      `${disabled.id}:notes:overview`,
      `${journal.id}:journal`,
    ]);
    expect(rows.map((row) => row.text).join("\n")).not.toContain("not scanned");
    expect(rows.find((row) => row.kind === "grammar_example")?.text).toBe("Saqué la basura");
  });

  it("finds all whole-token exact occurrences, ranks phrases first, and preserves ñ", async () => {
    const ano = makeLexical({ term: "ano", dictKey: null });
    const year = makeLexical({ term: "año", dictKey: null });
    const sacar = makeLexical({ term: "sacar", dictKey: null });
    const phrase = makeLexical({ form: "phrase", term: "sacar la basura", dictKey: null });
    const page = makePage({ body: "Cada año quiero sacar la basura; sacar no es ano." });
    const index = await prepareContextIndex([ano, year, sacar, phrase, page]);
    const contextId = `${page.id}:notes:overview`;

    expect(index.matchesByContextId.get(contextId).find((row) => row.itemId === year.id).surface).toBe("año");
    expect(index.matchesByContextId.get(contextId).find((row) => row.itemId === ano.id).surface).toBe("ano");
    expect(index.matchesByContextId.get(contextId).find((row) => row.itemId === sacar.id).occurrences).toHaveLength(2);
    expect(mentionedHereFor(index, contextId).map((row) => row.itemId)).toEqual([
      phrase.id,
      ano.id,
      year.id,
      sacar.id,
    ]);
  });

  it("uses safe attached forms and falls back to exact-only when reference reads fail", async () => {
    const sacar = makeLexical({ term: "sacar", dictKey: "dict:sacar" });
    const page = makePage({ body: "Ayer saqué la basura. Mañana quiero sacar más." });
    const deps = {
      resolveEntries: vi.fn(async () => [{ entry: { lemma: "sacar", conjugationId: "conj:sacar" } }]),
      getConjugations: vi.fn(async () => [{
        tenses: { "Indicative/Preterite": { yo: "saqué" } },
        gerund: "sacando",
        pastParticiple: "sacado",
      }]),
      getFormEntries: vi.fn(async (forms) => new Map(forms.map((form) => [form, [{ lemma: "sacar" }]]))),
    };

    const enriched = await prepareContextIndex([sacar, page], deps);
    const enrichedRow = enriched.matchesByItemId.get(sacar.id)[0];
    expect(enrichedRow.matchKind).toBe("exact");
    expect(enrichedRow.occurrences.map((occurrence) => occurrence.surface)).toEqual(["sacar"]);

    const inferredOnly = makePage({ body: "Ayer saqué la basura." });
    const inferred = await prepareContextIndex([sacar, inferredOnly], deps);
    expect(inferred.matchesByItemId.get(sacar.id)[0].matchKind).toBe("inflected");

    const fallback = await prepareContextIndex([sacar, inferredOnly], {
      resolveEntries: vi.fn(async () => { throw new Error("offline"); }),
    });
    expect(fallback.matchesByItemId.has(sacar.id)).toBe(false);

    const ambiguous = await prepareContextIndex([sacar, inferredOnly], {
      ...deps,
      getFormEntries: vi.fn(async (forms) => new Map(forms.map((form) => [form, [
        { lemma: "sacar" },
        { lemma: "saque" },
      ]]))),
    });
    expect(ambiguous.matchesByItemId.has(sacar.id)).toBe(false);
  });

  it("suppresses page-level edges but still offers an unattached exact context", async () => {
    const sacar = makeLexical({ term: "sacar", dictKey: null });
    const openCapture = newSourceCapture({ text: "Quiero sacar esto." });
    const attachedCapture = newSourceCapture({ text: "También sacar aquello.", itemKeys: [sacar.id] });
    const page = makePage({
      body: "La idea general es sacar.",
      linkedKeys: [sacar.id],
      source: { enabled: true, captures: [openCapture, attachedCapture] },
    });
    const index = await prepareContextIndex([sacar, page]);

    expect(mentionedHereFor(index, `${page.id}:notes:overview`)).toEqual([]);
    expect(mentionedHereFor(index, `${page.id}:source:${openCapture.id}`).map((row) => row.itemId))
      .toEqual([sacar.id]);
    expect(mentionedHereFor(index, `${page.id}:source:${attachedCapture.id}`)).toEqual([]);
  });

  it("keeps duplicate normalized surfaces visible but excludes them from prose evidence", async () => {
    const si = makeLexical({ term: "si", dictKey: null });
    const accented = makeLexical({ term: "sí", dictKey: null });
    const page = makePage({ body: "Sí, si quieres." });
    const index = await prepareContextIndex([si, accented, page]);
    const rows = index.matchesByContextId.get(`${page.id}:notes:overview`);

    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.ambiguous)).toBe(true);
    expect(mentionedHereFor(index, `${page.id}:notes:overview`)).toHaveLength(2);
    expect(deriveContextNeighborhoods(si.id, index)).toEqual([]);
  });

  it("derives neighborhoods from named structure or two independent prose contexts", async () => {
    const sacar = makeLexical({ term: "sacar", dictKey: null });
    const basura = makeLexical({ term: "basura", dictKey: null });
    const casa = makeLexical({ term: "casa", dictKey: null });
    const phrase = makeLexical({ form: "phrase", term: "sacar la basura", dictKey: null });
    const named = newPageGroup("Chores", [sacar.id, casa.id]);
    const collection = makePage({
      linkedKeys: [sacar.id, casa.id, basura.id],
      collection: { enabled: true, groups: [named] },
      body: "sacar la basura",
    });
    const second = makePage({ body: "Necesito sacar algo de la basura." });
    const journal = makePage({ pageDate: "2026-08-12", body: "Voy a sacar hoy la basura." });
    const items = [sacar, basura, casa, phrase, collection, second, journal];
    const index = await prepareContextIndex(items);
    const neighborhoods = deriveContextNeighborhoods(sacar.id, index, items);

    expect(neighborhoods.map((row) => row.itemId)).toEqual([casa.id, basura.id]);
    expect(neighborhoods[0]).toMatchObject({ explicitCount: 1, contextCount: 1 });
    expect(neighborhoods[1]).toMatchObject({ explicitCount: 0, proseCount: 3, contextCount: 3 });
    expect(neighborhoods.some((row) => row.itemId === phrase.id)).toBe(false);
  });

  it("does not promote repeated prose when every context belongs to one Page", async () => {
    const sacar = makeLexical({ term: "sacar", dictKey: null });
    const basura = makeLexical({ term: "basura", dictKey: null });
    const first = newNoteSection({ name: "First", body: "Necesito sacar la basura." });
    const second = newNoteSection({ name: "Second", body: "Voy a sacar otra basura." });
    const page = makePage({ noteSections: [first, second] });
    const items = [sacar, basura, page];
    const index = await prepareContextIndex(items);
    expect(deriveContextNeighborhoods(sacar.id, index, items)).toEqual([]);
  });

  it("derives exact occurrence rows without requiring reference reads", () => {
    const word = makeLexical({ term: "leer", dictKey: null });
    const documents = [{ contextId: "one", text: "leer y releer; leer" }];
    const rows = deriveContextMatchOccurrences([word], documents);
    expect(rows.map((row) => row.surface)).toEqual(["leer", "leer"]);
  });
});
