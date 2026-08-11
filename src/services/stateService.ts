import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { StateJson } from "@/types";
import type { Result } from "@/lib/types";
import { err, ok } from "@/lib/types";

export const DEFAULT_GENTLE_AI_DIR = join(homedir(), ".gentle-ai");

export async function readStateJson(
  gentleAiDir: string = DEFAULT_GENTLE_AI_DIR,
): Promise<StateJson> {
  const raw = await readFile(join(gentleAiDir, "state.json"), "utf-8");
  return JSON.parse(raw) as StateJson;
}

export async function readStateJsonSafe(
  gentleAiDir: string = DEFAULT_GENTLE_AI_DIR,
): Promise<Result<StateJson>> {
  let raw: string;
  try {
    raw = await readFile(join(gentleAiDir, "state.json"), "utf-8");
  } catch (cause) {
    return err({
      code: "FILE_MISSING",
      message: "state.json not found",
      file: join(gentleAiDir, "state.json"),
      cause,
    });
  }

  try {
    return ok(JSON.parse(raw) as StateJson);
  } catch (cause) {
    return err({
      code: "PARSE_FAILED",
      message: "state.json is not valid JSON",
      file: join(gentleAiDir, "state.json"),
      cause,
    });
  }
}

export function getInstalledAgents(state: StateJson): string[] {
  return state.installed_agents;
}

export function getSddMode(state: StateJson): StateJson["sdd_mode"] {
  return state.sdd_mode;
}
