import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BookmarkPlus, Check, Loader2, Square, X } from "lucide-react";
import { C, MONO, Button, Card } from "../theme.jsx";
import MarkdownText from "./MarkdownText.jsx";
import { getPref } from "../db/db.js";
import { applyKeep } from "../db/items.js";
import { AI_API_KEY_PREF } from "../lib/aiPrefs.js";
import { attachedGroupMembers, attachedItemIds, conversationText, requestKeepProposals } from "../lib/aiKeep.js";
import { formatCost } from "../lib/aiRequest.js";
import { findPersonalHeadingDuplicates } from "../lib/duplicateGuard.js";
import { findKeepCandidates, selectGroupMembers } from "../lib/keepCandidates.js";
import { keepAttachedSnapshots } from "../lib/keepAttached.js";
import {
  buildKeepWrites,
  defaultKeepSelection,
  linkIsAvailable,
  normalizeKeepProposals,
} from "../lib/keepProposals.js";
import { contentFingerprint } from "../lib/contentFingerprint.js";
import { relationshipLabel } from "../lib/relationships.js";
import { allTagsIn } from "../lib/tags.js";

/**
 * Keep: a conversation becomes proposed notebook entries and additions to attached entries,
 * which the owner ticks and applies.
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

const UPDATE_SKIP_REASONS = {
  entry_changed: "you changed it after Claude saw it",
  entry_deleted: "it was deleted meanwhile",
};

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

/** An entry changed (or gone) since Keep froze it can no longer take its additions. */
const isStale = (update, itemsById) => {
  const item = itemsById.get(update.itemId);
  return !item || contentFingerprint(item) !== update.fingerprint;
};

