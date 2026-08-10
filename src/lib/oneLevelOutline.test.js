import { describe, expect, it } from "vitest";
import {
  canonicalOutline,
  moveOutlineSibling,
  outlineBreadcrumb,
  outlineCounts,
  outlineHierarchy,
  outlineNamesValid,
  outlineSiblingState,
  reparentOutlineRow,
  validateOneLevelOutline,
} from "./oneLevelOutline.js";

const ROOT_ONE = "outline:11111111-1111-4111-8111-111111111111";
const ROOT_TWO = "outline:22222222-2222-4222-8222-222222222222";
const CHILD = "outline:33333333-3333-4333-8333-333333333333";
const isOutlineId = (value) => typeof value === "string" && /^outline:[0-9a-f-]{36}$/i.test(value);
const nameKey = (value) => String(value || "").trim().toLocaleLowerCase("es");
const rows = () => [
  { id: CHILD, parentId: ROOT_ONE, name: "Child" },
  { id: ROOT_ONE, parentId: null, name: "Root one" },
  { id: ROOT_TWO, parentId: null, name: "Root two" },
];

describe("one-level outline mechanics", () => {
  it("derives hierarchy, canonical order, counts, breadcrumbs, and sibling positions", () => {
    const current = rows();
    const hierarchy = outlineHierarchy(current);
    expect(hierarchy.roots.map(({ id }) => id)).toEqual([ROOT_ONE, ROOT_TWO]);
    expect(hierarchy.childrenByParent.get(ROOT_ONE)).toEqual([current[0]]);
    expect(canonicalOutline(current).map(({ id }) => id)).toEqual([ROOT_ONE, CHILD, ROOT_TWO]);
    expect(outlineCounts(current)).toEqual({ sections: 2, subsections: 1 });
    expect(outlineBreadcrumb(current[0], current)).toBe("Root one › Child");
    expect(outlineSiblingState(canonicalOutline(current), ROOT_TWO).position).toBe(1);
  });

  it("moves only among siblings and reparents only beneath roots", () => {
    const canonical = canonicalOutline(rows());
    expect(moveOutlineSibling(canonical, ROOT_TWO, -1).map(({ id }) => id)).toEqual([
      ROOT_TWO,
      ROOT_ONE,
      CHILD,
    ]);
    expect(moveOutlineSibling(canonical, CHILD, -1)).toBe(canonical);
    expect(reparentOutlineRow(canonical, CHILD, ROOT_TWO).map(({ id, parentId }) => ({ id, parentId }))).toEqual([
      { id: ROOT_ONE, parentId: null },
      { id: ROOT_TWO, parentId: null },
      { id: CHILD, parentId: ROOT_TWO },
    ]);
    expect(reparentOutlineRow(canonical, ROOT_ONE, ROOT_TWO)).toBe(canonical);
  });

  it("shares sibling-name and hierarchy validation without owning domain content", () => {
    expect(outlineNamesValid(rows(), nameKey)).toBe(true);
    const duplicated = [...rows(), {
      id: "outline:44444444-4444-4444-8444-444444444444",
      parentId: ROOT_ONE,
      name: "child",
    }];
    expect(outlineNamesValid(duplicated, nameKey)).toBe(false);
    expect(validateOneLevelOutline(duplicated, {
      where: "outline",
      isId: isOutlineId,
      idLabel: "outline",
      normalizeName: nameKey,
    }).join(" ")).toMatch(/unique names among siblings/);
  });

  it.each([
    ["self parent", (draft) => { draft[1].parentId = ROOT_ONE; }, /itself/],
    ["dangling parent", (draft) => { draft[0].parentId = "outline:99999999-9999-4999-8999-999999999999"; }, /same page/],
    ["grandchild", (draft) => {
      draft.push({ id: "outline:44444444-4444-4444-8444-444444444444", parentId: CHILD, name: "Too deep" });
    }, /one subsection level/],
    ["cycle", (draft) => {
      draft[1].parentId = CHILD;
      draft[0].parentId = ROOT_ONE;
    }, /cycle/],
  ])("rejects a %s", (_label, mutate, expected) => {
    const draft = rows();
    mutate(draft);
    expect(validateOneLevelOutline(draft, {
      where: "outline",
      isId: isOutlineId,
      idLabel: "outline",
      normalizeName: nameKey,
    }).join(" ")).toMatch(expected);
  });
});
