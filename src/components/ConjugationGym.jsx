import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, ChevronLeft, Dumbbell, Play, SlidersHorizontal } from "lucide-react";
import { C, MONO, SERIF, Card, Button, SectionTitle, Segmented, dotGrid } from "../theme.jsx";
import { loadGymLibrary } from "../db/ref/gym.js";
import {
  CORE_20,
  CORE_50,
  GYM_SLOTS,
  RARE_TENSES,
  TENSE_PACKS,
  buildAdaptiveGymDeck,
  buildBalancedGymDeck,
} from "../lib/conjugationGym.js";
import { qualifiedTenseLabel } from "../lib/conjugation.js";
import { conjugationForms } from "../lib/drill.js";
import ConjugationDrill from "./ConjugationDrill.jsx";
import ConjugationPerformance from "./ConjugationPerformance.jsx";

const SESSION_KINDS = [
  { value: "quick", label: "Quick", detail: "10 everyday prompts" },
  { value: "focus", label: "Focus", detail: "Choose exactly what to practise" },
  { value: "adaptive", label: "Adaptive", detail: "Use your recent weak spots" },
];

const POOLS = [
  { value: "saved", label: "Saved" },
  { value: "core20", label: "Core 20" },
  { value: "core50", label: "Core 50" },
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
  const [sessionKind, setSessionKind] = useState("quick");
  const [pool, setPool] = useState("core20");
  const [mode, setMode] = useState("typed");
  const [size, setSize] = useState(10);
  const [tensePack, setTensePack] = useState("everyday");
  const [customTenses, setCustomTenses] = useState([...TENSE_PACKS.everyday.tenses]);
  const [slots, setSlots] = useState([...GYM_SLOTS]);
  const [oneVerb, setOneVerb] = useState("");
  const [session, setSession] = useState(null);
  const [startError, setStartError] = useState("");
  const loadedItems = useRef(null);

  useEffect(() => {
    if (view === "session" || loadedItems.current === items) return undefined;
    loadedItems.current = items;
    let alive = true;
    setLoadError(false);
    loadGymLibrary(items)
      .then((loaded) => {
        if (alive) setLibrary({ ...loaded, loading: false });
      })
      .catch(() => {
        if (!alive) return;
        setLoadError(true);
        setLibrary({ loading: false, installed: false, saved: [], core: [], unavailableCore: [...CORE_50] });
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

  const poolVerbs = useMemo(() => {
    if (pool === "saved") return library.saved;
    const allowed = new Set(pool === "core20" ? CORE_20 : CORE_50);
    return library.core
      .filter((verb) => allowed.has(verb.lemma))
      .map((verb) => ({ ...verb, curriculum: pool }));
  }, [library, pool]);

  const unavailableInPool = useMemo(() => {
    if (pool === "saved") return 0;
    const allowed = new Set(pool === "core20" ? CORE_20 : CORE_50);
    return library.unavailableCore.filter((lemma) => allowed.has(lemma)).length;
  }, [library, pool]);

  const advanced = sessionKind !== "quick";
  const selectedTenses = tensePack === "customize" ? customTenses : TENSE_PACKS[tensePack].tenses;

  function choosePool(next) {
    setPool(next);
    setOneVerb("");
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

  function start() {
    const chosen = oneVerb ? poolVerbs.filter((verb) => (verb.itemKey || verb.verbKey) === oneVerb) : poolVerbs;
    const options = advanced
      ? { size, tenses: selectedTenses, slots }
      : { size: 10, tenses: TENSE_PACKS.everyday.tenses, slots: GYM_SLOTS };
    const deck = sessionKind === "adaptive"
      ? buildAdaptiveGymDeck(chosen, events, options)
      : buildBalancedGymDeck(chosen, options);

    if (!deck.length) {
      setStartError("No answerable forms match these choices.");
      return;
    }

    const id = sessionId();
    const cards = deck.map((card, index) => {
      const sourceVerb = chosen.find((verb) => verb.verbKey === card.verbKey && verb.itemKey === card.itemKey) ||
        chosen.find((verb) => verb.verbKey === card.verbKey);
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
    if (focus?.target) {
      const nextPool = focus.target.source === "saved" ? "saved" : focus.target.curriculum || "core50";
      setPool(nextPool);
      setOneVerb(focus.target.itemKey || focus.target.verbKey);
    } else if (focus?.source === "saved" && library.saved.length) {
      setPool("saved");
      setOneVerb("");
    } else if (focus?.source === "core") {
      setPool("core20");
      setOneVerb("");
    }
    if (focus?.tense) {
      setTensePack("customize");
      setCustomTenses([focus.tense]);
    }
    if (focus?.slot) setSlots([focus.slot]);
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

      {library.loading ? (
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
            {pool === "saved"
              ? `${library.saved.length} saved ${library.saved.length === 1 ? "verb" : "verbs"} available`
              : `${poolVerbs.length} of ${pool === "core20" ? 20 : 50} core verbs available`}
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
                          <span>{qualifiedTenseLabel(tense)}{RARE_TENSES.has(tense) && <span style={{ color: C.mut }}> · rare</span>}</span>
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
              Recent misses, weak dimensions, and under-practised forms are weighted first. Your Leitner boxes never change.
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
