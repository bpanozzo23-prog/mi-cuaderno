import { useEffect, useState } from "react";
import { C, Card, MONO, SectionTitle, SERIF } from "../theme.jsx";
import { normalize } from "../lib/normalize.js";
import { preparePhraseContainment } from "../lib/phraseContainment.js";

function ContainmentRows({ item, rows, onOpen }) {
  if (!rows.length) return null;
  const wordDetail = item.form === "word";
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold" style={{ color: C.ink }}>
        {wordDetail
          ? `Appears in ${rows.length} of your phrases`
          : "Built on words you know"}
      </div>
      <div className="space-y-1.5">
        {rows.map((row) => {
          const heading = wordDetail ? row.phrase.term : row.word.term;
          const differentSurface = !wordDetail
            && normalize(row.surface).trim() !== normalize(row.word.term).trim();
          return (
            <button
              type="button"
              key={row.item.id}
              onClick={() => onOpen(row.item.id)}
              className="min-h-11 w-full rounded-xl border px-3 py-2 text-left"
              style={{ background: C.card, borderColor: C.line }}
            >
              <span className="break-words text-sm font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
                {heading}
              </span>
              {differentSurface && (
                <span className="ml-2 text-xs" style={{ color: C.mut, fontFamily: MONO }}>
                  · {row.surface}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Render-time consolidation signals. Nothing in this component is connection authority. */
export default function KnowledgeConsolidation({
  item,
  items,
  onOpen,
  prepareContainment = preparePhraseContainment,
}) {
  const [containment, setContainment] = useState([]);

  useEffect(() => {
    let alive = true;
    setContainment([]);
    prepareContainment(item, items)
      .then((rows) => {
        if (alive) setContainment(rows);
      })
      .catch(() => {
        if (alive) setContainment([]);
      });
    return () => {
      alive = false;
    };
  }, [item, items, prepareContainment]);

  if (!containment.length) return null;
  return (
    <section aria-label="From your cuaderno">
      <SectionTitle>From your cuaderno</SectionTitle>
      <Card style={{ background: C.paper }}>
        <ContainmentRows item={item} rows={containment} onOpen={onOpen} />
      </Card>
    </section>
  );
}