export default function KeepReview({ source, notebook, onSelect, onClose, onApplied }) {
  // What the confirmation discloses is fixed when Keep opens, so what is sent matches it.
  const [disclosed] = useState(() => {
    const items = notebook.items || [];
    const attachedIds = attachedItemIds(source);
    const groupMembers = attachedGroupMembers(source);
    // Members of attached groups, first sent first, up to Keep's own limit for them.
    const group = selectGroupMembers(items, groupMembers, attachedIds);
    // Entries attached to the conversation lead, so proposals link to them.
    const candidates = findKeepCandidates(items, conversationText(source), {
      attachedIds,
      groupIds: group.members.map((member) => member.itemId),
      // Members past the limit are left out, as the confirmation says, not matched back in.
      excludeIds: groupMembers.map((member) => member.itemId),
    });
    return {
      characters: conversationText(source).length,
      tagNames: allTagsIn(items),
      candidates,
      groupOmitted: group.omitted,
      // Frozen from this same reading: the text sent, its meaning numbers and the fingerprint
      // Apply checks, so an addition can only land on the entry Claude saw.
      attached: keepAttachedSnapshots(items, candidates, {
        groupDetails: new Map(group.members.map((member) => [member.itemId, member.detail])),
      }),
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
        attached: disclosed.attached,
        apiKey,
        signal: controller.signal,
      });
      if (!mountedRef.current || controller.signal.aborted) return;
      const proposals = normalizeKeepProposals(result.proposals, {
        candidates: disclosed.candidates,
        items: itemsRef.current,
        attached: disclosed.attached,
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
    if (writes.items.length === 0 && writes.updates.length === 0 && writes.links.length === 0) return;
    setError("");
    setPhase("applying");
    let result;
    try {
      result = await applyKeep({
        items: writes.items,
        links: writes.links,
        updates: writes.updates,
        attachedIds: writes.attachedIds,
      });
    } catch {
      if (mountedRef.current) {
        setError("Couldn't save — nothing was changed. Your selections are still here; try again.");
        setPhase("review");
      }
      return;
    }
    committedRef.current = true;
    const created = writes.items.map((item) => ({ id: item.id, term: item.term }));
    const termOf = new Map(response.proposals.updates.map((update) => [update.itemId, update.term]));
    const updated = result.updated.map((id) => ({ id, term: termOf.get(id) }));
    // Additions the review itself refused (the entry changed while it was open) count as skipped
    // too, so they are reported and the conversation stays unkept.
    const refusedHere = response.proposals.updates
      .filter((update) => (selection.staleRefs || []).includes(update.ref))
      // Restored and re-ticked meanwhile: it saved, so it was not refused.
      .filter((update) => !result.updated.includes(update.itemId))
      .filter((update) => !result.skippedUpdates.some((skip) => skip.itemId === update.itemId))
      .map((update) => ({ itemId: update.itemId, reason: "entry_changed" }));
    const skippedUpdates = [...result.skippedUpdates, ...refusedHere].map((skip) => ({ ...skip, term: termOf.get(skip.itemId) }));
    // The conversation counts as kept only when something was saved and nothing the owner ticked
    // was refused for being out of date; otherwise New question still asks before discarding it.
    const savedSomething = created.length + updated.length + result.linked.length > 0;
    if (savedSomething && !skippedUpdates.some((skip) => skip.reason === "entry_changed")) onApplied?.();
    if (!mountedRef.current) {
      // The save committed even though this screen went away (AI turned off, say): the notebook
      // still has to show the new entries.
      notebook.reload();
      return;
    }
    setSaved({ created, updated, skippedUpdates, skipped: result.skipped, linked: result.linked.length });
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
    const full = disclosed.attached.filter((snapshot) => !snapshot.short);
    const short = disclosed.attached.filter((snapshot) => snapshot.short);
    const related = disclosed.candidates.filter((candidate) => candidate.matchedBy !== "group");
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
          {related.length === 0
            ? (full.length + short.length === 0 ? "none of your entries (none seem related)." : "no other related entries")
            : `${related.length} related ${related.length === 1 ? "entry" : "entries"} from your cuaderno (term and first meaning only)${
              full.length + short.length === 0 ? "." : ""}`}
          {full.length > 0 && (
            <>
              {", plus "}
              {full.length === 1 ? "the attached entry" : `the ${full.length} attached entries`}{" "}
              in full as they are now — meanings, examples, notes and the names of linked entries — so
              Claude can suggest additions to {full.length === 1 ? "it" : "them"}{short.length > 0 ? "" : "."}
            </>
          )}
          {short.length > 0 && (
            <>
              {", plus "}
              {plural(short.length, "entry", "entries")} from attached groups in short form as they are now —
              meanings, and examples where you chose them — so Claude can suggest examples, tags and
              connections for them.
              {disclosed.groupOmitted > 0 && ` ${plural(disclosed.groupOmitted, "more group entry was", "more group entries were")} left out.`}
            </>
          )}
        </div>
        {disclosed.candidates.length > 0 && (
          <details className="mt-2 text-xs" style={{ color: C.mut }}>
            <summary className="cursor-pointer">Show the entries that will be sent</summary>
            <ul className="mt-1 space-y-0.5 pl-4 list-disc">
              {disclosed.candidates.map((candidate) => (
                <li key={candidate.ref}>
                  {candidate.term}{candidate.gloss ? ` — ${candidate.gloss}` : ""}
                  {candidate.matchedBy === "attached" ? " (attached)" : candidate.matchedBy === "group" ? " (from a group)" : ""}
                </li>
              ))}
            </ul>
          </details>
        )}
        {disclosed.attached.length > 0 && (
          <details className="mt-2 text-xs" style={{ color: C.mut }}>
            <summary className="cursor-pointer">Show the attached entries as they will be sent</summary>
            {disclosed.attached.map((snapshot) => (
              <pre
                key={snapshot.ref}
                aria-label={`${snapshot.short ? "Sent in short form" : "Sent in full"} for ${snapshot.term}`}
                className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg p-2 text-[11px]"
                style={{ background: C.paper, color: C.ink, border: `1px solid ${C.line}`, fontFamily: MONO }}
              >
                {snapshot.text}
              </pre>
            ))}
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
        <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: savedSummary(saved) ? C.green : C.mut }}>
          {savedSummary(saved) ? <><Check size={15} /> {savedSummary(saved)}</> : "Nothing was saved"}
        </div>
        <ul className="mt-2 space-y-1.5">
          {saved.updated.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-2 text-sm">
              <span style={{ color: C.ink }}>{entry.term} <span className="text-xs" style={{ color: C.mut }}>· added to</span></span>
              <Button tone="quiet" disabled={phase !== "applied"} onClick={() => onSelect(entry.id)} aria-label={`Open ${entry.term}`}>
                Open
              </Button>
            </li>
          ))}
          {saved.created.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-2 text-sm">
              <span style={{ color: C.ink }}>{entry.term}</span>
              <Button tone="quiet" disabled={phase !== "applied"} onClick={() => onSelect(entry.id)} aria-label={`Open ${entry.term}`}>
                Open
              </Button>
            </li>
          ))}
        </ul>
        {saved.skippedUpdates.map((skip) => (
          <div key={skip.itemId} role="status" className="mt-2 text-xs leading-relaxed rounded-lg p-2" style={{ background: C.amberPale, color: C.amber }}>
            Nothing was added to {skip.term}: {UPDATE_SKIP_REASONS[skip.reason] || skip.reason}.
          </div>
        ))}
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

