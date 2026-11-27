import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import type { Result } from "@/lib/types";
import { ok, err } from "@/lib/types";

const execFile = promisify(execFileCallback) as unknown as ExecFileLike;
const DEFAULT_CLI_BIN = "opencode";
const CLI_TIMEOUT_MS = 10_000;
const MAX_BUFFER = 2 * 1024 * 1024;
const CACHE_TTL_MS = 30_000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Upper bound requested from `opencode session list -n` so the count is meaningful. */
const SESSION_LIST_LIMIT = 1000;
/** Number of sessions returned for display. */
const RECENT_SESSIONS_DISPLAY = 5;

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
  title: string | null;
  projectPath: string | null;
  lastUpdatedAt: string; // ISO
  /**
   * Per-session usage is not exposed by the opencode 2.x CLI, so these fields
   * are null ("not available") instead of numbers. Never render null as 0.
   */
  messageCount: number | null;
  totalCostUsd: number | null;
  totalInputTokens: number | null;
  totalOutputTokens: number | null;
  providers: string[];
}

export interface UsageStatsData {
  providers: ProviderUsage[];
  recentSessions: RecentSession[];
  /** Total number of sessions matching the selected days filter. */
  totalSessions: number;
  rangeLabel: "7d" | "30d" | "all";
  generatedAt: string;
}

export interface UsageStatsOptions {
  days: DaysFilter;
  project?: string;
}

type ExecResult = { stdout: string; stderr: string };
type ExecFileOptions = { maxBuffer: number; timeout: number; shell: boolean; cwd?: string };
type ExecFileLike = (
  file: string,
  args: string[],
  options: ExecFileOptions,
) => Promise<ExecResult>;

let cache: { key: string; data: UsageStatsData; expiresAt: number } | null = null;

export function clearUsageStatsCache(): void {
  cache = null;
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

/** One entry of the `models` array returned by `opencode stats --models --json`. */
interface StatsModelEntry {
  model?: { id?: string | null; providerID?: string | null; variant?: string | null };
  steps?: unknown;
  tokens?: { input?: unknown; output?: unknown };
  cost?: unknown;
}

interface StatsPayload {
  models?: StatsModelEntry[];
}

/** One entry of `opencode session list --format json`. */
interface SessionListEntry {
  id?: string;
  title?: string | null;
  updated?: unknown;
  projectId?: string | null;
  directory?: string | null;
}

interface RawModelTotals {
  cost: number;
  input: number;
  output: number;
  steps: number;
}

function aggregateProviders(entries: StatsModelEntry[]): ProviderUsage[] {
  // provider -> model id -> totals. Variants of the same model are merged.
  const byProvider = new Map<string, Map<string, RawModelTotals>>();

  for (const entry of entries) {
    const provider = entry.model?.providerID ?? "unknown";
    const modelId = entry.model?.id ?? "unknown";
    const models = byProvider.get(provider) ?? new Map<string, RawModelTotals>();
    const totals = models.get(modelId) ?? { cost: 0, input: 0, output: 0, steps: 0 };
    totals.cost += toNumber(entry.cost);
    totals.input += toNumber(entry.tokens?.input);
    totals.output += toNumber(entry.tokens?.output);
    totals.steps += toNumber(entry.steps);
    models.set(modelId, totals);
    byProvider.set(provider, models);
  }

  const providers: ProviderUsage[] = [];
  for (const [provider, modelTotals] of byProvider) {
    const rawModels = [...modelTotals.entries()].sort((a, b) => b[1].cost - a[1].cost);
    const models: ModelUsage[] = rawModels.map(([model, totals]) => ({
      model,
      costUsd: resolveCost(totals.cost, totals.input, totals.output),
      inputTokens: totals.input,
      outputTokens: totals.output,
      messages: totals.steps,
    }));
    const totalInput = rawModels.reduce((sum, [, t]) => sum + t.input, 0);
    const totalOutput = rawModels.reduce((sum, [, t]) => sum + t.output, 0);
    const totalCost = rawModels.reduce((sum, [, t]) => sum + t.cost, 0);
    providers.push({
      provider,
      totalCostUsd: resolveCost(totalCost, totalInput, totalOutput),
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      totalMessages: rawModels.reduce((sum, [, t]) => sum + t.steps, 0),
      sharePercent: 0,
      models,
    });
  }

  // Keep the previous ordering: highest provider cost first (unavailable last).
  providers.sort((a, b) => (b.totalCostUsd ?? 0) - (a.totalCostUsd ?? 0));
  computeShares(providers);
  return providers;
}

function toRecentSession(entry: SessionListEntry): RecentSession {
  return {
    sessionId: entry.id ?? "unknown",
    title: typeof entry.title === "string" && entry.title.length > 0 ? entry.title : null,
    projectPath:
      typeof entry.directory === "string" && entry.directory.length > 0 ? entry.directory : null,
    lastUpdatedAt: new Date(toNumber(entry.updated)).toISOString(),
    messageCount: null,
    totalCostUsd: null,
    totalInputTokens: null,
    totalOutputTokens: null,
    providers: [],
  };
}

function filterSessionsByDays(sessions: SessionListEntry[], days: DaysFilter, now: number): SessionListEntry[] {
  const filtered =
    days > 0 ? sessions.filter((s) => toNumber(s.updated) >= now - days * DAY_MS) : [...sessions];
  return filtered.sort((a, b) => toNumber(b.updated) - toNumber(a.updated));
}

function rangeLabelFor(days: DaysFilter): "7d" | "30d" | "all" {
  if (days === 7) return "7d";
  if (days === 30) return "30d";
  return "all";
}

function statsArgs(days: DaysFilter, projectId?: string): string[] {
  // opencode treats `--days 0` as "today", so the app's days=0 ("all") must use --all.
  const range = days === 0 ? ["--all"] : ["--days", String(days)];
  const project = projectId === undefined ? [] : ["--project", projectId];
  return ["stats", ...range, ...project, "--models", "--cost", "--json"];
}

const SESSION_LIST_ARGS = ["session", "list", "--format", "json", "-n", String(SESSION_LIST_LIMIT)];

/**
 * Executable used for every opencode call. On Windows, Node cannot spawn the npm
 * `.cmd` shim without a shell, and the shell is intentionally disabled, so an
 * explicit OPENCODE_BIN (path to a real opencode executable) can override the
 * default PATH lookup. Blank values are ignored.
 */
function resolveCliBin(): string {
  const configured = process.env.OPENCODE_BIN?.trim();
  return configured ? configured : DEFAULT_CLI_BIN;
}

function execOptions(cwd?: string): ExecFileOptions {
  return {
    maxBuffer: MAX_BUFFER,
    timeout: CLI_TIMEOUT_MS,
    shell: false,
    ...(cwd === undefined ? {} : { cwd }),
  };
}

class ParseError extends Error {
  constructor(message: string, readonly parseCause: unknown) {
    super(message);
  }
}

function parseJson(raw: string, label: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (cause) {
    throw new ParseError(`OpenCode ${label} output is not valid JSON`, cause);
  }
}

function parseSessionList(raw: string): SessionListEntry[] {
  const parsed = parseJson(raw, "session list");
  if (!Array.isArray(parsed)) {
    throw new ParseError("OpenCode session list output is not an array", parsed);
  }
  return parsed as SessionListEntry[];
}

function parseStatsModels(raw: string): StatsModelEntry[] {
  const parsed = parseJson(raw, "stats");
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ParseError("OpenCode stats output is not an object", parsed);
  }
  const { models } = parsed as StatsPayload;
  return Array.isArray(models) ? models : [];
}

