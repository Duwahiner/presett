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

const backupPinned = {
  id: "backup-2",
  source: "auto",
  timestamp: "2026-08-12T12:00:00Z",
  fileCount: 3,
  size: 1024,
  pinned: true,
};

const defaultControls = {
  config: {
    search: { placeholder: "listing_search_placeholder" as const, ariaLabel: "listing_search_aria" as const },
    filters: [
      {
        key: "pinned",
        labelKey: "listing_filter_pinned" as const,
        options: [
          { value: "true", labelKey: "backups_pinned" as const },
        ],
      },
    ],
    sort: {
      fields: [
        { value: "timestamp", labelKey: "listing_sort_date" as const },
        { value: "size", labelKey: "listing_sort_size" as const },
        { value: "fileCount", labelKey: "listing_sort_fileCount" as const },
      ],
      defaultField: "timestamp",
      defaultDir: "desc" as const,
    },
  },
  state: {
    search: "",
    activeFilters: {} as Record<string, string>,
    sortField: "timestamp",
    sortDir: "desc" as const,
  },
  onChange: vi.fn(),
  onClear: vi.fn(),
  resultCount: 1,
};

function renderView(overrides: Partial<ComponentProps<typeof BackupsClientView>> = {}) {
  const props = {
    backups: [backup],
    derivedBackups: [backup],
    loading: false,
    error: null,
    syncOutput: null,
    syncing: false,
    pendingAction: null,
    controls: defaultControls,
    resultCount: 1,
    onControlsChange: vi.fn(),
    onClearControls: vi.fn(),
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

  it("does not render inline feedback (delegated to notification system)", () => {
    renderView();

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("BackupsClientView — filter/sort integration", () => {
  it("renders ListingControls when controls prop is provided", () => {
    renderView({
      backups: [backup, backupPinned],
      controls: defaultControls,
      onControlsChange: vi.fn(),
      resultCount: 2,
      derivedBackups: [backup, backupPinned],
    });

    // getByPlaceholderText throws if not found — acts as "in the document" assertion
    const input = screen.getByPlaceholderText("Search\u2026");
    expect(input).toBeTruthy();
  });

  it("shows no-data empty state when backups array is empty", () => {
    renderView({
      backups: [],
      derivedBackups: [],
      controls: defaultControls,
      resultCount: 0,
    });

    const heading = screen.getByText("No backups found");
    expect(heading).toBeTruthy();
  });

  it("shows no-matches empty state when backups exist but derived is empty", () => {
    renderView({
      backups: [backup],
      derivedBackups: [],
      controls: defaultControls,
      resultCount: 0,
    });

    const heading = screen.getByText("No matching backups");
    expect(heading).toBeTruthy();
  });

  it("renders only derived backups when derivedBackups differs from backups", () => {
    renderView({
      backups: [backup, backupPinned],
      derivedBackups: [backupPinned],
      controls: defaultControls,
      resultCount: 1,
    });

    expect(screen.getByText("backup-2")).toBeTruthy();
    expect(screen.queryByText("backup-1")).toBeNull();
  });

  it("calls onControlsChange when search input changes", async () => {
    const onControlsChange = vi.fn();
    const user = userEvent.setup();
    renderView({
      backups: [backup],
      controls: defaultControls,
      onControlsChange,
      derivedBackups: [backup],
      resultCount: 1,
    });

    await user.type(screen.getByPlaceholderText("Search\u2026"), "test");

    expect(onControlsChange).toHaveBeenCalled();
  });
});
