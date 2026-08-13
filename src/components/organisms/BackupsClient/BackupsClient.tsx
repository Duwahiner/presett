"use client";

import { useEffect, useState } from "react";
import {
  deleteBackup,
  listBackups,
  pinBackup,
  restoreBackup,
  runSync,
  unpinBackup,
} from "@/services/backupsApiService";
import { t } from "@/resources/resources";
import { BackupsClientView } from "./BackupsClient.view";
import type { BackupInfo } from "./BackupsClient.types";

export function BackupsClient() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncOutput, setSyncOutput] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);

  async function refresh() {
    try {
      const data = await listBackups();
      setBackups(data.backups);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  useEffect(() => {
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
  }, []);

  async function handleSync() {
    setSyncing(true);
    setFeedback(null);
    setSyncOutput(t("backups_sync_running"));
    try {
      const data = await runSync();
      setSyncOutput(
        `${t("backups_exitCode")}: ${data.exitCode}\n${data.stdout}\n${data.stderr}`.trim(),
      );
      setFeedback({ type: "success", message: t("backups_sync_success") });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setSyncOutput(`${t("backups_sync_failed")} ${message}`);
      setFeedback({ type: "error", message });
    } finally {
      setSyncing(false);
    }
  }

  async function handlePin(id: string) {
    setPendingAction(`pin:${id}`);
    setFeedback(null);
    try {
      await pinBackup(id);
      await refresh();
      setFeedback({ type: "success", message: t("backups_pin_success") });
    } catch (cause) {
      setFeedback({ type: "error", message: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleUnpin(id: string) {
    setPendingAction(`unpin:${id}`);
    setFeedback(null);
    try {
      await unpinBackup(id);
      await refresh();
      setFeedback({ type: "success", message: t("backups_unpin_success") });
    } catch (cause) {
      setFeedback({ type: "error", message: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirmId) return;
    setPendingAction(`delete:${deleteConfirmId}`);
    setFeedback(null);
    try {
      await deleteBackup(deleteConfirmId, { confirmed: true });
      await refresh();
      setFeedback({ type: "success", message: t("backups_delete_success") });
    } catch (cause) {
      setFeedback({ type: "error", message: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      setPendingAction(null);
      setDeleteConfirmId(null);
    }
  }

  async function handleRestoreConfirm() {
    if (!restoreConfirmId) return;
    setPendingAction(`restore:${restoreConfirmId}`);
    setFeedback(null);
    try {
      await restoreBackup(restoreConfirmId, { confirmed: true });
      await refresh();
      setFeedback({ type: "success", message: t("backups_restore_success") });
    } catch (cause) {
      setFeedback({ type: "error", message: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      setPendingAction(null);
      setRestoreConfirmId(null);
    }
  }

  return (
    <BackupsClientView
      backups={backups}
      loading={loading}
      error={error}
      syncOutput={syncOutput}
      syncing={syncing}
      feedback={feedback}
      pendingAction={pendingAction}
      onSync={handleSync}
      onRestore={setRestoreConfirmId}
      onPin={handlePin}
      onUnpin={handleUnpin}
      onDelete={setDeleteConfirmId}
      deleteConfirmId={deleteConfirmId}
      restoreConfirmId={restoreConfirmId}
      onDeleteConfirm={handleDeleteConfirm}
      onDeleteCancel={() => setDeleteConfirmId(null)}
      onRestoreConfirm={handleRestoreConfirm}
      onRestoreCancel={() => setRestoreConfirmId(null)}
    />
  );
}
