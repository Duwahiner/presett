"use client";

import { Button } from "@/components/atoms/Button/Button";
import { ModelPicker } from "@/components/molecules/ModelPicker/ModelPicker";
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

export function AgentAssignmentRow({
  agentKey,
  provider,
  model,
  variant,
  catalog,
  disabled,
  onSave,
}: AgentAssignmentRowProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h4 className="font-medium text-zinc-100">{agentKey}</h4>
        <p className="text-sm text-zinc-500">
          {provider}/{model} ({variant || "unset"})
        </p>
      </div>
      <ModelPicker
        catalog={catalog}
        initialProvider={provider}
        initialModel={model}
        initialVariant={variant}
        disabled={disabled}
        onConfirm={onSave}
      />
    </div>
  );
}
