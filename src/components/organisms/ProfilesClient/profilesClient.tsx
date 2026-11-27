"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { listProfiles, switchProfile, deleteProfile, getProfileDetail } from "@/services/profilesApiService";
import { clearModelCatalogCache, getCatalog } from "@/services/modelsApiService";
import { t } from "@/resources/resources";
import { useNotificationToasts } from "@/hooks/useNotificationToasts";
import type { ModelCatalog } from "@/components/molecules/ModelPicker/modelPicker";
import { ProfilesClientView } from "./profilesClientView";
import type { Profile } from "./profilesClientTypes";
import type { ListingControlsConfig, ListingControlsState } from "@/components/molecules/ListingControls/listingControlsTypes";
import { useAuditMode } from "@/lib/visual-audit/auditContext";
import { AUDIT_FIXTURE_PROFILES, AUDIT_FIXTURE_CATALOG } from "@/lib/visual-audit/fixtures";

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
  const [strategy, setStrategy] = useState<Profile["strategy"]>("generated-multi");
  const [catalog, setCatalog] = useState<ModelCatalog>({});
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
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
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const detailRequestRef = useRef(0);
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
      setConnectedProviders([]);
      setCatalogLoading(false);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadCatalog(forceRefresh = false) {
      if (mounted) setCatalogLoading(true);
      try {
        const catalogData = await getCatalog(forceRefresh ? { forceRefresh: true } : undefined);
        if (!mounted) return;
        setCatalog(catalogData.catalog);
        setConnectedProviders(catalogData.connectedProviders ?? []);
      } catch {
        if (!mounted) return;
        setCatalog({});
        setConnectedProviders([]);
      } finally {
        if (mounted) setCatalogLoading(false);
      }
    }

    async function load() {
      try {
        const profilesData = await listProfiles();
        if (!mounted) return;
        setProfiles(profilesData.profiles);
        setStrategy(profilesData.strategy);
      } catch (cause) {
        if (!mounted) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    void loadCatalog();
    return () => {
      mounted = false;
    };
  }, [isAuditMode]);

  async function refresh() {
    if (isAuditMode) return;
    const data = await listProfiles();
    setProfiles(data.profiles);
    setStrategy(data.strategy);
  }

  async function handleSwitch(name: string) {
    if (isAuditMode) return; // Deny writes in audit mode
    setPendingAction(`switch:${name}`);
    try {
      await switchProfile(name);
      clearModelCatalogCache();
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

  async function handleEditStart(name: string) {
    if (isAuditMode) return; // Deny writes in audit mode
    const requestId = ++detailRequestRef.current;
    setEditingProfile(name);
    setEditAssignments({});
    setDetailLoading(true);
    setDetailError(null);
    try {
      const detail = await getProfileDetail(name);
      if (detailRequestRef.current !== requestId) return; // stale response
      setEditAssignments(detail.assignments);
    } catch (cause) {
      if (detailRequestRef.current !== requestId) return; // stale error
      setDetailError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (detailRequestRef.current === requestId) setDetailLoading(false);
    }
  }

  function handleEditSave(): void {
    if (isAuditMode) return; // Deny writes in audit mode
    // Saving from this screen is retired. Named profile edits depended on the gentle-ai
    // flags that were removed, and the Base profile (empty name) was never saved from
    // this handler. Nothing is written to opencode.json from here.
  }

  function handleEditCancel() {
    detailRequestRef.current += 1; // invalidate any in-flight detail request
    setEditingProfile(null);
    setEditAssignments({});
    setDetailError(null);
    setDetailLoading(false);
  }

  return (
    <ProfilesClientView
      profiles={profiles}
      strategy={strategy}
      catalog={catalog}
      connectedProviders={connectedProviders}
      catalogLoading={catalogLoading}
      loading={loading}
      error={error}
      pendingAction={pendingAction}
      newAssignments={newAssignments}
      onAssignmentChange={(key, assignment) =>
        setNewAssignments((prev) => ({ ...prev, [key]: assignment }))
      }
      onSwitch={handleSwitch}
      onDeleteStart={handleDeleteStart}
      onDeleteConfirm={handleDeleteConfirm}
      onDeleteCancel={handleDeleteCancel}
      deleteConfirmProfile={deleteConfirmProfile}
      editingProfile={editingProfile}
      editAssignments={editAssignments}
      detailLoading={detailLoading}
      detailError={detailError}
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
