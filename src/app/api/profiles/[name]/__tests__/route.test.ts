import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, writeFile, rm, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GET, OPTIONS, PUT, DELETE as DELETE_HANDLER } from "../route";
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
  const actual =
    await importOriginal<typeof import("@/adapters/opencode")>();
  return {
    ...actual,
    deleteProfile: vi.fn(actual.deleteProfile),
    updateProfile: vi.fn(actual.updateProfile),
    readOpenCodeConfigSafe: vi.fn(actual.readOpenCodeConfigSafe),
  };
});

vi.mock("@/services/processService", () => ({
  runGentleAiSync: vi.fn(),
}));

import { runGentleAiSync } from "@/services/processService";
import { readOpenCodeConfigSafe, updateProfile } from "@/adapters/opencode";

const mockedLoadMerged = vi.mocked(loadMergedModelCatalogSafe);
const mockedRunSync = vi.mocked(runGentleAiSync);
const mockedReadConfig = vi.mocked(readOpenCodeConfigSafe);
const mockedUpdateProfile = vi.mocked(updateProfile);

// Generated-multi fixtures include the base orchestrator so the write
// guardrail (403 for `unknown`/`external-single-active`) lets the request pass.
const GENERATED_MULTI_EXTRA_AGENTS = {
  "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" },
};

function updateProfileRequest(origin?: string): Request {
  const request = new Request("http://localhost/api/profiles/custom", {
    method: "PUT",
    body: JSON.stringify({
      assignments: {
        "sdd-orchestrator-custom": { provider: "openai", model: "gpt-4", variant: "high" },
      },
    }),
  });
  if (origin) request.headers.set("Origin", origin);
  return request;
}

function deleteProfileRequest(origin?: string): Request {
  const request = new Request("http://localhost/api/profiles/custom", {
    method: "DELETE",
  });
  if (origin) request.headers.set("Origin", origin);
  return request;
}

function detailRequest(): Request {
  return new Request("http://localhost/api/profiles/custom", { method: "GET" });
}

