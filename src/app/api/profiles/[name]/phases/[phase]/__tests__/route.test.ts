import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
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

vi.mock("@/services/processService", () => ({
  runGentleAiSync: vi.fn(),
}));

import { runGentleAiSync } from "@/services/processService";

const mockedLoadMerged = vi.mocked(loadMergedModelCatalogSafe);
const mockedRunSync = vi.mocked(runGentleAiSync);

// generated-multi fixture so the read-only guardrail lets the request through.
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
  let verboseFile = "";

  beforeEach(async () => {
    clearServerModelCatalogCache();
    mockedRunSync.mockReset();
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
    verboseFile = join(cacheDir, "opencode-models-verbose.txt");
    process.env.PRESETT_TEST_CONFIG_DIR = tempDir;
    process.env.PRESETT_TEST_MODEL_CACHE_DIR = cacheDir;
    process.env.PRESETT_TEST_BACKUP_DIR = join(tempDir, "backups");
    process.env.PRESETT_TEST_OPENCODE_MODELS_FILE = verboseFile;
    await writeFile(
      join(cacheDir, "model-variants.json"),
      JSON.stringify({ anthropic: { "claude-sonnet-4": ["standard", "high"] } }),
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

  it("delegates a phase assignment to runGentleAiSync and never writes opencode.json", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: {
          ...GENERATED_MULTI_EXTRA_AGENTS,
          "sdd-orchestrator-cheap": { model: "openai/gpt-4", variant: "low" },
        },
      }),
    );

    const response = await PUT(phasePutRequest("http://127.0.0.1:3000"), {
      params: Promise.resolve({ name: "cheap", phase: "apply" }),
    });

    expect(response.status).toBe(200);
    expect(mockedRunSync).toHaveBeenCalledWith("gentle-ai", [
      "--profile-phase",
      "cheap:apply:anthropic/claude-sonnet-4",
    ]);
    // The adapter must not touch opencode.json — gentle-ai owns the phase agent.
    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));
    expect(written.agent["sdd-apply-cheap"]).toBeUndefined();
    expect(written.agent["sdd-orchestrator-cheap"]).toBeDefined();
  });

  it("returns 403 STRATEGY_READONLY on external-single-active without delegating", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: { "external-work": { mode: "primary", model: "openai/gpt-4" } },
      }),
    );

    const response = await PUT(phasePutRequest("http://127.0.0.1:3000"), {
      params: Promise.resolve({ name: "cheap", phase: "apply" }),
    });
    const body = JSON.parse(await response.text());

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("STRATEGY_READONLY");
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("returns 403 STRATEGY_READONLY on unknown strategy without delegating", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({ agent: { "review-risk": { mode: "subagent", model: "x/y" } } }),
    );

    const response = await PUT(phasePutRequest("http://127.0.0.1:3000"), {
      params: Promise.resolve({ name: "cheap", phase: "apply" }),
    });
    const body = JSON.parse(await response.text());

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("STRATEGY_READONLY");
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("rejects missing Origin before parsing JSON or delegating", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: {
          ...GENERATED_MULTI_EXTRA_AGENTS,
          "sdd-orchestrator-cheap": { model: "openai/gpt-4" },
        },
      }),
    );
    const request = new Request(
      "http://localhost/api/profiles/cheap/phases/apply",
      { method: "PUT", body: "not-json" },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ name: "cheap", phase: "apply" }),
    });

    expect(response.status).toBe(403);
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid phase path segment before delegating", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: {
          ...GENERATED_MULTI_EXTRA_AGENTS,
          "sdd-orchestrator-cheap": { model: "openai/gpt-4" },
        },
      }),
    );

    const response = await PUT(phasePutRequest("http://127.0.0.1:3000"), {
      params: Promise.resolve({ name: "cheap", phase: "../../evil" }),
    });
    const body = JSON.parse(await response.text());

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("SCHEMA_INVALID");
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("surfaces a CLI failure as HTTP 500", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: {
          ...GENERATED_MULTI_EXTRA_AGENTS,
          "sdd-orchestrator-cheap": { model: "openai/gpt-4" },
        },
      }),
    );
    mockedRunSync.mockResolvedValue({
      ok: true,
      value: { exitCode: 1, stdout: "", stderr: "phase rejected" },
    });

    const response = await PUT(phasePutRequest("http://127.0.0.1:3000"), {
      params: Promise.resolve({ name: "cheap", phase: "apply" }),
    });

    expect(response.status).toBe(500);
  });

  it("allows OPTIONS preflight without origin enforcement", async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "DELETE, GET, OPTIONS, PUT",
    );
  });
});