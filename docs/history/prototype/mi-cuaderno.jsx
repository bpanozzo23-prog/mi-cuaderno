import { useState, useEffect, useMemo } from "react";
import {
  Search, Plus, ChevronLeft, Sparkles, BookOpen, BarChart3, Highlighter,
  Link2, Trash2, X, Send, Check, ExternalLink, Clock, Eye, Loader2
} from "lucide-react";

/* ---------- design tokens ---------- */
const C = {
  paper: "#FAF9F4",
  card: "#FFFFFF",
  ink: "#212A3D",
  pen: "#2D4EA0",
  penDark: "#243F85",
  penPale: "#EDF1FA",
  hi: "#F7DF4E",
  line: "#E6E3D7",
  mut: "#7A8199",
  red: "#B3402E",
};
const SERIF = 'Georgia, "Iowan Old Style", "Times New Roman", serif';
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const STORAGE_KEY = "mi-cuaderno-v1";
const POS = ["noun", "verb", "adjective", "adverb", "phrase", "other"];
const POS_ABBR = { noun: "s.", verb: "v.", adjective: "adj.", adverb: "adv.", phrase: "loc.", other: "" };

/* ---------- helpers ---------- */
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  return d + "d ago";
}
const EVENT_LABEL = { create: "Added", view: "Looked up", tricky_on: "Highlighted", tricky_off: "Unhighlighted" };

/* ---------- seed data (first run only) ---------- */
function buildSeed() {
  const now = Date.now();
  const entries = [
    {
      id: "s1", term: "sacar", translation: "to take out; to get", partOfSpeech: "verb",
      tags: ["verbs", "high-frequency"],
      notes: "Meaning shifts with the object: sacar fotos (take photos), sacar buenas notas (get good grades), sacar la basura (take out the trash).",
      examples: [{ es: "¿Puedes sacar la basura?", en: "Can you take out the trash?" }],
      mediaLinks: [], linkedIds: [], struggling: false, createdAt: now - 86400000 * 6,
    },
    {
      id: "s2", term: "tener ganas de", translation: "to feel like (doing something)", partOfSpeech: "phrase",
      tags: ["idioms", "high-frequency"],
      notes: "Followed by an infinitive. Often more natural than querer for casual wants.",
      examples: [{ es: "Tengo ganas de ver el partido.", en: "I feel like watching the match." }],
      mediaLinks: [{ url: "https://www.youtube.com/results?search_query=tener+ganas+de", label: "YouTube: usage examples" }],
      linkedIds: [], struggling: true, createdAt: now - 86400000 * 5,
    },
    {
      id: "s3", term: "por si acaso", translation: "just in case", partOfSpeech: "phrase",
      tags: ["idioms"], notes: "", examples: [], mediaLinks: [], linkedIds: [],
      struggling: false, createdAt: now - 86400000 * 3,
    },
    {
      id: "s4", term: "madrugar", translation: "to get up very early", partOfSpeech: "verb",
      tags: ["verbs"],
      notes: 'A one-word verb English needs a phrase for. Refrán: "A quien madruga, Dios le ayuda."',
      examples: [], mediaLinks: [], linkedIds: [], struggling: false, createdAt: now - 86400000 * 2,
    },
  ];
  const events = [
    { id: uid(), type: "create", entryId: "s1", at: now - 86400000 * 6 },
    { id: uid(), type: "create", entryId: "s2", at: now - 86400000 * 5 },
    { id: uid(), type: "create", entryId: "s3", at: now - 86400000 * 3 },
    { id: uid(), type: "create", entryId: "s4", at: now - 86400000 * 2 },
    { id: uid(), type: "view", entryId: "s1", at: now - 86400000 * 4 },
    { id: uid(), type: "view", entryId: "s2", at: now - 86400000 * 4 + 3600000 },
    { id: uid(), type: "tricky_on", entryId: "s2", at: now - 86400000 * 4 + 3700000 },
    { id: uid(), type: "view", entryId: "s1", at: now - 86400000 * 2 },
    { id: uid(), type: "view", entryId: "s2", at: now - 86400000 },
    { id: uid(), type: "view", entryId: "s1", at: now - 7200000 },
  ];
  return { entries, events };
}

