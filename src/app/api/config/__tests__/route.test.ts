import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, mkdir, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GET, OPTIONS, PUT } from "../route";

function updateConfigRequest(origin?: string): Request {
  const request = new Request("http://localhost/api/config", {
    method: "PUT",
    body: JSON.stringify({
      agentKey: "sdd-init",
      provider: "openai",
      model: "gpt-4",
      variant: "high",
    }),
  });
  if (origin) request.headers.set("Origin", origin);
  return request;
}

describe("GET /api/config", () => {
  let tempDir = "";
  let cacheDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-config-"));
    cacheDir = await mkdtemp(join(tmpdir(), "presett-config-cache-"));
    process.env.PRESETT_TEST_CONFIG_DIR = tempDir;
    process.env.PRESETT_TEST_MODEL_CACHE_DIR = cacheDir;
    process.env.PRESETT_TEST_BACKUP_DIR = join(tempDir, "backups");
  });

  afterEach(async () => {
    delete process.env.PRESETT_TEST_CONFIG_DIR;
    delete process.env.PRESETT_TEST_MODEL_CACHE_DIR;
    delete process.env.PRESETT_TEST_BACKUP_DIR;
    await rm(tempDir, { recursive: true, force: true });
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("returns current model assignments", async () => {
    await mkdir(tempDir, { recursive: true });
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: {
          "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" },
        },
      }),
    );
    await writeFile(
      join(cacheDir, "model-variants.json"),
      JSON.stringify({ openai: { "gpt-4": ["low", "high"] } }),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.assignments).toHaveLength(1);
    expect(body.assignments[0].agentKey).toBe("gentle-orchestrator");
  });

  it("updates a model assignment on PUT", async () => {
    await mkdir(tempDir, { recursive: true });
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: {
          "sdd-init": { model: "x/y", variant: "low" },
        },
      }),
    );
    await writeFile(
      join(cacheDir, "model-variants.json"),
      JSON.stringify({ openai: { "gpt-4": ["low", "high"] } }),
    );

    const request = updateConfigRequest("http://localhost:3000");

    const response = await PUT(request);
    expect(response.status).toBe(200);

    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));
    expect(written.agent["sdd-init"]).toMatchObject({
      model: "openai/gpt-4",
      variant: "high",
    });
  });

  it("rejects missing Origin before parsing JSON or updating config", async () => {
    await mkdir(tempDir, { recursive: true });
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({ agent: { "sdd-init": { model: "x/y", variant: "low" } } }),
    );
    const request = new Request("http://localhost/api/config", {
      method: "PUT",
      body: "not-json",
    });

    const response = await PUT(request);
    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));

    expect(response.status).toBe(403);
    expect(written.agent["sdd-init"].variant).toBe("low");
  });

  it("rejects non-loopback Origin before updating config", async () => {
    await mkdir(tempDir, { recursive: true });
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({ agent: { "sdd-init": { model: "x/y", variant: "low" } } }),
    );
    await writeFile(
      join(cacheDir, "model-variants.json"),
      JSON.stringify({ openai: { "gpt-4": ["low", "high"] } }),
    );

    const response = await PUT(updateConfigRequest("http://evil.test"));
    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));

    expect(response.status).toBe(403);
    expect(written.agent["sdd-init"].variant).toBe("low");
  });

  it("allows OPTIONS preflight without origin enforcement", async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, OPTIONS, PUT");
  });
});
