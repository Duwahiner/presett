"use client";

import { useEffect, useMemo, useState } from "react";
import { listProfiles, createProfile, switchProfile, deleteProfile, updateProfile } from "@/services/profilesApiService";
import { getCatalog } from "@/services/modelsApiService";
import { t } from "@/resources/resources";
import { useNotificationToasts } from "@/hooks/useNotificationToasts";
import type { ModelCatalog } from "@/components/molecules/ModelPicker/ModelPicker";
import { ProfilesClientView } from "./ProfilesClient.view";
import type { Profile } from "./ProfilesClient.types";
import type { ListingControlsConfig, ListingControlsState } from "@/components/molecules/ListingControls/ListingControls.types";
import { useAuditMode } from "@/lib/visual-audit/audit-context";
import { AUDIT_FIXTURE_PROFILES, AUDIT_FIXTURE_CATALOG } from "@/lib/visual-audit/fixtures";

const SDD_PHASES = [
  "init", "propose", "spec", "design", "tasks",
  "apply", "verify", "archive", "explore", "onboard",
];

const profilesControlsConfig: ListingControlsConfig = {
  search: {
    placeholder: "listing_search_placeholder",
    ariaLabel: "listing_search_aria",
  },
  sort: {
    fields: [
      { value: "name", labelKey: "listing_sort_name" },
      { value: "active", labelKey: "listing_sort_active" },
      { value: "updatedAt", labelKey: "listing_sort_lastUpdated" },
    ],
    defaultField: "name",
    defaultDir: "asc",
  },
};

export function filterAndSortProfiles(
  profiles: Profile[],
  state: ListingControlsState,
): Profile[] {
  let result = profiles;

  // Text search — matches name or displayName (case-insensitive)
  if (state.search) {
    const q = state.search.toLowerCase();
    result = result.filter(
      (p) => p.name.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q),
    );
  }

  // Stable sort by sortField + secondary sort by name for determinism
  const dir = state.sortDir === "asc" ? 1 : -1;
  const field = state.sortField;
  return [...result].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "name": cmp = a.name.localeCompare(b.name); break;
      case "active": {
        // asc = inactive first (false < true), desc = active first
        const activeCmp = Number(a.active) - Number(b.active);
        cmp = state.sortDir === "asc" ? activeCmp : -activeCmp;
        break;
      }
      case "updatedAt": {
        cmp = a.updatedAt.localeCompare(b.updatedAt);
        break;
      }
      default: cmp = 0;
    }
    if (field !== "active" && cmp !== 0) return cmp * dir;
    if (field === "active" && cmp !== 0) return cmp;
    return a.name.localeCompare(b.name);
  });
}

