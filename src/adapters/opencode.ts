import {
  readFile,
  writeFile,
  rename,
  rm,
  access,
  stat,
} from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentDetectionResult } from "@/types";
import type { OpenCodeConfig, OpenCodeAgentEntry } from "@/types/opencode";
import type { Result } from "@/lib/types";
import { ok, err } from "@/lib/types";
import {
  parseOpenCodeConfigSafe,
  validateModelAssignment,
  buildModelCache,
  type ModelCache,
} from "@/lib/validators";
import {
  createPreWriteBackup,
  prunePreWriteBackups,
} from "@/lib/preWriteBackup";

export const DEFAULT_OPEN_CODE_CONFIG_DIR = join(
  homedir(),
  ".config",
  "opencode",
);

export interface ModelAssignment {
  agentKey: string;
  provider: string;
  model: string;
  variant: string;
}

export function parseOpenCodeConfig(raw: string): OpenCodeConfig {
  const result = parseOpenCodeConfigSafe(raw);
  if (!result.ok) {
    throw new Error(result.error.message, { cause: result.error.cause });
  }
  return result.value;
}

export async function detectOpenCode(
  configDir: string = DEFAULT_OPEN_CODE_CONFIG_DIR,
): Promise<AgentDetectionResult> {
  try {
    await access(join(configDir, "opencode.json"));
    return {
      agentId: "opencode",
      installed: true,
      configPath: configDir,
    };
  } catch {
    return {
      agentId: "opencode",
      installed: false,
      configPath: configDir,
    };
  }
}

export async function readOpenCodeConfig(
  configDir: string = DEFAULT_OPEN_CODE_CONFIG_DIR,
): Promise<OpenCodeConfig> {
  const raw = await readFile(join(configDir, "opencode.json"), "utf-8");
  return parseOpenCodeConfig(raw);
}

export async function readOpenCodeConfigSafe(
  configDir: string = DEFAULT_OPEN_CODE_CONFIG_DIR,
): Promise<Result<OpenCodeConfig>> {
  let raw: string;
  let filePath = join(configDir, "opencode.json");
  
  // Try to read .jsonc first (opencode CLI prefers it)
  try {
    raw = await readFile(join(configDir, "opencode.jsonc"), "utf-8");
    filePath = join(configDir, "opencode.jsonc");
  } catch {
    // Fall back to .json
    try {
      raw = await readFile(filePath, "utf-8");
    } catch (cause) {
      return err({
        code: "FILE_MISSING",
        message: "opencode.json or opencode.jsonc not found",
        file: filePath,
        cause,
      });
    }
  }

  return parseOpenCodeConfigSafe(raw);
}

export function listModelAssignments(
  config: OpenCodeConfig,
): ModelAssignment[] {
  return Object.entries(config.agent)
    .filter(([, entry]) => typeof entry.model === "string")
    .map(([agentKey, entry]) => {
      const [provider, ...modelParts] = entry.model!.split("/");
      return {
        agentKey,
        provider: provider ?? "",
        model: modelParts.join("/"),
        variant: entry.variant ?? "",
      };
    });
}

export function splitModelRef(modelRef: string): {
  provider: string;
  model: string;
} {
  const [provider, ...modelParts] = modelRef.split("/");
  return { provider: provider ?? "", model: modelParts.join("/") };
}

export function joinModelRef(provider: string, model: string): string {
  return `${provider}/${model}`;
}

export async function writeOpenCodeConfig(
  configDir: string,
  config: OpenCodeConfig,
  backupDir: string,
  fileName: string = "opencode.json",
): Promise<Result<void>> {
  // Write to both .json and .jsonc if both exist (keep them in sync)
  const filesToWrite: string[] = [fileName];
  
  if (fileName === "opencode.json") {
    try {
      await access(join(configDir, "opencode.jsonc"));
      filesToWrite.push("opencode.jsonc");
    } catch {
      // .jsonc doesn't exist, only write to .json
    }
  } else if (fileName === "opencode.jsonc") {
    try {
      await access(join(configDir, "opencode.json"));
      filesToWrite.push("opencode.json");
    } catch {
      // .json doesn't exist, only write to .jsonc
    }
  }

  const jsonContent = JSON.stringify(config, null, 2);
  
  for (const file of filesToWrite) {
    const targetPath = join(configDir, file);
    const tmpPath = join(configDir, `${file}.presett-tmp`);

    const backupResult = await createPreWriteBackup(targetPath, backupDir);
    if (!backupResult.ok) {
      return backupResult;
    }

    try {
      await writeFile(tmpPath, jsonContent);
      await rename(tmpPath, targetPath);
    } catch (cause) {
      await rm(tmpPath, { force: true, recursive: true });
      return err({
        code: "ATOMIC_WRITE_FAILED",
        message: `Failed to atomically write ${file}`,
        cause,
      });
    }
  }

  await prunePreWriteBackups(backupDir, 20);

  const verifyResult = await readOpenCodeConfigSafe(configDir);
  if (!verifyResult.ok) {
    return err({
      code: "ATOMIC_WRITE_FAILED",
      message: "Wrote opencode.json but could not re-read it",
      cause: verifyResult.error,
    });
  }

  return ok(undefined);
}

