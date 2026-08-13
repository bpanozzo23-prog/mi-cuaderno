import { describe, expect, it } from "vitest";
import { makeLexical, makePage } from "../test/factories.js";
import {
  deriveSavedFamilySiblings,
  deriveWanderConnections,
  eligibleWanderItems,
  sampleWanderStart,
} from "./wander.js";

describe("wander starting population", () => {
  it("includes words and phrases but never pages", () => {
    const word = makeLexical({ id: "user:word", term: "casa" });
    const phrase = makeLexical({ id: "user:phrase", term: "a veces", form: "phrase" });
    const page = makePage({ id: "user:page", title: "Notes" });
    expect(eligibleWanderItems([page, phrase, word])).toEqual([phrase, word]);
  });

  it("can hit every eligible index under injected uniform draws", () => {
    const items = [
      makeLexical({ id: "user:one", term: "uno" }),
      makePage({ id: "user:page" }),
      makeLexical({ id: "user:two", term: "dos", form: "phrase" }),
      makeLexical({ id: "user:three", term: "tres" }),
    ];
    expect([0, 0.34, 0.67, 0.999].map((draw) => sampleWanderStart(items, () => draw)?.id)).toEqual([
      "user:one",
      "user:two",
      "user:three",
      "user:three",
    ]);
    expect(sampleWanderStart([makePage()], () => 0)).toBeNull();
  });
});

describe("wander connections", () => {
  it("keeps typed edges from both physical directions and filters Diario targets only", () => {
    const center = makeLexical({ id: "user:center", term: "casa" });
    const outgoing = makeLexical({ id: "user:out", term: "hogar" });
    const incoming = makePage({ id: "user:page", title: "Architecture" });
    const journal = makePage({ id: "user:journal", title: "Today", pageDate: "2026-08-12" });
    center.linkedKeys = [outgoing.id, journal.id];
    center.linkAnnotations = [{
      targetKey: outgoing.id,
      type: "similar_meaning",
      subject: "owner",
      note: "Close, but not identical.",
    }];
    incoming.linkedKeys = [center.id];
    incoming.linkAnnotations = [{
      targetKey: center.id,
      type: "explained_by",
      subject: "owner",
      note: "The page gives the context.",
    }];

    const rows = deriveWanderConnections(center, [center, outgoing, incoming, journal]);
    expect(rows.map((row) => row.key)).toEqual([outgoing.id, incoming.id]);
    expect(rows).toMatchObject([
      { label: "Similar meaning", note: "Close, but not identical." },
      { label: "Explains", note: "The page gives the context." },
    ]);
  });

  it("retains an old-key annotation while exiting through its resolved canonical dictionary id", () => {
    const oldKey = "dict:old:casa";
    const canonical = { id: "dict:new:casa", lemma: "casa" };
    const center = makeLexical({
      id: "user:center",
      linkedKeys: [oldKey],
      linkAnnotations: [{
        targetKey: oldKey,
        type: "variant",
        subject: "owner",
        note: "Old spelling note.",
      }],
    });

    expect(deriveWanderConnections(center, [center], [{ rawKey: oldKey, entry: canonical }])).toMatchObject([
      {
        kind: "entry",
        key: canonical.id,
        entry: canonical,
        label: "Variant",
        note: "Old spelling note.",
      },
    ]);
  });
});

describe("saved family siblings", () => {
  it("accepts direct and aliased attachments, excludes self/pages, and de-duplicates family overlap", () => {
    const center = makeLexical({ id: "user:center", dictKey: "dict:sacar" });
    const direct = makeLexical({ id: "user:direct", term: "buscar", dictKey: "dict:buscar" });
    const aliased = makeLexical({ id: "user:alias", term: "tocar", dictKey: "dict:old:tocar" });
    const unrelated = makeLexical({ id: "user:no", term: "hablar", dictKey: "dict:hablar" });
    const page = makePage({ id: "user:page", dictKey: "dict:buscar" });
    const familyRows = [
      { id: "spelling:c-qu", members: [{ id: "dict:sacar" }, { id: "dict:buscar" }, { id: "dict:tocar" }] },
      { id: "other", members: [{ id: "dict:buscar" }] },
    ];

    expect(deriveSavedFamilySiblings(
      center,
      [center, direct, aliased, unrelated, page],
      familyRows,
      { "dict:old:tocar": "dict:tocar" }
    ).map((row) => row.id)).toEqual([direct.id, aliased.id]);
  });
});
