import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { C, SERIF, Card, Button } from "../theme.jsx";
import { POS_OPTIONS } from "./ItemCard.jsx";
import TagInput from "./TagInput.jsx";
import DuplicateWarning from "./DuplicateWarning.jsx";
import { newLexical, newPage, createItem } from "../db/items.js";
import { copyPageStructure } from "../db/pageStructures.js";
import { localDate } from "../lib/dates.js";
import { allTagsIn } from "../lib/tags.js";
import { findPersonalHeadingDuplicates } from "../lib/duplicateGuard.js";
import { newMeaning } from "../lib/meanings.js";
import { newPageGroup, validateCollectionGroups } from "../lib/collections.js";
import {
  emptyGrammar,
  emptySource,
  isHttpSourceUrl,
  newGrammarSection,
  PAGE_FOCUSES,
  pageStructureNameKey,
} from "../lib/pageKinds.js";
import { pageSeedFromRecipe } from "../lib/pageStarters.js";
import MeaningEditor from "./MeaningEditor.jsx";
import MarkdownTextarea from "./MarkdownTextarea.jsx";

const inputStyle = { background: C.card, borderColor: C.line, color: C.ink };

function Field({ children }) {
  return <div className="space-y-1">{children}</div>;
}

const SOURCE_FORMAT_OPTIONS = [
  ["", "Choose later"],
  ["book", "Book or written work"],
  ["audio", "Podcast or audio"],
  ["video", "Film or video"],
  ["article_lesson", "Article or lesson"],
  ["other", "Other"],
];

const PAGE_TITLES = {
  [PAGE_FOCUSES.notes]: "New notes page",
  [PAGE_FOCUSES.vocabulary]: "New vocabulary page",
  [PAGE_FOCUSES.source]: "New Source notebook",
  [PAGE_FOCUSES.grammar]: "New Grammar guide",
};

function normalizedPageSeed(pageStarter) {
  const defaultSeed = pageSeedFromRecipe("notes", "blank");
  if (pageStarter?.copySourcePageId) {
    return { ...defaultSeed, copySourcePageId: pageStarter.copySourcePageId };
  }
  if (pageStarter?.pageFocus) {
    return {
      ...defaultSeed,
      ...pageStarter,
      groupNames: [...(pageStarter.groupNames || [])],
      sectionNames: [...(pageStarter.sectionNames || [])],
    };
  }

  // Keep an old in-memory starter usable while Cuaderno and its open sheet update together.
  if (pageStarter?.pageProfile === "collection") {
    return {
      ...pageSeedFromRecipe("vocabulary", "blank"),
      groupNames: [...(pageStarter.groupNames || [])],
    };
  }
  return defaultSeed;
}

