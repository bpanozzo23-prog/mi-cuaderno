import { describe, expect, it } from "vitest";
import { MAX_KEEP_GROUP_MEMBERS, candidateLinesForRequest, findKeepCandidates, selectGroupMembers } from "./keepCandidates.js";
import { newLexical, newPage } from "../db/items.js";

const word = (term, gloss, extra = {}) => newLexical({ term, meanings: [{ gloss }], ...extra });
const phrase = (term, gloss, extra = {}) => newLexical({ term, form: "phrase", meanings: [{ gloss }], ...extra });
const terms = (candidates) => candidates.map((candidate) => candidate.term);

describe("findKeepCandidates", () => {
  it("finds a saved phrase used in the conversation", () => {
    const items = [phrase("echar de menos", "to miss (someone)"), word("casa", "house")];
    const found = findKeepCandidates(items, "Is 'te echo de menos' the same as echar de menos?");
    expect(found).toEqual([
      expect.objectContaining({ ref: "c1", term: "echar de menos", form: "phrase", matchedBy: "term" }),
    ]);
  });

  it("matches whole words only", () => {
    const items = [word("mar", "sea")];
    expect(findKeepCandidates(items, "Nos vemos en marzo")).toEqual([]);
    expect(terms(findKeepCandidates(items, "Vamos al mar"))).toEqual(["mar"]);
  });

  it("ignores accents but never confuses ñ with n", () => {
    const anio = word("año", "year");
    const ano = word("ano", "anus");
    expect(terms(findKeepCandidates([anio, ano], "¿Cuántos años? Un año."))).toEqual(["año"]);
    expect(terms(findKeepCandidates([anio, ano], "la palabra ano"))).toEqual(["ano"]);
    expect(terms(findKeepCandidates([word("está", "is")], "esta frase esta bien"))).toEqual(["está"]);
  });

  it("skips single words too short or too common to mean anything", () => {
    const items = [word("de", "of"), word("me", "me"), word("ya", "already"), word("que", "that")];
    expect(findKeepCandidates(items, "Me dijo que ya se fue de aquí")).toEqual([]);
  });

  it("finds an entry from its English meaning, ignoring the parenthetical and 'to'", () => {
    const items = [phrase("echar de menos", "to miss (someone)")];
    const found = findKeepCandidates(items, "How do you say that you miss your family?");
    expect(found).toEqual([expect.objectContaining({ term: "echar de menos", matchedBy: "gloss" })]);
  });

  it("matches a longer gloss when all its content words appear, but not on one shared word", () => {
    const item = word("madrugar", "to get up early in the morning");
    expect(terms(findKeepCandidates([item], "I have to get up so early for work every morning"))).toEqual(["madrugar"]);
    expect(findKeepCandidates([item], "Good morning!")).toEqual([]);
  });

  it("never offers pages", () => {
    const page = newPage({ title: "echar de menos" });
    expect(findKeepCandidates([page], "echar de menos")).toEqual([]);
  });

  it("ranks phrases above words above meaning matches, caps the list and numbers it in order", () => {
    const items = [
      word("casa", "house"),
      phrase("estar en casa", "to be at home"),
      word("hogar", "home"),
    ];
    const found = findKeepCandidates(items, "estar en casa means being at home", { limit: 2 });
    expect(found.map((c) => [c.ref, c.term])).toEqual([["c1", "estar en casa"], ["c2", "casa"]]);
  });

  it("orders ties deterministically", () => {
    const a = word("perro", "dog", {});
    const b = word("gatos", "cats", {});
    a.updatedAt = "2026-10-01T00:00:00.000Z";
    b.updatedAt = "2026-10-02T00:00:00.000Z";
    const text = "perro gatos";
    expect(terms(findKeepCandidates([a, b], text))).toEqual(terms(findKeepCandidates([b, a], text)));
  });

  it("handles a large notebook and a long conversation", () => {
    const items = Array.from({ length: 3000 }, (_, index) => word(`palabra${index}`, `meaning number ${index}`));
    const text = Array.from({ length: 2000 }, (_, index) => `palabra${index % 50} text`).join(" ");
    const found = findKeepCandidates(items, text);
    expect(found).toHaveLength(40);
  });
});

