import { describe, it, expect } from "vitest";
import { searchItems, TIER } from "./search.js";
import { newLexical, newPage } from "../db/items.js";
import { meaningsFromTranslation, newMeaning } from "./meanings.js";

const lexical = ({ translation = "", ...fields }) =>
  newLexical({ ...fields, meanings: meaningsFromTranslation(translation) });
const page = (fields) => newPage(fields);

const notebook = [
  lexical({ term: "saco", translation: "sack, bag", pos: "noun" }),
  lexical({ term: "sacó", translation: "he/she took out" }),
  lexical({ term: "sacar", translation: "to take out; to get", tags: ["verbs"] }),
  lexical({ term: "año", translation: "year" }),
  lexical({ term: "ano", translation: "anus" }),
  lexical({
    term: "madrugar",
    translation: "to get up very early",
    notes: "A quien madruga, Dios le ayuda.",
    myExamples: [{ es: "Odio madrugar.", en: "I hate getting up early." }],
  }),
  page({ title: "Preterite vs imperfect", body: "Completed actions versus the ongoing background." }),
  page({ title: "Roma (2018)", body: "Cuarón film. Lots of Mexican usage.", pageDate: "2026-07-20", tags: ["films"] }),
];

const terms = (query) =>
  searchItems(notebook, query).map((r) => (r.item.type === "page" ? r.item.title : r.item.term));

describe("the brief's acceptance cases", () => {
  it("finds 'sacó' when searching 'saco', with the exact 'saco' ranked first", () => {
    const results = searchItems(notebook, "saco");
    expect(results[0].item.term).toBe("saco");
    expect(results[0].tier).toBe(TIER.exactTerm);
    expect(results.map((r) => r.item.term)).toContain("sacó");
    expect(results.find((r) => r.item.term === "sacó").tier).toBe(TIER.normalizedTerm);
  });

  it("never matches 'año' when searching 'ano'", () => {
    expect(terms("ano")).not.toContain("año");
    expect(terms("ano")).toContain("ano");
  });

  it("never matches 'ano' when searching 'año'", () => {
    expect(terms("año")).not.toContain("ano");
    expect(terms("año")).toContain("año");
  });

  it("finds a page by its title and by its body text", () => {
    expect(terms("preterite")).toContain("Preterite vs imperfect");
    expect(terms("ongoing background")).toContain("Preterite vs imperfect");
  });
});

describe("ranking", () => {
  it("puts an exactly typed accent above an accent-blind match", () => {
    const results = searchItems(notebook, "sacó");
    expect(results[0].item.term).toBe("sacó");
    expect(results[0].tier).toBe(TIER.exactTerm);
  });

  it("orders term matches above translation, tag and free-text matches", () => {
    const tiers = searchItems(notebook, "sacar").map((r) => r.tier);
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
    expect(tiers[0]).toBe(TIER.exactTerm);
  });

  it("treats English to Spanish lookup as first-class", () => {
    const results = searchItems(notebook, "take out");
    expect(results.map((r) => r.item.term)).toContain("sacar");
    expect(results.find((r) => r.item.term === "sacar").tier).toBe(TIER.translation);
  });

  it("holds tier 3 open for the Phase 2 inflected-form index", () => {
    expect(TIER.inflectedForm).toBe(3);
    expect(TIER.translation).toBeGreaterThan(TIER.inflectedForm);
  });
});

describe("match reasons", () => {
  it.each([
    ["saco", "saco", "exact match"],
    ["saco", "sacó", "ignoring accents"],
    ["take out", "sacar", "English meaning"],
    ["verbs", "sacar", 'tag "verbs"'],
    ["Dios le ayuda", "madrugar", "in your notes"],
    ["hate getting up", "madrugar", "in your examples"],
  ])("explains %s matching %s as %s", (query, term, reason) => {
    const hit = searchItems(notebook, query).find((r) => r.item.term === term);
    expect(hit?.reason).toBe(reason);
  });

  it("explains a page body match", () => {
    const hit = searchItems(notebook, "Cuarón").find((r) => r.item.title === "Roma (2018)");
    expect(hit.reason).toBe("in the page");
  });
});

