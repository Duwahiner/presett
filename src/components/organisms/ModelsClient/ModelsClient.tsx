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
import { useAuditMode } from "@/lib/visual-audit/audit-context";
import { AUDIT_FIXTURE_CONFIG, AUDIT_FIXTURE_CATALOG, AUDIT_FIXTURE_PROFILES, AUDIT_FIXTURE_MODELS_ASSIGNMENTS } from "@/lib/visual-audit/fixtures";



export function ModelsClient() {
  const isAuditMode = useAuditMode();
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


  useEffect(() => {
    if (isAuditMode) {
      // Short-circuit to fixtures
      setAssignments(AUDIT_FIXTURE_MODELS_ASSIGNMENTS);
      setOriginalAssignments(AUDIT_FIXTURE_MODELS_ASSIGNMENTS);
      setCatalog(AUDIT_FIXTURE_CATALOG);
      setProfiles(AUDIT_FIXTURE_PROFILES.profiles);
      setActiveProfile(AUDIT_FIXTURE_CONFIG.defaultAgent);
      setLoading(false);
      return;
    }

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
  }, [isAuditMode]);

  async function handleSave(
    agentKey: string,
    assignment: { provider: string; model: string; variant: string },
  ) {
    if (isAuditMode) return; // Deny writes in audit mode
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
    if (isAuditMode) return; // Deny writes in audit mode
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
    if (isAuditMode) return; // Deny writes in audit mode
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
    if (isAuditMode) return; // Deny writes in audit mode
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
    />
  );
}
