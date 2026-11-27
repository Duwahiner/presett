import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GET, OPTIONS, PUT } from "../route";
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

const mockedLoadMerged = vi.mocked(loadMergedModelCatalogSafe);

function updateProfileRequest(origin?: string): Request {
  const request = new Request("http://localhost/api/profiles/base", {
    method: "PUT",
    body: JSON.stringify({
      assignments: {
        "gentle-orchestrator": { provider: "openai", model: "gpt-4", variant: "high" },
      },
    }),
  });
  if (origin) request.headers.set("Origin", origin);
  return request;
}

describe("/api/profiles/base", () => {
  let tempDir = "";
  let cacheDir = "";
  let verboseFile = "";

  beforeEach(async () => {
    clearServerModelCatalogCache();
    mockedLoadMerged.mockResolvedValue({
      ok: true,
      value: {
        openai: { "gpt-4": ["low", "high"] },
        opencode: { "qwen3-max": ["high", "max"] },
      },
    });
    tempDir = await mkdtemp(join(tmpdir(), "presett-profile-base-"));
    cacheDir = await mkdtemp(join(tmpdir(), "presett-profile-base-cache-"));
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

  it("returns the base detail with the orchestrator assignment on GET", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        default_agent: "gentle-orchestrator",
        agent: {
          "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" },
          "sdd-orchestrator-custom": { model: "openai/gpt-4", variant: "high" },
        },
      }),
    );

    const response = await GET();
    expect(response.status).toBe(200);

    const body = JSON.parse(await response.text());
    expect(body.name).toBe("");
    expect(body.assignments["gentle-orchestrator"]).toEqual({
      provider: "openai",
      model: "gpt-4",
      variant: "low",
    });
  });

  it("is distinct from the profile list and excludes named-profile agents", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: {
          "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" },
          "sdd-orchestrator-custom": { model: "openai/gpt-4", variant: "high" },
          "sdd-init-custom": { model: "openai/gpt-4", variant: "low" },
        },
      }),
    );

    const response = await GET();
    const body = JSON.parse(await response.text());

    // Base detail is an object with name + assignments, never the list shape.
    expect(body.profiles).toBeUndefined();
    expect(body.name).toBe("");
    expect(body.assignments["sdd-orchestrator-custom"]).toBeUndefined();
    expect(body.assignments["sdd-init-custom"]).toBeUndefined();
    expect(body.assignments["gentle-orchestrator"]).toEqual({
      provider: "openai",
      model: "gpt-4",
      variant: "low",
    });
  });

  it("returns 404 when the config file is missing", async () => {
    const response = await GET();
    expect(response.status).toBe(404);
  });

  it("allows GET preflight via OPTIONS", async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("GET");
  });

  it("persists the base assignment on PUT", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: { "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" } },
      }),
    );

    const response = await PUT(updateProfileRequest("http://127.0.0.1:3000"));
    expect(response.status).toBe(200);

    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));
    expect(written.agent["gentle-orchestrator"].variant).toBe("high");
  });

  it("accepts an OpenCode Zen model assignment on PUT", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: { "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" } },
      }),
    );
    mockedLoadMerged.mockResolvedValue({
      ok: true,
      value: { opencode: { "qwen3-max": ["high", "max"] } },
    });

    const request = new Request("http://localhost/api/profiles/base", {
      method: "PUT",
      body: JSON.stringify({
        assignments: {
          "gentle-orchestrator": {
            provider: "opencode",
            model: "qwen3-max",
            variant: "high",
          },
        },
      }),
    });
    request.headers.set("Origin", "http://127.0.0.1:3000");

    const response = await PUT(request);
    expect(response.status).toBe(200);

    // The canonical `opencode` provider is persisted verbatim as the CLI ref.
    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));
    expect(written.agent["gentle-orchestrator"].model).toBe("opencode/qwen3-max");
  });

  it("preserves a real catalog error as HTTP 400 for an unknown model on PUT", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: { "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" } },
      }),
    );
    mockedLoadMerged.mockResolvedValue({
      ok: true,
      value: { opencode: { "qwen3-max": ["high", "max"] } },
    });

    const request = new Request("http://localhost/api/profiles/base", {
      method: "PUT",
      body: JSON.stringify({
        assignments: {
          "gentle-orchestrator": {
            provider: "opencode",
            model: "gpt-5",
            variant: "high",
          },
        },
      }),
    });
    request.headers.set("Origin", "http://127.0.0.1:3000");

    const response = await PUT(request);
    expect(response.status).toBe(400);
    const body = JSON.parse(await response.text());
    expect(body.error.code).toBe("SCHEMA_INVALID");
  });

  it("preserves an unavailable catalog as HTTP 503 on PUT", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: { "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" } },
      }),
    );
    mockedLoadMerged.mockResolvedValue({
      ok: false,
      error: { code: "FILE_MISSING", message: "Model catalog unavailable" },
    });

    const request = new Request("http://localhost/api/profiles/base", {
      method: "PUT",
      body: JSON.stringify({
        assignments: {
          "gentle-orchestrator": {
            provider: "opencode",
            model: "qwen3-max",
            variant: "high",
          },
        },
      }),
    });
    request.headers.set("Origin", "http://127.0.0.1:3000");

    const response = await PUT(request);
    expect(response.status).toBe(503);
  });

  it("rejects a named-profile agent key on PUT and leaves the named profile untouched", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: {
          "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" },
          "sdd-orchestrator-custom": { model: "openai/gpt-4", variant: "low" },
        },
      }),
    );
    const request = new Request("http://localhost/api/profiles/base", {
      method: "PUT",
      body: JSON.stringify({
        assignments: {
          "sdd-orchestrator-custom": {
            provider: "openai",
            model: "gpt-4",
            variant: "high",
          },
        },
      }),
    });
    request.headers.set("Origin", "http://localhost:3000");

    const response = await PUT(request);
    expect(response.status).toBe(400);
    const body = JSON.parse(await response.text());
    expect(body.error.code).toBe("SCHEMA_INVALID");

    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));
    expect(written.agent["sdd-orchestrator-custom"].variant).toBe("low");
  });

  it("rejects missing Origin before editing the base profile on PUT", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: { "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" } },
      }),
    );
    const request = new Request("http://localhost/api/profiles/base", {
      method: "PUT",
      body: "not-json",
    });

    const response = await PUT(request);
    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));

    expect(response.status).toBe(403);
    expect(written.agent["gentle-orchestrator"].variant).toBe("low");
  });
});