/* ---------- small UI pieces ---------- */
function Hi({ children, on }) {
  if (!on) return <span>{children}</span>;
  return (
    <span style={{
      backgroundImage: `linear-gradient(100deg, transparent 0.5%, ${C.hi} 3.5%, ${C.hi}E6 96%, transparent 99.5%)`,
      borderRadius: 4, padding: "0 6px", margin: "0 -6px", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone",
    }}>{children}</span>
  );
}
function SectionTitle({ children }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-6" style={{ color: C.mut, letterSpacing: "0.08em" }}>
      {children}
    </div>
  );
}
function Chip({ children, active, onClick, onRemove }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border whitespace-nowrap"
      style={active
        ? { background: C.pen, color: "#fff", borderColor: C.pen }
        : { background: C.penPale, color: C.penDark, borderColor: "#D9E1F2" }}>
      {children}
      {onRemove && (
        <X size={12} className="opacity-70" onClick={(e) => { e.stopPropagation(); onRemove(); }} />
      )}
    </button>
  );
}

/* ---------- main app ---------- */
export default function MiCuaderno() {
  const [data, setData] = useState(null); // {entries, events}
  const [banner, setBanner] = useState("");
  const [tab, setTab] = useState("words");
  const [selectedId, setSelectedId] = useState(null);
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  // add-form state
  const [fTerm, setFTerm] = useState(""); const [fTr, setFTr] = useState("");
  const [fPos, setFPos] = useState("phrase"); const [fTags, setFTags] = useState(""); const [fNote, setFNote] = useState("");

  // detail editing state
  const [noteDraft, setNoteDraft] = useState(""); const [noteDirty, setNoteDirty] = useState(false);
  const [exEs, setExEs] = useState(""); const [exEn, setExEn] = useState("");
  const [mUrl, setMUrl] = useState(""); const [mLabel, setMLabel] = useState("");
  const [tagAdd, setTagAdd] = useState(""); const [linkPick, setLinkPick] = useState("");
  const [deleteArm, setDeleteArm] = useState(false);

  // assistant state
  const [msgs, setMsgs] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [addedProposals, setAddedProposals] = useState({});

  /* ----- load / persist ----- */
  useEffect(() => {
    (async () => {
      let stored = null;
      try {
        const r = await window.storage.get(STORAGE_KEY);
        stored = r?.value || null;
      } catch (e) { /* first run */ }
      if (stored) {
        try { setData(JSON.parse(stored)); return; } catch (e) { /* fall through to seed */ }
      }
      const seeded = buildSeed();
      setData(seeded);
      try { await window.storage.set(STORAGE_KEY, JSON.stringify(seeded)); }
      catch (e) { setBanner("Couldn't reach saved storage — changes may not persist."); }
    })();
  }, []);

  async function save(next) {
    setData(next);
    try { await window.storage.set(STORAGE_KEY, JSON.stringify(next)); setBanner(""); }
    catch (e) { setBanner("Couldn't save that change — it may not persist."); }
  }

  function withEvent(entries, type, entryId) {
    const events = [...(data?.events || []), { id: uid(), type, entryId, at: Date.now() }].slice(-400);
    return { entries, events };
  }

  /* ----- actions ----- */
  function openEntry(id, { log = true } = {}) {
    setTab("words"); setSelectedId(id); setDeleteArm(false);
    const e = data.entries.find((x) => x.id === id);
    setNoteDraft(e?.notes || ""); setNoteDirty(false);
    setExEs(""); setExEn(""); setMUrl(""); setMLabel(""); setTagAdd(""); setLinkPick("");
    if (log) save(withEvent(data.entries, "view", id));
  }
  function patchEntry(id, patch, eventType) {
    const entries = data.entries.map((e) => (e.id === id ? { ...e, ...patch } : e));
    save(eventType ? withEvent(entries, eventType, id) : { ...data, entries });
  }
  function toggleTricky(e) {
    patchEntry(e.id, { struggling: !e.struggling }, e.struggling ? "tricky_off" : "tricky_on");
  }
  function addEntry({ term, translation, partOfSpeech, tags, notes, examples }) {
    const entry = {
      id: uid(), term: term.trim(), translation: translation.trim(),
      partOfSpeech: partOfSpeech || "other",
      tags: (tags || []).map((t) => t.trim()).filter(Boolean),
      notes: notes || "", examples: examples || [], mediaLinks: [], linkedIds: [],
      struggling: false, createdAt: Date.now(),
    };
    save(withEvent([...data.entries, entry], "create", entry.id));
    return entry;
  }
  function deleteEntry(id) {
    const entries = data.entries.filter((e) => e.id !== id)
      .map((e) => ({ ...e, linkedIds: (e.linkedIds || []).filter((l) => l !== id) }));
    save({ ...data, entries });
    setSelectedId(null);
  }
  function linkEntries(aId, bId) {
    const entries = data.entries.map((e) => {
      if (e.id === aId && !e.linkedIds.includes(bId)) return { ...e, linkedIds: [...e.linkedIds, bId] };
      if (e.id === bId && !e.linkedIds.includes(aId)) return { ...e, linkedIds: [...e.linkedIds, aId] };
      return e;
    });
    save({ ...data, entries });
  }
  function unlinkEntries(aId, bId) {
    const entries = data.entries.map((e) => {
      if (e.id === aId) return { ...e, linkedIds: e.linkedIds.filter((l) => l !== bId) };
      if (e.id === bId) return { ...e, linkedIds: e.linkedIds.filter((l) => l !== aId) };
      return e;
    });
    save({ ...data, entries });
  }

  /* ----- derived ----- */
  const viewCounts = useMemo(() => {
    const m = {};
    (data?.events || []).forEach((ev) => { if (ev.type === "view") m[ev.entryId] = (m[ev.entryId] || 0) + 1; });
    return m;
  }, [data]);
  const lastViewed = useMemo(() => {
    const m = {};
    (data?.events || []).forEach((ev) => { if (ev.type === "view") m[ev.entryId] = Math.max(m[ev.entryId] || 0, ev.at); });
    return m;
  }, [data]);
  const allTags = useMemo(() => {
    const s = new Set();
    (data?.entries || []).forEach((e) => (e.tags || []).forEach((t) => s.add(t)));
    return [...s].sort();
  }, [data]);
  const filtered = useMemo(() => {
    if (!data) return [];
    const nq = norm(q);
    return data.entries
      .filter((e) => !tagFilter || (e.tags || []).includes(tagFilter))
      .filter((e) => {
        if (!nq) return true;
        const hay = [e.term, e.translation, e.notes, ...(e.tags || []),
          ...(e.examples || []).flatMap((x) => [x.es, x.en])].map(norm).join(" · ");
        return hay.includes(nq);
      })
      .sort((a, b) => norm(a.term).localeCompare(norm(b.term)));
  }, [data, q, tagFilter]);

  const selected = data?.entries.find((e) => e.id === selectedId) || null;

  /* ----- assistant ----- */
  async function sendToAssistant() {
    const text = aiInput.trim();
    if (!text || aiBusy) return;
    const history = [...msgs, { role: "user", text }];
    setMsgs(history); setAiInput(""); setAiBusy(true);

    const entriesForAI = data.entries.slice(0, 120).map((e) => ({
      term: e.term, translation: e.translation, pos: e.partOfSpeech,
      tags: e.tags, tricky: !!e.struggling, lookups: viewCounts[e.id] || 0,
      note: (e.notes || "").slice(0, 140),
    }));
    const recent = (data.events || []).slice(-15).map((ev) => {
      const t = data.entries.find((x) => x.id === ev.entryId);
      return `${EVENT_LABEL[ev.type] || ev.type} "${t ? t.term : "(deleted)"}" ${timeAgo(ev.at)}`;
    });
    const transcript = history.slice(-12).map((m) =>
      `${m.role === "user" ? "User" : "Assistant"}: ${m.text}${m.proposals?.length ? ` [proposed ${m.proposals.length} entries]` : ""}`
    ).join("\n");

    const prompt =
`You are the built-in assistant of "Mi cuaderno", a personal Spanish-learning notebook app. The user is a self-directed Spanish learner. Be a sharp, encouraging tutor and keep replies concise plain text.

USER'S NOTEBOOK DATA (JSON):
${JSON.stringify({ totalEntries: data.entries.length, trickyCount: data.entries.filter((e) => e.struggling).length, entries: entriesForAI, recentActivity: recent })}

CONVERSATION SO FAR:
${transcript}

Respond with ONLY a valid JSON object — no code fences, no text outside it:
{"reply": "your answer as plain text", "proposedEntries": [{"term":"...","translation":"...","partOfSpeech":"noun|verb|adjective|adverb|phrase|other","tags":["..."],"notes":"...","examples":[{"es":"...","en":"..."}]}]}
Rules: include "proposedEntries" ONLY when the user asks you to create, suggest, or draft new entries (max 5; never duplicate terms already in the notebook). When you include proposals, say in "reply" that they need the user's approval below.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) throw new Error("API error " + res.status);
      const out = await res.json();
      const raw = (out.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      let reply = raw, proposals = [];
      try {
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        reply = typeof parsed.reply === "string" ? parsed.reply : raw;
        if (Array.isArray(parsed.proposedEntries)) {
          proposals = parsed.proposedEntries
            .filter((p) => p && typeof p.term === "string" && typeof p.translation === "string")
            .slice(0, 5)
            .map((p) => ({
              pid: uid(), term: p.term, translation: p.translation,
              partOfSpeech: POS.includes(p.partOfSpeech) ? p.partOfSpeech : "other",
              tags: Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === "string").slice(0, 6) : [],
              notes: typeof p.notes === "string" ? p.notes : "",
              examples: Array.isArray(p.examples) ? p.examples.filter((x) => x && x.es).slice(0, 4) : [],
            }));
        }
      } catch (e) { /* fall back to raw text */ }
      setMsgs((m) => [...m, { role: "ai", text: reply, proposals }]);
    } catch (err) {
      setMsgs((m) => [...m, { role: "ai", text: "Sorry — I couldn't reach the assistant just now. Try sending that again.", proposals: [] }]);
    } finally { setAiBusy(false); }
  }
  function approveProposal(p) {
    const entry = addEntry(p);
    setAddedProposals((m) => ({ ...m, [p.pid]: entry.id }));
  }

  /* ----- loading ----- */
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.paper, color: C.mut }}>
        <div className="flex items-center gap-2 text-sm"><Loader2 size={16} className="animate-spin" /> Opening your cuaderno…</div>
      </div>
    );
  }

  /* ---------- renderers ---------- */
  const dotGrid = {
    backgroundImage: "radial-gradient(rgba(45,78,160,0.06) 1px, transparent 1.2px)",
    backgroundSize: "18px 18px",
  };

  function renderHeader() {
    return (
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3" style={{ background: C.paper, borderBottom: `1px solid ${C.line}` }}>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold" style={{ fontFamily: SERIF, color: C.ink }}>
              Mi <Hi on>cuaderno</Hi>
            </div>
            <div className="text-xs mt-1" style={{ color: C.mut }}>Spanish notebook · prototype</div>
          </div>
          <div className="text-right text-xs" style={{ fontFamily: MONO, color: C.mut }}>
            {data.entries.length} words<br />{data.entries.filter((e) => e.struggling).length} tricky
          </div>
        </div>
        {tab === "words" && !selected && (
          <>
            <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 border" style={{ background: C.card, borderColor: C.line }}>
              <Search size={16} style={{ color: C.mut }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search words, notes, examples…"
                className="flex-1 bg-transparent outline-none text-sm" style={{ color: C.ink }} />
              {q && <X size={14} style={{ color: C.mut }} onClick={() => setQ("")} />}
            </div>
            {allTags.length > 0 && (
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                <Chip active={!tagFilter} onClick={() => setTagFilter(null)}>all</Chip>
                {allTags.map((t) => (
                  <Chip key={t} active={tagFilter === t} onClick={() => setTagFilter(tagFilter === t ? null : t)}>{t}</Chip>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  function renderCard(e) {
    return (
      <button key={e.id} onClick={() => openEntry(e.id)}
        className="w-full text-left rounded-xl border px-4 py-3 active:opacity-80"
        style={{ background: C.card, borderColor: C.line }}>
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-lg" style={{ fontFamily: SERIF, color: C.ink, fontWeight: 700 }}>
            <Hi on={e.struggling}>{e.term}</Hi>
            {POS_ABBR[e.partOfSpeech] && <span className="italic font-normal text-sm ml-2" style={{ color: C.mut }}>{POS_ABBR[e.partOfSpeech]}</span>}
          </div>
          {(viewCounts[e.id] || 0) > 0 && (
            <span className="text-xs shrink-0" style={{ fontFamily: MONO, color: C.mut }}>×{viewCounts[e.id]}</span>
          )}
        </div>
        <div className="text-sm mt-0.5" style={{ color: C.ink }}>— {e.translation}</div>
        {(e.tags || []).length > 0 && (
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {e.tags.map((t) => <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: C.penPale, color: C.penDark }}>{t}</span>)}
          </div>
        )}
      </button>
    );
  }

  function renderList() {
    return (
      <div className="px-4 py-4 space-y-2.5" style={dotGrid}>
        {filtered.length === 0 && (
          <div className="text-sm text-center py-16" style={{ color: C.mut }}>
            {data.entries.length === 0 ? "No words yet. Add your first with the + button." : "Nothing matches. Try another search or tag."}
          </div>
        )}
        {filtered.map(renderCard)}
        <div className="h-24" />
      </div>
    );
  }

  function renderDetail() {
    const e = selected;
    const others = data.entries.filter((x) => x.id !== e.id && !e.linkedIds.includes(x.id));
    return (
      <div className="px-4 py-4" style={dotGrid}>
        <button onClick={() => setSelectedId(null)} className="flex items-center gap-1 text-sm mb-3" style={{ color: C.pen }}>
          <ChevronLeft size={16} /> All words
        </button>

        <div className="rounded-2xl border p-4" style={{ background: C.card, borderColor: C.line }}>
          <div className="text-2xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
            <Hi on={e.struggling}>{e.term}</Hi>
            {POS_ABBR[e.partOfSpeech] && <span className="italic font-normal text-base ml-2" style={{ color: C.mut }}>{POS_ABBR[e.partOfSpeech]}</span>}
          </div>
          <div className="mt-1" style={{ color: C.ink }}>— {e.translation}</div>
          <div className="mt-3 flex items-center gap-4 text-xs" style={{ fontFamily: MONO, color: C.mut }}>
            <span className="inline-flex items-center gap-1"><Eye size={12} /> {viewCounts[e.id] || 0} lookups</span>
            {lastViewed[e.id] && <span className="inline-flex items-center gap-1"><Clock size={12} /> {timeAgo(lastViewed[e.id])}</span>}
          </div>
          <button onClick={() => toggleTricky(e)}
            className="mt-3 inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border font-medium"
            style={e.struggling
              ? { background: C.hi, borderColor: "#E3C93A", color: "#5B4E08" }
              : { background: C.card, borderColor: C.line, color: C.mut }}>
            <Highlighter size={15} /> {e.struggling ? "Marked tricky" : "Highlight as tricky"}
          </button>
        </div>

        <SectionTitle>Notes</SectionTitle>
        <div className="rounded-xl border p-3" style={{ background: C.card, borderColor: C.line }}>
          <textarea value={noteDraft}
            onChange={(ev) => { setNoteDraft(ev.target.value); setNoteDirty(true); }}
            placeholder="Your notes — mnemonics, gotchas, where you heard it…"
            className="w-full bg-transparent outline-none text-sm min-h-24 resize-y" style={{ color: C.ink }} />
          {noteDirty && (
            <button onClick={() => { patchEntry(e.id, { notes: noteDraft }); setNoteDirty(false); }}
              className="mt-1 text-sm px-3 py-1.5 rounded-lg text-white font-medium" style={{ background: C.pen }}>
              Save note
            </button>
          )}
        </div>

        <SectionTitle>Tags</SectionTitle>
        <div className="flex flex-wrap gap-1.5 items-center">
          {(e.tags || []).map((t) => (
            <Chip key={t} onRemove={() => patchEntry(e.id, { tags: e.tags.filter((x) => x !== t) })}>{t}</Chip>
          ))}
          <div className="flex items-center gap-1">
            <input value={tagAdd} onChange={(ev) => setTagAdd(ev.target.value)} placeholder="new tag"
              className="text-xs px-2 py-1 rounded-full border outline-none w-24"
              style={{ background: C.card, borderColor: C.line, color: C.ink }} />
            <button onClick={() => { const t = tagAdd.trim(); if (t && !e.tags.includes(t)) patchEntry(e.id, { tags: [...e.tags, t] }); setTagAdd(""); }}
              className="text-xs px-2 py-1 rounded-full text-white" style={{ background: C.pen }}>Add</button>
          </div>
        </div>

        <SectionTitle>My examples</SectionTitle>
        <div className="space-y-2">
          {(e.examples || []).map((x, i) => (
            <div key={i} className="rounded-xl border p-3 flex justify-between gap-2" style={{ background: C.card, borderColor: C.line }}>
              <div>
                <div style={{ fontFamily: SERIF, color: C.ink }}>{x.es}</div>
                {x.en && <div className="text-xs mt-0.5" style={{ color: C.mut }}>{x.en}</div>}
              </div>
              <X size={14} className="shrink-0 mt-1" style={{ color: C.mut }}
                onClick={() => patchEntry(e.id, { examples: e.examples.filter((_, j) => j !== i) })} />
            </div>
          ))}
          <div className="rounded-xl border p-3 space-y-2" style={{ background: C.card, borderColor: C.line }}>
            <input value={exEs} onChange={(ev) => setExEs(ev.target.value)} placeholder="Sentence in Spanish"
              className="w-full text-sm bg-transparent outline-none" style={{ color: C.ink }} />
            <input value={exEn} onChange={(ev) => setExEn(ev.target.value)} placeholder="English (optional)"
              className="w-full text-sm bg-transparent outline-none border-t pt-2" style={{ color: C.ink, borderColor: C.line }} />
            <button onClick={() => { if (exEs.trim()) { patchEntry(e.id, { examples: [...e.examples, { es: exEs.trim(), en: exEn.trim() }] }); setExEs(""); setExEn(""); } }}
              className="text-sm px-3 py-1.5 rounded-lg text-white font-medium" style={{ background: C.pen }}>Add example</button>
          </div>
        </div>

        <SectionTitle>Media links</SectionTitle>
        <div className="space-y-2">
          {(e.mediaLinks || []).map((m, i) => (
            <div key={i} className="rounded-xl border p-3 flex items-center justify-between gap-2" style={{ background: C.card, borderColor: C.line }}>
              <a href={m.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm underline underline-offset-2" style={{ color: C.pen }}>
                <ExternalLink size={14} /> {m.label || m.url}
              </a>
              <X size={14} style={{ color: C.mut }} onClick={() => patchEntry(e.id, { mediaLinks: e.mediaLinks.filter((_, j) => j !== i) })} />
            </div>
          ))}
          <div className="rounded-xl border p-3 space-y-2" style={{ background: C.card, borderColor: C.line }}>
            <input value={mUrl} onChange={(ev) => setMUrl(ev.target.value)} placeholder="https:// link to video, image, article…"
              className="w-full text-sm bg-transparent outline-none" style={{ color: C.ink }} />
            <input value={mLabel} onChange={(ev) => setMLabel(ev.target.value)} placeholder="Label (optional)"
              className="w-full text-sm bg-transparent outline-none border-t pt-2" style={{ color: C.ink, borderColor: C.line }} />
            <button onClick={() => { const u = mUrl.trim(); if (/^https?:\/\//.test(u)) { patchEntry(e.id, { mediaLinks: [...e.mediaLinks, { url: u, label: mLabel.trim() }] }); setMUrl(""); setMLabel(""); } }}
              className="text-sm px-3 py-1.5 rounded-lg text-white font-medium" style={{ background: C.pen }}>Add link</button>
          </div>
        </div>

        <SectionTitle>Linked words</SectionTitle>
        <div className="flex flex-wrap gap-1.5 items-center">
          {(e.linkedIds || []).map((lid) => {
            const t = data.entries.find((x) => x.id === lid);
            if (!t) return null;
            return (
              <Chip key={lid} onClick={() => openEntry(lid)} onRemove={() => unlinkEntries(e.id, lid)}>
                <Link2 size={11} /> {t.term}
              </Chip>
            );
          })}
          {others.length > 0 && (
            <div className="flex items-center gap-1">
              <select value={linkPick} onChange={(ev) => setLinkPick(ev.target.value)}
                className="text-xs px-2 py-1 rounded-full border outline-none max-w-40"
                style={{ background: C.card, borderColor: C.line, color: C.ink }}>
                <option value="">link a word…</option>
                {others.map((o) => <option key={o.id} value={o.id}>{o.term}</option>)}
              </select>
              <button onClick={() => { if (linkPick) { linkEntries(e.id, linkPick); setLinkPick(""); } }}
                className="text-xs px-2 py-1 rounded-full text-white" style={{ background: C.pen }}>Link</button>
            </div>
          )}
        </div>

        <div className="mt-8 mb-24">
          <button
            onClick={() => { if (deleteArm) deleteEntry(e.id); else { setDeleteArm(true); setTimeout(() => setDeleteArm(false), 3000); } }}
            className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border font-medium"
            style={deleteArm ? { background: C.red, borderColor: C.red, color: "#fff" } : { background: C.card, borderColor: "#E5C4BC", color: C.red }}>
            <Trash2 size={14} /> {deleteArm ? "Tap again to confirm" : "Delete word"}
          </button>
        </div>
      </div>
    );
  }

  function renderReview() {
    const tricky = data.entries.filter((e) => e.struggling);
    const top = [...data.entries].map((e) => ({ e, n: viewCounts[e.id] || 0 }))
      .filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 5);
    const recent = [...(data.events || [])].slice(-12).reverse();
    const totalLookups = Object.values(viewCounts).reduce((a, b) => a + b, 0);
    return (
      <div className="px-4 py-4" style={dotGrid}>
        <div className="grid grid-cols-3 gap-2">
          {[["Words", data.entries.length], ["Lookups", totalLookups], ["Tricky", tricky.length]].map(([label, n]) => (
            <div key={label} className="rounded-xl border p-3 text-center" style={{ background: C.card, borderColor: C.line }}>
              <div className="text-xl font-semibold" style={{ fontFamily: MONO, color: C.ink }}>{n}</div>
              <div className="text-xs" style={{ color: C.mut }}>{label}</div>
            </div>
          ))}
        </div>

        <SectionTitle>Tricky words</SectionTitle>
        {tricky.length === 0 ? (
          <div className="text-sm rounded-xl border p-4" style={{ background: C.card, borderColor: C.line, color: C.mut }}>
            Nothing highlighted yet. Use the highlighter on any word you keep forgetting.
          </div>
        ) : (
          <div className="space-y-2">{tricky.map(renderCard)}</div>
        )}

        <SectionTitle>Most looked up</SectionTitle>
        {top.length === 0 ? (
          <div className="text-sm rounded-xl border p-4" style={{ background: C.card, borderColor: C.line, color: C.mut }}>
            Lookup counts will appear as you use the notebook.
          </div>
        ) : (
          <div className="rounded-xl border divide-y" style={{ background: C.card, borderColor: C.line }}>
            {top.map(({ e, n }) => (
              <button key={e.id} onClick={() => openEntry(e.id)} className="w-full flex justify-between items-center px-4 py-2.5 text-left">
                <span style={{ fontFamily: SERIF, fontWeight: 600, color: C.ink }}><Hi on={e.struggling}>{e.term}</Hi></span>
                <span className="text-xs" style={{ fontFamily: MONO, color: C.mut }}>×{n}</span>
              </button>
            ))}
          </div>
        )}

        <SectionTitle>Recent activity</SectionTitle>
        <div className="rounded-xl border divide-y mb-24" style={{ background: C.card, borderColor: C.line }}>
          {recent.length === 0 && <div className="px-4 py-3 text-sm" style={{ color: C.mut }}>No activity yet.</div>}
          {recent.map((ev) => {
            const t = data.entries.find((x) => x.id === ev.entryId);
            return (
              <div key={ev.id} className="px-4 py-2.5 flex justify-between items-baseline gap-3 text-sm">
                <span style={{ color: C.ink }}>
                  {EVENT_LABEL[ev.type] || ev.type} <span style={{ fontFamily: SERIF, fontWeight: 600 }}>{t ? t.term : "(deleted)"}</span>
                </span>
                <span className="text-xs shrink-0" style={{ fontFamily: MONO, color: C.mut }}>{timeAgo(ev.at)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderAssistant() {
    return (
      <div className="flex flex-col" style={{ minHeight: "calc(100vh - 170px)" }}>
        <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto" style={dotGrid}>
          {msgs.length === 0 && (
            <div className="rounded-2xl border p-4 text-sm space-y-2" style={{ background: C.card, borderColor: C.line, color: C.ink }}>
              <div className="flex items-center gap-2 font-semibold"><Sparkles size={16} style={{ color: C.pen }} /> Asistente</div>
              <p>I can read your notebook — words, notes, tags, and your lookup history — so ask me anything about it, or have me draft new entries for your approval.</p>
              <p style={{ color: C.mut }}>Try: “Why do I keep forgetting my tricky words?” or “Add 3 phrases for ordering coffee.”</p>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap border"
                style={m.role === "user"
                  ? { background: C.pen, color: "#fff", borderColor: C.pen }
                  : { background: C.card, color: C.ink, borderColor: C.line }}>
                {m.text}
                {(m.proposals || []).map((p) => {
                  const added = addedProposals[p.pid];
                  return (
                    <div key={p.pid} className="mt-2 rounded-xl p-3 border-2 border-dashed" style={{ borderColor: added ? "#9DB89F" : C.pen, background: C.paper }}>
                      <div style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
                        {p.term} {POS_ABBR[p.partOfSpeech] && <span className="italic font-normal text-sm" style={{ color: C.mut }}>{POS_ABBR[p.partOfSpeech]}</span>}
                      </div>
                      <div className="text-sm" style={{ color: C.ink }}>— {p.translation}</div>
                      {p.notes && <div className="text-xs mt-1" style={{ color: C.mut }}>{p.notes}</div>}
                      {p.tags.length > 0 && (
                        <div className="mt-1.5 flex gap-1 flex-wrap">
                          {p.tags.map((t) => <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: C.penPale, color: C.penDark }}>{t}</span>)}
                        </div>
                      )}
                      <button disabled={!!added} onClick={() => approveProposal(p)}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium"
                        style={added ? { background: "#EAF2EA", color: "#3E6B44" } : { background: C.pen, color: "#fff" }}>
                        <Check size={13} /> {added ? "Added to cuaderno" : "Approve & add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {aiBusy && (
            <div className="flex items-center gap-2 text-sm" style={{ color: C.mut }}>
              <Loader2 size={14} className="animate-spin" /> Pensando…
            </div>
          )}
          <div className="h-2" />
        </div>
        <div className="sticky bottom-16 px-4 pb-2 pt-1" style={{ background: C.paper }}>
          <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ background: C.card, borderColor: C.line }}>
            <input value={aiInput} onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendToAssistant(); }}
              placeholder="Ask about your words…" className="flex-1 bg-transparent outline-none text-sm" style={{ color: C.ink }} />
            <button onClick={sendToAssistant} disabled={aiBusy || !aiInput.trim()} aria-label="Send"
              className="p-1.5 rounded-lg" style={{ background: aiInput.trim() && !aiBusy ? C.pen : C.line, color: "#fff" }}>
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderAddSheet() {
    return (
      <div className="fixed inset-0 z-40 flex items-end justify-center" style={{ background: "rgba(33,42,61,0.35)" }}
        onClick={() => setShowAdd(false)}>
        <div className="w-full max-w-md rounded-t-2xl p-4 pb-6 space-y-3" style={{ background: C.paper }} onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center">
            <div className="font-semibold" style={{ fontFamily: SERIF, color: C.ink, fontSize: 18 }}>New word or phrase</div>
            <button onClick={() => setShowAdd(false)} aria-label="Close"><X size={18} style={{ color: C.mut }} /></button>
          </div>
          <input value={fTerm} onChange={(e) => setFTerm(e.target.value)} placeholder="Spanish term *"
            className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none" style={{ background: C.card, borderColor: C.line, color: C.ink, fontFamily: SERIF }} />
          <input value={fTr} onChange={(e) => setFTr(e.target.value)} placeholder="English translation *"
            className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none" style={{ background: C.card, borderColor: C.line, color: C.ink }} />
          <div className="flex gap-2">
            <select value={fPos} onChange={(e) => setFPos(e.target.value)}
              className="text-sm rounded-xl border px-3 py-2.5 outline-none" style={{ background: C.card, borderColor: C.line, color: C.ink }}>
              {POS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input value={fTags} onChange={(e) => setFTags(e.target.value)} placeholder="tags, comma separated"
              className="flex-1 text-sm rounded-xl border px-3 py-2.5 outline-none" style={{ background: C.card, borderColor: C.line, color: C.ink }} />
          </div>
          <textarea value={fNote} onChange={(e) => setFNote(e.target.value)} placeholder="First note (optional)"
            className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none min-h-16" style={{ background: C.card, borderColor: C.line, color: C.ink }} />
          <button
            onClick={() => {
              if (!fTerm.trim() || !fTr.trim()) return;
              const entry = addEntry({ term: fTerm, translation: fTr, partOfSpeech: fPos, tags: fTags.split(","), notes: fNote.trim() });
              setShowAdd(false); setFTerm(""); setFTr(""); setFTags(""); setFNote(""); setFPos("phrase");
              openEntry(entry.id, { log: false });
            }}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm"
            style={{ background: fTerm.trim() && fTr.trim() ? C.pen : "#B9C2D8" }}>
            Add word
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "words", label: "Palabras", icon: BookOpen },
    { id: "review", label: "Repaso", icon: BarChart3 },
    { id: "ai", label: "Asistente", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen" style={{ background: C.paper, color: C.ink }}>
      <div className="max-w-md mx-auto min-h-screen relative" style={{ background: C.paper }}>
        {banner && (
          <div className="px-4 py-2 text-xs" style={{ background: "#FBEFEC", color: C.red }}>{banner}</div>
        )}
        {renderHeader()}

        {tab === "words" && (selected ? renderDetail() : renderList())}
        {tab === "review" && renderReview()}
        {tab === "ai" && renderAssistant()}

        {tab === "words" && !selected && (
          <button onClick={() => setShowAdd(true)} aria-label="Add word"
            className="fixed z-30 rounded-full p-4 shadow-lg"
            style={{ background: C.pen, color: "#fff", bottom: 84, right: "max(16px, calc(50% - 208px))" }}>
            <Plus size={22} />
          </button>
        )}

        <div className="fixed bottom-0 inset-x-0 z-30">
          <div className="max-w-md mx-auto flex border-t" style={{ background: C.card, borderColor: C.line }}>
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => { setTab(t.id); if (t.id !== "words") setSelectedId(null); }}
                  className="flex-1 py-2.5 flex flex-col items-center gap-0.5">
                  <Icon size={19} style={{ color: active ? C.pen : C.mut }} />
                  <span className="text-[11px]" style={{ color: active ? C.pen : C.mut, fontWeight: active ? 600 : 400 }}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {showAdd && renderAddSheet()}
      </div>
    </div>
  );
}
