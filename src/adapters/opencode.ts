import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentDetectionResult, OpenCodeConfig } from "@/types";

export const DEFAULT_OPEN_CODE_CONFIG_DIR = join(
  homedir(),
  ".config",
  "opencode",
);

export function parseOpenCodeConfig(raw: string): OpenCodeConfig {
  const parsed = JSON.parse(raw) as OpenCodeConfig;

  if (typeof parsed.agent !== "object" || parsed.agent === null) {
    parsed.agent = {};
  }

  return parsed;
}

export async function detectOpenCode(
  configDir: string = DEFAULT_OPEN_CODE_CONFIG_DIR,
): Promise<AgentDetectionResult> {
  try {
    await readFile(join(configDir, "opencode.json"), "utf-8");
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
