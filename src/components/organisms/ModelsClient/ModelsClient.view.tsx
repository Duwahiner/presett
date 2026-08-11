"use client";

import { Loader2 } from "lucide-react";
import { AgentAssignmentRow } from "@/components/molecules/AgentAssignmentRow/AgentAssignmentRow";
import { ErrorBanner } from "@/components/molecules/ErrorBanner/ErrorBanner";
import { t } from "@/resources/resources";
import type { ModelsClientViewProps } from "./ModelsClient.types";

export function ModelsClientView({
  assignments,
  catalog,
  loading,
  error,
  saving,
  onSave,
}: ModelsClientViewProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-8 text-muted-foreground shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        <span>{t("models_loading")}</span>
      </div>
    );
  }

  if (error) return <ErrorBanner title={t("models_loadError")} message={error} />;

  return (
    <div className="space-y-4">
      {Object.keys(catalog).length === 0 && (
        <ErrorBanner
          variant="warning"
          title={t("models_validationUnavailable")}
          message={t("models_validationMessage")}
        />
      )}

      <div className="space-y-3">
        {assignments.map((assignment) => (
          <AgentAssignmentRow
            key={assignment.agentKey}
            agentKey={assignment.agentKey}
            provider={assignment.provider}
            model={assignment.model}
            variant={assignment.variant}
            catalog={catalog}
            disabled={saving === assignment.agentKey || Object.keys(catalog).length === 0}
            onSave={(a) => onSave(assignment.agentKey, a)}
          />
        ))}
      </div>
    </div>
  );
}
