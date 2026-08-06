import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { C, SERIF, MONO, Card, Button } from "../theme.jsx";
import { newPageGroupKey } from "../lib/ids.js";
import { collectionGroupNameKey } from "../lib/collections.js";

const cloneGroups = (groups) => groups.map((group) => ({ ...group, itemKeys: [...group.itemKeys] }));
function moveAt(rows, index, offset) {
  const target = index + offset;
  if (target < 0 || target >= rows.length) return rows;
  const next = [...rows];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const referenceLabel = (count, singular, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

function ItemControls({
  item,
  index,
  total,
  groupId,
  groups,
  onReorder,
  onMove,
  onRemove,
  removalImpact,
  onConfirmRemove,
  onCancelRemove,
}) {
  const label = item?.term || "entry";
  return (
    <div>
      <div className="rounded-lg border px-2 py-2 flex items-center gap-2" style={{ borderColor: C.line, background: C.paper }}>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm" style={{ fontFamily: SERIF, color: C.ink, fontWeight: 600 }}>{item?.term || "Missing entry"}</div>
        </div>
        <button type="button" aria-label={`Move ${label} up`} disabled={index === 0 || Boolean(removalImpact)} onClick={() => onReorder(-1)} className="p-1 disabled:opacity-30">
          <ArrowUp size={14} style={{ color: C.mut }} />
        </button>
        <button type="button" aria-label={`Move ${label} down`} disabled={index === total - 1 || Boolean(removalImpact)} onClick={() => onReorder(1)} className="p-1 disabled:opacity-30">
          <ArrowDown size={14} style={{ color: C.mut }} />
        </button>
        <select
          aria-label={`Move ${label} to`}
          value={groupId || "ungrouped"}
          disabled={Boolean(removalImpact)}
          onChange={(event) => onMove(event.target.value === "ungrouped" ? null : event.target.value)}
          className="min-w-0 max-w-28 rounded border px-1.5 py-1 text-xs disabled:opacity-50"
          style={{ background: C.card, borderColor: C.line, color: C.ink }}
        >
          <option value="ungrouped">Not grouped yet</option>
          {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
        <button type="button" aria-label={`Remove ${label} from collection`} disabled={Boolean(removalImpact)} onClick={onRemove} className="p-1 disabled:opacity-50">
          <X size={14} style={{ color: C.red }} />
        </button>
      </div>

      {removalImpact && (
        <div
          role="alertdialog"
          aria-label={`Confirm removal of ${label}`}
          className="mt-2 rounded-lg border p-3"
          style={{ borderColor: C.dangerBorder, background: C.card }}
        >
          <div className="text-sm font-semibold" style={{ color: C.ink }}>
            Remove {label} from this page?
          </div>
          <div className="mt-1 text-xs leading-relaxed" style={{ color: C.mut }}>
            This also clears {referenceLabel(removalImpact.groups, "group placement")}, {referenceLabel(removalImpact.captures, "Source capture reference")}, and {referenceLabel(removalImpact.examples, "Grammar example reference")} ({referenceLabel(removalImpact.total, "saved reference")} total). Counts include hidden page structures.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button tone="dangerArmed" onClick={onConfirmRemove}>Remove and clear references</Button>
            <Button tone="quiet" onClick={onCancelRemove}>Keep vocabulary</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CollectionOrganizer({
  groups: initialGroups,
  ungroupedItemKeys: initialUngrouped,
  itemById,
  startWithNewGroup = false,
  removalImpactForKey,
  onCancel,
  onSave,
}) {
  const [groups, setGroups] = useState(() => {
    const initial = cloneGroups(initialGroups);
    return startWithNewGroup ? [...initial, { id: newPageGroupKey(), name: "New group", itemKeys: [] }] : initial;
  });
  const [ungrouped, setUngrouped] = useState(() => [...initialUngrouped]);
  const [removed, setRemoved] = useState(() => new Set());
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveProblem, setSaveProblem] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState(null);

  const nameKeys = groups.map((group) => collectionGroupNameKey(group.name));
  const hasBlank = nameKeys.some((name) => !name);
  const hasDuplicate = new Set(nameKeys.filter(Boolean)).size !== nameKeys.filter(Boolean).length;
  const validationError = hasBlank ? "Every group needs a name." : hasDuplicate ? "Group names must be unique." : "";
  const error = validationError || saveProblem;

  const initialSignature = useMemo(
    () => JSON.stringify({ groups: initialGroups, ungroupedItemKeys: initialUngrouped, removedItemKeys: [] }),
    [initialGroups, initialUngrouped]
  );
  const signature = JSON.stringify({ groups, ungroupedItemKeys: ungrouped, removedItemKeys: [...removed] });
  const changed = signature !== initialSignature;

  function listFor(groupId, sourceGroups = groups, sourceUngrouped = ungrouped) {
    return groupId ? sourceGroups.find((group) => group.id === groupId)?.itemKeys || [] : sourceUngrouped;
  }

  function replaceList(groupId, nextList) {
    if (!groupId) {
      setUngrouped(nextList);
      return;
    }
    setGroups((current) => current.map((group) => group.id === groupId ? { ...group, itemKeys: nextList } : group));
  }

  function moveItem(itemKey, fromGroupId, targetGroupId) {
    if (fromGroupId === targetGroupId) return;
    if (fromGroupId) {
      setGroups((current) => current.map((group) => group.id === fromGroupId
        ? { ...group, itemKeys: group.itemKeys.filter((key) => key !== itemKey) }
        : group));
    } else {
      setUngrouped((current) => current.filter((key) => key !== itemKey));
    }
    if (targetGroupId) {
      setGroups((current) => current.map((group) => group.id === targetGroupId
        ? { ...group, itemKeys: [...group.itemKeys.filter((key) => key !== itemKey), itemKey] }
        : group));
    } else {
      setUngrouped((current) => [...current.filter((key) => key !== itemKey), itemKey]);
    }
  }

  function removeItem(itemKey, fromGroupId) {
    replaceList(fromGroupId, listFor(fromGroupId).filter((key) => key !== itemKey));
    setRemoved((current) => new Set(current).add(itemKey));
  }

  function requestRemove(itemKey, fromGroupId) {
    const supplied = typeof removalImpactForKey === "function"
      ? removalImpactForKey(itemKey)
      : null;
    const impact = supplied && typeof supplied === "object"
      ? {
          groups: Math.max(0, Number(supplied.groups) || 0),
          captures: Math.max(0, Number(supplied.captures) || 0),
          examples: Math.max(0, Number(supplied.examples) || 0),
          total: Math.max(0, Number(supplied.total) || 0),
        }
      : null;
    if (!impact || impact.total === 0) {
      removeItem(itemKey, fromGroupId);
      return;
    }
    setPendingRemoval({ itemKey, fromGroupId, impact });
  }

  function renderItems(itemKeys, groupId) {
    return itemKeys.map((itemKey, index) => (
      <ItemControls
        key={itemKey}
        item={itemById.get(itemKey)}
        index={index}
        total={itemKeys.length}
        groupId={groupId}
        groups={groups}
        onReorder={(offset) => replaceList(groupId, moveAt(itemKeys, index, offset))}
        onMove={(target) => moveItem(itemKey, groupId, target)}
        onRemove={() => requestRemove(itemKey, groupId)}
        removalImpact={pendingRemoval?.itemKey === itemKey ? pendingRemoval.impact : null}
        onConfirmRemove={() => {
          if (!pendingRemoval || pendingRemoval.itemKey !== itemKey) return;
          removeItem(itemKey, pendingRemoval.fromGroupId);
          setPendingRemoval(null);
        }}
        onCancelRemove={() => setPendingRemoval(null)}
      />
    ));
  }

  return (
    <div>
      <div className="mb-4 rounded-lg border p-3" style={{ background: C.penPale, borderColor: C.line }}>
        <div className="text-sm font-semibold" style={{ color: C.ink }}>Organize collection</div>
        <div className="mt-0.5 text-xs" style={{ color: C.mut }}>Nothing changes until Save.</div>
      </div>

      <div className="space-y-4">
        {groups.map((group, groupIndex) => (
          <Card key={group.id}>
            <div className="flex items-center gap-2">
              <input
                aria-label={`Group ${groupIndex + 1} name`}
                value={group.name}
                onChange={(event) => setGroups((current) => current.map((candidate) => candidate.id === group.id
                  ? { ...candidate, name: event.target.value }
                  : candidate))}
                className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-sm font-semibold outline-none"
                style={{ background: C.card, borderColor: C.line, color: C.ink }}
              />
              <button type="button" aria-label={`Move group ${group.name} up`} disabled={groupIndex === 0} onClick={() => setGroups((current) => moveAt(current, groupIndex, -1))} className="p-1 disabled:opacity-30">
                <ArrowUp size={15} style={{ color: C.mut }} />
              </button>
              <button type="button" aria-label={`Move group ${group.name} down`} disabled={groupIndex === groups.length - 1} onClick={() => setGroups((current) => moveAt(current, groupIndex, 1))} className="p-1 disabled:opacity-30">
                <ArrowDown size={15} style={{ color: C.mut }} />
              </button>
              <button
                type="button"
                aria-label={`Delete group ${group.name}`}
                className="p-1"
                onClick={() => {
                  setPendingRemoval(null);
                  setUngrouped((current) => [...current, ...group.itemKeys]);
                  setGroups((current) => current.filter((candidate) => candidate.id !== group.id));
                }}
              >
                <Trash2 size={15} style={{ color: C.red }} />
              </button>
            </div>
            <div className="mt-2 text-[11px] uppercase" style={{ color: C.mut, fontFamily: MONO }}>
              {group.itemKeys.length} {group.itemKeys.length === 1 ? "item" : "items"}
            </div>
            <div className="mt-2 space-y-1.5">{renderItems(group.itemKeys, group.id)}</div>
          </Card>
        ))}

        <Card>
          <div className="text-sm font-semibold" style={{ color: C.ink }}>Not grouped yet</div>
          <div className="mt-1 text-[11px] uppercase" style={{ color: C.mut, fontFamily: MONO }}>
            {ungrouped.length} {ungrouped.length === 1 ? "item" : "items"}
          </div>
          <div className="mt-2 space-y-1.5">{renderItems(ungrouped, null)}</div>
        </Card>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          aria-label="New group name"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="New group name"
          className="min-w-0 flex-1 rounded-lg border px-2 py-2 text-sm outline-none"
          style={{ background: C.card, borderColor: C.line, color: C.ink }}
        />
        <Button
          tone="quiet"
          disabled={!newName.trim()}
          onClick={() => {
            setGroups((current) => [...current, { id: newPageGroupKey(), name: newName.trim(), itemKeys: [] }]);
            setNewName("");
          }}
        >
          <Plus size={14} /> Add group
        </Button>
      </div>

      {error && <div role="alert" className="mt-3 text-xs" style={{ color: C.red }}>{error}</div>}

      <div className="mt-5 flex gap-2 border-t pt-4" style={{ borderColor: C.line }}>
        <Button
          disabled={!changed || Boolean(validationError) || saving}
          onClick={async () => {
            setSaving(true);
            setSaveProblem("");
            try {
              await onSave({
                groups: groups.map((group) => ({ ...group, name: group.name.trim() })),
                ungroupedItemKeys: ungrouped,
                removedItemKeys: [...removed],
              });
            } catch (error) {
              setSaveProblem(error instanceof Error ? error.message : "The collection could not be saved.");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving…" : "Save organization"}
        </Button>
        <Button tone="quiet" onClick={onCancel} disabled={saving}>Cancel</Button>
      </div>
    </div>
  );
}
