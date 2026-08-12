import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GET } from "../route";

describe("GET /api/models", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-models-"));
    process.env.PRESETT_TEST_MODEL_CACHE_DIR = tempDir;
  });

  afterEach(async () => {
    delete process.env.PRESETT_TEST_MODEL_CACHE_DIR;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns the model catalog", async () => {
    await writeFile(
      join(tempDir, "model-variants.json"),
      JSON.stringify({ openai: { "gpt-4": ["low", "high"] } }),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.providers).toContain("openai");
  });

  it("returns 503 when the catalog is missing", async () => {
    const response = await GET();
    expect(response.status).toBe(503);
  });
});
