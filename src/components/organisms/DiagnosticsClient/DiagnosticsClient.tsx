"use client";

import { useEffect, useState, useRef } from "react";
import { Activity, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { Badge } from "@/components/atoms/Badge/Badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { t } from "@/resources/resources";
import { useNotificationToasts } from "@/hooks/useNotificationToasts";
import { checkDiagnosticsUpdates, getDiagnostics } from "@/services/diagnosticsApiService";
import type { DiagnosticsReport, DiagnosticsUpdateState, RouteState } from "@/services/diagnosticsService";
import { Spinner } from "@/components/ui/spinner";
import { PageSkeleton } from "@/components/molecules/PageSkeleton/PageSkeleton";
import { FloatingLoadingIndicator } from "@/components/molecules/FloatingLoadingIndicator/FloatingLoadingIndicator";

function StatusBadge({ ok, text }: { ok: boolean; text: string }) {
  return <Badge variant={ok ? "success" : "error"}>{text}</Badge>;
}

function RouteRow({ label, state }: { label: string; state: RouteState }) {
  const items = [
    [t("diagnostics_exists"), state.exists],
    [t("diagnostics_readable"), state.readable],
    [t("diagnostics_writable"), state.writable],
  ] as const;

  return (
    <li className="rounded-xl border border-border bg-muted/30 p-4">
      <h3 className="font-medium text-card-foreground">{label}</h3>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        {items.map(([name, ok]) => (
          <div key={name} className="flex items-center justify-between gap-2 rounded-lg bg-card px-3 py-2">
            <dt className="text-muted-foreground">{name}</dt>
            <dd className={ok ? "text-success" : "text-destructive"}>{ok ? t("diagnostics_yes") : t("diagnostics_no")}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

function ChannelCard({ label, version, available }: { label: string; version?: string; available: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium text-card-foreground">{label}</h3>
        <StatusBadge ok={available} text={available ? t("diagnostics_available") : t("diagnostics_no_update")} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{version ?? t("diagnostics_unavailable")}</p>
    </div>
  );
}

export function DiagnosticsClient() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsReport | null>(null);
  const [updates, setUpdates] = useState<DiagnosticsUpdateState | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const lastPushedUpdateRef = useRef<string | null>(null);
  const { onError, push } = useNotificationToasts();

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [local, releaseState] = await Promise.all([getDiagnostics(), checkDiagnosticsUpdates()]);
        if (!mounted) return;
        setDiagnostics(local);
        setUpdates(releaseState);
      } catch (cause) {
        if (mounted) onError(t("diagnostics_title"), cause instanceof Error ? cause.message : t("diagnostics_load_error"));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  // Push update detection as a persistent notification (not inline alert)
  useEffect(() => {
    if (updates?.notice?.pending && lastPushedUpdateRef.current !== updates.notice.version) {
      lastPushedUpdateRef.current = updates.notice.version;
      push({ severity: "update", title: t("notif_update_available", { version: updates.notice.version }), message: t("diagnostics_update_notice", { version: updates.notice.version, channel: updates.notice.channel }) });
    }
  }, [updates, push]);

  async function handleCheck() {
    if (checking) return;
    setChecking(true);
    try {
      setUpdates(await checkDiagnosticsUpdates());
    } catch (cause) {
      onError(t("diagnostics_title"), cause instanceof Error ? cause.message : t("diagnostics_check_error"));
    } finally {
      setChecking(false);
    }
  }

  if (loading) {
    return <PageSkeleton variant="diagnostics" label={t("diagnostics_loading")} />;
  }

  return (
    <div className="space-y-6">
      {checking && <FloatingLoadingIndicator label={t("loading_background")} />}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Activity className="h-5 w-5 text-primary" aria-hidden="true" />{t("diagnostics_releases_title")}</h2>
          <Button onClick={handleCheck} disabled={checking}>
            {checking ? <Spinner data-icon="inline-start" aria-hidden="true" /> : <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />}
            {checking ? t("diagnostics_checking") : t("diagnostics_check_now")}
          </Button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ChannelCard label={t("diagnostics_stable")} version={updates?.channels?.stable.latestVersion} available={Boolean(updates?.channels?.stable.updateAvailable)} />
          <ChannelCard label={t("diagnostics_rc")} version={updates?.channels?.rc.latestVersion} available={Boolean(updates?.channels?.rc.updateAvailable)} />
        </div>
      </Card>

      {diagnostics && <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5"><h2 className="font-semibold">{t("diagnostics_cli_title")}</h2><p className="mt-2 text-sm text-muted-foreground">{diagnostics.cli.installed ? diagnostics.cli.version : diagnostics.cli.error}</p><StatusBadge ok={diagnostics.cli.installed} text={diagnostics.cli.installed ? t("diagnostics_installed") : t("diagnostics_unavailable")} /></Card>
        <Card className="p-5"><h2 className="font-semibold">{t("diagnostics_config_title")}</h2><p className="mt-2 text-sm text-muted-foreground">{diagnostics.config.available ? t("diagnostics_available") : diagnostics.config.error}</p><CheckCircle2 className={cn("mt-3 h-5 w-5", diagnostics.config.available ? "text-success" : "hidden")} aria-hidden="true" /><XCircle className={cn("mt-3 h-5 w-5", diagnostics.config.available ? "hidden" : "text-destructive")} aria-hidden="true" /></Card>
        <Card className="p-5"><h2 className="font-semibold">{t("diagnostics_state_title")}</h2><p className="mt-2 text-sm text-muted-foreground">{diagnostics.state.available ? t("diagnostics_available") : diagnostics.state.error}</p><CheckCircle2 className={cn("mt-3 h-5 w-5", diagnostics.state.available ? "text-success" : "hidden")} aria-hidden="true" /><XCircle className={cn("mt-3 h-5 w-5", diagnostics.state.available ? "hidden" : "text-destructive")} aria-hidden="true" /></Card>
      </div>}

      {diagnostics && <Card className="p-6"><h2 className="mb-4 text-lg font-semibold">{t("diagnostics_routes_title")}</h2><ul className="grid gap-3"><RouteRow label={t("diagnostics_route_config")} state={diagnostics.routes.config} /><RouteRow label={t("diagnostics_route_state")} state={diagnostics.routes.state} /><RouteRow label={t("diagnostics_route_backups")} state={diagnostics.routes.backups} /></ul></Card>}
    </div>
  );
}
