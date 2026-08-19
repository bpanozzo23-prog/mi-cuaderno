export const NAVIGATION_STATE_KEY = "mcNavigation";
export const NAVIGATION_VERSION = 1;

export const PRIMARY_TABS = ["cuaderno", "diario", "repaso", "ajustes"];

export const ROOT_SCREENS = Object.freeze({
  cuaderno: "landing",
  diario: "home",
  repaso: "home",
  ajustes: "home",
});

export const SCREENS_BY_TAB = Object.freeze({
  cuaderno: new Set([
    "landing",
    "browse",
    "search",
    "pages",
    "lexical",
    "detail",
    "biography",
    "wander",
    "cuidar",
  ]),
  diario: new Set(["home", "read", "edit"]),
  repaso: new Set(["home", "stats", "gym", "gym-performance"]),
  ajustes: new Set(["home"]),
});

const ITEM_SCREENS = new Set(["detail", "biography", "wander", "read"]);
const OPTIONAL_ITEM_SCREENS = new Set(["edit"]);
const MAX_STACK_LENGTH = 64;
const MAX_DEPTH = 1_000_000;
const SAFE_VISIT_KEY = /^[A-Za-z0-9._:-]{1,160}$/;
const SAFE_ITEM_ID = /^[^\u0000-\u001f\u007f]{1,512}$/;

export const BACK_LABELS = new Set([
  "Cuaderno",
  "Todo el cuaderno",
  "Browse all",
  "Search results",
  "Pages",
  "Words & phrases",
  "Historia",
  "Wander",
  "Cuidar mi cuaderno",
  "Diario",
  "Repaso",
  "Estadísticas",
  "Gym",
  "Conjugation performance",
  "Ajustes",
  "Atrás",
]);

const ROUTE_LABELS = Object.freeze({
  "cuaderno:landing": "Todo el cuaderno",
  "cuaderno:browse": "Browse all",
  "cuaderno:search": "Search results",
  "cuaderno:pages": "Pages",
  "cuaderno:lexical": "Words & phrases",
  "cuaderno:detail": "Atrás",
  "cuaderno:biography": "Historia",
  "cuaderno:wander": "Wander",
  "cuaderno:cuidar": "Cuidar mi cuaderno",
  "diario:home": "Diario",
  "diario:read": "Atrás",
  "diario:edit": "Atrás",
  "repaso:home": "Repaso",
  "repaso:stats": "Estadísticas",
  "repaso:gym": "Gym",
  "repaso:gym-performance": "Conjugation performance",
  "ajustes:home": "Ajustes",
});

const isPrimaryTab = (value) => PRIMARY_TABS.includes(value);

function safeVisitKey(value) {
  return typeof value === "string" && SAFE_VISIT_KEY.test(value) ? value : null;
}

function safeItemId(value) {
  return typeof value === "string" && SAFE_ITEM_ID.test(value) ? value : null;
}

function nextVisitKey(makeVisitKey) {
  const key = makeVisitKey?.();
  if (!safeVisitKey(key)) throw new Error("Navigation visit keys must be safe non-empty strings");
  return key;
}

