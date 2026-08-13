import { basename } from "node:path";
import {
  DEFAULT_OPEN_CODE_CONFIG_DIR,
  listProfiles,
  readOpenCodeConfigSafe,
} from "@/adapters/opencode";
import type { Result } from "@/lib/types";
import { DEFAULT_GENTLE_AI_BACKUPS_DIR, listBackups as listLocalBackups, type BackupInfo } from "@/services/backupsService";
import { DEFAULT_MODEL_CACHE_DIR, readModelCacheSafe } from "@/services/modelCacheService";
import type { ModelCache, OpenCodeConfig } from "@/types";

export type SearchEntityType = "agent" | "model" | "profile" | "backup" | "config";

export interface SearchResult {
  type: SearchEntityType;
  id: string;
  label: string;
  subtitle?: string;
  href: string;
  pinned?: boolean;
  active?: boolean;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  warnings?: string[];
}

export interface SearchOptions {
  query: string;
  limit?: number;
  configDir?: string;
  cacheDir?: string;
  backupsDir?: string;
  readConfig?: (configDir?: string) => Promise<Result<OpenCodeConfig>>;
  readModelCache?: (cacheDir?: string) => Promise<Result<ModelCache>>;
  listBackups?: (backupsDir?: string) => Promise<BackupInfo[]>;
}

const MAX_QUERY_LENGTH = 200;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const TYPE_PRIORITY: Record<SearchEntityType, number> = {
  agent: 5,
  model: 4,
  profile: 3,
  backup: 2,
  config: 1,
};

type Candidate = SearchResult & { searchable: string[]; descriptive?: string[] };

export function sanitizeQuery(query: string): string {
  return query.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, MAX_QUERY_LENGTH);
}

export function tokenize(query: string): string[] {
  return sanitizeQuery(query)
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

export function scoreMatch(query: string, value: string): number {
  const q = query.toLowerCase();
  const v = value.toLowerCase();
  if (v === q) return 100;
  if (v.startsWith(q)) return 75;
  if (v.includes(q)) return 50;
  return 0;
}

function scoreCandidate(tokens: string[], candidate: Candidate): number {
  let score = 0;
  for (const token of tokens) {
    const searchableScore = Math.max(...candidate.searchable.map((value) => scoreMatch(token, value)));
    const descriptionScore = Math.max(0, ...(candidate.descriptive ?? []).map((value) => scoreMatch(token, value) * 0.25));
    score += Math.max(searchableScore, descriptionScore);
  }
  return score;
}

function createAgentCandidates(config: OpenCodeConfig): Candidate[] {
  return Object.entries(config.agent).map(([agentKey, agent]) => ({
    type: "agent",
    id: agentKey,
    label: agentKey,
    subtitle: agent.model,
    href: `/models?agent=${encodeURIComponent(agentKey)}`,
    searchable: [agentKey, agent.model, agent.variant, agent.mode].filter(Boolean) as string[],
    descriptive: [agent.description].filter(Boolean) as string[],
  }));
}

function createModelCandidates(cache: ModelCache): Candidate[] {
  return Object.entries(cache).flatMap(([provider, models]) =>
    Object.entries(models).map(([model, variants]) => ({
      type: "model" as const,
      id: `${provider}/${model}`,
      label: model,
      subtitle: provider,
      href: `/models?provider=${encodeURIComponent(provider)}&model=${encodeURIComponent(model)}`,
      searchable: [provider, model, `${provider}/${model}`, ...variants],
    })),
  );
}

function createProfileCandidates(config: OpenCodeConfig): Candidate[] {
  return listProfiles(config).map((profile) => ({
    type: "profile",
    id: profile.name || "base",
    label: profile.displayName,
    subtitle: `${profile.modelCount} model assignments`,
    href: `/profiles${profile.name ? `?profile=${encodeURIComponent(profile.name)}` : ""}`,
    active: profile.active,
    searchable: [profile.name, profile.displayName].filter(Boolean),
  }));
}

function createBackupCandidates(backups: BackupInfo[]): Candidate[] {
  return backups.map((backup) => {
    const safeSource = basename(backup.source);
    return {
      type: "backup",
      id: backup.id,
      label: backup.id,
      subtitle: safeSource,
      href: `/backups?backup=${encodeURIComponent(backup.id)}`,
      pinned: backup.pinned,
      searchable: [backup.id, backup.timestamp, safeSource],
    };
  });
}

function createConfigCandidates(config: OpenCodeConfig): Candidate[] {
  return [
    config.default_agent && {
      type: "config" as const,
      id: "default_agent",
      label: "Default agent",
      subtitle: config.default_agent,
      href: "/models",
      searchable: ["default agent", config.default_agent],
    },
    config.theme && {
      type: "config" as const,
      id: "theme",
      label: "Theme",
      subtitle: config.theme,
      href: "/",
      searchable: ["theme", config.theme],
    },
  ].filter(Boolean) as Candidate[];
}

function normalizeLimit(limit?: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(limit!), 1), MAX_LIMIT);
}

export async function searchEntities(options: SearchOptions): Promise<SearchResponse> {
  const query = sanitizeQuery(options.query);
  const tokens = tokenize(query);
  if (tokens.length === 0) return { results: [], total: 0, query };

  const readConfig = options.readConfig ?? readOpenCodeConfigSafe;
  const readModelCache = options.readModelCache ?? readModelCacheSafe;
  const listBackups = options.listBackups ?? listLocalBackups;
  const [configResult, cacheResult, backups] = await Promise.all([
    readConfig(options.configDir ?? DEFAULT_OPEN_CODE_CONFIG_DIR),
    readModelCache(options.cacheDir ?? DEFAULT_MODEL_CACHE_DIR),
    listBackups(options.backupsDir ?? DEFAULT_GENTLE_AI_BACKUPS_DIR),
  ]);

  const warnings: string[] = [];
  const candidates: Candidate[] = [];
  if (configResult.ok) {
    candidates.push(...createAgentCandidates(configResult.value));
    candidates.push(...createProfileCandidates(configResult.value));
    candidates.push(...createConfigCandidates(configResult.value));
  } else {
    warnings.push("config");
  }
  if (cacheResult.ok) candidates.push(...createModelCandidates(cacheResult.value));
  else warnings.push("models");
  candidates.push(...createBackupCandidates(backups));

  const results = candidates
    .map((candidate) => ({ candidate, score: scoreCandidate(tokens, candidate) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || TYPE_PRIORITY[b.candidate.type] - TYPE_PRIORITY[a.candidate.type])
    .slice(0, normalizeLimit(options.limit))
    .map(({ candidate: { searchable: _searchable, descriptive: _descriptive, ...result } }) => result);

  return {
    results,
    total: results.length,
    query,
    ...(warnings.length ? { warnings } : {}),
  };
}