describe("structured meanings", () => {
  // A query is typed on one line, so gloss search joins adjacent personal meanings with spaces.
  const multi = [lexical({ term: "de repente", translation: "suddenly\nall at once" })];

  it("finds a reading on any line", () => {
    expect(searchItems(multi, "suddenly")).toHaveLength(1);
    expect(searchItems(multi, "all at once")).toHaveLength(1);
  });

  it("matches across the line break, treating it as a space", () => {
    expect(searchItems(multi, "suddenly all")).toHaveLength(1);
  });

  it("still refuses a phrase that is not there", () => {
    expect(searchItems(multi, "suddenly never")).toEqual([]);
  });
});

describe("meaning-level context", () => {
  const structured = [newLexical({
    term: "sacar",
    meanings: [newMeaning({
      gloss: "withdraw",
      usageCue: "sacar dinero",
      regions: ["Mexico"],
      usageLabels: ["figurative"],
      note: "Usually from an account",
      examples: [{ es: "Saqué efectivo.", en: "I withdrew cash." }],
    })],
  })];

  it.each([
    ["withdraw", "English meaning"],
    ["account", "in your notes"],
    ["withdrew cash", "in your examples"],
    ["sacar dinero", "in a meaning"],
    ["Mexico", "in a meaning"],
    ["figurative", "in a meaning"],
  ])("finds %s with its visible reason", (query, reason) => {
    expect(searchItems(structured, query)[0]).toMatchObject({ reason });
  });
});

describe("lexical Structured Notes search", () => {
  const structured = [newLexical({
    term: "quedar",
    noteSections: [{
      id: "note-section:12121212-1212-4212-8212-121212121212",
      parentId: null,
      name: "Usage and register",
      body: "> [!TIP]\n> Often means **to arrange to meet** in this context.",
    }],
  })];

  it.each(["Usage and register", "arrange to meet"])("finds %s in named lexical Notes", (query) => {
    expect(searchItems(structured, query)[0]).toMatchObject({
      tier: TIER.text,
      reason: "in your notes",
    });
  });

  it("does not index the callout marker itself", () => {
    expect(searchItems(structured, "TIP")).toEqual([]);
  });
});

describe("search exclusions and empty queries", () => {
  it("matches the visible phrase across notebook Markdown markers", () => {
    const formatted = lexical({
      term: "importar",
      notes: "> [!NOTE]\n> Esto es muy **importante** para mí.\n\n<br>\n\nÚsalo con cuidado.",
    });
    expect(searchItems([formatted], "muy importante")[0]).toMatchObject({
      item: formatted,
      reason: "in your notes",
    });
    expect(searchItems([formatted], "NOTE")).toEqual([]);

    const pageWithHighlight = page({ title: "Viaje", body: "Quiero ==recordar este lugar== mañana." });
    expect(searchItems([pageWithHighlight], "recordar este lugar")[0]).toMatchObject({
      item: pageWithHighlight,
      reason: "in the page",
    });
  });

  it("does not index shared connection notes", () => {
    const source = lexical({
      term: "ser",
      linkAnnotations: [{
        targetKey: "user:target",
        type: "often_confused",
        subject: "owner",
        note: "relationship-only-secret-phrase",
      }],
    });

    expect(searchItems([source], "relationship-only-secret-phrase")).toEqual([]);
  });

  it.each(["", "   ", null, undefined])("returns nothing for %s", (query) => {
    expect(searchItems(notebook, query)).toEqual([]);
  });
});

