import { describe, expect, it } from "vitest";
import {
  MAX_KEEP_ENTRIES,
  buildKeepWrites,
  defaultKeepSelection,
  linkIsAvailable,
  normalizeKeepProposals,
} from "./keepProposals.js";
import { newLexical } from "../db/items.js";

const entry = (ref, term, extra = {}) => ({
  ref, term, form: "word", gloss: `meaning of ${term}`, usageCue: null, usageLabels: [],
  examples: [], note: null, tags: [], reason: "useful", ...extra,
});
const existing = newLexical({ term: "echar de menos", form: "phrase", tags: ["Emociones", "IA"] });
const candidates = [{ ref: "c1", itemId: existing.id, term: "echar de menos", form: "phrase", gloss: "to miss" }];
const normalized = (raw, items = [existing]) => normalizeKeepProposals({ summary: "s", links: [], ...raw }, { candidates, items });

describe("normalizeKeepProposals", () => {
  it("trims fields and drops entries without a term, a gloss or a unique ref", () => {
    const result = normalized({
      entries: [
        entry(" n1 ", "  extrañar  ", { gloss: " to miss ", usageCue: "  ", note: " Mexico " }),
        entry("n2", "   "),
        entry("n3", "faltar", { gloss: "" }),
        entry("n1", "otra"),
      ],
    });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      ref: "n1", term: "extrañar", note: "Mexico", meaning: { gloss: "to miss", usageCue: "" },
    });
    expect(result.droppedCount).toBe(3);
  });

  it("turns image syntax into a plain link in every saved field, so a saved entry never loads one", () => {
    const pixel = "![x](https://example.com/p?q=secret)";
    const [kept] = normalized({
      entries: [entry("n1", `chido ${pixel}`, {
        gloss: `cool ${pixel}`, usageCue: pixel, note: `See ${pixel}`, reason: pixel,
        examples: [{ es: `¡Qué chido! ${pixel}`, en: pixel }],
      })],
    }).entries;
    expect(JSON.stringify(kept)).not.toContain("![");
    expect(kept.note).toBe("See [x](https://example.com/p?q=secret)");
  });

  it("keeps only examples with Spanish, and only supported usage labels", () => {
    const [kept] = normalized({
      entries: [entry("n1", "chido", {
        usageLabels: ["slang", "made-up", "slang"],
        examples: [{ es: " ¡Qué chido! ", en: "How cool!" }, { es: "", en: "English only" }],
      })],
    }).entries;
    expect(kept.meaning.usageLabels).toEqual(["slang"]);
    expect(kept.meaning.examples).toEqual([{ es: "¡Qué chido!", en: "How cool!" }]);
  });

  it("reuses the owner's tag spellings, never takes 'ia' from the model and adds the owner's provenance tag", () => {
    const [kept] = normalized({
      entries: [entry("n1", "extrañar", { tags: ["emociones", "ia", "nuevo", "otro", "cuarto"] })],
    }).entries;
    expect(kept.tags).toEqual([
      { name: "Emociones", isNew: false, provenance: false },
      { name: "nuevo", isNew: true, provenance: false },
      { name: "otro", isNew: true, provenance: false },
      { name: "IA", isNew: false, provenance: true },
    ]);
    const [fresh] = normalized({ entries: [entry("n1", "extrañar")] }, []).entries;
    expect(fresh.tags).toEqual([{ name: "ia", isNew: true, provenance: true }]);
  });

  it("flags an entry already in the notebook and leaves it unticked", () => {
    const [dup] = normalized({ entries: [entry("n1", "Echar de menos")] }).entries;
    expect(dup.duplicateIds).toEqual([existing.id]);
    expect(dup.defaultSelected).toBe(false);
  });

  it("flags a repeat within the batch, but keeps accent-distinct headings apart", () => {
    const { entries } = normalized({
      entries: [entry("n1", "si"), entry("n2", "sí"), entry("n3", "SI ")],
    });
    expect(entries.map((e) => [e.ref, e.batchDuplicateOf, e.defaultSelected])).toEqual([
      ["n1", null, true],
      ["n2", null, true],
      ["n3", "n1", false],
    ]);
  });

  it(`caps the batch at ${MAX_KEEP_ENTRIES} entries`, () => {
    const many = Array.from({ length: MAX_KEEP_ENTRIES + 3 }, (_, i) => entry(`n${i + 1}`, `palabra${i}`));
    expect(normalized({ entries: many }).entries).toHaveLength(MAX_KEEP_ENTRIES);
  });

  it("keeps links it can store and drops the rest", () => {
    const result = normalized({
      entries: [entry("n1", "extrañar"), entry("n2", "hacer falta")],
      links: [
        { from: "n1", to: "c1", type: "similar_meaning", reason: "r" },
        { from: "n1", to: "n2", type: "related", reason: "r" },
        { from: "n1", to: "n9", type: "related", reason: "unknown ref" },
        { from: "c1", to: "c1", type: "related", reason: "existing to existing" },
        { from: "n2", to: "n2", type: "related", reason: "self" },
        { from: "n2", to: "c1", type: "made_up", reason: "bad type" },
        { from: "c1", to: "n1", type: "contrast", reason: "conflicting repeat of the first pair" },
        { from: "n2", to: "n1", type: "related", reason: "reversed repeat" },
      ],
    });
    expect(result.links.map((link) => [link.id, link.from.ref || link.from.itemId, link.to.ref || link.to.itemId, link.type]))
      .toEqual([["l1", "n1", existing.id, "similar_meaning"], ["l2", "n1", "n2", "related"]]);
    expect(result.droppedCount).toBe(6);
  });
});

