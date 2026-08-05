import { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  Copy,
  FileText,
  FolderPlus,
  Sigma,
  X,
} from "lucide-react";
import { C, SERIF, Card } from "../theme.jsx";
import {
  PAGE_RECIPES,
  PAGE_STARTER_FAMILIES,
  pageSeedFromRecipe,
} from "../lib/pageStarters.js";
import { isJournalPage } from "../lib/pageKinds.js";

const FAMILY_ICONS = {
  notes: FileText,
  vocabulary: FolderPlus,
  source: BookOpen,
  grammar: Sigma,
  copy: Copy,
};

function ChoiceCard({ title, description, icon: Icon = FileText, onClick, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
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
  );
}

/**
 * Family first, then a creation-only recipe (or an existing page skeleton). Only the resulting
 * structural seed leaves this sheet; family and recipe identities are never stored on the page.
 */
export default function PageStarterGallery({ items = [], onChoose, onClose }) {
  const [familyId, setFamilyId] = useState(null);
  const family = PAGE_STARTER_FAMILIES.find((candidate) => candidate.id === familyId) || null;
  const copyCandidates = useMemo(
    () =>
      items
        .filter((item) => item?.type === "page" && !isJournalPage(item))
        .sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "es")),
    [items]
  );

  const chooseRecipe = (recipeId) => onChoose(pageSeedFromRecipe(familyId, recipeId));

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
          <div className="min-w-0">
            {family && (
              <button
                type="button"
                onClick={() => setFamilyId(null)}
                className="inline-flex items-center gap-1 text-xs mb-1 min-h-8"
                style={{ color: C.pen }}
              >
                <ChevronLeft size={15} /> Page families
              </button>
            )}
            <div
              id="page-starter-title"
              className="font-semibold"
              style={{ fontFamily: SERIF, color: C.ink, fontSize: 18 }}
            >
              {family ? family.title : "What kind of page?"}
            </div>
            <div className="text-xs mt-0.5" style={{ color: C.mut }}>
              {family
                ? family.id === "copy"
                  ? "Choose a page. Its content and connections will not be copied."
                  : "Choose a starting structure. You can edit its names before adding the page."
                : "Choose a family first, then a starting structure."}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close page starters" className="p-1">
            <X size={18} style={{ color: C.mut }} />
          </button>
        </div>

        {!family && PAGE_STARTER_FAMILIES.map(({ id, title, description }) => (
          <ChoiceCard
            key={id}
            title={title}
            description={description}
            icon={FAMILY_ICONS[id]}
            onClick={() => setFamilyId(id)}
          />
        ))}

        {family && family.id !== "copy" && (PAGE_RECIPES[family.id] || []).map((recipe) => (
          <ChoiceCard
            key={recipe.id}
            title={recipe.title}
            description={recipe.description}
            icon={FAMILY_ICONS[family.id]}
            onClick={() => chooseRecipe(recipe.id)}
          />
        ))}

        {family?.id === "copy" && copyCandidates.map((page) => (
          <ChoiceCard
            key={page.id}
            title={page.title || "Untitled page"}
            description="Copy its focus, enabled structures, group names, and Grammar section names."
            icon={Copy}
            ariaLabel={`Copy structure from ${page.title || "Untitled page"}`}
            onClick={() => onChoose({ copySourcePageId: page.id })}
          />
        ))}

        {family?.id === "copy" && copyCandidates.length === 0 && (
          <Card>
            <div className="text-sm" style={{ color: C.ink }}>No Pages are available to copy yet.</div>
            <div className="text-xs mt-1" style={{ color: C.mut }}>
              Diario entries stay separate and are not offered as page structures.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
