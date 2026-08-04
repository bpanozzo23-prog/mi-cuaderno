import {
  db,
  allPrefs,
  setPref,
  upgradeItemV3,
  upgradePageItemV2,
  upgradePageItemV4,
} from "./db.js";
import { APP_VERSION, SCHEMA_VERSION } from "../version.js";
import { nowIso } from "../lib/dates.js";
import {
  MEANING_POS_OPTIONS,
  USAGE_LABELS,
  VERB_BEHAVIORS,
  upgradeLexicalItemV1,
} from "../lib/meanings.js";
import {
  isDictKey,
  isMeaningKey,
  isPageGroupKey,
  isSourceCaptureKey,
  isUserKey,
} from "../lib/ids.js";
import { isPageProfile, PINNED_PAGE_IDS_PREF } from "../lib/pageProfiles.js";
import { validatePageStructures } from "../lib/pageKinds.js";
import {
  isDirectionalRelationshipType,
  RELATIONSHIP_SUBJECTS,
  RELATIONSHIP_TYPES,
} from "../lib/relationships.js";

/**
 * Backup is the disaster-recovery mechanism, not a convenience (brief section 10).
 * The envelope excludes the reference dictionary (replaceable) and, from Phase 6,
 * the API key (never exported).
 */
export const BACKUP_FORMAT = "mi-cuaderno-backup";
export const LAST_BACKUP_PREF = "lastBackupAt";
export { PINNED_PAGE_IDS_PREF };

export async function buildBackup() {
  const [userItems, events, preferences] = await Promise.all([
    db.items.toArray(),
    db.events.toArray(),
    allPrefs(),
  ]);
  const candidate = {
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    appVersion: APP_VERSION,
    userItems,
    events,
    preferences,
  };
  const checked = validateBackup(candidate);
  if (!checked.ok) throw new Error(`The current notebook could not be backed up: ${checked.errors.join(" ")}`);
  return checked.envelope;
}

export function backupFilename(envelope) {
  const stamp = (envelope?.exportedAt || nowIso()).replace(/[:.]/g, "-").slice(0, 19);
  return `mi-cuaderno-backup-${stamp}.json`;
}

export async function recordBackupTaken(at = nowIso()) {
  return setPref(LAST_BACKUP_PREF, at);
}

/* ---------- validation ---------- */

const isString = (v) => typeof v === "string";
const isNonEmptyString = (v) => isString(v) && v.trim() !== "";

function validateStringArray(value, where, errors, allowed = null) {
  if (!Array.isArray(value)) return errors.push(`${where} must be an array`);
  value.forEach((entry, index) => {
    if (!isNonEmptyString(entry)) errors.push(`${where}[${index}] must be a nonblank string`);
    else if (allowed && !allowed.includes(entry)) errors.push(`${where}[${index}] is not supported`);
  });
}

function validateExample(example, where, errors) {
  if (!example || typeof example !== "object" || Array.isArray(example)) {
    return errors.push(`${where} is not an object`);
  }
  if (!isNonEmptyString(example.es)) errors.push(`${where}.es is missing`);
  if (!isString(example.en)) errors.push(`${where}.en must be a string`);
}

function validateExamples(value, where, errors) {
  if (!Array.isArray(value)) return errors.push(`${where} must be an array`);
  value.forEach((example, index) => validateExample(example, `${where}[${index}]`, errors));
}

function validateMediaLinks(value, where, errors) {
  if (!Array.isArray(value)) return errors.push(`${where} must be an array`);
  value.forEach((media, index) => {
    const mediaWhere = `${where}[${index}]`;
    if (!media || typeof media !== "object" || Array.isArray(media)) {
      errors.push(`${mediaWhere} is not an object`);
      return;
    }
    if (!isNonEmptyString(media.url) || !/^https?:\/\//i.test(media.url)) {
      errors.push(`${mediaWhere}.url must be an http(s) URL`);
    }
    if (!isString(media.label)) errors.push(`${mediaWhere}.label must be a string`);
  });
}

