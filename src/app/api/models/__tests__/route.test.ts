import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ok, err } from "@/lib/types";
import type { ConnectedProvider } from "@/services/providerAuthService";

// Hoisted by Vitest before any import of the route. Only `getConnectedProvidersSafe`
// is replaced by a deterministic double; `normalizeProviderName` and
// `parseConnectedProviders` stay real so route.ts keeps working and parser
// coverage remains in providerAuthService.test.ts.
vi.mock("@/services/providerAuthService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/providerAuthService")>();
  return {
    ...actual,
    getConnectedProvidersSafe: vi.fn(),
  };
});

import { GET } from "../route";
import { clearServerModelCatalogCache } from "@/services/modelCatalogService";
import { getConnectedProvidersSafe } from "@/services/providerAuthService";

const mockedGetConnectedProviders = vi.mocked(getConnectedProvidersSafe);

// Deterministic fixture matching the ConnectedProvider contract.
const MOCK_PROVIDERS: ConnectedProvider[] = [{ name: "OpenAI", authType: "oauth" }];

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
    vi.stubEnv("PRESETT_TEST_MODEL_CACHE_DIR", tempDir);
    vi.stubEnv("PRESETT_TEST_CONFIG_DIR", configDir);
    vi.stubEnv("PRESETT_TEST_GENTLE_AI_DIR", gentleAiDir);
    vi.stubEnv("PRESETT_TEST_OPENCODE_MODELS_FILE", verboseFile);
    // Default double: no connected providers. Overridden per case via vi.mocked(...).
    mockedGetConnectedProviders.mockResolvedValue(ok([]));
  });

  afterEach(async () => {
    clearServerModelCatalogCache();
    vi.resetAllMocks();
    vi.unstubAllEnvs();
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

  it("maps connected providers from the mocked provider list without invoking the CLI", async () => {
    mockedGetConnectedProviders.mockResolvedValue(ok(MOCK_PROVIDERS));
    await writeFile(
      join(tempDir, "model-variants.json"),
      JSON.stringify({ openai: { "gpt-4": ["low"] } }),
    );
    await writeFile(verboseFile, "");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.providers).toContain("openai");
    // "OpenAI" display name normalizes to the catalog id "openai".
    expect(body.connectedProviders).toContain("openai");
    // The double was used; no real `opencode providers list` was executed.
    expect(mockedGetConnectedProviders).toHaveBeenCalled();
  });

  it("returns the catalog when the connected providers lookup fails", async () => {
    mockedGetConnectedProviders.mockResolvedValue(
      err({ code: "FILE_MISSING", message: "Proveedor no disponible (test)" }),
    );
    await writeFile(
      join(tempDir, "model-variants.json"),
      JSON.stringify({ openai: { "gpt-4": ["low"] } }),
    );
    await writeFile(verboseFile, "");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.providers).toContain("openai");
    // Provider failure must not block the catalog; no connected providers are listed.
    expect(body.connectedProviders).toEqual([]);
    expect(mockedGetConnectedProviders).toHaveBeenCalled();
  });

  it("returns 503 when the catalog is missing", async () => {
    const response = await GET();
    expect(response.status).toBe(503);
  });
});