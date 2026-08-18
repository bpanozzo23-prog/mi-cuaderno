/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Ajustes from "./Ajustes.jsx";
import { TagColorProvider } from "./TagChip.jsx";
import { TAG_SWATCHES } from "../lib/tagColors.js";

vi.mock("../db/db.js", () => ({
  db: {
    items: { count: vi.fn(() => new Promise(() => {})) },
    events: { count: vi.fn(() => new Promise(() => {})) },
  },
  getPref: vi.fn(() => new Promise(() => {})),
}));

vi.mock("../db/backup.js", () => ({
  buildBackup: vi.fn(),
  backupFilename: vi.fn(),
  validateBackup: vi.fn(),
  importBackup: vi.fn(),
  recordBackupTaken: vi.fn(),
  LAST_BACKUP_PREF: "lastBackup",
}));

vi.mock("../lib/persistence.js", () => ({
  storageStatus: vi.fn(() => new Promise(() => {})),
}));

vi.mock("../db/ref/entries.js", () => ({
  installedMeta: vi.fn(() => new Promise(() => {})),
}));

vi.mock("./DictionaryCard.jsx", () => ({
  default: () => <div>Dictionary settings</div>,
}));

vi.mock("./AiCard.jsx", () => ({
  default: () => <div>AI settings</div>,
}));

vi.mock("./TagManagementSheet.jsx", () => ({
  default: ({ source, initialDestination = "", onClose }) => (
    <div role="dialog" aria-label="Tag management preview">
      <div>{`Managing ${source} into ${initialDestination || "an empty destination"}`}</div>
      <button type="button" onClick={onClose}>Close tag management preview</button>
    </div>
  ),
}));

afterEach(cleanup);

const itemsFor = (tags) => tags.map((tag, index) => ({
  id: `user:${index}:${tag}`,
  type: "lexical",
  tags: [tag],
}));

function settings(items, {
  tagColors = {},
  onTagColorChange = vi.fn(),
} = {}) {
  return (
    <TagColorProvider colors={tagColors}>
      <Ajustes
        notebook={{ items }}
        tagColors={tagColors}
        onTagColorChange={onTagColorChange}
        onTagsChanged={vi.fn()}
      />
    </TagColorProvider>
  );
}

const visibleSwatchButtons = () => TAG_SWATCHES.flatMap((swatch) =>
  screen.queryAllByRole("button", { name: new RegExp(`^${swatch.label} for `) })
);

describe("Ajustes tag colours", () => {
  it("keeps 15 palettes collapsed and mounts only the selected tag's 11 swatches", async () => {
    const user = userEvent.setup();
    const onTagColorChange = vi.fn();
    const tags = Array.from({ length: 15 }, (_, index) => `tag-${String(index).padStart(2, "0")}`);
    render(settings(itemsFor(tags), {
      tagColors: { "tag-00": "red" },
      onTagColorChange,
    }));

    const firstToggle = screen.getByRole("button", {
      name: "Choose colour for tag-00; current Red",
    });
    const secondToggle = screen.getByRole("button", {
      name: "Choose colour for tag-01; current Plain",
    });

    expect(firstToggle.getAttribute("aria-expanded")).toBe("false");
    expect(visibleSwatchButtons()).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Manage tag tag-00" })).toBeTruthy();

    await user.click(firstToggle);
    const firstPalette = screen.getByRole("group", { name: "Colour for tag-00" });
    expect(firstToggle.getAttribute("aria-expanded")).toBe("true");
    expect(within(firstPalette).getAllByRole("button")).toHaveLength(11);
    expect(visibleSwatchButtons()).toHaveLength(11);
    expect(within(firstPalette).getByRole("button", { name: "Red for tag-00" }).getAttribute("aria-pressed"))
      .toBe("true");

    await user.click(within(firstPalette).getByRole("button", { name: "Blue for tag-00" }));
    expect(onTagColorChange).toHaveBeenCalledWith("tag-00", "blue");
    expect(screen.getByRole("group", { name: "Colour for tag-00" })).toBeTruthy();

    await user.click(secondToggle);
    expect(screen.queryByRole("group", { name: "Colour for tag-00" })).toBeNull();
    expect(screen.getByRole("group", { name: "Colour for tag-01" })).toBeTruthy();
    expect(visibleSwatchButtons()).toHaveLength(11);

    await user.click(secondToggle);
    expect(secondToggle.getAttribute("aria-expanded")).toBe("false");
    expect(visibleSwatchButtons()).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Manage tag tag-00" }));
    expect(screen.getByText("Managing tag-00 into an empty destination")).toBeTruthy();
  });
});

describe("Ajustes possible duplicate review", () => {
  it("stays collapsed, chooses no winner, and carries one neutral merge direction at a time", async () => {
    const user = userEvent.setup();
    const initialTags = ["verbs", "Verbs", "VERBS", "vérbs", "tu", "tú", "ano", "año"];
    const view = render(settings(itemsFor(initialTags)));

    const disclosure = screen.getByRole("button", { name: "Possible duplicates · 1" });
    expect(disclosure.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: "Keep spelling verbs" })).toBeNull();

    await user.click(disclosure);
    const keepButtons = ["VERBS", "Verbs", "verbs"].map((tag) =>
      screen.getByRole("button", { name: `Keep spelling ${tag}` })
    );
    expect(keepButtons.every((button) => button.getAttribute("aria-pressed") === "false")).toBe(true);
    expect(screen.queryByRole("button", { name: /Review .* → .*/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Keep spelling verbs" }));
    expect(screen.getByRole("button", { name: "Review Verbs → verbs" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Review VERBS → verbs" })).toBeTruthy();

    view.rerender(settings(itemsFor(initialTags.filter((tag) => tag !== "Verbs"))));
    expect(screen.queryByRole("button", { name: "Review Verbs → verbs" })).toBeNull();
    expect(screen.getByRole("button", { name: "Review VERBS → verbs" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Review VERBS → verbs" }));
    expect(screen.getByText("Managing VERBS into verbs")).toBeTruthy();
  });

  it("does not suggest accent-, diaeresis-, or ñ-only differences", () => {
    render(settings(itemsFor(["tu", "tú", "ano", "año", "pinguino", "pingüino"])));

    expect(screen.queryByRole("button", { name: /Possible duplicates/ })).toBeNull();
  });
});
