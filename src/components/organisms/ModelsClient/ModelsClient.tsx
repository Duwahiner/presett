"use client";

import { useEffect, useState } from "react";
import { getConfig, getCatalog, saveAssignment } from "@/services/modelsApiService";
import type { ModelCatalog } from "@/components/molecules/ModelPicker/ModelPicker";
import { ModelsClientView } from "./ModelsClient.view";
import type { Assignment } from "./ModelsClient.types";

export function ModelsClient() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [catalog, setCatalog] = useState<ModelCatalog>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [config, catalogData] = await Promise.all([getConfig(), getCatalog()]);
        setAssignments(config.assignments);
        setCatalog(catalogData.catalog);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setLoading(false);
      }
    }
    load();
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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(null);
    }
  }

  return (
    <ModelsClientView
      assignments={assignments}
      catalog={catalog}
      loading={loading}
      error={error}
      saving={saving}
      onSave={handleSave}
    />
  );
}
