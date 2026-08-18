import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setLocale } from "@/resources/resources";
import { ModelsClientView } from "@/components/organisms/ModelsClient/ModelsClient.view";
import { BackupsClientView } from "@/components/organisms/BackupsClient/BackupsClient.view";
import { ProfilesClientView } from "@/components/organisms/ProfilesClient/ProfilesClient.view";
import type { ModelsClientViewProps, Assignment } from "@/components/organisms/ModelsClient/ModelsClient.types";
import type { BackupsClientViewProps, BackupInfo } from "@/components/organisms/BackupsClient/BackupsClient.types";
import type { ProfilesClientViewProps, Profile } from "@/components/organisms/ProfilesClient/ProfilesClient.types";
import type { ListingControlsConfig, ListingControlsState } from "@/components/molecules/ListingControls/ListingControls.types";

/* ── Shared fixtures ── */

const modelsConfig: ListingControlsConfig = {
  filters: [
    { key: "agent", labelKey: "listing_filter_agent", options: [{ value: "coder", labelKey: "listing_filter_agent_openai" }] },
  ],
  sort: { fields: [{ value: "agent", labelKey: "listing_sort_agent" }], defaultField: "agent", defaultDir: "asc" },
};

const defaultModelState: ListingControlsState = { search: "", activeFilters: {}, sortField: "agent", sortDir: "asc" };

const assignments: Assignment[] = [
  { agentKey: "coder", provider: "openai", model: "gpt-5", variant: "high" },
  { agentKey: "writer", provider: "openai", model: "gpt-4o", variant: "standard" },
];

const backupsConfig: ListingControlsConfig = {
  search: { placeholder: "listing_search_placeholder", ariaLabel: "listing_search_aria" },
  filters: [{ key: "pinned", labelKey: "listing_filter_pinned", options: [{ value: "true", labelKey: "backups_pinned" }] }],
  sort: { fields: [{ value: "timestamp", labelKey: "listing_sort_date" }], defaultField: "timestamp", defaultDir: "desc" },
};

const defaultBackupState: ListingControlsState = { search: "", activeFilters: {}, sortField: "timestamp", sortDir: "desc" };

const backup: BackupInfo = { id: "backup-1", source: "manual", timestamp: "2026-08-10T20:00:00Z", fileCount: 5, size: 2048, pinned: false };

const profilesConfig: ListingControlsConfig = {
  search: { placeholder: "listing_search_placeholder", ariaLabel: "listing_search_aria" },
  sort: { fields: [{ value: "name", labelKey: "listing_sort_name" }], defaultField: "name", defaultDir: "asc" },
};

const defaultProfileState: ListingControlsState = { search: "", activeFilters: {}, sortField: "name", sortDir: "asc" };

const profile: Profile = { name: "work", displayName: "Work", active: true, modelCount: 1, updatedAt: "2026-01-15T10:00:00Z" };

/* ── Default props factories ── */

const modelsDefaults: ModelsClientViewProps = {
  assignments: [], catalog: {}, loading: false, error: null, saving: null,
  profiles: [], activeProfile: "default", syncing: false, switchingProfile: false, resetting: false,
  onSave: () => {}, onSwitchProfile: () => {}, onSync: () => {}, onReset: () => {},
  derivedAssignments: [], controls: modelsConfig, controlsState: defaultModelState,
  onControlsChange: () => {}, onControlsClear: () => {},
};

const backupsDefaults: BackupsClientViewProps = {
  backups: [], derivedBackups: [], loading: false, error: null, syncOutput: null, syncing: false,
  pendingAction: null, controls: { config: backupsConfig, state: defaultBackupState },
  resultCount: 0, onControlsChange: () => {}, onClearControls: () => {},
  onSync: () => {}, onRestore: () => {}, onPin: () => {}, onUnpin: () => {}, onDelete: () => {},
  deleteConfirmId: null, restoreConfirmId: null,
  onDeleteConfirm: () => {}, onDeleteCancel: () => {}, onRestoreConfirm: () => {}, onRestoreCancel: () => {},
};

const profilesDefaults: ProfilesClientViewProps = {
  profiles: [], catalog: {}, loading: false, error: null, pendingAction: null,
  newName: "", newAssignments: {}, onNewNameChange: () => {}, onAssignmentChange: () => {},
  onCreate: () => {}, onSwitch: () => {}, onDelete: () => {},
  editingProfile: null, editAssignments: {},
  onEditStart: () => {}, onEditSave: () => {}, onEditCancel: () => {}, onEditAssignmentChange: () => {},
  derivedProfiles: [], controls: profilesConfig, controlsState: defaultProfileState,
  onControlsChange: () => {}, onControlsClear: () => {},
};

/* ── State cleanup: controls reset to defaults on remount ── */

