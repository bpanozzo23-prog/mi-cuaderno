import { describe, expect, it } from "vitest";
import { matchesTypeFilter, FILTERS } from "./filters.js";
import { pickerMatches } from "./links.js";
import {
  BROWSE_ORDERS,
  MAINTENANCE_VIEWS,
  PAGE_GROUPINGS,
  groupPages,
  maintenanceItems,
  orderItems,
  tagCountsIn,
} from "./organization.js";
import { meaningsFromTranslation } from "./meanings.js";

const at = (day) => `2026-07-${String(day).padStart(2, "0")}T10:00:00.000Z`;

const word = (id, over = {}) => {
  const hasTranslation = Object.prototype.hasOwnProperty.call(over, "translation");
  const { translation, meanings, ...rest } = over;
  return {
    id,
    type: "lexical",
    form: "word",
    term: id,
    meanings: meanings ?? meaningsFromTranslation(hasTranslation ? translation : "meaning"),
    myExamples: [{ es: "ejemplo", en: "example" }],
    tags: [],
    linkedKeys: [],
    createdAt: at(1),
    updatedAt: at(1),
    ...rest,
  };
};

const page = (id, over = {}) => ({
  id,
  type: "page",
  title: id,
  body: "",
  tags: [],
  linkedKeys: [],
  createdAt: at(1),
  updatedAt: at(1),
  ...over,
});

const ids = (items) => items.map((item) => item.id);
const countsObject = (rows) => Object.fromEntries(rows.map(({ tag, count }) => [tag, count]));

describe("Phase 5b browse ordering", () => {
  it("copies the current recently-touched order instead of re-sorting the shared array", () => {
    const current = [
      word("zorro", { updatedAt: at(1) }),
      word("abeja", { updatedAt: at(30) }),
      page("source", { title: "casa", updatedAt: at(15) }),
    ];

    const ordered = orderItems(current, BROWSE_ORDERS.touched);

    expect(ids(ordered)).toEqual(["zorro", "abeja", "source"]);
    expect(ordered).not.toBe(current);
    expect(ordered[0]).toBe(current[0]);
  });

  it("orders recently added by createdAt rather than updatedAt", () => {
    const items = [
      word("abeja", { createdAt: at(2), updatedAt: at(30) }),
      word("zorro", { createdAt: at(30), updatedAt: at(1) }),
      page("source", { title: "casa", createdAt: at(15), updatedAt: at(15) }),
    ];

    expect(ids(orderItems(items, BROWSE_ORDERS.added))).toEqual(["zorro", "source", "abeja"]);
  });

  it("orders mixed item headings A–Z with Spanish collation", () => {
    const items = [
      word("zorro"),
      word("nandu", { term: "ñandú" }),
      page("source", { title: "casa" }),
      word("abeja"),
    ];

    expect(ids(orderItems(items, BROWSE_ORDERS.alphabetical))).toEqual([
      "abeja",
      "source",
      "nandu",
      "zorro",
    ]);
  });

  it("orders an untitled page by the fallback heading shown in the interface", () => {
    const items = [page("blank", { title: "" }), word("casa"), word("zapato")];

    expect(ids(orderItems(items, BROWSE_ORDERS.alphabetical))).toEqual([
      "casa",
      "blank",
      "zapato",
    ]);
  });

  it("never mutates source order, tags or links, so the empty link picker keeps recency", () => {
    const items = Object.freeze([
      Object.freeze(word("newer", { tags: Object.freeze(["verbs"]), linkedKeys: Object.freeze([]) })),
      Object.freeze(word("older", { tags: Object.freeze(["study"]), linkedKeys: Object.freeze([]) })),
    ]);

    orderItems(items, BROWSE_ORDERS.alphabetical);
    orderItems(items, BROWSE_ORDERS.added);
    maintenanceItems(items, MAINTENANCE_VIEWS.unlinked);
    tagCountsIn(items);

    expect(ids(items)).toEqual(["newer", "older"]);
    expect(pickerMatches(items, "").map((row) => row.item.id)).toEqual(["newer", "older"]);
    expect(items[0].tags).toEqual(["verbs"]);
    expect(items[0].linkedKeys).toEqual([]);
  });
});

