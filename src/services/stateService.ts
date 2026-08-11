import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { StateJson } from "@/types";

export const DEFAULT_GENTLE_AI_DIR = join(homedir(), ".gentle-ai");

export async function readStateJson(
  gentleAiDir: string = DEFAULT_GENTLE_AI_DIR,
): Promise<StateJson> {
  const raw = await readFile(join(gentleAiDir, "state.json"), "utf-8");
  return JSON.parse(raw) as StateJson;
}

export function getInstalledAgents(state: StateJson): string[] {
  return state.installed_agents;
}

export function getSddMode(state: StateJson): StateJson["sdd_mode"] {
  return state.sdd_mode;
}
