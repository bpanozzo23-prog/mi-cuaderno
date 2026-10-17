// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Ajustes from "./Ajustes.jsx";
import { db, clearAllPersonalData, setPref, getPref } from "../db/db.js";
import * as backup from "../db/backup.js";
import { downloadJson, readFileAsText } from "../lib/file.js";
import { makeLexical } from "../test/factories.js";
import { AI_API_KEY_PREF } from "../lib/aiPrefs.js";

vi.mock("../lib/file.js", () => ({ downloadJson: vi.fn(), readFileAsText: vi.fn() }));
vi.mock("../db/ref/entries.js", () => ({ installedMeta: vi.fn(async () => null) }));
vi.mock("./DictionaryCard.jsx", () => ({ default: () => null }));
vi.mock("./AiCard.jsx", () => ({ default: () => null }));

beforeEach(async () => {
  vi.clearAllMocks();
  await db.open();
  await clearAllPersonalData();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function seedInvalid() {
  const item = makeLexical({ tags: ["verbs"] });
  item.meanings[0].gloss = "";
  await db.items.add(item);
  await setPref(AI_API_KEY_PREF, "test-only-secret");
  return item;
}

async function showSettings(items = []) {
  const onDataReplaced = vi.fn();
  const view = render(<Ajustes notebook={{ items }} onDataReplaced={onDataReplaced} />);
  const count = await db.items.count();
  await screen.findByText(new RegExp(`${count} items · 0 events · last backup: never`));
  return { ...view, onDataReplaced };
}

describe("Settings backup safety", () => {
  it("shows a validation failure and downloads the captured rescue without counting a backup", async () => {
    const user = userEvent.setup();
    const item = await seedInvalid();
    await showSettings();
    await user.click(screen.getByRole("button", { name: "Export backup" }));
    expect(await screen.findByText(/normal backup could not be created/)).toBeTruthy();
    expect(screen.getByText(/gloss is missing/)).toBeTruthy();
    expect(downloadJson).not.toHaveBeenCalled();
    expect(await getPref(backup.LAST_BACKUP_PREF)).toBeNull();

    // A later edit must not change the already-captured rescue or trigger another validation.
    await db.items.update(item.id, { term: "changed later" });
    await user.click(screen.getByRole("button", { name: "Download rescue file" }));
    expect(await screen.findByRole("status")).toHaveProperty("textContent", expect.stringContaining("Rescue download requested"));
    expect(downloadJson).toHaveBeenCalledTimes(1);
    const [filename, rescue] = downloadJson.mock.calls[0];
    expect(filename).toMatch(/^mi-cuaderno-RESCUE-.*\.json$/);
    expect(rescue.stores.items).toEqual([item]);
    expect(JSON.stringify(rescue)).not.toContain("test-only-secret");
    expect(await getPref(AI_API_KEY_PREF)).toBe("test-only-secret");
    expect(await getPref(backup.LAST_BACKUP_PREF)).toBeNull();
    expect(screen.queryByText(/Backup downloaded/)).toBeNull();
  });

  it("keeps restore blocked after a failed safety export and rescue, then permits a validated retry", async () => {
    const user = userEvent.setup();
    const validFile = await backup.buildBackup();
    const item = await seedInvalid();
    const { container, onDataReplaced } = await showSettings();
    readFileAsText.mockResolvedValueOnce(JSON.stringify(validFile));
    await user.upload(container.querySelector('input[type="file"]'), new File(["backup"], "backup.json", { type: "application/json" }));
    await user.click(await screen.findByRole("button", { name: "Download current backup" }));
    await user.click(await screen.findByRole("button", { name: "Download rescue file" }));
    expect(await screen.findByRole("status")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /replace and restore/ })).toBeNull();
    expect(onDataReplaced).not.toHaveBeenCalled();
    expect(await db.items.get(item.id)).toEqual(item);

    const fixed = structuredClone(item);
    fixed.meanings[0].gloss = "repaired in the fixture";
    await db.items.put(fixed);
    await user.click(screen.getByRole("button", { name: "Download current backup" }));
    expect(await screen.findByRole("button", { name: /I saved it — replace and restore/ })).toBeTruthy();
    expect(downloadJson.mock.calls.at(-1)[0]).toMatch(/^before-import-mi-cuaderno-backup-/);
    expect(screen.queryByRole("button", { name: "Download rescue file" })).toBeNull();
    // Becoming ready is not consent to replace anything.
    expect(await db.items.get(item.id)).toEqual(fixed);
    expect(onDataReplaced).not.toHaveBeenCalled();
  });

  it("reports download failure without success or a backup date, and allows retry", async () => {
    const user = userEvent.setup();
    await showSettings();
    downloadJson.mockImplementationOnce(() => { throw new Error("Download failed"); });
    await user.click(screen.getByRole("button", { name: "Export backup" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Download failed");
    expect(screen.queryByRole("button", { name: "Download rescue file" })).toBeNull();
    expect(await getPref(backup.LAST_BACKUP_PREF)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Export backup" }));
    await screen.findByText("Backup downloaded. Keep it somewhere off this phone.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Export backup" }).disabled).toBe(false));
    expect(await getPref(backup.LAST_BACKUP_PREF)).toBe(downloadJson.mock.calls.at(-1)[1].exportedAt);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("propagates failed exports to the tag sheet instead of claiming success", async () => {
    const user = userEvent.setup();
    const item = await seedInvalid();
    await showSettings([item]);
    await user.click(screen.getByRole("button", { name: "Manage tag verbs" }));
    await user.click(screen.getByRole("button", { name: "Remove tag everywhere" }));
    await user.click(screen.getByRole("button", { name: "Export backup first" }));
    expect(await screen.findByText(/The notebook could not be backed up:/)).toBeTruthy();
    expect(screen.queryByText("Backup downloaded.")).toBeNull();
    expect(downloadJson).not.toHaveBeenCalled();
    expect(await db.items.get(item.id)).toEqual(item);
    expect(await getPref(backup.LAST_BACKUP_PREF)).toBeNull();
  });

  it("disables another export while an earlier request is pending", async () => {
    const user = userEvent.setup();
    await showSettings();
    const original = backup.buildBackup;
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    let task;
    const spy = vi.spyOn(backup, "buildBackup").mockImplementation(() => {
      task = original().then(async (envelope) => { await gate; return envelope; });
      return task;
    });
    try {
      await user.click(screen.getByRole("button", { name: "Export backup" }));
      const pendingButton = screen.getByRole("button", { name: "Preparing…" });
      expect(pendingButton.disabled).toBe(true);
      await user.click(pendingButton);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(downloadJson).not.toHaveBeenCalled();
    } finally {
      release();
      await task;
      await screen.findByText("Backup downloaded. Keep it somewhere off this phone.");
      await waitFor(() => expect(screen.getByRole("button", { name: "Export backup" }).disabled).toBe(false));
    }
  });

  it("keeps a completed export successful if refreshing the Settings counts fails", async () => {
    const user = userEvent.setup();
    const item = makeLexical({ tags: ["verbs"] });
    await db.items.add(item);
    await showSettings([item]);
    await user.click(screen.getByRole("button", { name: "Manage tag verbs" }));
    await user.click(screen.getByRole("button", { name: "Remove tag everywhere" }));
    vi.spyOn(db.items, "count").mockRejectedValueOnce(new Error("Count refresh failed"));
    await user.click(screen.getByRole("button", { name: "Export backup first" }));
    expect(await screen.findByText("Backup downloaded.")).toBeTruthy();
    expect(screen.getByText("Backup downloaded. Keep it somewhere off this phone.")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("Count refresh failed")).toBeNull();
    expect(await getPref(backup.LAST_BACKUP_PREF)).toBe(downloadJson.mock.calls[0][1].exportedAt);
  });
});
