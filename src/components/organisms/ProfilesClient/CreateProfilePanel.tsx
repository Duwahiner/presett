"use client";

import { useRef, useState } from "react";
import { Loader2, Plus, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { t } from "@/resources/resources";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import type { ModelCatalog } from "@/components/molecules/ModelPicker/ModelPicker";

interface CreateProfilePanelProps {
  open: boolean;
  pendingAction: string | null;
  catalog: ModelCatalog;
  onSubmit: (name: string, assignment: { provider: string; model: string; variant: string }) => void;
  onCancel: () => void;
}

export function CreateProfilePanel({
  open,
  pendingAction,
  catalog,
  onSubmit,
  onCancel,
}: CreateProfilePanelProps) {
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const [assignment, setAssignment] = useState({ provider: "", model: "", variant: "" });
  const inputRef = useRef<HTMLInputElement>(null);

  const providers = Object.keys(catalog);
  const models = Object.keys(catalog[assignment.provider] ?? {});
  const variants = catalog[assignment.provider]?.[assignment.model] ?? [];

  const nameError = touched && !name.trim();
  const isAssigned = Boolean(assignment.provider && assignment.model && assignment.variant);
  const canSubmit = Boolean(name.trim()) && isAssigned && pendingAction !== "create";

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!name.trim() || !isAssigned) return;
    onSubmit(name.trim(), assignment);
    // Reset form
    setName("");
    setAssignment({ provider: "", model: "", variant: "" });
    setTouched(false);
  }

  return (
    <div className="mx-3 mb-6 border-2 border-dashed border-border bg-card/30 p-6">
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
            className="border-2 border-border focus-visible:border-primary light:border-black light:focus-visible:border-primary"
          />
          {nameError && (
            <p id="profile-name-error" className="text-xs font-medium text-destructive">
              {t("profiles_name_required")}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Use lowercase letters, numbers, hyphens or underscores. Other characters will be automatically removed.
          </p>
        </div>

        {/* Orchestrator Assignment Section */}
        <div className="space-y-4 border-2 border-dashed border-primary/50 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/20">
              <Plus className="h-3 w-3 text-primary" />
            </div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-foreground">
              {t("profiles_orchestrator_assignment")}
            </h4>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {/* Provider Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("modelPicker_provider")}
              </label>
              <Select.Root
                value={assignment.provider || null}
                onValueChange={(v) =>
                  setAssignment({ provider: v ?? "", model: "", variant: "" })
                }
              >
                <Select.Trigger
                  aria-label={t("modelPicker_provider")}
                  className={cn(
                    "flex h-9 w-full items-center justify-between border-2 border-border bg-card px-3 py-1 text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring light:border-black light:bg-white",
                  )}
                >
                  <Select.Value placeholder={t("modelPicker_provider")} />
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner className="z-50">
                    <Select.Popup className="max-h-60 min-w-[var(--anchor-width)] overflow-auto border-2 border-border bg-popover p-1 text-popover-foreground shadow-[4px_4px_0_0_var(--border)] scrollbar-brutal">
                      {providers.map((p) => (
                        <Select.Item
                          key={p}
                          value={p}
                          className="relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                        >
                          <Select.ItemText>{p}</Select.ItemText>
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
                onValueChange={(v) =>
                  setAssignment({ ...assignment, model: v ?? "", variant: "" })
                }
                disabled={!assignment.provider}
              >
                <Select.Trigger
                  aria-label={t("modelPicker_model")}
                  className={cn(
                    "flex h-9 w-full items-center justify-between border-2 border-border bg-card px-3 py-1 text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-50 light:border-black light:bg-white",
                  )}
                >
                  <Select.Value placeholder={t("modelPicker_model")} />
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner className="z-50">
                    <Select.Popup className="max-h-60 min-w-[var(--anchor-width)] overflow-auto border-2 border-border bg-popover p-1 text-popover-foreground shadow-[4px_4px_0_0_var(--border)] scrollbar-brutal">
                      {models.map((m) => (
                        <Select.Item
                          key={m}
                          value={m}
                          className="relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                        >
                          <Select.ItemText>{m}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* Variant Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("modelPicker_variant")}
              </label>
              <Select.Root
                value={assignment.variant || null}
                onValueChange={(v) =>
                  setAssignment({ ...assignment, variant: v ?? "" })
                }
                disabled={!assignment.model}
              >
                <Select.Trigger
                  aria-label={t("modelPicker_variant")}
                  className={cn(
                    "flex h-9 w-full items-center justify-between border-2 border-border bg-card px-3 py-1 text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-50 light:border-black light:bg-white",
                  )}
                >
                  <Select.Value placeholder={t("modelPicker_variant")} />
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner className="z-50">
                    <Select.Popup className="max-h-60 min-w-[var(--anchor-width)] overflow-auto border-2 border-border bg-popover p-1 text-popover-foreground shadow-[4px_4px_0_0_var(--border)] scrollbar-brutal">
                      {variants.map((v) => (
                        <Select.Item
                          key={v}
                          value={v}
                          className="relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                        >
                          <Select.ItemText>{v}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </div>
          </div>

          {/* Assignment Info */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="mt-0.5 text-primary">ℹ</span>
            <p>{t("profiles_create_required")}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center justify-center gap-2 border-2 border-border bg-primary px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[4px_4px_0_0_var(--border)] transition-all hover:shadow-[4px_4px_0_0_var(--primary)] disabled:pointer-events-none disabled:opacity-50 light:!border-black light:!bg-primary light:!text-white light:shadow-[4px_4px_0_0_#000000]"
          >
            {pendingAction === "create" && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            <Plus className="h-4 w-4" />
            {t("profiles_save_profile")}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="flex cursor-pointer items-center justify-center gap-2 border-2 border-border bg-card px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-card-foreground shadow-[4px_4px_0_0_var(--border)] transition-shadow hover:!shadow-none disabled:pointer-events-none disabled:opacity-50 light:border-black light:text-black"
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
