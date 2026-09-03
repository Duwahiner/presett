import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname } from "node:path";
import { readOpenCodeConfigSafe } from "@/adapters/opencode";
import { diagnosticsStatePath, gentleAiBackupsDir, opencodeJsonPath, stateJsonPath, type PathContext } from "@/lib/paths";
import type { Result } from "@/lib/types";
import { probeGentleAiVersion } from "@/services/processService";
import { readStateJsonSafe } from "@/services/stateService";

export type RouteState = { exists: boolean; readable: boolean; writable: boolean };
export type UpdateChannel = "stable" | "rc";
export type UpdateSettings = { frequencyMinutes: number };
export type UpdateNotice = { channel: UpdateChannel; version: string; pending: boolean };

export interface DiagnosticsUpdateState {
  settings: UpdateSettings;
  status?: { phase: "idle" | "checking" | "success" | "error"; checkedAt?: string; code?: string; message?: string };
  installedVersion?: string;
  channels?: Record<UpdateChannel, { latestVersion?: string; updateAvailable: boolean }>;
  notice?: UpdateNotice | null;
}

type Release = { tag_name?: unknown; prerelease?: unknown; draft?: unknown };
const DEFAULT_UPDATE_SETTINGS: UpdateSettings = { frequencyMinutes: 360 };

export interface DiagnosticsReport {
  cli: { installed: boolean; version?: string; error?: string };
  config: { available: boolean; error?: string };
  state: { available: boolean; error?: string };
  routes: {
    config: RouteState;
    state: RouteState;
    backups: RouteState;
  };
}

interface DiagnosticsOptions extends PathContext {
  versionProbe?: () => Promise<Result<string>>;
}

async function routeState(path: string): Promise<RouteState> {
  try {
    await stat(path);
  } catch {
    return { exists: false, readable: false, writable: false };
  }

  const [readable, writable] = await Promise.all([
    access(path, constants.R_OK).then(() => true, () => false),
    access(path, constants.W_OK).then(() => true, () => false),
  ]);

  return { exists: true, readable, writable };
}

export async function collectDiagnostics(
  options: DiagnosticsOptions = {},
): Promise<DiagnosticsReport> {
  const versionResult = await (options.versionProbe ?? probeGentleAiVersion)();
  const configResult = await readOpenCodeConfigSafe(options.configDir);
  const stateResult = await readStateJsonSafe(options.gentleAiDir);

  const [configRoute, stateRoute, backupsRoute] = await Promise.all([
    routeState(opencodeJsonPath(options)),
    routeState(stateJsonPath(options)),
    routeState(gentleAiBackupsDir(options)),
  ]);

  return {
    cli: versionResult.ok
      ? { installed: true, version: versionResult.value }
      : { installed: false, error: "CLI unavailable" },
    config: configResult.ok
      ? { available: true }
      : { available: false, error: "Configuration unavailable" },
    state: stateResult.ok
      ? { available: true }
      : { available: false, error: "State unavailable" },
    routes: {
      config: configRoute,
      state: stateRoute,
      backups: backupsRoute,
    },
  };
}

export async function readDiagnosticsUpdateState(ctx: PathContext = {}): Promise<DiagnosticsUpdateState> {
  try {
    return { settings: DEFAULT_UPDATE_SETTINGS, ...JSON.parse(await readFile(diagnosticsStatePath(ctx), "utf-8")) };
  } catch {
    return { settings: DEFAULT_UPDATE_SETTINGS, status: { phase: "idle" }, notice: null };
  }
}

export async function writeDiagnosticsUpdateState(state: DiagnosticsUpdateState, ctx: PathContext = {}) {
  const file = diagnosticsStatePath(ctx);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(state, null, 2));
}

export function shouldRunDiagnosticsCheck(settings: UpdateSettings, lastCheckedAt?: string, now = new Date()): boolean {
  if (!lastCheckedAt) return true;
  return now.getTime() - new Date(lastCheckedAt).getTime() >= settings.frequencyMinutes * 60_000;
}

