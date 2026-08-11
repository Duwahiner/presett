import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, mkdir, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GET, PUT } from "../route";

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

    const request = new Request("http://localhost/api/config", {
      method: "PUT",
      body: JSON.stringify({
        agentKey: "sdd-init",
        provider: "openai",
        model: "gpt-4",
        variant: "high",
      }),
    });

    const response = await PUT(request);
    expect(response.status).toBe(200);

    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));
    expect(written.agent["sdd-init"]).toMatchObject({
      model: "openai/gpt-4",
      variant: "high",
    });
  });
});
