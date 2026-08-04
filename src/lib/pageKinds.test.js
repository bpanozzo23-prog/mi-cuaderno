import { describe, expect, it } from "vitest";
import {
  emptyCollection,
  emptyGrammar,
  emptySource,
  enabledPageRoles,
  isJournalPage,
  newGrammarExample,
  newGrammarSection,
  newSourceCapture,
  normalizePageStructures,
  PAGE_FOCUSES,
  validatePageStructures,
} from "./pageKinds.js";

const validPage = (overrides = {}) => ({
  id: "user:page",
  type: "page",
  pageDate: null,
  pageFocus: PAGE_FOCUSES.notes,
  collection: emptyCollection(),
  source: emptySource(),
  grammar: emptyGrammar(),
  ...overrides,
});

describe("composable page kinds", () => {
  it("normalizes legacy Collections without discarding their dormant layout", () => {
    const group = {
      id: "page-group:11111111-1111-4111-8111-111111111111",
      name: "Questions",
      itemKeys: ["user:word"],
    };

    expect(normalizePageStructures({
      pageProfile: "collection",
      collection: { groups: [group] },
    })).toEqual({
      pageFocus: "vocabulary",
      collection: { enabled: true, groups: [group] },
      source: emptySource(),
      grammar: emptyGrammar(),
    });
  });

  it("derives Diario only from dated pages with no enabled structured capability", () => {
    expect(isJournalPage(validPage({ pageDate: "2026-08-04" }))).toBe(true);
    expect(isJournalPage(validPage({
      pageDate: "2026-08-04",
      source: emptySource({ enabled: true }),
    }))).toBe(false);
    expect(isJournalPage(validPage({
      pageDate: "2026-08-04",
      source: emptySource({ enabled: false, context: "Preserved hidden notes" }),
    }))).toBe(true);
  });

  it("orders badges with saved focus first and includes Notes only when Notes leads", () => {
    const all = validPage({
      pageFocus: "grammar",
      collection: emptyCollection({ enabled: true }),
      source: emptySource({ enabled: true }),
      grammar: emptyGrammar({ enabled: true }),
    });
    expect(enabledPageRoles(all)).toEqual(["grammar", "source", "vocabulary"]);
    expect(enabledPageRoles({ ...all, pageFocus: "notes" })).toEqual([
      "notes",
      "source",
      "grammar",
      "vocabulary",
    ]);
  });

  it("creates stable namespaced IDs for nested Source and Grammar records", () => {
    const capture = newSourceCapture({ text: "Nomás dime." });
    const example = newGrammarExample({ es: "Nomás dime." });
    const section = newGrammarSection({ name: "  Use  ", examples: [example] });

    expect(capture.id).toMatch(/^source-capture:/);
    expect(example.id).toMatch(/^grammar-example:/);
    expect(section.id).toMatch(/^grammar-section:/);
    expect(section.name).toBe("Use");
    expect(section.examples[0]).toEqual(example);
  });

  it("deeply validates active or hidden structures and focus consistency", () => {
    const hiddenCapture = {
      id: "source-capture:22222222-2222-4222-8222-222222222222",
      type: "reflection",
      text: "This survives hiding.",
      location: "",
      reflection: "",
      itemKeys: [],
    };
    const hidden = validPage({ source: emptySource({ captures: [hiddenCapture] }) });
    expect(validatePageStructures(hidden)).toEqual([]);

    expect(validatePageStructures({ ...hidden, pageFocus: "source" }).join(" ")).toMatch(
      /requires its structure to be enabled/
    );
    expect(validatePageStructures({
      ...hidden,
      source: { ...hidden.source, url: "example.com" },
    }).join(" ")).toMatch(/http\(s\) URL/);
    expect(validatePageStructures({ ...hidden, pageProfile: "general" }).join(" ")).toMatch(
      /not part of schema v5/
    );
  });
});
