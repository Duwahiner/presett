import { exec as execCallback } from "node:child_process";
import { promisify } from "node:util";
import type { Result } from "@/lib/types";
import { ok, err } from "@/lib/types";

const exec = promisify(execCallback) as ExecLike;
const CLI_TIMEOUT_MS = 10_000;
const MAX_BUFFER = 2 * 1024 * 1024;
const CACHE_TTL_MS = 30_000;

export type DaysFilter = 7 | 30 | 0;

export interface ModelUsage {
  model: string;
  costUsd: number | null; // null = "Costo no disponible" (tokens > 0 but cost = 0)
  inputTokens: number;
  outputTokens: number;
  messages: number;
}

export interface ProviderUsage {
  provider: string;
  totalCostUsd: number | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalMessages: number;
  sharePercent: number;
  models: ModelUsage[];
}

export interface RecentSession {
  sessionId: string;
  projectPath: string | null;
  lastUpdatedAt: string; // ISO
  messageCount: number;
  totalCostUsd: number | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  providers: string[];
}

export interface UsageStatsData {
  providers: ProviderUsage[];
  recentSessions: RecentSession[];
  rangeLabel: "7d" | "30d" | "all";
  generatedAt: string;
}

export interface UsageStatsOptions {
  days: DaysFilter;
  project?: string;
}

type ExecResult = { stdout: string; stderr: string };
type ExecLike = (
  command: string,
  options: { maxBuffer: number; timeout: number },
) => Promise<ExecResult>;

let cache: { key: string; data: UsageStatsData; expiresAt: number } | null = null;

export function clearUsageStatsCache(): void {
  cache = null;
}

/**
 * Escape a value for use as a SQL single-quoted string literal.
 * Doubles every single quote and rejects null bytes, so a user-supplied
 * project path cannot break out of the literal into arbitrary SQL.
 */
