import { TriangleAlert } from "lucide-react";
import { C } from "../theme.jsx";

export default function DuplicateWarning({ kind }) {
  const message =
    kind === "page"
      ? "A page with this title is already in your cuaderno. You can still create another."
      : "A word or phrase with this term is already in your cuaderno. You can still create another for a different meaning.";

  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs"
      style={{ background: C.hiPale, borderColor: C.hiBorder, color: C.ink }}
    >
      <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