describe("buildKeepWrites", () => {
  const proposals = normalized({
    entries: [
      entry("n1", "extrañar", { tags: ["emociones"], examples: [{ es: "Te extraño.", en: "I miss you." }], note: "Mexico" }),
      entry("n2", "hacer falta"),
      entry("n3", "faltar"),
    ],
    links: [
      { from: "n1", to: "c1", type: "similar_meaning", reason: "" },
      { from: "c1", to: "n2", type: "found_in", reason: "" },
      { from: "n3", to: "n1", type: "related", reason: "" },
    ],
  });

  it("creates ticked entries with their meaning, examples, note and ticked tags", () => {
    const selection = defaultKeepSelection(proposals);
    selection.entries.n3.selected = false;
    selection.entries.n1.tags = ["Emociones"]; // the owner unticked "IA"
    const { items } = buildKeepWrites(proposals, selection);
    expect(items.map((item) => item.term)).toEqual(["extrañar", "hacer falta"]);
    expect(items[0]).toMatchObject({
      type: "lexical",
      form: "word",
      notes: "Mexico",
      tags: ["Emociones"],
      meanings: [expect.objectContaining({ gloss: "meaning of extrañar", examples: [{ es: "Te extraño.", en: "I miss you." }] })],
    });
    expect(items[1].tags).toEqual(["IA"]);
    expect(items[0].id).toMatch(/^user:/);
  });

  it("stores each link on a new item, flipping a directional label when it comes from an existing entry", () => {
    const { items, links } = buildKeepWrites(proposals, defaultKeepSelection(proposals));
    const [n1, n2, n3] = items;
    expect(links).toEqual([
      { ownerId: n1.id, targetId: existing.id, relationship: { type: "similar_meaning", subject: "owner" } },
      // "echar de menos found_in hacer falta" stored on hacer falta: the target is the one found in it.
      { ownerId: n2.id, targetId: existing.id, relationship: expect.objectContaining({ type: "found_in", subject: "target" }) },
      { ownerId: n3.id, targetId: n1.id, relationship: { type: "related", subject: "owner" } },
    ]);
  });

  it("drops a link whose new entry is unticked, and one the owner unticked", () => {
    const selection = defaultKeepSelection(proposals);
    selection.entries.n1.selected = false;
    selection.links.l2 = false;
    expect(linkIsAvailable(proposals.links[0], selection)).toBe(false);
    const { links, droppedLinks } = buildKeepWrites(proposals, selection);
    expect(links).toEqual([]);
    expect(droppedLinks).toEqual([
      { id: "l1", reason: "endpoint_unselected" },
      { id: "l3", reason: "endpoint_unselected" },
    ]);
  });
});

