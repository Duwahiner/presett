"use client";

import { useEffect, useState, useCallback } from "react";
import {
  listBackups,
  runSync,
  restoreBackup,
  pinBackup,
  unpinBackup,
  deleteBackup,
} from "@/services/backupsApiService";
import { t } from "@/resources/resources";
import { BackupsClientView } from "./BackupsClient.view";
import type { BackupInfo } from "./BackupsClient.types";

export function BackupsClient() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncOutput, setSyncOutput] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await listBackups();
      setBackups(data.backups);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

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

  async function handleRestore(id: string) {
    try {
      await restoreBackup(id);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
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

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      t("backups_deleteConfirm").replace("{{id}}", id),
    );
    if (!confirmed) return;

    try {
      await deleteBackup(id);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <BackupsClientView
      backups={backups}
      loading={loading}
      error={error}
      syncOutput={syncOutput}
      onSync={handleSync}
      onRestore={handleRestore}
      onPin={handlePin}
      onUnpin={handleUnpin}
      onDelete={handleDelete}
    />
  );
}
