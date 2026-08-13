import { replayReviewLadder } from "./review.js";

const REVIEW_TYPES = new Set(["review_pass", "review_fail"]);
const TRICKY_ON = "tricky_on";
const TRICKY_OFF = "tricky_off";

const compareMilestones = (a, b) =>
  String(a.at || "").localeCompare(String(b.at || "")) || a.order - b.order;

/**
 * The intentionally sparse story of one lexical item. Routine views and individual grades are
 * ignored; every row is reconstructed from the existing item plus event log.
 */
export function deriveBiographyMilestones(item, events = []) {
  if (item?.type !== "lexical") return [];
  const itemEvents = events
    .filter((event) => event?.itemKey === item.id)
    .sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
  const milestones = [];

  const created = itemEvents.find((event) => event.type === "create");
  const savedAt = created?.at || item.createdAt || null;
  if (savedAt) milestones.push({ kind: "saved", at: savedAt, order: 0 });

  const reviews = itemEvents.filter((event) => REVIEW_TYPES.has(event.type));
  const steps = replayReviewLadder(reviews);
  if (steps.length) milestones.push({ kind: "first_review", at: steps[0].at, order: 10 });

  const reachedBoxes = new Set();
  let wasGraduated = false;
  for (const step of steps) {
    if (!reachedBoxes.has(step.box)) {
      reachedBoxes.add(step.box);
      milestones.push({ kind: "box", at: step.at, box: step.box, order: 20 });
    }
    if (step.graduated && !wasGraduated) {
      milestones.push({ kind: "retired", at: step.at, order: 30 });
    }
    wasGraduated = step.graduated;
  }

  let openTricky = null;
  for (const event of itemEvents) {
    if (event.type === TRICKY_ON) {
      if (!openTricky) openTricky = event;
    } else if (event.type === TRICKY_OFF && openTricky) {
      milestones.push({
        kind: "tricky",
        at: openTricky.at,
        endedAt: event.at,
        open: false,
        order: 15,
      });
      openTricky = null;
    }
  }
  if (openTricky) {
    milestones.push({
      kind: "tricky",
      at: openTricky.at,
      endedAt: null,
      open: true,
      order: 15,
    });
  }

  return milestones
    .sort(compareMilestones)
    .map(({ order, ...milestone }) => milestone);
}
