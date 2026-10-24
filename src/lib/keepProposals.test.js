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