function normalizeVersion(tag: string): string | null {
  const match = tag.match(/\d+\.\d+\.\d+(?:[-.][0-9A-Za-z.-]+)?/);
  return match?.[0] ?? null;
}

function compareVersions(a?: string, b?: string): number {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  const pa = a.split(/[-.]/), pb = b.split(/[-.]/);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = Number(pa[i]), nb = Number(pb[i]);
    const diff = Number.isFinite(na) && Number.isFinite(nb) ? na - nb : String(pa[i] ?? "").localeCompare(String(pb[i] ?? ""));
    if (diff) return diff;
  }
  return 0;
}

async function fetchOfficialReleases(signal: AbortSignal): Promise<unknown> {
  const response = await fetch("https://api.github.com/repos/Gentleman-Programming/gentle-ai/releases", {
    headers: { Accept: "application/vnd.github+json" },
    signal,
  });
  if (!response.ok) return { status: response.status };
  return response.json();
}

export async function checkGentleAiReleases(options: {
  installedVersion: string;
  now?: Date;
  fetchReleases?: (signal: AbortSignal) => Promise<unknown>;
  readState?: () => Promise<DiagnosticsUpdateState>;
  writeState?: (state: DiagnosticsUpdateState) => Promise<void>;
}): Promise<DiagnosticsUpdateState> {
  const now = options.now ?? new Date();
  const readState = options.readState ?? readDiagnosticsUpdateState;
  const writeState = options.writeState ?? writeDiagnosticsUpdateState;
  const previous = await readState();
  const fail = async (code: string, message: string) => {
    const state = { ...previous, installedVersion: options.installedVersion, status: { phase: "error" as const, checkedAt: now.toISOString(), code, message } };
    await writeState(state);
    return state;
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    const raw = await (options.fetchReleases ?? fetchOfficialReleases)(controller.signal).finally(() => clearTimeout(timeout));
    if ((raw as { status?: number })?.status === 403) return fail("rate_limited", "GitHub release check is rate limited");
    if (!Array.isArray(raw)) return fail("malformed", "Release response was not usable");

    const latest: Record<UpdateChannel, string | undefined> = { stable: undefined, rc: undefined };
    for (const release of raw as Release[]) {
      if (release.draft || typeof release.tag_name !== "string") continue;
      const version = normalizeVersion(release.tag_name);
      if (!version) continue;
      const channel: UpdateChannel = release.prerelease ? "rc" : "stable";
      if (compareVersions(version, latest[channel]) > 0) latest[channel] = version;
    }
    if (!latest.stable && !latest.rc) return fail("malformed", "Release response was not usable");

    const installedVersion = normalizeVersion(options.installedVersion) ?? undefined;
    const channels = {
      stable: { latestVersion: latest.stable, updateAvailable: compareVersions(latest.stable, installedVersion) > 0 },
      rc: { latestVersion: latest.rc, updateAvailable: compareVersions(latest.rc, installedVersion) > 0 },
    };
    const pending = channels.stable.updateAvailable ? { channel: "stable" as const, version: latest.stable!, pending: true }
      : channels.rc.updateAvailable ? { channel: "rc" as const, version: latest.rc!, pending: true }
      : null;
    const state: DiagnosticsUpdateState = {
      ...previous,
      settings: previous.settings ?? DEFAULT_UPDATE_SETTINGS,
      installedVersion: options.installedVersion,
      status: { phase: "success", checkedAt: now.toISOString() },
      channels,
      notice: pending,
    };
    await writeState(state);
    return state;
  } catch (error) {
    const aborted = error instanceof DOMException && ["AbortError", "TimeoutError"].includes(error.name);
    return fail(aborted ? "timeout" : "network", aborted ? "Release check timed out" : "Release check failed");
  }
}
