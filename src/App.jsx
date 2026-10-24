import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BookOpen, BarChart3, Settings, Loader2, PenLine, MessageCircleQuestion } from "lucide-react";
import { C, SERIF, MONO, Hi, Button } from "./theme.jsx";
import Cuaderno from "./components/Cuaderno.jsx";
import PageHub from "./components/PageHub.jsx";
import LexicalHub from "./components/LexicalHub.jsx";
import Diario from "./components/Diario.jsx";
import Repaso from "./components/Repaso.jsx";
import Ajustes from "./components/Ajustes.jsx";
import Wander from "./components/Wander.jsx";
import CuidarHub from "./components/CuidarHub.jsx";
import Pregunta from "./components/Pregunta.jsx";
import { MAX_ATTACHMENTS } from "./lib/askContext.js";
import { useNotebook } from "./useNotebook.js";
import { isJournalEntry } from "./lib/journal.js";
import { parseSharePayload } from "./lib/shareTarget.js";
import { isDictKey } from "./db/ref/entries.js";
import { getPinnedPageIds, setPagePinned } from "./db/collections.js";
import { getPinnedLexicalIds, setLexicalPinned } from "./db/items.js";
import { getPref, setPref } from "./db/db.js";
import { aiFeedbackReady } from "./lib/aiPrefs.js";
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
  withoutUnavailableTab,
} from "./lib/navigation.js";

export { sameRouteDestination } from "./lib/navigation.js";

/** Spanish pluralization for the header counts: only 1 takes the singular. */
const count = (n, singular) => `${n} ${n === 1 ? singular : `${singular}s`}`;

const TABS = [
  { id: "cuaderno", label: "Cuaderno", icon: BookOpen },
  { id: "diario", label: "Diario", icon: PenLine },
  // Shown only while AI is on with a key; see `aiReady` in App.
  { id: "pregunta", label: "Pregunta", icon: MessageCircleQuestion },
  { id: "repaso", label: "Repaso", icon: BarChart3 },
  { id: "ajustes", label: "Ajustes", icon: Settings },
];

const STUDY_SESSION_STATE_KEY = "mcStudySession";
const STUDY_SESSION_STATE_VERSION = 1;
const HISTORY_POSITION_KEY = "mcHistoryPosition";
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