function validateMeaning(meaning, where, errors, seenMeaningIds) {
  if (!meaning || typeof meaning !== "object" || Array.isArray(meaning)) {
    return errors.push(`${where} is not an object`);
  }
  if (!isMeaningKey(meaning.id)) errors.push(`${where}.id must be a personal meaning id`);
  else if (seenMeaningIds.has(meaning.id)) errors.push(`Duplicate meaning id "${meaning.id}".`);
  else seenMeaningIds.add(meaning.id);
  if (!isNonEmptyString(meaning.gloss)) errors.push(`${where}.gloss is missing`);
  if (!isString(meaning.usageCue)) errors.push(`${where}.usageCue must be a string`);
  validateStringArray(meaning.regions, `${where}.regions`, errors);
  validateStringArray(meaning.usageLabels, `${where}.usageLabels`, errors, USAGE_LABELS);
  if (!MEANING_POS_OPTIONS.includes(meaning.posOverride)) errors.push(`${where}.posOverride is not supported`);
  validateStringArray(meaning.verbBehavior, `${where}.verbBehavior`, errors, VERB_BEHAVIORS);
  if (!isString(meaning.note)) errors.push(`${where}.note must be a string`);
  validateExamples(meaning.examples, `${where}.examples`, errors);
}

const comparableGroupName = (name) => name.trim().normalize("NFKC").toLocaleLowerCase();

function validateCollection(collection, where, errors, seenGroupIds) {
  if (!collection || typeof collection !== "object" || Array.isArray(collection)) {
    errors.push(`${where} must be an object`);
    return;
  }
  if (!Array.isArray(collection.groups)) {
    errors.push(`${where}.groups must be an array`);
    return;
  }

  const seenNames = new Set();
  collection.groups.forEach((group, groupIndex) => {
    const groupWhere = `${where}.groups[${groupIndex}]`;
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      errors.push(`${groupWhere} is not an object`);
      return;
    }

    if (!isPageGroupKey(group.id)) {
      errors.push(`${groupWhere}.id must be a page-group UUID`);
    } else if (seenGroupIds.has(group.id)) {
      errors.push(`Duplicate page group id "${group.id}".`);
    } else {
      seenGroupIds.add(group.id);
    }

    if (!isNonEmptyString(group.name)) {
      errors.push(`${groupWhere}.name must be a nonblank string`);
    } else {
      if (group.name !== group.name.trim()) errors.push(`${groupWhere}.name must be trimmed`);
      const comparableName = comparableGroupName(group.name);
      if (seenNames.has(comparableName)) {
        errors.push(`${where}.groups must have unique names`);
      } else {
        seenNames.add(comparableName);
      }
    }

    validateStringArray(group.itemKeys, `${groupWhere}.itemKeys`, errors);
  });
}

function validateLinkAnnotations(value, where, errors) {
  if (!Array.isArray(value)) return errors.push(`${where} must be an array`);

  const seenTargets = new Set();
  value.forEach((annotation, index) => {
    const annotationWhere = `${where}[${index}]`;
    if (!annotation || typeof annotation !== "object" || Array.isArray(annotation)) {
      errors.push(`${annotationWhere} is not an object`);
      return;
    }

    if (!isNonEmptyString(annotation.targetKey) ||
        (!isUserKey(annotation.targetKey) && !isDictKey(annotation.targetKey))) {
      errors.push(`${annotationWhere}.targetKey must be a personal or dictionary key`);
    } else if (seenTargets.has(annotation.targetKey)) {
      errors.push(`${where} contains more than one annotation for "${annotation.targetKey}"`);
    } else {
      seenTargets.add(annotation.targetKey);
    }

    if (!RELATIONSHIP_TYPES.includes(annotation.type)) {
      errors.push(`${annotationWhere}.type is not supported`);
    }
    if (!RELATIONSHIP_SUBJECTS.includes(annotation.subject)) {
      errors.push(`${annotationWhere}.subject must be "owner" or "target"`);
    } else if (RELATIONSHIP_TYPES.includes(annotation.type) &&
               !isDirectionalRelationshipType(annotation.type) && annotation.subject !== "owner") {
      errors.push(`${annotationWhere}.subject must be "owner" for a symmetric relationship`);
    }

    if (!isString(annotation.note)) {
      errors.push(`${annotationWhere}.note must be a string`);
    } else {
      if (annotation.note !== annotation.note.trim()) errors.push(`${annotationWhere}.note must be trimmed`);
      if (annotation.type === "related" && annotation.note === "") {
        errors.push(`${annotationWhere} must be omitted when Related has no note`);
      }
    }
  });
}

