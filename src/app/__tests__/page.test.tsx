import { describe, it, expect } from "vitest";
import { buildDashboardData } from "@/app/page";
import type { BackupInfo } from "@/services/backupsApiService";
import type { DashboardAgent } from "@/components/organisms/Dashboard/Dashboard.types";

const agents: DashboardAgent[] = [
  {
    agentKey: "sdd-orchestrator-default",
    provider: "openai",
    model: "gpt-4o",
    variant: "latest",
  },
  {
    agentKey: "sdd-propose-default",
    provider: "openai",
    model: "gpt-4o-mini",
    variant: "latest",
  },
];

const backups: BackupInfo[] = [
  {
    id: "backup-1",
    source: "auto",
    timestamp: "2026-08-09T10:00:00Z",
    fileCount: 3,
    size: 1024,
    pinned: false,
  },
  {
    id: "backup-2",
    source: "manual",
    timestamp: "2026-08-10T20:00:00Z",
    fileCount: 5,
    size: 2048,
    pinned: true,
  },
];

describe("buildDashboardData", () => {
  it("maps service responses to dashboard stats", () => {
    const result = buildDashboardData(
      { assignments: agents },
      { profiles: [{ name: "default" }, { name: "work" }] },
      { backups },
    );

    expect(result.stats.modelCount).toBe(2);
    expect(result.stats.profileCount).toBe(2);
    expect(result.stats.backupCount).toBe(2);
    expect(result.stats.lastSync).toBe("2026-08-10T20:00:00Z");
  });

  it("passes agents through unchanged", () => {
    const result = buildDashboardData(
      { assignments: agents },
      { profiles: [] },
      { backups: [] },
    );

    expect(result.agents).toBe(agents);
  });

  it("falls back to 'Never' when there are no backups", () => {
    const result = buildDashboardData(
      { assignments: [] },
      { profiles: [] },
      { backups: [] },
    );

    expect(result.stats.lastSync).toBe("Never");
  });
});
