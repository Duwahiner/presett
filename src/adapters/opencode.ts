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
import { createAtomicBackup } from "@/utils/backup";
import {
  detectProfileStrategy,
  detectIncompleteProfiles,
  isReservedProfileName,
  SDD_PHASES,
  type ProfileStrategy,
} from "@/services/profileStrategyService";
import { runGentleAiSync, type SyncResult } from "@/services/processService";

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

/**
 * Merge two configs deterministically when `opencode.jsonc` and
 * `opencode.json` coexist. `base` (the jsonc file, which the opencode CLI
 * prefers) is authoritative: every base field is preserved and wins on
 * conflicts, while `extra` (the json file) only contributes `agent` keys that
 * `base` does not already define. This keeps user-edited base config intact
 * while still surfacing generated-multi profiles that gentle-ai writes only to
 * `opencode.json`.
 */
export function mergeOpenCodeConfigs(
  base: OpenCodeConfig,
  extra: OpenCodeConfig,
): OpenCodeConfig {
  const agent = { ...extra.agent, ...base.agent };
  return { ...extra, ...base, agent };
}

export async function readOpenCodeConfigSafe(
  configDir: string = DEFAULT_OPEN_CODE_CONFIG_DIR,
): Promise<Result<OpenCodeConfig>> {
  const jsoncPath = join(configDir, "opencode.jsonc");
  const jsonPath = join(configDir, "opencode.json");

  let jsoncRaw: string | null = null;
  try {
    jsoncRaw = await readFile(jsoncPath, "utf-8");
  } catch {
    jsoncRaw = null;
  }

  // When both coexist, the jsonc base is authoritative and agents present only
  // in json (generated-multi profiles) are merged in without touching base.
  if (jsoncRaw !== null) {
    const baseResult = parseOpenCodeConfigSafe(jsoncRaw);
    if (!baseResult.ok) return baseResult;

    let jsonRaw: string | null = null;
    try {
      jsonRaw = await readFile(jsonPath, "utf-8");
    } catch {
      jsonRaw = null;
    }
    if (jsonRaw === null) return ok(baseResult.value);

    const extraResult = parseOpenCodeConfigSafe(jsonRaw);
    if (!extraResult.ok) return extraResult;

    return ok(mergeOpenCodeConfigs(baseResult.value, extraResult.value));
  }

  try {
    const raw = await readFile(jsonPath, "utf-8");
    return parseOpenCodeConfigSafe(raw);
  } catch (cause) {
    return err({
      code: "FILE_MISSING",
      message: "opencode.json or opencode.jsonc not found",
      file: jsonPath,
      cause,
    });
  }
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
    ...(assignment.variant ? { variant: assignment.variant } : {}),
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
  /** Active profile strategy detected from the config. */
  strategy: ProfileStrategy;
  /** True when this generated profile is missing any of its ten phase agents. */
  incomplete: boolean;
}

export interface ProfileDetailAssignment {
  provider: string;
  model: string;
  variant: string;
}

export interface ProfileDetail {
  name: string;
  assignments: Record<string, ProfileDetailAssignment>;
}

const SDD_ORCHESTRATOR_PREFIX = "sdd-orchestrator-";
const SDD_PHASE_PREFIX = "sdd-";
/** Profile names reserved by the system and rejected by `createProfile`. */
const RESERVED_PROFILE_NAMES = new Set(["base"]);

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
  const strategy = detectProfileStrategy(config);
  const incompleteProfiles = new Set(detectIncompleteProfiles(config));

  const profiles = new Map<
    string,
    { name: string; displayName: string; modelCount: number }
  >();

  profiles.set("", { name: "", displayName: "Gentle-Orchestrator", modelCount: 0 });

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
    strategy,
    incomplete: incompleteProfiles.has(p.name),
    active:
      p.name === ""
        ? config.default_agent === undefined ||
          config.default_agent === "gentle-orchestrator"
        : config.default_agent === `${SDD_ORCHESTRATOR_PREFIX}${p.name}`,
    updatedAt,
  }));
}