function validateItem(
  item,
  index,
  errors,
  schemaVersion,
  seenMeaningIds,
  seenGroupIds,
  seenCaptureIds,
  seenSectionIds,
  seenGrammarExampleIds
) {
  const where = `userItems[${index}]`;
  if (!item || typeof item !== "object" || Array.isArray(item)) return errors.push(`${where} is not an object`);
  if (!isNonEmptyString(item.id)) errors.push(`${where}.id is missing`);
  if (item.type !== "lexical" && item.type !== "page") {
    errors.push(`${where}.type must be "lexical" or "page"`);
  }
  if (!isString(item.createdAt)) errors.push(`${where}.createdAt is missing`);
  if (!isString(item.updatedAt)) errors.push(`${where}.updatedAt is missing`);
  validateStringArray(item.tags, `${where}.tags`, errors);
  validateStringArray(item.linkedKeys, `${where}.linkedKeys`, errors);
  if (schemaVersion >= 4) validateLinkAnnotations(item.linkAnnotations, `${where}.linkAnnotations`, errors);
  validateMediaLinks(item.mediaLinks, `${where}.mediaLinks`, errors);
  if (item.type === "lexical") {
    if (!isNonEmptyString(item.term)) errors.push(`${where}.term is missing`);
    if (item.form !== "word" && item.form !== "phrase") {
      errors.push(`${where}.form must be "word" or "phrase"`);
    }
    if (item.dictKey !== null && item.dictKey !== undefined && !isString(item.dictKey)) {
      errors.push(`${where}.dictKey must be a string or null`);
    }
    if (schemaVersion === 1) {
      if (item.pos !== undefined && !MEANING_POS_OPTIONS.includes(item.pos)) errors.push(`${where}.pos is not supported`);
    } else if (!MEANING_POS_OPTIONS.includes(item.pos)) errors.push(`${where}.pos is not supported`);
    if (!isString(item.notes)) errors.push(`${where}.notes must be a string`);
    validateExamples(item.myExamples, `${where}.myExamples`, errors);
    if (schemaVersion === 1) {
      if (item.translation !== undefined && !isString(item.translation)) {
        errors.push(`${where}.translation must be a string`);
      }
    } else {
      if (!Array.isArray(item.meanings)) errors.push(`${where}.meanings must be an array`);
      else item.meanings.forEach((meaning, meaningIndex) =>
        validateMeaning(meaning, `${where}.meanings[${meaningIndex}]`, errors, seenMeaningIds)
      );
    }
  }
  if (item.type === "page") {
    if (!isString(item.title)) errors.push(`${where}.title is missing`);
    if (!isString(item.body)) errors.push(`${where}.body must be a string`);
    if (item.pageDate !== null && item.pageDate !== undefined && !isString(item.pageDate)) {
      errors.push(`${where}.pageDate must be a string or null`);
    }
    if (schemaVersion === 3 || schemaVersion === 4) {
      if (!isPageProfile(item.pageProfile)) {
        errors.push(`${where}.pageProfile must be "general" or "collection"`);
      }
      validateCollection(item.collection, `${where}.collection`, errors, seenGroupIds);
    } else if (schemaVersion === 5) {
      errors.push(...validatePageStructures(item, {
        where,
        seenGroupIds,
        seenCaptureIds,
        seenSectionIds,
        seenExampleIds: seenGrammarExampleIds,
      }));
    }
  }
}