describe("attached entries", () => {
  it("lead the list in attached order, whatever their spelling, and are not repeated", () => {
    const ir = word("ir", "to go");
    const quedar = word("quedar", "to remain");
    const sacar = word("sacar", "to take out");
    const candidates = findKeepCandidates([sacar, quedar, ir], "Hablamos de sacar y quedar.", {
      attachedIds: [ir.id, quedar.id, ir.id],
    });

    expect(terms(candidates)).toEqual(["ir", "quedar", "sacar"]);
    expect(candidates.map((candidate) => candidate.ref)).toEqual(["c1", "c2", "c3"]);
    expect(candidates[0]).toMatchObject({ itemId: ir.id, matchedBy: "attached", gloss: "to go" });
    expect(candidates[2].matchedBy).toBe("term");
  });

  it("skip deleted entries and pages, and still count toward the limit", () => {
    const quedar = word("quedar", "to remain");
    const page = newPage({ title: "Quedar notes" });
    const others = Array.from({ length: 5 }, (_, index) => word(`palabra${index}`, `gloss ${index}`));
    const text = others.map((item) => item.term).join(" ");
    const candidates = findKeepCandidates([quedar, page, ...others], text, {
      attachedIds: ["user:gone", page.id, quedar.id],
      limit: 3,
    });

    expect(candidates).toHaveLength(3);
    expect(candidates[0]).toMatchObject({ term: "quedar", matchedBy: "attached" });
    expect(candidates.slice(1).every((candidate) => candidate.matchedBy === "term")).toBe(true);
  });

  it("are found even when the conversation text is empty", () => {
    const quedar = word("quedar", "to remain");
    expect(terms(findKeepCandidates([quedar], "", { attachedIds: [quedar.id] }))).toEqual(["quedar"]);
  });
});

describe("candidateLinesForRequest", () => {
  it("never sends a link or an internal key from a term or gloss", () => {
    const ir = word("ir", "go https://private.example/export(1)?token=abc user:other-record");
    const [line] = candidateLinesForRequest(findKeepCandidates([ir], "", { attachedIds: [ir.id] })).split("\n");
    expect(line).toBe("c1 | ir | word | go [link]");
  });

  it("sends term, form and a short gloss under the reference, never the item id", () => {
    const item = phrase("echar | de\nmenos", `to miss (someone) ${"very ".repeat(30)}`);
    const lines = candidateLinesForRequest(findKeepCandidates([item], "echar de menos"));
    expect(lines.startsWith("c1 | echar de menos | phrase | to miss (someone)")).toBe(true);
    expect(lines).not.toContain("user:");
    expect(lines).not.toContain(item.id);
    expect(lines.split(" | ")[3].length).toBeLessThanOrEqual(80);
  });
});

describe("group members", () => {
  it("are chosen first sent first, without entries attached on their own or deleted ones, up to Keep's limit", () => {
    const members = Array.from({ length: 70 }, (_, index) => word(`palabra${index}`, "x"));
    const groupMembers = [
      { itemId: "user:deleted", detail: "meanings" },
      ...members.map((item) => ({ itemId: item.id, detail: "meanings" })),
    ];
    const { members: chosen, omitted } = selectGroupMembers(members, groupMembers, [members[0].id]);
    expect(chosen).toHaveLength(MAX_KEEP_GROUP_MEMBERS);
    expect(chosen[0].itemId).toBe(members[1].id);
    expect(omitted).toBe(69 - MAX_KEEP_GROUP_MEMBERS);
  });

  it("follow attached entries outside the 40-entry limit, which still covers attached entries and matches", () => {
    const attached = word("quedar", "to remain");
    const grouped = [word("picar", "to chop"), word("hervir", "to boil")];
    const matched = Array.from({ length: 45 }, (_, index) => phrase(`frase número ${index}`, "x"));
    const text = `${matched.map((item) => item.term).join(". ")}. picar`;
    const found = findKeepCandidates([attached, ...grouped, ...matched], text, {
      attachedIds: [attached.id],
      groupIds: grouped.map((item) => item.id),
    });

    expect(found.slice(0, 3).map((candidate) => [candidate.term, candidate.matchedBy])).toEqual([
      ["quedar", "attached"], ["picar", "group"], ["hervir", "group"],
    ]);
    // A group member is never matched a second time, and the matches fill the remaining 39.
    expect(found.filter((candidate) => candidate.term === "picar")).toHaveLength(1);
    expect(found.filter((candidate) => candidate.matchedBy !== "group")).toHaveLength(40);
    expect(found.map((candidate) => candidate.ref)).toEqual(found.map((_candidate, index) => `c${index + 1}`));
  });
});
