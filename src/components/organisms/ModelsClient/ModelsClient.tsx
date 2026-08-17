"use client";

import { useEffect, useMemo, useState } from "react";
import { getConfig, getCatalog, saveAssignment } from "@/services/modelsApiService";
import { listProfiles, switchProfile } from "@/services/profilesApiService";
import { runSync } from "@/services/backupsApiService";
import { t } from "@/resources/resources";
import { useNotificationToasts } from "@/hooks/useNotificationToasts";
import type { ModelCatalog } from "@/components/molecules/ModelPicker/ModelPicker";
import type { Profile } from "@/services/profilesApiService";
import { ModelsClientView } from "./ModelsClient.view";
import type { Assignment } from "./ModelsClient.types";
import type { ListingControlsConfig, ListingControlsState } from "@/components/molecules/ListingControls/ListingControls.types";

const modelsControlsConfig: ListingControlsConfig = {
  filters: [
    {
      key: "agent",
      labelKey: "listing_filter_agent",
      options: [
        { value: "coder", labelKey: "listing_filter_agent_openai" },
        { value: "researcher", labelKey: "listing_filter_agent_anthropic" },
        { value: "writer", labelKey: "listing_filter_agent_openai" },
      ],
    },
    {
      key: "provider",
      labelKey: "listing_filter_provider",
      options: [
        { value: "openai", labelKey: "listing_filter_agent_openai" },
        { value: "anthropic", labelKey: "listing_filter_agent_anthropic" },
      ],
    },
    {
      key: "model",
      labelKey: "listing_filter_model",
      options: [
        { value: "gpt-5", labelKey: "listing_filter_model" },
        { value: "gpt-4o", labelKey: "listing_filter_model" },
        { value: "claude-4", labelKey: "listing_filter_model" },
      ],
    },
    {
      key: "variant",
      labelKey: "listing_filter_variant",
      options: [
        { value: "high", labelKey: "listing_filter_variant" },
        { value: "standard", labelKey: "listing_filter_variant" },
      ],
    },
  ],
  sort: {
    fields: [
      { value: "agent", labelKey: "listing_sort_agent" },
      { value: "provider", labelKey: "listing_sort_provider" },
      { value: "model", labelKey: "listing_sort_model" },
      { value: "variant", labelKey: "listing_sort_variant" },
    ],
    defaultField: "agent",
    defaultDir: "asc",
  },
};

export function filterAndSortModels(
  assignments: Assignment[],
  state: ListingControlsState,
): Assignment[] {
  let result = assignments;

  // Apply filters
  for (const [key, value] of Object.entries(state.activeFilters)) {
    if (!value) continue;
    result = result.filter((a) => {
      switch (key) {
        case "agent": return a.agentKey === value;
        case "provider": return a.provider === value;
        case "model": return a.model === value;
        case "variant": return a.variant === value;
        default: return true;
      }
    });
  }

  // Stable sort by sortField + secondary sort by agentKey for determinism
  const dir = state.sortDir === "asc" ? 1 : -1;
  const field = state.sortField;
  return [...result].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "agent": cmp = a.agentKey.localeCompare(b.agentKey); break;
      case "provider": cmp = a.provider.localeCompare(b.provider); break;
      case "model": cmp = a.model.localeCompare(b.model); break;
      case "variant": cmp = a.variant.localeCompare(b.variant); break;
      default: cmp = 0;
    }
    if (cmp !== 0) return cmp * dir;
    // Deterministic fallback by agentKey
    return a.agentKey.localeCompare(b.agentKey);
  });
}

export function ModelsClient() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [originalAssignments, setOriginalAssignments] = useState<Assignment[]>([]);
  const [catalog, setCatalog] = useState<ModelCatalog>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [switchingProfile, setSwitchingProfile] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { onError, onSuccess } = useNotificationToasts();

  // Filter/sort state — mount-local, cleared on unmount
  const [controlsState, setControlsState] = useState<ListingControlsState>({
    search: "",
    activeFilters: {},
    sortField: modelsControlsConfig.sort.defaultField,
    sortDir: modelsControlsConfig.sort.defaultDir,
  });

  const derivedAssignments = useMemo(
    () => filterAndSortModels(assignments, controlsState),
    [assignments, controlsState],
  );

  function handleControlsChange(next: Partial<ListingControlsState>) {
    setControlsState((prev) => ({ ...prev, ...next }));
  }

  function handleControlsClear() {
    setControlsState({
      search: "",
      activeFilters: {},
      sortField: modelsControlsConfig.sort.defaultField,
      sortDir: modelsControlsConfig.sort.defaultDir,
    });
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const [config, catalogData, profilesData] = await Promise.all([
          getConfig(),
          getCatalog(),
          listProfiles(),
        ]);

        if (!isMounted) return;

        setAssignments(config.assignments);
        setOriginalAssignments(config.assignments);
        setCatalog(catalogData.catalog);
        setProfiles(profilesData.profiles);
        setActiveProfile(config.defaultAgent ?? "");
      } catch (cause) {
        if (!isMounted) return;

        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSave(
    agentKey: string,
    assignment: { provider: string; model: string; variant: string },
  ) {
    setSaving(agentKey);
    try {
      await saveAssignment({ agentKey, ...assignment });
      setAssignments((prev) =>
        prev.map((a) => (a.agentKey === agentKey ? { ...a, ...assignment } : a)),
      );
      onSuccess(t("models_assignmentSaved"));
    } catch (cause) {
      onError(t("models_assignmentSaveError"), cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(null);
    }
  }

  async function handleSwitchProfile(name: string) {
    setSwitchingProfile(true);
    try {
      await switchProfile(name);
      setActiveProfile(name);
      // Reload config to reflect the new profile's assignments
      const config = await getConfig();
      setAssignments(config.assignments);
      setOriginalAssignments(config.assignments);
      onSuccess(t("models_profileSwitched"));
    } catch (cause) {
      onError(t("models_profileSwitchError"), cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSwitchingProfile(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await runSync();
      onSuccess(t("models_syncSuccess"));
    } catch (cause) {
      onError(t("models_syncNow"), cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSyncing(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      // Restore each assignment to its original value
      await Promise.all(
        originalAssignments.map((a) =>
          saveAssignment({ agentKey: a.agentKey, provider: a.provider, model: a.model, variant: a.variant }),
        ),
      );
      setAssignments([...originalAssignments]);
      onSuccess(t("models_resetSuccess"));
    } catch (cause) {
      onError(t("models_resetAll"), cause instanceof Error ? cause.message : String(cause));
    } finally {
      setResetting(false);
    }
  }

  return (
    <ModelsClientView
      assignments={assignments}
      catalog={catalog}
      loading={loading}
      error={error}
      saving={saving}
      profiles={profiles}
      activeProfile={activeProfile}
      syncing={syncing}
      switchingProfile={switchingProfile}
      resetting={resetting}
      onSave={handleSave}
      onSwitchProfile={handleSwitchProfile}
      onSync={handleSync}
      onReset={handleReset}
      derivedAssignments={derivedAssignments}
      controls={modelsControlsConfig}
      controlsState={controlsState}
      onControlsChange={handleControlsChange}
      onControlsClear={handleControlsClear}
    />
  );
}