export async function collectUsageStats(
  opts: UsageStatsOptions,
  execFn: ExecFileLike = execFile,
): Promise<Result<UsageStatsData>> {
  const { project } = opts;
  if (project !== undefined && (project.length === 0 || project.includes("\u0000"))) {
    return err({
      code: "SCHEMA_INVALID",
      message: "Project path must be a non-empty string without null bytes",
    });
  }

  const cacheKey = `${opts.days}:${project ?? ""}`;
  const now = Date.now();
  if (cache && cache.key === cacheKey && cache.expiresAt > now) {
    return ok(cache.data);
  }

  try {
    let sessionEntries: SessionListEntry[];
    let statsModels: StatsModelEntry[];

    // Known limitation: `opencode session list` only lists the sessions of the
    // project that contains the process cwd, so recent sessions (and the session
    // count) are scoped to that project unless a `project` path is given.
    if (project === undefined) {
      const [statsOut, sessionsOut] = await Promise.all([
        execFn(resolveCliBin(), statsArgs(opts.days), execOptions()),
        execFn(resolveCliBin(), SESSION_LIST_ARGS, execOptions()),
      ]);
      statsModels = parseStatsModels(statsOut.stdout);
      sessionEntries = parseSessionList(sessionsOut.stdout);
    } else {
      // `opencode stats --project` needs a project id, not a path. Resolve it
      // from the sessions listed with the project path as the process cwd.
      const sessionsOut = await execFn(resolveCliBin(), SESSION_LIST_ARGS, execOptions(project));
      sessionEntries = parseSessionList(sessionsOut.stdout);
      const projectId = sessionEntries.find(
        (s) => typeof s.projectId === "string" && s.projectId.length > 0,
      )?.projectId;
      if (typeof projectId !== "string") {
        return err({
          code: "NOT_FOUND",
          message: "Could not resolve an OpenCode project for the given path",
        });
      }
      const statsOut = await execFn(resolveCliBin(), statsArgs(opts.days, projectId), execOptions());
      statsModels = parseStatsModels(statsOut.stdout);
    }

    const matching = filterSessionsByDays(sessionEntries, opts.days, now);
    const data: UsageStatsData = {
      providers: aggregateProviders(statsModels),
      recentSessions: matching.slice(0, RECENT_SESSIONS_DISPLAY).map(toRecentSession),
      totalSessions: matching.length,
      rangeLabel: rangeLabelFor(opts.days),
      generatedAt: new Date(now).toISOString(),
    };

    cache = { key: cacheKey, data, expiresAt: now + CACHE_TTL_MS };
    return ok(data);
  } catch (cause) {
    if (cause instanceof ParseError) {
      return err({
        code: "PARSE_FAILED",
        message: cause.message,
        cause: cause.parseCause,
      });
    }
    return err({
      code: "FILE_MISSING",
      message: "Failed to collect usage stats from OpenCode",
      cause,
    });
  }
}