function validateV4References(userItems, errors) {
  const itemsById = new Map(
    userItems
      .filter((item) => item && typeof item === "object" && !Array.isArray(item) && isNonEmptyString(item.id))
      .map((item) => [item.id, item])
  );
  const seenPersonalPairs = new Map();

  userItems.forEach((item, itemIndex) => {
    if (!item || typeof item !== "object" || Array.isArray(item) || !Array.isArray(item.linkAnnotations)) return;
    const where = `userItems[${itemIndex}]`;

    item.linkAnnotations.forEach((annotation, annotationIndex) => {
      if (!annotation || typeof annotation !== "object" || Array.isArray(annotation)) return;
      const annotationWhere = `${where}.linkAnnotations[${annotationIndex}]`;
      const targetKey = annotation.targetKey;
      if (!isUserKey(targetKey) && !isDictKey(targetKey)) return;

      if (!Array.isArray(item.linkedKeys) || !item.linkedKeys.includes(targetKey)) {
        errors.push(`${annotationWhere}.targetKey must match an outgoing linkedKeys entry`);
      }
      if (!isUserKey(targetKey)) return;

      if (!itemsById.has(targetKey)) {
        errors.push(`${annotationWhere}.targetKey points to a missing personal item`);
        return;
      }

      const pairKey = [item.id, targetKey].sort().join("\u0000");
      const firstWhere = seenPersonalPairs.get(pairKey);
      if (firstWhere) {
        errors.push(`${annotationWhere} duplicates the personal connection annotation at ${firstWhere}`);
      } else {
        seenPersonalPairs.set(pairKey, annotationWhere);
      }
    });
  });
}

function validateV5VocabularyReferences(item, itemKeys, where, itemsById, errors) {
  if (!Array.isArray(itemKeys)) return;
  itemKeys.forEach((key, index) => {
    if (!isUserKey(key)) return;
    const keyWhere = `${where}[${index}]`;
    const target = itemsById.get(key);
    if (!target) {
      errors.push(`${keyWhere} points to a missing personal item`);
    } else if (target.type !== "lexical") {
      errors.push(`${keyWhere} must point to a personal lexical item`);
    }
    if (!Array.isArray(item.linkedKeys) || !item.linkedKeys.includes(key)) {
      errors.push(`${keyWhere} must also be an outgoing page link`);
    }
  });
}

/** Exact contextual references remain layout metadata; linkedKeys is still their authority. */
function validateV5References(userItems, errors) {
  const itemsById = new Map(
    userItems
      .filter((item) => item && typeof item === "object" && !Array.isArray(item) && isNonEmptyString(item.id))
      .map((item) => [item.id, item])
  );

  userItems.forEach((item, itemIndex) => {
    if (!item || item.type !== "page") return;
    const where = `userItems[${itemIndex}]`;

    if (Array.isArray(item.source?.captures)) {
      item.source.captures.forEach((capture, captureIndex) => {
        validateV5VocabularyReferences(
          item,
          capture?.itemKeys,
          `${where}.source.captures[${captureIndex}].itemKeys`,
          itemsById,
          errors
        );
      });
    }

    if (!Array.isArray(item.grammar?.sections)) return;
    item.grammar.sections.forEach((section, sectionIndex) => {
      if (!Array.isArray(section?.examples)) return;
      section.examples.forEach((example, exampleIndex) => {
        const exampleWhere = `${where}.grammar.sections[${sectionIndex}].examples[${exampleIndex}]`;
        validateV5VocabularyReferences(
          item,
          example?.itemKeys,
          `${exampleWhere}.itemKeys`,
          itemsById,
          errors
        );

        const ref = example?.sourceCaptureRef;
        if (!ref || !isUserKey(ref.pageId) || !isSourceCaptureKey(ref.captureId)) return;
        const targetPage = itemsById.get(ref.pageId);
        if (!targetPage) {
          errors.push(`${exampleWhere}.sourceCaptureRef.pageId points to a missing personal item`);
          return;
        }
        if (targetPage.type !== "page") {
          errors.push(`${exampleWhere}.sourceCaptureRef.pageId must point to a page`);
          return;
        }
        if (!(targetPage.source?.captures || []).some((capture) => capture?.id === ref.captureId)) {
          errors.push(`${exampleWhere}.sourceCaptureRef.captureId points to a missing Source capture`);
        }
        if (ref.pageId !== item.id && (!Array.isArray(item.linkedKeys) || !item.linkedKeys.includes(ref.pageId))) {
          errors.push(`${exampleWhere}.sourceCaptureRef.pageId must also be an outgoing page link`);
        }
      });
    });
  });
}

