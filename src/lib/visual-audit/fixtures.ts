/**
 * Visual Audit Fixtures — Deterministic, frozen data for all eight in-scope surfaces.
 *
 * All timestamps are frozen to `AUDIT_FIXTURE_TIMESTAMP` so renders are
 * pixel-identical across repeated runs.
 */
import type { DashboardAgent, DashboardStats } from "@/components/organisms/Dashboard/dashboardTypes";
import type { Assignment } from "@/components/organisms/ModelsClient/modelsClientTypes";
import type { Profile } from "@/components/organisms/ProfilesClient/profilesClientTypes";
import type { BackupInfo } from "@/services/backupsApiService";
import type { ModelCatalog } from "@/components/molecules/ModelPicker/modelPicker";
import type { GlobalConfigResponse } from "@/services/globalConfigApiService";
import type { Notification } from "@/services/notificationService";

// ─── Frozen Timestamp ────────────────────────────────────────────────────────
export const AUDIT_FIXTURE_TIMESTAMP = "2026-01-15T10:30:00.000Z";

/**
 * Pre-computed relative "last sync" string derived from the frozen timestamp.
 * Calculated once to ensure deterministic renders.
 */
function computeAuditLastSync(): string {
  const frozen = new Date(AUDIT_FIXTURE_TIMESTAMP).getTime();
  // 5 hours, 23 minutes before the frozen time
  const offset = 5 * 60 * 60_000 + 23 * 60_000;
  const diff = frozen - offset;
  const minutes = Math.floor((frozen - diff) / 60_000);
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export const AUDIT_FIXTURE_LAST_SYNC = computeAuditLastSync();
export const AUDIT_FIXTURE_GENTLE_AI_VERSION = "v0.0.0";

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const AUDIT_FIXTURE_CONFIG: { assignments: DashboardAgent[]; defaultAgent: string } = {
  defaultAgent: "sdd-orchestrator",
  assignments: [
    { agentKey: "sdd-orchestrator", provider: "openai", model: "gpt-5", variant: "high" },
    { agentKey: "sdd-init", provider: "anthropic", model: "claude-4", variant: "standard" },
    { agentKey: "sdd-propose", provider: "openai", model: "gpt-5", variant: "high" },
    { agentKey: "sdd-spec", provider: "anthropic", model: "claude-4", variant: "standard" },
    { agentKey: "sdd-design", provider: "openai", model: "gpt-5", variant: "standard" },
  ],
};

// ─── Models ──────────────────────────────────────────────────────────────────
export const AUDIT_FIXTURE_MODELS_ASSIGNMENTS: Assignment[] = [
  { agentKey: "sdd-orchestrator", provider: "openai", model: "gpt-5", variant: "high" },
  { agentKey: "sdd-init", provider: "anthropic", model: "claude-4", variant: "standard" },
  { agentKey: "sdd-propose", provider: "openai", model: "gpt-5", variant: "high" },
  { agentKey: "sdd-spec", provider: "anthropic", model: "claude-4", variant: "standard" },
  { agentKey: "sdd-design", provider: "openai", model: "gpt-5", variant: "standard" },
];

// ─── Profiles ────────────────────────────────────────────────────────────────
export const AUDIT_FIXTURE_PROFILES: { profiles: Profile[] } = {
  profiles: [
    { name: "default", displayName: "Default Profile", active: true, modelCount: 5, updatedAt: AUDIT_FIXTURE_TIMESTAMP },
    { name: "minimal", displayName: "Minimal Profile", active: false, modelCount: 2, updatedAt: "2026-01-10T08:00:00.000Z" },
  ],
};

// ─── Backups ─────────────────────────────────────────────────────────────────
export const AUDIT_FIXTURE_BACKUPS: { backups: BackupInfo[] } = {
  backups: [
    { id: "backup-20260115", source: "/home/user/project", timestamp: AUDIT_FIXTURE_TIMESTAMP, fileCount: 42, size: 1048576, pinned: true },
    { id: "backup-20260110", source: "/home/user/project", timestamp: "2026-01-10T08:00:00.000Z", fileCount: 38, size: 943718, pinned: false },
  ],
};

// ─── Catalog ─────────────────────────────────────────────────────────────────
export const AUDIT_FIXTURE_CATALOG: ModelCatalog = {
  openai: {
    "gpt-5": ["high", "standard"],
    "gpt-4o": ["standard"],
  },
  anthropic: {
    "claude-4": ["high", "standard"],
  },
};

// ─── Global Config (Settings) ────────────────────────────────────────────────
export const AUDIT_FIXTURE_GLOBAL_CONFIG: GlobalConfigResponse = {
  defaultAgent: "sdd-orchestrator",
  agents: ["sdd-orchestrator", "sdd-init", "sdd-propose", "sdd-spec", "sdd-design"],
  assignments: AUDIT_FIXTURE_MODELS_ASSIGNMENTS,
  gentleAi: { persona: "Senior Architect", language: "en" },
};

// ─── Notifications ───────────────────────────────────────────────────────────
export const AUDIT_FIXTURE_NOTIFICATIONS: Notification[] = [
  {
    id: "audit-notif-1",
    severity: "info",
    title: "Audit Mode Active",
    message: "Visual audit mode is enabled. All data is deterministic.",
    status: "read",
    inProgress: false,
    createdAt: AUDIT_FIXTURE_TIMESTAMP,
  },
];
