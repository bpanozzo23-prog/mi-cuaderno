import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, ChevronLeft, Dumbbell, Play, SlidersHorizontal } from "lucide-react";
import { C, MONO, SERIF, Card, Button, SectionTitle, Segmented, dotGrid } from "../theme.jsx";
import { loadGymLibrary } from "../db/ref/gym.js";
import {
  CURATED_GYM_LEMMAS,
  GYM_CURRICULUM_REGISTRY,
  ALTERNATIVE_TENSES,
  GYM_SLOTS,
  RARE_TENSES,
  TENSE_PACKS,
  buildAdaptiveGymDeck,
  buildBalancedGymDeck,
  buildFocusedGymDeck,
  gymCellCount,
} from "../lib/conjugationGym.js";
import { qualifiedTenseLabel } from "../lib/conjugation.js";
import { conjugationForms } from "../lib/drill.js";
import {
  deriveSavedGymTargeting,
  isSavedGymSubsetValid,
  savedGymVerbsForSubset,
} from "../lib/gymTargeting.js";
import {
  RECOGNITION_CARDS,
  RECOGNITION_EVERYDAY_TENSES,
  RECOGNITION_LANES,
  TENSE_USAGE_CARDS,
  recognitionTenses,
} from "../lib/recognitionContent.js";
import { buildRecognitionDeck, buildUsageRecallDeck } from "../lib/recognitionDeck.js";
import { buildEndingsProductionDeck } from "../lib/endingsProduction.js";
import { CONTRAST_PAIRS, CONTRAST_PAIR_IDS, contrastCards, contrastOptions } from "../lib/contrastContent.js";
import ConjugationDrill from "./ConjugationDrill.jsx";
import ConjugationPerformance from "./ConjugationPerformance.jsx";
import RecognitionDrill from "./RecognitionDrill.jsx";
import EndingsReveal from "./EndingsReveal.jsx";
import UsageReveal from "./UsageReveal.jsx";
import ContrastReveal from "./ContrastReveal.jsx";
import UsageRecallDrill from "./UsageRecallDrill.jsx";
import EndingsProductionDrill from "./EndingsProductionDrill.jsx";

const SESSION_KINDS = [
  { value: "quick", label: "Quick", detail: "10 everyday prompts" },
  { value: "focus", label: "Focus", detail: "Choose exactly what to practise" },
  { value: "adaptive", label: "Adaptive", detail: "Use your recent weak spots" },
];

const DRILLS = [
  { value: "forms", label: "Forms" },
  { value: "usage", label: "Tense usage" },
  { value: "endings", label: "Endings" },
  { value: "contrast", label: "Contrasts" },
];

const RECOGNITION_TITLES = { usage: "Tense usage", endings: "Endings", contrast: "Contrasts" };

function Header({ title, backLabel, onBack, action }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <button onClick={onBack} className="flex items-center gap-1 text-sm" style={{ color: C.pen }}>
        <ChevronLeft size={16} /> {backLabel}
      </button>
      <div className="min-w-0 truncate text-sm font-semibold" style={{ color: C.ink }}>
        {title}
      </div>
      <div className="min-w-16 text-right">{action}</div>
    </div>
  );
}