describe("additions to attached entries", () => {
  const quedar = newLexical({
    term: "quedar",
    meanings: [
      { gloss: "to remain", examples: [{ es: "Queda poco.", en: "Little remains." }] },
      { gloss: "to arrange to meet" },
    ],
    myExamples: [{ es: "Si quieres, quedamos.", en: "If you like, let's meet." }],
    notes: "Very common in Mexico.",
    tags: ["citas"],
  });
  const other = newLexical({ term: "verse", tags: ["Emociones"] });
  const snapshot = (overrides = {}) => ({
    ref: "c1",
    itemId: quedar.id,
    term: "quedar",
    text: "…",
    truncated: false,
    meaningIds: { m1: quedar.meanings[0].id, m2: quedar.meanings[1].id },
    fingerprint: "frozen",
    ...overrides,
  });
  const update = (extra = {}) => ({
    target: "c1", examples: [], meanings: [], note: null, tags: [], reason: "From the chat.", ...extra,
  });
  const withCandidates = [
    { ref: "c1", itemId: quedar.id, term: "quedar", form: "word", gloss: "to remain", matchedBy: "attached" },
    { ref: "c2", itemId: other.id, term: "verse", form: "word", gloss: "to look", matchedBy: "term" },
  ];
  const run = (raw, attached = [snapshot()], items = [quedar, other, existing]) =>
    normalizeKeepProposals({ summary: "s", entries: [], links: [], ...raw }, { candidates: withCandidates, items, attached });

  it("turns an update into tickable additions, mapping meaning refs to meaning IDs", () => {
    const result = run({
      updates: [update({
        examples: [
          { meaning: "m2", es: "Quedamos a las cinco.", en: "Let's meet at five." },
          { meaning: null, es: "Me quedé en casa.", en: "I stayed home." },
        ],
        meanings: [{ gloss: "to fit (clothes)", usageCue: null, usageLabels: ["informal", "bogus"], examples: [{ es: "Te queda bien.", en: "It suits you." }] }],
        note: "Quedar de + infinitive is Mexican.",
        tags: ["emociones", "Citas", "ia"],
      })],
    });
    expect(result.updates).toHaveLength(1);
    const [card] = result.updates;
    expect(card).toMatchObject({ ref: "c1", itemId: quedar.id, term: "quedar", fingerprint: "frozen", reason: "From the chat." });
    expect(card.additions.map((addition) => addition.kind)).toEqual(["example", "example", "meaning", "note", "tag"]);
    expect(card.additions[0]).toMatchObject({ meaningId: quedar.meanings[1].id, meaningRef: "m2", meaningGloss: "to arrange to meet", flag: null });
    expect(card.additions[1]).toMatchObject({ meaningId: null, example: { es: "Me quedé en casa.", en: "I stayed home." } });
    expect(card.additions[2].meaning).toEqual({
      gloss: "to fit (clothes)", usageCue: "", usageLabels: ["informal"], examples: [{ es: "Te queda bien.", en: "It suits you." }],
    });
    // "Citas" is already on the entry and "ia" is never added to an owner's entry.
    expect(card.additions[4].tag).toEqual({ name: "Emociones", isNew: false });
    expect(result.attachedIds).toEqual([quedar.id]);
    expect(defaultKeepSelection(result).additions).toEqual(Object.fromEntries(card.additions.map((addition) => [addition.id, true])));
  });

  it("drops an unknown meaning ref rather than moving the example to My examples", () => {
    const result = run({ updates: [update({ examples: [{ meaning: "m3", es: "Quedó claro.", en: "It was clear." }] })] });
    expect(result.updates).toEqual([]);
    expect(result.droppedCount).toBe(1);
  });

  it("drops exact repeats but only flags an accent-only match", () => {
    const [card] = run({
      updates: [update({
        examples: [
          { meaning: "m1", es: "  queda   POCO. ", en: "repeat of a meaning example" },
          { meaning: null, es: "Sí quieres, quedamos.", en: "accent-only match of My examples" },
          { meaning: null, es: "Sí quieres, quedamos.", en: "repeat within the update" },
        ],
      })],
    }).updates;
    expect(card.additions).toHaveLength(1);
    expect(card.additions[0]).toMatchObject({ flag: "similar_example" });
    expect(defaultKeepSelection({ entries: [], updates: [card], links: [] }).additions[card.additions[0].id]).toBe(false);
  });

  it("flags a meaning the entry already has and drops a note it already holds", () => {
    const result = run({
      updates: [update({
        meanings: [{ gloss: "To Remain", usageCue: null, usageLabels: [], examples: [] }],
        note: "very common in mexico.",
      })],
    });
    expect(result.updates[0].additions).toEqual([expect.objectContaining({ kind: "meaning", flag: "similar_meaning" })]);
    expect(result.droppedCount).toBe(1);
  });

  it("enforces the limits", () => {
    const examples = ["Uno.", "Dos.", "Tres.", "Cuatro."].map((es) => ({ meaning: null, es, en: "" }));
    const meanings = ["a", "b", "c"].map((gloss) => ({ gloss, usageCue: null, usageLabels: [], examples: [] }));
    const result = run({
      updates: [update({ examples, meanings, note: "x".repeat(1001), tags: ["t1", "t2", "t3", "t4"] })],
    });
    const kinds = result.updates[0].additions.map((addition) => addition.kind);
    expect(kinds.filter((kind) => kind === "example")).toHaveLength(3);
    expect(kinds.filter((kind) => kind === "meaning")).toHaveLength(2);
    expect(kinds.filter((kind) => kind === "tag")).toHaveLength(3);
    expect(kinds).not.toContain("note");
  });

  it("lets a shortened entry receive only tags", () => {
    const result = run({
      updates: [update({
        examples: [{ meaning: "m1", es: "Quedamos.", en: "" }],
        meanings: [{ gloss: "new", usageCue: null, usageLabels: [], examples: [] }],
        note: "A note.",
        tags: ["planes"],
      })],
    }, [snapshot({ truncated: true })]);
    expect(result.updates[0].additions).toEqual([expect.objectContaining({ kind: "tag", tag: { name: "planes", isNew: true } })]);
    expect(result.droppedCount).toBe(3);
  });

  it("only adds to attached entries, once each", () => {
    const result = run({
      updates: [
        update({ target: "c2", tags: ["planes"] }),
        update({ target: "c9", tags: ["planes"] }),
        update({ tags: ["planes"] }),
        update({ tags: ["viajes"] }),
      ],
    });
    expect(result.updates.map((card) => card.ref)).toEqual(["c1"]);
    expect(result.droppedCount).toBe(3);
  });

  it("turns image syntax into a plain link in every added field", () => {
    const pixel = "![x](https://example.com/p)";
    const [card] = run({
      updates: [update({
        examples: [{ meaning: null, es: `Hola ${pixel}`, en: pixel }],
        meanings: [{ gloss: pixel, usageCue: pixel, usageLabels: [], examples: [{ es: pixel, en: pixel }] }],
        note: pixel,
        tags: [pixel],
      })],
    }).updates;
    expect(JSON.stringify(card)).not.toContain("![");
  });

  it("links two existing entries only when one of them is attached, stored on the from end", () => {
    const third = newLexical({ term: "citarse" });
    const candidatesWithThird = [...withCandidates, { ref: "c3", itemId: third.id, term: "citarse", form: "word", gloss: "", matchedBy: "term" }];
    const proposals = normalizeKeepProposals({
      summary: "s",
      entries: [],
      updates: [],
      links: [
        { from: "c2", to: "c1", type: "explained_by", reason: "" },
        { from: "c2", to: "c3", type: "related", reason: "neither attached" },
      ],
    }, { candidates: candidatesWithThird, items: [quedar, other, third], attached: [snapshot()] });
    expect(proposals.links.map((link) => [link.from.itemId, link.to.itemId])).toEqual([[other.id, quedar.id]]);
    expect(proposals.droppedCount).toBe(1);
    const writes = buildKeepWrites(proposals, defaultKeepSelection(proposals));
    expect(writes.links).toEqual([{ ownerId: other.id, targetId: quedar.id, relationship: { type: "explained_by", subject: "owner" } }]);
    expect(writes.attachedIds).toEqual([quedar.id]);
  });

  it("groups ticked additions per entry for the writer and leaves out an entry with none ticked", () => {
    const proposals = run({
      updates: [update({
        examples: [
          { meaning: "m2", es: "Quedamos a las cinco.", en: "Let's meet at five." },
          { meaning: "m2", es: "Quedamos mañana temprano.", en: "" },
          { meaning: null, es: "Me quedé en casa.", en: "I stayed home." },
        ],
        meanings: [{ gloss: "to fit", usageCue: "clothes", usageLabels: [], examples: [] }],
        note: "Mexican usage.",
        tags: ["planes"],
      })],
    });
    const selection = defaultKeepSelection(proposals);
    const [first, second] = proposals.updates[0].additions;
    selection.additions[second.id] = false;
    expect(buildKeepWrites(proposals, selection).updates).toEqual([{
      itemId: quedar.id,
      fingerprint: "frozen",
      examplesByMeaningId: { [quedar.meanings[1].id]: [first.example] },
      myExamples: [{ es: "Me quedé en casa.", en: "I stayed home." }],
      meanings: [{ gloss: "to fit", usageCue: "clothes", usageLabels: [], examples: [] }],
      note: "Mexican usage.",
      tags: ["planes"],
    }]);
    for (const id of Object.keys(selection.additions)) selection.additions[id] = false;
    expect(buildKeepWrites(proposals, selection).updates).toEqual([]);
  });
});
