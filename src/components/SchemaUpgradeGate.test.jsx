// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SchemaUpgradeGate from "./SchemaUpgradeGate.jsx";
import { buildPreupgradeBackup } from "../db/preupgrade.js";
import { downloadJson } from "../lib/file.js";
import { SCHEMA_VERSION } from "../version.js";

vi.mock("../db/preupgrade.js", () => ({ buildPreupgradeBackup: vi.fn() }));
vi.mock("../lib/file.js", () => ({ downloadJson: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const envelope = {
  format: "mi-cuaderno-backup",
  schemaVersion: 2,
  exportedAt: "2026-08-02T10:00:00.000Z",
  appVersion: "0.1.0",
  userItems: [],
  events: [],
  preferences: {},
};

describe("pre-open schema upgrade gate", () => {
  it("does not offer Continue until a validated legacy backup has been requested", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    buildPreupgradeBackup.mockResolvedValue(envelope);
    render(<SchemaUpgradeGate fromVersion={3} onContinue={onContinue} />);

    expect(screen.queryByRole("button", { name: /upgrade my notebook/i })).toBeNull();
    expect(screen.getByText(`personal data schema 3 → ${SCHEMA_VERSION}`)).toBeTruthy();
    expect(screen.getByText(new RegExp(`schema 3; this update needs schema ${SCHEMA_VERSION}`, "i"))).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Download backup" }));

    await waitFor(() => expect(downloadJson).toHaveBeenCalledTimes(1));
    expect(downloadJson.mock.calls[0][0]).toMatch(
      new RegExp(`^before-schema-v${SCHEMA_VERSION}-upgrade-mi-cuaderno-backup-`)
    );
    await user.click(screen.getByRole("button", { name: /upgrade my notebook/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("explains every migration crossed from v5 to v7", () => {
    render(<SchemaUpgradeGate fromVersion={5} onContinue={vi.fn()} />);

    expect(screen.getByText(/adds one level of Grammar subsections/i)).toBeTruthy();
    expect(screen.getByText(/adds an empty structured Notes outline/i)).toBeTruthy();
  });

  it("describes only Structured Notes when upgrading from v6", () => {
    render(<SchemaUpgradeGate fromVersion={6} onContinue={vi.fn()} />);

    expect(screen.getByText(/adds an empty structured Notes outline/i)).toBeTruthy();
    expect(screen.queryByText(/adds one level of Grammar subsections/i)).toBeNull();
  });

  it("keeps the upgrade blocked when backup preparation fails", async () => {
    const user = userEvent.setup();
    buildPreupgradeBackup.mockRejectedValue(new Error("validation failed"));
    render(<SchemaUpgradeGate onContinue={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Download backup" }));
    expect(await screen.findByText(/validation failed/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /upgrade my notebook/i })).toBeNull();
    expect(downloadJson).not.toHaveBeenCalled();
  });
});
