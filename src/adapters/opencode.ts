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
  try {
    raw = await readFile(join(configDir, "opencode.json"), "utf-8");
  } catch (cause) {
    return err({
      code: "FILE_MISSING",
      message: "opencode.json not found",
      file: join(configDir, "opencode.json"),
      cause,
    });
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
  if (fileName.endsWith(".jsonc")) {
    return err({
      code: "JSONC_NOT_SUPPORTED",
      message: "PreSett refuses to write JSONC files",
    });
  }

  const targetPath = join(configDir, fileName);
  const tmpPath = join(configDir, `${fileName}.presett-tmp`);

  const backupResult = await createPreWriteBackup(targetPath, backupDir);
  if (!backupResult.ok) {
    return backupResult;
  }

  try {
    await writeFile(tmpPath, JSON.stringify(config, null, 2));
    await rename(tmpPath, targetPath);
  } catch (cause) {
    await rm(tmpPath, { force: true });
    return err({
      code: "ATOMIC_WRITE_FAILED",
      message: "Failed to atomically write opencode.json",
      cause,
    });
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
