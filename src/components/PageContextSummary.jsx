import { C } from "../theme.jsx";

/**
 * Where one word is actually used — up to two active page contexts plus a remaining count.
 *
 * Shared by the Cuaderno card and the Words & phrases hub card so the two surfaces can never
 * describe the same placements differently. Callers pass contexts from
 * `activePageContextsForLexical`, which already leaves disabled structures out (§7).
 */
export default function PageContextSummary({ contexts = [] }) {
  if (contexts.length === 0) return null;

  return (
    <div
      className="mt-2 rounded-lg border px-2.5 py-2 text-xs"
      style={{ borderColor: C.line, background: C.paper }}
    >
      <div className="font-semibold" style={{ color: C.mut }}>
        {contexts.length === 1 ? "Used in 1 page context" : `Used in ${contexts.length} page contexts`}
      </div>
      {contexts.slice(0, 2).map((context, index) => (
        <div
          key={`${context.pageId}:${context.kind}:${context.label}:${index}`}
          className="mt-1 truncate"
          style={{ color: C.ink }}
        >
          {context.pageTitle} · {context.label}{context.detail ? ` · ${context.detail}` : ""}
        </div>
      ))}
      {contexts.length > 2 && (
        <div className="mt-1" style={{ color: C.mut }}>+{contexts.length - 2} more</div>
      )}
    </div>
  );
}
