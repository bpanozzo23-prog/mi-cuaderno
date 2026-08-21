import {
  canonicalNoteSections,
  newNoteSection,
  validateNoteSections,
} from "./pageKinds.js";
import { isNoteSectionKey } from "./ids.js";

const cloneSections = (sections = []) => sections.map((section) => ({ ...section }));

const organizationSignature = (sections = []) => JSON.stringify(
  canonicalNoteSections(sections).map((section) => ({
    id: section.id,
    parentId: section.parentId ?? null,
    name: section.name,
  }))
);

const assertValid = (sections) => {
  const errors = validateNoteSections(sections);
  if (errors.length) throw new Error(errors[0]);
};

/** Shared, pure Notes outline mutations for Pages and lexical items. */
export function saveNoteSectionMutation(sections = [], draft = {}) {
  const currentSections = cloneSections(sections);
  const sectionId = draft.id || null;
  const index = sectionId
    ? currentSections.findIndex((section) => section.id === sectionId)
    : -1;
  if (sectionId && (!isNoteSectionKey(sectionId) || index < 0)) {
    throw new Error("Notes section does not exist.");
  }

  const current = index >= 0 ? currentSections[index] : null;
  const section = current
    ? {
        ...current,
        name: String(draft.name ?? current.name).trim(),
        body: draft.body ?? current.body,
      }
    : newNoteSection(draft);
  if (current && section.name === current.name && section.body === current.body) {
    return { sections, section: current, changed: false };
  }

  if (index < 0) currentSections.push(section);
  else currentSections[index] = section;
  const nextSections = canonicalNoteSections(currentSections);
  assertValid(nextSections);
  return { sections: nextSections, section, changed: true };
}

export function deleteNoteSectionMutation(sections = [], sectionId) {
  if (!isNoteSectionKey(sectionId)) throw new Error("Notes section does not exist.");
  const currentSections = cloneSections(sections);
  const section = currentSections.find((candidate) => candidate.id === sectionId);
  if (!section) throw new Error("Notes section does not exist.");
  if (currentSections.some((candidate) => candidate.parentId === sectionId)) {
    throw new Error("Promote or move this section’s subsections first.");
  }
  const nextSections = currentSections.filter((candidate) => candidate.id !== sectionId);
  assertValid(nextSections);
  return { sections: nextSections, section, changed: true };
}

export function organizeNoteSectionsMutation(sections = [], drafts = []) {
  const currentSections = cloneSections(sections);
  const currentIds = new Set(currentSections.map((section) => section.id));
  const nextIds = drafts.map((section) => section?.id);
  const nextIdSet = new Set(nextIds);
  if (nextIdSet.size !== nextIds.length || nextIds.some((id) => !isNoteSectionKey(id))) {
    throw new Error("Notes organization section IDs must be stable and unique.");
  }
  if ([...currentIds].some((id) => !nextIdSet.has(id))) {
    throw new Error("Notes organization must include every current section exactly once.");
  }

  const sectionsById = new Map(currentSections.map((section) => [section.id, section]));
  const nextSections = canonicalNoteSections(drafts.map((draft) => {
    const current = sectionsById.get(draft.id);
    return {
      ...(current || {
        id: draft.id,
        parentId: null,
        body: "",
      }),
      parentId: Object.prototype.hasOwnProperty.call(draft, "parentId")
        ? draft.parentId
        : current?.parentId ?? null,
      name: String(draft.name || "").trim(),
    };
  }));
  assertValid(nextSections);

  // Imported v10 data may be valid but interleaved. Compare canonical organization on both
  // sides so merely opening and saving the organizer is a true no-op.
  if (organizationSignature(nextSections) === organizationSignature(currentSections)) {
    return { sections, changed: false };
  }
  return { sections: nextSections, changed: true };
}
