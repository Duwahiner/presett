import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PUT, DELETE as DELETE_HANDLER } from "../route";

describe("/api/profiles/[name]", () => {
  let tempDir = "";
  let cacheDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-profile-name-"));
    cacheDir = await mkdtemp(join(tmpdir(), "presett-profile-name-cache-"));
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

  it("edits a profile on PUT", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: { "sdd-orchestrator-custom": { model: "x/y", variant: "low" } },
      }),
    );

    const request = new Request("http://localhost/api/profiles/custom", {
      method: "PUT",
      body: JSON.stringify({
        assignments: {
          "sdd-orchestrator-custom": { provider: "openai", model: "gpt-4", variant: "high" },
        },
      }),
    });

    const response = await PUT(request, { params: Promise.resolve({ name: "custom" }) });
    expect(response.status).toBe(200);

    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));
    expect(written.agent["sdd-orchestrator-custom"].variant).toBe("high");
  });

  it("deletes a profile on DELETE", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: { "sdd-orchestrator-custom": { model: "x/y" } },
      }),
    );

    const response = await DELETE_HANDLER(undefined, {
      params: Promise.resolve({ name: "custom" }),
    });
    expect(response.status).toBe(200);

    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));
    expect(written.agent["sdd-orchestrator-custom"]).toBeUndefined();
  });
});
