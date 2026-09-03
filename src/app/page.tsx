import { Dashboard } from "@/components/organisms/Dashboard/dashboard";
import { getConfig } from "@/services/modelsApiService";
import { listProfiles } from "@/services/profilesApiService";
import { listBackups } from "@/services/backupsApiService";
import type { ApiError } from "@/services/api";
import { t } from "@/resources/resources";
import type {
  DashboardStats,
  DashboardAgent,
} from "@/components/organisms/Dashboard/dashboardTypes";
import type { BackupInfo } from "@/services/backupsApiService";
import { readSyncState } from "@/services/syncStateService";
import { IS_VISUAL_AUDIT_MODE } from "@/lib/visual-audit";
import {
  AUDIT_FIXTURE_CONFIG,
  AUDIT_FIXTURE_PROFILES,
  AUDIT_FIXTURE_BACKUPS,
  AUDIT_FIXTURE_LAST_BACKUP,
  AUDIT_FIXTURE_LAST_SYNC,
} from "@/lib/visual-audit/fixtures";

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function computeLastBackup(backups: BackupInfo[]): string {
  if (backups.length === 0) {
    return t("dashboard_last_backup_never");
  }

  const latest = backups
    .slice()
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )[0];

  return latest?.timestamp
    ? relativeTime(latest.timestamp)
    : t("dashboard_last_backup_never");
}

export function buildDashboardData(
  config: { assignments: DashboardAgent[] },
  profiles: { profiles: { name: string }[] },
  backups: { backups: BackupInfo[] },
  lastSyncAt?: string,
): { stats: DashboardStats; agents: DashboardAgent[] } {
  return {
    stats: {
      modelCount: config.assignments.length,
      profileCount: profiles.profiles.length,
      backupCount: backups.backups.length,
      lastBackup: computeLastBackup(backups.backups),
      ...(lastSyncAt ? { lastSyncAt } : {}),
    },
    agents: config.assignments,
  };
}

interface ServiceErrors {
  config?: string;
  profiles?: string;
  backups?: string;
}

function toErrorMessage(reason: unknown): string {
  if (reason && typeof reason === "object" && "message" in reason) {
    return String((reason as ApiError).message);
  }
  if (reason instanceof Error) return reason.message;
  return String(reason);
}

async function fetchDashboardData(): Promise<{
  data: { stats: DashboardStats; agents: DashboardAgent[] };
  errors: ServiceErrors;
}> {
  const [configResult, profilesResult, backupsResult, syncResult] =
    await Promise.allSettled([
      getConfig(),
      listProfiles(),
      listBackups(),
      readSyncState(),
    ]);

  const errors: ServiceErrors = {};

  const config =
    configResult.status === "fulfilled"
      ? configResult.value
      : { assignments: [] };
  if (configResult.status === "rejected") {
    errors.config = toErrorMessage(configResult.reason);
  }

  const profiles =
    profilesResult.status === "fulfilled"
      ? profilesResult.value
      : { profiles: [] };
  if (profilesResult.status === "rejected") {
    errors.profiles = toErrorMessage(profilesResult.reason);
  }

  const backups =
    backupsResult.status === "fulfilled"
      ? backupsResult.value
      : { backups: [] };
  if (backupsResult.status === "rejected") {
    errors.backups = toErrorMessage(backupsResult.reason);
  }

  const lastSyncAt =
    syncResult.status === "fulfilled" ? syncResult.value : undefined;

  return {
    data: buildDashboardData(config, profiles, backups, lastSyncAt),
    errors,
  };
}

function PartialErrorBanner({ errors }: { errors: ServiceErrors }) {
  const messages = Object.entries(errors)
    .filter(([, msg]) => msg)
    .map(([service, msg]) => `${service}: ${msg}`);

  if (messages.length === 0) return null;

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
      <p className="font-medium">{t("dashboard_partial_error")}</p>
      <p className="mt-1 text-xs opacity-80">{messages.join(" | ")}</p>
    </div>
  );
}

function ErrorFallback({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-destructive">
        <h2 className="text-lg font-semibold">{t("errors_generic")}</h2>
        <p className="mt-1 text-sm">{message}</p>
      </div>
    </div>
  );
}

export default async function HomePage() {
  // In audit mode, bypass live API and use deterministic fixtures
  if (IS_VISUAL_AUDIT_MODE) {
    const stats: DashboardStats = {
      modelCount: AUDIT_FIXTURE_CONFIG.assignments.length,
      profileCount: AUDIT_FIXTURE_PROFILES.profiles.length,
      backupCount: AUDIT_FIXTURE_BACKUPS.backups.length,
      lastBackup: AUDIT_FIXTURE_LAST_BACKUP,
      lastSyncAt: AUDIT_FIXTURE_LAST_SYNC,
    };
    return <Dashboard stats={stats} agents={AUDIT_FIXTURE_CONFIG.assignments} />;
  }

  let result: {
    data: { stats: DashboardStats; agents: DashboardAgent[] };
    errors: ServiceErrors;
  };

  try {
    result = await fetchDashboardData();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return <ErrorFallback message={message} />;
  }

  const hasErrors = Object.keys(result.errors).length > 0;

  return (
    <>
      {hasErrors && <PartialErrorBanner errors={result.errors} />}
      <Dashboard stats={result.data.stats} agents={result.data.agents} />
    </>
  );
}
