import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BookmarkPlus, Check, Loader2, Square, X } from "lucide-react";
import { C, MONO, Button, Card } from "../theme.jsx";
import { getPref } from "../db/db.js";
import { createItemsWithLinks } from "../db/items.js";
import { AI_API_KEY_PREF } from "../lib/aiPrefs.js";
import { conversationText, requestKeepProposals } from "../lib/aiKeep.js";
import { formatCost } from "../lib/aiRequest.js";
import { findPersonalHeadingDuplicates } from "../lib/duplicateGuard.js";
import { findKeepCandidates } from "../lib/keepCandidates.js";
import {
  buildKeepWrites,
  defaultKeepSelection,
  linkIsAvailable,
  normalizeKeepProposals,
} from "../lib/keepProposals.js";
import { relationshipLabel } from "../lib/relationships.js";
import { allTagsIn } from "../lib/tags.js";

/**
 * Keep: a conversation becomes proposed notebook entries, which the owner ticks and applies.
 *
 * confirm → loading → review → applying → saved (refreshing) → applied. Nothing is sent before
 * the confirmation, which names exactly what leaves the device; nothing is saved before Apply.
 * Once Apply commits, the batch can never be applied again — a failed refresh offers a refresh,
 * not a second save. A paid response is never cleared by an error.
 */

const SKIP_REASONS = {
  target_deleted: "the existing entry was deleted meanwhile",
  already_connected: "they were already connected",
};

