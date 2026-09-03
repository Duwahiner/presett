"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { t } from "@/resources/resources";
import { useNotificationToasts } from "@/hooks/useNotificationToasts";
import { checkDiagnosticsUpdates, getDiagnostics } from "@/services/diagnosticsApiService";
import type { DiagnosticsReport, DiagnosticsUpdateState, RouteState } from "@/services/diagnosticsService";
import { Spinner } from "@/components/ui/spinner";
import { PageSkeleton } from "@/components/molecules/PageSkeleton/pageSkeleton";

function StatusBadge({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[11px] font-bold uppercase",
        ok ? "border-success text-success" : "border-destructive text-destructive",
      )}
    >
      {ok ? <CheckCircle2 className="size-3" aria-hidden="true" /> : <XCircle className="size-3" aria-hidden="true" />}
      {text}
    </span>
  );
}

function RouteRow({ label, state }: { label: string; state: RouteState }) {
  const items = [
    [t("diagnostics_exists"), state.exists],
    [t("diagnostics_readable"), state.readable],
    [t("diagnostics_writable"), state.writable],
  ] as const;

  return (
    <li className="border border-border bg-card p-4">
      <h3 className="font-mono text-xs font-bold uppercase text-card-foreground">{label}</h3>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        {items.map(([name, ok]) => (
          <div key={name} className="flex items-center justify-between gap-2 border border-border bg-muted px-3 py-2">
            <dt className="font-mono text-xs font-bold uppercase text-muted-foreground">{name}</dt>
            <dd className={ok ? "text-success" : "text-destructive"}>{ok ? t("diagnostics_yes") : t("diagnostics_no")}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

function ChannelCard({ label, version, available }: { label: string; version?: string; available: boolean }) {
  return (
    <div className="border border-border bg-card p-4 shadow-[4px_4px_0_0_var(--foreground)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-mono text-xs font-bold uppercase text-card-foreground">{label}</h3>
        <StatusBadge ok={available} text={available ? t("diagnostics_available") : t("diagnostics_no_update")} />
      </div>
      <p className="mt-2 font-mono text-sm text-muted-foreground">{version ?? t("diagnostics_unavailable")}</p>
    </div>
  );
}

export function DiagnosticsClient() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsReport | null>(null);
  const [updates, setUpdates] = useState<DiagnosticsUpdateState | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const { onError, onUpdate } = useNotificationToasts();

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

  // Surface update detection as a persistent notification AND a visible toast.
  // Semantic (version + channel) dedupe prevents duplicates across reloads and
  // between the dashboard and diagnostics clients, while never suppressing a
  // genuinely newer release.
  useEffect(() => {
    const notice = updates?.notice;
    if (notice?.pending) {
      onUpdate(
        t("notif_update_available", { version: notice.version }),
        t("diagnostics_update_notice", { version: notice.version, channel: notice.channel }),
        { version: notice.version, channel: notice.channel },
      );
    }
  }, [updates, onUpdate]);

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
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-wide text-card-foreground">
            <Activity className="size-5 text-primary" aria-hidden="true" />
            {t("diagnostics_releases_title")}
          </h2>
          <button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            className="flex cursor-pointer items-center gap-2 border border-border bg-primary px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[4px_4px_0_0_var(--foreground)] transition-shadow hover:!shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none disabled:pointer-events-none disabled:opacity-50"
          >
            {checking ? <Spinner aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
            {checking ? t("diagnostics_checking") : t("diagnostics_check_now")}
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ChannelCard label={t("diagnostics_stable")} version={updates?.channels?.stable.latestVersion} available={Boolean(updates?.channels?.stable.updateAvailable)} />
          <ChannelCard label={t("diagnostics_rc")} version={updates?.channels?.rc.latestVersion} available={Boolean(updates?.channels?.rc.updateAvailable)} />
        </div>
      </Card>

      {diagnostics && <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="font-mono text-xs font-bold uppercase text-card-foreground">{t("diagnostics_cli_title")}</h2>
          <p className="mt-2 font-mono text-sm text-muted-foreground">{diagnostics.cli.installed ? diagnostics.cli.version : diagnostics.cli.error}</p>
          <div className="mt-3"><StatusBadge ok={diagnostics.cli.installed} text={diagnostics.cli.installed ? t("diagnostics_installed") : t("diagnostics_unavailable")} /></div>
        </Card>
        <Card className="p-5">
          <h2 className="font-mono text-xs font-bold uppercase text-card-foreground">{t("diagnostics_config_title")}</h2>
          <p className="mt-2 font-mono text-sm text-muted-foreground">{diagnostics.config.available ? t("diagnostics_available") : diagnostics.config.error}</p>
          <div className="mt-3"><StatusBadge ok={diagnostics.config.available} text={diagnostics.config.available ? t("diagnostics_available") : t("diagnostics_unavailable")} /></div>
        </Card>
        <Card className="p-5">
          <h2 className="font-mono text-xs font-bold uppercase text-card-foreground">{t("diagnostics_state_title")}</h2>
          <p className="mt-2 font-mono text-sm text-muted-foreground">{diagnostics.state.available ? t("diagnostics_available") : diagnostics.state.error}</p>
          <div className="mt-3"><StatusBadge ok={diagnostics.state.available} text={diagnostics.state.available ? t("diagnostics_available") : t("diagnostics_unavailable")} /></div>
        </Card>
      </div>}

      {diagnostics && <Card className="p-6">
        <h2 className="mb-4 font-mono text-sm font-bold uppercase tracking-wide text-card-foreground">{t("diagnostics_routes_title")}</h2>
        <ul className="grid gap-3">
          <RouteRow label={t("diagnostics_route_config")} state={diagnostics.routes.config} />
          <RouteRow label={t("diagnostics_route_state")} state={diagnostics.routes.state} />
          <RouteRow label={t("diagnostics_route_backups")} state={diagnostics.routes.backups} />
        </ul>
      </Card>}
    </div>
  );
}