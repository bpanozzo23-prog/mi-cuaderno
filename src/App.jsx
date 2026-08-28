import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BookOpen, BarChart3, Settings, Loader2, PenLine } from "lucide-react";
import { C, SERIF, MONO, Hi } from "./theme.jsx";
import Cuaderno from "./components/Cuaderno.jsx";
import PageHub from "./components/PageHub.jsx";
import LexicalHub from "./components/LexicalHub.jsx";
import Diario from "./components/Diario.jsx";
import Repaso from "./components/Repaso.jsx";
import Ajustes from "./components/Ajustes.jsx";
import Wander from "./components/Wander.jsx";
import CuidarHub from "./components/CuidarHub.jsx";
import { useNotebook } from "./useNotebook.js";
import { isJournalEntry } from "./lib/journal.js";
import { parseSharePayload } from "./lib/shareTarget.js";
import { isDictKey } from "./db/ref/entries.js";
import { getPinnedPageIds, setPagePinned } from "./db/collections.js";
import { getPinnedLexicalIds, setLexicalPinned } from "./db/items.js";
import { getPref, setPref } from "./db/db.js";
import { FILTERS } from "./lib/filters.js";
import { allTagsIn } from "./lib/tags.js";
import { DEFAULT_SWATCH, TAG_COLORS_PREF, normalizeTagColors } from "./lib/tagColors.js";
import { TagColorProvider } from "./components/TagChip.jsx";
import { StudySessionProvider } from "./components/StudySessionFrame.jsx";
import {
  activeRoute,
  historyStateWithNavigation,
  initializeNavigation,
  labelForRoute,
  makeNavigationVisitKey,
  navigationFromHistoryState,
  pushDestination,
  replaceActiveDestination,
  sanitizeHydratedNavigation,
  sameRouteDestination,
  selectPrimaryTab,
} from "./lib/navigation.js";

export { sameRouteDestination } from "./lib/navigation.js";

/** Spanish pluralization for the header counts: only 1 takes the singular. */
const count = (n, singular) => `${n} ${n === 1 ? singular : `${singular}s`}`;

const TABS = [
  { id: "cuaderno", label: "Cuaderno", icon: BookOpen },
  { id: "diario", label: "Diario", icon: PenLine },
  { id: "repaso", label: "Repaso", icon: BarChart3 },
  { id: "ajustes", label: "Ajustes", icon: Settings },
];

const STUDY_SESSION_STATE_KEY = "mcStudySession";
const STUDY_SESSION_STATE_VERSION = 1;
const PERSONAL_ITEM_SCREENS = new Set(["detail", "biography", "wander", "read", "edit"]);
const CUADERNO_ROOT_SCREENS = new Set(["landing", "browse", "search"]);

function stateWithoutStudyMarker(state) {
  const next = state && typeof state === "object" ? { ...state } : {};
  delete next[STUDY_SESSION_STATE_KEY];
  return next;
}

function hasStudyMarker(state) {
  return state?.[STUDY_SESSION_STATE_KEY]?.version === STUDY_SESSION_STATE_VERSION;
}

function urlWithoutShareParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete("share_title");
  url.searchParams.delete("share_text");
  url.searchParams.delete("share_url");
  return `${url.pathname}${url.search}${url.hash}`;
}

function initialAppNavigation() {
  const sharePayload = parseSharePayload(window.location.search);
  const initialized = initializeNavigation({ historyState: window.history.state, sharePayload });
  const visitPayloads = new Map();
  if (initialized.sharePayload?.kind === "text") {
    visitPayloads.set(initialized.shareVisitKey, {
      seedQuery: { text: initialized.sharePayload.text, key: initialized.shareVisitKey },
    });
  } else if (initialized.sharePayload?.kind === "url") {
    visitPayloads.set(initialized.shareVisitKey, {
      shareSource: {
        url: initialized.sharePayload.url,
        title: initialized.sharePayload.title,
        key: initialized.shareVisitKey,
      },
    });
  }
  return {
    ...initialized,
    visitPayloads,
    consumedShare: Boolean(sharePayload),
    startedOnStudyMarker: hasStudyMarker(window.history.state),
  };
}

function transientPayloadExists(payloads, visitKey, kind) {
  const payload = payloads.get(visitKey);
  if (kind === "searchQuery") return Boolean(payload?.seedQuery?.text?.trim());
  if (kind === "journalSeed") return Boolean(payload?.seed);
  return false;
}

