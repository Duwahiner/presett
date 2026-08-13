import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GET, OPTIONS, POST } from "../route";

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

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-profiles-"));
    cacheDir = await mkdtemp(join(tmpdir(), "presett-profiles-cache-"));
    process.env.PRESETT_TEST_CONFIG_DIR = tempDir;
    process.env.PRESETT_TEST_MODEL_CACHE_DIR = cacheDir;
    process.env.PRESETT_TEST_BACKUP_DIR = join(tempDir, "backups");
    await writeFile(
      join(cacheDir, "model-variants.json"),
      JSON.stringify({ openai: { "gpt-4": ["low", "high"] } }),
    );
  });

  afterEach(async () => {
    delete process.env.PRESETT_TEST_CONFIG_DIR;
    delete process.env.PRESETT_TEST_MODEL_CACHE_DIR;
    delete process.env.PRESETT_TEST_BACKUP_DIR;
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
  });

  it("creates a profile on POST", async () => {
    await writeFile(join(tempDir, "opencode.json"), JSON.stringify({ agent: {} }));

    const request = createProfileRequest("http://localhost:3000");

    const response = await POST(request);
    expect(response.status).toBe(200);
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