function validateV3References(userItems, preferences, errors) {
  const itemsById = new Map(
    userItems
      .filter((item) => item && typeof item === "object" && !Array.isArray(item) && isNonEmptyString(item.id))
      .map((item) => [item.id, item])
  );

  userItems.forEach((item, itemIndex) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return;
    const where = `userItems[${itemIndex}]`;

    if (Array.isArray(item.linkedKeys)) {
      item.linkedKeys.forEach((key, keyIndex) => {
        if (isUserKey(key) && !itemsById.has(key)) {
          errors.push(`${where}.linkedKeys[${keyIndex}] points to a missing personal item`);
        }
      });
    }

    if (item.type !== "page" || !Array.isArray(item.collection?.groups)) return;
    const placed = new Set();
    item.collection.groups.forEach((group, groupIndex) => {
      if (!Array.isArray(group?.itemKeys)) return;
      group.itemKeys.forEach((key, keyIndex) => {
        const keyWhere = `${where}.collection.groups[${groupIndex}].itemKeys[${keyIndex}]`;
        if (!isUserKey(key)) {
          errors.push(`${keyWhere} must be a personal lexical item id`);
          return;
        }
        if (placed.has(key)) {
          errors.push(`${where}.collection contains duplicate placement for "${key}"`);
        } else {
          placed.add(key);
        }
        const target = itemsById.get(key);
        if (!target) {
          errors.push(`${keyWhere} points to a missing personal item`);
        } else if (target.type !== "lexical") {
          errors.push(`${keyWhere} must point to a personal lexical item`);
        }
        if (!Array.isArray(item.linkedKeys) || !item.linkedKeys.includes(key)) {
          errors.push(`${keyWhere} must also be an outgoing page link`);
        }
      });
    });
  });

  if (!Object.prototype.hasOwnProperty.call(preferences, PINNED_PAGE_IDS_PREF)) return;
  const pinnedPageIds = preferences[PINNED_PAGE_IDS_PREF];
  if (!Array.isArray(pinnedPageIds)) {
    errors.push(`preferences.${PINNED_PAGE_IDS_PREF} must be an array`);
    return;
  }
  const seenPinnedIds = new Set();
  pinnedPageIds.forEach((id, index) => {
    const where = `preferences.${PINNED_PAGE_IDS_PREF}[${index}]`;
    if (!isUserKey(id)) {
      errors.push(`${where} must be a personal page id`);
      return;
    }
    if (seenPinnedIds.has(id)) errors.push(`preferences.${PINNED_PAGE_IDS_PREF} must not contain duplicates`);
    else seenPinnedIds.add(id);
    const target = itemsById.get(id);
    if (!target) errors.push(`${where} points to a missing page`);
    else if (target.type !== "page") errors.push(`${where} must point to a page`);
  });
}

