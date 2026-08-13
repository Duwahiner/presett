"use client";

import { useEffect, useState } from "react";
import { getConfig, getCatalog, saveAssignment } from "@/services/modelsApiService";
import { listProfiles, switchProfile } from "@/services/profilesApiService";
import { runSync } from "@/services/backupsApiService";
import { t } from "@/resources/resources";
import type { ModelCatalog } from "@/components/molecules/ModelPicker/ModelPicker";
import type { Profile } from "@/services/profilesApiService";
import { ModelsClientView } from "./ModelsClient.view";
import type { Assignment } from "./ModelsClient.types";

export function ModelsClient() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [originalAssignments, setOriginalAssignments] = useState<Assignment[]>([]);
  const [catalog, setCatalog] = useState<ModelCatalog>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [switchingProfile, setSwitchingProfile] = useState(false);
  const [resetting, setResetting] = useState(false);

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
    setFeedback(null);
    try {
      await saveAssignment({ agentKey, ...assignment });
      setAssignments((prev) =>
        prev.map((a) => (a.agentKey === agentKey ? { ...a, ...assignment } : a)),
      );
      setFeedback({ type: "success", message: t("models_assignmentSaved") });
    } catch (cause) {
      setFeedback({ type: "error", message: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      setSaving(null);
    }
  }

  async function handleSwitchProfile(name: string) {
    setSwitchingProfile(true);
    setFeedback(null);
    try {
      await switchProfile(name);
      setActiveProfile(name);
      // Reload config to reflect the new profile's assignments
      const config = await getConfig();
      setAssignments(config.assignments);
      setOriginalAssignments(config.assignments);
      setFeedback({ type: "success", message: t("models_profileSwitched") });
    } catch (cause) {
      setFeedback({ type: "error", message: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      setSwitchingProfile(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setFeedback(null);
    try {
      await runSync();
      setFeedback({ type: "success", message: t("models_syncSuccess") });
    } catch (cause) {
      setFeedback({ type: "error", message: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      setSyncing(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    setFeedback(null);
    try {
      // Restore each assignment to its original value
      await Promise.all(
        originalAssignments.map((a) =>
          saveAssignment({ agentKey: a.agentKey, provider: a.provider, model: a.model, variant: a.variant }),
        ),
      );
      setAssignments([...originalAssignments]);
      setFeedback({ type: "success", message: t("models_resetSuccess") });
    } catch (cause) {
      setFeedback({ type: "error", message: cause instanceof Error ? cause.message : String(cause) });
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
      feedback={feedback}
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