export function ProfilesClient({
  showForm: externalShowForm,
  setShowForm: externalSetShowForm,
  modalKey: externalModalKey,
  setModalKey: externalSetModalKey,
}: {
  showForm?: boolean;
  setShowForm?: (show: boolean) => void;
  modalKey?: number;
  setModalKey?: (fn: (k: number) => number) => void;
} = {}) {
  const isAuditMode = useAuditMode();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [catalog, setCatalog] = useState<ModelCatalog>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [newAssignments, setNewAssignments] = useState<
    Record<string, { provider: string; model: string; variant: string }>
  >({});
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [editAssignments, setEditAssignments] = useState<
    Record<string, { provider: string; model: string; variant: string }>
  >({});
  const [deleteConfirmProfile, setDeleteConfirmProfile] = useState<string | null>(null);
  const { onError, onSuccess } = useNotificationToasts();

  // Filter/sort state — mount-local, cleared on unmount
  const [controlsState, setControlsState] = useState<ListingControlsState>({
    search: "",
    activeFilters: {},
    sortField: profilesControlsConfig.sort.defaultField,
    sortDir: profilesControlsConfig.sort.defaultDir,
  });

  const derivedProfiles = useMemo(
    () => filterAndSortProfiles(profiles, controlsState),
    [profiles, controlsState],
  );

  function handleControlsChange(next: Partial<ListingControlsState>) {
    setControlsState((prev) => ({ ...prev, ...next }));
  }

  function handleControlsClear() {
    setControlsState({
      search: "",
      activeFilters: {},
      sortField: profilesControlsConfig.sort.defaultField,
      sortDir: profilesControlsConfig.sort.defaultDir,
    });
  }

  useEffect(() => {
    if (isAuditMode) {
      // Short-circuit to fixtures
      setProfiles(AUDIT_FIXTURE_PROFILES.profiles);
      setCatalog(AUDIT_FIXTURE_CATALOG);
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const [profilesData, catalogData] = await Promise.all([
          listProfiles(),
          getCatalog(),
        ]);
        setProfiles(profilesData.profiles);
        setCatalog(catalogData.catalog);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAuditMode]);

  async function refresh() {
    if (isAuditMode) return;
    const data = await listProfiles();
    setProfiles(data.profiles);
  }

  async function handleCreate(name: string, assignment?: { provider: string; model: string; variant: string }) {
    if (isAuditMode) return; // Deny writes in audit mode
    const nameToCreate = name.trim();
    if (!nameToCreate) return;
    setPendingAction("create");

    const assignments: Record<string, { provider: string; model: string; variant: string }> = {
      [`sdd-orchestrator-${nameToCreate}`]: assignment ?? newAssignments["orchestrator"] ?? { provider: "", model: "", variant: "" },
    };

    for (const phase of SDD_PHASES) {
      if (newAssignments[phase]?.provider) {
        assignments[`sdd-${phase}-${nameToCreate}`] = newAssignments[phase];
      }
    }

    try {
      await createProfile({ name: nameToCreate, assignments });
      setNewAssignments({});
      await refresh();
      onSuccess(t("profiles_createSuccess"));
    } catch (cause) {
      onError(t("profiles_createError"), cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSwitch(name: string) {
    if (isAuditMode) return; // Deny writes in audit mode
    setPendingAction(`switch:${name}`);
    try {
      await switchProfile(name);
      await refresh();
      onSuccess(t("profiles_switchSuccess"));
    } catch (cause) {
      onError(t("profiles_switchSuccess"), cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPendingAction(null);
    }
  }

  function handleDeleteStart(name: string) {
    if (isAuditMode) return; // Deny writes in audit mode
    setDeleteConfirmProfile(name);
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirmProfile) return;
    setPendingAction(`delete:${deleteConfirmProfile}`);
    try {
      await deleteProfile(deleteConfirmProfile);
      await refresh();
      onSuccess(t("profiles_deleteSuccess"));
    } catch (cause) {
      onError(t("profiles_deleteError"), cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPendingAction(null);
      setDeleteConfirmProfile(null);
    }
  }

  function handleDeleteCancel() {
    setDeleteConfirmProfile(null);
  }

  function handleEditStart(name: string) {
    if (isAuditMode) return; // Deny writes in audit mode
    setEditingProfile(name);
    setEditAssignments({});
  }

  async function handleEditSave() {
    if (isAuditMode) return; // Deny writes in audit mode
    if (!editingProfile) return;
    setPendingAction("edit");
    try {
      await updateProfile(editingProfile, editAssignments);
      setEditingProfile(null);
      setEditAssignments({});
      await refresh();
      onSuccess(t("profiles_updateSuccess"));
    } catch (cause) {
      onError(t("profiles_updateError"), cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPendingAction(null);
    }
  }

  function handleEditCancel() {
    setEditingProfile(null);
    setEditAssignments({});
  }

  return (
    <ProfilesClientView
      profiles={profiles}
      catalog={catalog}
      loading={loading}
      error={error}
      pendingAction={pendingAction}
      newAssignments={newAssignments}
      onAssignmentChange={(key, assignment) =>
        setNewAssignments((prev) => ({ ...prev, [key]: assignment }))
      }
      onCreate={handleCreate}
      onSwitch={handleSwitch}
      onDeleteStart={handleDeleteStart}
      onDeleteConfirm={handleDeleteConfirm}
      onDeleteCancel={handleDeleteCancel}
      deleteConfirmProfile={deleteConfirmProfile}
      editingProfile={editingProfile}
      editAssignments={editAssignments}
      onEditStart={handleEditStart}
      onEditSave={handleEditSave}
      onEditCancel={handleEditCancel}
      onEditAssignmentChange={(key, assignment) =>
        setEditAssignments((prev) => ({ ...prev, [key]: assignment }))
      }
      derivedProfiles={derivedProfiles}
      controls={profilesControlsConfig}
      controlsState={controlsState}
      onControlsChange={handleControlsChange}
      onControlsClear={handleControlsClear}
      showForm={externalShowForm}
      setShowForm={externalSetShowForm}
      modalKey={externalModalKey}
      setModalKey={externalSetModalKey}
    />
  );
}