function validateSchemaState(userItems, events, preferences, schemaVersion, errors) {
  const seenMeaningIds = new Set();
  const seenGroupIds = new Set();
  const seenCaptureIds = new Set();
  const seenSectionIds = new Set();
  const seenGrammarExampleIds = new Set();
  userItems.forEach((item, index) =>
    validateItem(
      item,
      index,
      errors,
      schemaVersion,
      seenMeaningIds,
      seenGroupIds,
      seenCaptureIds,
      seenSectionIds,
      seenGrammarExampleIds
    )
  );
  events.forEach((event, index) => validateEvent(event, index, errors));

  const seenItemIds = new Set();
  for (const item of userItems) {
    if (item && seenItemIds.has(item.id)) errors.push(`Duplicate item id "${item.id}".`);
    if (item) seenItemIds.add(item.id);
  }

  if (schemaVersion >= 3) validateV3References(userItems, preferences, errors);
  if (schemaVersion >= 4) validateV4References(userItems, errors);
  if (schemaVersion === 5) validateV5References(userItems, errors);
}

function upgradeItemsV1ToV2(userItems) {
  return userItems.map((item) => {
    const upgraded = upgradeLexicalItemV1(item);
    if (upgraded.type !== "lexical") return upgraded;
    const { translation: _translation, ...withoutTranslation } = upgraded;
    return withoutTranslation;
  });
}

const upgradeItemsV2ToV3 = (userItems) => userItems.map((item) => upgradePageItemV2(item));
const upgradeItemsV3ToV4 = (userItems) => userItems.map((item) => upgradeItemV3(item));
const upgradeItemsV4ToV5 = (userItems) => userItems.map((item) => upgradePageItemV4(item));

function validateEvent(event, index, errors) {
  const where = `events[${index}]`;
  if (!event || typeof event !== "object") return errors.push(`${where} is not an object`);
  if (!isNonEmptyString(event.id)) errors.push(`${where}.id is missing`);
  if (!isNonEmptyString(event.type)) errors.push(`${where}.type is missing`);
  if (!isString(event.at)) errors.push(`${where}.at is missing`);
  if (!isString(event.localDate)) errors.push(`${where}.localDate is missing`);
  if (event.itemKey !== null && event.itemKey !== undefined && !isString(event.itemKey)) {
    errors.push(`${where}.itemKey must be a string or null`);
  }
}

/**
 * Validates the ENTIRE file before anything touches the database (brief section 10).
 * Returns { ok, errors, envelope, summary } — never throws on bad input.
 */
