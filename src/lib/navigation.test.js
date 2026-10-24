import { describe, expect, it } from "vitest";
import {
  NAVIGATION_STATE_KEY,
  activeRoute,
  createNavigation,
  historyStateWithNavigation,
  initializeNavigation,
  navigationFromHistoryState,
  pushDestination,
  replaceActiveDestination,
  sanitizeHydratedNavigation,
  selectPrimaryTab,
  validateNavigation,
  withoutUnavailableTab,
} from "./navigation.js";

function keys(prefix = "visit") {
  let index = 0;
  return () => `${prefix}:${++index}`;
}

describe("browser navigation snapshots", () => {
  it("validates and copies only the v1 allowlisted shape", () => {
    const navigation = createNavigation({ makeVisitKey: keys() });
    const stored = historyStateWithNavigation({ unrelated: true }, {
      ...navigation,
      injected: "discard me",
      stacks: {
        ...navigation.stacks,
        cuaderno: [
          navigation.stacks.cuaderno[0],
          {
            tab: "cuaderno",
            screen: "detail",
            id: "dict:wiktionary-es:casa:noun",
            visitKey: "visit:detail",
            draft: "must not survive",
          },
        ],
      },
    });

    const restored = navigationFromHistoryState(stored, { makeVisitKey: keys("fallback") });

    expect(stored.unrelated).toBe(true);
    expect(restored.injected).toBeUndefined();
    expect(activeRoute(restored)).toEqual({
      tab: "cuaderno",
      screen: "detail",
      id: "dict:wiktionary-es:casa:noun",
      visitKey: "visit:detail",
    });
    expect(activeRoute(restored).draft).toBeUndefined();
    expect(validateNavigation({ ...navigation, version: 2 })).toBeNull();
  });

  it("drops invalid routes while preserving the nearest valid destination", () => {
    const navigation = createNavigation({ makeVisitKey: keys() });
    navigation.stacks.cuaderno.push(
      { tab: "cuaderno", screen: "not-a-screen", id: null, visitKey: "visit:bad" },
      { tab: "cuaderno", screen: "pages", id: null, visitKey: "visit:pages" },
    );

    const restored = validateNavigation(navigation, { makeVisitKey: keys("fallback") });
    expect(restored.stacks.cuaderno.map((route) => route.screen)).toEqual(["landing", "pages"]);
  });

  it("pushes on one tab and restores another tab's remembered stack", () => {
    const initial = createNavigation({ makeVisitKey: keys() });
    const pages = pushDestination(initial, { tab: "cuaderno", screen: "pages" }, { visitKey: "visit:pages" });
    const diario = selectPrimaryTab(pages, "diario");
    const read = pushDestination(diario, { tab: "diario", screen: "read", id: "journal-1" }, { visitKey: "visit:read" });
    const restored = selectPrimaryTab(read, "cuaderno");

    expect(activeRoute(restored).screen).toBe("pages");
    expect(restored.stacks.diario.at(-1).id).toBe("journal-1");
    expect(restored.depth).toBe(4);
  });

  it("deduplicates an exact active destination", () => {
    const initial = createNavigation({ makeVisitKey: keys() });
    const pages = pushDestination(initial, { tab: "cuaderno", screen: "pages" }, { visitKey: "visit:pages" });
    expect(pushDestination(pages, { tab: "cuaderno", screen: "pages" }, { visitKey: "visit:other" })).toBe(pages);
  });

  it("reselects an active tab by pushing a root reset that Back can undo", () => {
    const initial = createNavigation({ makeVisitKey: keys() });
    const pages = pushDestination(initial, { tab: "cuaderno", screen: "pages" }, { visitKey: "visit:pages" });
    const reset = selectPrimaryTab(pages, "cuaderno", { visitKey: "visit:reset" });

    expect(activeRoute(reset)).toMatchObject({ tab: "cuaderno", screen: "landing", visitKey: "visit:reset" });
    expect(reset.depth).toBe(pages.depth + 1);
    expect(reset.backLabel).toBe("Pages");
  });

  it("sanitizes transient search and unsaved-editor visits after hydration", () => {
    let navigation = createNavigation({ makeVisitKey: keys() });
    navigation = pushDestination(navigation, { tab: "cuaderno", screen: "lexical" }, { visitKey: "visit:lexical" });
    navigation = pushDestination(navigation, { tab: "cuaderno", screen: "search" }, { visitKey: "visit:search" });
    navigation = selectPrimaryTab(navigation, "diario");
    navigation = pushDestination(
      navigation,
      { tab: "diario", screen: "read", id: "journal-1" },
      { visitKey: "visit:read" },
    );
    navigation = pushDestination(navigation, { tab: "diario", screen: "edit" }, { visitKey: "visit:draft" });

    const sanitized = sanitizeHydratedNavigation(navigation);
    expect(sanitized.stacks.cuaderno.map((route) => route.screen)).toEqual(["landing"]);
    expect(sanitized.stacks.diario.map((route) => route.screen)).toEqual(["home"]);
  });

  it("keeps stable routes and moves a canonical destination between stacks on replace", () => {
    let navigation = createNavigation({ makeVisitKey: keys() });
    navigation = pushDestination(
      navigation,
      { tab: "cuaderno", screen: "detail", id: "page-1" },
      { visitKey: "visit:item" },
    );
    const moved = replaceActiveDestination(navigation, {
      tab: "diario",
      screen: "read",
      id: "page-1",
    });

    expect(activeRoute(moved)).toMatchObject({ tab: "diario", screen: "read", id: "page-1", visitKey: "visit:item" });
    expect(moved.stacks.cuaderno.map((route) => route.screen)).toEqual(["landing"]);
    expect(moved.depth).toBe(navigation.depth);
  });

  it("gives a one-shot share precedence over a restorable history destination", () => {
    const stored = pushDestination(
      createNavigation({ makeVisitKey: keys("stored") }),
      { tab: "repaso", screen: "stats" },
      { visitKey: "stored:stats" },
    );
    const initialized = initializeNavigation({
      historyState: { [NAVIGATION_STATE_KEY]: stored },
      sharePayload: { kind: "text", text: "madrugar" },
      makeVisitKey: keys("share"),
    });

    expect(activeRoute(initialized.navigation)).toMatchObject({ tab: "cuaderno", screen: "landing" });
    expect(initialized.sharePayload.text).toBe("madrugar");
    expect(initialized.restored).toBe(false);
  });
});