/** "Added to 1 entry · Saved 2 entries and 1 connection", or "" when nothing was saved. */
function savedSummary(saved) {
  const parts = [];
  if (saved.updated.length > 0) parts.push(`Added to ${plural(saved.updated.length, "entry", "entries")}`);
  const stored = [
    saved.created.length > 0 ? plural(saved.created.length, "entry", "entries") : "",
    saved.linked > 0 ? plural(saved.linked, "connection", "connections") : "",
  ].filter(Boolean);
  if (stored.length > 0) parts.push(`Saved ${stored.join(" and ")}`);
  return parts.join(" · ");
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

  // An attached entry edited while the review is open can no longer take its additions: they are
  // unticked once and disabled while the entry differs from what Claude saw.
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const updates = useMemo(() => proposals.updates || [], [proposals.updates]);
  const staleRefs = useMemo(
    () => new Set(updates.filter((update) => isStale(update, itemsById)).map((update) => update.ref)),
    [updates, itemsById]
  );
  const unticked = useRef(new Set());
  useEffect(() => {
    const newlyStale = updates.filter((update) => staleRefs.has(update.ref) && !unticked.current.has(update.ref));
    if (newlyStale.length === 0) return;
    for (const update of newlyStale) unticked.current.add(update.ref);
    setSelection((current) => {
      // Remembered when something was still ticked, so Apply reports it as refused.
      const refused = newlyStale
        .filter((update) => update.additions.some((addition) => current.additions?.[addition.id]))
        .map((update) => update.ref);
      const ids = new Set(newlyStale.flatMap((update) => update.additions.map((addition) => addition.id)));
      return {
        ...current,
        staleRefs: [...new Set([...(current.staleRefs || []), ...refused])],
        additions: Object.fromEntries(Object.entries(current.additions || {}).map(([id, on]) => [id, ids.has(id) ? false : on])),
      };
    });
  }, [updates, staleRefs, setSelection]);

  const selectedEntries = proposals.entries.filter((entry) => selection.entries[entry.ref]?.selected);
  const selectedLinks = proposals.links.filter((link) => selection.links[link.id] && linkIsAvailable(link, selection));
  const selectedAdditions = updates
    .filter((update) => !staleRefs.has(update.ref))
    .flatMap((update) => update.additions)
    .filter((addition) => selection.additions?.[addition.id]);
  const nothingSelected = selectedEntries.length + selectedAdditions.length + selectedLinks.length === 0;

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

  function toggleAddition(id) {
    setSelection((current) => ({ ...current, additions: { ...current.additions, [id]: !current.additions?.[id] } }));
  }

  /** Tick every addition that can be applied and is not flagged; flagged ones keep their tick. */
  function tickAllAdditions(on) {
    setSelection((current) => {
      const additions = { ...current.additions };
      for (const update of updates) {
        if (staleRefs.has(update.ref)) continue;
        for (const addition of update.additions) {
          if (!on) additions[addition.id] = false;
          else if (addition.flag === null) additions[addition.id] = true;
        }
      }
      return { ...current, additions };
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

      {proposals.entries.length === 0 && updates.length === 0 && proposals.links.length === 0 && (
        <Card><p className="text-sm" style={{ color: C.mut }}>Claude found nothing new worth keeping here.</p></Card>
      )}

      {updates.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase" style={{ color: C.mut, letterSpacing: "0.08em" }}>
            Changes to your entries
          </div>
          {updates.length > 5 && (
            <div className="flex shrink-0 gap-1">
              <Button tone="quiet" disabled={applying} onClick={() => tickAllAdditions(true)}>Tick all</Button>
              <Button tone="quiet" disabled={applying} onClick={() => tickAllAdditions(false)}>Untick all</Button>
            </div>
          )}
        </div>
      )}
      {updates.map((update) => (
        <UpdateCard
          key={update.ref}
          update={update}
          stale={staleRefs.has(update.ref)}
          selection={selection}
          applying={applying}
          onToggle={toggleAddition}
          onSelect={onSelect}
        />
      ))}
      {updates.length > 0 && proposals.entries.length > 0 && (
        <div className="text-xs font-semibold uppercase pt-1" style={{ color: C.mut, letterSpacing: "0.08em" }}>
          New entries
        </div>
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
        <Button onClick={onApply} disabled={applying || nothingSelected}>
          {applying ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {applying ? "Saving…" : applyLabel(selectedEntries.length, selectedAdditions.length, selectedLinks.length)}
        </Button>
        <Button tone={confirmDiscard ? "dangerArmed" : "quiet"} onClick={onDiscard} disabled={applying}>
          <X size={15} /> {confirmDiscard ? "Tap again to discard" : "Discard"}
        </Button>
      </div>
    </section>
  );
}

/** "Apply 2 entries, 3 additions, 1 connection"; plain "Apply" when nothing is ticked. */
function applyLabel(entries, additions, links) {
  const parts = [
    entries > 0 ? plural(entries, "entry", "entries") : "",
    additions > 0 ? plural(additions, "addition", "additions") : "",
    links > 0 ? plural(links, "connection", "connections") : "",
  ].filter(Boolean);
  return parts.length > 0 ? `Apply ${parts.join(", ")}` : "Apply 0 entries";
}

const FLAGS = {
  similar_example: "Close to an example it already has.",
  similar_meaning: "Close to a meaning it already has.",
};

/** What one addition says, both on screen and as its checkbox's name. */
function additionLabel(addition) {
  switch (addition.kind) {
    case "example":
      return `Add example: ${addition.example.es}`;
    case "meaning":
      return `Add meaning: ${addition.meaning.gloss}`;
    case "note":
      return "Add to notes";
    default:
      return `Add tag ${addition.tag.name}`;
  }
}

function AdditionBody({ addition }) {
  if (addition.kind === "example") {
    return (
      <>
        <span className="text-xs" style={{ color: C.mut }}>
          + example · {addition.meaningId ? addition.meaningGloss || "a meaning" : "My examples"}
        </span>
        <span className="block" style={{ color: C.ink }}>{addition.example.es}</span>
        {addition.example.en && <span className="block text-xs" style={{ color: C.mut }}>{addition.example.en}</span>}
      </>
    );
  }
  if (addition.kind === "meaning") {
    const { meaning } = addition;
    const usage = [meaning.usageLabels.join(", "), meaning.usageCue].filter(Boolean).join(" — ");
    return (
      <>
        <span className="text-xs" style={{ color: C.mut }}>+ meaning</span>
        <span className="block" style={{ color: C.ink }}>{meaning.gloss}</span>
        {usage && <span className="block text-xs" style={{ color: C.mut }}>{usage}</span>}
        {meaning.examples.map((example, index) => (
          <span key={index} className="block text-xs" style={{ color: C.mut }}>
            <span style={{ color: C.ink }}>{example.es}</span>{example.en ? ` — ${example.en}` : ""}
          </span>
        ))}
      </>
    );
  }
  if (addition.kind === "note") {
    return (
      <>
        <span className="text-xs" style={{ color: C.mut }}>+ note, after your notes</span>
        {/* As it will look once saved; never loads a remote image. */}
        <MarkdownText remoteImages={false} blankLines explicitNoteCallouts compact className="block" style={{ color: C.ink }}>
          {addition.note}
        </MarkdownText>
      </>
    );
  }
  return (
    <span className="text-xs" style={{ color: C.mut }}>
      + tag <span style={{ color: C.ink }}>#{addition.tag.name}</span>{addition.tag.isNew ? " · new" : ""}
    </span>
  );
}

function UpdateCard({ update, stale, selection, applying, onToggle, onSelect }) {
  return (
    <Card aria-label={`Changes to ${update.term}`} style={stale ? { opacity: 0.75 } : {}}>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="font-semibold" style={{ color: C.ink }}>{update.term}</span>{" "}
          <span className="text-xs" style={{ color: C.mut }}>your entry</span>
        </span>
        <Button tone="quiet" onClick={() => onSelect(update.itemId)} aria-label={`Open your ${update.term}`}>
          Open
        </Button>
      </div>
      {stale && (
        <div role="status" className="mt-2 text-xs rounded-lg p-2" style={{ background: C.amberPale, color: C.amber }}>
          You changed this entry after Claude saw it, so these additions can&apos;t be applied.
        </div>
      )}
      <ul className="mt-2 space-y-2">
        {update.additions.map((addition) => (
          <li key={addition.id}>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 shrink-0"
                checked={!stale && Boolean(selection.additions?.[addition.id])}
                disabled={stale || applying}
                onChange={() => onToggle(addition.id)}
                aria-label={additionLabel(addition)}
              />
              <span className="min-w-0 break-words">
                <AdditionBody addition={addition} />
                {addition.flag && (
                  <span className="block text-xs" style={{ color: C.amber }}>{FLAGS[addition.flag]}</span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {update.reason && <div className="mt-2 text-xs italic" style={{ color: C.mut }}>{update.reason}</div>}
    </Card>
  );
}
