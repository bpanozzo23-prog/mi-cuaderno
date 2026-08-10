import { describe, expect, it } from "vitest";
import {
  emptyCollection,
  emptyGrammar,
  emptySource,
  enabledPageRoles,
  canonicalGrammarSections,
  grammarSectionBreadcrumb,
  grammarSectionHierarchy,
  grammarStructureCounts,
  isHttpSourceUrl,
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
    expect(section.parentId).toBeNull();
    expect(section.examples[0]).toEqual(example);
  });

  it("accepts one level of Grammar subsections regardless of stored parent order", () => {
    const rootOne = "grammar-section:11111111-1111-4111-8111-111111111111";
    const rootTwo = "grammar-section:22222222-2222-4222-8222-222222222222";
    const child = "grammar-section:33333333-3333-4333-8333-333333333333";
    const grammar = emptyGrammar({
      enabled: true,
      sections: [
        { id: child, parentId: rootOne, name: "Examples", explanation: "", pattern: "", examples: [] },
        { id: rootOne, parentId: null, name: "Indicative", explanation: "", pattern: "", examples: [] },
        { id: rootTwo, parentId: null, name: "Subjunctive", explanation: "", pattern: "", examples: [] },
        {
          id: "grammar-section:44444444-4444-4444-8444-444444444444",
          parentId: rootTwo,
          name: "Examples",
          explanation: "",
          pattern: "",
          examples: [],
        },
      ],
    });

    expect(validatePageStructures(validPage({ pageFocus: "grammar", grammar }))).toEqual([]);
  });

  it("derives a canonical tree, counts, and breadcrumbs without changing section objects", () => {
    const root = {
      id: "grammar-section:11111111-1111-4111-8111-111111111111",
      parentId: null,
      name: "Indicative",
      examples: [{ id: "example:one" }],
    };
    const child = {
      id: "grammar-section:22222222-2222-4222-8222-222222222222",
      parentId: root.id,
      name: "SPOCK",
      examples: [{ id: "example:two" }, { id: "example:three" }],
    };
    const otherRoot = {
      id: "grammar-section:33333333-3333-4333-8333-333333333333",
      parentId: null,
      name: "Subjunctive",
      examples: [],
    };
    const stored = [child, root, otherRoot];

    const hierarchy = grammarSectionHierarchy(stored);
    expect(hierarchy.roots).toEqual([root, otherRoot]);
    expect(hierarchy.childrenByParent.get(root.id)).toEqual([child]);
    expect(canonicalGrammarSections(stored)).toEqual([root, child, otherRoot]);
    expect(grammarStructureCounts(stored)).toEqual({ sections: 2, subsections: 1, examples: 3 });
    expect(grammarSectionBreadcrumb(child, stored)).toBe("Indicative › SPOCK");
    expect(grammarSectionBreadcrumb(root, stored)).toBe("Indicative");
  });

  it.each([
    ["a missing parent field", (sections) => { delete sections[0].parentId; }, /parentId/],
    ["a self parent", (sections) => { sections[0].parentId = sections[0].id; }, /itself/],
    ["a dangling parent", (sections) => {
      sections[0].parentId = "grammar-section:99999999-9999-4999-8999-999999999999";
    }, /same page/],
    ["a grandchild", (sections) => { sections[2].parentId = sections[1].id; }, /one subsection level/],
    ["a parent cycle", (sections) => {
      sections[0].parentId = sections[1].id;
      sections[1].parentId = sections[0].id;
    }, /cycle/],
    ["a duplicate sibling name", (sections) => { sections[2].name = "Child"; }, /unique names among siblings/],
  ])("rejects %s", (_label, mutate, message) => {
    const sections = [
      {
        id: "grammar-section:11111111-1111-4111-8111-111111111111",
        parentId: null,
        name: "Root",
        explanation: "",
        pattern: "",
        examples: [],
      },
      {
        id: "grammar-section:22222222-2222-4222-8222-222222222222",
        parentId: "grammar-section:11111111-1111-4111-8111-111111111111",
        name: "Child",
        explanation: "",
        pattern: "",
        examples: [],
      },
      {
        id: "grammar-section:33333333-3333-4333-8333-333333333333",
        parentId: "grammar-section:11111111-1111-4111-8111-111111111111",
        name: "Other child",
        explanation: "",
        pattern: "",
        examples: [],
      },
    ];
    mutate(sections);
    const grammar = { enabled: true, keyIdea: "", sections };

    expect(validatePageStructures(validPage({ pageFocus: "grammar", grammar })).join(" ")).toMatch(message);
  });

  it("validates legacy schema-v5 sections before migration without changing them", () => {
    const section = {
      id: "grammar-section:11111111-1111-4111-8111-111111111111",
      name: "Use",
      explanation: "",
      pattern: "",
      examples: [],
    };
    const page = validPage({
      grammar: { enabled: false, keyIdea: "", sections: [section] },
    });

    expect(validatePageStructures(page, { schemaVersion: 5 })).toEqual([]);
    expect(section).not.toHaveProperty("parentId");
    expect(validatePageStructures({
      ...page,
      grammar: { ...page.grammar, sections: [{ ...section, parentId: null }] },
    }, { schemaVersion: 5 }).join(" ")).toMatch(/not part of schema v5/);
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
      /not part of schema v6/
    );
  });

  it("accepts only complete HTTP(S) Source URLs", () => {
    expect(isHttpSourceUrl("https://example.com/lesson")).toBe(true);
    expect(isHttpSourceUrl("http://localhost:5173/source")).toBe(true);
    expect(isHttpSourceUrl("https://")).toBe(false);
    expect(isHttpSourceUrl("example.com/source")).toBe(false);
    expect(isHttpSourceUrl("ftp://example.com/source")).toBe(false);

    const invalid = validPage({ source: emptySource({ url: "https://" }) });
    expect(validatePageStructures(invalid).join(" ")).toMatch(/http\(s\) URL/);
  });
});
