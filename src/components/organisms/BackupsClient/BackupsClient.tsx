"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deleteBackup,
  listBackups,
  pinBackup,
  restoreBackup,
  runSync,
  unpinBackup,
} from "@/services/backupsApiService";
import { t } from "@/resources/resources";
import { useNotificationToasts } from "@/hooks/useNotificationToasts";
import { filterAndSortBackups } from "./filterAndSortBackups";
import { BackupsClientView } from "./BackupsClient.view";
import type { BackupInfo } from "./BackupsClient.types";
import type { ListingControlsState } from "@/components/molecules/ListingControls/ListingControls.types";
import { useAuditMode } from "@/lib/visual-audit/audit-context";
import { AUDIT_FIXTURE_BACKUPS } from "@/lib/visual-audit/fixtures";

const CONTROLS_CONFIG = {
  search: { placeholder: "listing_search_placeholder" as const, ariaLabel: "listing_search_aria" as const },
  filters: [
    {
      key: "pinned",
      labelKey: "listing_filter_pinned" as const,
      options: [{ value: "true", labelKey: "backups_pinned" as const }],
    },
  ],
  sort: {
    fields: [
      { value: "timestamp", labelKey: "listing_sort_date" as const },
      { value: "size", labelKey: "listing_sort_size" as const },
      { value: "fileCount", labelKey: "listing_sort_fileCount" as const },
    ],
    defaultField: "timestamp",
    defaultDir: "desc" as const,
  },
};

const INITIAL_CONTROLS: ListingControlsState = {
  search: "",
  activeFilters: {},
  sortField: "timestamp",
  sortDir: "desc",
};

export function BackupsClient() {
  const isAuditMode = useAuditMode();
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncOutput, setSyncOutput] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [controls, setControls] = useState<ListingControlsState>(INITIAL_CONTROLS);
  const { onError, onSuccess } = useNotificationToasts();

  const derivedBackups = useMemo(
    () => filterAndSortBackups(backups, controls),
    [backups, controls],
  );

  async function refresh() {
    if (isAuditMode) return;
    try {
      const data = await listBackups();
      setBackups(data.backups);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  useEffect(() => {
    if (isAuditMode) {
      // Short-circuit to fixtures
      setBackups(AUDIT_FIXTURE_BACKUPS.backups);
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const data = await listBackups();
        setBackups(data.backups);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAuditMode]);

  function handleControlsChange(next: Partial<ListingControlsState>) {
    setControls((prev) => ({ ...prev, ...next }));
  }

  function handleClearControls() {
    setControls(INITIAL_CONTROLS);
  }

  async function handleSync() {
    if (isAuditMode) return; // Deny writes in audit mode
    setSyncing(true);
    setSyncOutput(t("backups_sync_running"));
    try {
      const data = await runSync();
      setSyncOutput(
        `${t("backups_exitCode")}: ${data.exitCode}\n${data.stdout}\n${data.stderr}`.trim(),
      );
      onSuccess(t("backups_sync_success"));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setSyncOutput(`${t("backups_sync_failed")} ${message}`);
      onError(t("backups_sync_failed"), message);
    } finally {
      setSyncing(false);
    }
  }

  async function handlePin(id: string) {
    if (isAuditMode) return; // Deny writes in audit mode
    setPendingAction(`pin:${id}`);
    try {
      await pinBackup(id);
      await refresh();
      onSuccess(t("backups_pin_success"));
    } catch (cause) {
      onError(t("backups_pin"), cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleUnpin(id: string) {
    if (isAuditMode) return; // Deny writes in audit mode
    setPendingAction(`unpin:${id}`);
    try {
      await unpinBackup(id);
      await refresh();
      onSuccess(t("backups_unpin_success"));
    } catch (cause) {
      onError(t("backups_unpin"), cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDeleteConfirm() {
    if (isAuditMode) return; // Deny writes in audit mode
    if (!deleteConfirmId) return;
    setPendingAction(`delete:${deleteConfirmId}`);
    try {
      await deleteBackup(deleteConfirmId, { confirmed: true });
      await refresh();
      onSuccess(t("backups_delete_success"));
    } catch (cause) {
      onError(t("backups_delete"), cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPendingAction(null);
      setDeleteConfirmId(null);
    }
  }

  async function handleRestore(id: string, name: string) {
    if (isAuditMode) return; // Deny writes in audit mode
    setPendingAction(`restore:${id}`);
    try {
      await restoreBackup(id, { confirmed: true });
      await refresh();
      onSuccess(t("backups_restore_success", { name }));
    } catch (cause) {
      onError(t("backups_restore"), cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <BackupsClientView
      backups={backups}
      derivedBackups={derivedBackups}
      loading={loading}
      error={error}
      syncOutput={syncOutput}
      syncing={syncing}
      pendingAction={pendingAction}
      controls={{ config: CONTROLS_CONFIG, state: controls }}
      resultCount={derivedBackups.length}
      onControlsChange={handleControlsChange}
      onClearControls={handleClearControls}
      onSync={handleSync}
      onRestore={handleRestore}
      onPin={handlePin}
      onUnpin={handleUnpin}
      onDelete={setDeleteConfirmId}
      deleteConfirmId={deleteConfirmId}
      onDeleteConfirm={handleDeleteConfirm}
      onDeleteCancel={() => setDeleteConfirmId(null)}
    />
  );
}