describe("Phase 5b maintenance views", () => {
  it("finds rolling 7-day and 30-day additions without accepting future or invalid dates", () => {
    const now = new Date("2026-08-15T10:00:00.000Z");
    const items = [
      word("today", { createdAt: "2026-08-15T09:00:00.000Z" }),
      word("seven-day-edge", { createdAt: "2026-08-08T10:00:00.000Z" }),
      page("twenty-days", { createdAt: "2026-07-26T10:00:00.000Z" }),
      word("thirty-day-edge", { createdAt: "2026-07-16T10:00:00.000Z" }),
      word("too-old", { createdAt: "2026-07-16T09:59:59.999Z" }),
      word("future", { createdAt: "2026-08-15T10:00:00.001Z" }),
      word("invalid", { createdAt: "not-a-date" }),
    ];

    expect(ids(maintenanceItems(items, MAINTENANCE_VIEWS.added7Days, now))).toEqual([
      "today",
      "seven-day-edge",
    ]);
    expect(ids(maintenanceItems(items, MAINTENANCE_VIEWS.added30Days, now))).toEqual([
      "today",
      "seven-day-edge",
      "twenty-days",
      "thirty-day-edge",
    ]);
  });

  it("finds media-backed items across content types", () => {
    const items = [
      word("video", { mediaLinks: [{ url: "https://example.com/video", label: "Lesson" }] }),
      page("image", { mediaLinks: [{ url: "https://example.com/image.jpg", label: "Image" }] }),
      word("plain", { mediaLinks: [] }),
    ];

    expect(ids(maintenanceItems(items, MAINTENANCE_VIEWS.withMedia))).toEqual(["video", "image"]);
  });

  it("finds only unattached words, never phrases or stale stored attachments", () => {
    const items = [
      word("unattached"),
      word("attached", { dictKey: "dict:wiktionary-es:attached:verb" }),
      word("phrase", { form: "phrase" }),
      page("notes"),
    ];

    expect(ids(maintenanceItems(items, MAINTENANCE_VIEWS.unattachedWord))).toEqual(["unattached"]);
  });

  it("finds only lexical items whose meaning is absent or blank", () => {
    const items = [
      word("empty", { translation: "" }),
      word("spaces", { translation: "  \n " }),
      word("missing", { translation: undefined }),
      word("complete"),
      page("page-without-meaning"),
    ];

    expect(ids(maintenanceItems(items, MAINTENANCE_VIEWS.missingMeaning))).toEqual([
      "empty",
      "spaces",
      "missing",
    ]);
  });

  it("finds lexical items without personal examples, including dictionary-attached words", () => {
    const items = [
      word("empty", { myExamples: [] }),
      word("missing", { myExamples: undefined }),
      word("attached", { myExamples: [], dictKey: "dict:wiktionary-es:casa:noun" }),
      word("assigned", { myExamples: [], meanings: [{ ...meaningsFromTranslation("meaning")[0], examples: [{ es: "Ejemplo.", en: "Example." }] }] }),
      word("complete"),
      page("page-without-examples"),
    ];

    expect(ids(maintenanceItems(items, MAINTENANCE_VIEWS.missingExamples))).toEqual([
      "empty",
      "missing",
      "attached",
    ]);
  });

  it("excludes both sides of a personal link and an item with a stored dictionary link", () => {
    const linkedWord = word("linked-word");
    const linkingPage = page("linking-page", { linkedKeys: [linkedWord.id] });
    const dictionaryLinked = word("dictionary-linked", {
      linkedKeys: ["dict:wiktionary-es:casa:noun"],
    });
    const isolatedWord = word("isolated-word");
    const isolatedPage = page("isolated-page");

    const items = [linkedWord, linkingPage, dictionaryLinked, isolatedWord, isolatedPage];

    expect(ids(maintenanceItems(items, MAINTENANCE_VIEWS.unlinked))).toEqual([
      "isolated-word",
      "isolated-page",
    ]);
  });

  it("derives backlinks from the full notebook before a later type filter", () => {
    const linkedWord = word("linked-word");
    const isolatedWord = word("isolated-word");
    const linkingPage = page("linking-page", { linkedKeys: [linkedWord.id] });

    const maintenance = maintenanceItems(
      [linkedWord, isolatedWord, linkingPage],
      MAINTENANCE_VIEWS.unlinked
    );
    const wordsOnly = maintenance.filter((item) => matchesTypeFilter(item, FILTERS.word));

    expect(ids(wordsOnly)).toEqual(["isolated-word"]);
  });

  it("returns a copy of the full set for all or an unknown future view", () => {
    const items = [word("one"), page("two")];
    const all = maintenanceItems(items, MAINTENANCE_VIEWS.all);
    const unknown = maintenanceItems(items, "future-view");

    expect(ids(all)).toEqual(["one", "two"]);
    expect(ids(unknown)).toEqual(["one", "two"]);
    expect(all).not.toBe(items);
    expect(unknown).not.toBe(items);
  });
});

describe("Phase 5b contextual tag counts", () => {
  it("counts the active type/maintenance context before a selected tag narrows cards", () => {
    const items = [
      word("first", { translation: "", tags: ["verbs", "mexico"] }),
      word("second", { translation: " ", tags: ["verbs"] }),
      word("complete", { tags: ["complete"] }),
      page("page", { tags: ["source"] }),
    ];

    const maintenance = maintenanceItems(items, MAINTENANCE_VIEWS.missingMeaning);
    const context = maintenance.filter((item) => matchesTypeFilter(item, FILTERS.word));
    const counts = tagCountsIn(context);
    const selectedTagCards = context.filter((item) => item.tags.includes("mexico"));

    expect(countsObject(counts)).toEqual({ mexico: 1, verbs: 2 });
    expect(ids(selectedTagCards)).toEqual(["first"]);
  });

  it("counts items once per exact stored spelling without normalizing or rewriting tags", () => {
    const items = [
      word("one", { tags: ["Mexico", "verbs", "verbs"] }),
      word("two", { tags: ["mexico", "verbs"] }),
    ];

    expect(countsObject(tagCountsIn(items))).toEqual({ Mexico: 1, mexico: 1, verbs: 2 });
    expect(items[0].tags).toEqual(["Mexico", "verbs", "verbs"]);
  });
});

