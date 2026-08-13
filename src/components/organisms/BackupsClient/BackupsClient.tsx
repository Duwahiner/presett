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
    setSyncOutput(t("backups_sync_running"));
    try {
      const data = await runSync();
      setSyncOutput(
        `${t("backups_exitCode")}: ${data.exitCode}\n${data.stdout}\n${data.stderr}`.trim(),
      );
    } catch (cause) {
      setSyncOutput(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function handlePin(id: string) {
    try {
      await pinBackup(id);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function handleUnpin(id: string) {
    try {
      await unpinBackup(id);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirmId) return;
    try {
      await deleteBackup(deleteConfirmId, { confirmed: true });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setDeleteConfirmId(null);
    }
  }

  async function handleRestoreConfirm() {
    if (!restoreConfirmId) return;
    try {
      await restoreBackup(restoreConfirmId, { confirmed: true });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setRestoreConfirmId(null);
    }
  }

  return (
    <BackupsClientView
      backups={backups}
      loading={loading}
      error={error}
      syncOutput={syncOutput}
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