export default function KeepReview({ source, notebook, onSelect, onClose, onApplied }) {
  // What the confirmation discloses is fixed when Keep opens, so what is sent matches it.
  const [disclosed] = useState(() => {
    const items = notebook.items || [];
    return {
      characters: conversationText(source).length,
      tagNames: allTagsIn(items),
      candidates: findKeepCandidates(items, conversationText(source)),
    };
  });
  const [phase, setPhase] = useState("confirm");
  const [error, setError] = useState("");
  const [response, setResponse] = useState(null);
  const [selection, setSelection] = useState(null);
  const [saved, setSaved] = useState(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const abortRef = useRef(null);
  const mountedRef = useRef(false);
  const committedRef = useRef(false);
  // The latest notebook, so proposals arriving after a wait are checked against current entries.
  const itemsRef = useRef(notebook.items || []);
  itemsRef.current = notebook.items || [];

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  async function send() {
    setError("");
    setPhase("loading");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const apiKey = await getPref(AI_API_KEY_PREF);
      const result = await requestKeepProposals({
        source,
        tagNames: disclosed.tagNames,
        candidates: disclosed.candidates,
        apiKey,
        signal: controller.signal,
      });
      if (!mountedRef.current || controller.signal.aborted) return;
      const proposals = normalizeKeepProposals(result.proposals, {
        candidates: disclosed.candidates,
        items: itemsRef.current,
      });
      setResponse({ ...result, proposals });
      setSelection(defaultKeepSelection(proposals));
      setPhase("review");
    } catch (err) {
      if (!mountedRef.current) return;
      if (err?.name === "AbortError") {
        setPhase("confirm");
        return;
      }
      setError(err?.message || "Something went wrong talking to Anthropic.");
      setPhase("confirm");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  async function refresh() {
    setError("");
    const result = await notebook.reload();
    if (!mountedRef.current || result?.status === "cancelled") return;
    if (result?.status === "failed") {
      setError("Saved — but the notebook couldn't refresh, so the new entries can't be opened yet.");
      return;
    }
    setPhase("applied");
  }

  async function apply() {
    if (committedRef.current || phase !== "review") return;
    const writes = buildKeepWrites(response.proposals, selection);
    if (writes.items.length === 0) return;
    setError("");
    setPhase("applying");
    let result;
    try {
      result = await createItemsWithLinks({ items: writes.items, links: writes.links });
    } catch {
      if (mountedRef.current) {
        setError("Couldn't save — nothing was changed. Your selections are still here; try again.");
        setPhase("review");
      }
      return;
    }
    committedRef.current = true;
    const created = writes.items.map((item) => ({ id: item.id, term: item.term }));
    onApplied?.();
    if (!mountedRef.current) {
      // The save committed even though this screen went away (AI turned off, say): the notebook
      // still has to show the new entries.
      notebook.reload();
      return;
    }
    setSaved({ created, skipped: result.skipped, linked: result.linked.length });
    setPhase("saved");
    await refresh();
  }

  function discard() {
    if (phase === "review" && !confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }

  if (phase === "confirm" || phase === "loading") {
    return (
      <Card aria-label="Keep" className="mt-4">
        <div className="text-sm font-semibold" style={{ color: C.ink }}>Keep</div>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: C.ink }}>
          Claude will propose entries for your cuaderno. You choose what to save.
        </p>
        <div className="mt-2 text-xs leading-relaxed" style={{ color: C.mut }}>
          Sent to Anthropic: {source.kind === "paste" ? "the pasted conversation" : "this conversation"}{" "}
          (≈ {disclosed.characters.toLocaleString("en-US")} characters), your{" "}
          {disclosed.tagNames.length} tag {disclosed.tagNames.length === 1 ? "name" : "names"}, and{" "}
          {disclosed.candidates.length === 0
            ? "none of your entries (none seem related)."
            : `${disclosed.candidates.length} related ${disclosed.candidates.length === 1 ? "entry" : "entries"} from your cuaderno (term and first meaning only).`}
        </div>
        {disclosed.candidates.length > 0 && (
          <details className="mt-2 text-xs" style={{ color: C.mut }}>
            <summary className="cursor-pointer">Show the entries that will be sent</summary>
            <ul className="mt-1 space-y-0.5 pl-4 list-disc">
              {disclosed.candidates.map((candidate) => (
                <li key={candidate.ref}>
                  {candidate.term}{candidate.gloss ? ` — ${candidate.gloss}` : ""}
                </li>
              ))}
            </ul>
          </details>
        )}
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="mt-3 flex flex-wrap gap-2">
          {phase === "loading" ? (
            <>
              <span className="inline-flex items-center gap-2 text-sm" style={{ color: C.mut }}>
                <Loader2 size={16} className="animate-spin" /> Claude is choosing what to keep…
              </span>
              <Button tone="quiet" onClick={() => abortRef.current?.abort()}>
                <Square size={13} /> Stop
              </Button>
            </>
          ) : (
            <>
              <Button onClick={send}>
                <BookmarkPlus size={15} /> {error ? "Try again" : "Send and propose"}
              </Button>
              <Button tone="quiet" onClick={onClose}>
                <X size={15} /> Cancel
              </Button>
            </>
          )}
        </div>
      </Card>
    );
  }

  if (phase === "saved" || phase === "applied") {
    return (
      <Card aria-label="Keep" className="mt-4">
        <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: C.green }}>
          <Check size={15} /> Saved {saved.created.length} {saved.created.length === 1 ? "entry" : "entries"}
          {saved.linked > 0 && ` and ${saved.linked} ${saved.linked === 1 ? "connection" : "connections"}`}
        </div>
        <ul className="mt-2 space-y-1.5">
          {saved.created.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-2 text-sm">
              <span style={{ color: C.ink }}>{entry.term}</span>
              <Button tone="quiet" disabled={phase !== "applied"} onClick={() => onSelect(entry.id)} aria-label={`Open ${entry.term}`}>
                Open
              </Button>
            </li>
          ))}
        </ul>
        {saved.skipped.length > 0 && (
          <div className="mt-2 text-xs leading-relaxed" style={{ color: C.mut }}>
            {saved.skipped.length === 1 ? "One connection was" : `${saved.skipped.length} connections were`} not
            saved: {[...new Set(saved.skipped.map((link) => SKIP_REASONS[link.reason] || link.reason))].join("; ")}.
          </div>
        )}
        {phase === "saved" && !error && (
          <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: C.mut }}>
            <Loader2 size={13} className="animate-spin" /> Refreshing your cuaderno…
          </div>
        )}
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="mt-3 flex flex-wrap gap-2">
          {phase === "saved" && error && (
            <Button tone="quiet" onClick={refresh}>Refresh</Button>
          )}
          <Button tone="quiet" onClick={onClose}>Done</Button>
        </div>
      </Card>
    );
  }

  return (
    <ProposalReview
      response={response}
      selection={selection}
      setSelection={setSelection}
      items={notebook.items || []}
      applying={phase === "applying"}
      error={error}
      confirmDiscard={confirmDiscard}
      onApply={apply}
      onDiscard={discard}
      onSelect={onSelect}
    />
  );
}

function ErrorNote({ children }) {
  return (
    <div role="alert" className="mt-3 text-xs rounded-lg p-2.5 flex items-start gap-1.5" style={{ background: C.redPale, color: C.red }}>
      <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {children}
    </div>
  );
}

