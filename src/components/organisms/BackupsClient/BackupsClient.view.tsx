"use client";

import { RefreshCw, HardDrive, Pin, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import { Badge } from "@/components/atoms/Badge/Badge";
import { ErrorBanner } from "@/components/molecules/ErrorBanner/ErrorBanner";
import { t } from "@/resources/resources";
import type { BackupsClientViewProps } from "./BackupsClient.types";

export function BackupsClientView({
  backups,
  loading,
  error,
  syncOutput,
  onSync,
}: BackupsClientViewProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-zinc-900/60 p-8 text-zinc-400 shadow-xl backdrop-blur-sm">
        <Loader2 className="h-5 w-5 animate-spin text-rose-400" aria-hidden="true" />
        <span>{t("backups_loading")}</span>
      </div>
    );
  }

  if (error) return <ErrorBanner title={t("backups_loadError")} message={error} />;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/[0.08] bg-zinc-900/60 p-6 shadow-xl shadow-black/20 backdrop-blur-sm transition-colors hover:border-white/15">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/20 to-orange-500/10">
            <RefreshCw className="h-4 w-4 text-rose-400" aria-hidden="true" />
          </div>
          <h4 className="font-semibold text-zinc-100">{t("backups_sync_title")}</h4>
        </div>
        <p className="mb-4 text-sm text-zinc-400">{t("backups_sync_description")}</p>
        <Button onClick={onSync} className="w-full sm:w-auto">
          <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {t("backups_sync_action")}
        </Button>
        {syncOutput && (
          <pre className="mt-4 max-h-48 overflow-auto rounded-lg border border-white/5 bg-zinc-950 p-4 font-mono text-xs text-green-400">
            {syncOutput}
          </pre>
        )}
      </div>

      {backups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-zinc-900/40 p-12 text-center backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/20 to-orange-500/10">
            <AlertCircle className="h-7 w-7 text-rose-400" aria-hidden="true" />
          </div>
          <h4 className="mt-4 font-semibold text-zinc-100">{t("backups_noBackups")}</h4>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            {t("backups_sync_description")}
          </p>
        </div>
      ) : (
        <div className="relative space-y-0">
          <div className="absolute left-4 top-4 bottom-4 w-px bg-white/10" aria-hidden="true" />
          <div className="space-y-3">
            {backups.map((backup, index) => (
              <div
                key={backup.id}
                className="relative flex items-start gap-4 rounded-xl border border-white/[0.08] bg-zinc-900/60 p-4 shadow-xl shadow-black/20 backdrop-blur-sm transition-colors hover:border-white/15 hover:bg-zinc-900/80"
              >
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 ring-4 ring-zinc-950">
                  <HardDrive className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-zinc-100">{backup.id}</h4>
                    {backup.pinned && (
                      <Badge variant="error" pulsing className="gap-1">
                        <Pin className="h-3 w-3" aria-hidden="true" />
                        {t("backups_pinned")}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 grid gap-1 text-sm text-zinc-500 sm:grid-cols-3">
                    <span>
                      {t("backups_source")}: {backup.source}
                    </span>
                    <span>
                      {backup.fileCount} {t("backups_files")}
                    </span>
                    <span>{backup.size} bytes</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">{backup.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
