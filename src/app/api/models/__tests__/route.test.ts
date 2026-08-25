import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GET } from "../route";
import { clearServerModelCatalogCache } from "@/services/modelCatalogService";

describe("GET /api/models", () => {
  let tempDir = "";
  let configDir = "";
  let gentleAiDir = "";
  let verboseFile = "";

  beforeEach(async () => {
    clearServerModelCatalogCache();
    tempDir = await mkdtemp(join(tmpdir(), "presett-models-"));
    configDir = await mkdtemp(join(tmpdir(), "presett-config-"));
    gentleAiDir = await mkdtemp(join(tmpdir(), "presett-gentle-ai-"));
    verboseFile = join(tempDir, "opencode-models-verbose.txt");
    process.env.PRESETT_TEST_MODEL_CACHE_DIR = tempDir;
    process.env.PRESETT_TEST_CONFIG_DIR = configDir;
    process.env.PRESETT_TEST_GENTLE_AI_DIR = gentleAiDir;
    process.env.PRESETT_TEST_OPENCODE_MODELS_FILE = verboseFile;
  });

  afterEach(async () => {
    clearServerModelCatalogCache();
    delete process.env.PRESETT_TEST_MODEL_CACHE_DIR;
    delete process.env.PRESETT_TEST_CONFIG_DIR;
    delete process.env.PRESETT_TEST_GENTLE_AI_DIR;
    delete process.env.PRESETT_TEST_OPENCODE_MODELS_FILE;
    await rm(tempDir, { recursive: true, force: true });
    await rm(configDir, { recursive: true, force: true });
    await rm(gentleAiDir, { recursive: true, force: true });
  });

  it("returns the model catalog", async () => {
    await writeFile(
      join(tempDir, "model-variants.json"),
      JSON.stringify({ openai: { "gpt-4": ["low", "high"] } }),
    );
    await writeFile(verboseFile, "");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.providers).toContain("openai");
  });

  it("includes providers, models, and variants already configured outside the cache", async () => {
    await writeFile(
      join(tempDir, "model-variants.json"),
      JSON.stringify({ openai: { "gpt-5": ["high"] } }),
    );
    await writeFile(
      join(configDir, "opencode.jsonc"),
      JSON.stringify({
        agent: {
          reviewer: { model: "opencode-go/kimi-k2.7-code", variant: "medium" },
        },
      }),
    );
    await writeFile(
      join(gentleAiDir, "state.json"),
      JSON.stringify({
        model_assignments: {
          "sdd-apply": {
            provider_id: "google",
            model_id: "gemini-3.1-flash-lite",
            effort: "low",
          },
        },
      }),
    );
    await writeFile(verboseFile, "");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.providers).toEqual(expect.arrayContaining(["openai", "opencode-go", "google"]));
    expect(body.catalog["opencode-go"]["kimi-k2.7-code"]).toEqual(["medium"]);
    expect(body.catalog.google["gemini-3.1-flash-lite"]).toEqual(["low"]);
  });

  it("loads full provider models and variants from opencode verbose output", async () => {
    await writeFile(
      join(tempDir, "model-variants.json"),
      JSON.stringify({ openai: { "gpt-5.6-luna": ["medium"] } }),
    );
    await writeFile(
      verboseFile,
      [
        "openai/gpt-5.4",
        "{",
        '  "id": "gpt-5.4",',
        '  "providerID": "openai",',
        '  "variants": {',
        '    "low": {},',
        '    "medium": {},',
        '    "high": {}',
        "  }",
        "}",
        "anthropic/claude-sonnet-5",
        "{",
        '  "id": "claude-sonnet-5",',
        '  "providerID": "anthropic",',
        '  "variants": {}',
        "}",
        "opencode-zen/qwen3.8-max",
        "{",
        '  "id": "qwen3.8-max",',
        '  "providerID": "opencode-zen",',
        '  "variants": {',
        '    "high": {},',
        '    "max": {}',
        "  }",
        "}",
      ].join("\n"),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.providers).toEqual(expect.arrayContaining(["openai", "anthropic", "opencode-zen"]));
    expect(body.catalog.openai["gpt-5.4"]).toEqual(["high", "low", "medium"]);
    expect(body.catalog.anthropic["claude-sonnet-5"]).toEqual([]);
    expect(body.catalog["opencode-zen"]["qwen3.8-max"]).toEqual(["high", "max"]);
  });

  it("returns 503 when the catalog is missing", async () => {
    const response = await GET();
    expect(response.status).toBe(503);
  });
});
