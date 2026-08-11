"use client";

import { RefreshCw, HardDrive, Pin, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-8 text-muted-foreground shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        <span>{t("backups_loading")}</span>
      </div>
    );
  }

  if (error) return <ErrorBanner title={t("backups_loadError")} message={error} />;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-border/80">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <RefreshCw className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <h4 className="font-semibold text-card-foreground">{t("backups_sync_title")}</h4>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{t("backups_sync_description")}</p>
        <Button onClick={onSync} className="w-full sm:w-auto">
          <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {t("backups_sync_action")}
        </Button>
        {syncOutput && (
          <pre className="mt-4 max-h-48 overflow-auto rounded-lg border border-border bg-muted p-4 font-mono text-xs text-success">
            {syncOutput}
          </pre>
        )}
      </div>

      {backups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card/40 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <AlertCircle className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <h4 className="mt-4 font-semibold text-card-foreground">{t("backups_noBackups")}</h4>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {t("backups_sync_description")}
          </p>
        </div>
      ) : (
        <div className="relative space-y-0">
          <div className="absolute left-4 top-4 bottom-4 w-px bg-border" aria-hidden="true" />
          <div className="space-y-3">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="relative flex items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-border/80 hover:bg-accent/40"
              >
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ring-4 ring-card">
                  <HardDrive className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-card-foreground">{backup.id}</h4>
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
                    <span>{backup.size} bytes</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground/70">{backup.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