describe("Pregunta tab", () => {
  it("is a valid destination with its own root", () => {
    const navigation = createNavigation({ makeVisitKey: keys() });
    expect(navigation.stacks.pregunta).toEqual([
      expect.objectContaining({ tab: "pregunta", screen: "home", id: null }),
    ]);
    const selected = selectPrimaryTab(navigation, "pregunta", { visitKey: "visit:x" });
    expect(selected.activeTab).toBe("pregunta");
  });

  it("gives an older snapshot without a Pregunta stack a fresh root", () => {
    const navigation = createNavigation({ makeVisitKey: keys() });
    const { pregunta: _omitted, ...olderStacks } = navigation.stacks;
    const restored = validateNavigation({ ...navigation, stacks: olderStacks }, { makeVisitKey: keys("new") });
    expect(restored.stacks.pregunta).toEqual([
      expect.objectContaining({ tab: "pregunta", screen: "home", visitKey: "new:1" }),
    ]);
    expect(restored.stacks.cuaderno).toEqual(navigation.stacks.cuaderno);
  });

  it("moves off an unavailable tab and keeps every stack", () => {
    const navigation = selectPrimaryTab(createNavigation({ makeVisitKey: keys() }), "pregunta");
    const moved = withoutUnavailableTab(navigation, "pregunta");
    expect(moved.activeTab).toBe("cuaderno");
    expect(moved.stacks).toBe(navigation.stacks);
    const elsewhere = createNavigation({ makeVisitKey: keys() });
    expect(withoutUnavailableTab(elsewhere, "pregunta")).toBe(elsewhere);
  });
});
