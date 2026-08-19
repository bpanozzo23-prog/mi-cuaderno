import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Link2, PenLine, Quote, Tags } from "lucide-react";
import { C, SERIF } from "../theme.jsx";
import { CUIDAR_KINDS, cuidarSuggestions } from "../lib/cuidar.js";
import { MAINTENANCE_VIEWS } from "../lib/organization.js";

/**
 * The Cuidar hub — optional notebook-tending invitations behind the landing's quiet door.
 *
 * Deliberately not a full hub: no search, no Refine, no list ownership. It frames a few
 * concrete sampled invitations per category and hands every "see all" to the existing
 * Browse-all maintenance views, so the real lists live in one place only.
 */

const quietFocus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-pen)]";

const ITEM_CATEGORIES = {
  [CUIDAR_KINDS.connect]: {
    Icon: Link2,
    label: "Conectar",
    invitation: "Estas entradas todavía no tienen conexiones.",
    view: MAINTENANCE_VIEWS.unlinked,
  },
  [CUIDAR_KINDS.complete]: {
    Icon: PenLine,
    label: "Completar",
    invitation: "A estas entradas les falta su significado.",
    view: MAINTENANCE_VIEWS.missingMeaning,
  },
  [CUIDAR_KINDS.examples]: {
    Icon: Quote,
    label: "Dar ejemplos",
    invitation: "Un ejemplo propio las afianza.",
    view: MAINTENANCE_VIEWS.missingExamples,
  },
};

function itemTitle(item) {
  return item?.type === "page" ? item.title || "Untitled page" : item?.term || "Untitled item";
}

function CategoryIcon({ Icon }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
      style={{ background: C.roleSourcePale, color: C.roleSourceInk }}
    >
      <Icon size={17} aria-hidden="true" />
    </span>
  );
}

function ItemCategoryCard({ category, onSelect, onSeeAll }) {
  const { Icon, label, invitation, view } = ITEM_CATEGORIES[category.kind];
  return (
    <section
      aria-label={label}
      className="rounded-2xl border p-3"
      style={{ background: C.card, borderColor: C.line }}
    >
      <div className="flex items-center gap-3">
        <CategoryIcon Icon={Icon} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-bold leading-tight" style={{ color: C.ink, fontFamily: SERIF }}>
            {label}
          </h2>
          <p className="mt-0.5 text-xs" style={{ color: C.entryMeaning }}>
            {invitation}
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {category.sample.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect?.(item.id)}
            className={`min-h-11 max-w-full truncate rounded-full border px-3.5 text-[14px] ${quietFocus}`}
            style={{
              background: C.paper,
              borderColor: C.chipBorder,
              color: C.ink,
              fontFamily: SERIF,
            }}
          >
            {itemTitle(item)}
          </button>
        ))}
      </div>
      {category.count > category.sample.length && (
        <button
          type="button"
          onClick={() => onSeeAll?.(view)}
          className={`mt-1 flex min-h-11 items-center gap-1 text-sm font-semibold ${quietFocus}`}
          style={{ color: C.pen }}
        >
          Ver las {category.count}
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

function TagTwinsCard({ category, onReviewTags }) {
  return (
    <section
      aria-label="Etiquetas gemelas"
      className="rounded-2xl border p-3"
      style={{ background: C.card, borderColor: C.line }}
    >
      <div className="flex items-center gap-3">
        <CategoryIcon Icon={Tags} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-bold leading-tight" style={{ color: C.ink, fontFamily: SERIF }}>
            Etiquetas gemelas
          </h2>
          <p className="mt-0.5 text-xs" style={{ color: C.entryMeaning }}>
            Solo cambian las mayúsculas — ¿son la misma etiqueta?
          </p>
        </div>
      </div>
      <div className="mt-2.5 space-y-1">
        {category.sample.map((variants) => (
          <p
            key={variants[0].toLowerCase()}
            className="truncate text-[14px]"
            style={{ color: C.ink, fontFamily: SERIF }}
          >
            {variants.join(" · ")}
          </p>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onReviewTags?.()}
        className={`mt-1 flex min-h-11 items-center gap-1 text-sm font-semibold ${quietFocus}`}
        style={{ color: C.pen }}
      >
        Revisar en Ajustes
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </section>
  );
}

export default function CuidarHub({
  notebook,
  visitKey = null,
  random = Math.random,
  now = new Date(),
  onBack,
  backLabel = "Cuaderno",
  onSelect,
  onSeeAll,
  onReviewTags,
}) {
  const { items } = notebook;

  // Re-sampled per arrival, not per notebook change: App keeps this screen mounted behind
  // `hidden`, so the visit key — not elapsed renders — is what makes each visit a fresh draw.
  const suggestions = useMemo(
    () => cuidarSuggestions(items, { now, random }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, visitKey]
  );

  return (
    <>
      <header
        className="sticky top-0 z-20 border-b px-3 py-3"
        style={{ background: C.card, borderColor: C.line }}
      >
        <div className="grid min-h-11 grid-cols-[1fr_auto_1fr] items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center justify-self-start text-sm"
            style={{ color: C.pen }}
          >
            <ChevronLeft size={18} /> {backLabel}
          </button>
          <h1 className="text-lg font-semibold" style={{ fontFamily: SERIF, color: C.ink }}>
            Cuidar mi cuaderno
          </h1>
          <span aria-hidden="true" />
        </div>
      </header>

      <main className="px-4 pb-28 pt-4" style={{ background: C.paper }}>
        <p className="text-sm" style={{ color: C.entryMeaning }}>
          Pequeñas mejoras, sin prisa.
        </p>

        {suggestions.length === 0 ? (
          <div
            className="mt-4 rounded-2xl border px-4 py-6 text-center"
            style={{ background: C.card, borderColor: C.line }}
          >
            <p className="text-[16px] font-bold" style={{ color: C.ink, fontFamily: SERIF }}>
              Todo está en orden.
            </p>
            <p className="mt-1 text-sm" style={{ color: C.entryMeaning }}>
              No hay nada que cuidar hoy.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {suggestions.map((category) =>
              category.kind === CUIDAR_KINDS.tagTwins ? (
                <TagTwinsCard key={category.kind} category={category} onReviewTags={onReviewTags} />
              ) : (
                <ItemCategoryCard
                  key={category.kind}
                  category={category}
                  onSelect={onSelect}
                  onSeeAll={onSeeAll}
                />
              )
            )}
          </div>
        )}
      </main>
    </>
  );
}