const sessionId = () =>
  globalThis.crypto?.randomUUID?.() || `gym-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function ConjugationGym({
  items,
  events,
  initialView = "setup",
  destinationView = null,
  onNavigate = null,
  onBack,
  backLabel = "Repaso",
  onOpen,
  onGraded,
}) {
  const [view, setView] = useState(initialView);
  const activeView = view === "session" ? "session" : (destinationView || view);

  function showMajor(next) {
    setView(next);
    onNavigate?.(next);
  }
  const [library, setLibrary] = useState({ loading: true, installed: false, saved: [], core: [], unavailableCore: [] });
  const [loadError, setLoadError] = useState(false);
  const [drill, setDrill] = useState("forms");
  const [sessionKind, setSessionKind] = useState("quick");
  const [pool, setPool] = useState("core20");
  const [mode, setMode] = useState("typed");
  const [size, setSize] = useState(10);
  const [tensePack, setTensePack] = useState("everyday");
  const [customTenses, setCustomTenses] = useState([...TENSE_PACKS.everyday.tenses]);
  const [recognitionPack, setRecognitionPack] = useState("everyday");
  const [recognitionCustomTenses, setRecognitionCustomTenses] = useState([...RECOGNITION_EVERYDAY_TENSES]);
  const [usageDirection, setUsageDirection] = useState("choice");
  const [usageRecallSize, setUsageRecallSize] = useState("all");
  const [endingsDirection, setEndingsDirection] = useState("choice");
  const [contrastPair, setContrastPair] = useState(CONTRAST_PAIR_IDS[0]);
  const [slots, setSlots] = useState([...GYM_SLOTS]);
  const [oneVerb, setOneVerb] = useState("");
  const [savedSubset, setSavedSubset] = useState({ kind: "all", value: "" });
  const [focusTarget, setFocusTarget] = useState(null);
  const [session, setSession] = useState(null);
  const [startError, setStartError] = useState("");
  const loadedItems = useRef(null);

  useEffect(() => {
    if (view === "session" || loadedItems.current === items) return undefined;
    let alive = true;
    setLoadError(false);
    loadGymLibrary(items)
      .then((loaded) => {
        if (!alive) return;
        loadedItems.current = items;
        setLibrary({ ...loaded, loading: false });
      })
      .catch(() => {
        if (!alive) return;
        loadedItems.current = items;
        setLoadError(true);
        setLibrary({ loading: false, installed: false, saved: [], core: [], unavailableCore: [...CURATED_GYM_LEMMAS] });
      });
    return () => {
      alive = false;
    };
  }, [items, view]);

  useEffect(() => {
    try {
      window.scrollTo(0, 0);
    } catch {
      // jsdom and locked-down webviews can omit scrolling; the screen still renders.
    }
  }, [view]);

  const savedTargeting = useMemo(
    () => deriveSavedGymTargeting(items, library.saved),
    [items, library.saved]
  );
  const poolDefinition = GYM_CURRICULUM_REGISTRY[pool] || GYM_CURRICULUM_REGISTRY.core20;
  const poolVerbs = useMemo(() => {
    if (pool === "saved") return savedGymVerbsForSubset(library.saved, savedTargeting, savedSubset);
    const allowed = new Set(poolDefinition.lemmas);
    return library.core
      .filter((verb) => allowed.has(verb.lemma))
      .map((verb) => ({ ...verb, curriculum: pool }));
  }, [library, pool, poolDefinition, savedSubset, savedTargeting]);

  useEffect(() => {
    if (view === "session" || pool !== "saved" || library.loading) return;
    if (isSavedGymSubsetValid(savedSubset, savedTargeting)) return;
    setSavedSubset({ kind: "all", value: "" });
    setOneVerb("");
    setFocusTarget(null);
    setStartError("");
  }, [library.loading, pool, savedSubset, savedTargeting, view]);

  const unavailableInPool = useMemo(() => {
    if (pool === "saved") return 0;
    const allowed = new Set(poolDefinition.lemmas);
    return library.unavailableCore.filter((lemma) => allowed.has(lemma)).length;
  }, [library, pool, poolDefinition]);

  const advanced = sessionKind !== "quick";
  const baseSelectedTenses = tensePack === "customize" ? customTenses : TENSE_PACKS[tensePack].tenses;
  const selectedOneVerb = poolVerbs.find((verb) => (verb.itemKey || verb.verbKey) === oneVerb) || null;
  const activeFocusTarget = useMemo(() => {
    const target = focusTarget ? { ...focusTarget } : {};
    if (selectedOneVerb) {
      target.verbKey = selectedOneVerb.verbKey;
      target.itemKey = selectedOneVerb.itemKey || null;
      target.lemma = selectedOneVerb.lemma;
      target.term = selectedOneVerb.term;
    }
    return Object.keys(target).length ? target : null;
  }, [focusTarget, selectedOneVerb]);
  const selectedTenses = sessionKind === "focus" && activeFocusTarget?.tense && !baseSelectedTenses.includes(activeFocusTarget.tense)
    ? [...baseSelectedTenses, activeFocusTarget.tense]
    : baseSelectedTenses;
  const deckVerbs = sessionKind === "adaptive" && oneVerb
    ? poolVerbs.filter((verb) => (verb.itemKey || verb.verbKey) === oneVerb)
    : poolVerbs;
  const requestedSize = advanced ? size : 10;
  const laneTenses = drill === "forms" ? [] : recognitionTenses(drill);
  const recognitionTenseScope = recognitionPack === "customize"
    ? recognitionCustomTenses.filter((tense) => laneTenses.includes(tense))
    : RECOGNITION_EVERYDAY_TENSES.filter((tense) => laneTenses.includes(tense));
  const usageRecall = drill === "usage" && usageDirection === "recall";
  const endingsProduction = drill === "endings" && endingsDirection === "typed";
  const contrastLane = drill === "contrast";
  const recognitionAvailable = drill === "forms"
    ? 0
    : contrastLane
      ? contrastCards(contrastPair).length
      : usageRecall
        ? recognitionTenseScope.length
        : RECOGNITION_CARDS[drill].filter((card) => recognitionTenseScope.includes(card.answer)).length;
  const recognitionReady = contrastLane
    ? recognitionAvailable > 0
    : recognitionTenseScope.length >= (usageRecall || endingsProduction ? 1 : 4);
  const availableForms = useMemo(
    () => gymCellCount(deckVerbs, {
      tenses: advanced ? selectedTenses : TENSE_PACKS.everyday.tenses,
      slots: advanced ? slots : GYM_SLOTS,
    }),
    [deckVerbs, advanced, selectedTenses, slots]
  );
  const focusTargetText = activeFocusTarget
    ? [
        activeFocusTarget.term || activeFocusTarget.lemma,
        activeFocusTarget.tense && qualifiedTenseLabel(activeFocusTarget.tense),
        activeFocusTarget.slot,
      ].filter(Boolean).join(" · ")
    : "";

  function choosePool(next) {
    setPool(next);
    setOneVerb("");
    setFocusTarget(null);
    setStartError("");
  }

  function chooseSavedSubsetKind(kind) {
    const value = kind === "tag"
      ? savedTargeting.tags[0]?.tag || ""
      : kind === "page"
        ? savedTargeting.pages[0]?.id || ""
        : "";
    setSavedSubset({ kind, value });
    setOneVerb("");
    setFocusTarget(null);
    setStartError("");
  }

  function chooseSavedSubsetValue(value) {
    setSavedSubset((current) => ({ ...current, value }));
    setOneVerb("");
    setFocusTarget(null);
    setStartError("");
  }

  function toggleSlot(slot) {
    setSlots((current) =>
      current.includes(slot) ? current.filter((value) => value !== slot) : [...current, slot]
    );
  }

  function toggleTense(tense) {
    setCustomTenses((current) =>
      current.includes(tense) ? current.filter((value) => value !== tense) : [...current, tense]
    );
  }

  function toggleRecognitionTense(tense) {
    setRecognitionCustomTenses((current) =>
      current.includes(tense) ? current.filter((value) => value !== tense) : [...current, tense]
    );
  }

  function start() {
    if (drill !== "forms") {
      if (!contrastLane && (usageRecall || endingsProduction) && recognitionTenseScope.length < 1) {
        setStartError(`Choose at least one tense for ${usageRecall ? "recall" : "production"}.`);
        return;
      }
      if (!contrastLane && !usageRecall && !endingsProduction && recognitionTenseScope.length < 4) {
        setStartError("Choose at least four tenses so every card can have four distinct choices.");
        return;
      }
      const contrastScope = contrastLane ? contrastOptions(contrastPair) : null;
      const built = contrastLane
        ? buildRecognitionDeck(contrastCards(contrastPair), {
            size,
            tenseScope: contrastScope,
            allTenses: contrastScope,
          })
        : usageRecall
        ? buildUsageRecallDeck(TENSE_USAGE_CARDS, {
            size: usageRecallSize,
            tenseScope: recognitionTenseScope,
          })
        : endingsProduction
          ? buildEndingsProductionDeck(RECOGNITION_CARDS.endings, {
              size,
              tenseScope: recognitionTenseScope,
            })
          : buildRecognitionDeck(RECOGNITION_CARDS[drill], {
              size,
              tenseScope: recognitionTenseScope,
              allTenses: recognitionTenseScope,
            });
      if (!built.length) {
        setStartError("No cards match these choices.");
        return;
      }
      const id = sessionId();
      const cards = built.map((card, index) => ({
        ...card,
        sessionId: id,
        promptId: `${id}:${index + 1}`,
        cardIndex: index + 1,
        deckSize: built.length,
      }));
      setStartError("");
      setSession({
        deck: cards,
        skill: drill,
        mode: usageRecall ? "recall" : endingsProduction ? "typed" : "choice",
      });
      setView("session");
      return;
    }

    const options = advanced
      ? { size, tenses: selectedTenses, slots }
      : { size: 10, tenses: TENSE_PACKS.everyday.tenses, slots: GYM_SLOTS };
    const deck = sessionKind === "adaptive"
      ? buildAdaptiveGymDeck(deckVerbs, events, options)
      : sessionKind === "focus"
        ? buildFocusedGymDeck(deckVerbs, { ...options, target: activeFocusTarget })
        : buildBalancedGymDeck(deckVerbs, options);

    if (!deck.length) {
      setStartError("No answerable forms match these choices.");
      return;
    }

    const id = sessionId();
    const cards = deck.map((card, index) => {
      const sourceVerb = deckVerbs.find((verb) => verb.verbKey === card.verbKey && verb.itemKey === card.itemKey) ||
        deckVerbs.find((verb) => verb.verbKey === card.verbKey);
      return {
        ...card,
        forms: sourceVerb?.conjugation ? conjugationForms(sourceVerb.conjugation) : [],
        openKey: sourceVerb?.openKey || card.itemKey || card.dictKey,
        sessionId: id,
        promptId: `${id}:${index + 1}`,
        sessionKind,
        cardIndex: index + 1,
        deckSize: deck.length,
      };
    });
    setStartError("");
    setSession({ deck: cards, mode, kind: sessionKind });
    setView("session");
  }

  function practiceFromStats(focus) {
    setSessionKind("focus");
    setPool("core20");
    setOneVerb("");
    setSavedSubset({ kind: "all", value: "" });
    setMode("typed");
    setSize(10);
    setTensePack("everyday");
    setCustomTenses([...TENSE_PACKS.everyday.tenses]);
    setSlots([...GYM_SLOTS]);
    setFocusTarget(null);
    if (focus?.target) {
      const nextPool = focus.target.source === "saved"
        ? "saved"
        : GYM_CURRICULUM_REGISTRY[focus.target.curriculum]
          ? focus.target.curriculum
          : "core50";
      setPool(nextPool);
    } else if (focus?.source === "saved" && library.saved.length) {
      setPool("saved");
      setOneVerb("");
    } else if (focus?.source === "core") {
      setPool("core20");
      setOneVerb("");
    }
    const nextTarget = {};
    if (focus?.target) {
      nextTarget.verbKey = focus.target.verbKey;
      nextTarget.itemKey = focus.target.itemKey || null;
      nextTarget.lemma = focus.target.lemma;
      nextTarget.term = focus.target.term || focus.target.lemma;
    }
    if (focus?.tense) nextTarget.tense = focus.tense;
    if (focus?.slot) nextTarget.slot = focus.slot;
    if (Object.values(nextTarget).some(Boolean)) setFocusTarget(nextTarget);
    setStartError("");
    showMajor("setup");
  }

  if (activeView === "stats") {
    return (
      <ConjugationPerformance
        items={items}
        events={events}
        library={library}
        onBack={destinationView ? onBack : () => showMajor("setup")}
        backLabel={backLabel}
        onPractice={practiceFromStats}
        onOpen={onOpen}
      />
    );
  }

  if (activeView === "session" && session) {
    if (session.skill) {
      if (session.mode === "recall") {
        return (
          <UsageRecallDrill
            deck={session.deck}
            items={items}
            onFinish={() => setView("setup")}
            onGraded={onGraded}
            onOpen={onOpen}
          />
        );
      }
      if (session.mode === "typed") {
        return (
          <EndingsProductionDrill
            deck={session.deck}
            library={library}
            onFinish={() => setView("setup")}
            onGraded={onGraded}
          />
        );
      }
      return (
        <RecognitionDrill
          deck={session.deck}
          title={RECOGNITION_TITLES[session.skill] || "Tense usage"}
          onFinish={() => setView("setup")}
          onGraded={onGraded}
          onOpen={onOpen}
          renderReveal={session.skill === "endings"
            ? (card) => <EndingsReveal card={card} library={library} />
            : session.skill === "contrast"
              ? (card, _result, controls) => <ContrastReveal card={card} items={items} controls={controls} />
              : (card, _result, controls) => <UsageReveal card={card} items={items} controls={controls} />}
        />
      );
    }
    return (
      <ConjugationDrill
        deck={session.deck}
        mode={session.mode}
        onFinish={() => setView("setup")}
        onOpen={onOpen}
        onGraded={onGraded}
      />
    );
  }

  return (
    <div className="px-4 py-4 pb-28" style={dotGrid}>
      <Header
        title="Conjugation Gym"
        backLabel={backLabel}
        onBack={onBack}
        action={
          <button onClick={() => showMajor("stats")} aria-label="View conjugation performance" style={{ color: C.pen }}>
            <BarChart3 size={18} className="ml-auto" />
          </button>
        }
      />

      <div className="mb-5 text-center">
        <Dumbbell size={28} className="mx-auto" style={{ color: C.pen }} />
        <h1 className="mt-2 text-2xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
          Train the forms you need
        </h1>
        <p className="mt-1 text-sm" style={{ color: C.mut }}>
          Build recall without changing your vocabulary review schedule.
        </p>
      </div>

      <SectionTitle>Drill</SectionTitle>
      <Segmented
        label="Drill type"
        value={drill}
        options={DRILLS}
        onChange={(value) => {
          setDrill(value);
          setStartError("");
        }}
      />

      {drill !== "forms" ? (
        <>
          <Card className="mt-4 p-4">
            <div className="text-sm font-semibold" style={{ color: C.ink }}>
              {RECOGNITION_LANES[drill].eyebrow}
            </div>
            <p className="mt-1 text-xs" style={{ color: C.mut }}>
              {contrastLane
                ? "Fill the blank from four options: ser or estar, por or para. Recognition practice never changes your vocabulary review schedule."
                : usageRecall
                  ? "Name at least one valid use, reveal the curated set, then grade your recall."
                  : endingsProduction
                    ? "Produce all five endings, with one retry that keeps passing fields locked."
                    : "Choose the tense from four options. Recognition practice never changes your vocabulary review schedule."}
            </p>
          </Card>

          {drill === "usage" && (
            <>
              <SectionTitle>Direction</SectionTitle>
              <Segmented
                label="Tense usage direction"
                value={usageDirection}
                options={[
                  { value: "choice", label: "Identify tense" },
                  { value: "recall", label: "Recall uses" },
                ]}
                onChange={(value) => {
                  setUsageDirection(value);
                  setStartError("");
                }}
              />
            </>
          )}

          {drill === "endings" && (
            <>
              <SectionTitle>Direction</SectionTitle>
              <Segmented
                label="Endings direction"
                value={endingsDirection}
                options={[
                  { value: "choice", label: "Choose tense" },
                  { value: "typed", label: "Type endings" },
                ]}
                onChange={(value) => {
                  setEndingsDirection(value);
                  setStartError("");
                }}
              />
            </>
          )}

          <SectionTitle>{contrastLane ? "Pair" : "Tense scope"}</SectionTitle>
          <Card className="space-y-4 p-4">
            {contrastLane ? (
              <div>
                <label htmlFor="contrast-pair" className="mb-1 block text-xs" style={{ color: C.mut }}>Pair</label>
                <select
                  id="contrast-pair"
                  value={contrastPair}
                  onChange={(event) => {
                    setContrastPair(event.target.value);
                    setStartError("");
                  }}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ color: C.ink, borderColor: C.line, background: C.paper }}
                >
                  {CONTRAST_PAIR_IDS.map((id) => (
                    <option key={id} value={id}>{CONTRAST_PAIRS[id].label}</option>
                  ))}
                  <option value="both">Both pairs</option>
                </select>
              </div>
            ) : (
            <div>
              <label htmlFor="recognition-tense-pack" className="mb-1 block text-xs" style={{ color: C.mut }}>Tense pack</label>
              <select
                id="recognition-tense-pack"
                value={recognitionPack}
                onChange={(event) => setRecognitionPack(event.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ color: C.ink, borderColor: C.line, background: C.paper }}
              >
                <option value="everyday">Everyday</option>
                <option value="customize">Customize</option>
              </select>
            </div>
            )}

            {!contrastLane && recognitionPack === "customize" && (
              <fieldset>
                <legend className="mb-2 text-xs" style={{ color: C.mut }}>Tenses with {RECOGNITION_LANES[drill].label.toLowerCase()} cards</legend>
                <div className="space-y-1.5">
                  {laneTenses.map((tense) => (
                    <label key={tense} className="flex items-start gap-2 text-sm" style={{ color: C.ink }}>
                      <input
                        type="checkbox"
                        checked={recognitionCustomTenses.includes(tense)}
                        onChange={() => toggleRecognitionTense(tense)}
                      />
                      <span>{qualifiedTenseLabel(tense)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <div>
              <label htmlFor="recognition-size" className="mb-1 block text-xs" style={{ color: C.mut }}>Prompts</label>
              <select
                id="recognition-size"
                value={usageRecall ? usageRecallSize : size}
                onChange={(event) => usageRecall
                  ? setUsageRecallSize(event.target.value === "all" ? "all" : Number(event.target.value))
                  : setSize(Number(event.target.value))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ color: C.ink, borderColor: C.line, background: C.paper }}
              >
                {usageRecall && <option value="all">All selected</option>}
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </Card>

          <div className="mt-3 text-xs" style={{ color: C.mut }}>
            {recognitionAvailable} {usageRecall ? (recognitionAvailable === 1 ? "tense" : "tenses") : (recognitionAvailable === 1 ? "card" : "cards")} available for these choices.
          </div>
          {!usageRecall && recognitionAvailable > 0 && recognitionAvailable < size && (
            <div className="mt-2 rounded-lg px-3 py-2 text-xs" role="status" style={{ background: C.hi, color: C.ink }}>
              This session will use all {recognitionAvailable} available cards.
            </div>
          )}
          {startError && <div className="mt-3 text-sm" role="alert" style={{ color: C.red }}>{startError}</div>}
          <Button
            className="mt-4 w-full py-3"
            onClick={start}
            disabled={!recognitionAvailable || !recognitionReady}
          >
            <Play size={16} /> Start {RECOGNITION_LANES[drill].label.toLowerCase()}
          </Button>
        </>
      ) : library.loading ? (
        <Card className="p-5 text-center text-sm" style={{ color: C.mut }}>
          Loading conjugation tables…
        </Card>
      ) : !library.installed ? (
        <Card className="p-5">
          <div className="font-semibold" style={{ color: C.ink }}>Dictionary not installed</div>
          <p className="mt-1 text-sm" style={{ color: C.mut }}>
            Your performance history remains available, but practice needs the offline dictionary.
          </p>
          {loadError && <p className="mt-2 text-xs" style={{ color: C.red }}>The dictionary could not be read.</p>}
        </Card>
      ) : (
        <>
          <SectionTitle>Session</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {SESSION_KINDS.map((choice) => {
              const active = sessionKind === choice.value;
              return (
                <button
                  key={choice.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSessionKind(choice.value)}
                  className="rounded-xl border px-2 py-3 text-center"
                  style={{ background: active ? C.penPale : C.card, borderColor: active ? C.pen : C.line }}
                >
                  <span className="block text-sm font-semibold" style={{ color: C.ink }}>{choice.label}</span>
                  <span className="mt-1 block text-[10px] leading-tight" style={{ color: C.mut }}>{choice.detail}</span>
                </button>
              );
            })}
          </div>

          <SectionTitle>Verb pool</SectionTitle>
          <label htmlFor="gym-pool" className="sr-only">Verb pool</label>
          <select
            id="gym-pool"
            value={pool}
            onChange={(event) => choosePool(event.target.value)}
            className="w-full rounded-xl border px-3 py-3 text-sm font-semibold"
            style={{ color: C.ink, borderColor: C.line, background: C.card }}
          >
            <optgroup label="Personal">
              <option value="saved" disabled={library.saved.length === 0}>Saved</option>
            </optgroup>
            <optgroup label="Built-in">
              {Object.entries(GYM_CURRICULUM_REGISTRY).map(([key, curriculum]) => (
                <option key={key} value={key}>{curriculum.label}</option>
              ))}
            </optgroup>
          </select>
          <div className="mt-2 text-xs" style={{ color: C.mut }}>
            <span>
              {pool === "saved"
                ? `${poolVerbs.length} saved ${poolVerbs.length === 1 ? "verb" : "verbs"} available`
                : `${poolVerbs.length} of ${poolDefinition.lemmas.length} ${poolDefinition.availabilityLabel} available`}
            </span>
            {unavailableInPool > 0 && ` · ${unavailableInPool} unavailable in this dictionary version`}
          </div>

          {pool === "saved" && library.saved.length > 0 && (
            <>
              <SectionTitle>Saved target</SectionTitle>
              <Card className="space-y-4 p-4">
                <div>
                  <label htmlFor="gym-saved-subset" className="mb-1 block text-xs" style={{ color: C.mut }}>Saved refinement</label>
                  <select
                    id="gym-saved-subset"
                    value={savedSubset.kind}
                    onChange={(event) => chooseSavedSubsetKind(event.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    style={{ color: C.ink, borderColor: C.line, background: C.paper }}
                  >
                    <option value="all">All saved</option>
                    <option value="tag" disabled={savedTargeting.tags.length === 0}>One exact tag</option>
                    <option value="page" disabled={savedTargeting.pages.length === 0}>One Vocabulary page</option>
                  </select>
                </div>

                {savedSubset.kind === "tag" && (
                  <div>
                    <label htmlFor="gym-saved-tag" className="mb-1 block text-xs" style={{ color: C.mut }}>Exact tag</label>
                    <select
                      id="gym-saved-tag"
                      value={savedSubset.value}
                      onChange={(event) => chooseSavedSubsetValue(event.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      style={{ color: C.ink, borderColor: C.line, background: C.paper }}
                    >
                      {savedTargeting.tags.map((row) => (
                        <option key={row.tag} value={row.tag}>{row.tag} · {row.count}</option>
                      ))}
                    </select>
                  </div>
                )}

                {savedSubset.kind === "page" && (
                  <div>
                    <label htmlFor="gym-saved-page" className="mb-1 block text-xs" style={{ color: C.mut }}>Vocabulary page</label>
                    <select
                      id="gym-saved-page"
                      value={savedSubset.value}
                      onChange={(event) => chooseSavedSubsetValue(event.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      style={{ color: C.ink, borderColor: C.line, background: C.paper }}
                    >
                      {savedTargeting.pages.map((row) => (
                        <option key={row.id} value={row.id}>{row.title} · {row.count}</option>
                      ))}
                    </select>
                  </div>
                )}
              </Card>
            </>
          )}

          <SectionTitle>Answer</SectionTitle>
          <Segmented
            label="How to answer"
            value={mode}
            options={[{ value: "typed", label: "Type" }, { value: "reveal", label: "Reveal" }]}
            onChange={setMode}
          />

          {advanced && (
            <>
              <SectionTitle>Focus</SectionTitle>
              <Card className="space-y-4 p-4">
                {sessionKind === "focus" && activeFocusTarget && (
                  <div className="rounded-lg border px-3 py-2" style={{ borderColor: C.pen, background: C.penPale }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 text-sm font-semibold" style={{ color: C.penDark }}>{focusTargetText}</div>
                      <button
                        type="button"
                        onClick={() => {
                          setFocusTarget(null);
                          setOneVerb("");
                        }}
                        className="shrink-0 text-xs underline underline-offset-2"
                        style={{ color: C.pen }}
                      >
                        Clear target
                      </button>
                    </div>
                    <div className="mt-1 text-xs" style={{ color: C.mut }}>The deck starts here, then fills outward through your other choices.</div>
                  </div>
                )}
                <div>
                  <label htmlFor="gym-tense-pack" className="mb-1 block text-xs" style={{ color: C.mut }}>Tense pack</label>
                  <select
                    id="gym-tense-pack"
                    value={tensePack}
                    onChange={(event) => setTensePack(event.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    style={{ color: C.ink, borderColor: C.line, background: C.paper }}
                  >
                    {Object.entries(TENSE_PACKS).map(([key, pack]) => <option key={key} value={key}>{pack.label}</option>)}
                  </select>
                </div>

                {tensePack === "customize" && (
                  <fieldset>
                    <legend className="mb-2 text-xs" style={{ color: C.mut }}>Tenses</legend>
                    <div className="space-y-1.5">
                      {TENSE_PACKS.customize.tenses.map((tense) => (
                        <label key={tense} className="flex items-start gap-2 text-sm" style={{ color: C.ink }}>
                          <input type="checkbox" checked={customTenses.includes(tense)} onChange={() => toggleTense(tense)} />
                          <span>
                            {qualifiedTenseLabel(tense)}
                            {ALTERNATIVE_TENSES.has(tense) && <span style={{ color: C.mut }}> · alternative / less common</span>}
                            {RARE_TENSES.has(tense) && <span style={{ color: C.mut }}> · rare</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                <fieldset>
                  <legend className="mb-2 text-xs" style={{ color: C.mut }}>People</legend>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {GYM_SLOTS.map((slot) => (
                      <label key={slot} className="flex items-center gap-1.5 text-sm" style={{ color: C.ink }}>
                        <input type="checkbox" checked={slots.includes(slot)} onChange={() => toggleSlot(slot)} /> {slot}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="gym-size" className="mb-1 block text-xs" style={{ color: C.mut }}>Prompts</label>
                    <select id="gym-size" value={size} onChange={(event) => setSize(Number(event.target.value))} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ color: C.ink, borderColor: C.line, background: C.paper }}>
                      <option value={10}>10</option><option value={20}>20</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="gym-verb" className="mb-1 block text-xs" style={{ color: C.mut }}>One verb (optional)</label>
                    <select id="gym-verb" value={oneVerb} onChange={(event) => setOneVerb(event.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ color: C.ink, borderColor: C.line, background: C.paper }}>
                      <option value="">All verbs</option>
                      {poolVerbs.map((verb) => (
                        <option key={`${verb.itemKey || "core"}:${verb.dictKey}`} value={verb.itemKey || verb.verbKey}>{verb.term}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </Card>
            </>
          )}

          {sessionKind === "adaptive" && (
            <div className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: C.penPale, color: C.penDark }}>
              <SlidersHorizontal size={14} className="mt-0.5 shrink-0" />
              Unresolved misses from the last 90 days, weak spots from each recent 10 attempts, and under-practised forms are weighted first. Your Leitner boxes never change.
            </div>
          )}

          <div className="mt-3 text-xs" style={{ color: C.mut }}>
            {availableForms} unique {availableForms === 1 ? "form" : "forms"} available for these choices.
          </div>
          {availableForms > 0 && availableForms < requestedSize && (
            <div className="mt-2 rounded-lg px-3 py-2 text-xs" role="status" style={{ background: C.hi, color: C.ink }}>
              Only {availableForms} {availableForms === 1 ? "form is" : "forms are"} available, so this {requestedSize}-prompt session will use {availableForms === 1 ? "it" : `all ${availableForms}`}.
            </div>
          )}

          {startError && <div className="mt-3 text-sm" role="alert" style={{ color: C.red }}>{startError}</div>}
          <Button className="mt-4 w-full py-3" onClick={start} disabled={!poolVerbs.length || (advanced && (!selectedTenses.length || !slots.length))}>
            <Play size={16} /> Start {sessionKind === "quick" ? "quick session" : sessionKind === "focus" ? "focus session" : "adaptive session"}
          </Button>
        </>
      )}
    </div>
  );
}
