import { access, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { readOpenCodeConfigSafe } from "@/adapters/opencode";
import { gentleAiBackupsDir, opencodeJsonPath, stateJsonPath, type PathContext } from "@/lib/paths";
import type { Result } from "@/lib/types";
import { probeGentleAiVersion } from "@/services/processService";
import { readStateJsonSafe } from "@/services/stateService";

export type RouteState = { exists: boolean; readable: boolean; writable: boolean };

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