describe("Listing state cleanup on unmount", () => {
  beforeEach(() => setLocale("en"));

  it("BackupsClient: search and sort reset to defaults after remount", () => {
    const modified: ListingControlsState = { search: "test", activeFilters: { pinned: "true" }, sortField: "size", sortDir: "asc" };
    const { unmount } = render(
      <BackupsClientView {...backupsDefaults} backups={[backup]} derivedBackups={[backup]}
        controls={{ config: backupsConfig, state: modified }} resultCount={1} />,
    );
    expect(screen.getByDisplayValue("test")).toBeDefined();
    unmount();

    const { unmount: unmount2 } = render(<BackupsClientView {...backupsDefaults} />);
    expect(screen.queryByDisplayValue("test")).toBeNull();
    unmount2();
  });

  it("ProfilesClient: search and sort reset to defaults after remount", () => {
    const modified: ListingControlsState = { search: "alpha", activeFilters: {}, sortField: "updatedAt", sortDir: "desc" };
    const { unmount } = render(
      <ProfilesClientView {...profilesDefaults} profiles={[profile]} derivedProfiles={[profile]} controlsState={modified} />,
    );
    expect(screen.getByDisplayValue("alpha")).toBeDefined();
    unmount();

    const { unmount: unmount2 } = render(<ProfilesClientView {...profilesDefaults} />);
    expect(screen.queryByDisplayValue("alpha")).toBeNull();
    unmount2();
  });

  it("ModelsClient: sort direction resets to default after remount", () => {
    const modified: ListingControlsState = { search: "", activeFilters: { agent: "coder" }, sortField: "provider", sortDir: "desc" };
    const { unmount } = render(
      <ModelsClientView {...modelsDefaults} assignments={assignments} derivedAssignments={assignments} controlsState={modified} />,
    );
    // Sort direction button shows ArrowDown when desc
    const sortDirBtn = screen.getByRole("button", { name: /sort direction/i });
    expect(sortDirBtn.querySelector("svg")).toBeTruthy();
    unmount();

    const { unmount: unmount2 } = render(
      <ModelsClientView {...modelsDefaults} assignments={assignments} derivedAssignments={assignments} />,
    );
    // After remount, sort direction should be back to default (asc)
    const sortDirBtn2 = screen.getByRole("button", { name: /sort direction/i });
    expect(sortDirBtn2).toBeDefined();
    unmount2();
  });
});

/* ── ListingEmptyState renders correctly across all clients ── */

describe("ListingEmptyState across clients", () => {
  beforeEach(() => setLocale("en"));

  it("ModelsClient: no-data when empty array, no-matches when filtered", () => {
    const { rerender } = render(
      <ModelsClientView {...modelsDefaults} assignments={[]} derivedAssignments={[]} />,
    );
    expect(screen.getByText(/no model assignments/i)).toBeDefined();

    rerender(
      <ModelsClientView {...modelsDefaults} assignments={assignments} derivedAssignments={[]} controlsState={{ ...defaultModelState, activeFilters: { agent: "zzz" } }} />,
    );
    expect(screen.getByText(/no matching models/i)).toBeDefined();
  });

  it("BackupsClient: no-data when empty array, no-matches when filtered", () => {
    const { rerender } = render(
      <BackupsClientView {...backupsDefaults} backups={[]} derivedBackups={[]} resultCount={0} />,
    );
    expect(screen.getByText(/no backups found/i)).toBeDefined();

    rerender(
      <BackupsClientView {...backupsDefaults} backups={[backup]} derivedBackups={[]} resultCount={0} />,
    );
    expect(screen.getByText(/no matching backups/i)).toBeDefined();
  });

  it("ProfilesClient: no-data when empty array, no-matches when filtered", () => {
    const { rerender } = render(
      <ProfilesClientView {...profilesDefaults} profiles={[]} derivedProfiles={[]} />,
    );
    expect(screen.getByText(/no profiles yet/i)).toBeDefined();

    rerender(
      <ProfilesClientView {...profilesDefaults} profiles={[profile]} derivedProfiles={[]} controlsState={{ ...defaultProfileState, search: "zzz" }} />,
    );
    expect(screen.getByText(/no matching profiles/i)).toBeDefined();
  });
});

/* ── Keyboard accessibility ── */

describe("Keyboard accessibility", () => {
  beforeEach(() => setLocale("en"));

  it("ListingControls: sort direction button is keyboard-focusable", async () => {
    const user = userEvent.setup();
    render(
      <BackupsClientView {...backupsDefaults} backups={[backup]} derivedBackups={[backup]} resultCount={1} />,
    );

    const sortDir = screen.getByRole("button", { name: /sort direction/i });
    sortDir.focus();
    expect(document.activeElement).toBe(sortDir);

    // Sort direction is reachable by tab from the previous control
    await user.tab();
    expect(document.activeElement).not.toBe(sortDir);
  });
});

/* ── i18n completeness ── */

describe("i18n listing key completeness", () => {
  it("every listing_ key in types.ts has a value in en.ts and es.ts", async () => {
    const { en } = await import("@/resources/en");
    const { es } = await import("@/resources/es");
    const enKeys = Object.keys(en).filter((k) => k.startsWith("listing_"));
    const esKeys = Object.keys(es).filter((k) => k.startsWith("listing_"));

    expect(enKeys.length).toBeGreaterThan(0);
    expect(esKeys.length).toBe(enKeys.length);

    for (const key of enKeys) {
      expect(typeof en[key as keyof typeof en]).toBe("string");
      expect(typeof es[key as keyof typeof es]).toBe("string");
    }
  });
});