export function makeNavigationVisitKey() {
  if (globalThis.crypto?.randomUUID) return `v:${globalThis.crypto.randomUUID()}`;
  return `v:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}

export function makeRoute(tab, screen = ROOT_SCREENS[tab], {
  id = null,
  visitKey = makeNavigationVisitKey(),
} = {}) {
  if (!isPrimaryTab(tab) || !SCREENS_BY_TAB[tab].has(screen)) {
    throw new Error(`Unknown navigation destination: ${tab}:${screen}`);
  }
  if (ITEM_SCREENS.has(screen) && !safeItemId(id)) {
    throw new Error(`Navigation destination ${tab}:${screen} requires an item id`);
  }
  if (!ITEM_SCREENS.has(screen) && !OPTIONAL_ITEM_SCREENS.has(screen) && id !== null) {
    throw new Error(`Navigation destination ${tab}:${screen} does not accept an item id`);
  }
  if (OPTIONAL_ITEM_SCREENS.has(screen) && id !== null && !safeItemId(id)) {
    throw new Error(`Navigation destination ${tab}:${screen} has an invalid item id`);
  }
  const safeKey = safeVisitKey(visitKey);
  if (!safeKey) throw new Error("Navigation visit keys must be safe non-empty strings");
  return { tab, screen, id: id ?? null, visitKey: safeKey };
}

export function rootRoute(tab, visitKey = makeNavigationVisitKey()) {
  return makeRoute(tab, ROOT_SCREENS[tab], { visitKey });
}

export function createNavigation({
  activeTab = "cuaderno",
  depth = 0,
  makeVisitKey = makeNavigationVisitKey,
} = {}) {
  const safeTab = isPrimaryTab(activeTab) ? activeTab : "cuaderno";
  return {
    version: NAVIGATION_VERSION,
    activeTab: safeTab,
    depth: Number.isSafeInteger(depth) && depth >= 0 ? Math.min(depth, MAX_DEPTH) : 0,
    backLabel: null,
    stacks: Object.fromEntries(
      PRIMARY_TABS.map((tab) => [tab, [rootRoute(tab, nextVisitKey(makeVisitKey))]])
    ),
  };
}

function validateRoute(raw, tab) {
  if (!raw || typeof raw !== "object" || raw.tab !== tab) return null;
  if (!SCREENS_BY_TAB[tab].has(raw.screen)) return null;
  const visitKey = safeVisitKey(raw.visitKey);
  if (!visitKey) return null;

  let id = null;
  if (ITEM_SCREENS.has(raw.screen)) {
    id = safeItemId(raw.id);
    if (!id) return null;
  } else if (OPTIONAL_ITEM_SCREENS.has(raw.screen)) {
    id = raw.id === null || raw.id === undefined ? null : safeItemId(raw.id);
    if (raw.id !== null && raw.id !== undefined && !id) return null;
  } else if (raw.id !== null && raw.id !== undefined) {
    return null;
  }

  return { tab, screen: raw.screen, id, visitKey };
}

/**
 * Reads only the allowlisted v1 shape. Unknown properties and invalid routes are discarded;
 * an unknown version rejects the whole snapshot so a future format cannot be misinterpreted.
 */
export function validateNavigation(raw, { makeVisitKey = makeNavigationVisitKey } = {}) {
  if (!raw || typeof raw !== "object" || raw.version !== NAVIGATION_VERSION) return null;

  const activeTab = isPrimaryTab(raw.activeTab) ? raw.activeTab : "cuaderno";
  const depth = Number.isSafeInteger(raw.depth) && raw.depth >= 0
    ? Math.min(raw.depth, MAX_DEPTH)
    : 0;
  const backLabel = BACK_LABELS.has(raw.backLabel) ? raw.backLabel : null;
  const rawStacks = raw.stacks && typeof raw.stacks === "object" ? raw.stacks : {};
  const stacks = {};

  for (const tab of PRIMARY_TABS) {
    const candidates = Array.isArray(rawStacks[tab]) ? rawStacks[tab].slice(-MAX_STACK_LENGTH) : [];
    const routes = candidates.map((route) => validateRoute(route, tab)).filter(Boolean);
    if (routes[0]?.screen !== ROOT_SCREENS[tab]) {
      routes.unshift(rootRoute(tab, nextVisitKey(makeVisitKey)));
    }
    stacks[tab] = routes.length > 0
      ? cappedStack(routes)
      : [rootRoute(tab, nextVisitKey(makeVisitKey))];
  }

  return { version: NAVIGATION_VERSION, activeTab, depth, backLabel, stacks };
}

export function navigationFromHistoryState(state, options) {
  if (!state || typeof state !== "object") return null;
  return validateNavigation(state[NAVIGATION_STATE_KEY], options);
}

export function historyStateWithNavigation(state, navigation) {
  const existing = state && typeof state === "object" ? state : {};
  return { ...existing, [NAVIGATION_STATE_KEY]: navigation };
}

export function activeRoute(navigation) {
  const stack = navigation?.stacks?.[navigation.activeTab];
  return Array.isArray(stack) ? stack[stack.length - 1] || null : null;
}

export function sameRouteDestination(current, next) {
  return current?.id === (next?.id ?? null)
    && current?.tab === next?.tab
    && current?.screen === next?.screen;
}

export function labelForRoute(route) {
  return ROUTE_LABELS[`${route?.tab}:${route?.screen}`] || "Atrás";
}

function nextDepth(navigation) {
  return Math.min(MAX_DEPTH, navigation.depth + 1);
}

function cappedStack(routes) {
  if (routes.length <= MAX_STACK_LENGTH) return routes;
  return [routes[0], ...routes.slice(-(MAX_STACK_LENGTH - 1))];
}

/** Pushes a major destination onto its canonical tab while retaining every other tab stack. */
export function pushDestination(navigation, destination, {
  visitKey = makeNavigationVisitKey(),
} = {}) {
  const route = makeRoute(destination.tab, destination.screen, {
    id: destination.id ?? null,
    visitKey,
  });
  const current = activeRoute(navigation);
  if (sameRouteDestination(current, route)) return navigation;

  const targetStack = navigation.stacks[route.tab];
  const targetTop = targetStack[targetStack.length - 1];
  const stacks = { ...navigation.stacks };
  if (!sameRouteDestination(targetTop, route)) {
    stacks[route.tab] = cappedStack([...targetStack, route]);
  }

  return {
    ...navigation,
    activeTab: route.tab,
    depth: nextDepth(navigation),
    backLabel: labelForRoute(current),
    stacks,
  };
}

/** A different tab restores its stack; reselecting the active tab pushes a reset to its root. */
export function selectPrimaryTab(navigation, tab, {
  visitKey = makeNavigationVisitKey(),
} = {}) {
  if (!isPrimaryTab(tab)) return navigation;
  const current = activeRoute(navigation);

  if (tab !== navigation.activeTab) {
    return {
      ...navigation,
      activeTab: tab,
      depth: nextDepth(navigation),
      backLabel: labelForRoute(current),
    };
  }

  const stack = navigation.stacks[tab];
  if (stack.length === 1 && stack[0].screen === ROOT_SCREENS[tab]) return navigation;
  return {
    ...navigation,
    depth: nextDepth(navigation),
    backLabel: labelForRoute(current),
    stacks: { ...navigation.stacks, [tab]: [rootRoute(tab, visitKey)] },
  };
}

/** Replaces the active visit without changing browser chronology. */
export function replaceActiveDestination(navigation, destination, {
  preserveVisitKey = true,
  visitKey = makeNavigationVisitKey(),
} = {}) {
  const current = activeRoute(navigation);
  const route = makeRoute(destination.tab, destination.screen, {
    id: destination.id ?? null,
    visitKey: preserveVisitKey && current?.visitKey ? current.visitKey : visitKey,
  });
  if (sameRouteDestination(current, route)) return navigation;

  const stacks = { ...navigation.stacks };
  const sourceStack = navigation.stacks[navigation.activeTab];
  stacks[navigation.activeTab] = sourceStack.length > 1 ? sourceStack.slice(0, -1) : sourceStack;

  const targetStack = stacks[route.tab];
  const targetTop = targetStack[targetStack.length - 1];
  stacks[route.tab] = cappedStack(sameRouteDestination(targetTop, route)
    ? [...targetStack.slice(0, -1), route]
    : [...targetStack, route]);

  return { ...navigation, activeTab: route.tab, stacks };
}

/** Removes a missing/deleted top destination and falls back to the nearest valid route. */
export function discardActiveDestination(navigation) {
  const tab = navigation.activeTab;
  const stack = navigation.stacks[tab];
  if (stack.length <= 1) return navigation;
  return {
    ...navigation,
    stacks: { ...navigation.stacks, [tab]: stack.slice(0, -1) },
  };
}

/**
 * Removes visit-only destinations that cannot survive a document reload. Stable screens remain;
 * detail validity is checked later against the loaded notebook/dictionary.
 */
export function sanitizeHydratedNavigation(navigation, {
  hasTransientPayload = () => false,
} = {}) {
  const stacks = {};
  for (const tab of PRIMARY_TABS) {
    const root = navigation.stacks[tab][0];
    let safe = [root];
    for (const route of navigation.stacks[tab].slice(1)) {
      const missingSearch = route.screen === "search"
        && !hasTransientPayload(route.visitKey, "searchQuery");
      const missingJournalSeed = route.screen === "edit"
        && !route.id
        && !hasTransientPayload(route.visitKey, "journalSeed");
      if (missingSearch || missingJournalSeed) {
        // These screens are meaningless without their visit payload. Reset to the documented
        // launcher rather than exposing an older, unrelated route that happened to precede them.
        safe = [root];
      } else {
        safe.push(route);
      }
    }
    stacks[tab] = cappedStack(safe);
  }
  return { ...navigation, stacks };
}

/** Pure startup policy: a share wins once; otherwise a valid history snapshot is restored. */
export function initializeNavigation({
  historyState = null,
  sharePayload = null,
  makeVisitKey = makeNavigationVisitKey,
} = {}) {
  if (sharePayload) {
    const navigation = createNavigation({ makeVisitKey });
    const visitKey = activeRoute(navigation).visitKey;
    return { navigation, sharePayload, shareVisitKey: visitKey, restored: false };
  }

  const restored = navigationFromHistoryState(historyState, { makeVisitKey });
  if (restored) {
    return {
      navigation: sanitizeHydratedNavigation(restored),
      sharePayload: null,
      shareVisitKey: null,
      restored: true,
    };
  }

  return {
    navigation: createNavigation({ makeVisitKey }),
    sharePayload: null,
    shareVisitKey: null,
    restored: false,
  };
}
