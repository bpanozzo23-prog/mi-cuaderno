import remarkParse from "remark-parse";
import { unified } from "unified";
import { describe, expect, it } from "vitest";
import { shiftListLevel } from "./markdownLines.js";

const parser = unified().use(remarkParse);

/** How the reader will actually nest the text: each item's own words, then its sub-items. */
function outline(markdown) {
  const walk = (list) => list.children.map((item) => {
    const words = item.children
      .filter((child) => child.type === "paragraph")
      .map((paragraph) => paragraph.children.map((node) => node.value ?? "").join(""))
      .join(" ");
    const sublists = item.children.filter((child) => child.type === "list");
    return sublists.length ? [words, ...sublists.map(walk)] : words;
  });
  return parser.parse(markdown).children.filter((node) => node.type === "list").map(walk);
}

/** Shift with the caret at the end of `line` (0-based) unless a range is given. */
function shiftLine(value, line, direction) {
  const lines = value.split("\n");
  const caret = lines.slice(0, line + 1).join("\n").length;
  return shiftListLevel(value, caret, caret, direction);
}

describe("shiftListLevel", () => {
  it("indents a bullet into a sub-bullet of the item above", () => {
    const shifted = shiftLine("- uno\n- dos", 1, "indent");

    expect(shifted.value).toBe("- uno\n  - dos");
    expect(outline(shifted.value)).toEqual([[["uno", ["dos"]]]]);
    expect([shifted.selectionStart, shifted.selectionEnd]).toEqual([13, 13]);
  });

  it("indents a numbered item far enough to nest and restarts the sub-list at 1", () => {
    const shifted = shiftLine("1. uno\n2. dos", 1, "indent");

    expect(shifted.value).toBe("1. uno\n   1. dos");
    expect(outline(shifted.value)).toEqual([[["uno", ["dos"]]]]);
  });

  it("nests under a wide number's content column", () => {
    const shifted = shiftLine("10. diez\n11. once", 1, "indent");

    expect(shifted.value).toBe("10. diez\n    1. once");
    expect(outline(shifted.value)).toEqual([[["diez", ["once"]]]]);
  });

  it("joins an existing sub-list and continues its numbering", () => {
    const shifted = shiftLine("1. uno\n   1. a\n2. dos", 2, "indent");

    expect(shifted.value).toBe("1. uno\n   1. a\n   2. dos");
    expect(outline(shifted.value)).toEqual([[["uno", ["a", "dos"]]]]);
  });

  it("can nest a bullet under a numbered item", () => {
    const shifted = shiftLine("1. uno\n- nota", 1, "indent");

    expect(shifted.value).toBe("1. uno\n   - nota");
    expect(outline(shifted.value)).toEqual([[["uno", ["nota"]]]]);
  });

  it("goes one level at a time and never skips a level", () => {
    const once = shiftLine("- uno\n  - dos", 1, "indent");
    expect(once).toBeNull();

    const twice = shiftLine("- uno\n  - dos\n  - tres", 2, "indent");
    expect(twice.value).toBe("- uno\n  - dos\n    - tres");
    expect(outline(twice.value)).toEqual([[["uno", [["dos", ["tres"]]]]]]);
  });

  it("leaves the first item of a list, prose and items after a paragraph alone", () => {
    expect(shiftLine("- uno", 0, "indent")).toBeNull();
    expect(shiftLine("Hola\nadiós", 1, "indent")).toBeNull();
    expect(shiftLine("- uno\n\nPárrafo\n\n- dos", 4, "indent")).toBeNull();
  });

  it("nests across the blank line of a loose list", () => {
    const shifted = shiftLine("- uno\n\n- dos", 2, "indent");

    expect(shifted.value).toBe("- uno\n\n  - dos");
    expect(outline(shifted.value)).toEqual([[["uno", ["dos"]]]]);
  });

  it("carries an item's own sub-items along when it moves", () => {
    const shifted = shiftLine("- a\n- b\n  - b1\n  más de b1\n- c", 1, "indent");

    expect(shifted.value).toBe("- a\n  - b\n    - b1\n    más de b1\n- c");
    expect(outline(shifted.value)).toEqual([[["a", [["b", ["b1\nmás de b1"]]]], "c"]]);
  });

  it("keeps sub-items attached when a renumbered item's marker grows wider", () => {
    const nine = Array.from({ length: 9 }, (_, index) => `   ${index + 1}. i${index + 1}`).join("\n");
    const value = `1. a\n${nine}\n2. b\n   - b1`;
    const shifted = shiftLine(value, 10, "indent");

    expect(shifted.value).toBe(`1. a\n${nine}\n   10. b\n       - b1`);
    const subItems = Array.from({ length: 9 }, (_, index) => `i${index + 1}`);
    expect(outline(shifted.value)).toEqual([[["a", [...subItems, ["b", ["b1"]]]]]]);
  });

  it("moves several selected items together and keeps their relative structure", () => {
    const value = "- a\n- b\n  - b1\n- c\n- d";
    const start = value.indexOf("- b");
    const end = value.indexOf("- c") + 3;
    const shifted = shiftListLevel(value, start, end, "indent");

    expect(shifted.value).toBe("- a\n  - b\n    - b1\n  - c\n- d");
    expect(outline(shifted.value)).toEqual([[["a", [["b", ["b1"]], "c"]], "d"]]);
    // The selection began at the line start, so it still covers the whole moved lines.
    expect(shifted.value.slice(shifted.selectionStart, shifted.selectionEnd)).toBe("  - b\n    - b1\n  - c");
  });

  it("renumbers several selected numbered items into a new sub-list", () => {
    const value = "1. a\n2. b\n3. c";
    const shifted = shiftListLevel(value, value.indexOf("2."), value.length, "indent");

    expect(shifted.value).toBe("1. a\n   1. b\n   2. c");
  });

  it("outdents a sub-bullet back to its parent's level with its own sub-items", () => {
    const shifted = shiftLine("- a\n  - b\n    - b1", 1, "outdent");

    expect(shifted.value).toBe("- a\n- b\n  - b1");
    expect(outline(shifted.value)).toEqual([["a", ["b", ["b1"]]]]);
  });

  it("outdents a numbered sub-item to follow its parent's number", () => {
    const shifted = shiftLine("1. uno\n   1. a", 1, "outdent");

    expect(shifted.value).toBe("1. uno\n2. a");
    expect(outline(shifted.value)).toEqual([["uno", "a"]]);
  });

  it("outdents from a deeper level by exactly one level", () => {
    const shifted = shiftLine("- a\n  - b\n    - c", 2, "outdent");

    expect(shifted.value).toBe("- a\n  - b\n  - c");
    expect(outline(shifted.value)).toEqual([[["a", ["b", "c"]]]]);
  });

  it("does nothing when outdenting an item already at the left margin", () => {
    expect(shiftLine("- a\n- b", 1, "outdent")).toBeNull();
    expect(shiftLine("Hola", 0, "outdent")).toBeNull();
  });

  it("keeps the caret on the same text and leaves a caret at the line start in place", () => {
    const value = "- uno\n- dos";
    const inWord = shiftListLevel(value, value.indexOf("os"), value.indexOf("os"), "indent");
    expect(inWord.value.slice(inWord.selectionStart)).toBe("os");

    const atStart = shiftListLevel(value, 6, 6, "indent");
    expect(atStart.selectionStart).toBe(6);

    const back = shiftListLevel(inWord.value, inWord.selectionStart, inWord.selectionStart, "outdent");
    expect(back.value).toBe(value);
    expect(back.value.slice(back.selectionStart)).toBe("os");
  });

  it("treats a tab as a CommonMark tab stop", () => {
    const shifted = shiftLine("- a\n\t- b\n\t- c", 2, "outdent");

    expect(shifted.value).toBe("- a\n\t- b\n- c");
  });
});