function ProposalReview({
  response, selection, setSelection, items, applying, error, confirmDiscard, onApply, onDiscard, onSelect,
}) {
  const { proposals } = response;
  // Re-derived from the live notebook, so an entry saved elsewhere meanwhile is still flagged.
  const liveDuplicates = useMemo(() => new Map(proposals.entries.map((entry) => [
    entry.ref,
    findPersonalHeadingDuplicates(items, "lexical", entry.term),
  ])), [items, proposals.entries]);
  const termByRef = new Map(proposals.entries.map((entry) => [entry.ref, entry.term]));

  // An entry that becomes a duplicate while the review is open (saved elsewhere meanwhile) is
  // unticked once, like one flagged from the start; the owner may tick it again deliberately.
  const reconciledRef = useRef(null);
  if (reconciledRef.current === null) {
    reconciledRef.current = new Set(proposals.entries.filter((entry) => !entry.defaultSelected).map((entry) => entry.ref));
  }
  useEffect(() => {
    const newlyDuplicate = proposals.entries
      .filter((entry) => (liveDuplicates.get(entry.ref) || []).length > 0 && !reconciledRef.current.has(entry.ref))
      .map((entry) => entry.ref);
    if (newlyDuplicate.length === 0) return;
    for (const ref of newlyDuplicate) reconciledRef.current.add(ref);
    setSelection((current) => ({
      ...current,
      entries: Object.fromEntries(Object.entries(current.entries).map(([ref, choice]) => [
        ref,
        newlyDuplicate.includes(ref) ? { ...choice, selected: false } : choice,
      ])),
    }));
  }, [liveDuplicates, proposals.entries, setSelection]);

  const selectedEntries = proposals.entries.filter((entry) => selection.entries[entry.ref]?.selected);
  const selectedLinks = proposals.links.filter((link) => selection.links[link.id] && linkIsAvailable(link, selection));

  function toggleEntry(ref) {
    setSelection((current) => ({
      ...current,
      entries: { ...current.entries, [ref]: { ...current.entries[ref], selected: !current.entries[ref].selected } },
    }));
  }

  function toggleTag(ref, name) {
    setSelection((current) => {
      const tags = current.entries[ref].tags;
      return {
        ...current,
        entries: {
          ...current.entries,
          [ref]: { ...current.entries[ref], tags: tags.includes(name) ? tags.filter((tag) => tag !== name) : [...tags, name] },
        },
      };
    });
  }

  function toggleLink(id) {
    setSelection((current) => ({ ...current, links: { ...current.links, [id]: !current.links[id] } }));
  }

  const meta = [formatCost(response.cost), response.fallback ? "answered by a fallback model" : ""].filter(Boolean);

  return (
    <section aria-label="Keep proposals" className="mt-4 space-y-3">
      <div>
        <div className="text-sm font-semibold" style={{ color: C.ink }}>Proposed for your cuaderno</div>
        {proposals.summary && <p className="mt-1 text-sm" style={{ color: C.mut }}>{proposals.summary}</p>}
        {meta.length > 0 && (
          <div className="mt-1 text-[11px]" style={{ fontFamily: MONO, color: C.mut }}>{meta.join(" · ")}</div>
        )}
      </div>

      {proposals.entries.length === 0 && (
        <Card><p className="text-sm" style={{ color: C.mut }}>Claude found nothing new worth keeping here.</p></Card>
      )}

      {proposals.entries.map((entry) => {
        const choice = selection.entries[entry.ref];
        const duplicates = liveDuplicates.get(entry.ref) || [];
        return (
          <Card key={entry.ref} aria-label={`Proposal: ${entry.term}`} style={choice.selected ? {} : { opacity: 0.75 }}>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1 shrink-0"
                checked={choice.selected}
                disabled={applying}
                onChange={() => toggleEntry(entry.ref)}
                aria-label={`Keep ${entry.term}`}
              />
              <span className="min-w-0">
                <span className="font-semibold" style={{ color: C.ink }}>{entry.term}</span>{" "}
                <span className="text-xs" style={{ color: C.mut }}>{entry.form}</span>
                <span className="block text-sm" style={{ color: C.ink }}>{entry.meaning.gloss}</span>
              </span>
            </label>
            {duplicates.length > 0 && (
              <div className="mt-2 flex items-center justify-between gap-2 text-xs rounded-lg p-2" style={{ background: C.amberPale, color: C.amber }}>
                <span>Already in your cuaderno.</span>
                <Button tone="quiet" onClick={() => onSelect(duplicates[0].id)} aria-label={`Open the existing ${entry.term}`}>
                  Open
                </Button>
              </div>
            )}
            {entry.batchDuplicateOf && (
              <div className="mt-2 text-xs" style={{ color: C.amber }}>
                Repeats {termByRef.get(entry.batchDuplicateOf)} above.
              </div>
            )}
            <div className="mt-2 space-y-1 text-xs leading-relaxed" style={{ color: C.mut }}>
              {(entry.meaning.usageCue || entry.meaning.usageLabels.length > 0) && (
                <div>{[entry.meaning.usageLabels.join(", "), entry.meaning.usageCue].filter(Boolean).join(" — ")}</div>
              )}
              {entry.meaning.examples.map((example, index) => (
                <div key={index}>
                  <span style={{ color: C.ink }}>{example.es}</span>{example.en ? ` — ${example.en}` : ""}
                </div>
              ))}
              {entry.note && <div>Note: {entry.note}</div>}
              {entry.reason && <div className="italic">{entry.reason}</div>}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {entry.tags.map((tag) => {
                const on = choice.tags.includes(tag.name);
                return (
                  <button
                    key={tag.name}
                    type="button"
                    aria-pressed={on}
                    disabled={applying}
                    onClick={() => toggleTag(entry.ref, tag.name)}
                    aria-label={`Tag ${tag.name}${tag.provenance ? " (marks it as from Claude)" : ""}`}
                    className="text-xs px-2 py-0.5 rounded-full border"
                    style={on
                      ? { background: C.pen, color: C.onAccent, borderColor: C.pen }
                      : { background: C.card, color: C.mut, borderColor: C.line, textDecoration: "line-through" }}
                  >
                    #{tag.name}{tag.isNew ? " · new" : ""}
                  </button>
                );
              })}
            </div>
          </Card>
        );
      })}

      {proposals.links.length > 0 && (
        <Card aria-label="Proposed connections">
          <div className="text-xs font-semibold uppercase" style={{ color: C.mut, letterSpacing: "0.08em" }}>
            Connections
          </div>
          <ul className="mt-2 space-y-2">
            {proposals.links.map((link) => {
              const available = linkIsAvailable(link, selection);
              const missing = [link.from, link.to].find((end) => end.kind === "new" && !selection.entries[end.ref]?.selected);
              const label = relationshipLabel({ type: link.type, subject: "owner" }, "owner");
              const name = (end) => (end.kind === "existing" ? `${end.term} (in your cuaderno)` : end.term);
              return (
                <li key={link.id}>
                  <label className="flex items-start gap-2 text-sm" style={{ color: available ? C.ink : C.mut }}>
                    <input
                      type="checkbox"
                      className="mt-1 shrink-0"
                      checked={available && Boolean(selection.links[link.id])}
                      disabled={!available || applying}
                      onChange={() => toggleLink(link.id)}
                      aria-label={`Connect ${link.from.term} and ${link.to.term}`}
                    />
                    <span>
                      {name(link.from)} — <span style={{ fontFamily: MONO }}>{label}</span> — {name(link.to)}
                      {!available && missing && (
                        <span className="block text-xs">Needs {missing.term} ticked.</span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {proposals.droppedCount > 0 && (
        <div className="text-xs" style={{ color: C.mut }}>
          {proposals.droppedCount === 1 ? "One suggestion was" : `${proposals.droppedCount} suggestions were`} left out
          because the app couldn't use {proposals.droppedCount === 1 ? "it" : "them"} (blank, repeated or unconnectable).
        </div>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex flex-wrap gap-2">
        <Button onClick={onApply} disabled={applying || selectedEntries.length === 0}>
          {applying ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {applying
            ? "Saving…"
            : `Apply ${selectedEntries.length} ${selectedEntries.length === 1 ? "entry" : "entries"}${
              selectedLinks.length > 0 ? `, ${selectedLinks.length} ${selectedLinks.length === 1 ? "connection" : "connections"}` : ""}`}
        </Button>
        <Button tone={confirmDiscard ? "dangerArmed" : "quiet"} onClick={onDiscard} disabled={applying}>
          <X size={15} /> {confirmDiscard ? "Tap again to discard" : "Discard"}
        </Button>
      </div>
    </section>
  );
}
