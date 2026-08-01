import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { C, SERIF } from "../theme.jsx";
import { POS_OPTIONS } from "./ItemCard.jsx";
import TagInput from "./TagInput.jsx";
import { newLexical, newPage, createItem } from "../db/items.js";
import { localDate } from "../lib/dates.js";
import { allTagsIn } from "../lib/tags.js";

const inputStyle = { background: C.card, borderColor: C.line, color: C.ink };

function Field({ children }) {
  return <div className="space-y-1">{children}</div>;
}

export default function AddSheet({ kind, items = [], onClose, onCreated }) {
  const isPage = kind === "page";
  const allTags = useMemo(() => allTagsIn(items), [items]);

  const [term, setTerm] = useState("");
  const [translation, setTranslation] = useState("");
  const [form, setForm] = useState("word");
  const [pos, setPos] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pageDate, setPageDate] = useState("");
  const [tags, setTags] = useState([]);
  const [notes, setNotes] = useState("");

  const ready = isPage ? title.trim() !== "" : term.trim() !== "";

  async function submit() {
    if (!ready) return;
    const item = isPage
      ? newPage({ title, body, pageDate: pageDate || null, tags })
      : newLexical({ term, translation, form, pos, notes, tags });
    await createItem(item);
    onCreated(item.id);
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center"
      style={{ background: "rgba(33,42,61,0.35)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl p-4 pb-6 space-y-3 max-h-[88vh] overflow-y-auto"
        style={{ background: C.paper }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <div className="font-semibold" style={{ fontFamily: SERIF, color: C.ink, fontSize: 18 }}>
            {isPage ? "New page" : "New word or phrase"}
          </div>
          <button onClick={onClose} aria-label="Close">
            <X size={18} style={{ color: C.mut }} />
          </button>
        </div>

        {isPage ? (
          <>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title *"
              className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none"
              style={{ ...inputStyle, fontFamily: SERIF }}
            />
            <Field>
              <label className="text-xs" style={{ color: C.mut }}>
                Date — fill this in to make it a journal entry
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={pageDate}
                  onChange={(e) => setPageDate(e.target.value)}
                  className="flex-1 text-sm rounded-xl border px-3 py-2.5 outline-none"
                  style={inputStyle}
                />
                <button
                  onClick={() => setPageDate(pageDate ? "" : localDate())}
                  className="text-xs px-3 rounded-xl border"
                  style={inputStyle}
                >
                  {pageDate ? "clear" : "today"}
                </button>
              </div>
            </Field>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Notes — a grammar point, a film you watched, what happened today…"
              className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none min-h-32"
              style={inputStyle}
            />
          </>
        ) : (
          <>
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Spanish word or phrase *"
              className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none"
              style={{ ...inputStyle, fontFamily: SERIF }}
            />
            <input
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="English meaning (optional)"
              className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none"
              style={inputStyle}
            />
            <div className="flex gap-2">
              <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: C.line }}>
                {["word", "phrase"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setForm(f)}
                    className="text-sm px-3 py-2.5"
                    style={
                      form === f
                        ? { background: C.pen, color: "#fff" }
                        : { background: C.card, color: C.mut }
                    }
                  >
                    {f}
                  </button>
                ))}
              </div>
              <select
                value={pos}
                onChange={(e) => setPos(e.target.value)}
                className="flex-1 text-sm rounded-xl border px-3 py-2.5 outline-none"
                style={inputStyle}
              >
                {POS_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p || "part of speech…"}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="First note (optional) — a mnemonic, a gotcha, where you heard it"
              className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none min-h-16"
              style={inputStyle}
            />
          </>
        )}

        <TagInput tags={tags} allTags={allTags} onChange={setTags} placeholder="add a tag" />

        <button
          onClick={submit}
          disabled={!ready}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm"
          style={{ background: ready ? C.pen : "#B9C2D8" }}
        >
          {isPage ? "Add page" : "Add to cuaderno"}
        </button>
      </div>
    </div>
  );
}
