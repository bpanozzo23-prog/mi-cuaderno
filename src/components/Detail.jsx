import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, Trash2, X, ExternalLink, Pencil, CalendarDays, FileText, Check, Link2,
  Highlighter, Eye, Clock,
} from "lucide-react";
import { C, SERIF, MONO, dotGrid, Hi, SectionTitle, Card, Chip, Button } from "../theme.jsx";
import { POS_OPTIONS, POS_ABBR } from "./ItemCard.jsx";
import { updateItem, deleteItem, linkItems, unlinkItems, displayTitle } from "../db/items.js";
import { logView, toggleTricky } from "../db/events.js";
import { emptyItemState } from "../useNotebook.js";
import { timeAgo } from "../lib/dates.js";

const inputStyle = { background: C.card, borderColor: C.line, color: C.ink };

export default function Detail({ item, state = emptyItemState, items = [], onBack, onOpen, onChanged }) {
  const isPage = item.type === "page";

  const [editingHead, setEditingHead] = useState(false);
  const [head, setHead] = useState({});
  const [bodyDraft, setBodyDraft] = useState("");
  const [bodyDirty, setBodyDirty] = useState(false);
  const [tagAdd, setTagAdd] = useState("");
  const [exEs, setExEs] = useState("");
  const [exEn, setExEn] = useState("");
  const [mUrl, setMUrl] = useState("");
  const [mLabel, setMLabel] = useState("");
  const [deleteArm, setDeleteArm] = useState(false);
  const [linkPick, setLinkPick] = useState("");

  // Both directions at once: links this item made, and links made to it from
  // elsewhere. Which side stores the link is bookkeeping the owner shouldn't see.
  const related = useMemo(() => {
    const keys = new Set(item.linkedKeys);
    return items.filter((other) => other.id !== item.id && (keys.has(other.id) || other.linkedKeys.includes(item.id)));
  }, [items, item]);

  const linkable = useMemo(
    () => items.filter((other) => other.id !== item.id && !related.some((r) => r.id === other.id)),
    [items, item, related]
  );

  useEffect(() => {
    setBodyDraft(isPage ? item.body || "" : item.notes || "");
    setBodyDirty(false);
    setEditingHead(false);
    setDeleteArm(false);
    setHead(
      isPage
        ? { title: item.title, pageDate: item.pageDate || "" }
        : { term: item.term, translation: item.translation, pos: item.pos || "", form: item.form }
    );
  }, [item.id]);

  // A lookup is recorded when the owner intentionally opens an item — keyed on
  // item.id alone, so rerenders and edits within this screen never re-fire it.
  // logView itself decides whether this counts as a new lookup; the refresh is
  // not tied to this component still being mounted, because the effect may be
  // torn down and re-run before the write settles.
  useEffect(() => {
    logView(item.id).then((logged) => {
      if (logged) onChanged();
    });
  }, [item.id]);

  async function patch(fields, options) {
    await updateItem(item.id, fields, options);
    onChanged();
  }

  async function saveHead() {
    const fields = isPage
      ? { title: head.title.trim(), pageDate: head.pageDate || null }
      : {
          term: head.term.trim(),
          translation: head.translation.trim(),
          pos: head.pos,
          form: head.form,
        };
    if (isPage ? !fields.title : !fields.term) return;
    setEditingHead(false);
    await patch(fields);
  }

  async function saveBody() {
    setBodyDirty(false);
    await patch(isPage ? { body: bodyDraft } : { notes: bodyDraft });
  }

  return (
    <div className="px-4 py-4 pb-28" style={dotGrid}>
      <button onClick={onBack} className="flex items-center gap-1 text-sm mb-3" style={{ color: C.pen }}>
        <ChevronLeft size={16} /> Todo el cuaderno
      </button>

      <Card className="p-4">
        {editingHead ? (
          <div className="space-y-2">
            {isPage ? (
              <>
                <input
                  value={head.title}
                  onChange={(e) => setHead({ ...head, title: e.target.value })}
                  className="w-full text-lg rounded-xl border px-3 py-2 outline-none"
                  style={{ ...inputStyle, fontFamily: SERIF }}
                />
                <input
                  type="date"
                  value={head.pageDate}
                  onChange={(e) => setHead({ ...head, pageDate: e.target.value })}
                  className="w-full text-sm rounded-xl border px-3 py-2 outline-none"
                  style={inputStyle}
                />
              </>
            ) : (
              <>
                <input
                  value={head.term}
                  onChange={(e) => setHead({ ...head, term: e.target.value })}
                  className="w-full text-lg rounded-xl border px-3 py-2 outline-none"
                  style={{ ...inputStyle, fontFamily: SERIF }}
                />
                <input
                  value={head.translation}
                  onChange={(e) => setHead({ ...head, translation: e.target.value })}
                  placeholder="English meaning"
                  className="w-full text-sm rounded-xl border px-3 py-2 outline-none"
                  style={inputStyle}
                />
                <div className="flex gap-2">
                  <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: C.line }}>
                    {["word", "phrase"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setHead({ ...head, form: f })}
                        className="text-sm px-3 py-2"
                        style={head.form === f ? { background: C.pen, color: "#fff" } : { background: C.card, color: C.mut }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <select
                    value={head.pos}
                    onChange={(e) => setHead({ ...head, pos: e.target.value })}
                    className="flex-1 text-sm rounded-xl border px-3 py-2 outline-none"
                    style={inputStyle}
                  >
                    {POS_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p || "part of speech…"}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="flex gap-2">
              <Button onClick={saveHead}>
                <Check size={15} /> Save
              </Button>
              <Button tone="quiet" onClick={() => setEditingHead(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-2xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
                {isPage && <FileText size={16} className="inline mr-2 -mt-1" style={{ color: C.mut }} />}
                <Hi on={state.tricky}>{isPage ? item.title || "Untitled page" : item.term}</Hi>
                {!isPage && item.form === "phrase" && (
                  <span className="italic font-normal text-base ml-2" style={{ color: C.mut }}>
                    loc.
                  </span>
                )}
                {!isPage && item.form !== "phrase" && POS_ABBR[item.pos] && (
                  <span className="italic font-normal text-base ml-2" style={{ color: C.mut }}>
                    {POS_ABBR[item.pos]}
                  </span>
                )}
              </div>
              {!isPage && item.translation && (
                <div className="mt-1" style={{ color: C.ink }}>
                  — {item.translation}
                </div>
              )}
              {isPage && item.pageDate && (
                <div className="mt-1 text-xs inline-flex items-center gap-1" style={{ fontFamily: MONO, color: C.mut }}>
                  <CalendarDays size={12} /> {item.pageDate}
                </div>
              )}
            </div>
            <button onClick={() => setEditingHead(true)} aria-label="Edit" className="shrink-0 p-1">
              <Pencil size={15} style={{ color: C.mut }} />
            </button>
          </div>
        )}

        {!editingHead && (
          <>
            <div className="mt-3 flex items-center gap-4 text-xs" style={{ fontFamily: MONO, color: C.mut }}>
              <span className="inline-flex items-center gap-1">
                <Eye size={12} /> {state.views} {state.views === 1 ? "lookup" : "lookups"}
              </span>
              {state.lastViewedAt && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} /> {timeAgo(state.lastViewedAt)}
                </span>
              )}
            </div>
            <button
              onClick={async () => {
                await toggleTricky(item.id, state.tricky);
                onChanged();
              }}
              className="mt-3 inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border font-medium"
              style={
                state.tricky
                  ? { background: C.hi, borderColor: "#E3C93A", color: "#5B4E08" }
                  : { background: C.card, borderColor: C.line, color: C.mut }
              }
            >
              <Highlighter size={15} /> {state.tricky ? "Marked tricky" : "Highlight as tricky"}
            </button>
          </>
        )}
      </Card>

      <SectionTitle>{isPage ? "Page" : "Notes"}</SectionTitle>
      <Card>
        <textarea
          value={bodyDraft}
          onChange={(e) => {
            setBodyDraft(e.target.value);
            setBodyDirty(true);
          }}
          placeholder={
            isPage
              ? "Write the page — grammar rules, a source, what happened today…"
              : "Your notes — mnemonics, gotchas, where you heard it…"
          }
          className="w-full bg-transparent outline-none text-sm resize-y"
          style={{ color: C.ink, minHeight: isPage ? 160 : 96 }}
        />
        {bodyDirty && (
          <Button onClick={saveBody} className="mt-1">
            Save {isPage ? "page" : "note"}
          </Button>
        )}
      </Card>

      <SectionTitle>Tags</SectionTitle>
      <div className="flex flex-wrap gap-1.5 items-center">
        {item.tags.map((t) => (
          <Chip key={t} onRemove={() => patch({ tags: item.tags.filter((x) => x !== t) })}>
            {t}
          </Chip>
        ))}
        <div className="flex items-center gap-1">
          <input
            value={tagAdd}
            onChange={(e) => setTagAdd(e.target.value)}
            placeholder="new tag"
            className="text-xs px-2 py-1 rounded-full border outline-none w-24"
            style={inputStyle}
          />
          <button
            onClick={() => {
              const t = tagAdd.trim();
              if (t && !item.tags.includes(t)) patch({ tags: [...item.tags, t] });
              setTagAdd("");
            }}
            className="text-xs px-2 py-1 rounded-full text-white"
            style={{ background: C.pen }}
          >
            Add
          </button>
        </div>
      </div>

      {!isPage && (
        <>
          <SectionTitle>My examples</SectionTitle>
          <div className="space-y-2">
            {item.myExamples.map((x, i) => (
              <Card key={i} className="flex justify-between gap-2">
                <div>
                  <div style={{ fontFamily: SERIF, color: C.ink }}>{x.es}</div>
                  {x.en && (
                    <div className="text-xs mt-0.5" style={{ color: C.mut }}>
                      {x.en}
                    </div>
                  )}
                </div>
                <X
                  size={14}
                  className="shrink-0 mt-1"
                  style={{ color: C.mut }}
                  onClick={() => patch({ myExamples: item.myExamples.filter((_, j) => j !== i) })}
                />
              </Card>
            ))}
            <Card className="space-y-2">
              <input
                value={exEs}
                onChange={(e) => setExEs(e.target.value)}
                placeholder="Sentence in Spanish"
                className="w-full text-sm bg-transparent outline-none"
                style={{ color: C.ink }}
              />
              <input
                value={exEn}
                onChange={(e) => setExEn(e.target.value)}
                placeholder="English (optional)"
                className="w-full text-sm bg-transparent outline-none border-t pt-2"
                style={{ color: C.ink, borderColor: C.line }}
              />
              <Button
                onClick={() => {
                  if (!exEs.trim()) return;
                  patch({ myExamples: [...item.myExamples, { es: exEs.trim(), en: exEn.trim() }] });
                  setExEs("");
                  setExEn("");
                }}
              >
                Add example
              </Button>
            </Card>
          </div>
        </>
      )}

      <SectionTitle>Media links</SectionTitle>
      <div className="space-y-2">
        {item.mediaLinks.map((m, i) => (
          <Card key={i} className="flex items-center justify-between gap-2">
            <a
              href={m.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm underline underline-offset-2 min-w-0"
              style={{ color: C.pen }}
            >
              <ExternalLink size={14} className="shrink-0" />
              <span className="truncate">{m.label || m.url}</span>
            </a>
            <X
              size={14}
              className="shrink-0"
              style={{ color: C.mut }}
              onClick={() => patch({ mediaLinks: item.mediaLinks.filter((_, j) => j !== i) })}
            />
          </Card>
        ))}
        <Card className="space-y-2">
          <input
            value={mUrl}
            onChange={(e) => setMUrl(e.target.value)}
            placeholder="https:// link to video, image, article…"
            className="w-full text-sm bg-transparent outline-none"
            style={{ color: C.ink }}
          />
          <input
            value={mLabel}
            onChange={(e) => setMLabel(e.target.value)}
            placeholder="Label (optional)"
            className="w-full text-sm bg-transparent outline-none border-t pt-2"
            style={{ color: C.ink, borderColor: C.line }}
          />
          <Button
            onClick={() => {
              const url = mUrl.trim();
              if (!/^https?:\/\//.test(url)) return;
              patch({ mediaLinks: [...item.mediaLinks, { url, label: mLabel.trim() }] });
              setMUrl("");
              setMLabel("");
            }}
          >
            Add link
          </Button>
        </Card>
      </div>

      <SectionTitle>Linked</SectionTitle>
      <div className="flex flex-wrap gap-1.5 items-center">
        {related.map((other) => (
          <Chip
            key={other.id}
            onClick={() => onOpen(other.id)}
            onRemove={async () => {
              await unlinkItems(item.id, other.id);
              onChanged();
            }}
          >
            {other.type === "page" ? <FileText size={11} /> : <Link2 size={11} />} {displayTitle(other)}
          </Chip>
        ))}
        {linkable.length > 0 && (
          <div className="flex items-center gap-1">
            <select
              value={linkPick}
              onChange={(e) => setLinkPick(e.target.value)}
              className="text-xs px-2 py-1 rounded-full border outline-none max-w-40"
              style={inputStyle}
            >
              <option value="">link something…</option>
              {linkable.map((other) => (
                <option key={other.id} value={other.id}>
                  {displayTitle(other)}
                </option>
              ))}
            </select>
            <button
              onClick={async () => {
                if (!linkPick) return;
                await linkItems(item.id, linkPick);
                setLinkPick("");
                onChanged();
              }}
              className="text-xs px-2 py-1 rounded-full text-white"
              style={{ background: C.pen }}
            >
              Link
            </button>
          </div>
        )}
        {related.length === 0 && linkable.length === 0 && (
          <span className="text-xs" style={{ color: C.mut }}>
            Nothing else in the cuaderno to link to yet.
          </span>
        )}
      </div>

      <div className="mt-8">
        <Button
          tone={deleteArm ? "dangerArmed" : "danger"}
          onClick={async () => {
            if (!deleteArm) {
              setDeleteArm(true);
              setTimeout(() => setDeleteArm(false), 3000);
              return;
            }
            await deleteItem(item.id);
            onBack();
            onChanged();
          }}
        >
          <Trash2 size={14} /> {deleteArm ? "Tap again to confirm" : `Delete ${isPage ? "page" : "word"}`}
        </Button>
      </div>
    </div>
  );
}
