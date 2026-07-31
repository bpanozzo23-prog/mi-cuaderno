import { BookMarked, Download, Search, Plus } from "lucide-react";
import { C, SERIF, Button } from "../theme.jsx";

/**
 * What the notebook says when it has nothing to show.
 *
 * The dictionary is deliberately not browsable — §1 frames it as a reference you look
 * things up in, and 10,278 entries is a list nobody scrolls. But that made it invisible:
 * an empty notebook said "add your first word" and gave no sign that a dictionary existed
 * at all, and on a device that has not downloaded it yet, searching quietly found nothing.
 *
 * So the empty state answers the question the owner is actually asking — "is anything
 * here?" — differently depending on whether this device has the dictionary.
 */

function Hint({ icon: Icon, children }) {
  return (
    <div className="flex items-start gap-2 text-sm text-left" style={{ color: C.mut }}>
      <Icon size={15} className="shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

export default function EmptyState({ hasItems, searching, query, dictionary, onOpenSettings }) {
  const installed = Boolean(dictionary);
  const wordCount = dictionary?.counts?.entries?.toLocaleString();

  if (searching) {
    return (
      <div className="py-14 px-2 space-y-3 text-center">
        <div className="text-sm" style={{ color: C.mut }}>
          Nothing matches “{query.trim()}”.
        </div>
        {!installed && (
          <div className="space-y-2.5 pt-1">
            <Hint icon={BookMarked}>
              The dictionary is not on this device yet — that is where most words live. It is a one-time
              download and then works offline.
            </Hint>
            <Button onClick={onOpenSettings}>
              <Download size={15} /> Get the dictionary
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (!hasItems) {
    return (
      <div className="py-12 px-2 text-center">
        <div className="text-lg" style={{ fontFamily: SERIF, color: C.ink }}>
          Your cuaderno is empty.
        </div>

        <div className="mt-4 space-y-2.5 max-w-xs mx-auto">
          <Hint icon={Plus}>Add a word, a phrase or a page with the + button.</Hint>
          {installed ? (
            <Hint icon={Search}>
              Or look something up — {wordCount} words are on this device. Try <em>casa</em>, an inflected
              form like <em>tuvimos</em>, or an English meaning like <em>take out</em>.
            </Hint>
          ) : (
            <Hint icon={BookMarked}>
              Or download the dictionary once and look up thousands of words offline, conjugations and
              examples included.
            </Hint>
          )}
        </div>

        {!installed && (
          <div className="mt-4">
            <Button onClick={onOpenSettings}>
              <Download size={15} /> Get the dictionary
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="text-sm text-center py-16" style={{ color: C.mut }}>
      Nothing matches that filter.
    </div>
  );
}