export function validateBackup(raw) {
  const errors = [];
  let parsed = raw;

  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, errors: ["The file is not valid JSON."], envelope: null, summary: null };
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, errors: ["The file is not a backup envelope."], envelope: null, summary: null };
  }
  if (parsed.format !== BACKUP_FORMAT) {
    errors.push(`Not a Mi cuaderno backup (format is "${parsed.format ?? "missing"}").`);
  }
  if (typeof parsed.schemaVersion !== "number") {
    errors.push("schemaVersion is missing.");
  } else if (parsed.schemaVersion > SCHEMA_VERSION) {
    errors.push(
      `This backup is schema version ${parsed.schemaVersion}, newer than this app understands (${SCHEMA_VERSION}). Update the app first.`
    );
  } else if (![1, 2, 3, 4, 5].includes(parsed.schemaVersion)) {
    errors.push(`Schema version ${parsed.schemaVersion} is not supported.`);
  }
  if (!Array.isArray(parsed.userItems)) errors.push("userItems must be an array.");
  if (!Array.isArray(parsed.events)) errors.push("events must be an array.");
  if (parsed.preferences !== undefined &&
      (typeof parsed.preferences !== "object" || parsed.preferences === null || Array.isArray(parsed.preferences))) {
    errors.push("preferences must be an object.");
  }
  if (errors.length > 0) return { ok: false, errors, envelope: null, summary: null };

  const sourceSchemaVersion = parsed.schemaVersion;
  const preferences = parsed.preferences ?? {};
  validateSchemaState(parsed.userItems, parsed.events, preferences, sourceSchemaVersion, errors);
  if (errors.length > 0) return { ok: false, errors, envelope: null, summary: null };

  // Upgrade one schema at a time and deeply validate each resulting shape. Import cannot rely on
  // Dexie's migration because the currently open database is already at the newest schema.
  let upgradedItems = parsed.userItems.map((item) => ({ ...item }));
  let upgradedSchemaVersion = sourceSchemaVersion;
  if (upgradedSchemaVersion === 1) {
    upgradedItems = upgradeItemsV1ToV2(upgradedItems);
    upgradedSchemaVersion = 2;
    validateSchemaState(upgradedItems, parsed.events, preferences, upgradedSchemaVersion, errors);
  }
  if (errors.length > 0) return { ok: false, errors, envelope: null, summary: null };

  if (upgradedSchemaVersion === 2) {
    upgradedItems = upgradeItemsV2ToV3(upgradedItems);
    upgradedSchemaVersion = 3;
    validateSchemaState(upgradedItems, parsed.events, preferences, upgradedSchemaVersion, errors);
  }
  if (errors.length > 0) return { ok: false, errors, envelope: null, summary: null };

  if (upgradedSchemaVersion === 3) {
    upgradedItems = upgradeItemsV3ToV4(upgradedItems);
    upgradedSchemaVersion = 4;
    validateSchemaState(upgradedItems, parsed.events, preferences, upgradedSchemaVersion, errors);
  }
  if (errors.length > 0) return { ok: false, errors, envelope: null, summary: null };

  if (upgradedSchemaVersion === 4) {
    upgradedItems = upgradeItemsV4ToV5(upgradedItems);
    upgradedSchemaVersion = 5;
    validateSchemaState(upgradedItems, parsed.events, preferences, upgradedSchemaVersion, errors);
  }
  if (errors.length > 0) return { ok: false, errors, envelope: null, summary: null };

  // Duplicate EVENT ids are skipped rather than rejected, per brief section 10.
  const seenEventIds = new Set();
  const events = [];
  let skippedEvents = 0;
  for (const event of parsed.events) {
    if (event && seenEventIds.has(event.id)) {
      skippedEvents += 1;
      continue;
    }
    if (event) seenEventIds.add(event.id);
    events.push(event);
  }

  const envelope = {
    ...parsed,
    schemaVersion: SCHEMA_VERSION,
    userItems: upgradedItems,
    events,
    preferences,
  };
  const summary = {
    items: envelope.userItems.length,
    lexical: envelope.userItems.filter((i) => i.type === "lexical").length,
    pages: envelope.userItems.filter((i) => i.type === "page").length,
    events: events.length,
    skippedEvents,
    exportedAt: envelope.exportedAt ?? null,
    appVersion: envelope.appVersion ?? null,
    schemaVersion: sourceSchemaVersion,
    targetSchemaVersion: SCHEMA_VERSION,
    willUpgrade: sourceSchemaVersion < SCHEMA_VERSION,
  };
  return { ok: true, errors: [], envelope, summary };
}

/**
 * Replace-and-restore (the only supported mode in v1 — no merge). Runs in one
 * transaction: either the whole backup lands or nothing changes.
 * The caller is responsible for auto-exporting the current database first.
 */
export async function importBackup(envelope) {
  const { ok, errors, envelope: clean } = validateBackup(envelope);
  if (!ok) throw new Error(`Refusing to import: ${errors.join(" ")}`);

  const prefRows = Object.entries(clean.preferences).map(([key, value]) => ({ key, value }));

  await db.transaction("rw", db.items, db.events, db.prefs, async () => {
    await Promise.all([db.items.clear(), db.events.clear(), db.prefs.clear()]);
    if (clean.userItems.length) await db.items.bulkAdd(clean.userItems);
    if (clean.events.length) await db.events.bulkAdd(clean.events);
    if (prefRows.length) await db.prefs.bulkAdd(prefRows);
  });

  return { items: clean.userItems.length, events: clean.events.length, preferences: prefRows.length };
}
