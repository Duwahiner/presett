"use client";

import { useRef, useState } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { t } from "@/resources/resources";
import type { Resources } from "@/resources/types";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import type { ModelCatalog } from "@/components/molecules/ModelPicker/modelPicker";
import { SDD_ORCHESTRATOR_PREFIX } from "@/services/profileStrategyService";

interface Assignment {
  provider: string;
  model: string;
  variant: string;
}

interface CreateProfilePanelProps {
  open: boolean;
  pendingAction: string | null;
  catalog: ModelCatalog;
  connectedProviders?: string[];
  newAssignments: Record<string, Assignment>;
  onAssignmentChange: (key: string, value: Assignment) => void;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

const EMPTY_ASSIGNMENT: Assignment = { provider: "", model: "", variant: "" };

const selectTriggerCls = cn(
  "flex h-9 w-full items-center justify-between border border-border bg-card px-3 py-1 text-sm transition-colors",
  "focus-visible:outline-none focus-visible:border-primary light:border-black light:bg-white light:text-black light:focus-visible:border-primary",
);

const selectDisabledTriggerCls = cn(
  "flex h-9 w-full items-center justify-between border border-border bg-card px-3 py-1 text-sm transition-colors",
  "focus-visible:outline-none focus-visible:border-primary",
  "disabled:cursor-not-allowed disabled:opacity-50 light:border-black light:bg-white light:text-black light:focus-visible:border-primary",
);

const selectPopupCls =
  "max-h-60 min-w-[var(--anchor-width)] overflow-auto border border-border bg-popover p-1 text-popover-foreground shadow-[4px_4px_0_0_var(--border)] scrollbar-brutal light:border-black light:bg-white light:text-black light:shadow-[4px_4px_0_0_#000000]";

const selectItemCls =
  "relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground";

function PhaseRow({
  phase,
  assignment,
  catalog,
  connectedProviders = [],
  onChange,
}: {
  phase: string;
  assignment: Assignment;
  catalog: ModelCatalog;
  connectedProviders?: string[];
  onChange: (assignment: Assignment) => void;
}) {
  const providers = Object.keys(catalog).sort();
  const models = Object.keys(catalog[assignment.provider] ?? {}).sort();
  const variants = [...(catalog[assignment.provider]?.[assignment.model] ?? [])].sort();
  const connectedSet = new Set(connectedProviders);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-bold uppercase tracking-wide text-foreground">
          {t(`profiles_phase_${phase}` as keyof Resources)}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {/* Provider Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("modelPicker_provider")}
          </label>
          <Select.Root
            value={assignment.provider || null}
            onValueChange={(v) => onChange({ provider: v ?? "", model: "", variant: "" })}
          >
            <Select.Trigger aria-label={t("modelPicker_provider")} className={selectTriggerCls}>
              <Select.Value placeholder={t("modelPicker_provider")} />
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner className="z-50">
                <Select.Popup className={selectPopupCls}>
                  {providers.map((p) => (
                    <Select.Item key={p} value={p} className={selectItemCls}>
                      <Select.ItemText className="flex items-center gap-2">
                        {p}
                        {connectedSet.has(p) && (
                          <span
                            className="inline-flex size-2 rounded-full bg-success"
                            title="Connected"
                          />
                        )}
                      </Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </div>

        {/* Model Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("modelPicker_model")}
          </label>
          <Select.Root
            value={assignment.model || null}
            onValueChange={(v) => onChange({ ...assignment, model: v ?? "", variant: "" })}
            disabled={!assignment.provider}
          >
            <Select.Trigger aria-label={t("modelPicker_model")} className={selectDisabledTriggerCls}>
              <Select.Value placeholder={t("modelPicker_model")} />
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner className="z-50">
                <Select.Popup className={selectPopupCls}>
                  {models.map((m) => (
                    <Select.Item key={m} value={m} className={selectItemCls}>
                      <Select.ItemText>{m}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </div>

        {/* Variant Select — always visible; disabled when the model has no variants */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("modelPicker_variant")}
          </label>
          <Select.Root
            value={assignment.variant || null}
            onValueChange={(v) => onChange({ ...assignment, variant: v ?? "" })}
            disabled={!assignment.model || variants.length === 0}
          >
            <Select.Trigger aria-label={t("modelPicker_variant")} className={selectDisabledTriggerCls}>
              <Select.Value placeholder={t("modelPicker_variant")} />
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner className="z-50">
                <Select.Popup className={selectPopupCls}>
                  {variants.map((v) => (
                    <Select.Item key={v} value={v} className={selectItemCls}>
                      <Select.ItemText>{v}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </div>
      </div>
    </div>
  );
}

export function normalizeName(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

export function CreateProfilePanel({
  open,
  pendingAction,
  catalog,
  connectedProviders = [],
  newAssignments,
  onAssignmentChange,
  onSubmit,
  onCancel,
}: CreateProfilePanelProps) {
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedName = normalizeName(name);
  const reservedPrefix = normalizedName.startsWith(SDD_ORCHESTRATOR_PREFIX);
  const nameError = (touched && !normalizedName) || reservedPrefix;

  const orchestratorAssignment = newAssignments["orchestrator"] ?? EMPTY_ASSIGNMENT;
  const orchestratorVariants = [
    ...(catalog[orchestratorAssignment.provider]?.[orchestratorAssignment.model] ?? []),
  ];
  const orchestratorAssigned = Boolean(
    orchestratorAssignment.provider &&
      orchestratorAssignment.model &&
      (orchestratorVariants.length === 0 || orchestratorAssignment.variant),
  );
  const canSubmit =
    Boolean(normalizedName) &&
    !reservedPrefix &&
    orchestratorAssigned &&
    pendingAction !== "create";

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!normalizedName || reservedPrefix || !orchestratorAssigned) return;
    onSubmit(normalizedName);
    setName("");
    setTouched(false);
  }

  return (
    <div className="mb-6 border border-dashed border-border bg-card/30 p-6">
      {/* Header */}
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
          <Plus className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-mono text-sm font-bold uppercase tracking-wide text-foreground">
            {t("profiles_create_title")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("profiles_create_description")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Name */}
        <div className="space-y-2">
          <label
            htmlFor="profile-name-panel"
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            {t("profiles_create_placeholder")}
          </label>
          <Input
            ref={inputRef}
            id="profile-name-panel"
            type="text"
            placeholder={t("profiles_create_placeholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={nameError}
            aria-describedby={nameError ? "profile-name-error" : undefined}
            className="border border-border focus-visible:border-primary light:border-black light:focus-visible:border-primary"
          />
          {nameError && (
            <p id="profile-name-error" className="text-xs font-medium text-destructive">
              {reservedPrefix
                ? t("profiles_name_reservedPrefix")
                : t("profiles_name_required")}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Use lowercase letters, numbers, hyphens or underscores. Other characters will be automatically removed.
          </p>
        </div>

        {/* Orchestrator — the single visible agent of the profile */}
        <div className="space-y-3 border border-dashed border-border p-4">
          <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-foreground">
            {t("profiles_section_orchestrator")}
          </h4>
          <PhaseRow
            phase="orchestrator"
            assignment={newAssignments["orchestrator"] ?? EMPTY_ASSIGNMENT}
            catalog={catalog}
            connectedProviders={connectedProviders}
            onChange={(value) => onAssignmentChange("orchestrator", value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center justify-center gap-2 border border-border bg-primary px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[4px_4px_0_0_var(--border)] transition-all hover:shadow-[4px_4px_0_0_var(--primary)] disabled:pointer-events-none disabled:opacity-50 light:!border-black light:!bg-primary light:!text-white light:shadow-[4px_4px_0_0_#000000]"
          >
            {pendingAction === "create" && (
              <Spinner aria-hidden="true" />
            )}
            <Plus className="h-4 w-4" />
            {t("profiles_save_profile")}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="flex cursor-pointer items-center justify-center gap-2 border border-border bg-card px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-card-foreground shadow-[4px_4px_0_0_var(--border)] transition-shadow hover:!shadow-none disabled:pointer-events-none disabled:opacity-50 light:border-black light:text-black"
          >
            {t("backups_cancel")}
          </button>

          <p className="flex-grow text-right text-xs text-muted-foreground">
            {t("profiles_createDisabledHelp")}
          </p>
        </div>
      </form>
    </div>
  );
}