export default function AddSheet({
  kind,
  pageStarter = null,
  initialForm = null,
  // Share-continuation seeds: a term typed in the share picker's create row, and the shared
  // video for the new LEXICAL item (page creations carry theirs on the starter seed instead).
  initialTerm = "",
  initialGloss = "",
  seedMediaLinks = [],
  items = [],
  onClose,
  onCreated,
}) {
  const isPage = kind === "page";
  const seed = useMemo(() => normalizedPageSeed(pageStarter), [pageStarter]);
  const isCopy = isPage && Boolean(seed.copySourcePageId);
  const collectionEnabled = isPage && !isCopy && seed.collectionEnabled === true;
  const sourceEnabled = isPage && !isCopy && seed.sourceEnabled === true;
  const grammarEnabled = isPage && !isCopy && seed.grammarEnabled === true;
  const isStructured = collectionEnabled || sourceEnabled || grammarEnabled;
  const allTags = useMemo(() => allTagsIn(items), [items]);

  const [term, setTerm] = useState(initialTerm);
  const [meanings, setMeanings] = useState([newMeaning({ gloss: initialGloss })]);
  const [problem, setProblem] = useState("");

  /**
   * The word/phrase toggle follows the term until the owner touches it — a term with a space
   * in it starts as a phrase, which is what quick-create-and-link already infers (Detail.jsx).
   * Once they pick a side it stays picked, so "buenos días" can still be filed as a word if
   * that is what they mean.
   *
   * Opening from the hub's Words or Phrases chip seeds the CHOICE rather than the inference, so
   * adding from Phrases keeps a single-word term filed as a phrase.
   */
  const [formChoice, setFormChoice] = useState(initialForm === "phrase" || initialForm === "word" ? initialForm : null);
  const form = formChoice ?? (term.trim().includes(" ") ? "phrase" : "word");
  const [pos, setPos] = useState("");
  // A shared-in URL (src/lib/shareTarget.js) arrives with the page title and link already
  // known; prefilling is all the share does — creating stays behind the button below.
  const [title, setTitle] = useState(seed.title || "");
  const [body, setBody] = useState("");
  const [pageDate, setPageDate] = useState("");
  const [groupNames, setGroupNames] = useState(() =>
    seed.collectionEnabled ? [...seed.groupNames] : []
  );
  const [sectionNames, setSectionNames] = useState(() =>
    seed.grammarEnabled ? [...seed.sectionNames] : []
  );
  const [sourceFormat, setSourceFormat] = useState(seed.sourceFormat || "");
  const [sourceCreator, setSourceCreator] = useState("");
  const [sourceScope, setSourceScope] = useState("");
  const [sourceUrl, setSourceUrl] = useState(seed.sourceUrl || "");
  const [sourceContext, setSourceContext] = useState("");
  const [grammarKeyIdea, setGrammarKeyIdea] = useState("");
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
    if (!collectionEnabled) return { groups: [], error: "" };
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
  }, [collectionEnabled, groupNames]);

  const grammarDraft = useMemo(() => {
    if (!grammarEnabled) return { sections: [], error: "" };
    const names = sectionNames.map((name) => String(name || "").trim());
    if (names.some((name) => !name)) {
      return { sections: [], error: "Grammar section names cannot be blank." };
    }
    const normalizedNames = names.map(pageStructureNameKey);
    if (new Set(normalizedNames).size !== normalizedNames.length) {
      return { sections: [], error: "Grammar section names must be unique within a guide." };
    }
    return {
      sections: names.map((name) => newGrammarSection({ name })),
      error: "",
    };
  }, [grammarEnabled, sectionNames]);

  const sourceUrlError = sourceEnabled
    && sourceUrl.trim() !== ""
    && !isHttpSourceUrl(sourceUrl.trim())
    ? "Primary URL must be a valid http:// or https:// URL."
    : "";

  const ready = isPage
    ? title.trim() !== ""
      && collectionDraft.error === ""
      && grammarDraft.error === ""
      && sourceUrlError === ""
    : term.trim() !== "";

  async function submit() {
    if (!ready) return;
    try {
      let item;
      if (isPage && isCopy) {
        item = await copyPageStructure(seed.copySourcePageId, { title });
      } else if (isPage) {
        item = newPage({
            title,
            body,
            pageDate: isStructured ? pageDate || null : null,
            tags,
            pageFocus: seed.pageFocus,
            noteSections: seed.noteSections,
            // A shared-in video rides the starter (grammarShareStarter) onto the new page.
            mediaLinks: seed.mediaLinks || [],
            collection: {
              enabled: collectionEnabled,
              groups: collectionDraft.groups,
            },
            source: emptySource({
              enabled: sourceEnabled,
              format: sourceFormat,
              creator: sourceCreator,
              scope: sourceScope,
              url: sourceUrl.trim(),
              context: sourceContext,
            }),
            grammar: emptyGrammar({
              enabled: grammarEnabled,
              keyIdea: grammarKeyIdea,
              sections: grammarDraft.sections,
            }),
          });
        await createItem(item);
      } else {
        item = newLexical({ term, meanings, form, pos, notes, tags, mediaLinks: seedMediaLinks });
        await createItem(item);
      }
      onCreated(item.id);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "This entry could not be created.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center"
      style={{ background: C.scrim }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl p-4 pb-6 space-y-3 max-h-[88vh] overflow-y-auto"
        style={{ background: C.paper }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <div className="font-semibold" style={{ fontFamily: SERIF, color: C.ink, fontSize: 18 }}>
            {isPage
              ? isCopy
                ? "Copy page structure"
                : PAGE_TITLES[seed.pageFocus] || "New page"
              : "New word or phrase"}
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

            {isCopy ? (
              <Card>
                <div className="text-sm" style={{ color: C.ink }}>
                  A fresh page will reuse only the chosen page’s focus and empty organization.
                </div>
                <div className="text-xs mt-1 leading-relaxed" style={{ color: C.mut }}>
                  The Overview, section bodies, dates, tags, Source details, captures, examples, vocabulary, and connections are not copied.
                </div>
              </Card>
            ) : (
              <MarkdownTextarea
                blankLines
                noteCallouts
                value={body}
                onChange={setBody}
                aria-label="Page overview"
                placeholder={
                  seed.pageFocus === PAGE_FOCUSES.vocabulary
                    ? "Overview — what belongs in this vocabulary page? (optional)"
                    : seed.pageFocus === PAGE_FOCUSES.source
                      ? "Overview — what are you learning from this source? (optional)"
                      : seed.pageFocus === PAGE_FOCUSES.grammar
                        ? "Overview — supporting notes for this guide (optional)"
                        : "Notes — reflections, ideas, or another topic…"
                }
                className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none min-h-32"
                style={inputStyle}
              />
            )}

            {!isCopy && isStructured && (
              <Field>
                <label htmlFor="new-page-date" className="text-xs" style={{ color: C.mut }}>
                  Date (optional)
                </label>
                <div className="flex gap-2">
                  <input
                    id="new-page-date"
                    type="date"
                    value={pageDate}
                    onChange={(e) => setPageDate(e.target.value)}
                    className="flex-1 text-sm rounded-xl border px-3 py-2.5 outline-none"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setPageDate(pageDate ? "" : localDate())}
                    className="text-xs px-3 rounded-xl border"
                    style={inputStyle}
                  >
                    {pageDate ? "clear" : "today"}
                  </button>
                </div>
              </Field>
            )}

            {sourceEnabled && (
              <div className="space-y-2">
                <div>
                  <div className="text-xs" style={{ color: C.mut }}>Source details — optional</div>
                  <div className="text-xs mt-0.5" style={{ color: C.mut }}>
                    These identify the work or part of a work this notebook is about.
                  </div>
                </div>
                <Field>
                  <label htmlFor="new-source-format" className="text-xs" style={{ color: C.mut }}>
                    Format
                  </label>
                  <select
                    id="new-source-format"
                    value={sourceFormat}
                    onChange={(event) => setSourceFormat(event.target.value)}
                    className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none"
                    style={inputStyle}
                  >
                    {SOURCE_FORMAT_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </Field>
                <input
                  value={sourceCreator}
                  onChange={(event) => setSourceCreator(event.target.value)}
                  aria-label="Creator"
                  placeholder="Creator (optional)"
                  className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none"
                  style={inputStyle}
                />
                <input
                  value={sourceScope}
                  onChange={(event) => setSourceScope(event.target.value)}
                  aria-label="Scope"
                  placeholder="Scope — whole work, chapter, episode… (optional)"
                  className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none"
                  style={inputStyle}
                />
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  aria-label="Primary URL"
                  placeholder="Primary URL (optional)"
                  className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none"
                  style={inputStyle}
                />
                {sourceUrlError && (
                  <div role="alert" className="text-xs" style={{ color: C.red }}>
                    {sourceUrlError}
                  </div>
                )}
                <textarea
                  value={sourceContext}
                  onChange={(event) => setSourceContext(event.target.value)}
                  aria-label="Source context"
                  placeholder="Context — class, trip, recommendation… (optional)"
                  className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none min-h-20"
                  style={inputStyle}
                />
              </div>
            )}

            {grammarEnabled && (
              <div className="space-y-2">
                <Field>
                  <label htmlFor="new-grammar-key-idea" className="text-xs" style={{ color: C.mut }}>
                    Key idea — optional
                  </label>
                  <textarea
                    id="new-grammar-key-idea"
                    value={grammarKeyIdea}
                    onChange={(event) => setGrammarKeyIdea(event.target.value)}
                    placeholder="The central distinction or rule in your own words"
                    className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none min-h-20"
                    style={inputStyle}
                  />
                </Field>
                <div>
                  <div className="text-xs" style={{ color: C.mut }}>Guide sections</div>
                  <div className="text-xs mt-0.5" style={{ color: C.mut }}>
                    Rename the starter sections or add your own before creating the guide.
                  </div>
                </div>
                {sectionNames.map((name, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      value={name}
                      onChange={(event) =>
                        setSectionNames(
                          sectionNames.map((entry, itemIndex) =>
                            itemIndex === index ? event.target.value : entry
                          )
                        )
                      }
                      aria-label={`Grammar section ${index + 1} name`}
                      placeholder={`Section ${index + 1}`}
                      className="flex-1 min-w-0 text-sm rounded-xl border px-3 py-2.5 outline-none"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      aria-label={`Remove Grammar section ${index + 1}`}
                      onClick={() => setSectionNames(sectionNames.filter((_, itemIndex) => itemIndex !== index))}
                      className="min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg border"
                      style={inputStyle}
                    >
                      <X size={15} style={{ color: C.mut }} />
                    </button>
                  </div>
                ))}
                <Button type="button" tone="quiet" aria-label="Add section" onClick={() => setSectionNames([...sectionNames, ""])}>
                  <Plus size={14} /> Section
                </Button>
                {grammarDraft.error && (
                  <div role="alert" className="text-xs" style={{ color: C.red }}>
                    {grammarDraft.error}
                  </div>
                )}
              </div>
            )}

            {collectionEnabled && (
              <div className="space-y-2">
                <div>
                  <div className="text-xs" style={{ color: C.mut }}>Vocabulary groups — optional</div>
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
                <Button type="button" tone="quiet" aria-label="Add group" onClick={() => setGroupNames([...groupNames, ""])}>
                  <Plus size={14} /> Group
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
              <Button type="button" tone="quiet" aria-label="Add meaning" onClick={() => setMeanings([...meanings, newMeaning()])}>
                <Plus size={14} /> Meaning
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
                        ? { background: C.pen, color: C.onAccent }
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
            <MarkdownTextarea
              value={notes}
              onChange={setNotes}
              placeholder="First note (optional) — a mnemonic, a gotcha, where you heard it"
              className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none min-h-16"
              style={inputStyle}
            />
          </>
        )}

        {(!isPage || !isCopy) && (
          <TagInput tags={tags} allTags={allTags} onChange={setTags} placeholder="add a tag" />
        )}

        {problem && <div className="text-xs" style={{ color: C.red }}>{problem}</div>}

        <button
          onClick={submit}
          disabled={!ready}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm"
          style={{ background: ready ? C.pen : C.disabled }}
        >
          {isPage
            ? isCopy
              ? "Copy page"
              : seed.pageFocus === PAGE_FOCUSES.source
                ? "Add Source notebook"
                : seed.pageFocus === PAGE_FOCUSES.grammar
                  ? "Add Grammar guide"
                  : seed.pageFocus === PAGE_FOCUSES.vocabulary
                    ? "Add vocabulary page"
                    : "Add notes page"
            : "Add to cuaderno"}
        </button>
      </div>
    </div>
  );
}
