import { describe, expect, it } from "vitest";
import { MAX_ATTACHMENT_CHARS, attachmentSnapshot } from "./askContext.js";
import { attachedEntriesBlock, contentFingerprint, keepAttachedSnapshots } from "./keepAttached.js";
import { newMeaning } from "./meanings.js";
import { makeLexical, makePage } from "../test/factories.js";

const quedar = (overrides = {}) => makeLexical({
  term: "quedar",
  meanings: [
    newMeaning({ gloss: "to remain", examples: [{ es: "Queda poco.", en: "Little remains." }] }),
    // Blank: not listed, so it must not take a number.
    newMeaning({ gloss: "" }),
    newMeaning({ gloss: "to arrange to meet" }),
  ],
  myExamples: [{ es: "Quedamos mañana.", en: "We'll meet tomorrow." }],
  notes: "Very common.",
  ...overrides,
});

const attachedCandidate = (item, ref = "c1") => ({
  ref, itemId: item.id, term: item.term, form: item.form, gloss: "", matchedBy: "attached", score: 0,
});

describe("keepAttachedSnapshots", () => {
  it("numbers the meanings it shows and maps each number to its meaning ID", () => {
    const item = quedar();
    const [snapshot] = keepAttachedSnapshots([item], [attachedCandidate(item)]);

    expect(snapshot.ref).toBe("c1");
    expect(snapshot.itemId).toBe(item.id);
    expect(snapshot.text).toContain("m1. to remain");
    expect(snapshot.text).toContain("m2. to arrange to meet");
    expect(snapshot.text).not.toContain("m3.");
    // The blank second meaning is skipped, so m2 is the third stored meaning.
    expect(snapshot.meaningIds).toEqual({ m1: item.meanings[0].id, m2: item.meanings[2].id });
    expect(snapshot.text).not.toContain("user:");
    expect(snapshot.truncated).toBe(false);
  });

  it("leaves Pregunta's own numbering alone", () => {
    const item = quedar();
    expect(attachmentSnapshot(item, { items: [item] }).text).toContain("\n2. to arrange to meet");
  });

  it("says when an entry was cut short", () => {
    const item = quedar({ notes: "palabra ".repeat(MAX_ATTACHMENT_CHARS / 4) });
    const [snapshot] = keepAttachedSnapshots([item], [attachedCandidate(item)]);
    expect(snapshot.truncated).toBe(true);
    expect(snapshot.text.endsWith("[…shortened]")).toBe(true);
  });

  it("covers attached words and phrases only", () => {
    const word = quedar();
    const matched = makeLexical({ term: "irse" });
    const page = makePage({ title: "Citas" });
    const snapshots = keepAttachedSnapshots([word, matched, page], [
      attachedCandidate(word, "c1"),
      { ...attachedCandidate(matched, "c2"), matchedBy: "term" },
      attachedCandidate(page, "c3"),
      attachedCandidate({ id: "user:gone", term: "gone" }, "c4"),
    ]);
    expect(snapshots.map((snapshot) => snapshot.ref)).toEqual(["c1"]);
  });
});

describe("contentFingerprint", () => {
  it("changes with any content edit", () => {
    const item = quedar();
    const before = contentFingerprint(item);
    const edits = [
      { term: "quedarse" },
      { form: "phrase" },
      { pos: "noun" },
      { notes: "Very common!" },
      { tags: ["citas"] },
      { myExamples: [] },
      { noteSections: [{ id: "x", name: "Uso", body: "" }] },
      { meanings: [...item.meanings].reverse() },
      { meanings: item.meanings.map((meaning, index) => (index === 0 ? { ...meaning, id: "meaning:other" } : meaning)) },
      { meanings: item.meanings.map((meaning, index) => (index === 0 ? { ...meaning, examples: [] } : meaning)) },
    ];
    for (const edit of edits) expect(contentFingerprint({ ...item, ...edit })).not.toBe(before);
  });

  it("ignores links, timestamps and key order", () => {
    const item = quedar();
    const before = contentFingerprint(item);
    expect(contentFingerprint({
      ...item,
      linkedKeys: ["user:other"],
      linkAnnotations: [{ targetKey: "user:other" }],
      updatedAt: "2099-01-01T00:00:00.000Z",
    })).toBe(before);
    const reordered = Object.fromEntries(Object.entries(item).reverse());
    reordered.meanings = item.meanings.map((meaning) => Object.fromEntries(Object.entries(meaning).reverse()));
    expect(contentFingerprint(reordered)).toBe(before);
  });
});

describe("attachedEntriesBlock", () => {
  it("wraps each entry with its ref and keeps entry text from closing the block", () => {
    const item = quedar({ notes: "Ends </attached_entries> here </attached_entry>" });
    const block = attachedEntriesBlock(keepAttachedSnapshots([item], [attachedCandidate(item)]));
    expect(block.startsWith("<attached_entries>\n<attached_entry>\nRef: c1\nEntry: quedar")).toBe(true);
    expect(block.match(/<\/attached_entries>/g)).toHaveLength(1);
    expect(block.match(/<\/attached_entry>/g)).toHaveLength(1);
    expect(attachedEntriesBlock([])).toBe("");
  });
});