export async function createProfile(
  name: string,
  assignments: Record<string, { provider: string; model: string; variant: string }>,
  cacheRaw: ModelCache,
  command: string = "gentle-ai",
): Promise<Result<SyncResult>> {
  if (!name || !/^[a-z0-9_-]+$/.test(name)) {
    return err({
      code: "SCHEMA_INVALID",
      message: "Profile name must contain only lowercase letters, numbers, underscores, and hyphens",
    });
  }

  if (RESERVED_PROFILE_NAMES.has(name)) {
    return err({
      code: "SCHEMA_INVALID",
      message: `Profile name "${name}" is reserved and cannot be created`,
    });
  }

  if (isReservedProfileName(name)) {
    return err({
      code: "SCHEMA_INVALID",
      message: `Profile name "${name}" must not use the reserved internal prefix "${SDD_ORCHESTRATOR_PREFIX}"`,
    });
  }

  const cache = buildModelCache(cacheRaw);
  const orchestratorKey = `${SDD_ORCHESTRATOR_PREFIX}${name}`;

  // A profile materializes exactly one visible agent: its orchestrator.
  // Any legacy phase key (`sdd-<fase>-<name>`) in the payload is rejected.
  for (const agentKey of Object.keys(assignments)) {
    if (agentKey !== orchestratorKey) {
      return err({
        code: "SCHEMA_INVALID",
        message: `Agent "${agentKey}" is not the orchestrator key for profile "${name}"`,
      });
    }
  }

  const assignment = assignments[orchestratorKey];
  if (assignment) {
    const validation = validateModelAssignment(cache, assignment);
    if (!validation.ok) return validation;
  }

  const ref = assignment
    ? `${name}:${joinModelRef(assignment.provider, assignment.model)}`
    : `${name}:`;
  return runGentleAiSync(command, ["--profile", ref]);
}

export async function updateProfile(
  name: string,
  assignments: Record<string, { provider: string; model: string; variant: string }>,
  cacheRaw: ModelCache,
  command: string = "gentle-ai",
): Promise<Result<SyncResult>> {
  if (!name || !/^[a-z0-9_-]+$/.test(name)) {
    return err({
      code: "SCHEMA_INVALID",
      message: "Profile name must contain only lowercase letters, numbers, underscores, and hyphens",
    });
  }

  const cache = buildModelCache(cacheRaw);
  const orchestratorKey = `${SDD_ORCHESTRATOR_PREFIX}${name}`;

  // Persist only the orchestrator assignment; legacy phase keys are ignored.
  const assignment = assignments[orchestratorKey];
  if (assignment) {
    const validation = validateModelAssignment(cache, assignment);
    if (!validation.ok) return validation;
  }

  const ref = assignment
    ? `${name}:${joinModelRef(assignment.provider, assignment.model)}`
    : `${name}:`;
  return runGentleAiSync(command, ["--profile", ref]);
}

/**
 * Delegate a single phase model assignment to the Gentle-AI CLI. Per the
 * strategy contract, `sdd-{phase}-{name}` agents are owned exclusively by
 * gentle-ai, so PreSett NEVER writes them directly: this delegates to
 * `gentle-ai sync --profile-phase {name}:{phase}:{provider}/{model}` and
 * leaves `opencode.json` untouched. The profile name and phase are validated
 * before any spawn (argument-injection guard); the model must exist in the
 * catalog.
 */
export async function updateProfilePhase(
  name: string,
  phase: string,
  assignment: { provider: string; model: string; variant: string },
  cacheRaw: ModelCache,
  command: string = "gentle-ai",
): Promise<Result<SyncResult>> {
  if (!name || !/^[a-z0-9_-]+$/.test(name)) {
    return err({
      code: "SCHEMA_INVALID",
      message:
        "Profile name must contain only lowercase letters, numbers, underscores, and hyphens",
    });
  }

  if (!(SDD_PHASES as readonly string[]).includes(phase)) {
    return err({
      code: "SCHEMA_INVALID",
      message: `Unknown phase "${phase}"`,
    });
  }

  const cache = buildModelCache(cacheRaw);
  const validation = validateModelAssignment(cache, assignment);
  if (!validation.ok) return validation;

  const ref = `${name}:${phase}:${joinModelRef(assignment.provider, assignment.model)}`;
  return runGentleAiSync(command, ["--profile-phase", ref]);
}

export interface RepairResult {
  /** Outcome of the delegated `gentle-ai sync --profile` run. */
  sync: SyncResult;
  /** Path of the atomic pre-repair backup, recoverable for rollback. */
  backup: string;
}

/**
 * Repair a generated-multi profile that is missing its ten phase agents. Per
 * the strategy contract, gentle-ai owns every phase agent, so PreSett NEVER
 * writes them directly: this snapshots the current config into an atomic
 * backup (rollback path) and then delegates the materialization to
 * `gentle-ai sync --profile {name}:{provider}/{model}` using the orchestrator's
 * current model. `opencode.json` is left untouched on success AND failure; the
 * backup is always recoverable.
 */
