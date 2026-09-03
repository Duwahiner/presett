import { homedir } from "node:os";
import { join } from "node:path";

export interface PathContext {
  configDir?: string;
  gentleAiDir?: string;
  presettDir?: string;
}

export function defaultConfigDir(): string {
  return join(homedir(), ".config", "opencode");
}

export function defaultGentleAiDir(): string {
  return join(homedir(), ".gentle-ai");
}

export function defaultPresettDir(): string {
  return join(homedir(), ".presett");
}

export function opencodeJsonPath(ctx: PathContext = {}): string {
  return join(ctx.configDir ?? defaultConfigDir(), "opencode.json");
}

export function stateJsonPath(ctx: PathContext = {}): string {
  return join(ctx.gentleAiDir ?? defaultGentleAiDir(), "state.json");
}

export function modelVariantsPath(ctx: PathContext = {}): string {
  return join(
    ctx.gentleAiDir ?? defaultGentleAiDir(),
    "cache",
    "model-variants.json",
  );
}

export function gentleAiBackupsDir(ctx: PathContext = {}): string {
  return join(ctx.gentleAiDir ?? defaultGentleAiDir(), "backups");
}

export function presettBackupsDir(ctx: PathContext = {}): string {
  return join(ctx.presettDir ?? defaultPresettDir(), "backups");
}

export function diagnosticsStatePath(ctx: PathContext = {}): string {
  return join(ctx.presettDir ?? defaultPresettDir(), "diagnostics.json");
}

export function syncStatePath(ctx: PathContext = {}): string {
  return join(ctx.presettDir ?? defaultPresettDir(), "sync-state.json");
}
