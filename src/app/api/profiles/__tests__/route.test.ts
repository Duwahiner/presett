import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, readFile, writeFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GET, OPTIONS, POST } from "../route";
import { SDD_PHASES } from "@/services/profileStrategyService";
import {
  clearServerModelCatalogCache,
  loadMergedModelCatalogSafe,
} from "@/services/modelCatalogService";

vi.mock("@/services/modelCatalogService", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/services/modelCatalogService")>();
  return {
    ...actual,
    loadMergedModelCatalogSafe: vi.fn(),
  };
});

vi.mock("@/services/processService", () => ({
  runGentleAiSync: vi.fn(),
}));

import { runGentleAiSync } from "@/services/processService";

const mockedLoadMerged = vi.mocked(loadMergedModelCatalogSafe);
const mockedRunSync = vi.mocked(runGentleAiSync);

// A generated-multi fixture: base orchestrator plus an existing generated
// profile. Profile writes are only allowed under this strategy (the new
// guardrail rejects `unknown`/`external-single-active` with 403).
const GENERATED_MULTI_CONFIG = {
  agent: {
    "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" },
    "sdd-orchestrator-seed": { model: "openai/gpt-4", variant: "high" },
  },
};

async function writeGeneratedMultiConfig(tempDir: string): Promise<void> {
  await writeFile(
    join(tempDir, "opencode.json"),
    JSON.stringify(GENERATED_MULTI_CONFIG),
  );
}

function createProfileRequest(origin?: string): Request {
  const request = new Request("http://localhost/api/profiles", {
    method: "POST",
    body: JSON.stringify({
      name: "custom",
      assignments: {
        "sdd-orchestrator-custom": { provider: "openai", model: "gpt-4", variant: "low" },
      },
    }),
  });
  if (origin) request.headers.set("Origin", origin);
  return request;
}

