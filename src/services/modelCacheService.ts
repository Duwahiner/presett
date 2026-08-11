import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ModelCache } from "@/types";
import type { Result } from "@/lib/types";
import { err, ok } from "@/lib/types";

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

export async function readModelCacheSafe(
  cacheDir: string = DEFAULT_MODEL_CACHE_DIR,
): Promise<Result<ModelCache>> {
  let raw: string;
  try {
    raw = await readFile(join(cacheDir, "model-variants.json"), "utf-8");
  } catch (cause) {
    return err({
      code: "FILE_MISSING",
      message: "model-variants.json not found",
      file: join(cacheDir, "model-variants.json"),
      cause,
    });
  }

  try {
    return ok(JSON.parse(raw) as ModelCache);
  } catch (cause) {
    return err({
      code: "PARSE_FAILED",
      message: "model-variants.json is not valid JSON",
      file: join(cacheDir, "model-variants.json"),
      cause,
    });
  }
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
