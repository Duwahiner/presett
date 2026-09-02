"use client";

import { useState } from "react";
import { Pencil, Trash2, UserCircle, Sparkles, Check, Info, RotateCcw, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/atoms/Button/button";
import { Badge } from "@/components/atoms/Badge/badge";
import { ErrorBanner } from "@/components/molecules/ErrorBanner/errorBanner";
import { ListingControls } from "@/components/molecules/ListingControls/listingControls";
import { ListingEmptyState } from "@/components/molecules/ListingEmptyState/listingEmptyState";
import { ConfirmDialog } from "@/components/ui/confirmDialog";
import { t } from "@/resources/resources";
import { Spinner } from "@/components/ui/spinner";
import { LoadingIndicator } from "@/components/molecules/loadingIndicator/loadingIndicator";
import { PageSkeleton } from "@/components/molecules/PageSkeleton/pageSkeleton";
import type { ProfilesClientViewProps } from "./profilesClientTypes";
import type { ModelCatalog } from "@/components/molecules/ModelPicker/modelPicker";
import { Select } from "@/components/ui/select";
import { CreateProfilePanel } from "./createProfilePanel";

function OrchestratorPicker({
  catalog,
  value,
  onChange,
  hideButton,
}: {
  catalog: ModelCatalog;
  value: { provider: string; model: string; variant: string };
  onChange: (v: { provider: string; model: string; variant: string }) => void;
  hideButton?: boolean;
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
                  "flex h-9 w-full items-center justify-between border border-border bg-card px-3 py-1 text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:border-primary light:border-black light:bg-white light:text-black light:focus-visible:border-primary",
                )}
              >
               <Select.Value placeholder={t("modelPicker_provider")} />
               <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
             </Select.Trigger>
            <Select.Portal>
              <Select.Positioner className="z-50">
                <Select.Popup className="max-h-60 min-w-[var(--anchor-width)] overflow-auto border border-border bg-popover p-1 text-popover-foreground shadow-[4px_4px_0_0_var(--border)] scrollbar-brutal light:border-black light:bg-white light:text-black light:shadow-[4px_4px_0_0_#000000]">
                   {providers.map((p) => (
                    <Select.Item key={p} value={p} className="relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground">
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
                  "flex h-9 w-full items-center justify-between border border-border bg-card px-3 py-1 text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:border-primary",
                  "disabled:cursor-not-allowed disabled:opacity-50 light:border-black light:bg-white light:text-black light:focus-visible:border-primary",
                )}
              >
               <Select.Value placeholder={t("modelPicker_model")} />
               <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
             </Select.Trigger>
            <Select.Portal>
              <Select.Positioner className="z-50">
                <Select.Popup className="max-h-60 min-w-[var(--anchor-width)] overflow-auto border border-border bg-popover p-1 text-popover-foreground shadow-[4px_4px_0_0_var(--border)] scrollbar-brutal light:border-black light:bg-white light:text-black light:shadow-[4px_4px_0_0_#000000]">
                   {models.map((m) => (
                    <Select.Item key={m} value={m} className="relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground">
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
                  "flex h-9 w-full items-center justify-between border border-border bg-card px-3 py-1 text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:border-primary",
                  "disabled:cursor-not-allowed disabled:opacity-50 light:border-black light:bg-white light:text-black light:focus-visible:border-primary",
                )}
              >
               <Select.Value placeholder={t("modelPicker_variant")} />
               <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
             </Select.Trigger>
            <Select.Portal>
              <Select.Positioner className="z-50">
                <Select.Popup className="max-h-60 min-w-[var(--anchor-width)] overflow-auto border border-border bg-popover p-1 text-popover-foreground shadow-[4px_4px_0_0_var(--border)] scrollbar-brutal light:border-black light:bg-white light:text-black light:shadow-[4px_4px_0_0_#000000]">
                   {variants.map((v) => (
                    <Select.Item key={v} value={v} className="relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground">
                      <Select.ItemText>{v}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </div>
      </div>

       {!hideButton && (
         <button
           type="button"
           onClick={() => onChange(value)}
           disabled={!isAssigned}
           className="flex cursor-pointer items-center justify-center border border-border bg-card p-2 text-card-foreground shadow-[4px_4px_0_0_var(--border)] transition-shadow hover:!shadow-none disabled:pointer-events-none disabled:opacity-50 light:border-black"
         >
           <Check className="h-3.5 w-3.5" aria-hidden="true" />
         </button>
       )}
    </div>
  );
}

export function ProfilesClientView({
  profiles,
  catalog,
  catalogLoading,
  loading,
  error,
  pendingAction,
  newAssignments,
  onAssignmentChange,
  onCreate,
  onSwitch,
  onDeleteStart,
  onDeleteConfirm,
  onDeleteCancel,
  deleteConfirmProfile,
  editingProfile,
  editAssignments,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditAssignmentChange,
  derivedProfiles,
  controls,
  controlsState,
  onControlsChange,
   onControlsClear,
   showForm,
   setShowForm,
   modalKey,
   setModalKey,
 }: ProfilesClientViewProps & {
  showForm?: boolean;
  setShowForm?: (show: boolean) => void;
  modalKey?: number;
  setModalKey?: (fn: (k: number) => number) => void;
}) {
  const [internalShowForm, setInternalShowForm] = useState(false);
  const [internalModalKey, setInternalModalKey] = useState(0);
  const activeShowForm = showForm ?? internalShowForm;
  const activeSetShowForm = setShowForm ?? setInternalShowForm;
  const activeModalKey = modalKey ?? internalModalKey;
  const activeSetModalKey = setModalKey ?? setInternalModalKey;
  const visibleProfiles = derivedProfiles ?? profiles;
  const isFiltered = Boolean(controlsState && (controlsState.search.length > 0 || Object.keys(controlsState.activeFilters).length > 0));
  const showNoData = profiles.length === 0;
  const showNoMatch = profiles.length > 0 && visibleProfiles.length === 0 && isFiltered;

  if (loading) {
    return <PageSkeleton variant="profiles" label={t("profiles_loading")} />;
  }

  if (error) return <ErrorBanner title={t("profiles_loadError")} message={error} />;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {catalogLoading && <LoadingIndicator label={t("loading_section")} />}

      {/* Delete Profile Confirmation Dialog */}
      {deleteConfirmProfile && (
        <ConfirmDialog
          open={Boolean(deleteConfirmProfile)}
          onOpenChange={(open) => {
            if (!open) onDeleteCancel();
          }}
          title={t("profiles_deleteConfirm", { name: deleteConfirmProfile })}
          description=""
          confirmLabel={t("profiles_delete")}
          cancelLabel={t("backups_cancel")}
          variant="warning"
          onConfirm={onDeleteConfirm}
        />
      )}

      {/* Scrollable Profile List */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-brutal">
        {/* Create Profile Panel */}
        <CreateProfilePanel
          key={activeModalKey}
          open={activeShowForm}
          pendingAction={pendingAction}
          catalog={catalog}
          onSubmit={onCreate}
          onCancel={() => activeSetShowForm(false)}
        />

        {showNoData && (
          <div className="flex flex-col items-center gap-4">
            <ListingEmptyState variant="no-data" entity="profiles" />
            <Button
              onClick={() => activeSetShowForm(true)}
              aria-label={t("profiles_create_action")}
            >
              {t("profiles_create_title")}
            </Button>
          </div>
        )}

        {showNoMatch && (
          <ListingEmptyState
            variant="no-matches"
            entity="profiles"
            onClear={onControlsClear}
          />
        )}

        <div className="space-y-3">
        {visibleProfiles.map((profile) => (
          <div
            key={profile.name}
             className={`relative border border-border bg-card p-4 transition-colors hover:border-border hover:bg-muted`}
          >
            {editingProfile === profile.name ? (
              <div className="w-full space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-primary" />
                    <h4 className="font-mono text-sm font-bold uppercase text-card-foreground">
                      {t("profiles_editTitle")} {profile.displayName}
                    </h4>
                  </div>
                  <button
                     type="button"
                     onClick={() => onEditAssignmentChange("orchestrator", editAssignments["orchestrator"] ?? { provider: "", model: "", variant: "" })}
                     disabled={!editAssignments["orchestrator"]?.provider}
                     className="flex cursor-pointer items-center justify-center border border-border bg-card p-2 text-card-foreground shadow-[4px_4px_0_0_var(--border)] transition-shadow hover:!shadow-none disabled:pointer-events-none disabled:opacity-50 light:border-black"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                </div>
                <OrchestratorPicker
                  catalog={catalog}
                  value={editAssignments["orchestrator"] ?? { provider: "", model: "", variant: "" }}
                  onChange={(a) => onEditAssignmentChange("orchestrator", a)}
                  hideButton={true}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onEditSave}
                    disabled={!editAssignments["orchestrator"]?.provider || pendingAction === "edit"}
                     className="flex cursor-pointer items-center justify-center gap-2 border border-border bg-primary px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[4px_4px_0_0_var(--border)] transition-shadow hover:!shadow-none disabled:pointer-events-none disabled:opacity-50 light:!border-black light:!bg-primary light:!text-white light:shadow-[4px_4px_0_0_#000000]"
                  >
                    {pendingAction === "edit" && (
                      <Spinner data-icon="inline-start" aria-hidden="true" />
                    )}
                    {t("profiles_save")}
                  </button>
                  <button
                    type="button"
                    onClick={onEditCancel}
                     className="flex cursor-pointer items-center justify-center gap-2 border border-border bg-card px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-card-foreground shadow-[4px_4px_0_0_var(--border)] transition-shadow hover:!shadow-none disabled:pointer-events-none disabled:opacity-50 light:border-black light:text-black"
                  >
                    {t("backups_cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-primary/15">
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
                  <button
                    type="button"
                    onClick={() => onEditStart(profile.name)}
                    aria-label={t("profiles_edit")}
                     className="flex cursor-pointer items-center justify-center gap-2 border border-border bg-card px-3 py-2 font-mono text-xs font-bold uppercase tracking-wide text-card-foreground shadow-[4px_4px_0_0_var(--border)] transition-shadow hover:!shadow-none disabled:pointer-events-none disabled:opacity-50 light:border-black light:text-black"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("profiles_edit")}
                  </button>
                  {!profile.active && (
                      <button
                       type="button"
                       onClick={() => onSwitch(profile.name)}
                       disabled={pendingAction === `switch:${profile.name}`}
                       className="flex cursor-pointer items-center justify-center gap-2 border border-border bg-card px-3 py-2 font-mono text-xs font-bold uppercase tracking-wide text-card-foreground shadow-[4px_4px_0_0_var(--border)] transition-shadow hover:!shadow-none disabled:pointer-events-none disabled:opacity-50 light:border-black light:text-black"
                     >
                       {pendingAction === `switch:${profile.name}` && (
                         <Spinner data-icon="inline-start" aria-hidden="true" />
                       )}
                       {t("profiles_switch")}
                     </button>
                  )}
                  {profile.name ? (
                    <button
                      type="button"
                      onClick={() => onDeleteStart(profile.name)}
                      aria-label={t("profiles_delete")}
                      disabled={pendingAction === `delete:${profile.name}`}
                       className="flex cursor-pointer items-center justify-center gap-2 border border-border bg-card px-3 py-2 font-mono text-xs font-bold uppercase tracking-wide text-card-foreground shadow-[4px_4px_0_0_var(--border)] transition-shadow hover:!shadow-none disabled:pointer-events-none disabled:opacity-50 light:border-black light:text-black"
                      >
                        {pendingAction === `delete:${profile.name}` ? (
                          <Spinner data-icon="inline-start" aria-hidden="true" />
                        ) : (
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