describe("/api/profiles", () => {
  let tempDir = "";
  let cacheDir = "";
  let verboseFile = "";

  beforeEach(async () => {
    clearServerModelCatalogCache();
    mockedRunSync.mockReset();
    mockedRunSync.mockResolvedValue({
      ok: true,
      value: { exitCode: 0, stdout: "created", stderr: "" },
    });
    mockedLoadMerged.mockResolvedValue({
      ok: true,
      value: {
        openai: { "gpt-4": ["low", "high"] },
        opencode: { "qwen3-max": ["high", "max"] },
      },
    });
    tempDir = await mkdtemp(join(tmpdir(), "presett-profiles-"));
    cacheDir = await mkdtemp(join(tmpdir(), "presett-profiles-cache-"));
    verboseFile = join(cacheDir, "opencode-models-verbose.txt");
    process.env.PRESETT_TEST_CONFIG_DIR = tempDir;
    process.env.PRESETT_TEST_MODEL_CACHE_DIR = cacheDir;
    process.env.PRESETT_TEST_BACKUP_DIR = join(tempDir, "backups");
    process.env.PRESETT_TEST_OPENCODE_MODELS_FILE = verboseFile;
    await writeFile(
      join(cacheDir, "model-variants.json"),
      JSON.stringify({ openai: { "gpt-4": ["low", "high"] } }),
    );
    await writeFile(verboseFile, "");
  });

  afterEach(async () => {
    clearServerModelCatalogCache();
    delete process.env.PRESETT_TEST_CONFIG_DIR;
    delete process.env.PRESETT_TEST_MODEL_CACHE_DIR;
    delete process.env.PRESETT_TEST_BACKUP_DIR;
    delete process.env.PRESETT_TEST_OPENCODE_MODELS_FILE;
    await rm(tempDir, { recursive: true, force: true });
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("lists profiles", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        default_agent: "gentle-orchestrator",
        agent: { "sdd-orchestrator-custom": { model: "openai/gpt-4", variant: "low" } },
      }),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profiles.map((p: { name: string }) => p.name)).toContain("custom");
    // updatedAt derived from config file mtime
    expect(body.profiles.every((p: { updatedAt: string }) => typeof p.updatedAt === "string")).toBe(true);
  });

  it("exposes the detected strategy at the top level of the listing", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify(GENERATED_MULTI_CONFIG),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.strategy).toBe("generated-multi");
    const seed = body.profiles.find((p: { name: string }) => p.name === "seed");
    expect(seed.strategy).toBe("generated-multi");
    expect(typeof seed.incomplete).toBe("boolean");
  });

  it("GET is read-only: preserves all ten generated-multi phase agents and never rewrites the config", async () => {
    const phaseAgents: Record<string, { model: string; variant: string }> = {};
    for (const phase of SDD_PHASES) {
      phaseAgents[`sdd-${phase}-custom`] = {
        model: "openai/gpt-4",
        variant: "standard",
      };
    }
    const original = {
      default_agent: "sdd-orchestrator-custom",
      agent: {
        "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" },
        "sdd-orchestrator-custom": { model: "openai/gpt-4", variant: "high" },
        ...phaseAgents,
      },
    };
    const configPath = join(tempDir, "opencode.json");
    await writeFile(configPath, JSON.stringify(original));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profiles.map((p: { name: string }) => p.name)).toContain("custom");

    // Every one of the ten phase agents is a valid generated-multi asset and
    // must survive the GET untouched.
    const written = JSON.parse(await readFile(configPath, "utf-8"));
    expect(written).toEqual(original);
    expect(Object.keys(written.agent).filter((k) => /^sdd-.+-custom$/.test(k))).toHaveLength(
      SDD_PHASES.length + 1,
    );
    expect(written.default_agent).toBe("sdd-orchestrator-custom");
    expect(written.agent["sdd-orchestrator-custom"]).toBeDefined();
    // No backup directory should be created by a read-only GET.
    await expect(readdir(join(tempDir, "backups"))).rejects.toThrow();
  });

  it("creates a profile on POST by delegating to gentle-ai sync --profile", async () => {
    await writeGeneratedMultiConfig(tempDir);

    const request = createProfileRequest("http://localhost:3000");

    const response = await POST(request);
    expect(response.status).toBe(200);

    expect(mockedRunSync).toHaveBeenCalledWith("gentle-ai", [
      "--profile",
      "custom:openai/gpt-4",
    ]);
    // PreSett must not write the generated orchestrator itself.
    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));
    expect(written.agent["sdd-orchestrator-custom"]).toBeUndefined();
  });

  it("accepts an OpenCode Zen model assignment on POST", async () => {
    await writeGeneratedMultiConfig(tempDir);
    mockedLoadMerged.mockResolvedValue({
      ok: true,
      value: { opencode: { "qwen3-max": ["high", "max"] } },
    });

    const request = new Request("http://localhost/api/profiles", {
      method: "POST",
      body: JSON.stringify({
        name: "zen",
        assignments: {
          "sdd-orchestrator-zen": {
            provider: "opencode",
            model: "qwen3-max",
            variant: "high",
          },
        },
      }),
    });
    request.headers.set("Origin", "http://localhost:3000");

    const response = await POST(request);
    expect(response.status).toBe(200);

    // The canonical `opencode` provider is delegated verbatim as the CLI ref.
    expect(mockedRunSync).toHaveBeenCalledWith("gentle-ai", [
      "--profile",
      "zen:opencode/qwen3-max",
    ]);
    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));
    expect(written.agent["sdd-orchestrator-zen"]).toBeUndefined();
  });

  it("preserves a real catalog error as HTTP 400 for an unknown model", async () => {
    await writeGeneratedMultiConfig(tempDir);
    mockedLoadMerged.mockResolvedValue({
      ok: true,
      value: { opencode: { "qwen3-max": ["high", "max"] } },
    });

    const request = new Request("http://localhost/api/profiles", {
      method: "POST",
      body: JSON.stringify({
        name: "custom",
        assignments: {
          "sdd-orchestrator-custom": {
            provider: "opencode",
            model: "gpt-5",
            variant: "high",
          },
        },
      }),
    });
    request.headers.set("Origin", "http://localhost:3000");

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = JSON.parse(await response.text());
    expect(body.error.code).toBe("SCHEMA_INVALID");
  });

  it("preserves an unavailable catalog as HTTP 503", async () => {
    await writeGeneratedMultiConfig(tempDir);
    mockedLoadMerged.mockResolvedValue({
      ok: false,
      error: { code: "FILE_MISSING", message: "Model catalog unavailable" },
    });

    const request = new Request("http://localhost/api/profiles", {
      method: "POST",
      body: JSON.stringify({
        name: "custom",
        assignments: {
          "sdd-orchestrator-custom": {
            provider: "opencode",
            model: "qwen3-max",
            variant: "high",
          },
        },
      }),
    });
    request.headers.set("Origin", "http://localhost:3000");

    const response = await POST(request);
    expect(response.status).toBe(503);
  });

  it("creates the first profile on a fresh base-only install (generated-multi)", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: { "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" } },
      }),
    );

    const response = await POST(createProfileRequest("http://localhost:3000"));
    expect(response.status).toBe(200);

    expect(mockedRunSync).toHaveBeenCalledWith("gentle-ai", [
      "--profile",
      "custom:openai/gpt-4",
    ]);
    // PreSett never writes the generated orchestrator; gentle-ai owns it.
    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));
    expect(written.agent["sdd-orchestrator-custom"]).toBeUndefined();
    expect(written.agent["gentle-orchestrator"]).toBeDefined();
  });

  it("rejects a profile name starting with the internal prefix with HTTP 400 and never delegates", async () => {
    await writeGeneratedMultiConfig(tempDir);

    const request = new Request("http://localhost/api/profiles", {
      method: "POST",
      body: JSON.stringify({
        name: "sdd-orchestrator-free",
        assignments: {
          "sdd-orchestrator-sdd-orchestrator-free": {
            provider: "openai",
            model: "gpt-4",
            variant: "low",
          },
        },
      }),
    });
    request.headers.set("Origin", "http://localhost:3000");

    const response = await POST(request);
    const body = JSON.parse(await response.text());

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("SCHEMA_INVALID");
    expect(mockedRunSync).not.toHaveBeenCalled();

    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));
    expect(written.agent["sdd-orchestrator-sdd-orchestrator-free"]).toBeUndefined();
  });

  it("rejects profile creation with 403 STRATEGY_READONLY on external-single-active without touching disk", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: { "external-work": { mode: "primary", model: "openai/gpt-4" } },
      }),
    );

    const response = await POST(createProfileRequest("http://localhost:3000"));
    const body = JSON.parse(await response.text());

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("STRATEGY_READONLY");

    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));
    expect(written.agent["external-work"]).toBeDefined();
    expect(written.agent["sdd-orchestrator-custom"]).toBeUndefined();
  });

  it("rejects profile creation with 403 STRATEGY_READONLY on unknown strategy", async () => {
    await writeFile(join(tempDir, "opencode.json"), JSON.stringify({ agent: {} }));

    const response = await POST(createProfileRequest("http://localhost:3000"));
    const body = JSON.parse(await response.text());

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("STRATEGY_READONLY");
  });

  it("rejects missing Origin before parsing JSON or creating a profile", async () => {
    await writeFile(join(tempDir, "opencode.json"), JSON.stringify({ agent: {} }));
    const request = new Request("http://localhost/api/profiles", {
      method: "POST",
      body: "not-json",
    });

    const response = await POST(request);
    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));

    expect(response.status).toBe(403);
    expect(written.agent).toEqual({});
  });

  it("rejects non-loopback Origin before creating a profile", async () => {
    await writeFile(join(tempDir, "opencode.json"), JSON.stringify({ agent: {} }));

    const response = await POST(createProfileRequest("http://evil.test"));
    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));

    expect(response.status).toBe(403);
    expect(written.agent).toEqual({});
  });

  it("allows OPTIONS preflight without origin enforcement", async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, OPTIONS, POST");
  });
});
