import { describe, expect, it, vi } from "vitest";
import {
  derivePhraseContainment,
  preparePhraseContainment,
  preparePhraseContainmentCandidates,
} from "./phraseContainment.js";

const lexical = ({
  id,
  term,
  form = "word",
  dictKey = null,
  pos = "",
} = {}) => ({
  id: id || `user:${term}`,
  type: "lexical",
  term,
  form,
  dictKey,
  pos,
  meanings: [],
  linkedKeys: [],
  linkAnnotations: [],
});

const phrase = (term, id = `user:${term}`) => lexical({ id, term, form: "phrase" });

const table = (lemma, forms = {}) => ({
  id: `conj:${lemma}`,
  tenses: {
    "Indicative/Present": forms,
  },
});

describe("phrase↔word containment derivation", () => {
  it("matches exact normalized whole tokens in both directions and keeps ñ distinct", () => {
    const casa = lexical({ term: "casa" });
    const year = lexical({ term: "año" });
    const exact = phrase("Mi casa es tu casa.");
    const longer = phrase("Ella está casada.");
    const wrongN = phrase("El ano pasado.");
    const rightN = phrase("El año pasado.");
    const items = [exact, longer, wrongN, rightN, casa, year];

    expect(derivePhraseContainment(casa, items).map((row) => row.item.id)).toEqual([exact.id]);
    expect(derivePhraseContainment(exact, items).map((row) => row.item.id)).toEqual([casa.id]);
    expect(derivePhraseContainment(year, items).map((row) => row.item.id)).toEqual([rightN.id]);
  });

  it("suppresses fixed high-noise words without excluding short content verbs", () => {
    const de = lexical({ term: "de" });
    const ir = lexical({ term: "ir", pos: "verb" });
    const source = phrase("Quiero ir de viaje.");
    const items = [source, de, ir];

    expect(derivePhraseContainment(source, items).map((row) => row.item.term)).toEqual(["ir"]);
    expect(derivePhraseContainment(de, items)).toEqual([]);
  });

  it("uses cloze-safe inflections but stays silent for a clitic-attached token", () => {
    const dar = lexical({ term: "dar" });
    const ordinary = phrase("Me da igual.");
    const attached = phrase("Quiero dármelo mañana.");
    const profiles = new Map([[dar.id, { forms: new Set(["da"]) }]]);
    const items = [ordinary, attached, dar];

    expect(derivePhraseContainment(dar, items, profiles)).toMatchObject([
      { item: { id: ordinary.id }, surface: "da", matchKind: "inflected" },
    ]);
    expect(derivePhraseContainment(attached, items, profiles)).toEqual([]);
  });

  it("loads optional tables in batches and suppresses reference-wide ambiguous forms", async () => {
    const dar = lexical({ term: "dar", pos: "verb", dictKey: "dict:dar" });
    const ir = lexical({ term: "ir", pos: "verb", dictKey: "dict:ir" });
    const ser = lexical({ term: "ser", pos: "verb", dictKey: "dict:ser" });
    const source = phrase("Me da igual cuando fui allí.");
    const entries = {
      "dict:dar": { id: "dict:dar", lemma: "dar", pos: "verb", conjugationId: "conj:dar" },
      "dict:ir": { id: "dict:ir", lemma: "ir", pos: "verb", conjugationId: "conj:ir" },
      "dict:ser": { id: "dict:ser", lemma: "ser", pos: "verb", conjugationId: "conj:ser" },
    };
    const tables = {
      "conj:dar": table("dar", { "él/ella/usted": "da" }),
      "conj:ir": table("ir", { yo: "fui" }),
      "conj:ser": table("ser", { yo: "fui" }),
    };
    const resolveEntries = vi.fn(async (keys) => keys.map((key) => ({ entry: entries[key], resolvedFrom: null })));
    const getConjugations = vi.fn(async (ids) => ids.map((id) => tables[id]));
    const getFormEntries = vi.fn(async () => new Map([
      ["da", [entries["dict:dar"]]],
      ["fui", [entries["dict:ir"], entries["dict:ser"]]],
    ]));

    const rows = await preparePhraseContainment(source, [source, dar, ir, ser], {
      resolveEntries,
      getConjugations,
      getFormEntries,
    });

    expect(rows.map((row) => row.item.term)).toEqual(["dar"]);
    expect(rows[0]).toMatchObject({ surface: "da", matchKind: "inflected" });
    expect(resolveEntries).toHaveBeenCalledTimes(1);
    expect(getConjugations).toHaveBeenCalledTimes(1);
    expect(getFormEntries).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["an empty posting", []],
    ["a different sole lemma", [{ id: "dict:decir", lemma: "decir" }]],
  ])("requires the form posting to confirm the attached lemma for %s", async (_case, posting) => {
    const dar = lexical({ term: "dar", pos: "verb", dictKey: "dict:dar" });
    const source = phrase("Dar las gracias cuando me da igual.");
    const entry = { id: "dict:dar", lemma: "dar", pos: "verb", conjugationId: "conj:dar" };

    const rows = await preparePhraseContainment(dar, [source, dar], {
      resolveEntries: vi.fn(async () => [{ entry, resolvedFrom: null }]),
      getConjugations: vi.fn(async () => [table("dar", { "él/ella/usted": "da" })]),
      getFormEntries: vi.fn(async () => new Map([["da", posting]])),
    });

    expect(rows).toMatchObject([{ surface: "Dar", matchKind: "exact" }]);
  });

  it("falls back to exact personal terms when reference enrichment fails", async () => {
    const dar = lexical({ term: "dar", pos: "verb", dictKey: "dict:dar" });
    const exact = phrase("Dar las gracias.");
    const inflected = phrase("Me da igual.");

    const rows = await preparePhraseContainment(dar, [inflected, exact, dar], {
      resolveEntries: vi.fn(async () => { throw new Error("reference unavailable"); }),
    });

    expect(rows.map((row) => row.item.id)).toEqual([exact.id]);
    expect(rows[0]).toMatchObject({ surface: "Dar", matchKind: "exact" });
  });
});

