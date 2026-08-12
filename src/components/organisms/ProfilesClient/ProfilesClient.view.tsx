"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2, UserCircle, Sparkles, Check, Info, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/atoms/Badge/Badge";
import { ErrorBanner } from "@/components/molecules/ErrorBanner/ErrorBanner";
import { t } from "@/resources/resources";
import type { ProfilesClientViewProps } from "./ProfilesClient.types";
import type { ModelCatalog } from "@/components/molecules/ModelPicker/ModelPicker";
import { Select } from "@/components/ui/select";

function OrchestratorPicker({
  catalog,
  value,
  onChange,
}: {
  catalog: ModelCatalog;
  value: { provider: string; model: string; variant: string };
  onChange: (v: { provider: string; model: string; variant: string }) => void;
}) {
  const providers = Object.keys(catalog);
  const models = Object.keys(catalog[value.provider] ?? {});
  const variants = catalog[value.provider]?.[value.model] ?? [];
  const isAssigned = Boolean(value.provider && value.model && value.variant);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("modelPicker_provider")}
          </label>
          <Select.Root
            value={value.provider || null}
            onValueChange={(v) => onChange({ provider: v ?? "", model: "", variant: "" })}
          >
            <Select.Trigger
              aria-label={t("modelPicker_provider")}
              className={cn(
                "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              )}
            >
              <Select.Value placeholder={t("modelPicker_provider")} />
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner className="z-50">
                <Select.Popup className="max-h-60 min-w-[var(--anchor-width)] overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                  {providers.map((p) => (
                    <Select.Item key={p} value={p} className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground">
                      <Select.ItemText>{p}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("modelPicker_model")}
          </label>
          <Select.Root
            value={value.model || null}
            onValueChange={(v) => onChange({ ...value, model: v ?? "", variant: "" })}
            disabled={!value.provider}
          >
            <Select.Trigger
              aria-label={t("modelPicker_model")}
              className={cn(
                "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <Select.Value placeholder={t("modelPicker_model")} />
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner className="z-50">
                <Select.Popup className="max-h-60 min-w-[var(--anchor-width)] overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                  {models.map((m) => (
                    <Select.Item key={m} value={m} className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground">
                      <Select.ItemText>{m}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("modelPicker_variant")}
          </label>
          <Select.Root
            value={value.variant || null}
            onValueChange={(v) => onChange({ ...value, variant: v ?? "" })}
            disabled={!value.model}
          >
            <Select.Trigger
              aria-label={t("modelPicker_variant")}
              className={cn(
                "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <Select.Value placeholder={t("modelPicker_variant")} />
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner className="z-50">
                <Select.Popup className="max-h-60 min-w-[var(--anchor-width)] overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                  {variants.map((v) => (
                    <Select.Item key={v} value={v} className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground">
                      <Select.ItemText>{v}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(value)}
        disabled={!isAssigned}
      >
        <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        {t("profiles_saveAssignment")}
      </Button>
    </div>
  );
}

export function ProfilesClientView({
  profiles,
  catalog,
  loading,
  error,
  newName,
  newAssignments,
  onNewNameChange,
  onAssignmentChange,
  onCreate,
  onSwitch,
  onDelete,
  editingProfile,
  editAssignments,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditAssignmentChange,
}: ProfilesClientViewProps) {
  const [showForm, setShowForm] = useState(false);
  const isAssigned = Boolean(newAssignments["orchestrator"]?.provider && newAssignments["orchestrator"]?.model && newAssignments["orchestrator"]?.variant);

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        <span>{t("profiles_loading")}</span>
      </div>
    );
  }

  if (error) return <ErrorBanner title={t("profiles_loadError")} message={error} />;

  return (
    <div className="space-y-6">
      {/* Create Profile Form */}
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="group flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 transition-all hover:border-primary/60 hover:bg-primary/10"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform group-hover:scale-110 group-hover:bg-primary/20">
            <Plus className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="text-left">
            <span className="block text-sm font-semibold text-primary">{t("profiles_create_title")}</span>
            <span className="block text-xs text-muted-foreground">{t("profiles_create_description")}</span>
          </div>
        </button>
      ) : (
        <form
          onSubmit={onCreate}
          className="rounded-xl border border-border bg-card p-6"
        >
          {/* Header */}
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Plus className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h4 className="font-semibold text-card-foreground">{t("profiles_create_title")}</h4>
              <p className="text-sm text-muted-foreground">{t("profiles_create_description")}</p>
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="profile-name"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {t("profiles_create_placeholder")}
            </label>
            <Input
              id="profile-name"
              type="text"
              placeholder={t("profiles_create_placeholder")}
              value={newName}
              onChange={(e) => onNewNameChange(e.target.value)}
            />
          </div>

          {/* Orchestrator Assignment */}
          <div className="mt-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                <h5 className="text-sm font-medium text-card-foreground">{t("profiles_orchestrator_assignment")}</h5>
              </div>
              {isAssigned && (
                <Badge variant="success" className="gap-1">
                  <Check className="h-3 w-3" />
                  {t("profiles_assigned")}
                </Badge>
              )}
            </div>

            <OrchestratorPicker
              catalog={catalog}
              value={newAssignments["orchestrator"] ?? { provider: "", model: "", variant: "" }}
              onChange={(a) => onAssignmentChange("orchestrator", a)}
            />

            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              {t("profiles_create_required")}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex items-center gap-3">
            <Button
              type="submit"
              disabled={!newName || !isAssigned}
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t("profiles_create_action")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onNewNameChange("");
                onAssignmentChange("orchestrator", { provider: "", model: "", variant: "" });
              }}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {t("profiles_clear")}
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setShowForm(false);
                onNewNameChange("");
                onAssignmentChange("orchestrator", { provider: "", model: "", variant: "" });
              }}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {t("profiles_discard")}
            </Button>
          </div>
        </form>
      )}

      {/* Profile List */}
      <div className="space-y-3">
        {profiles.map((profile) => (
          <div
            key={profile.name}
            className={`relative rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80 hover:bg-accent/40 ${
              profile.active ? "border-l-4 border-l-primary pl-3" : ""
            }`}
          >
            {editingProfile === profile.name ? (
              <div className="w-full space-y-4">
                <div className="flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-card-foreground">
                    {t("profiles_editTitle")} {profile.displayName}
                  </h4>
                </div>
                <OrchestratorPicker
                  catalog={catalog}
                  value={editAssignments["orchestrator"] ?? { provider: "", model: "", variant: "" }}
                  onChange={(a) => onEditAssignmentChange("orchestrator", a)}
                />
                <div className="flex gap-2">
                  <Button onClick={onEditSave} disabled={!editAssignments["orchestrator"]?.provider}>
                    {t("profiles_save")}
                  </Button>
                  <Button variant="outline" onClick={onEditCancel}>
                    {t("backups_cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <UserCircle className="h-4 w-4 text-primary" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate font-semibold text-card-foreground">
                        {profile.displayName}
                      </h4>
                      {profile.active && (
                        <Badge variant="success" pulsing>
                          {t("profiles_active")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {profile.modelCount}{" "}
                      {profile.modelCount === 1
                        ? t("profiles_modelAssignments")
                        : t("profiles_modelAssignments_plural")}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditStart(profile.name)}
                    aria-label={t("profiles_edit")}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    {t("profiles_edit")}
                  </Button>
                  {!profile.active && (
                    <Button variant="ghost" size="sm" onClick={() => onSwitch(profile.name)}>
                      {t("profiles_switch")}
                    </Button>
                  )}
                  {profile.name ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(profile.name)}
                      aria-label={t("profiles_delete")}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
