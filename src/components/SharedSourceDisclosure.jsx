import { useEffect, useId, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { C, MONO, SERIF } from "../theme.jsx";
import { sharedSourceOriginLabel, sharedSourcePeers } from "../lib/sharedSources.js";

/** Exact shared-source peers shown inline beneath one saved URL. */
export default function SharedSourceDisclosure({
  items = [],
  currentItemId,
  url,
  onOpen,
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const peers = useMemo(
    () => sharedSourcePeers(items, currentItemId, url),
    [currentItemId, items, url]
  );

  useEffect(() => {
    setOpen(false);
  }, [currentItemId, url]);

  if (!peers.length || typeof onOpen !== "function") return null;

  return (
    <div className="border-t pt-1" style={{ borderColor: C.line }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-xs font-semibold"
        style={{ color: C.pen }}
      >
        <span>Also from this source · {peers.length}</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      <div id={panelId} hidden={!open} className="space-y-1.5 pb-1">
        {peers.map((row) => {
          const metadata = [
            row.kindLabel,
            row.roleLabel,
            row.date,
            sharedSourceOriginLabel(row.origins),
          ].filter(Boolean).join(" · ");
          return (
            <button
              type="button"
              key={row.itemId}
              onClick={() => onOpen(row.itemId)}
              className="flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 py-2 text-left"
              style={{ background: C.paper, borderColor: C.line }}
            >
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
                  {row.heading}
                </span>
                <span className="mt-0.5 block break-words text-[11px]" style={{ color: C.mut, fontFamily: MONO }}>
                  {metadata}
                </span>
              </span>
              <ExternalLink size={13} className="shrink-0" style={{ color: C.mut }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
