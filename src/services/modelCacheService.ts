import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ModelCache } from "@/types";

export const DEFAULT_MODEL_CACHE_DIR = join(
  homedir(),
  ".gentle-ai",
  "cache",
);

export async function readModelCache(
  cacheDir: string = DEFAULT_MODEL_CACHE_DIR,
): Promise<ModelCache> {
  const raw = await readFile(join(cacheDir, "model-variants.json"), "utf-8");
  return JSON.parse(raw) as ModelCache;
}

export function listProviders(cache: ModelCache): string[] {
  return Object.keys(cache);
}

export function listModelsForProvider(
  cache: ModelCache,
  provider: string,
): string[] {
  return Object.keys(cache[provider] ?? {});
}

export function getEffortsForModel(
  cache: ModelCache,
  provider: string,
  model: string,
): string[] {
  return cache[provider]?.[model] ?? [];
}