describe("/api/profiles/[name]", () => {
  let tempDir = "";
  let cacheDir = "";
  let verboseFile = "";

  beforeEach(async () => {
    clearServerModelCatalogCache();
    mockedRunSync.mockReset();
    mockedReadConfig.mockClear();
    mockedUpdateProfile.mockClear();
    mockedLoadMerged.mockReset();
    mockedRunSync.mockResolvedValue({
      ok: true,
      value: { exitCode: 0, stdout: "updated", stderr: "" },
    });
    mockedLoadMerged.mockResolvedValue({
      ok: true,
      value: {
        openai: { "gpt-4": ["low", "high"] },
        opencode: { "qwen3-max": ["high", "max"] },
      },
    });
    tempDir = await mkdtemp(join(tmpdir(), "presett-profile-name-"));
    cacheDir = await mkdtemp(join(tmpdir(), "presett-profile-name-cache-"));
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

  it("answers 410 FEATURE_RETIRED on PUT without reading config, loading the catalog, spawning gentle-ai or writing backups", async () => {
    const configPath = join(tempDir, "opencode.json");
    await writeFile(
      configPath,
      JSON.stringify({
        agent: {
          ...GENERATED_MULTI_EXTRA_AGENTS,
          "sdd-orchestrator-custom": { model: "x/y", variant: "low" },
        },
      }),
    );
    const before = await readFile(configPath, "utf-8");

    const response = await PUT(updateProfileRequest("http://127.0.0.1:3000"), {
      params: Promise.resolve({ name: "custom" }),
    });
    const body = JSON.parse(await response.text());

    expect(response.status).toBe(410);
    expect(body.error.code).toBe("FEATURE_RETIRED");
    expect(typeof body.error.message).toBe("string");
    expect(mockedRunSync).not.toHaveBeenCalled();
    expect(mockedReadConfig).not.toHaveBeenCalled();
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
    expect(mockedLoadMerged).not.toHaveBeenCalled();
    expect(await readFile(configPath, "utf-8")).toBe(before);
    await expect(readdir(join(tempDir, "backups"))).rejects.toThrow();
  });

  it("answers 410 on PUT regardless of config presence or strategy", async () => {
    // No opencode.json: the retired answer must not depend on any read.
    const missing = await PUT(updateProfileRequest("http://127.0.0.1:3000"), {
      params: Promise.resolve({ name: "custom" }),
    });
    expect(missing.status).toBe(410);

    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: { "external-work": { mode: "primary", model: "openai/gpt-4" } },
      }),
    );
    const readOnlyStrategy = await PUT(updateProfileRequest("http://localhost:3000"), {
      params: Promise.resolve({ name: "custom" }),
    });
    expect(readOnlyStrategy.status).toBe(410);

    expect(mockedReadConfig).not.toHaveBeenCalled();
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("deletes a profile on DELETE", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: {
          ...GENERATED_MULTI_EXTRA_AGENTS,
          "sdd-orchestrator-custom": { model: "x/y" },
        },
      }),
    );

    const response = await DELETE_HANDLER(deleteProfileRequest("http://localhost:3000"), {
      params: Promise.resolve({ name: "custom" }),
    });
    expect(response.status).toBe(200);

    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));
    expect(written.agent["sdd-orchestrator-custom"]).toBeUndefined();
  });

  it("rejects DELETE for the reserved name 'base' with 400 before invoking the adapter", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: { "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" } },
      }),
    );
    const { deleteProfile } = await import("@/adapters/opencode");
    const deleteSpy = vi.mocked(deleteProfile);
    deleteSpy.mockClear();

    const response = await DELETE_HANDLER(
      deleteProfileRequest("http://localhost:3000"),
      { params: Promise.resolve({ name: "base" }) },
    );

    expect(response.status).toBe(400);
    const body = JSON.parse(await response.text());
    expect(body.error.code).toBe("SCHEMA_INVALID");
    // The route guard must reject before the adapter is reached.
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("rejects DELETE with 403 STRATEGY_READONLY on unknown strategy without deleting the profile", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: { "review-risk": { mode: "subagent", model: "x/y" } },
      }),
    );

    const response = await DELETE_HANDLER(deleteProfileRequest("http://localhost:3000"), {
      params: Promise.resolve({ name: "custom" }),
    });
    const body = JSON.parse(await response.text());

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("STRATEGY_READONLY");

    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));
    expect(written.agent["review-risk"]).toEqual({ mode: "subagent", model: "x/y" });
  });

  it("rejects missing Origin with 403 on PUT before the retired answer", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: { "sdd-orchestrator-custom": { model: "x/y", variant: "low" } },
      }),
    );
    const request = new Request("http://localhost/api/profiles/custom", {
      method: "PUT",
      body: "not-json",
    });

    const response = await PUT(request, { params: Promise.resolve({ name: "custom" }) });
    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));

    expect(response.status).toBe(403);
    expect(written.agent["sdd-orchestrator-custom"].variant).toBe("low");
    expect(mockedReadConfig).not.toHaveBeenCalled();
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("rejects non-loopback Origin before deleting a profile", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: { "sdd-orchestrator-custom": { model: "x/y" } },
      }),
    );

    const response = await DELETE_HANDLER(deleteProfileRequest("http://evil.test"), {
      params: Promise.resolve({ name: "custom" }),
    });
    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));

    expect(response.status).toBe(403);
    expect(written.agent["sdd-orchestrator-custom"]).toEqual({ model: "x/y" });
  });

  it("allows OPTIONS preflight without origin enforcement", async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("DELETE, GET, OPTIONS, PUT");
  });

  it("returns only the orchestrator assignment on GET", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: {
          "sdd-orchestrator-custom": { model: "openai/gpt-4", variant: "high" },
          "sdd-init-custom": { model: "anthropic/claude-4", variant: "standard" },
        },
      }),
    );

    const response = await GET(detailRequest(), {
      params: Promise.resolve({ name: "custom" }),
    });
    expect(response.status).toBe(200);

    const body = JSON.parse(await response.text());
    expect(body.name).toBe("custom");
    expect(body.assignments["sdd-orchestrator-custom"]).toEqual({
      provider: "openai",
      model: "gpt-4",
      variant: "high",
    });
    // Legacy phase assignments never surface in the detail contract.
    expect(body.assignments["sdd-init-custom"]).toBeUndefined();
  });

  it("returns 404 for a nonexistent profile on GET", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({ agent: {} }),
    );

    const response = await GET(detailRequest(), {
      params: Promise.resolve({ name: "ghost" }),
    });
    expect(response.status).toBe(404);
  });

  it("rejects an invalid profile name with 400 before reading the filesystem", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({ agent: {} }),
    );

    const response = await GET(detailRequest(), {
      params: Promise.resolve({ name: "../../etc/passwd" }),
    });
    expect(response.status).toBe(400);

    const body = JSON.parse(await response.text());
    expect(body.error.code).toBe("SCHEMA_INVALID");
  });

  it("exposes the detected strategy on GET detail for read-only enforcement", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: {
          "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" },
          "sdd-orchestrator-custom": { model: "openai/gpt-4", variant: "high" },
        },
      }),
    );

    const response = await GET(detailRequest(), {
      params: Promise.resolve({ name: "custom" }),
    });
    const body = JSON.parse(await response.text());

    expect(response.status).toBe(200);
    expect(body.strategy).toBe("generated-multi");
  });

  it("keeps GET detail readable (not 403) on external-single-active", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: { "external-work": { mode: "primary", model: "openai/gpt-4" } },
      }),
    );

    const response = await GET(detailRequest(), {
      params: Promise.resolve({ name: "custom" }),
    });
    const body = JSON.parse(await response.text());

    // Read-only enforcement: reads remain permitted in external mode — the
    // guardrail only blocks writes. A generated profile simply does not exist
    // here, so the detail resolves to NOT_FOUND (not a 403 STRATEGY_READONLY).
    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