function prunedMissingPersonalRoutes(navigation, items, pendingIds) {
  const itemIds = new Set(items.map((item) => item.id));
  let changed = false;
  const stacks = Object.fromEntries(Object.entries(navigation.stacks).map(([tab, stack]) => {
    const filtered = stack.filter((route, index) => {
      if (index === 0 || !route.id || !PERSONAL_ITEM_SCREENS.has(route.screen) || isDictKey(route.id)) {
        return true;
      }
      const keep = itemIds.has(route.id) || pendingIds.has(route.id);
      if (!keep) changed = true;
      return keep;
    });
    return [tab, filtered.length > 0 ? filtered : [stack[0]]];
  }));
  return changed ? { ...navigation, stacks } : navigation;
}

export default function App() {
  const initialRef = useRef(null);
  if (!initialRef.current) initialRef.current = initialAppNavigation();

  const visitPayloadsRef = useRef(initialRef.current.visitPayloads);
  const scrollByVisitRef = useRef(new Map());
  const pendingPersonalIdsRef = useRef(new Set());
  const navigationRef = useRef(initialRef.current.navigation);
  const editorNavigationRef = useRef(null);
  const skipEditorGuardOnceRef = useRef(false);
  const studyMarkerActiveRef = useRef(false);
  const studySessionMountedRef = useRef(false);
  const studyFinishRef = useRef(null);
  const skipStudyFinishOnceRef = useRef(false);
  const studyEndTimerRef = useRef(null);

  const [navigation, setNavigation] = useState(initialRef.current.navigation);
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([initialRef.current.navigation.activeTab]));
  const [, setTransientRevision] = useState(0);
  const [pinnedPageIds, setPinnedPageIds] = useState([]);
  const [pinnedLexicalIds, setPinnedLexicalIds] = useState([]);
  const [tagColors, setTagColors] = useState({});
  const [studySessionActive, setStudySessionActive] = useState(false);
  const [ajustesDuplicatesRequest, setAjustesDuplicatesRequest] = useState(null);
  const notebook = useNotebook();

  navigationRef.current = navigation;
  const route = activeRoute(navigation);
  const tab = navigation.activeTab;

  const rememberVisitedTab = useCallback((nextTab) => {
    setVisitedTabs((current) => {
      if (current.has(nextTab)) return current;
      return new Set([...current, nextTab]);
    });
  }, []);

  const captureCurrentScroll = useCallback(() => {
    const currentRoute = activeRoute(navigationRef.current);
    if (!currentRoute?.visitKey) return;
    const y = Number(window.scrollY);
    scrollByVisitRef.current.set(currentRoute.visitKey, Number.isFinite(y) ? y : 0);
  }, []);

  const setVisitPayload = useCallback((visitKey, payload) => {
    if (!visitKey || !payload) return;
    visitPayloadsRef.current.set(visitKey, payload);
    setTransientRevision((value) => value + 1);
  }, []);

  const commitNavigation = useCallback((next, {
    replace = false,
    payload = null,
    captureScroll = true,
  } = {}) => {
    const current = navigationRef.current;
    if (payload) setVisitPayload(activeRoute(next)?.visitKey, payload);
    if (next === current) return false;
    if (captureScroll) captureCurrentScroll();

    let shouldReplace = replace;
    let historyState = stateWithoutStudyMarker(window.history.state);
    if (studyMarkerActiveRef.current) {
      // Entry-open actions inside a session already run the existing Finish callback. Replace
      // the marker so Back returns directly to the launcher without a dead session entry.
      studyMarkerActiveRef.current = false;
      skipStudyFinishOnceRef.current = false;
      shouldReplace = true;
    }
    historyState = historyStateWithNavigation(historyState, next);
    if (shouldReplace) window.history.replaceState(historyState, "", window.location.href);
    else window.history.pushState(historyState, "", window.location.href);

    navigationRef.current = next;
    setNavigation(next);
    rememberVisitedTab(next.activeTab);
    return true;
  }, [captureCurrentScroll, rememberVisitedTab, setVisitPayload]);

  const applyPoppedNavigation = useCallback((rawNavigation, rawState) => {
    const sanitized = sanitizeHydratedNavigation(rawNavigation, {
      hasTransientPayload: (visitKey, kind) => transientPayloadExists(
        visitPayloadsRef.current,
        visitKey,
        kind,
      ),
    });
    if (sanitized !== rawNavigation) {
      window.history.replaceState(
        historyStateWithNavigation(stateWithoutStudyMarker(rawState), sanitized),
        "",
        window.location.href,
      );
    }
    navigationRef.current = sanitized;
    setNavigation(sanitized);
    rememberVisitedTab(sanitized.activeTab);
  }, [rememberVisitedTab]);

  const handlePopState = useCallback(async (event) => {
    const targetHasStudyMarker = hasStudyMarker(event.state);
    const targetNavigation = navigationFromHistoryState(event.state);
    const current = navigationRef.current;
    captureCurrentScroll();

    if (studyMarkerActiveRef.current && !targetHasStudyMarker) {
      const finish = studyFinishRef.current;
      const skipFinish = skipStudyFinishOnceRef.current;
      studyMarkerActiveRef.current = false;
      skipStudyFinishOnceRef.current = false;
      studyFinishRef.current = null;
      if (!skipFinish) finish?.();
      if (targetNavigation) applyPoppedNavigation(targetNavigation, event.state);
      return;
    }

    // Forward after finishing, or a refresh of a marker entry, must never resurrect a session.
    if (targetHasStudyMarker) {
      const cleanState = stateWithoutStudyMarker(event.state);
      if (targetNavigation) {
        window.history.replaceState(
          historyStateWithNavigation(cleanState, targetNavigation),
          "",
          window.location.href,
        );
        applyPoppedNavigation(targetNavigation, cleanState);
      } else {
        window.history.replaceState(cleanState, "", window.location.href);
      }
      return;
    }

    if (!targetNavigation) return;
    const currentRoute = activeRoute(current);
    const targetRoute = activeRoute(targetNavigation);
    const leavingEditor = currentRoute?.tab === "diario"
      && currentRoute.screen === "edit"
      && !sameRouteDestination(currentRoute, targetRoute);

    if (leavingEditor && !skipEditorGuardOnceRef.current) {
      const allowed = await (editorNavigationRef.current?.prepareToLeave?.() ?? true);
      if (!allowed) {
        const recoveryDelta = targetNavigation.depth <= current.depth ? 1 : -1;
        window.history.go(recoveryDelta);
        return;
      }
    }
    skipEditorGuardOnceRef.current = false;
    applyPoppedNavigation(targetNavigation, event.state);
  }, [applyPoppedNavigation, captureCurrentScroll]);

  useLayoutEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const initial = initialRef.current;
    let initialState = historyStateWithNavigation(
      stateWithoutStudyMarker(window.history.state),
      navigationRef.current,
    );
    if (initial.startedOnStudyMarker) initialState = stateWithoutStudyMarker(initialState);
    window.history.replaceState(
      initialState,
      "",
      initial.consumedShare ? urlWithoutShareParams() : window.location.href,
    );

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [handlePopState]);

  useLayoutEffect(() => {
    const destinationY = scrollByVisitRef.current.get(route?.visitKey) || 0;
    window.scrollTo(0, destinationY);
  }, [route?.visitKey, tab]);

  const registerEditorNavigationHandlers = useCallback((handlers) => {
    editorNavigationRef.current = handlers;
  }, []);

  const beginStudySession = useCallback((finish) => {
    studySessionMountedRef.current = true;
    studyFinishRef.current = finish;
    clearTimeout(studyEndTimerRef.current);
    if (studyMarkerActiveRef.current) return;

    const state = historyStateWithNavigation(
      stateWithoutStudyMarker(window.history.state),
      navigationRef.current,
    );
    window.history.pushState({
      ...state,
      [STUDY_SESSION_STATE_KEY]: { version: STUDY_SESSION_STATE_VERSION },
    }, "", window.location.href);
    studyMarkerActiveRef.current = true;
    skipStudyFinishOnceRef.current = false;
  }, []);

  const endStudySession = useCallback(() => {
    studySessionMountedRef.current = false;
    clearTimeout(studyEndTimerRef.current);
    // Delay one task so StrictMode's setup → cleanup → setup probe cannot consume the marker.
    studyEndTimerRef.current = setTimeout(() => {
      if (
        !studySessionMountedRef.current
        && studyMarkerActiveRef.current
        && hasStudyMarker(window.history.state)
      ) {
        skipStudyFinishOnceRef.current = true;
        window.history.back();
      }
    }, 0);
  }, []);

  const requestStudyFinish = useCallback((fallbackFinish) => {
    if (studyMarkerActiveRef.current && hasStudyMarker(window.history.state)) {
      window.history.back();
    } else {
      fallbackFinish?.();
    }
  }, []);

  function pushRoute(destination, payloadForVisit = null) {
    const visitKey = makeNavigationVisitKey();
    const next = pushDestination(navigationRef.current, destination, { visitKey });
    const payload = typeof payloadForVisit === "function"
      ? payloadForVisit(activeRoute(next)?.visitKey)
      : payloadForVisit;
    commitNavigation(next, { payload });
  }

  function replaceRoute(destination, payloadForVisit = null) {
    const next = replaceActiveDestination(navigationRef.current, destination);
    const payload = typeof payloadForVisit === "function"
      ? payloadForVisit(activeRoute(next)?.visitKey)
      : payloadForVisit;
    commitNavigation(next, { replace: true, payload });
  }

  function navigateBack(options = {}) {
    captureCurrentScroll();
    if (options?.editorPrepared) skipEditorGuardOnceRef.current = true;
    window.history.back();
  }

  async function switchTab(nextTab) {
    const currentRoute = activeRoute(navigationRef.current);
    if (currentRoute?.tab === "diario" && currentRoute.screen === "edit") {
      if (nextTab === "diario") {
        const allowed = await (editorNavigationRef.current?.prepareToLeave?.() ?? true);
        if (!allowed) return;
      } else {
        await editorNavigationRef.current?.flushForTabSwitch?.();
      }
    }
    const next = selectPrimaryTab(navigationRef.current, nextTab, {
      visitKey: makeNavigationVisitKey(),
    });
    commitNavigation(next);
  }

  function openItem(id) {
    if (!id) return;
    const item = notebook.items.find((candidate) => candidate.id === id);
    const targetTab = !isDictKey(id) && isJournalEntry(item) ? "diario" : "cuaderno";
    pushRoute({ tab: targetTab, screen: targetTab === "diario" ? "read" : "detail", id });
  }

  function openWander(id) {
    if (id) pushRoute({ tab: "cuaderno", screen: "wander", id });
  }

  function openPages() {
    pushRoute({ tab: "cuaderno", screen: "pages" });
  }

  function openCuidar() {
    pushRoute({ tab: "cuaderno", screen: "cuidar" });
  }

  // Arrival from the Cuidar hub's tag-twins card: land on Ajustes with the duplicates review
  // already open. In-memory only — a refresh simply shows plain Ajustes.
  function reviewTagTwins() {
    setAjustesDuplicatesRequest({ key: makeNavigationVisitKey() });
    switchTab("ajustes");
  }

  function openLexical(form = FILTERS.all) {
    pushRoute(
      { tab: "cuaderno", screen: "lexical" },
      (visitKey) => ({ formRequest: { form, key: visitKey } }),
    );
  }

  function openCuadernoRoot(screen, options = {}) {
    const payloadFactory = screen === "search"
      ? (visitKey) => ({ seedQuery: { text: options.query || "", key: visitKey } })
      : screen === "browse" && options.maintenanceView
        ? (visitKey) => ({ browseView: { view: options.maintenanceView, key: visitKey } })
        : null;
    if (options.replace) replaceRoute({ tab: "cuaderno", screen }, payloadFactory);
    else pushRoute({ tab: "cuaderno", screen }, payloadFactory);
  }

  function searchEverything(text) {
    pushRoute(
      { tab: "cuaderno", screen: "search" },
      (visitKey) => ({ seedQuery: { text, key: visitKey } }),
    );
  }

  function editJournal(id) {
    if (id) pushRoute({ tab: "diario", screen: "edit", id });
  }

  function startJournal(seed = {}) {
    pushRoute(
      { tab: "diario", screen: "edit", id: null },
      (visitKey) => ({ seed: { ...seed, draftKey: visitKey } }),
    );
  }

  function journalMaterialized(id) {
    if (!id) return;
    pendingPersonalIdsRef.current.add(id);
    replaceRoute({ tab: "diario", screen: "edit", id });
  }

  // A kept Taller drill lands on its new entry's reader, where the existing vocabulary
  // affordances live; Back then returns to the Diario home the drill was opened from.
  function journalDrillKept(id) {
    if (!id) return;
    pendingPersonalIdsRef.current.add(id);
    replaceRoute({ tab: "diario", screen: "read", id });
  }

  function openBiography() {
    const current = activeRoute(navigationRef.current);
    if (current?.tab === "cuaderno" && current.id) {
      pushRoute({ tab: "cuaderno", screen: "biography", id: current.id });
    }
  }

  function openRepasoDestination(screen) {
    pushRoute({ tab: "repaso", screen });
  }

  // A page can cross surfaces when its date or profile changes. Replace only the active visit;
  // every earlier browser entry and both remembered stacks keep their chronology.
  useEffect(() => {
    const current = activeRoute(navigationRef.current);
    if (notebook.loading || !current?.id || isDictKey(current.id)) return;
    const item = notebook.items.find((candidate) => candidate.id === current.id);
    if (!item) return;
    pendingPersonalIdsRef.current.delete(current.id);
    const canonicalTab = isJournalEntry(item) ? "diario" : "cuaderno";
    if (canonicalTab === current.tab) return;
    replaceRoute({
      tab: canonicalTab,
      screen: canonicalTab === "diario" ? "read" : "detail",
      id: current.id,
    });
  }, [notebook.items, notebook.loading, route?.id, route?.tab]);

  // Deleted personal items cannot strand refresh or Forward on an empty detail surface.
  useEffect(() => {
    if (notebook.loading) return;
    const current = navigationRef.current;
    const pruned = prunedMissingPersonalRoutes(current, notebook.items, pendingPersonalIdsRef.current);
    if (pruned !== current) commitNavigation(pruned, { replace: true, captureScroll: false });
  }, [commitNavigation, notebook.items, notebook.loading]);

  const lexical = notebook.items.filter((item) => item.type === "lexical");
  const phraseCount = lexical.filter((item) => item.form === "phrase").length;
  const wordCount = lexical.length - phraseCount;
  const pageCount = notebook.items.filter((item) => item.type === "page" && !isJournalEntry(item)).length;

  useEffect(() => {
    let current = true;
    const pageIds = new Set(notebook.items.filter((item) => item.type === "page").map((item) => item.id));
    getPinnedPageIds()
      .then((ids) => {
        if (current) setPinnedPageIds(ids.filter((id) => pageIds.has(id)));
      })
      .catch(() => {
        if (current) setPinnedPageIds([]);
      });
    return () => {
      current = false;
    };
  }, [notebook.items]);

  useEffect(() => {
    let current = true;
    const lexicalIds = new Set(
      notebook.items.filter((item) => item.type === "lexical").map((item) => item.id)
    );
    getPinnedLexicalIds()
      .then((ids) => {
        if (current) setPinnedLexicalIds(ids.filter((id) => lexicalIds.has(id)));
      })
      .catch(() => {
        if (current) setPinnedLexicalIds([]);
      });
    return () => {
      current = false;
    };
  }, [notebook.items]);

  useEffect(() => {
    let current = true;
    const known = allTagsIn(notebook.items);
    getPref(TAG_COLORS_PREF, {})
      .then((stored) => {
        if (current) setTagColors(normalizeTagColors(stored, known));
      })
      .catch(() => {
        if (current) setTagColors({});
      });
    return () => {
      current = false;
    };
  }, [notebook.items]);

  async function changeTagColor(tag, swatchId) {
    const entries = Object.entries(tagColors).filter(([storedTag]) => storedTag !== tag);
    if (swatchId !== DEFAULT_SWATCH.id) entries.push([tag, swatchId]);
    const next = Object.fromEntries(entries);
    setTagColors(next);
    await setPref(TAG_COLORS_PREF, next);
  }

  async function changePagePinned(pageId, pinned) {
    await setPagePinned(pageId, pinned);
    setPinnedPageIds((ids) =>
      pinned ? [...ids.filter((id) => id !== pageId), pageId] : ids.filter((id) => id !== pageId)
    );
  }

  async function changeLexicalPinned(itemId, pinned) {
    await setLexicalPinned(itemId, pinned);
    setPinnedLexicalIds((ids) =>
      pinned ? [...ids.filter((id) => id !== itemId), itemId] : ids.filter((id) => id !== itemId)
    );
  }

  const backLabel = navigation.backLabel || labelForRoute(
    navigation.stacks[tab]?.at(-2) || navigation.stacks[tab]?.[0]
  );
  const cuadernoRoute = navigation.stacks.cuaderno.at(-1);
  const diarioRoute = navigation.stacks.diario.at(-1);
  const repasoRoute = navigation.stacks.repaso.at(-1);
  const cuadernoPayload = visitPayloadsRef.current.get(cuadernoRoute.visitKey) || {};
  const diarioPayload = visitPayloadsRef.current.get(diarioRoute.visitKey) || {};
  const wanderItem = cuadernoRoute.screen === "wander"
    ? notebook.items.find((item) => item.id === cuadernoRoute.id) || null
    : null;
  const hubOpen = tab === "cuaderno"
    && ["pages", "lexical", "cuidar"].includes(cuadernoRoute.screen);
  const cuidarVisitKey = navigation.stacks.cuaderno.findLast(
    (stackRoute) => stackRoute.screen === "cuidar"
  )?.visitKey || null;
  const cuadernoRootOpen = tab === "cuaderno" && CUADERNO_ROOT_SCREENS.has(cuadernoRoute.screen);
  /* An open entry — a page, a word or a phrase, and the biography behind one — gets the header
     Diario already had: the wordmark alone, at a size that does not compete with the entry's own
     title (owner-requested 2026-08-28). The notebook totals belong to the browsing screens, where
     they say how much there is to browse; over a single entry they are just three numbers about
     everything except the thing being read. */
  const entryOpen = tab === "cuaderno" && ["detail", "biography"].includes(cuadernoRoute.screen);

  return (
    <StudySessionProvider
      onActiveChange={setStudySessionActive}
      onSessionStart={beginStudySession}
      onSessionEnd={endStudySession}
      requestFinish={requestStudyFinish}
    >
    <TagColorProvider colors={tagColors}>
    <div className="min-h-screen" style={{ background: C.paper, color: C.ink }}>
      <div className="max-w-md mx-auto min-h-screen relative" style={{ background: C.paper }}>
        {!hubOpen && !cuadernoRootOpen && !studySessionActive && (
          <header
            aria-label="App header"
            className={`sticky top-0 z-20 px-4 ${entryOpen ? "pt-2.5 pb-2" : "pt-4 pb-3"}`}
            style={{ background: C.paper, borderBottom: `1px solid ${C.line}` }}
          >
            <div className="flex items-end justify-between">
              <div>
                <div className={`font-bold ${entryOpen ? "text-lg" : "text-2xl"}`} style={{ fontFamily: SERIF, color: C.ink }}>
                  Mi <Hi>cuaderno</Hi>
                </div>
              </div>
              {tab !== "diario" && !entryOpen && (
                <div
                  aria-label="Notebook totals"
                  className="text-right text-xs leading-relaxed"
                  style={{ fontFamily: MONO, color: C.mut }}
                >
                  {count(wordCount, "palabra")}
                  <br />
                  {count(phraseCount, "frase")}
                  <br />
                  {count(pageCount, "página")}
                </div>
              )}
            </div>
          </header>
        )}

        {notebook.loading ? (
          <div className="flex items-center justify-center gap-2 text-sm py-24" style={{ color: C.mut }}>
            <Loader2 size={16} className="animate-spin" /> Opening your cuaderno…
          </div>
        ) : (
          <>
            {visitedTabs.has("cuaderno") && (
              <section hidden={tab !== "cuaderno"} aria-label="Cuaderno surface">
                <div hidden={["pages", "lexical", "wander", "cuidar"].includes(cuadernoRoute.screen)}>
                  <Cuaderno
                    notebook={notebook}
                    selectedId={["detail", "biography"].includes(cuadernoRoute.screen) ? cuadernoRoute.id : null}
                    rootScreen={cuadernoRoute.screen}
                    onOpenRoot={openCuadernoRoot}
                    onSelect={openItem}
                    onBack={navigateBack}
                    backLabel={backLabel}
                    onOpenBiography={openBiography}
                    onCloseBiography={navigateBack}
                    onOpenSettings={() => switchTab("ajustes")}
                    onOpenPages={openPages}
                    onOpenLexical={openLexical}
                    onOpenCuidar={openCuidar}
                    onWander={openWander}
                    seedQuery={cuadernoPayload.seedQuery || null}
                    seedBrowseView={cuadernoPayload.browseView || null}
                    shareSource={cuadernoPayload.shareSource || null}
                    pinnedPageIds={pinnedPageIds}
                    onPagePinnedChange={changePagePinned}
                  />
                </div>
                <div hidden={cuadernoRoute.screen !== "pages"}>
                  <PageHub
                    notebook={notebook}
                    pinnedPageIds={pinnedPageIds}
                    onPagePinnedChange={changePagePinned}
                    onSelect={openItem}
                    onBack={navigateBack}
                    backLabel={backLabel}
                  />
                </div>
                <div hidden={cuadernoRoute.screen !== "lexical"}>
                  <LexicalHub
                    notebook={notebook}
                    active={cuadernoRoute.screen === "lexical"}
                    formRequest={cuadernoPayload.formRequest || null}
                    pinnedLexicalIds={pinnedLexicalIds}
                    onLexicalPinnedChange={changeLexicalPinned}
                    onSelect={openItem}
                    onBack={navigateBack}
                    backLabel={backLabel}
                    onSearchDictionary={searchEverything}
                  />
                </div>
                <div hidden={cuadernoRoute.screen !== "cuidar"}>
                  <CuidarHub
                    notebook={notebook}
                    visitKey={cuidarVisitKey}
                    onBack={navigateBack}
                    backLabel={backLabel}
                    onSelect={openItem}
                    onSeeAll={(view) => openCuadernoRoot("browse", { maintenanceView: view })}
                    onReviewTags={reviewTagTwins}
                  />
                </div>
                <div hidden={cuadernoRoute.screen !== "wander"}>
                  {cuadernoRoute.screen === "wander" && wanderItem && (
                    <Wander
                      key={wanderItem.id}
                      item={wanderItem}
                      items={notebook.items}
                      onHop={openWander}
                      onOpen={openItem}
                      onBack={navigateBack}
                      backLabel={backLabel}
                    />
                  )}
                </div>
              </section>
            )}
            {visitedTabs.has("diario") && (
              <section hidden={tab !== "diario"} aria-label="Diario surface">
                <Diario
                  notebook={notebook}
                  route={{ ...diarioRoute, seed: diarioPayload.seed || null }}
                  onSelect={openItem}
                  onBack={navigateBack}
                  backLabel={backLabel}
                  onEdit={editJournal}
                  onStart={startJournal}
                  onMaterialized={journalMaterialized}
                  onDrillKept={journalDrillKept}
                  registerEditorNavigationHandlers={registerEditorNavigationHandlers}
                />
              </section>
            )}
            {visitedTabs.has("repaso") && (
              <section hidden={tab !== "repaso"} aria-label="Repaso surface">
                <Repaso
                  notebook={notebook}
                  route={repasoRoute}
                  onNavigate={openRepasoDestination}
                  onBack={navigateBack}
                  backLabel={backLabel}
                  onSelect={openItem}
                />
              </section>
            )}
            {visitedTabs.has("ajustes") && (
              <section hidden={tab !== "ajustes"} aria-label="Ajustes surface">
                <Ajustes
                  notebook={notebook}
                  duplicatesRequest={ajustesDuplicatesRequest}
                  tagColors={tagColors}
                  onTagColorChange={changeTagColor}
                  onDataReplaced={notebook.reload}
                  onTagsChanged={notebook.reload}
                />
              </section>
            )}
          </>
        )}

        {!studySessionActive && <nav aria-label="Primary" className="fixed bottom-0 inset-x-0 z-30">
          <div className="max-w-md mx-auto flex border-t" style={{ background: C.card, borderColor: C.line }}>
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => switchTab(item.id)}
                  aria-current={active ? "page" : undefined}
                  className="flex-1 py-2.5 flex flex-col items-center gap-0.5"
                >
                  <Icon size={19} style={{ color: active ? C.pen : C.mut }} />
                  <span
                    className="text-[11px]"
                    style={{ color: active ? C.pen : C.mut, fontWeight: active ? 600 : 400 }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>}
      </div>
    </div>
    </TagColorProvider>
    </StudySessionProvider>
  );
}
