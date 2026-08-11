"use client";

import { useEffect, useState } from "react";
import { AgentAssignmentRow } from "@/components/molecules/AgentAssignmentRow/AgentAssignmentRow";
import { ErrorBanner } from "@/components/molecules/ErrorBanner/ErrorBanner";
import type { ModelCatalog } from "@/components/molecules/ModelPicker/ModelPicker";

interface Assignment {
  agentKey: string;
  provider: string;
  model: string;
  variant: string;
}

interface ConfigResponse {
  defaultAgent?: string;
  assignments: Assignment[];
}

interface CatalogResponse {
  providers: string[];
  catalog: ModelCatalog;
}

export function ModelsClient() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [catalog, setCatalog] = useState<ModelCatalog>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [configRes, catalogRes] = await Promise.all([
          fetch("/api/config"),
          fetch("/api/models"),
        ]);

        if (!configRes.ok) {
          const body = await configRes.json();
          throw new Error(body.error?.message ?? "Failed to load config");
        }

        const config: ConfigResponse = await configRes.json();
        setAssignments(config.assignments);

        if (catalogRes.ok) {
          const data: CatalogResponse = await catalogRes.json();
          setCatalog(data.catalog);
        }
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
      const response = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentKey, ...assignment }),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Save failed");
      }

      setAssignments((prev) =>
        prev.map((a) =>
          a.agentKey === agentKey
            ? { ...a, ...assignment }
            : a,
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <p className="text-zinc-400">Loading...</p>;
  if (error)
    return <ErrorBanner title="Could not load models" message={error} />;

  return (
    <div className="space-y-4">
      {Object.keys(catalog).length === 0 && (
        <ErrorBanner
          title="Validation unavailable"
          message="The model catalog is missing. Save is disabled."
        />
      )}
      {assignments.map((assignment) => (
        <AgentAssignmentRow
          key={assignment.agentKey}
          agentKey={assignment.agentKey}
          provider={assignment.provider}
          model={assignment.model}
          variant={assignment.variant}
          catalog={catalog}
          disabled={saving === assignment.agentKey || Object.keys(catalog).length === 0}
          onSave={(a) => handleSave(assignment.agentKey, a)}
        />
      ))}
    </div>
  );
}
