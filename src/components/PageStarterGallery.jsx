import {
  FileText,
  FolderPlus,
  MessagesSquare,
  MapPin,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { C, SERIF, Card } from "../theme.jsx";

/**
 * Creation-only starting points. The transient `id` selects a card in this sheet; AddSheet
 * receives only `pageProfile` and editable group names, so no template identity reaches the
 * stored page.
 */
export const PAGE_STARTERS = [
  {
    id: "blank-page",
    title: "Blank page",
    description: "A general page for notes, sources, grammar, or a dated journal entry.",
    pageProfile: "general",
    groupNames: [],
    icon: FileText,
  },
  {
    id: "blank-collection",
    title: "Blank collection",
    description: "Start a vocabulary collection with no groups.",
    pageProfile: "collection",
    groupNames: [],
    icon: FolderPlus,
  },
  {
    id: "conversational-function",
    title: "Conversational function",
    description: "Questions · Answers · Reactions and follow-ups",
    pageProfile: "collection",
    groupNames: ["Questions", "Answers", "Reactions and follow-ups"],
    icon: MessagesSquare,
  },
  {
    id: "situation-context",
    title: "Situation/context",
    description: "Essentials · Questions and requests · Responses · Problems and follow-up",
    pageProfile: "collection",
    groupNames: [
      "Essentials",
      "Questions and requests",
      "Responses",
      "Problems and follow-up",
    ],
    icon: MapPin,
  },
  {
    id: "register-usage",
    title: "Register/usage",
    description: "Neutral · Formal · Informal · Use with care",
    pageProfile: "collection",
    groupNames: ["Neutral", "Formal", "Informal", "Use with care"],
    icon: SlidersHorizontal,
  },
];

export default function PageStarterGallery({ onChoose, onClose }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center"
      style={{ background: "rgba(33,42,61,0.35)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="page-starter-title"
        className="w-full max-w-md rounded-t-2xl p-4 pb-6 space-y-2 max-h-[88vh] overflow-y-auto"
        style={{ background: C.paper }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-3 mb-2">
          <div>
            <div
              id="page-starter-title"
              className="font-semibold"
              style={{ fontFamily: SERIF, color: C.ink, fontSize: 18 }}
            >
              Choose a starting point
            </div>
            <div className="text-xs mt-0.5" style={{ color: C.mut }}>
              Every group can be renamed before the page is added.
            </div>
          </div>
          <button onClick={onClose} aria-label="Close page starters" className="p-1">
            <X size={18} style={{ color: C.mut }} />
          </button>
        </div>

        {PAGE_STARTERS.map(({ id, title, description, icon: Icon, ...starter }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChoose(starter)}
            className="w-full text-left"
          >
            <Card className="flex items-start gap-3 p-4">
              <Icon size={18} style={{ color: C.pen, marginTop: 2, flexShrink: 0 }} />
              <div className="min-w-0">
                <div style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>{title}</div>
                <div className="text-xs mt-0.5 leading-relaxed" style={{ color: C.mut }}>
                  {description}
                </div>
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
