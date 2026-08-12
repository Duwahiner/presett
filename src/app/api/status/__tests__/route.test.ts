import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GET } from "../route";

describe("GET /api/status", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-status-"));
    process.env.PRESETT_TEST_CONFIG_DIR = tempDir;
    process.env.PRESETT_TEST_GENTLE_AI_DIR = tempDir;
  });

  afterEach(async () => {
    delete process.env.PRESETT_TEST_CONFIG_DIR;
    delete process.env.PRESETT_TEST_GENTLE_AI_DIR;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns status when config and state are present", async () => {
    await mkdir(tempDir, { recursive: true });
    await writeFile(join(tempDir, "opencode.json"), JSON.stringify({ agent: {} }));
    await writeFile(
      join(tempDir, "state.json"),
      JSON.stringify({ installed_agents: ["opencode"] }),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.installed).toBe(true);
    expect(body.configured).toBe(true);
  });

  it("degrades gracefully when state.json is missing", async () => {
    await mkdir(tempDir, { recursive: true });
    await writeFile(join(tempDir, "opencode.json"), JSON.stringify({ agent: {} }));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.configured).toBe(true);
    expect(body.stateError).toBeDefined();
  });
});
