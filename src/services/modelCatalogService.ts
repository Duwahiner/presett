import { exec as execCallback } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import type { ModelCache } from "@/types";
import type { Result } from "@/lib/types";
import { err, ok } from "@/lib/types";
import { readModelCacheSafe } from "@/services/modelCacheService";
import { readOpenCodeConfigSafe, listModelAssignments } from "@/adapters/opencode";
import { readGentleAiConfigSafe } from "@/adapters/gentle-ai";

const exec = promisify(execCallback);
const MODEL_CATALOG_CACHE_TTL_MS = 30_000;

let cachedCatalog: ModelCache | null = null;
let cacheExpiresAt = 0;
let inFlightCatalogLoad: Promise<Result<ModelCache>> | null = null;

function cloneCatalog(catalog: ModelCache): ModelCache {
  return Object.fromEntries(
    Object.entries(catalog).map(([provider, models]) => [
      provider,
      Object.fromEntries(Object.entries(models).map(([model, variants]) => [model, [...variants]])),
    ]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function addKnownAssignment(
  catalog: ModelCache,
  assignment: { provider?: string; model?: string; variant?: string },
): void {
  const provider = assignment.provider?.trim();
  const model = assignment.model?.trim();
  const variant = assignment.variant?.trim();

  if (!provider || !model) return;

  catalog[provider] = catalog[provider] ?? {};
  catalog[provider][model] = catalog[provider][model] ?? [];

  if (variant && !catalog[provider][model].includes(variant)) {
    catalog[provider][model].push(variant);
    catalog[provider][model].sort();
  }
}

export function mergeCatalogInto(target: ModelCache, source: ModelCache): void {
  for (const [provider, models] of Object.entries(source)) {
    for (const [model, variants] of Object.entries(models)) {
      addKnownAssignment(target, { provider, model });
      for (const variant of variants) addKnownAssignment(target, { provider, model, variant });
    }
  }
}

function mergeGentleAiAssignments(catalog: ModelCache, state: Record<string, unknown>): void {
  const assignments = state.model_assignments;
  if (!isRecord(assignments)) return;

  for (const value of Object.values(assignments)) {
    if (!isRecord(value)) continue;
    addKnownAssignment(catalog, {
      provider: typeof value.provider_id === "string" ? value.provider_id : undefined,
      model: typeof value.model_id === "string" ? value.model_id : undefined,
      variant: typeof value.effort === "string" ? value.effort : undefined,
    });
  }
}

export function parseVerboseOpencodeModelsOutput(output: string): ModelCache {
  const catalog: ModelCache = {};
  const lines = output.split(/\r?\n/);
  let currentRef = "";
  let collecting = false;
  let depth = 0;
  let buffer: string[] = [];

  const flush = () => {
    if (!currentRef || buffer.length === 0) return;
    const parsed = JSON.parse(buffer.join("\n")) as { providerID?: string; id?: string; variants?: Record<string, unknown> };
    const [providerFromRef, ...modelParts] = currentRef.split("/");
    const provider = parsed.providerID ?? providerFromRef;
    const model = parsed.id ?? modelParts.join("/");
    const variants = Object.keys(parsed.variants ?? {}).sort();
    addKnownAssignment(catalog, { provider, model });
    for (const variant of variants) addKnownAssignment(catalog, { provider, model, variant });
    currentRef = "";
    buffer = [];
    collecting = false;
    depth = 0;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!collecting) {
      if (!trimmed) continue;
      if (trimmed.includes("/") && !trimmed.startsWith("{") && !trimmed.startsWith("}")) {
        currentRef = trimmed;
        continue;
      }
      if (trimmed.startsWith("{") && currentRef) {
        collecting = true;
      } else {
        continue;
      }
    }

    buffer.push(line);
    depth += (line.match(/\{/g) ?? []).length;
    depth -= (line.match(/\}/g) ?? []).length;
    if (collecting && depth === 0) flush();
  }

  return catalog;
}

async function readVerboseOpencodeModelsOutput(): Promise<string> {
  const fixturePath = process.env.PRESETT_TEST_OPENCODE_MODELS_FILE;
  if (fixturePath) return readFile(fixturePath, "utf8");
  const { stdout } = await exec("opencode models --verbose", { maxBuffer: 16 * 1024 * 1024, timeout: 30000 });
  return stdout;
}

export function clearServerModelCatalogCache(): void {
  cachedCatalog = null;
  cacheExpiresAt = 0;
  inFlightCatalogLoad = null;
}

export async function readLiveOpencodeModelCatalogSafe(): Promise<Result<ModelCache>> {
  try {
    return ok(parseVerboseOpencodeModelsOutput(await readVerboseOpencodeModelsOutput()));
  } catch (cause) {
    return err({ code: "FILE_MISSING", message: "OpenCode model catalog unavailable", cause });
  }
}

export async function loadMergedModelCatalogSafe(options: {
  cacheDir: string;
  openCodeConfigDir: string;
  gentleAiDir: string;
  forceRefresh?: boolean;
}): Promise<Result<ModelCache>> {
  const forceRefresh = options.forceRefresh === true;
  const now = Date.now();

  if (!forceRefresh && cachedCatalog && cacheExpiresAt > now) {
    return ok(cloneCatalog(cachedCatalog));
  }

  if (!forceRefresh && inFlightCatalogLoad) {
    const result = await inFlightCatalogLoad;
    return result.ok ? ok(cloneCatalog(result.value)) : result;
  }

  inFlightCatalogLoad = (async () => {
    const [cacheResult, liveResult, openCodeResult, gentleAiResult] = await Promise.all([
      readModelCacheSafe(options.cacheDir),
      readLiveOpencodeModelCatalogSafe(),
      readOpenCodeConfigSafe(options.openCodeConfigDir),
      readGentleAiConfigSafe(options.gentleAiDir),
    ]);

    const seed = cacheResult.ok ? cloneCatalog(cacheResult.value) : {};

    if (liveResult.ok) mergeCatalogInto(seed, liveResult.value);

    if (openCodeResult.ok) {
      for (const assignment of listModelAssignments(openCodeResult.value)) {
        addKnownAssignment(seed, assignment);
      }
    }

    if (gentleAiResult.ok) mergeGentleAiAssignments(seed, gentleAiResult.value);

    if (Object.keys(seed).length > 0) {
      cachedCatalog = cloneCatalog(seed);
      cacheExpiresAt = Date.now() + MODEL_CATALOG_CACHE_TTL_MS;
      return ok(seed);
    }
    if (!cacheResult.ok) return cacheResult;
    if (!liveResult.ok) return liveResult;
    return err({ code: "FILE_MISSING", message: "Model catalog unavailable" });
  })();

  try {
    const result = await inFlightCatalogLoad;
    return result.ok ? ok(cloneCatalog(result.value)) : result;
  } finally {
    inFlightCatalogLoad = null;
  }
}
