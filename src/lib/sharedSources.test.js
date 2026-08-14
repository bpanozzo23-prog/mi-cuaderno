import { describe, expect, it } from "vitest";
import { makeLexical, makePage } from "../test/factories.js";
import {
  buildSharedSourceIndex,
  canonicalSharedSourceUrl,
  sharedSourcePeers,
} from "./sharedSources.js";

describe("exact shared-source URLs", () => {
  it("trims edge whitespace but keeps case, query, and fragment identity exact", () => {
    expect(canonicalSharedSourceUrl("  https://example.com/Watch?v=1#part  "))
      .toBe("https://example.com/Watch?v=1#part");
    expect(canonicalSharedSourceUrl("ftp://example.com/file")).toBe("");
    expect(canonicalSharedSourceUrl("not a URL")).toBe("");

    const current = makeLexical({ mediaLinks: [{ url: " https://example.com/Watch?v=1 " }] });
    const exact = makePage({ mediaLinks: [{ url: "https://example.com/Watch?v=1" }] });
    const differentCase = makePage({ mediaLinks: [{ url: "https://example.com/watch?v=1" }] });
    const differentQuery = makePage({ mediaLinks: [{ url: "https://example.com/Watch?v=2" }] });
    expect(sharedSourcePeers([current, exact, differentCase, differentQuery], current.id, current.mediaLinks[0].url)
      .map((row) => row.itemId)).toEqual([exact.id]);
  });

  it("deduplicates one item across repeated media and its active Source URL", () => {
    const url = "https://example.com/lesson";
    const page = makePage({
      pageFocus: "source",
      mediaLinks: [{ url }, { url: ` ${url} ` }],
      source: { enabled: true, url },
    });
    const disabled = makePage({ source: { enabled: false, url } });
    const rows = buildSharedSourceIndex([page, disabled]).get(url);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ itemId: page.id, origins: ["media", "source"], kindLabel: "Page", roleLabel: "Source" });
  });

  it("includes words, phrases, pages, and Diario in notebook order", () => {
    const url = "https://example.com/story";
    const word = makeLexical({ term: "cuento", mediaLinks: [{ url }] });
    const phrase = makeLexical({ term: "érase una vez", form: "phrase", mediaLinks: [{ url }] });
    const page = makePage({ title: "Stories", mediaLinks: [{ url }] });
    const journal = makePage({ title: "Reading", pageDate: "2026-08-12", mediaLinks: [{ url }] });
    const rows = buildSharedSourceIndex([word, phrase, page, journal]).get(url);

    expect(rows.map((row) => row.itemId)).toEqual([word.id, phrase.id, page.id, journal.id]);
    expect(rows.map((row) => row.kindLabel)).toEqual(["Word", "Phrase", "Page", "Diario"]);
    expect(rows[3].date).toBe("2026-08-12");
  });
});
