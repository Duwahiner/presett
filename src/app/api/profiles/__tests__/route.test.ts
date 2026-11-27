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

vi.mock("@/adapters/opencode", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/adapters/opencode")>();
  return {
    ...actual,
    readOpenCodeConfigSafe: vi.fn(actual.readOpenCodeConfigSafe),
    createProfile: vi.fn(actual.createProfile),
  };
});

vi.mock("@/services/processService", () => ({
  runGentleAiSync: vi.fn(),
}));

import { runGentleAiSync } from "@/services/processService";
import { createProfile, readOpenCodeConfigSafe } from "@/adapters/opencode";

const mockedLoadMerged = vi.mocked(loadMergedModelCatalogSafe);
const mockedRunSync = vi.mocked(runGentleAiSync);
const mockedReadConfig = vi.mocked(readOpenCodeConfigSafe);
const mockedCreateProfile = vi.mocked(createProfile);

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
    mockedReadConfig.mockClear();
    mockedCreateProfile.mockClear();
    mockedLoadMerged.mockReset();
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

  it("answers 410 FEATURE_RETIRED on POST without reading config, loading the catalog, spawning gentle-ai or writing backups", async () => {
    await writeGeneratedMultiConfig(tempDir);
    const configPath = join(tempDir, "opencode.json");
    const before = await readFile(configPath, "utf-8");

    const response = await POST(createProfileRequest("http://localhost:3000"));
    const body = JSON.parse(await response.text());

    expect(response.status).toBe(410);
    expect(body.error.code).toBe("FEATURE_RETIRED");
    expect(typeof body.error.message).toBe("string");
    expect(mockedRunSync).not.toHaveBeenCalled();
    expect(mockedReadConfig).not.toHaveBeenCalled();
    expect(mockedCreateProfile).not.toHaveBeenCalled();
    expect(mockedLoadMerged).not.toHaveBeenCalled();
    expect(await readFile(configPath, "utf-8")).toBe(before);
    await expect(readdir(join(tempDir, "backups"))).rejects.toThrow();
  });

  it("answers 410 on POST even when the config is missing or the strategy is read-only", async () => {
    // No opencode.json at all: the retired answer must not depend on any read.
    const missing = await POST(createProfileRequest("http://localhost:3000"));
    expect(missing.status).toBe(410);

    await writeFile(join(tempDir, "opencode.json"), JSON.stringify({ agent: {} }));
    const unknownStrategy = await POST(createProfileRequest("http://localhost:3000"));
    expect(unknownStrategy.status).toBe(410);

    expect(mockedReadConfig).not.toHaveBeenCalled();
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("rejects missing Origin with 403 before the retired answer", async () => {
    const request = new Request("http://localhost/api/profiles", {
      method: "POST",
      body: "not-json",
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(mockedRunSync).not.toHaveBeenCalled();
    expect(mockedReadConfig).not.toHaveBeenCalled();
  });

  it("rejects non-loopback Origin with 403 before the retired answer", async () => {
    const response = await POST(createProfileRequest("http://evil.test"));

    expect(response.status).toBe(403);
    expect(mockedRunSync).not.toHaveBeenCalled();
    expect(mockedReadConfig).not.toHaveBeenCalled();
  });

  it("allows OPTIONS preflight without origin enforcement", async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, OPTIONS, POST");
  });
});
