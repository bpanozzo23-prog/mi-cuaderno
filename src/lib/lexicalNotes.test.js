import { describe, expect, it } from "vitest";
import { lexicalNotePreview, lexicalNotesPlainText } from "./lexicalNotes.js";

const ROOT = "note-section:11111111-1111-4111-8111-111111111111";
const CHILD = "note-section:22222222-2222-4222-8222-222222222222";
const OTHER = "note-section:33333333-3333-4333-8333-333333333333";

describe("lexical Notes projections", () => {
  it("projects General note first and named sections in canonical depth-first order", () => {
    const item = {
      notes: "> [!TIP]\n> General advice.",
      noteSections: [
        { id: ROOT, parentId: null, name: "Usage", body: "Use with care." },
        { id: OTHER, parentId: null, name: "Examples", body: "A sentence." },
        { id: CHILD, parentId: ROOT, name: "Register", body: "Informal." },
      ],
    };

    expect(lexicalNotesPlainText(item)).toBe([
      "General advice.",
      "Usage",
      "Use with care.",
      "Usage › Register",
      "Informal.",
      "Examples",
      "A sentence.",
    ].join("\n"));
    expect(lexicalNotePreview(item)).toBe("General advice.");
  });

  it("falls through blank General notes to the first nonblank canonical named section", () => {
    const item = {
      notes: "",
      noteSections: [
        { id: ROOT, parentId: null, name: "Usage", body: "" },
        { id: OTHER, parentId: null, name: "Examples", body: "Later." },
        { id: CHILD, parentId: ROOT, name: "Register", body: "First body." },
      ],
    };

    expect(lexicalNotePreview(item)).toBe("Usage › Register: First body.");
  });
});
