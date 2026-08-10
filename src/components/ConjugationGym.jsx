import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, ChevronLeft, Dumbbell, Play, SlidersHorizontal } from "lucide-react";
import { C, MONO, SERIF, Card, Button, SectionTitle, Segmented, dotGrid } from "../theme.jsx";
import { loadGymLibrary } from "../db/ref/gym.js";
import {
  CORE_20,
  CORE_50,
  CURATED_GYM_LEMMAS,
  IRREGULAR_PRETERITES,
  STEM_CHANGERS,
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
  RECOGNITION_CARDS,
  RECOGNITION_EVERYDAY_TENSES,
  RECOGNITION_LANES,
  TENSE_USAGE_CARDS,
  recognitionTenses,
} from "../lib/recognitionContent.js";
import { buildRecognitionDeck, buildUsageRecallDeck } from "../lib/recognitionDeck.js";
import ConjugationDrill from "./ConjugationDrill.jsx";
import ConjugationPerformance from "./ConjugationPerformance.jsx";
import RecognitionDrill from "./RecognitionDrill.jsx";
import EndingsReveal from "./EndingsReveal.jsx";
import UsageReveal from "./UsageReveal.jsx";
import UsageRecallDrill from "./UsageRecallDrill.jsx";

const SESSION_KINDS = [
  { value: "quick", label: "Quick", detail: "10 everyday prompts" },
  { value: "focus", label: "Focus", detail: "Choose exactly what to practise" },
  { value: "adaptive", label: "Adaptive", detail: "Use your recent weak spots" },
];

const DRILLS = [
  { value: "forms", label: "Forms" },
  { value: "usage", label: "Tense usage" },
  { value: "endings", label: "Endings" },
];

const POOLS = [
  { value: "saved", label: "Saved", lemmas: null, availabilityLabel: "saved verbs" },
  { value: "core20", label: "Core 20", lemmas: CORE_20, availabilityLabel: "core verbs" },
  { value: "core50", label: "Core 50", lemmas: CORE_50, availabilityLabel: "core verbs" },
  { value: "stemChangers", label: "Stem changers", lemmas: STEM_CHANGERS, availabilityLabel: "stem changers" },
  {
    value: "irregularPreterites",
    label: "Irregular preterites",
    lemmas: IRREGULAR_PRETERITES,
    availabilityLabel: "irregular preterites",
  },
];

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
  onBack,
  onOpen,
  onGraded,
}) {
  const [view, setView] = useState(initialView);
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
  const [slots, setSlots] = useState([...GYM_SLOTS]);
  const [oneVerb, setOneVerb] = useState("");
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

  const poolDefinition = POOLS.find((option) => option.value === pool) || POOLS[1];
  const poolVerbs = useMemo(() => {
    if (pool === "saved") return library.saved;
    const allowed = new Set(poolDefinition.lemmas);
    return library.core
      .filter((verb) => allowed.has(verb.lemma))
      .map((verb) => ({ ...verb, curriculum: pool }));
  }, [library, pool, poolDefinition]);

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
  const recognitionAvailable = drill === "forms"
    ? 0
    : usageRecall
      ? recognitionTenseScope.length
      : RECOGNITION_CARDS[drill].filter((card) => recognitionTenseScope.includes(card.answer)).length;
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
      if (usageRecall && recognitionTenseScope.length < 1) {
        setStartError("Choose at least one tense for recall.");
        return;
      }
      if (!usageRecall && recognitionTenseScope.length < 4) {
        setStartError("Choose at least four tenses so every card can have four distinct choices.");
        return;
      }
      const built = usageRecall
        ? buildUsageRecallDeck(TENSE_USAGE_CARDS, {
            size: usageRecallSize,
            tenseScope: recognitionTenseScope,
          })
        : buildRecognitionDeck(RECOGNITION_CARDS[drill], {
            size,
            tenseScope: recognitionTenseScope,
            allTenses: recognitionTenseScope,
          });
      if (!built.length) {
        setStartError("No recognition cards match these choices.");
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
      setSession({ deck: cards, skill: drill, mode: usageRecall ? "recall" : "choice" });
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
    setMode("typed");
    setSize(10);
    setTensePack("everyday");
    setCustomTenses([...TENSE_PACKS.everyday.tenses]);
    setSlots([...GYM_SLOTS]);
    setFocusTarget(null);
    if (focus?.target) {
      const nextPool = focus.target.source === "saved" ? "saved" : focus.target.curriculum || "core50";
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
    setView("setup");
  }

  if (view === "stats") {
    return (
      <ConjugationPerformance
        items={items}
        events={events}
        library={library}
        onBack={() => setView("setup")}
        onPractice={practiceFromStats}
        onOpen={onOpen}
      />
    );
  }

  if (view === "session" && session) {
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
      return (
        <RecognitionDrill
          deck={session.deck}
          onFinish={() => setView("setup")}
          onGraded={onGraded}
          onOpen={onOpen}
          renderReveal={session.skill === "endings"
            ? (card) => <EndingsReveal card={card} library={library} />
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

  const poolOptions = POOLS.map((option) => ({
    ...option,
    disabled: option.value === "saved" && library.saved.length === 0,
  }));

  return (
    <div className="px-4 py-4 pb-28" style={dotGrid}>
      <Header
        title="Conjugation Gym"
        backLabel="Repaso"
        onBack={onBack}
        action={
          <button onClick={() => setView("stats")} aria-label="View conjugation performance" style={{ color: C.pen }}>
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
              {usageRecall
                ? "Name at least one valid use, reveal the curated set, then grade your recall."
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

          <SectionTitle>Tense scope</SectionTitle>
          <Card className="space-y-4 p-4">
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

            {recognitionPack === "customize" && (
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
            disabled={!recognitionAvailable || recognitionTenseScope.length < (usageRecall ? 1 : 4)}
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
          <Segmented label="Verb pool" value={pool} options={poolOptions} onChange={choosePool} />
          <div className="mt-2 text-xs" style={{ color: C.mut }}>
            <span>
              {pool === "saved"
                ? `${library.saved.length} saved ${library.saved.length === 1 ? "verb" : "verbs"} available`
                : `${poolVerbs.length} of ${poolDefinition.lemmas.length} ${poolDefinition.availabilityLabel} available`}
            </span>
            {unavailableInPool > 0 && ` · ${unavailableInPool} unavailable in this dictionary version`}
          </div>

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
