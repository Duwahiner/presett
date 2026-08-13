import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { BackupsClientView } from "../BackupsClient.view";

const backup = {
  id: "backup-1",
  source: "manual",
  timestamp: "2026-08-10T20:00:00Z",
  fileCount: 5,
  size: 2048,
  pinned: false,
};

function renderView(overrides: Partial<ComponentProps<typeof BackupsClientView>> = {}) {
  const props = {
    backups: [backup],
    loading: false,
    error: null,
    syncOutput: null,
    syncing: false,
    feedback: null,
    pendingAction: null,
    onSync: vi.fn(),
    onRestore: vi.fn(),
    onPin: vi.fn(),
    onUnpin: vi.fn(),
    onDelete: vi.fn(),
    deleteConfirmId: null,
    restoreConfirmId: null,
    onDeleteConfirm: vi.fn(),
    onDeleteCancel: vi.fn(),
    onRestoreConfirm: vi.fn(),
    onRestoreCancel: vi.fn(),
    ...overrides,
  };

  render(<BackupsClientView {...props} />);
  return props;
}

describe("BackupsClientView", () => {
  it("requests confirmation before destructive backup actions", async () => {
    const onDelete = vi.fn();
    const onRestore = vi.fn();
    const user = userEvent.setup();
    renderView({ onDelete, onRestore });

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Restore" }));

    expect(onDelete).toHaveBeenCalledWith("backup-1");
    expect(onRestore).toHaveBeenCalledWith("backup-1");
  });

  it("confirms the selected delete operation", async () => {
    const onDeleteConfirm = vi.fn();
    const user = userEvent.setup();
    renderView({ deleteConfirmId: "backup-1", onDeleteConfirm });

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onDeleteConfirm).toHaveBeenCalledOnce();
  });

  it("disables an action while its mutation is pending", () => {
    renderView({ pendingAction: "pin:backup-1" });

    expect(screen.getByRole("button", { name: "Pin" }).hasAttribute("disabled")).toBe(true);
  });

  it("announces mutation feedback", () => {
    renderView({ feedback: { type: "success", message: "Backup pinned." } });

    expect(screen.getByRole("status").textContent).toContain("Backup pinned.");
  });
});
