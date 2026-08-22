"use client";

import { useState } from "react";
import { AlertCircle, Check, ChevronDown, RefreshCw, RotateCcw, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AgentAssignmentRow } from "@/components/molecules/AgentAssignmentRow/AgentAssignmentRow";
import { ErrorBanner } from "@/components/molecules/ErrorBanner/ErrorBanner";

import { ListingEmptyState } from "@/components/molecules/ListingEmptyState/ListingEmptyState";
import { t } from "@/resources/resources";
import type { ModelsClientViewProps } from "./ModelsClient.types";
import { Loader2 } from "lucide-react";

export function ModelsClientView({
  assignments,
  catalog,
  loading,
  error,
  saving,
  profiles,
  activeProfile,
  syncing,
  switchingProfile,
  resetting,
  onSave,
  onSwitchProfile,
  onSync,
  onReset,
}: ModelsClientViewProps) {
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-3 border-2 border-border bg-card p-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        <span>{t("models_loading")}</span>
      </div>
    );
  }

  if (error) return <ErrorBanner title={t("models_loadError")} message={error} />;

  const displayAssignments = assignments;

  return (
    <div className="flex flex-col h-full min-h-0 space-y-4">
      {/* Profile Selector */}
      <div className="flex items-center gap-3 border-2 border-border bg-card p-4">
        <div className="flex h-8 w-8 items-center justify-center bg-primary/15">
          <UserCircle className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("models_activeProfile")}
          </p>
          <p className="text-sm font-medium text-card-foreground">{activeProfile}</p>
        </div>
        <Select.Root value={activeProfile} onValueChange={(v) => { if (v) onSwitchProfile(v); }} disabled={switchingProfile}>
          <Select.Trigger
            aria-label={t("models_activeProfile")}
            className={cn(
              "flex h-9 w-full max-w-[200px] items-center justify-between border-2 border-border bg-transparent px-3 py-1 text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50 light:border-black",
            )}
          >
            <Select.Value />
            <ChevronDown className="size-4 text-muted-foreground" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner className="z-50">
              <Select.Popup
               className={cn(
                   "max-h-60 min-w-[var(--anchor-width)] overflow-auto border-2 border-border bg-popover p-1 text-popover-foreground shadow-[4px_4px_0_0_var(--border)] scrollbar-brutal",
                   "focus-visible:outline-none",
                 )}
              >
                {profiles.map((p) => (
                  <Select.Item
                    key={p.name}
                    value={p.name}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-sm outline-none",
                      "focus:bg-accent focus:text-accent-foreground",
                    )}
                  >
                    <span className="absolute left-2 flex size-3.5 items-center justify-center">
                      <Select.ItemIndicator>
                        <Check className="size-3" />
                      </Select.ItemIndicator>
                    </span>
                    <Select.ItemText className="pl-6">{p.displayName}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </div>

      {Object.keys(catalog).length === 0 && (
        <ErrorBanner
          variant="warning"
          title={t("models_validationUnavailable")}
          message={t("models_validationMessage")}
        />
      )}



      {/* Agent Assignments */}
      {assignments.length === 0 && displayAssignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-2 border-border bg-card p-8 text-center">
          <div className="flex h-10 w-10 items-center justify-center bg-primary/15">
            <AlertCircle className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <h4 className="mt-4 font-mono text-sm font-bold uppercase text-card-foreground">{t("models_emptyAssignmentsTitle")}</h4>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {t("models_emptyAssignmentsDesc")}
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-brutal space-y-3 pr-3">
          {displayAssignments.map((assignment) => (
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
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-4">
        <button
          type="button"
          onClick={onSync}
          disabled={syncing}
          className="flex items-center justify-center gap-2 border-2 border-border bg-primary px-4 py-3 font-mono text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[4px_4px_0_0_var(--border)] transition-all hover:shadow-[4px_4px_0_0_var(--primary)] disabled:pointer-events-none disabled:opacity-50 light:!border-black light:!bg-white light:!text-black light:shadow-[4px_4px_0_0_#000000]"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {t("models_syncNow")}
        </button>
        <button
          type="button"
          onClick={() => setResetDialogOpen(true)}
          disabled={resetting || assignments.length === 0}
          className="flex items-center justify-center gap-2 border-2 border-border bg-card px-4 py-3 font-mono text-sm font-bold uppercase tracking-wide text-card-foreground shadow-[4px_4px_0_0_var(--border)] transition-all hover:shadow-[4px_4px_0_0_var(--border)] disabled:pointer-events-none disabled:opacity-50 light:!border-black light:!bg-white light:!text-black light:shadow-[4px_4px_0_0_#000000]"
        >
          {resetting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          {t("models_resetAll")}
        </button>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title={t("models_resetConfirmTitle")}
        description={t("models_resetConfirmDesc")}
        confirmLabel={t("models_resetAll")}
        cancelLabel={t("backups_cancel")}
        variant="warning"
        onConfirm={() => {
          setResetDialogOpen(false);
          onReset();
        }}
      />
    </div>
  );
}
