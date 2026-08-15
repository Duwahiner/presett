import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, mkdir, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GET, OPTIONS, PATCH, PUT } from "../route";

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

function patchRequest(body: unknown): Request {
  const request = new Request("http://localhost/api/config", {
    method: "PATCH", body: JSON.stringify(body),
  });
  request.headers.set("Origin", "http://localhost:3000");
  return request;
}

describe("GET /api/config", () => {
  let tempDir = "";
  let cacheDir = "";
  let gentleAiDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-config-"));
    cacheDir = await mkdtemp(join(tmpdir(), "presett-config-cache-"));
    gentleAiDir = await mkdtemp(join(tmpdir(), "presett-gentle-ai-"));
    process.env.PRESETT_TEST_CONFIG_DIR = tempDir;
    process.env.PRESETT_TEST_MODEL_CACHE_DIR = cacheDir;
    process.env.PRESETT_TEST_BACKUP_DIR = join(tempDir, "backups");
    process.env.PRESETT_TEST_GENTLE_AI_DIR = gentleAiDir;
  });

  afterEach(async () => {
    delete process.env.PRESETT_TEST_CONFIG_DIR;
    delete process.env.PRESETT_TEST_MODEL_CACHE_DIR;
    delete process.env.PRESETT_TEST_BACKUP_DIR;
    delete process.env.PRESETT_TEST_GENTLE_AI_DIR;
    await rm(tempDir, { recursive: true, force: true });
    await rm(cacheDir, { recursive: true, force: true });
    await rm(gentleAiDir, { recursive: true, force: true });
  });

  it("returns every configured agent alongside current model assignments", async () => {
    await mkdir(tempDir, { recursive: true });
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: {
          "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" },
          reviewer: { mode: "subagent" },
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
    expect(body.agents).toEqual(["gentle-orchestrator", "reviewer"]);
  });

  it("returns both domains and defaults without creating missing config files", async () => {
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ assignments: [], gentleAi: {} });
    expect(body).not.toHaveProperty("gentleAi.language");
  });

  it("patches Gentle-AI without touching OpenCode", async () => {
    const original = JSON.stringify({ agent: { main: { model: "openai/old", variant: "low" } } });
    await writeFile(join(tempDir, "opencode.json"), original);
    const response = await PATCH(patchRequest({ domain: "gentle-ai", language: "es", persona: "Builder" }));
    expect(response.status).toBe(200);
    expect(JSON.parse(await readFile(join(gentleAiDir, "state.json"), "utf8"))).toMatchObject({ language: "es", persona: "Builder" });
    expect(await readFile(join(tempDir, "opencode.json"), "utf8")).toBe(original);
  });

  it("patches OpenCode and GET exposes the persisted active model", async () => {
    await writeFile(join(tempDir, "opencode.json"), JSON.stringify({ default_agent: "main", agent: { main: { model: "openai/old", variant: "low" } } }));
    await writeFile(join(cacheDir, "model-variants.json"), JSON.stringify({ openai: { new: ["high"] } }));
    const response = await PATCH(patchRequest({ domain: "opencode", agentKey: "main", model: "openai/new", variant: "high" }));
    expect(response.status).toBe(200);
    const body = await (await GET()).json();
    expect(body.assignments).toContainEqual({ agentKey: "main", provider: "openai", model: "new", variant: "high" });
  });

  it("returns field-level safe errors and does not mutate files for invalid input", async () => {
    const original = JSON.stringify({ agent: { main: { model: "openai/old", variant: "low" } } });
    await writeFile(join(tempDir, "opencode.json"), original);
    const response = await PATCH(patchRequest({ domain: "opencode", agentKey: "", model: "", variant: "", secret: "no" }));
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.fields).toMatchObject({ agentKey: expect.any(String), model: expect.any(String), variant: expect.any(String), secret: expect.any(String) });
    expect(JSON.stringify(body)).not.toContain("opencode.json");
    expect(await readFile(join(tempDir, "opencode.json"), "utf8")).toBe(original);
  });

  it("sanitizes read and write failures", async () => {
    const response = await PATCH(patchRequest({ domain: "opencode", agentKey: "main", model: "openai/new", variant: "high" }));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("opencode.json");
  });

  it("rejects an unknown catalog model without mutating OpenCode", async () => {
    const original = JSON.stringify({ agent: { main: { model: "openai/old", variant: "low" } } });
    await writeFile(join(tempDir, "opencode.json"), original);
    await writeFile(join(cacheDir, "model-variants.json"), JSON.stringify({ openai: { known: ["high"] } }));

    const response = await PATCH(patchRequest({ domain: "opencode", agentKey: "main", model: "openai/unknown", variant: "high" }));

    expect(response.status).toBe(400);
    expect(await readFile(join(tempDir, "opencode.json"), "utf8")).toBe(original);
  });

  it("rejects an unknown agent without mutating OpenCode", async () => {
    const original = JSON.stringify({ agent: { main: { model: "openai/old", variant: "low" } } });
    await writeFile(join(tempDir, "opencode.json"), original);

    const response = await PATCH(patchRequest({ domain: "opencode", agentKey: "missing", model: "openai/new", variant: "high" }));

    expect(response.status).toBe(400);
    expect(await readFile(join(tempDir, "opencode.json"), "utf8")).toBe(original);
  });

  it("blocks OpenCode saves when the model catalog is unavailable", async () => {
    const original = JSON.stringify({ agent: { main: { model: "openai/old", variant: "low" } } });
    await writeFile(join(tempDir, "opencode.json"), original);

    const response = await PATCH(patchRequest({ domain: "opencode", agentKey: "main", model: "openai/new", variant: "high" }));

    expect(response.status).toBe(503);
    expect(await readFile(join(tempDir, "opencode.json"), "utf8")).toBe(original);
  });

  it("sanitizes a real OpenCode write-path failure", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({ agent: { main: { model: "openai/old", variant: "low" } } }),
    );
    await mkdir(join(tempDir, "opencode.json.presett-tmp"));
    await writeFile(join(cacheDir, "model-variants.json"), JSON.stringify({ openai: { new: ["high"] } }));

    const response = await PATCH(
      patchRequest({ domain: "opencode", agentKey: "main", model: "openai/new", variant: "high" }),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: { message: "Configuration could not be saved" } });
    expect(JSON.stringify(body)).not.toMatch(/opencode\.json|presett-tmp|C:\\|cause|code/);
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