export async function updateModelAssignment(
  configDir: string,
  agentKey: string,
  assignment: { provider: string; model: string; variant: string },
  backupDir: string,
  cacheRaw: ModelCache,
): Promise<Result<void>> {
  const cache = buildModelCache(cacheRaw);
  const validation = validateModelAssignment(cache, assignment);
  if (!validation.ok) return validation;

  const readResult = await readOpenCodeConfigSafe(configDir);
  if (!readResult.ok) return readResult;

  const config = readResult.value;
  config.agent[agentKey] = {
    ...(config.agent[agentKey] ?? {}),
    model: joinModelRef(assignment.provider, assignment.model),
    variant: assignment.variant,
  };

  return writeOpenCodeConfig(configDir, config, backupDir);
}

export interface Profile {
  name: string;
  displayName: string;
  active: boolean;
  modelCount: number;
  /** ISO-8601 timestamp — derived from config file mtime as canonical source. */
  updatedAt: string;
}

const SDD_ORCHESTRATOR_PREFIX = "sdd-orchestrator-";
const SDD_PHASE_PREFIX = "sdd-";

function isProfileAgent(agentKey: string): { profile: string; isOrchestrator: boolean } | null {
  if (agentKey.startsWith(SDD_ORCHESTRATOR_PREFIX)) {
    return {
      profile: agentKey.slice(SDD_ORCHESTRATOR_PREFIX.length),
      isOrchestrator: true,
    };
  }
  if (agentKey.startsWith(SDD_PHASE_PREFIX)) {
    const rest = agentKey.slice(SDD_PHASE_PREFIX.length);
    const dashIndex = rest.indexOf("-");
    if (dashIndex > 0) {
      return { profile: rest.slice(dashIndex + 1), isOrchestrator: false };
    }
  }
  return null;
}

/**
 * Derive `updatedAt` from the config file mtime (canonical source).
 * Falls back to `Date.now()` when configDir is omitted or stat fails.
 */