describe("composable page search", () => {
  const word = lexical({ term: "ahorita", translation: "right now or shortly" });
  const structuredPage = newPage({
    title: "Voces del mercado",
    linkedKeys: [word.id],
    noteSections: [{
      id: "note-section:00000000-0000-4000-8000-000000000001",
      parentId: null,
      name: "Collection context",
      body: "> [!NOTE]\n> **Phrases** used in puestos pequeños\n\n> [!TIP]\n> Compare `hubiera` with habría\n\n> [!OJO]\n> Actualmente does not mean actually\n\n> Ordinary quotation",
    }],
    collection: { enabled: true, groups: [] },
    source: {
      enabled: true,
      format: "audio",
      creator: "Camila Torres",
      scope: "Episodio 18",
      url: "",
      context: "Conversación espontánea",
      captures: [{
        id: "source-capture:00000000-0000-4000-8000-000000000001",
        type: "passage",
        text: "Nomás dígame.",
        location: "18:42",
        reflection: "Suaviza la petición.",
        itemKeys: [word.id],
      }],
    },
    grammar: {
      enabled: true,
      keyIdea: "El imperfecto establece la escena.",
      sections: [{
        id: "grammar-section:00000000-0000-4000-8000-000000000001",
        name: "Background",
        explanation: "**Acción** en\n> progreso",
        pattern: "estar + gerundio",
        examples: [],
      }],
    },
  });

  it("searches active Source and Grammar text at tier 6 with explicit reasons", () => {
    expect(searchItems([structuredPage], "Camila")[0]).toMatchObject({
      tier: TIER.text,
      reason: "in source notes",
    });
    expect(searchItems([structuredPage], "imperfecto")[0]).toMatchObject({
      tier: TIER.text,
      reason: "in the grammar guide",
    });
    const hidden = {
      ...structuredPage,
      source: { ...structuredPage.source, enabled: false },
      grammar: { ...structuredPage.grammar, enabled: false },
    };
    expect(searchItems([hidden], "Camila")).toEqual([]);
    expect(searchItems([hidden], "imperfecto")).toEqual([]);
  });

  it("searches Notes section names and rendered Markdown text with its own tier-6 reason", () => {
    expect(searchItems([structuredPage], "Collection context")[0]).toMatchObject({
      tier: TIER.text,
      reason: "in a Notes section",
    });
    expect(searchItems([structuredPage], "phrases used in puestos")[0]).toMatchObject({
      tier: TIER.text,
      reason: "in a Notes section",
    });
    expect(searchItems([structuredPage], "ordinary quotation")[0]).toMatchObject({
      tier: TIER.text,
      reason: "in a Notes section",
    });
    expect(searchItems([structuredPage], "hubiera")[0]).toMatchObject({
      tier: TIER.text,
      reason: "in a Notes section",
    });
    expect(searchItems([structuredPage], "[!NOTE]")).toEqual([]);
    expect(searchItems([structuredPage], "[!TIP]")).toEqual([]);
    expect(searchItems([structuredPage], "[!OJO]")).toEqual([]);
    expect(searchItems([structuredPage], "`hubiera`")).toEqual([]);
    expect(searchItems([structuredPage], ">")).toEqual([]);
  });

  it("searches the visible text of a formatted Grammar overview", () => {
    expect(searchItems([structuredPage], "accion en progreso")[0]).toMatchObject({
      tier: TIER.text,
      reason: "in the grammar guide",
    });
    expect(searchItems([structuredPage], ">")).toEqual([]);
    expect(searchItems([structuredPage], "Note")).toEqual([]);
  });

  it("matches contained vocabulary only for Pages retrieval and never adds a global page hit", () => {
    const allItems = [structuredPage, word];
    expect(searchItems(allItems, "ahorita", { allItems }).map(({ item }) => item)).toEqual([word]);
    const headingResults = searchItems([structuredPage], "ahorita", {
      allItems,
      includeContainedVocabulary: true,
    });
    expect(headingResults).toHaveLength(1);
    expect(headingResults[0]?.reason).toBe("contained vocabulary “ahorita”");
    const meaningResults = searchItems([structuredPage], "right now", {
      allItems,
      includeContainedVocabulary: true,
    });
    expect(meaningResults).toHaveLength(1);
    expect(meaningResults[0]?.reason).toBe("meaning of contained vocabulary “ahorita”");
  });

  it("searches an entry's Apuntes at tier 6, ranked below its body and preserving ñ", () => {
    const annotated = newPage({
      title: "Mi día",
      pageDate: "2026-08-14",
      body: "Hoy encontré un buen método.",
      apuntes: "## Gemini\n\n- Use **recopilar** for organizing digital content, el año pasado.",
    });
    expect(searchItems([annotated], "recopilar")[0]).toMatchObject({
      tier: TIER.text,
      reason: "in the Apuntes",
    });
    // Markdown syntax never matches; only the visible text does.
    expect(searchItems([annotated], "##")).toEqual([]);
    // "año" in the Apuntes must never answer an "ano" search (normalize keeps ñ distinct).
    expect(searchItems([annotated], "ano")).toEqual([]);
    expect(searchItems([annotated], "año")[0]).toMatchObject({ reason: "in the Apuntes" });

    // A body match outranks an Apuntes match when two pages tie on tier.
    const bodyHit = newPage({ title: "Cuerpo", body: "método nuevo" });
    const apuntesHit = newPage({ title: "Notas", apuntes: "método nuevo" });
    const ordered = searchItems([apuntesHit, bodyHit], "método nuevo").map(({ item }) => item.title);
    expect(ordered).toEqual(["Cuerpo", "Notas"]);
  });

  it("returns a page once with its best contained-vocabulary context", () => {
    const meaningFirst = lexical({ term: "enseguida", translation: "right here" });
    const headingSecond = lexical({ term: "derecho", translation: "straight" });
    const pageWithBoth = newPage({
      title: "Directions",
      linkedKeys: [meaningFirst.id, headingSecond.id],
      collection: { enabled: true, groups: [] },
    });
    const allItems = [pageWithBoth, meaningFirst, headingSecond];
    const results = searchItems([pageWithBoth], "right", {
      allItems,
      includeContainedVocabulary: true,
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      tier: TIER.text,
      reason: "meaning of contained vocabulary “enseguida”",
    });

    const headingOverMeaning = lexical({ term: "right", translation: "the right side" });
    const pageWithHeading = newPage({
      title: "More directions",
      linkedKeys: [meaningFirst.id, headingOverMeaning.id],
      collection: { enabled: true, groups: [] },
    });
    const withHeading = searchItems([pageWithHeading], "right", {
      allItems: [pageWithHeading, meaningFirst, headingOverMeaning],
      includeContainedVocabulary: true,
    });
    expect(withHeading).toHaveLength(1);
    expect(withHeading[0].reason).toBe("contained vocabulary “right”");
  });

  it("excludes hidden contained vocabulary and preserves ñ in every new page field", () => {
    const year = lexical({ term: "año", translation: "year" });
    const hidden = newPage({
      title: "Hidden contexts",
      linkedKeys: [year.id],
      collection: { enabled: false, groups: [] },
      source: {
        enabled: false,
        format: "book",
        creator: "Señora Luz",
        scope: "",
        url: "",
        context: "",
        captures: [{
          id: "source-capture:00000000-0000-4000-8000-000000000002",
          type: "language_note",
          text: "Un año",
          location: "",
          reflection: "",
          itemKeys: [year.id],
        }],
      },
    });
    expect(searchItems([hidden], "año", {
      allItems: [hidden, year],
      includeContainedVocabulary: true,
    })).toEqual([]);

    const active = {
      ...hidden,
      source: { ...hidden.source, enabled: true },
      pageFocus: "source",
    };
    expect(searchItems([active], "Señora")).toHaveLength(1);
    expect(searchItems([active], "Señora")[0].reason).toBe("in source notes");
    expect(searchItems([active], "Senora")).toEqual([]);
    expect(searchItems([active], "ano")).toEqual([]);
  });

  it("keeps page-title ranking ahead of structured text", () => {
    const sameWords = newPage({
      title: "Imperfecto",
      source: {
        enabled: true,
        format: "book",
        creator: "",
        scope: "Imperfecto",
        url: "",
        context: "",
        captures: [],
      },
    });
    expect(searchItems([sameWords], "Imperfecto")[0]).toMatchObject({
      tier: TIER.exactTerm,
      reason: "page title",
    });
  });
});
