import { Dashboard } from "@/components/organisms/Dashboard/Dashboard";
import { getConfig } from "@/services/modelsApiService";
import { listProfiles } from "@/services/profilesApiService";
import { listBackups } from "@/services/backupsApiService";
import { t } from "@/resources/resources";
import type {
  DashboardStats,
  DashboardAgent,
} from "@/components/organisms/Dashboard/Dashboard.types";
import type { BackupInfo } from "@/services/backupsApiService";

function computeLastSync(backups: BackupInfo[]): string {
  if (backups.length === 0) {
    return t("dashboard_last_sync_never");
  }

  const latest = backups
    .slice()
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )[0];

  return latest?.timestamp ?? t("dashboard_last_sync_never");
}

export function buildDashboardData(
  config: { assignments: DashboardAgent[] },
  profiles: { profiles: { name: string }[] },
  backups: { backups: BackupInfo[] },
): { stats: DashboardStats; agents: DashboardAgent[] } {
  return {
    stats: {
      modelCount: config.assignments.length,
      profileCount: profiles.profiles.length,
      backupCount: backups.backups.length,
      lastSync: computeLastSync(backups.backups),
    },
    agents: config.assignments,
  };
}

export default async function HomePage() {
  try {
    const [config, profiles, backups] = await Promise.all([
      getConfig(),
      listProfiles(),
      listBackups(),
    ]);

    const { stats, agents } = buildDashboardData(config, profiles, backups);

    return <Dashboard stats={stats} agents={agents} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-destructive">
          <h2 className="text-lg font-semibold">{t("errors_generic")}</h2>
          <p className="mt-1 text-sm">{message}</p>
        </div>
      </div>
    );
  }
}
