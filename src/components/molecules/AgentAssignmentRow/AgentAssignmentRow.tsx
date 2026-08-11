"use client";

import { useMemo, useState } from "react";
import { Bot, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "@/components/molecules/ModelPicker/ModelPicker";
import { t } from "@/resources/resources";
import type { ModelCatalog } from "@/components/molecules/ModelPicker/ModelPicker";

export interface AgentAssignmentRowProps {
  agentKey: string;
  provider: string;
  model: string;
  variant: string;
  catalog: ModelCatalog;
  disabled?: boolean;
  onSave: (assignment: {
    provider: string;
    model: string;
    variant: string;
  }) => void;
}

function getAgentPrefixColor(agentKey: string): string {
  if (agentKey.startsWith("gentle-")) return "text-chart-1";
  if (agentKey.startsWith("sdd-")) return "text-chart-4";
  if (agentKey.startsWith("jd-")) return "text-chart-5";
  return "text-muted-foreground";
}

function formatAgentName(agentKey: string): { prefix: string; suffix: string } {
  const idx = agentKey.indexOf("-");
  if (idx === -1) return { prefix: "", suffix: agentKey };
  return {
    prefix: agentKey.slice(0, idx + 1),
    suffix: agentKey.slice(idx + 1),
  };
}

export function AgentAssignmentRow({
  agentKey,
  provider,
  model,
  variant,
  catalog,
  disabled,
  onSave,
}: AgentAssignmentRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { prefix, suffix } = useMemo(() => formatAgentName(agentKey), [agentKey]);
  const prefixColor = useMemo(() => getAgentPrefixColor(agentKey), [agentKey]);

  return (
    <div className="rounded-xl border border-border bg-card p-4 backdrop-blur-sm transition-colors hover:border-border/80 hover:bg-accent/40">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h4 className="truncate font-semibold text-card-foreground" aria-label={agentKey}>
              {prefix && <span className={prefixColor}>{prefix}</span>}
              <span>{suffix}</span>
            </h4>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {provider}
              </span>
              <span className="text-muted-foreground/50">/</span>
              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {model || t("agentAssignment_unset")}
              </span>
              <span className="text-muted-foreground/50">/</span>
              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {variant || t("agentAssignment_unset")}
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          aria-label={t("agentAssignment_edit")}
          aria-expanded={isEditing}
          disabled={disabled}
          onClick={() => setIsEditing((prev) => !prev)}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {isEditing && (
        <div className="mt-4 border-t border-border pt-4">
          <ModelPicker
            catalog={catalog}
            initialProvider={provider}
            initialModel={model}
            initialVariant={variant}
            disabled={disabled}
            onConfirm={(assignment) => {
              onSave(assignment);
              setIsEditing(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