describe("suppressed-candidate confirmation tier", () => {
  const creerDeps = () => ({
    resolveEntries: vi.fn(async (keys) => keys.map((key) => ({
      entry: {
        "dict:creer": { id: "dict:creer", lemma: "creer", pos: "verb", conjugationId: "conj:creer" },
      }[key] || null,
      resolvedFrom: null,
    }))),
    getConjugations: vi.fn(async (ids) => ids.map((id) => (
      id === "conj:creer" ? table("creer", { yo: "creo" }) : null
    ))),
    getFormEntries: vi.fn(async () => new Map([
      ["creo", [
        { id: "dict:creer", lemma: "creer" },
        { id: "dict:crear", lemma: "crear" },
      ]],
    ])),
  });

  it("offers a suppressed multi-lemma match as a candidate with its competitors, in both directions", async () => {
    const creer = lexical({ term: "creer", pos: "verb", dictKey: "dict:creer" });
    const source = phrase("Creo que sí.");
    const items = [source, creer];

    const shown = await preparePhraseContainment(creer, items, creerDeps());
    expect(shown).toEqual([]);

    const fromWord = await preparePhraseContainmentCandidates(creer, items, creerDeps());
    expect(fromWord).toMatchObject([{
      item: { id: source.id },
      word: { id: creer.id },
      surface: "Creo",
      matchKind: "inflected",
      competingLemmas: ["crear"],
    }]);

    const fromPhrase = await preparePhraseContainmentCandidates(source, items, creerDeps());
    expect(fromPhrase).toMatchObject([
      { item: { id: creer.id }, word: { id: creer.id }, competingLemmas: ["crear"] },
    ]);
  });

  it("keeps reference-wide ambiguity like fui out of shown rows but offers each attached lemma", async () => {
    const ir = lexical({ term: "ir", pos: "verb", dictKey: "dict:ir" });
    const ser = lexical({ term: "ser", pos: "verb", dictKey: "dict:ser" });
    const source = phrase("Ayer fui feliz.");
    const items = [source, ir, ser];
    const entries = {
      "dict:ir": { id: "dict:ir", lemma: "ir", pos: "verb", conjugationId: "conj:ir" },
      "dict:ser": { id: "dict:ser", lemma: "ser", pos: "verb", conjugationId: "conj:ser" },
    };
    const deps = {
      resolveEntries: vi.fn(async (keys) => keys.map((key) => ({ entry: entries[key], resolvedFrom: null }))),
      getConjugations: vi.fn(async (ids) => ids.map((id) => ({
        "conj:ir": table("ir", { yo: "fui" }),
        "conj:ser": table("ser", { yo: "fui" }),
      }[id]))),
      getFormEntries: vi.fn(async () => new Map([
        ["fui", [entries["dict:ir"], entries["dict:ser"]]],
      ])),
    };

    const rows = await preparePhraseContainmentCandidates(source, items, deps);
    expect(rows).toMatchObject([
      { word: { term: "ir" }, surface: "fui", competingLemmas: ["ser"] },
      { word: { term: "ser" }, surface: "fui", competingLemmas: ["ir"] },
    ]);
  });

  it("never proposes an exact match, a stop-word surface, or a posting missing the attached lemma", async () => {
    const dar = lexical({ term: "dar", pos: "verb", dictKey: "dict:dar" });
    const exact = phrase("Dar las gracias.");
    const stopWordSurface = phrase("De vez en cuando.");
    const mismatched = phrase("Me da igual.");
    const items = [exact, stopWordSurface, mismatched, dar];
    const entry = { id: "dict:dar", lemma: "dar", pos: "verb", conjugationId: "conj:dar" };
    const deps = {
      resolveEntries: vi.fn(async () => [{ entry, resolvedFrom: null }]),
      // "de" (normalized dé) and "da" are both known forms, so both phrases match tentatively.
      getConjugations: vi.fn(async () => [table("dar", { yo: "de", "él/ella/usted": "da" })]),
      getFormEntries: vi.fn(async () => new Map([
        ["de", [entry, { id: "dict:de", lemma: "de" }]],
        ["da", [{ id: "dict:decir", lemma: "decir" }]],
      ])),
    };

    const rows = await preparePhraseContainmentCandidates(dar, items, deps);
    expect(rows).toEqual([]);
  });

  it("excludes an already-connected pair and returns nothing on reference failure", async () => {
    const creer = lexical({ term: "creer", pos: "verb", dictKey: "dict:creer" });
    const source = phrase("Creo que sí.");
    creer.linkedKeys = [source.id];
    creer.linkAnnotations = [{ targetKey: source.id, type: "found_in", subject: "owner", note: "" }];

    expect(await preparePhraseContainmentCandidates(creer, [source, creer], creerDeps())).toEqual([]);

    const fresh = lexical({ term: "creer", pos: "verb", dictKey: "dict:creer" });
    const failing = {
      resolveEntries: vi.fn(async () => { throw new Error("reference unavailable"); }),
    };
    expect(await preparePhraseContainmentCandidates(fresh, [source, fresh], failing)).toEqual([]);
  });
});