function historyPosition(state) {
  // Recovery needs entry distance, not the capped navigation depth. Older entries
  // still work through their existing depth until this app writes their position.
  const position = state?.[HISTORY_POSITION_KEY];
  return Number.isSafeInteger(position) && position >= 0
    ? position
    : navigationFromHistoryState(state)?.depth ?? 0;
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

function NotebookLoadProblem({ notebook }) {
  return (
    <div role="alert" className="m-4 rounded-xl border p-4 space-y-3 text-sm" style={{ borderColor: C.line, background: C.card, color: C.ink }}>
      <p>{notebook.hasLoaded
        ? "Couldn’t refresh your cuaderno. You’re still seeing the last loaded version; your open drafts are kept."
        : "Couldn’t open your cuaderno. Your saved data hasn’t been changed."}</p>
      <Button className="min-h-11" onClick={notebook.reload}>Retry loading</Button>
    </div>
  );
}

export default function App() {
  const initialRef = useRef(null);
  if (!initialRef.current) initialRef.current = initialAppNavigation();

  const visitPayloadsRef = useRef(initialRef.current.visitPayloads);
  const scrollByVisitRef = useRef(new Map());
  const pendingPersonalIdsRef = useRef(new Set());
  const navigationRef = useRef(initialRef.current.navigation);
  const navigationPositionRef = useRef(historyPosition(window.history.state));
  const navigationRequestRef = useRef(0);
  const pendingPopRef = useRef(null);
  const historyRecoveryRef = useRef(null);
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
  /* Entries waiting to be attached to the next Pregunta question ("Ask about this"). App holds
     them because Pregunta may not be mounted yet — Repaso's "Ask later" queues without leaving
     the session. `arrival` counts additions so Pregunta can react once to each. In memory only. */
  const [preguntaQueue, setPreguntaQueue] = useState({ attachments: [], arrival: 0 });
  const preguntaQueueRef = useRef(preguntaQueue);
  /* Whether Pregunta is reachable. `null` until the first read: a restored Pregunta route is left
     alone while unknown, and only a resolved `false` moves the owner off it. */
  const [aiReady, setAiReady] = useState(null);
  const aiReadyRequestRef = useRef(0);
  const notebook = useNotebook();
  const committedItemsRef = useRef(notebook.items);
  useLayoutEffect(() => { committedItemsRef.current = notebook.items; }, [notebook.items]);

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

  /** Latest-wins, so an older read can never overwrite a newer settings change. */
  const refreshAiReady = useCallback(async () => {
    const request = ++aiReadyRequestRef.current;
    let ready;
    try {
      ready = await aiFeedbackReady();
    } catch {
      ready = false;
    }
    if (request !== aiReadyRequestRef.current) return;
    setAiReady(ready);
    // Whatever was waiting for Pregunta goes with it, so re-enabling AI replays nothing.
    if (!ready) {
      preguntaQueueRef.current = { attachments: [], arrival: preguntaQueueRef.current.arrival };
      setPreguntaQueue(preguntaQueueRef.current);
    }
  }, []);

  useEffect(() => {
    refreshAiReady();
  }, [refreshAiReady]);

  const commitNavigation = useCallback((next, {
    replace = false,
    payload = null,
    captureScroll = true,
  } = {}) => {
    const current = navigationRef.current;
    if (payload) setVisitPayload(activeRoute(next)?.visitKey, payload);
    if (next === current) return false;
    const sameVisit = activeRoute(next)?.visitKey === activeRoute(current)?.visitKey;
    // The browser has already moved while a leave guard keeps the editor onscreen.
    // Materialization updates that editor, never the entry under the browser cursor.
    if (replace && sameVisit && pendingPopRef.current) {
      navigationRef.current = next;
      setNavigation(next);
      return true;
    }
    if (!replace || !sameVisit) navigationRequestRef.current += 1;
    if (historyRecoveryRef.current) {
      const request = navigationRequestRef.current;
      historyRecoveryRef.current.promise.then(() => {
        if (request === navigationRequestRef.current) {
          commitNavigation(next, { replace, captureScroll });
        }
      });
      return true;
    }
    if (pendingPopRef.current) {
      // A new destination branches from the actual cursor, not the retained editor.
      const cursor = navigationFromHistoryState(window.history.state);
      if (cursor) next = navigationFromHistoryState(historyStateWithNavigation(null, {
        ...next,
        depth: cursor.depth + (replace ? 0 : 1),
        backLabel: replace ? cursor.backLabel : labelForRoute(activeRoute(cursor)),
      }));
      pendingPopRef.current = null;
    }
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
    const position = historyPosition(window.history.state) + (shouldReplace ? 0 : 1);
    historyState[HISTORY_POSITION_KEY] = position;
    if (shouldReplace) window.history.replaceState(historyState, "", window.location.href);
    else window.history.pushState(historyState, "", window.location.href);

    navigationRef.current = next;
    navigationPositionRef.current = position;
    setNavigation(next);
    rememberVisitedTab(next.activeTab);
    return true;
  }, [captureCurrentScroll, rememberVisitedTab, setVisitPayload]);

  const applyPoppedNavigation = useCallback((rawNavigation, rawState) => {
    // A new entry may have been saved after its browser entry was left behind.
    rawNavigation = {
      ...rawNavigation,
      stacks: {
        ...rawNavigation.stacks,
        diario: rawNavigation.stacks.diario.map((route) => {
          const id = visitPayloadsRef.current.get(route.visitKey)?.journalId;
          return route.screen === "edit" && !route.id && id ? { ...route, id } : route;
        }),
      },
    };
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
    navigationPositionRef.current = historyPosition(rawState);
    setNavigation(sanitized);
    rememberVisitedTab(sanitized.activeTab);
  }, [rememberVisitedTab]);

  const restoreEditorHistory = useCallback(() => {
    if (!pendingPopRef.current || historyRecoveryRef.current) return;
    const cursor = navigationFromHistoryState(window.history.state);
    if (!cursor) return;
    const source = navigationRef.current;
    const delta = navigationPositionRef.current - historyPosition(window.history.state);
    if (!delta) {
      pendingPopRef.current = null;
      applyPoppedNavigation(source, window.history.state);
      return;
    }
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    historyRecoveryRef.current = {
      promise, resolve,
      visitKey: activeRoute(source)?.visitKey,
      position: navigationPositionRef.current,
    };
    window.history.go(delta);
  }, [applyPoppedNavigation]);

  const handlePopState = useCallback(async (event) => {
    const recovery = historyRecoveryRef.current;
    if (recovery) {
      historyRecoveryRef.current = null;
      pendingPopRef.current = null;
      if (historyPosition(event.state) === recovery.position
        && activeRoute(navigationFromHistoryState(event.state))?.visitKey === recovery.visitKey) {
        applyPoppedNavigation(navigationRef.current, event.state);
        recovery.resolve();
        return;
      }
      recovery.resolve();
    }
    // Back/Forward supersedes a pending tab choice even if its own editor guard waits.
    const request = ++navigationRequestRef.current;
    pendingPopRef.current = null;
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
      && currentRoute.visitKey !== targetRoute?.visitKey
      && !sameRouteDestination(currentRoute, targetRoute);

    const skipEditorGuard = skipEditorGuardOnceRef.current;
    skipEditorGuardOnceRef.current = false;
    if (leavingEditor && !skipEditorGuard) {
      pendingPopRef.current = { request };
      const allowed = await (editorNavigationRef.current?.prepareToLeave?.() ?? true);
      if (request !== navigationRequestRef.current) return;
      if (!allowed) {
        restoreEditorHistory();
        return;
      }
    }
    pendingPopRef.current = null;
    applyPoppedNavigation(targetNavigation, event.state);
  }, [applyPoppedNavigation, captureCurrentScroll, restoreEditorHistory]);

  useLayoutEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const initial = initialRef.current;
    let initialState = historyStateWithNavigation(
      stateWithoutStudyMarker(window.history.state),
      navigationRef.current,
    );
    initialState[HISTORY_POSITION_KEY] = navigationPositionRef.current;
    if (initial.startedOnStudyMarker) initialState = stateWithoutStudyMarker(initialState);
    window.history.replaceState(
      initialState,
      "",
      initial.consumedShare ? urlWithoutShareParams() : window.location.href,
    );

    window.addEventListener("popstate", handlePopState);
    return () => {
      navigationRequestRef.current += 1;
      pendingPopRef.current = null;
      historyRecoveryRef.current?.resolve();
      historyRecoveryRef.current = null;
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
    const position = historyPosition(window.history.state) + 1;
    window.history.pushState({
      ...state,
      [HISTORY_POSITION_KEY]: position,
      [STUDY_SESSION_STATE_KEY]: { version: STUDY_SESSION_STATE_VERSION },
    }, "", window.location.href);
    navigationPositionRef.current = position;
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

  const replaceRoute = useCallback((destination, payloadForVisit = null) => {
    const next = replaceActiveDestination(navigationRef.current, destination);
    const payload = typeof payloadForVisit === "function"
      ? payloadForVisit(activeRoute(next)?.visitKey)
      : payloadForVisit;
    commitNavigation(next, { replace: true, payload });
  }, [commitNavigation]);

  /* Pregunta disappears when AI is turned off, a restore drops the key, or Back/Forward or a
     restored snapshot lands on it while AI is off. Replace rather than push, so no dead history
     entry is left behind. */
  useEffect(() => {
    if (aiReady !== false || navigation.activeTab !== "pregunta") return;
    commitNavigation(withoutUnavailableTab(navigationRef.current, "pregunta"), {
      replace: true,
      captureScroll: false,
    });
  }, [aiReady, navigation, commitNavigation]);

  async function navigateBack(options = {}) {
    const request = ++navigationRequestRef.current;
    if (historyRecoveryRef.current) await historyRecoveryRef.current.promise;
    if (request !== navigationRequestRef.current) return;
    captureCurrentScroll();
    if (options?.editorPrepared) skipEditorGuardOnceRef.current = true;
    window.history.back();
  }

  async function switchTab(nextTab) {
    if (nextTab === "pregunta" && aiReady !== true) return;
    const request = ++navigationRequestRef.current;
    const currentRoute = activeRoute(navigationRef.current);
    if (historyRecoveryRef.current) await historyRecoveryRef.current.promise;
    if (request !== navigationRequestRef.current) return;
    let allowed = true;
    if (currentRoute?.tab === "diario" && currentRoute.screen === "edit") {
      if (nextTab === "diario") {
        allowed = await (editorNavigationRef.current?.prepareToLeave?.() ?? true);
      } else {
        await editorNavigationRef.current?.flushForTabSwitch?.();
      }
    }
    // A save may materialize an entry within this visit. Only a newer navigation
    // request or departure from the visit cancels this pending tab choice.
    if (request !== navigationRequestRef.current
      || currentRoute?.visitKey !== activeRoute(navigationRef.current)?.visitKey) return;
    if (!allowed) {
      restoreEditorHistory();
      return;
    }
    const next = selectPrimaryTab(navigationRef.current, nextTab, {
      visitKey: makeNavigationVisitKey(),
    });
    commitNavigation(next);
  }

  function openItem(id) {
    if (!id) return;
    // A caller may hold this handler across an awaited refresh. Read the committed
    // snapshot so a newly saved Journal entry opens in Diario even from that handler.
    const item = committedItemsRef.current.find((candidate) => candidate.id === id);
    const targetTab = !isDictKey(id) && isJournalEntry(item) ? "diario" : "cuaderno";
    pushRoute({ tab: targetTab, screen: targetTab === "diario" ? "read" : "detail", id });
  }

  /** Queues an entry for Pregunta: "added", "updated" (already queued; review context refreshed) or "full". */
  function addPreguntaAttachment(itemId, { origin = "entry", review = null } = {}) {
    const current = preguntaQueueRef.current;
    const index = current.attachments.findIndex((attachment) => attachment.itemId === itemId);
    let attachments;
    let result;
    if (index >= 0) {
      attachments = current.attachments.map((attachment, at) => (at === index ? { ...attachment, origin, review } : attachment));
      result = "updated";
    } else if (current.attachments.length >= MAX_ATTACHMENTS) {
      return "full";
    } else {
      attachments = [...current.attachments, { key: makeNavigationVisitKey(), itemId, origin, review }];
      result = "added";
    }
    preguntaQueueRef.current = { attachments, arrival: current.arrival + 1 };
    setPreguntaQueue(preguntaQueueRef.current);
    return result;
  }

  function removePreguntaAttachments(keys) {
    const drop = new Set(keys);
    const current = preguntaQueueRef.current;
    preguntaQueueRef.current = {
      ...current,
      attachments: current.attachments.filter((attachment) => !drop.has(attachment.key)),
    };
    setPreguntaQueue(preguntaQueueRef.current);
  }

  /* Offered only while Pregunta is reachable; screens hide their Ask buttons otherwise. */
  const askAbout = aiReady === true
    ? (itemId, options) => {
      const result = addPreguntaAttachment(itemId, options);
      switchTab("pregunta");
      return result;
    }
    : undefined;
  const askLater = aiReady === true ? addPreguntaAttachment : undefined;

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

  function journalMaterialized(id, visitKey) {
    if (!id) return;
    pendingPersonalIdsRef.current.add(id);
    const payload = visitPayloadsRef.current.get(visitKey);
    visitPayloadsRef.current.set(visitKey, { ...payload, journalId: id });
    if (activeRoute(navigationRef.current)?.visitKey !== visitKey) return;
    replaceRoute({ tab: "diario", screen: "edit", id });
  }

  // A kept Taller drill lands on its new entry's reader, where the existing vocabulary
  // affordances live; Back then returns to the Diario home the drill was opened from.
  function journalDrillKept(id) {
    if (!id || activeRoute(navigationRef.current)?.visitKey !== diarioRoute.visitKey) return;
    pendingPersonalIdsRef.current.add(id);
    replaceRoute({ tab: "diario", screen: "read", id });
  }

  function journalBack(options) {
    // Diario can stay mounted while hidden. A delayed save must not navigate from
    // a different visit the owner selected while its refresh was pending.
    if (activeRoute(navigationRef.current)?.visitKey !== diarioRoute.visitKey) return;
    navigateBack(options);
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
    if (!notebook.hasLoaded || notebook.refreshing || notebook.error || !current?.id || isDictKey(current.id)) return;
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
  }, [notebook.items, notebook.hasLoaded, notebook.refreshing, notebook.error, route?.id, route?.tab, replaceRoute]);

  // Deleted personal items cannot strand refresh or Forward on an empty detail surface.
  useEffect(() => {
    if (!notebook.hasLoaded || notebook.refreshing || notebook.error) return;
    const current = navigationRef.current;
    const pruned = prunedMissingPersonalRoutes(current, notebook.items, pendingPersonalIdsRef.current);
    if (pruned !== current) commitNavigation(pruned, { replace: true, captureScroll: false });
  }, [commitNavigation, notebook.items, notebook.hasLoaded, notebook.refreshing, notebook.error]);

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
              {tab !== "diario" && tab !== "pregunta" && !entryOpen && (
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

        {!notebook.hasLoaded ? (notebook.loading ? (
          <div className="flex items-center justify-center gap-2 text-sm py-24" style={{ color: C.mut }}>
            <Loader2 size={16} className="animate-spin" /> Opening your cuaderno…
          </div>
        ) : <NotebookLoadProblem notebook={notebook} />) : (
          <>
            {notebook.error && <NotebookLoadProblem notebook={notebook} />}
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
                    onAskAbout={askAbout}
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
                  onBack={journalBack}
                  backLabel={backLabel}
                  onEdit={editJournal}
                  onStart={startJournal}
                  onMaterialized={(id) => journalMaterialized(id, diarioRoute.visitKey)}
                  onDrillKept={journalDrillKept}
                  registerEditorNavigationHandlers={registerEditorNavigationHandlers}
                />
              </section>
            )}
            {visitedTabs.has("pregunta") && aiReady === true && (
              /* Turning AI off unmounts this surface, which cancels any request in flight and
                 discards the conversation — Ajustes says so. */
              <section hidden={tab !== "pregunta"} aria-label="Pregunta surface">
                <Pregunta
                  notebook={notebook}
                  onSelect={openItem}
                  attachments={preguntaQueue.attachments}
                  arrival={preguntaQueue.arrival}
                  onRemoveAttachments={removePreguntaAttachments}
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
                  onAskAbout={askAbout}
                  onAskLater={askLater}
                  onOpenPregunta={aiReady === true ? () => switchTab("pregunta") : null}
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
                  onDataReplaced={() => {
                    // A restore never carries the key, so Pregunta may no longer be reachable.
                    refreshAiReady();
                    return notebook.reload();
                  }}
                  onAiChanged={refreshAiReady}
                  onTagsChanged={notebook.reload}
                />
              </section>
            )}
          </>
        )}

        {!studySessionActive && <nav aria-label="Primary" className="fixed bottom-0 inset-x-0 z-30">
          <div className="max-w-md mx-auto flex border-t" style={{ background: C.card, borderColor: C.line }}>
            {TABS.filter((item) => item.id !== "pregunta" || aiReady === true).map((item) => {
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
