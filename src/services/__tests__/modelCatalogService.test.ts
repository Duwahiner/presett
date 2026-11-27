import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseVerboseOpencodeModelsOutput,
  loadMergedModelCatalogSafe,
  clearServerModelCatalogCache,
} from "@/services/modelCatalogService";

describe("parseVerboseOpencodeModelsOutput", () => {
  it("ingests a raw `opencode` providerID verbatim", () => {
    const output = [
      "opencode/qwen3-max",
      "{",
      '  "id": "qwen3-max",',
      '  "providerID": "opencode",',
      '  "variants": { "high": {}, "max": {} }',
      "}",
    ].join("\n");

    const catalog = parseVerboseOpencodeModelsOutput(output);

    expect(catalog["opencode"]).toBeDefined();
    expect(catalog["opencode"]["qwen3-max"]).toEqual(["high", "max"]);
    expect(catalog["opencode-zen"]).toBeUndefined();
  });

  it("keeps providerIDs verbatim without introducing `opencode-zen`", () => {
    const output = [
      "openai/gpt-4",
      "{",
      '  "id": "gpt-4",',
      '  "providerID": "openai",',
      '  "variants": { "low": {} }',
      "}",
      "opencode/qwen3-max",
      "{",
      '  "id": "qwen3-max",',
      '  "providerID": "opencode",',
      '  "variants": { "high": {} }',
      "}",
    ].join("\n");

    const catalog = parseVerboseOpencodeModelsOutput(output);

    expect(catalog.openai["gpt-4"]).toEqual(["low"]);
    expect(catalog["opencode"]["qwen3-max"]).toEqual(["high"]);
  });
});

describe("loadMergedModelCatalogSafe", () => {
  let tempDir = "";
  let configDir = "";
  let gentleAiDir = "";
  let verboseFile = "";

  beforeEach(async () => {
    clearServerModelCatalogCache();
    tempDir = await mkdtemp(join(tmpdir(), "presett-cat-"));
    configDir = await mkdtemp(join(tmpdir(), "presett-cat-config-"));
    gentleAiDir = await mkdtemp(join(tmpdir(), "presett-cat-gentle-"));
    verboseFile = join(tempDir, "opencode-models-verbose.txt");
    vi.stubEnv("PRESETT_TEST_MODEL_CACHE_DIR", tempDir);
    vi.stubEnv("PRESETT_TEST_CONFIG_DIR", configDir);
    vi.stubEnv("PRESETT_TEST_GENTLE_AI_DIR", gentleAiDir);
    vi.stubEnv("PRESETT_TEST_OPENCODE_MODELS_FILE", verboseFile);
    await writeFile(verboseFile, "");
  });

  afterEach(async () => {
    clearServerModelCatalogCache();
    vi.unstubAllEnvs();
    await rm(tempDir, { recursive: true, force: true });
    await rm(configDir, { recursive: true, force: true });
    await rm(gentleAiDir, { recursive: true, force: true });
  });

  it("preserves a raw `opencode` cache key without on-read migration", async () => {
    await writeFile(
      join(tempDir, "model-variants.json"),
      JSON.stringify({ opencode: { "qwen3-max": ["high"] } }),
    );

    const result = await loadMergedModelCatalogSafe({
      cacheDir: tempDir,
      openCodeConfigDir: configDir,
      gentleAiDir,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value["opencode"]).toEqual({ "qwen3-max": ["high"] });
    expect(result.value["opencode-zen"]).toBeUndefined();
  });
});