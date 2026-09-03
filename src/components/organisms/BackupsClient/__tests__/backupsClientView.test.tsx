import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { BackupsClientView } from "../backupsClientView";

const backup = {
  id: "backup-1",
  source: "manual",
  timestamp: "2026-08-10T20:00:00Z",
  fileCount: 5,
  size: 2048,
  pinned: false,
};

const backupPinned = {
  id: "backup-2",
  source: "auto",
  timestamp: "2026-08-12T12:00:00Z",
  fileCount: 3,
  size: 1024,
  pinned: true,
};

function renderView(overrides: Partial<ComponentProps<typeof BackupsClientView>> = {}) {
  const props = {
    backups: [backup],
    loading: false,
    error: null,
    syncOutput: null,
    syncing: false,
    pendingAction: null,
    detailBackup: null,
    backupDetail: null,
    detailLoading: false,
    detailError: null,
    onSync: vi.fn(),
    onRestore: vi.fn(),
    onPin: vi.fn(),
    onUnpin: vi.fn(),
    onDelete: vi.fn(),
    onViewDetails: vi.fn(),
    onDetailClose: vi.fn(),
    deleteConfirmId: null,
    onDeleteConfirm: vi.fn(),
    onDeleteCancel: vi.fn(),
    ...overrides,
  };

  render(<BackupsClientView {...props} />);
  return props;
}

describe("BackupsClientView", () => {
  it("renders the full backups list", () => {
    renderView({ backups: [backup, backupPinned] });

    expect(screen.getByText("backup-1")).toBeTruthy();
    expect(screen.getByText("backup-2")).toBeTruthy();
  });

  it("requests confirmation before destructive backup actions", async () => {
    const onDelete = vi.fn();
    const onRestore = vi.fn();
    const user = userEvent.setup();
    renderView({ onDelete, onRestore });

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Restore" }));

    expect(onDelete).toHaveBeenCalledWith("backup-1");
    expect(onRestore).toHaveBeenCalledWith("backup-1", "manual");
  });

  it("keeps details and every quick action on each backup card", async () => {
    const onViewDetails = vi.fn();
    const onPin = vi.fn();
    const user = userEvent.setup();
    renderView({ onViewDetails, onPin });

    expect(screen.getByText("backup-1")).toBeTruthy();
    expect(screen.getByText((_, element) => element?.tagName === "SPAN" && element.textContent === "Source: manual")).toBeTruthy();
    expect(screen.getByText((_, element) => element?.tagName === "SPAN" && element.textContent === "5 files")).toBeTruthy();
    expect(screen.getByText("2.05 KB")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "View details" }));
    await user.click(screen.getByRole("button", { name: "Pin" }));

    expect(onViewDetails).toHaveBeenCalledWith("backup-1");
    expect(onPin).toHaveBeenCalledWith("backup-1");
    expect(screen.getByRole("button", { name: "Restore" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete" })).toBeTruthy();
  });

  it("preserves the structural list scroll contract", () => {
    renderView();

    const list = screen.getByTestId("backups-list-scroll");
    expect(list.className).toContain("min-h-0");
    expect(list.className).toContain("flex-1");
    expect(list.className).toContain("overflow-y-auto");
  });

  it("restores list scroll after closing the detail modal", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <BackupsClientView
          {...renderProps}
          detailBackup={open ? backup : null}
          backupDetail={open ? { ...backup, files: [], changePreview: { available: false } } : null}
          onViewDetails={() => setOpen(true)}
          onDetailClose={() => setOpen(false)}
        />
      );
    }
    const renderProps = {
      backups: [backup], loading: false, error: null, syncOutput: null, syncing: false,
      pendingAction: null, detailLoading: false, detailError: null,
      onSync: vi.fn(), onRestore: vi.fn(), onPin: vi.fn(), onUnpin: vi.fn(), onDelete: vi.fn(),
      deleteConfirmId: null, onDeleteConfirm: vi.fn(), onDeleteCancel: vi.fn(),
    };
    const user = userEvent.setup();
    render(<Harness />);
    const list = screen.getByTestId("backups-list-scroll");
    list.scrollTop = 137;

    await user.click(screen.getByRole("button", { name: "View details" }));
    list.scrollTop = 0;
    await user.click(screen.getByRole("button", { name: "Close backup detail" }));

    await waitFor(() => expect(list.scrollTop).toBe(137));
  });

  it("confirms the selected delete operation", async () => {
    const onDeleteConfirm = vi.fn();
    const user = userEvent.setup();
    renderView({ deleteConfirmId: "backup-1", onDeleteConfirm });

    // DeleteBackupModal renders with "DELETE" button (uppercase per spec)
    await user.click(screen.getByRole("button", { name: "DELETE" }));

    expect(onDeleteConfirm).toHaveBeenCalledOnce();
  });

  it("disables an action while its mutation is pending", () => {
    renderView({ pendingAction: "pin:backup-1" });

    const pinButton = screen.getByRole("button", { name: "Pin" });
    expect(pinButton.hasAttribute("disabled")).toBe(true);
    expect(pinButton.querySelector('[data-icon="inline-start"]')).not.toBeNull();
  });

  it("does not render inline feedback (delegated to notification system)", () => {
    renderView();

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows no-data empty state when backups array is empty", () => {
    renderView({ backups: [] });

    const heading = screen.getByText("No backups found");
    expect(heading).toBeTruthy();
  });

  it("renders a loading skeleton while loading", () => {
    renderView({ loading: true });

    expect(screen.queryByText("backup-1")).toBeNull();
  });
});