describe("Pages hub grouping", () => {
  const dayIso = (day) => `2026-08-${String(day).padStart(2, "0")}T10:00:00.000Z`;
  const TODAY = "2026-08-25";

  const structured = (id, over = {}) => page(id, {
    pageFocus: "notes",
    noteSections: [],
    collection: { enabled: false, groups: [] },
    source: { enabled: false, format: "", creator: "", scope: "", url: "", context: "", captures: [] },
    grammar: { enabled: false, keyIdea: "", sections: [] },
    ...over,
  });

  const grouped = (rows) => rows.map(({ key, items }) => [key, ids(items)]);

  it("gives a multi-role page exactly one home, under the role its folder tab names", () => {
    const guide = structured("guide", {
      pageFocus: "grammar",
      grammar: { enabled: true, keyIdea: "", sections: [] },
      collection: { enabled: true, groups: [] },
    });
    const collection = structured("collection", {
      pageFocus: "vocabulary",
      collection: { enabled: true, groups: [] },
    });
    const notes = structured("notes");

    const rows = groupPages([guide, collection, notes], PAGE_GROUPINGS.kind, { today: TODAY });

    expect(grouped(rows)).toEqual([
      ["grammar", ["guide"]],
      ["vocabulary", ["collection"]],
      ["notes", ["notes"]],
    ]);
    // The Vocabulary structure the Grammar guide also enables must not put it in a second pile.
    expect(rows.flatMap(({ items }) => ids(items))).toEqual(["guide", "collection", "notes"]);
  });

  it("keeps the fixed kind order and the caller's order inside each group", () => {
    const sourcePage = structured("source-page", {
      pageFocus: "source",
      source: { enabled: true, format: "book", creator: "", scope: "", url: "", context: "", captures: [] },
    });

    const rows = groupPages(
      [structured("notes-b"), structured("notes-a"), sourcePage],
      PAGE_GROUPINGS.kind,
      { today: TODAY }
    );

    expect(grouped(rows)).toEqual([
      ["source", ["source-page"]],
      ["notes", ["notes-b", "notes-a"]],
    ]);
  });

  it("buckets last-touched pages by calendar day, Monday week and calendar month", () => {
    const rows = groupPages(
      [
        page("today", { updatedAt: dayIso(25) }),
        page("monday", { updatedAt: dayIso(24) }),
        page("sunday", { updatedAt: dayIso(23) }),
        page("month-start", { updatedAt: dayIso(1) }),
        page("last-month", { updatedAt: "2026-07-31T10:00:00.000Z" }),
      ],
      PAGE_GROUPINGS.touched,
      { today: TODAY }
    );

    expect(grouped(rows)).toEqual([
      ["today", ["today"]],
      // Monday the 24th starts the week that holds Tuesday the 25th; Sunday the 23rd ended the
      // previous one, so it falls back to the month rather than reading as "this week".
      ["week", ["monday"]],
      ["month", ["sunday", "month-start"]],
      ["earlier", ["last-month"]],
    ]);
  });

  it("reads a week that straddles two months as this week", () => {
    const rows = groupPages(
      [page("monday", { updatedAt: "2026-08-31T10:00:00.000Z" })],
      PAGE_GROUPINGS.touched,
      { today: "2026-09-01" }
    );

    expect(grouped(rows)).toEqual([["week", ["monday"]]]);
  });

  it("groups Added by createdAt while Last touched reads updatedAt", () => {
    const old = page("old-page", { createdAt: "2026-06-02T10:00:00.000Z", updatedAt: dayIso(25) });

    expect(grouped(groupPages([old], PAGE_GROUPINGS.touched, { today: TODAY })))
      .toEqual([["today", ["old-page"]]]);
    expect(grouped(groupPages([old], PAGE_GROUPINGS.added, { today: TODAY })))
      .toEqual([["earlier", ["old-page"]]]);
  });

  it("keeps a page with an unusable timestamp in the list rather than dropping it", () => {
    const rows = groupPages(
      [page("broken", { updatedAt: "not a date" }), page("missing", { updatedAt: undefined })],
      PAGE_GROUPINGS.touched,
      { today: TODAY }
    );

    expect(grouped(rows)).toEqual([["earlier", ["broken", "missing"]]]);
  });

  it("returns no groups for the default, so the hub renders its ordinary flat stack", () => {
    expect(groupPages([page("one")], PAGE_GROUPINGS.none, { today: TODAY })).toEqual([]);
    expect(groupPages([page("one")], undefined, { today: TODAY })).toEqual([]);
  });
});
