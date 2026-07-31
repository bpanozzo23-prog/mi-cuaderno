import { useEffect, useState } from "react";
import { ChevronLeft, Trash2, X, ExternalLink, Pencil, CalendarDays, FileText, Check } from "lucide-react";
import { C, SERIF, MONO, dotGrid, Hi, SectionTitle, Card, Chip, Button } from "../theme.jsx";
import { POS_OPTIONS, POS_ABBR } from "./ItemCard.jsx";
import { updateItem, deleteItem } from "../db/items.js";
import { emptyItemState } from "../useNotebook.js";

const inputStyle = { background: C.card, borderColor: C.line, color: C.ink };

export default function Detail({ item, state = emptyItemState, onBack, onChanged }) {
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