async function deriveConfigMtime(configDir?: string): Promise<string> {
  if (!configDir) return new Date().toISOString();
  try {
    const s = await stat(join(configDir, "opencode.json"));
    return s.mtime.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export async function listProfiles(
  config: OpenCodeConfig,
  configDir?: string,
): Promise<Profile[]> {
  const updatedAt = await deriveConfigMtime(configDir);

  const profiles = new Map<
    string,
    { name: string; displayName: string; modelCount: number }
  >();

  profiles.set("", { name: "", displayName: "Base", modelCount: 0 });

  for (const [agentKey, entry] of Object.entries(config.agent)) {
    const profileInfo = isProfileAgent(agentKey);
    if (profileInfo) {
      const existing = profiles.get(profileInfo.profile);
      if (existing) {
        existing.modelCount += entry.model ? 1 : 0;
      } else {
        profiles.set(profileInfo.profile, {
          name: profileInfo.profile,
          displayName: profileInfo.profile,
          modelCount: entry.model ? 1 : 0,
        });
      }
    } else {
      profiles.get("")!.modelCount += entry.model ? 1 : 0;
    }
  }

  return Array.from(profiles.values()).map((p) => ({
    ...p,
    active:
      p.name === ""
        ? config.default_agent === undefined ||
          config.default_agent === "gentle-orchestrator"
        : config.default_agent === `${SDD_ORCHESTRATOR_PREFIX}${p.name}`,
    updatedAt,
  }));
}

export async function createProfile(
  configDir: string,
  name: string,
  assignments: Record<string, { provider: string; model: string; variant: string }>,
  backupDir: string,
  cacheRaw: ModelCache,
): Promise<Result<void>> {
  if (!name || !/^[a-z0-9_-]+$/.test(name)) {
    return err({
      code: "SCHEMA_INVALID",
      message: "Profile name must contain only lowercase letters, numbers, underscores, and hyphens",
    });
  }

  const cache = buildModelCache(cacheRaw);

  const readResult = await readOpenCodeConfigSafe(configDir);
  if (!readResult.ok) return readResult;

  const config = readResult.value;
  const orchestratorKey = `${SDD_ORCHESTRATOR_PREFIX}${name}`;

  if (config.agent[orchestratorKey]) {
    return err({
      code: "SCHEMA_INVALID",
      message: `Profile "${name}" already exists`,
    });
  }

  for (const [agentKey, assignment] of Object.entries(assignments)) {
    const validation = validateModelAssignment(cache, assignment);
    if (!validation.ok) return validation;

    config.agent[agentKey] = {
      ...(config.agent[agentKey] ?? {}),
      model: joinModelRef(assignment.provider, assignment.model),
      variant: assignment.variant,
    };
  }

  return writeOpenCodeConfig(configDir, config, backupDir);
}

export async function updateProfile(
  configDir: string,
  name: string,
  assignments: Record<string, { provider: string; model: string; variant: string }>,
  backupDir: string,
  cacheRaw: ModelCache,
): Promise<Result<void>> {
  if (!name || !/^[a-z0-9_-]+$/.test(name)) {
    return err({
      code: "SCHEMA_INVALID",
      message: "Profile name must contain only lowercase letters, numbers, underscores, and hyphens",
    });
  }

  const cache = buildModelCache(cacheRaw);

  const readResult = await readOpenCodeConfigSafe(configDir);
  if (!readResult.ok) return readResult;

  const config = readResult.value;
  const orchestratorKey = `${SDD_ORCHESTRATOR_PREFIX}${name}`;

  if (!config.agent[orchestratorKey]) {
    return err({
      code: "SCHEMA_INVALID",
      message: `Profile "${name}" does not exist`,
    });
  }

  for (const [agentKey, assignment] of Object.entries(assignments)) {
    const validation = validateModelAssignment(cache, assignment);
    if (!validation.ok) return validation;

    config.agent[agentKey] = {
      ...(config.agent[agentKey] ?? {}),
      model: joinModelRef(assignment.provider, assignment.model),
      variant: assignment.variant,
    };
  }

  return writeOpenCodeConfig(configDir, config, backupDir);
}

export async function deleteProfile(
  configDir: string,
  name: string,
  backupDir: string,
): Promise<Result<void>> {
  if (!name) {
    return err({
      code: "SCHEMA_INVALID",
      message: "The base profile cannot be deleted",
    });
  }

  const readResult = await readOpenCodeConfigSafe(configDir);
  if (!readResult.ok) return readResult;

  const config = readResult.value;
  const prefix = `${SDD_ORCHESTRATOR_PREFIX}${name}`;

  for (const agentKey of Object.keys(config.agent)) {
    if (agentKey === prefix || isProfileAgent(agentKey)?.profile === name) {
      delete config.agent[agentKey];
    }
  }

  return writeOpenCodeConfig(configDir, config, backupDir);
}

export async function switchProfile(
  configDir: string,
  name: string,
  backupDir: string,
): Promise<Result<void>> {
  const readResult = await readOpenCodeConfigSafe(configDir);
  if (!readResult.ok) return readResult;

  const config = readResult.value;
  config.default_agent = name
    ? `${SDD_ORCHESTRATOR_PREFIX}${name}`
    : "gentle-orchestrator";

  return writeOpenCodeConfig(configDir, config, backupDir);
}

/**
 * Updates the gentle-orchestrator prompt to enforce a specific response language.
 * 
 * NOTE: This is a TEMPORARY injection that will be lost if Gentle-AI runs `sync`.
 * The proper solution is for Gentle-AI to read language from ~/.gentle-ai/state.json.
 * This function is kept for reference but should not be used in production.
 * 
 * @deprecated Use AGENTS.md configuration instead
 */
export async function updateOrchestratorLanguage(
  configDir: string,
  language: "en" | "es",
  backupDir: string,
): Promise<Result<void>> {
  const readResult = await readOpenCodeConfigSafe(configDir);
  if (!readResult.ok) return readResult;

  const config = readResult.value;
  const orchestrator = config.agent["gentle-orchestrator"];
  
  if (!orchestrator) {
    return err({ code: "SCHEMA_INVALID", message: "gentle-orchestrator agent not found" });
  }

  // NOTE: This change will be lost if Gentle-AI syncs.
  // See discovery in memory for full explanation of the limitation.
  const languageRule = language === "en" 
    ? "## Response Language\n\nYou MUST respond in English only, regardless of the language the user writes in.\n\n"
    : "## Response Language\n\nYou MUST respond in Spanish (neutral, professional register) only, regardless of the language the user writes in.\n\n";
  
  const currentPrompt = orchestrator.prompt || "";
  
  // Only prepend if not already present
  if (!currentPrompt.includes("## Response Language")) {
    orchestrator.prompt = languageRule + currentPrompt;
    return writeOpenCodeConfig(configDir, config, backupDir);
  }
  
  return ok(undefined);
}
