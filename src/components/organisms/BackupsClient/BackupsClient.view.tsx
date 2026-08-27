"use client";

import {
  RefreshCw,
  HardDrive,
  Pin,
  PinOff,
  RotateCcw,
  Trash2,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/atoms/Badge/Badge";
import { ErrorBanner } from "@/components/molecules/ErrorBanner/ErrorBanner";
import { ListingEmptyState } from "@/components/molecules/ListingEmptyState/ListingEmptyState";
import { DeleteBackupModal } from "@/components/organisms/DeleteBackupModal";
import { cn } from "@/lib/utils";
import { t } from "@/resources/resources";
import { getBytes, formatDate } from "@/utils/formatting";
import type { BackupsClientViewProps } from "./BackupsClient.types";

export function BackupsClientView({
  backups,
  derivedBackups,
  loading,
  error,
  syncOutput,
  syncing,
  pendingAction,
  controls,
  resultCount,
  onControlsChange,
  onClearControls,
  onSync,
  onRestore,
  onPin,
  onUnpin,
  onDelete,
  deleteConfirmId,
  onDeleteConfirm,
  onDeleteCancel,
}: BackupsClientViewProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 border border-border bg-card p-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        <span>{t("backups_loading")}</span>
      </div>
    );
  }

  if (error) return <ErrorBanner title={t("backups_loadError")} message={error} />;

  const showNoData = backups.length === 0;
  const showNoMatches = backups.length > 0 && derivedBackups.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex-shrink-0 border border-border bg-card p-6 shadow-[4px_4px_0_0_var(--border)]">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center bg-primary/15">
            <RefreshCw className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <h4 className="font-mono text-sm font-bold uppercase text-card-foreground">{t("backups_sync_title")}</h4>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{t("backups_sync_description")}</p>
        <button
          onClick={onSync}
          disabled={syncing}
          className="flex cursor-pointer items-center justify-center gap-2 border border-border bg-primary px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[4px_4px_0_0_var(--border)] transition-all hover:shadow-[4px_4px_0_0_var(--primary)] disabled:pointer-events-none disabled:opacity-50 light:!border-black light:!bg-primary light:!text-white light:shadow-[4px_4px_0_0_#000000]"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          )}
          {t("backups_sync_action")}
        </button>
        {syncOutput && (
          <pre
            role="status"
            className={cn(
              "mt-4 max-h-48 overflow-auto border border-border bg-muted p-4 font-mono text-xs text-muted-foreground scrollbar-brutal",
            )}
          >
            {syncOutput}
          </pre>
        )}
       </div>

       <div className="min-h-0 flex-1 overflow-y-auto pr-4 scrollbar-brutal">
       {showNoData ? (
         <ListingEmptyState variant="no-data" entity="backups" />
       ) : showNoMatches ? (
         <ListingEmptyState variant="no-matches" entity="backups" onClear={onClearControls} />
       ) : (
         <div className="relative space-y-0">
           <div className="absolute left-4 top-4 bottom-4 w-px bg-border" aria-hidden="true" />
           <div className="space-y-3">
            {derivedBackups.map((backup) => (
              <div
                key={backup.id}
                className="relative flex items-start gap-4 border border-border bg-card p-4 transition-colors hover:border-primary/50"
              >
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center bg-muted ring-4 ring-card">
                  <HardDrive className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-mono text-sm font-bold text-card-foreground">{backup.id}</h4>
                    {backup.pinned && (
                      <Badge variant="error" pulsing className="gap-1">
                        <Pin className="h-3 w-3" aria-hidden="true" />
                        {t("backups_pinned")}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
                    <span>
                      {t("backups_source")}: {backup.source}
                    </span>
                    <span>
                       {backup.fileCount} {t("backups_files")}
                     </span>
                     <span>{getBytes(backup.size)}</span>
                  </div>
                   <p className="mt-1 font-mono text-xs text-muted-foreground/70">{formatDate(backup.timestamp)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onRestore(backup.id, backup.source)}
                      disabled={pendingAction === `restore:${backup.id}`}
                      className="flex cursor-pointer items-center justify-center gap-2 border border-border bg-card px-3 py-2 font-mono text-xs font-bold uppercase tracking-wide text-card-foreground shadow-[4px_4px_0_0_var(--border)] transition-shadow hover:!shadow-none disabled:pointer-events-none disabled:opacity-50 light:border-black light:text-black"
                    >
                      {pendingAction === `restore:${backup.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {t("backups_restore")}
                    </button>
                    <button
                      type="button"
                      onClick={() => (backup.pinned ? onUnpin(backup.id) : onPin(backup.id))}
                      disabled={pendingAction === `pin:${backup.id}` || pendingAction === `unpin:${backup.id}`}
                      className="flex cursor-pointer items-center justify-center gap-2 border border-border bg-card px-3 py-2 font-mono text-xs font-bold uppercase tracking-wide text-card-foreground shadow-[4px_4px_0_0_var(--border)] transition-shadow hover:!shadow-none disabled:pointer-events-none disabled:opacity-50 light:border-black light:text-black"
                    >
                      {pendingAction === `pin:${backup.id}` || pendingAction === `unpin:${backup.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : backup.pinned ? (
                        <PinOff className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {backup.pinned ? t("backups_unpin") : t("backups_pin")}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(backup.id)}
                      disabled={pendingAction === `delete:${backup.id}`}
                      className="flex cursor-pointer items-center justify-center gap-2 border border-border bg-card px-3 py-2 font-mono text-xs font-bold uppercase tracking-wide text-card-foreground shadow-[4px_4px_0_0_var(--border)] transition-shadow hover:!shadow-none disabled:pointer-events-none disabled:opacity-50 light:border-black light:text-black"
                    >
                      {pendingAction === `delete:${backup.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {t("backups_delete")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
       )}
       </div>

       {deleteConfirmId && (
         <DeleteBackupModal
          backupName={deleteConfirmId}
          onConfirm={onDeleteConfirm}
          onCancel={onDeleteCancel}
        />
      )}
    </div>
  );
}