export async function repairProfile(
  name: string,
  configDir: string,
  backupDir: string,
  command: string = "gentle-ai",
  timeoutMs: number = 30_000,
): Promise<Result<RepairResult>> {
  if (!name || !/^[a-z0-9_-]+$/.test(name)) {
    return err({
      code: "SCHEMA_INVALID",
      message:
        "Profile name must contain only lowercase letters, numbers, underscores, and hyphens",
    });
  }

  const readResult = await readOpenCodeConfigSafe(configDir);
  if (!readResult.ok) return readResult;

  const orchestratorKey = `${SDD_ORCHESTRATOR_PREFIX}${name}`;
  const entry = readResult.value.agent[orchestratorKey];
  if (!entry || typeof entry.model !== "string") {
    return err({
      code: "NOT_FOUND",
      message: `Profile "${name}" does not exist`,
    });
  }

  const { provider, model } = splitModelRef(entry.model);
  const ref = `${name}:${joinModelRef(provider, model)}`;

  // Back up the file that readOpenCodeConfigSafe actually read (jsonc preferred).
  let configFilePath = join(configDir, "opencode.json");
  try {
    await access(join(configDir, "opencode.jsonc"));
    configFilePath = join(configDir, "opencode.jsonc");
  } catch {
    // .jsonc doesn't exist; the backup targets opencode.json.
  }

  const backupResult = await createAtomicBackup(configFilePath, backupDir);
  if (!backupResult.ok) return backupResult;

  const syncResult = await runGentleAiSync(
    command,
    ["--profile", ref],
    timeoutMs,
  );
  if (!syncResult.ok) return syncResult;

  return ok({ sync: syncResult.value, backup: backupResult.value });
}

/**
 * Persist assignments for the Base profile (empty-name identity). Only
 * non-profile agents (e.g. `gentle-orchestrator`) are Base-owned; any named
 * profile agent key is rejected so a save through `/api/profiles/base` can
 * never mutate a named profile.
 */
export async function updateBaseProfile(
  configDir: string,
  assignments: Record<string, { provider: string; model: string; variant: string }>,
  backupDir: string,
  cacheRaw: ModelCache,
): Promise<Result<void>> {
  const cache = buildModelCache(cacheRaw);

  for (const agentKey of Object.keys(assignments)) {
    if (isProfileAgent(agentKey) !== null) {
      return err({
        code: "SCHEMA_INVALID",
        message: `Agent "${agentKey}" belongs to a named profile and cannot be saved to the Base profile`,
      });
    }
  }

  const readResult = await readOpenCodeConfigSafe(configDir);
  if (!readResult.ok) return readResult;

  const config = readResult.value;

  for (const [agentKey, assignment] of Object.entries(assignments)) {
    const validation = validateModelAssignment(cache, assignment);
    if (!validation.ok) return validation;

    config.agent[agentKey] = {
      ...(config.agent[agentKey] ?? {}),
      model: joinModelRef(assignment.provider, assignment.model),
      ...(assignment.variant ? { variant: assignment.variant } : {}),
    };
  }

  return writeOpenCodeConfig(configDir, config, backupDir);
}

export async function deleteProfile(
  configDir: string,
  name: string,
  backupDir: string,
): Promise<Result<void>> {
  if (!name || RESERVED_PROFILE_NAMES.has(name)) {
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

  // If the deleted profile was the active one, restore the default agent in the
  // same atomic write so the config never points to a now-orphaned agent.
  if (config.default_agent === prefix) {
    config.default_agent = "gentle-orchestrator";
  }

  return writeOpenCodeConfig(configDir, config, backupDir);
}

/**
 * Read the full detail of a profile without mutating the config.
 * Returns `null` when the profile does not exist or the name is invalid.
 * A named profile exposes only its orchestrator assignment; legacy phase
 * keys never surface in the detail contract.
 */
export function getProfileDetail(
  config: OpenCodeConfig,
  name: string,
): ProfileDetail | null {
  if (!name || !/^[a-z0-9_-]+$/.test(name)) return null;

  const orchestratorKey = `${SDD_ORCHESTRATOR_PREFIX}${name}`;
  const entry = config.agent[orchestratorKey];
  if (!entry || typeof entry.model !== "string") return null;

  const { provider, model } = splitModelRef(entry.model);
  return {
    name,
    assignments: {
      [orchestratorKey]: {
        provider,
        model,
        variant: entry.variant ?? "",
      },
    },
  };
}

/**
 * Read the full detail of the Base profile (empty-name identity) without
 * mutating the config. Base is the canonical `name: ""` profile; its
 * assignments are every non-profile agent (e.g. `gentle-orchestrator`) that
 * has a model configured. Named-profile agents are excluded by convention, not
 * by assuming an empty segment is a valid path.
 */
export function getBaseProfileDetail(config: OpenCodeConfig): ProfileDetail {
  const assignments: Record<string, ProfileDetailAssignment> = {};
  for (const [agentKey, entry] of Object.entries(config.agent)) {
    if (isProfileAgent(agentKey) === null && typeof entry.model === "string") {
      const { provider, model } = splitModelRef(entry.model);
      assignments[agentKey] = {
        provider,
        model,
        variant: entry.variant ?? "",
      };
    }
  }
  return { name: "", assignments };
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
