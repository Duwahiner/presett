"use client";

import { useEffect, useState } from "react";
import { clearModelCatalogCache, getConfig, getCatalog, saveAssignment } from "@/services/modelsApiService";
import { listProfiles, switchProfile } from "@/services/profilesApiService";
import { runSync } from "@/services/backupsApiService";
import { t } from "@/resources/resources";
import { useNotificationToasts } from "@/hooks/useNotificationToasts";
import type { ModelCatalog } from "@/components/molecules/ModelPicker/modelPicker";
import type { Profile } from "@/services/profilesApiService";
import { SDD_PHASES, SDD_ORCHESTRATOR_PREFIX, GENTLE_ORCHESTRATOR_KEY, SDD_PHASE_PREFIX } from "@/services/profileStrategyService";
import { ModelsClientView } from "./modelsClientView";
import type { Assignment } from "./modelsClientTypes";
import { useAuditMode } from "@/lib/visual-audit/auditContext";
import { AUDIT_FIXTURE_CONFIG, AUDIT_FIXTURE_CATALOG, AUDIT_FIXTURE_PROFILES, AUDIT_FIXTURE_MODELS_ASSIGNMENTS } from "@/lib/visual-audit/fixtures";
import type { ProviderAuthStatus } from "@/lib/types";

/**
 * Name of the active generated profile from its orchestrator default agent.
 * Returns `""` for the base orchestrator (`gentle-orchestrator` or the bare
 * `sdd-orchestrator` prefix without a profile name).
 */
export function activeProfileName(defaultAgent: string): string {
  if (defaultAgent.startsWith(SDD_ORCHESTRATOR_PREFIX)) {
    const rest = defaultAgent.slice(SDD_ORCHESTRATOR_PREFIX.length);
    return rest;
  }
  return "";
}

/**
 * Technical default-agent key for a profile name: the base orchestrator for the
 * empty name, otherwise `sdd-orchestrator-{name}`. Kept as the single place
 * that owns this mapping so `activeProfile` always holds a technical key.
 */
export function profileDefaultAgentKey(name: string): string {
  return name === "" ? GENTLE_ORCHESTRATOR_KEY : `${SDD_ORCHESTRATOR_PREFIX}${name}`;
}

/**
 * Visible label for the active profile header/selector. The internal
 * `sdd-orchestrator-` prefix is never shown: a named profile renders its exact
 * profile name, and the base orchestrator renders `Gentle-Orchestrator`.
 */
export function activeProfileDisplayName(activeProfile: string): string {
  const name = activeProfileName(activeProfile);
  return name || "Gentle-Orchestrator";
}

/**
 * Human label for an assignment row: the exact profile name for a named
 * profile's orchestrator agent, so the internal `sdd-orchestrator-` prefix is
 * never shown. Returns `undefined` for phase agents and the base orchestrator,
 * which keep their existing agent-key label.
 */
export function assignmentRowLabel(
  agentKey: string,
  activeProfile: string,
): string | undefined {
  const name = activeProfileName(activeProfile);
  if (name && agentKey === `${SDD_ORCHESTRATOR_PREFIX}${name}`) {
    return name;
  }
  return undefined;
}

/**
 * Keep only the agents that belong to the active profile. A named profile owns
 * its orchestrator (`sdd-orchestrator-{name}`) and its phase agents
 * (`sdd-{phase}-{name}`); the base profile owns `gentle-orchestrator` and the
 * bare phase agents (`sdd-{phase}`). Agents of other profiles and unrelated
 * generals (e.g. `jd-*`) are isolated out. Internal agent keys are preserved so
 * saving still targets the correct config entry.
 */
export function filterAssignmentsForProfile(
  assignments: Assignment[],
  activeProfile: string,
): Assignment[] {
  const name = activeProfileName(activeProfile);
  const allowed = new Set<string>();
  if (name) {
    allowed.add(`${SDD_ORCHESTRATOR_PREFIX}${name}`);
    for (const phase of SDD_PHASES) {
      allowed.add(`${SDD_PHASE_PREFIX}${phase}-${name}`);
    }
  } else {
    allowed.add(GENTLE_ORCHESTRATOR_KEY);
    for (const phase of SDD_PHASES) {
      allowed.add(`${SDD_PHASE_PREFIX}${phase}`);
    }
  }
  return assignments.filter((a) => allowed.has(a.agentKey));
}



export function ModelsClient() {
  const isAuditMode = useAuditMode();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [originalAssignments, setOriginalAssignments] = useState<Assignment[]>([]);
  const [catalog, setCatalog] = useState<ModelCatalog>({});
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [providerAuthStatus, setProviderAuthStatus] = useState<ProviderAuthStatus | undefined>(undefined);
  const [catalogLoading, setCatalogLoading] = useState(true);
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
      setConnectedProviders(["openai", "anthropic", "google"]);
      setProviderAuthStatus(undefined);
      setCatalogLoading(false);
      setProfiles(AUDIT_FIXTURE_PROFILES.profiles);
      setActiveProfile(AUDIT_FIXTURE_CONFIG.defaultAgent);
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadCatalog(forceRefresh = false) {
      if (isMounted) setCatalogLoading(true);
      try {
        const catalogData = await getCatalog(forceRefresh ? { forceRefresh: true } : undefined);
        if (!isMounted) return;
        setCatalog(catalogData.catalog);
        setConnectedProviders(catalogData.connectedProviders ?? []);
        setProviderAuthStatus(catalogData.providerAuthStatus);
      } catch {
        if (!isMounted) return;
        setCatalog({});
        setConnectedProviders([]);
        setProviderAuthStatus(undefined);
      } finally {
        if (isMounted) setCatalogLoading(false);
      }
    }

    async function loadInitialData() {
      try {
        const [config, profilesData] = await Promise.all([
          getConfig(),
          listProfiles(),
        ]);

        if (!isMounted) return;

        setAssignments(config.assignments);
        setOriginalAssignments(config.assignments);
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
    void loadCatalog();

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
      // Update both assignments and originalAssignments to keep them in sync
      setAssignments((prev) =>
        prev.map((a) => (a.agentKey === agentKey ? { ...a, ...assignment } : a)),
      );
      setOriginalAssignments((prev) =>
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
      // activeProfile always holds the technical default-agent key, so the
      // filter/phase/save helpers keep working; only the visible name changes.
      setActiveProfile(profileDefaultAgentKey(name));
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
        clearModelCatalogCache();
        // Reload config to reflect any changes from sync
        const config = await getConfig();
        setAssignments(config.assignments);
        setOriginalAssignments(config.assignments);
        setCatalogLoading(true);
        void getCatalog({ forceRefresh: true })
          .then((catalogData) => {
            setCatalog(catalogData.catalog);
            setConnectedProviders(catalogData.connectedProviders ?? []);
            setProviderAuthStatus(catalogData.providerAuthStatus);
          })
          .catch(() => setCatalog({}))
          .finally(() => setCatalogLoading(false));
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
      connectedProviders={connectedProviders}
      providerAuthStatus={providerAuthStatus}
      catalogLoading={catalogLoading}
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