export function escapeSqlLiteral(value: string): string {
  if (value.includes("\u0000")) {
    throw new Error("Project path contains a null byte");
  }
  return value.replace(/'/g, "''");
}

/**
 * Escape a value for safe embedding inside a double-quoted shell argument.
 * Neutralizes the shell-active characters ($, backtick, double quote, backslash)
 * that exec would otherwise interpret through the shell.
 */
export function escapeShellArgument(value: string): string {
  return value.replace(/[\\"`$]/g, "\\$&");
}

export function buildDbCommand(sql: string): string {
  return `opencode db "${escapeShellArgument(sql)}" --format json`;
}

function whereClauses(opts: UsageStatsOptions): string {
  let clauses = "json_extract(data, '$.role') = 'assistant'";
  if (opts.days > 0) {
    clauses += ` AND time_created >= strftime('%s','now','-${opts.days} days') * 1000`;
  }
  if (opts.project !== undefined) {
    clauses += ` AND json_extract(data, '$.path.cwd') = '${escapeSqlLiteral(opts.project)}'`;
  }
  return clauses;
}

const PROVIDER_COLUMNS = `SELECT
  json_extract(data, '$.providerID') AS provider,
  json_extract(data, '$.modelID') AS model,
  SUM(COALESCE(json_extract(data, '$.cost'), 0)) AS total_cost,
  SUM(COALESCE(json_extract(data, '$.tokens.input'), 0)) AS input_tokens,
  SUM(COALESCE(json_extract(data, '$.tokens.output'), 0)) AS output_tokens,
  COUNT(*) AS messages
FROM message
WHERE `;

export function buildProviderUsageSql(opts: UsageStatsOptions): string {
  return `${PROVIDER_COLUMNS}${whereClauses(opts)}
GROUP BY provider, model
ORDER BY total_cost DESC`;
}

export function buildRecentSessionsSql(opts: UsageStatsOptions): string {
  return `SELECT
  session_id,
  json_extract(data, '$.path.cwd') AS project_path,
  MAX(time_created) AS last_updated_at,
  COUNT(*) AS message_count,
  SUM(COALESCE(json_extract(data, '$.cost'), 0)) AS total_cost,
  SUM(COALESCE(json_extract(data, '$.tokens.input'), 0)) AS input_tokens,
  SUM(COALESCE(json_extract(data, '$.tokens.output'), 0)) AS output_tokens,
  GROUP_CONCAT(DISTINCT json_extract(data, '$.providerID')) AS providers
FROM message
WHERE ${whereClauses(opts)}
GROUP BY session_id
ORDER BY last_updated_at DESC
LIMIT 5`;
}

/**
 * Resolve a cost figure from raw aggregates.
 * - cost > 0  -> the real cost
 * - cost = 0 with tokens used -> null ("Costo no disponible")
 * - cost = 0 with no tokens -> 0 (no usage, genuinely zero)
 */
export function resolveCost(totalCost: number, inputTokens: number, outputTokens: number): number | null {
  if (totalCost > 0) return totalCost;
  if (inputTokens > 0 || outputTokens > 0) return null;
  return 0;
}

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

interface ProviderRow {
  provider: string | null;
  model: string | null;
  total_cost: unknown;
  input_tokens: unknown;
  output_tokens: unknown;
  messages: unknown;
}

export function computeShares(providers: ProviderUsage[]): void {
  const totalTokens = providers.reduce(
    (sum, provider) => sum + provider.totalInputTokens + provider.totalOutputTokens,
    0,
  );
  for (const provider of providers) {
    const tokens = provider.totalInputTokens + provider.totalOutputTokens;
    provider.sharePercent = totalTokens > 0 ? Math.round((tokens / totalTokens) * 100) : 0;
  }
}

function aggregateProviders(rows: ProviderRow[]): ProviderUsage[] {
  const modelsByProvider = new Map<string, ModelUsage[]>();

  for (const row of rows) {
    const provider = row.provider ?? "unknown";
    const model = row.model ?? "unknown";
    const input = toNumber(row.input_tokens);
    const output = toNumber(row.output_tokens);
    const modelUsage: ModelUsage = {
      model,
      costUsd: resolveCost(toNumber(row.total_cost), input, output),
      inputTokens: input,
      outputTokens: output,
      messages: toNumber(row.messages),
    };

    const models = modelsByProvider.get(provider) ?? [];
    models.push(modelUsage);
    modelsByProvider.set(provider, models);
  }

  const providers: ProviderUsage[] = [];
  for (const [provider, models] of modelsByProvider) {
    const totalInput = models.reduce((sum, m) => sum + m.inputTokens, 0);
    const totalOutput = models.reduce((sum, m) => sum + m.outputTokens, 0);
    const totalCost = models.reduce((sum, m) => sum + (m.costUsd ?? 0), 0);
    providers.push({
      provider,
      totalCostUsd: resolveCost(totalCost, totalInput, totalOutput),
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      totalMessages: models.reduce((sum, m) => sum + m.messages, 0),
      sharePercent: 0,
      models,
    });
  }

  computeShares(providers);
  return providers;
}

interface SessionRow {
  session_id: string;
  project_path: string | null;
  last_updated_at: unknown;
  message_count: unknown;
  total_cost: unknown;
  input_tokens: unknown;
  output_tokens: unknown;
  providers: string | null;
}

function parseSessions(rows: SessionRow[]): RecentSession[] {
  return rows.map((row) => {
    const input = toNumber(row.input_tokens);
    const output = toNumber(row.output_tokens);
    return {
      sessionId: row.session_id ?? "unknown",
      projectPath:
        typeof row.project_path === "string" && row.project_path.length > 0 ? row.project_path : null,
      lastUpdatedAt: new Date(toNumber(row.last_updated_at)).toISOString(),
      messageCount: toNumber(row.message_count),
      totalCostUsd: resolveCost(toNumber(row.total_cost), input, output),
      totalInputTokens: input,
      totalOutputTokens: output,
      providers: (row.providers ?? "").split(",").filter((provider) => provider.length > 0),
    };
  });
}

function rangeLabelFor(days: DaysFilter): "7d" | "30d" | "all" {
  if (days === 7) return "7d";
  if (days === 30) return "30d";
  return "all";
}

export async function collectUsageStats(
  opts: UsageStatsOptions,
  execFn: ExecLike = exec,
): Promise<Result<UsageStatsData>> {
  const cacheKey = `${opts.days}:${opts.project ?? ""}`;
  const now = Date.now();
  if (cache && cache.key === cacheKey && cache.expiresAt > now) {
    return ok(cache.data);
  }

  try {
    const [providerOut, sessionsOut] = await Promise.all([
      execFn(buildDbCommand(buildProviderUsageSql(opts)), { maxBuffer: MAX_BUFFER, timeout: CLI_TIMEOUT_MS }),
      execFn(buildDbCommand(buildRecentSessionsSql(opts)), { maxBuffer: MAX_BUFFER, timeout: CLI_TIMEOUT_MS }),
    ]);

    let providerRows: ProviderRow[];
    let sessionRows: SessionRow[];
    try {
      providerRows = JSON.parse(providerOut.stdout) as ProviderRow[];
      sessionRows = JSON.parse(sessionsOut.stdout) as SessionRow[];
    } catch (cause) {
      return err({
        code: "PARSE_FAILED",
        message: "OpenCode usage stats output is not valid JSON",
        cause,
      });
    }

    const data: UsageStatsData = {
      providers: aggregateProviders(providerRows),
      recentSessions: parseSessions(sessionRows),
      rangeLabel: rangeLabelFor(opts.days),
      generatedAt: new Date().toISOString(),
    };

    cache = { key: cacheKey, data, expiresAt: now + CACHE_TTL_MS };
    return ok(data);
  } catch (cause) {
    return err({
      code: "FILE_MISSING",
      message: "Failed to collect usage stats from OpenCode",
      cause,
    });
  }
}
