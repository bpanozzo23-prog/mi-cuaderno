import { resolveEntry, isDictKey, dictionaryInstalled } from "./ref/entries.js";
import { updateItem } from "./items.js";

/**
 * The §5 seam for LINKS, as DictAttachment already does it for attachments.
 *
 * `linkedKeys[]` may point into the reference layer (§6), and a `dict:` key can go stale
 * across a dataset rebuild. Until now the detail screen resolved these with a plain bulk-get
 * and quietly dropped anything that failed, which got two things wrong:
 *
 *   - a renamed entry was dropped even though the alias map (§6) knew its new id, and
 *   - a genuinely dead link vanished with no explanation, which for a link the owner
 *     deliberately made is data loss they cannot see.
 *
 * So links now get the same manners as attachments: resolve through the alias map first,
 * rewrite the key when an alias answers, and say so plainly when nothing answers.
 *
 * "Not installed" is NOT "orphaned" (Phase 2f). With no dictionary on this device there is
 * nothing to say and nothing the owner could do, so dictionary links stay hidden.
 */
export async function resolveLinkedKeys(item) {
  const keys = (item?.linkedKeys || []).filter(isDictKey);
  if (!keys.length || !(await dictionaryInstalled())) return { entries: [], orphans: [] };

  const resolved = await Promise.all(keys.map(async (key) => ({ key, ...(await resolveEntry(key)) })));

  const entries = [];
  const orphans = [];
  const rewrites = new Map();

  for (const { key, entry, resolvedFrom } of resolved) {
    if (!entry) {
      orphans.push(key);
      continue;
    }
    entries.push(entry);
    // The alias map found it under a new id. Rewrite the link rather than leaving it pointing
    // at an id that will orphan on the next rebuild too. Not an `edit`: the owner changed
    // nothing, the dataset did (the Phase 2f rule, applied to links instead of attachments).
    if (resolvedFrom) rewrites.set(key, entry.id);
  }

  if (rewrites.size) {
    const next = (item.linkedKeys || []).map((key) => rewrites.get(key) || key);
    await updateItem(item.id, { linkedKeys: [...new Set(next)] }, { logEdit: false });
  }

  return { entries, orphans, rewritten: rewrites.size > 0 };
}
