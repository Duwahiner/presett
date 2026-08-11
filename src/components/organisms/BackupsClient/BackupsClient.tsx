"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/atoms/Button/Button";
import { ErrorBanner } from "@/components/molecules/ErrorBanner/ErrorBanner";

interface BackupInfo {
  id: string;
  source: string;
  timestamp: string;
  fileCount: number;
  size: number;
  pinned: boolean;
}

export function BackupsClient() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncOutput, setSyncOutput] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/backups");
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error?.message ?? "Failed to load backups");
        }
        const data = await response.json();
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
    setSyncOutput("Running gentle-ai sync...");
    try {
      const response = await fetch("/api/sync", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message ?? "Sync failed");
      }

      setSyncOutput(
        `Exit code: ${data.exitCode}\n${data.stdout}\n${data.stderr}`.trim(),
      );
    } catch (cause) {
      setSyncOutput(cause instanceof Error ? cause.message : String(cause));
    }
  }

  if (loading) return <p className="text-zinc-400">Loading...</p>;
  if (error)
    return <ErrorBanner title="Could not load backups" message={error} />;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h4 className="mb-2 font-medium text-zinc-100">Sync</h4>
        <p className="mb-4 text-sm text-zinc-500">
          Run <code>gentle-ai sync</code> to reconcile OpenCode config state.
        </p>
        <Button onClick={handleSync}>Run Sync</Button>
        {syncOutput && (
          <pre className="mt-4 max-h-48 overflow-auto rounded-md bg-zinc-950 p-3 text-xs text-zinc-300">
            {syncOutput}
          </pre>
        )}
      </div>

      {backups.length === 0 ? (
        <p className="text-zinc-500">No backups found.</p>
      ) : (
        <div className="space-y-2">
          {backups.map((backup) => (
            <div
              key={backup.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-zinc-100">{backup.id}</h4>
                {backup.pinned && (
                  <span className="text-xs text-rose-400">pinned</span>
                )}
              </div>
              <p className="text-sm text-zinc-500">Source: {backup.source}</p>
              <p className="text-sm text-zinc-500">
                {backup.fileCount} files · {backup.size} bytes · {backup.timestamp}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
