import { MAINTENANCE_VIEWS, maintenanceItems, tagCountsIn } from "./organization.js";
import { caseVariantGroups } from "./tags.js";
import { isJournalEntry } from "./journal.js";

/**
 * Cuidar (Phase: knowledge-garden hub) — optional improvement invitations derived at render.
 *
 * Everything here is a pure derivation over the notebook already in memory: no stored task
 * state, no dismissal flags, no events. Categories reuse the maintenance-view derivations and
 * Ajustes' tag-twin definition so the hub can never disagree with the screens it links into.
 */

export const CUIDAR_GRACE_DAYS = 7;
export const CUIDAR_SAMPLE_SIZE = 3;

export const CUIDAR_KINDS = {
  connect: "connect",
  complete: "complete",
  examples: "examples",
  tagTwins: "tagTwins",
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * An entry added in the last few days is new, not neglected; only older entries are invited.
 * Unparseable dates cannot claim newness, so they stay eligible.
 */
function outsideGraceWindow(item, nowMs) {
  const createdAt = Date.parse(item?.createdAt);
  if (!Number.isFinite(nowMs) || !Number.isFinite(createdAt)) return true;
  return nowMs - createdAt >= CUIDAR_GRACE_DAYS * DAY_MS;
}

/** Uniform draw without replacement; tolerates non-finite draws like sampleWanderStart. */
function samplePool(pool, random) {
  const rest = [...pool];
  const picked = [];
  while (picked.length < CUIDAR_SAMPLE_SIZE && rest.length > 0) {
    const draw = Number(random());
    const index = Math.min(
      rest.length - 1,
      Math.max(0, Math.floor((Number.isFinite(draw) ? draw : 0) * rest.length))
    );
    picked.push(rest.splice(index, 1)[0]);
  }
  return picked;
}

/**
 * Returns [{ kind, count, sample }] for every category with at least one invitation, in fixed
 * category order. `sample` holds up to CUIDAR_SAMPLE_SIZE items (tag twins: exact-spelling
 * groups), drawn uniformly per call so every visit offers a fresh corner of the garden.
 *
 * Maintenance views are derived over the COMPLETE notebook (a word linked only from a Journal
 * entry is still linked) and Journal entries are then excluded from the results, matching the
 * root browse convention. Tag twins run over every item's tags, exactly as Ajustes derives its
 * "Possible duplicates", so both surfaces always show the same groups.
 */
export function cuidarSuggestions(items = [], { now = new Date(), random = Math.random } = {}) {
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  const nonJournal = (list) => list.filter((item) => !isJournalEntry(item));

  const connect = nonJournal(maintenanceItems(items, MAINTENANCE_VIEWS.unlinked))
    .filter((item) => outsideGraceWindow(item, nowMs));

  // No grace period: an entry without a meaning is incomplete from day one.
  const complete = nonJournal(maintenanceItems(items, MAINTENANCE_VIEWS.missingMeaning));
  const completeIds = new Set(complete.map((item) => item.id));

  // An entry that has no meaning yet is only invited once — the meaning is the deeper hole.
  const examples = nonJournal(maintenanceItems(items, MAINTENANCE_VIEWS.missingExamples))
    .filter((item) => outsideGraceWindow(item, nowMs) && !completeIds.has(item.id));

  const tagTwins = caseVariantGroups(tagCountsIn(items).map(({ tag }) => tag));

  return [
    { kind: CUIDAR_KINDS.connect, pool: connect },
    { kind: CUIDAR_KINDS.complete, pool: complete },
    { kind: CUIDAR_KINDS.examples, pool: examples },
    { kind: CUIDAR_KINDS.tagTwins, pool: tagTwins },
  ]
    .filter(({ pool }) => pool.length > 0)
    .map(({ kind, pool }) => ({
      kind,
      count: pool.length,
      sample: samplePool(pool, random),
    }));
}
