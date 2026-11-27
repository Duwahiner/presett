import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, writeFile, rm, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OPTIONS, PUT } from "../route";
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
    updateProfilePhase: vi.fn(actual.updateProfilePhase),
  };
});

vi.mock("@/services/processService", () => ({
  runGentleAiSync: vi.fn(),
}));

import { runGentleAiSync } from "@/services/processService";
import { readOpenCodeConfigSafe, updateProfilePhase } from "@/adapters/opencode";

const mockedLoadMerged = vi.mocked(loadMergedModelCatalogSafe);
const mockedRunSync = vi.mocked(runGentleAiSync);
const mockedReadConfig = vi.mocked(readOpenCodeConfigSafe);
const mockedUpdatePhase = vi.mocked(updateProfilePhase);

const GENERATED_MULTI_EXTRA_AGENTS = {
  "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" },
};

function phasePutRequest(
  origin: string,
  body: unknown = {
    provider: "anthropic",
    model: "claude-sonnet-4",
    variant: "high",
  },
): Request {
  const request = new Request(
    "http://localhost/api/profiles/cheap/phases/apply",
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
  request.headers.set("Origin", origin);
  return request;
}

describe("/api/profiles/[name]/phases/[phase]", () => {
  let tempDir = "";
  let cacheDir = "";

  beforeEach(async () => {
    clearServerModelCatalogCache();
    mockedRunSync.mockReset();
    mockedReadConfig.mockClear();
    mockedUpdatePhase.mockClear();
    mockedLoadMerged.mockReset();
    mockedRunSync.mockResolvedValue({
      ok: true,
      value: { exitCode: 0, stdout: "synced", stderr: "" },
    });
    mockedLoadMerged.mockResolvedValue({
      ok: true,
      value: {
        anthropic: { "claude-sonnet-4": ["standard", "high"] },
        openai: { "gpt-4": ["low", "high"] },
      },
    });
    tempDir = await mkdtemp(join(tmpdir(), "presett-phase-route-"));
    cacheDir = await mkdtemp(join(tmpdir(), "presett-phase-route-cache-"));
    process.env.PRESETT_TEST_CONFIG_DIR = tempDir;
    process.env.PRESETT_TEST_MODEL_CACHE_DIR = cacheDir;
    process.env.PRESETT_TEST_BACKUP_DIR = join(tempDir, "backups");
  });

  afterEach(async () => {
    clearServerModelCatalogCache();
    delete process.env.PRESETT_TEST_CONFIG_DIR;
    delete process.env.PRESETT_TEST_MODEL_CACHE_DIR;
    delete process.env.PRESETT_TEST_BACKUP_DIR;
    await rm(tempDir, { recursive: true, force: true });
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("answers 410 FEATURE_RETIRED without reading config, loading the catalog, spawning gentle-ai or writing backups", async () => {
    const configPath = join(tempDir, "opencode.json");
    await writeFile(
      configPath,
      JSON.stringify({
        agent: {
          ...GENERATED_MULTI_EXTRA_AGENTS,
          "sdd-orchestrator-cheap": { model: "openai/gpt-4", variant: "low" },
        },
      }),
    );
    const before = await readFile(configPath, "utf-8");

    const response = await PUT(phasePutRequest("http://127.0.0.1:3000"), {
      params: Promise.resolve({ name: "cheap", phase: "apply" }),
    });
    const body = JSON.parse(await response.text());

    expect(response.status).toBe(410);
    expect(body.error.code).toBe("FEATURE_RETIRED");
    expect(typeof body.error.message).toBe("string");
    expect(mockedRunSync).not.toHaveBeenCalled();
    expect(mockedReadConfig).not.toHaveBeenCalled();
    expect(mockedUpdatePhase).not.toHaveBeenCalled();
    expect(mockedLoadMerged).not.toHaveBeenCalled();
    expect(await readFile(configPath, "utf-8")).toBe(before);
    await expect(readdir(join(tempDir, "backups"))).rejects.toThrow();
  });

  it("answers 410 regardless of config presence, strategy or path segments", async () => {
    // No opencode.json at all.
    const missing = await PUT(phasePutRequest("http://127.0.0.1:3000"), {
      params: Promise.resolve({ name: "cheap", phase: "apply" }),
    });
    expect(missing.status).toBe(410);

    // Read-only strategy and an invalid phase segment: nothing is evaluated.
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({ agent: { "review-risk": { mode: "subagent", model: "x/y" } } }),
    );
    const invalidPhase = await PUT(phasePutRequest("http://127.0.0.1:3000"), {
      params: Promise.resolve({ name: "cheap", phase: "../../evil" }),
    });
    expect(invalidPhase.status).toBe(410);

    expect(mockedReadConfig).not.toHaveBeenCalled();
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("rejects missing Origin with 403 before the retired answer", async () => {
    const request = new Request(
      "http://localhost/api/profiles/cheap/phases/apply",
      { method: "PUT", body: "not-json" },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ name: "cheap", phase: "apply" }),
    });

    expect(response.status).toBe(403);
    expect(mockedRunSync).not.toHaveBeenCalled();
    expect(mockedReadConfig).not.toHaveBeenCalled();
  });

  it("rejects non-loopback Origin with 403 before the retired answer", async () => {
    const response = await PUT(phasePutRequest("http://evil.test"), {
      params: Promise.resolve({ name: "cheap", phase: "apply" }),
    });

    expect(response.status).toBe(403);
    expect(mockedRunSync).not.toHaveBeenCalled();
    expect(mockedReadConfig).not.toHaveBeenCalled();
  });

  it("allows OPTIONS preflight without origin enforcement", async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "DELETE, GET, OPTIONS, PUT",
    );
  });
});
