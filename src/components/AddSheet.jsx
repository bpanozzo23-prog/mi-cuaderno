import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { C, SERIF, Card, Button } from "../theme.jsx";
import { POS_OPTIONS } from "./ItemCard.jsx";
import TagInput from "./TagInput.jsx";
import DuplicateWarning from "./DuplicateWarning.jsx";
import { newLexical, newPage, createItem } from "../db/items.js";
import { localDate } from "../lib/dates.js";
import { allTagsIn } from "../lib/tags.js";
import { findPersonalHeadingDuplicates } from "../lib/duplicateGuard.js";
import { newMeaning } from "../lib/meanings.js";
import { PAGE_PROFILES } from "../lib/pageProfiles.js";
import { newPageGroup, validateCollectionGroups } from "../lib/collections.js";
import MeaningEditor from "./MeaningEditor.jsx";

const inputStyle = { background: C.card, borderColor: C.line, color: C.ink };

function Field({ children }) {
  return <div className="space-y-1">{children}</div>;
}

export default function AddSheet({ kind, pageStarter = null, items = [], onClose, onCreated }) {
  const isPage = kind === "page";
  const pageProfile =
    isPage && pageStarter?.pageProfile === PAGE_PROFILES.collection
      ? PAGE_PROFILES.collection
      : PAGE_PROFILES.general;
  const isCollection = pageProfile === PAGE_PROFILES.collection;
  const allTags = useMemo(() => allTagsIn(items), [items]);

  const [term, setTerm] = useState("");
  const [meanings, setMeanings] = useState([newMeaning()]);
  const [problem, setProblem] = useState("");

  /**
   * The word/phrase toggle follows the term until the owner touches it — a term with a space
   * in it starts as a phrase, which is what quick-create-and-link already infers (Detail.jsx).
   * Once they pick a side it stays picked, so "buenos días" can still be filed as a word if
   * that is what they mean.
   */
  const [formChoice, setFormChoice] = useState(null);
  const form = formChoice ?? (term.trim().includes(" ") ? "phrase" : "word");
  const [pos, setPos] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pageDate, setPageDate] = useState("");
  const [groupNames, setGroupNames] = useState(() =>
    isCollection ? [...(pageStarter?.groupNames || [])] : []
  );
  const [tags, setTags] = useState([]);
  const [notes, setNotes] = useState("");

  const duplicates = useMemo(
    () =>
      findPersonalHeadingDuplicates(
        items,
        isPage ? "page" : "lexical",
        isPage ? title : term
      ),
    [items, isPage, title, term]
  );

  const collectionDraft = useMemo(() => {
    if (!isCollection) return { groups: [], error: "" };
    try {
      return {
        groups: validateCollectionGroups(groupNames.map((name) => newPageGroup(name))),
        error: "",
      };
    } catch (error) {
      return {
        groups: [],
        error: error instanceof Error ? error.message : "Every group needs a unique name.",
      };
    }
  }, [groupNames, isCollection]);

  const ready = isPage
    ? title.trim() !== "" && collectionDraft.error === ""
    : term.trim() !== "";

  async function submit() {
    if (!ready) return;
    try {
      const item = isPage
        ? newPage({
            title,
            body,
            pageDate: pageDate || null,
            tags,
            pageProfile,
            collection: { groups: collectionDraft.groups },
          })
        : newLexical({ term, meanings, form, pos, notes, tags });
      await createItem(item);
      onCreated(item.id);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "This entry could not be created.");
    }
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
            {isCollection ? "New collection" : isPage ? "New page" : "New word or phrase"}
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
            {duplicates.length > 0 && <DuplicateWarning kind="page" />}
            {isCollection && (
              <Field>
                <label className="text-xs" style={{ color: C.mut }}>Date (optional)</label>
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
            )}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                isCollection
                  ? "Overview — what belongs in this collection? (optional)"
                  : "Notes — a grammar point, a film, podcast, source, or topic…"
              }
              className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none min-h-32"
              style={inputStyle}
            />
            {isCollection && (
              <div className="space-y-2">
                <div>
                  <div className="text-xs" style={{ color: C.mut }}>Groups — optional</div>
                  <div className="text-xs mt-0.5" style={{ color: C.mut }}>
                    Groups stay in this order and can be changed later.
                  </div>
                </div>
                {groupNames.map((name, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      value={name}
                      onChange={(event) =>
                        setGroupNames(
                          groupNames.map((entry, itemIndex) =>
                            itemIndex === index ? event.target.value : entry
                          )
                        )
                      }
                      aria-label={`Group ${index + 1} name`}
                      placeholder={`Group ${index + 1}`}
                      className="flex-1 min-w-0 text-sm rounded-xl border px-3 py-2.5 outline-none"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      aria-label={`Remove group ${index + 1}`}
                      onClick={() => setGroupNames(groupNames.filter((_, itemIndex) => itemIndex !== index))}
                      className="min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg border"
                      style={inputStyle}
                    >
                      <X size={15} style={{ color: C.mut }} />
                    </button>
                  </div>
                ))}
                <Button type="button" tone="quiet" onClick={() => setGroupNames([...groupNames, ""])}>
                  <Plus size={14} /> Add group
                </Button>
                {collectionDraft.error && (
                  <div role="alert" className="text-xs" style={{ color: C.red }}>
                    {collectionDraft.error}
                  </div>
                )}
              </div>
            )}
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
            {duplicates.length > 0 && <DuplicateWarning kind="lexical" />}
            <div className="space-y-2">
              <div className="text-xs" style={{ color: C.mut }}>Meanings — blank rows will not be saved</div>
              {meanings.map((meaning, index) => (
                <Card key={meaning.id} style={{ background: C.paper }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: C.mut }}>Meaning {index + 1}</span>
                    {meanings.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remove meaning ${index + 1}`}
                        onClick={() => setMeanings(meanings.filter((_, itemIndex) => itemIndex !== index))}
                      >
                        <X size={13} style={{ color: C.mut }} />
                      </button>
                    )}
                  </div>
                  <MeaningEditor
                    meaning={meaning}
                    onChange={(changed) => setMeanings(meanings.map((entry, itemIndex) => itemIndex === index ? changed : entry))}
                  />
                </Card>
              ))}
              <Button type="button" tone="quiet" onClick={() => setMeanings([...meanings, newMeaning()])}>
                <Plus size={14} /> Add meaning
              </Button>
            </div>
            <div className="flex gap-2">
              <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: C.line }}>
                {["word", "phrase"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormChoice(f)}
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

        {problem && <div className="text-xs" style={{ color: C.red }}>{problem}</div>}

        <button
          onClick={submit}
          disabled={!ready}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm"
          style={{ background: ready ? C.pen : "#B9C2D8" }}
        >
          {isCollection ? "Add collection" : isPage ? "Add page" : "Add to cuaderno"}
        </button>
      </div>
    </div>
  );
}
